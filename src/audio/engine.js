/**
 * audio/engine.js
 * Web Audio API wrapper.
 */

import { SEQUENCE_STEPS } from '../state.js';
import { updatePlayhead } from '../loseamp/controls.js';

let audioCtx = null;
let masterGain = null;
let analyser = null;
let liveVoice = null;
let pendingSpectrumConfig = null;

let sequencerTimer = null;
let currentStep = 0;
let _state = null;
let _lastBpm = null;
let isTransportRunning = false;
const MASTER_VOLUME_CEILING = 0.72;
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = SEQUENCE_STEPS / BEATS_PER_BAR;

const INST_CONFIG = {
  piano:  { type: 'sine',     freq: 261.6, attack: 0.005, decay: 0.3,  sustain: 0.1 },
  bass:   { type: 'sine',     freq: 65.4,  attack: 0.01,  decay: 0.5,  sustain: 0.2 },
  pad:    { type: 'triangle', freq: 130.8, attack: 0.3,   decay: 0.8,  sustain: 0.4 },
  noise:  { type: 'noise',    freq: null,  attack: 0.005, decay: 0.15, sustain: 0   },
};

export function initAudio() {
  document.addEventListener('click', ensureContext, { once: true });
}

export function prepareAudio() {
  return ensureContext();
}

function ensureContext() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = getMasterVolumeValue(_state?.soundboard?.volume ?? 0.5);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function makeDistortionCurve(amount) {
  const n = 256;
  const curve = new Float32Array(n);
  const k = amount * 100;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k === 0 ? x : ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export function startSequencer() {
  isTransportRunning = true;
  runWithAudioReady(() => {
    currentStep = 0;
    scheduleSequencer({ resetStep: true, immediateTick: false });
  });
}

export function stopSequencer() {
  isTransportRunning = false;
  clearSequencerTimer();
  updatePlayhead(-1);
}

export function restartSequencer() {
  isTransportRunning = true;
  runWithAudioReady(() => {
    currentStep = 0;
    scheduleSequencer({ resetStep: true, immediateTick: true });
  });
}

export function resumeSequencer() {
  isTransportRunning = true;
  runWithAudioReady(() => {
    if (!sequencerTimer) {
      scheduleSequencer({
        resetStep: false,
        immediateTick: currentStep === 0,
      });
    }
  });
}

export function isSequencerRunning() {
  return isTransportRunning && Boolean(sequencerTimer);
}

export function getCurrentSequencerStep() {
  return currentStep;
}

export function startSpectrumVoice(config) {
  pendingSpectrumConfig = config;
  runWithAudioReady(() => {
    if (!audioCtx || !analyser) return;
    const cfg = pendingSpectrumConfig;
    if (!cfg) return; // pointer released before context was ready
    pendingSpectrumConfig = null;
    stopSpectrumVoice();
    liveVoice = createSpectrumVoice(cfg);
  });
}

export function updateSpectrumVoice(config) {
  pendingSpectrumConfig = config;
  if (!liveVoice || !audioCtx) return;

  const now = audioCtx.currentTime;
  const targetFreq = Math.max(40, config.freq || 220);
  const targetBrightness = clamp(config.brightness ?? 0.45, 0, 1);
  const targetLevel = clamp(config.level ?? 0.55, 0.3, 0.8);

  liveVoice.filter.frequency.cancelScheduledValues(now);
  liveVoice.filter.frequency.setTargetAtTime(300 + targetBrightness * 5200, now, 0.03);
  liveVoice.gain.gain.cancelScheduledValues(now);
  liveVoice.gain.gain.setTargetAtTime(targetLevel, now, 0.025);

  liveVoice.oscillators.forEach((osc, index) => {
    const harmonic = index + 1;
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setTargetAtTime(targetFreq * harmonic, now, 0.025);
  });
}

export function stopSpectrumVoice() {
  pendingSpectrumConfig = null;
  if (!liveVoice || !audioCtx) return;

  const { oscillators, gain } = liveVoice;
  const now = audioCtx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(0.0001, now, 0.03);

  oscillators.forEach(osc => {
    try {
      osc.stop(now + 0.12);
    } catch (_) {
      // oscillator may already be stopped
    }
  });

  liveVoice = null;
}

function tickSequencer() {
  if (!_state || !audioCtx) return;
  const { activeInstruments, sequence } = _state.soundboard;
  const instList = _state.unlocks.instruments;

  activeInstruments.forEach(name => {
    const rowIdx = instList.indexOf(name);
    if (rowIdx < 0) return;
    const row = sequence[rowIdx];
    if (!row) return;
    if (row[currentStep]) triggerInstrument(name);
  });
}

function triggerInstrument(name) {
  if (!audioCtx) return;
  const cfg = INST_CONFIG[name];
  if (!cfg) return;
  const now = audioCtx.currentTime;
  const voiceState = getInstrumentVoiceState(name);
  cfg.type === 'noise'
    ? triggerNoise(cfg, now, voiceState)
    : triggerOscillator(cfg, now, voiceState);
}

function triggerOscillator(cfg, now, voiceState) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  const voiceOutput = createVoiceOutput(voiceState, now, cfg.attack + cfg.decay + 0.4);
  osc.type = cfg.type;
  osc.frequency.value = cfg.freq;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(voiceState.level, now + cfg.attack);
  env.gain.exponentialRampToValueAtTime(0.001, now + cfg.attack + cfg.decay);
  osc.connect(env);
  env.connect(voiceOutput.input);
  osc.start(now);
  osc.stop(now + cfg.attack + cfg.decay + 0.01);
}

