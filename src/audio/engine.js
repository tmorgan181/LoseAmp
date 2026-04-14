/**
 * audio/engine.js
 * Web Audio API wrapper.
 */

import { updatePlayhead } from '../loseamp/controls.js';

let audioCtx = null;
let masterGain = null;
let analyser = null;
let distortionNode = null;
let filterNode = null;
let delayNode = null;
let reverbGain = null;
let dryGain = null;

let sequencerTimer = null;
let currentStep = 0;
let _state = null;
let _lastBpm = null;
let isTransportRunning = false;

const INST_CONFIG = {
  piano:  { type: 'sine',     freq: 261.6, attack: 0.005, decay: 0.3,  sustain: 0.1 },
  bass:   { type: 'sine',     freq: 65.4,  attack: 0.01,  decay: 0.5,  sustain: 0.2 },
  pad:    { type: 'triangle', freq: 130.8, attack: 0.3,   decay: 0.8,  sustain: 0.4 },
  noise:  { type: 'noise',    freq: null,  attack: 0.005, decay: 0.15, sustain: 0   },
};

export function initAudio() {
  document.addEventListener('click', ensureContext, { once: true });
}

function ensureContext() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.7;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  distortionNode = audioCtx.createWaveShaper();
  distortionNode.curve = makeDistortionCurve(0);
  distortionNode.oversample = '2x';

  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 8000;

  delayNode = audioCtx.createDelay(1.0);
  delayNode.delayTime.value = 0;

  const delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = 0.3;
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);

  dryGain = audioCtx.createGain();
  dryGain.gain.value = 1;

  reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0;

  distortionNode.connect(filterNode);
  filterNode.connect(dryGain);
  filterNode.connect(delayNode);
  delayNode.connect(dryGain);
  dryGain.connect(analyser);
  reverbGain.connect(analyser);
  analyser.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  if (_state && isTransportRunning) startSequencer();
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
  if (!audioCtx || !_state) return;
  currentStep = 0;
  scheduleSequencer({ resetStep: true, immediateTick: false });
}

export function stopSequencer() {
  isTransportRunning = false;
  clearSequencerTimer();
  updatePlayhead(-1);
}

export function restartSequencer() {
  currentStep = 0;
  isTransportRunning = true;
  scheduleSequencer({ resetStep: true, immediateTick: true });
}

export function resumeSequencer() {
  isTransportRunning = true;
  if (!audioCtx) {
    ensureContext();
    return;
  }

  if (!sequencerTimer) {
    scheduleSequencer({ resetStep: false, immediateTick: false });
    updatePlayhead(currentStep);
  }
}

export function isSequencerRunning() {
  return isTransportRunning && Boolean(sequencerTimer);
}

export function getCurrentSequencerStep() {
  return currentStep;
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
  cfg.type === 'noise' ? triggerNoise(cfg, now) : triggerOscillator(cfg, now);
}

function triggerOscillator(cfg, now) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = cfg.type;
  osc.frequency.value = cfg.freq;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.5, now + cfg.attack);
  env.gain.exponentialRampToValueAtTime(0.001, now + cfg.attack + cfg.decay);
  osc.connect(env);
  env.connect(distortionNode);
  osc.start(now);
  osc.stop(now + cfg.attack + cfg.decay + 0.01);
}

function triggerNoise(cfg, now) {
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.4, now + cfg.attack);
  env.gain.exponentialRampToValueAtTime(0.001, now + cfg.attack + cfg.decay);
  src.connect(env);
  env.connect(distortionNode);
  src.start(now);
  src.stop(now + cfg.attack + cfg.decay + 0.01);
}

export function updateFromState(state) {
  const prevBpm = _lastBpm;
  _state = state;

  if (!audioCtx) return;

  const sb = state.soundboard;

  if (distortionNode) {
    distortionNode.curve = makeDistortionCurve(sb.effects.distortion * 400);
  }

  if (filterNode) {
    const freq = 200 * Math.pow(60, sb.effects.filter);
    filterNode.frequency.value = Math.min(20000, freq);
  }

  if (delayNode) {
    delayNode.delayTime.value = sb.effects.delay * 0.6;
  }

  if (reverbGain) {
    reverbGain.gain.value = sb.effects.reverb * 0.4;
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
  return (60 / bpm) * 1000 * 0.25;
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
  currentStep = (currentStep + 1) % 16;
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