function triggerNoise(cfg, now, voiceState) {
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.45;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const env = audioCtx.createGain();
  const voiceOutput = createVoiceOutput(voiceState, now, cfg.attack + cfg.decay + 0.45);
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(voiceState.level * 0.72, now + cfg.attack);
  env.gain.exponentialRampToValueAtTime(0.001, now + cfg.attack + cfg.decay);
  src.connect(env);
  env.connect(voiceOutput.input);
  src.start(now);
  src.stop(now + cfg.attack + cfg.decay + 0.01);
}

function createSpectrumVoice(config) {
  const now = audioCtx.currentTime;
  const baseFreq = Math.max(40, config.freq || 220);
  const brightness = clamp(config.brightness ?? 0.45, 0, 1);
  const level = clamp(config.level ?? 0.55, 0.3, 0.8);

  const mix = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  filter.type = 'bandpass';
  filter.frequency.value = 300 + brightness * 5200;
  filter.Q.value = 0.9 + brightness * 4;
  gain.gain.value = 0.0001;

  const oscillators = [
    { type: 'sine',     ratio: 1, amp: 0.72 },
    { type: 'triangle', ratio: 2, amp: 0.22 },
    { type: 'sawtooth', ratio: 3, amp: 0.10 },
  ].map(partial => {
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = partial.type;
    osc.frequency.value = baseFreq * partial.ratio;
    oscGain.gain.value = partial.amp;
    osc.connect(oscGain);
    oscGain.connect(mix);
    osc.start(now);
    return osc;
  });

  mix.connect(filter);
  filter.connect(gain);
  gain.connect(analyser);
  gain.gain.setTargetAtTime(level, now, 0.03);

  return { oscillators, filter, gain };
}

export function updateFromState(state) {
  const prevBpm = _lastBpm;
  _state = state;

  if (!audioCtx) return;

  const sb = state.soundboard;

  if (masterGain) {
    masterGain.gain.value = getMasterVolumeValue(sb.volume ?? 0.5);
  }

  if (sb.bpm !== prevBpm) {
    _lastBpm = sb.bpm;
    if (isTransportRunning && sequencerTimer) {
      scheduleSequencer({ resetStep: false, immediateTick: false });
    }
  } else if (isTransportRunning && !sequencerTimer) {
    scheduleSequencer({ resetStep: false, immediateTick: false });
  }
}

export function getSignalLevel() {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] / 128.0) - 1.0;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / data.length) * 3);
}

function getSequencerIntervalMs() {
  const bpm = _state?.soundboard.bpm || 72;
  _lastBpm = bpm;
  return (60 / bpm) * 1000 / STEPS_PER_BEAT;
}

function clearSequencerTimer() {
  if (sequencerTimer) {
    clearInterval(sequencerTimer);
    sequencerTimer = null;
  }
}

function advanceSequencer() {
  tickSequencer();
  updatePlayhead(currentStep);
  currentStep = (currentStep + 1) % SEQUENCE_STEPS;
}

function scheduleSequencer(options = {}) {
  const { resetStep = false, immediateTick = false } = options;
  if (!audioCtx || !_state) return;

  clearSequencerTimer();

  if (resetStep) {
    currentStep = 0;
  }

  if (immediateTick) {
    advanceSequencer();
  } else {
    updatePlayhead(currentStep);
  }

  const interval = getSequencerIntervalMs();
  sequencerTimer = setInterval(() => {
    advanceSequencer();
  }, interval);
}

function runWithAudioReady(callback) {
  const ctx = ensureContext();
  if (!ctx || !_state) return;

  if (ctx.state === 'running') {
    callback();
    return;
  }

  ctx.resume()
    .then(() => {
      if (audioCtx === ctx && _state) {
        callback();
      }
    })
    .catch(() => {});
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMasterVolumeValue(rawVolume) {
  const normalized = clamp(rawVolume ?? 0.5, 0, 1);
  return Math.pow(normalized, 0.65) * MASTER_VOLUME_CEILING;
}

function getInstrumentVoiceState(name) {
  const masterEffects = _state?.soundboard?.effects || {};
  const channelEffects = _state?.soundboard?.channelEffects?.[name] || {};
  const baseLevelByInstrument = {
    piano: 0.72,
    bass: 0.94,
    pad: 0.62,
    noise: 0.56,
  };

  return {
    reverb: clamp(((masterEffects.reverb ?? 0) * 0.6) + ((channelEffects.reverb ?? 0) * 0.85), 0, 1),
    delay: clamp(((masterEffects.delay ?? 0) * 0.55) + ((channelEffects.delay ?? 0) * 0.8), 0, 1),
    distortion: clamp(((masterEffects.distortion ?? 0) * 0.65) + ((channelEffects.distortion ?? 0) * 0.8), 0, 1),
    filter: clamp((((masterEffects.filter ?? 0.5) - 0.5) * 0.45) + ((channelEffects.filter ?? 0.5) * 0.85), 0.02, 1),
    level: baseLevelByInstrument[name] ?? 0.7,
  };
}

function createVoiceOutput(voiceState, now, lifetimeSeconds = 1) {
  const input = audioCtx.createGain();
  const shaper = audioCtx.createWaveShaper();
  shaper.curve = makeDistortionCurve((voiceState.distortion ?? 0) * 400);
  shaper.oversample = '2x';

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = getVoiceFilterFrequency(voiceState.filter ?? 0.5);
  filter.Q.value = 0.7 + (voiceState.distortion ?? 0) * 5.5;

  const dry = audioCtx.createGain();
  dry.gain.value = 0.88;

  const delay = audioCtx.createDelay(1.0);
  delay.delayTime.value = (voiceState.delay ?? 0) * 0.42;
  const delaySend = audioCtx.createGain();
  delaySend.gain.value = (voiceState.delay ?? 0) * 0.32;
  const delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = 0.08 + (voiceState.delay ?? 0) * 0.44;

  const reverbSend = audioCtx.createGain();
  reverbSend.gain.value = (voiceState.reverb ?? 0) * 0.52;
  const reverbPreDelay = audioCtx.createDelay(0.25);
  reverbPreDelay.delayTime.value = 0.028 + (voiceState.reverb ?? 0) * 0.04;
  const reverbDiffuse = audioCtx.createDelay(0.5);
  reverbDiffuse.delayTime.value = 0.06 + (voiceState.reverb ?? 0) * 0.12;
  const reverbFeedback = audioCtx.createGain();
  reverbFeedback.gain.value = 0.18 + (voiceState.reverb ?? 0) * 0.58;
  const reverbTone = audioCtx.createBiquadFilter();
  reverbTone.type = 'lowpass';
  reverbTone.frequency.value = 1400 + (voiceState.reverb ?? 0) * 2800;
  const reverbReturn = audioCtx.createGain();
  reverbReturn.gain.value = 0.18 + (voiceState.reverb ?? 0) * 0.34;

  input.connect(shaper);
  shaper.connect(filter);
  filter.connect(dry);
  filter.connect(delaySend);
  filter.connect(reverbSend);
  delaySend.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(analyser);
  reverbSend.connect(reverbPreDelay);
  reverbPreDelay.connect(reverbDiffuse);
  reverbDiffuse.connect(reverbTone);
  reverbTone.connect(reverbReturn);
  reverbReturn.connect(analyser);
  reverbTone.connect(reverbFeedback);
  reverbFeedback.connect(reverbDiffuse);
  dry.connect(analyser);

  const teardownAt = now + Math.max(0.35, lifetimeSeconds);
  [
    input,
    shaper,
    filter,
    dry,
    delay,
    delaySend,
    delayFeedback,
    reverbSend,
    reverbPreDelay,
    reverbDiffuse,
    reverbFeedback,
    reverbTone,
    reverbReturn,
  ].forEach(node => {
    if ('disconnect' in node) {
      window.setTimeout(() => {
        try { node.disconnect(); } catch (_) { /* ignore */ }
      }, Math.max(0, (teardownAt - audioCtx.currentTime) * 1000));
    }
  });

  return { input };
}

function getVoiceFilterFrequency(amount) {
  const normalized = clamp(amount ?? 0.5, 0, 1);
  return 90 * Math.pow(180, normalized);
}
