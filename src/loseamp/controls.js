/**
 * loseamp/controls.js
 * The soundboard control panel.
 * Renders all unlocked controls and writes user input back to state.
 */

import {
  PRESET_SLOTS,
  SEQUENCE_STEPS,
  SUPPORTED_EFFECTS,
  SUPPORTED_INSTRUMENTS,
  state,
  saveState,
} from '../state.js';
import { checkPuzzleState } from '../puzzle/logic.js';
import {
  isSequencerRunning,
  restartSequencer,
  resumeSequencer,
  startSpectrumVoice,
  stopSequencer,
  stopSpectrumVoice,
  updateSpectrumVoice,
  updateFromState,
} from '../audio/engine.js';
import { setMirrorActive } from './portal.js';

let holdBarRaf = null;
let spectrumPointerId = null;
const INSTRUMENT_ORDER = SUPPORTED_INSTRUMENTS;
const EFFECT_ORDER = SUPPORTED_EFFECTS;
const PANEL_TITLES = {
  'instruments-panel': 'tone',
  'sequencer-panel': 'lanes',
  'effects-panel': 'signal',
  'lights-panel': 'light',
};
const INSTRUMENT_TONE_CLASS = {
  piano: 'tone-piano',
  bass: 'tone-bass',
  pad: 'tone-pad',
  noise: 'tone-noise',
};
const floatingPanels = new Map();
let dragState = null;
let dragListenersBound = false;

/**
 * initControls()
 * Build the control panel DOM from current unlocks.
 * Re-call when new unlocks are added.
 */
export function initControls() {
  ensureSequence();
  ensurePresets();
  renderInstruments();
  renderSequencer();
  renderEffects();
  enhanceDockablePanels();
}

function ensureSequence() {
  const rows = state.unlocks.instruments.length;
  if (!Array.isArray(state.soundboard.sequence)) {
    state.soundboard.sequence = [];
  }
  for (let r = 0; r < rows; r++) {
    if (!Array.isArray(state.soundboard.sequence[r])) {
      state.soundboard.sequence[r] = new Array(SEQUENCE_STEPS).fill(false);
    }
  }
  if (state.soundboard.sequence.length > rows) {
    state.soundboard.sequence = state.soundboard.sequence.slice(0, rows);
  }
}

function createRackModule(title, ...extraClasses) {
  const shell = document.createElement('section');
  shell.className = ['rack-module', ...extraClasses].filter(Boolean).join(' ');

  if (title) {
    const heading = document.createElement('div');
    heading.className = 'rack-module-title';
    heading.textContent = title;
    shell.appendChild(heading);
  }

  const body = document.createElement('div');
  body.className = 'rack-module-body';
  shell.appendChild(body);

  return { shell, body };
}

function createLaneMeter(active) {
  const led = document.createElement('span');
  led.className = 'lane-meter';
  if (active) led.classList.add('active');
  return led;
}

// ─── Instruments ─────────────────────────────────────────────────────────────

function renderInstruments() {
  const panel = document.getElementById('instruments-panel');
  panel.innerHTML = '';
  panel.classList.add('control-panel-section', 'panel-tone');

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'tone';
  panel.appendChild(label);

  const powerModule = document.createElement('div');
  powerModule.className = 'power-module';
  powerModule.innerHTML = `
    <span class="power-module-label">power</span>
    <button
      type="button"
      class="power-switch ${state.meta.awakened ? 'active' : 'sleeping'}"
      data-power-state="${state.meta.awakened ? 'awake' : 'sleep'}"
      aria-pressed="${String(state.meta.awakened)}"
      aria-label="${state.meta.awakened ? 'turn LoseAmp off' : 'turn LoseAmp on'}"
      title="${state.meta.awakened ? 'Power on' : 'Standby'}"
    >
      <span class="power-switch-mark on" aria-hidden="true">1</span>
      <span class="power-switch-track" aria-hidden="true">
        <span class="power-switch-lever"></span>
        <span class="power-switch-lamp"></span>
      </span>
      <span class="power-switch-mark off" aria-hidden="true">0</span>
    </button>
  `;

  const powerButton = powerModule.querySelector('.power-switch');
  powerButton?.addEventListener('click', () => {
    if (typeof window.loseampTogglePower === 'function') {
      window.loseampTogglePower();
      return;
    }
    window.dispatchEvent(new CustomEvent('loseamp:power-on'));
  });
  const powerRack = createRackModule('power', 'rack-module-compact', 'rack-module-power');
  powerRack.body.appendChild(powerModule);
  panel.appendChild(powerRack.shell);

  const voicesRack = createRackModule('voices', 'rack-module-voices');
  const cluster = document.createElement('div');
  cluster.className = 'instrument-cluster';
  voicesRack.body.appendChild(cluster);

  const instrumentNames = [
    ...INSTRUMENT_ORDER.filter(name => state.unlocks.instruments.includes(name)),
    ...state.unlocks.instruments.filter(name => !INSTRUMENT_ORDER.includes(name)),
  ];

  instrumentNames.forEach(name => {

    const btn = document.createElement('button');
    btn.className = 'instr-btn control-chip';
    btn.dataset.instr = name;
    btn.textContent = name;
    if (state.soundboard.activeInstruments.includes(name)) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => toggleInstrument(name));
    cluster.appendChild(btn);
  });
  panel.appendChild(voicesRack.shell);

  const tempoRack = createRackModule('tempo', 'rack-module-compact', 'rack-module-tempo');
  const tempoModule = document.createElement('div');
  tempoModule.className = 'tempo-module';

  const minus = document.createElement('button');
  minus.className = 'bpm-nudge';
  minus.type = 'button';
  minus.textContent = '−';
  minus.addEventListener('click', () => changeBpm(-1));

  const bpmDisplay = document.createElement('span');
  bpmDisplay.id = 'bpm-display';
  bpmDisplay.textContent = state.soundboard.bpm;

  const bpmUnit = document.createElement('span');
  bpmUnit.className = 'tempo-unit';
  bpmUnit.textContent = 'bpm';

  const plus = document.createElement('button');
  plus.className = 'bpm-nudge';
  plus.type = 'button';
  plus.textContent = '+';
  plus.addEventListener('click', () => changeBpm(1));

  const bpmReadout = document.createElement('div');
  bpmReadout.className = 'tempo-readout';
  bpmReadout.append(bpmDisplay, bpmUnit);

  const bpmWell = document.createElement('div');
  bpmWell.className = 'tempo-well';
  bpmWell.append(minus, bpmReadout, plus);

  const bpmSlider = document.createElement('input');
  bpmSlider.type = 'range';
  bpmSlider.id = 'bpm-slider';
  bpmSlider.className = 'bpm-slider';
  bpmSlider.min = String(state.unlocks.bpmRange[0]);
  bpmSlider.max = String(state.unlocks.bpmRange[1]);
  bpmSlider.step = '1';
  bpmSlider.value = String(state.soundboard.bpm);
  bpmSlider.addEventListener('input', () => setBpm(bpmSlider.value));

  tempoModule.append(bpmWell, bpmSlider);
  tempoRack.body.appendChild(tempoModule);
  panel.appendChild(tempoRack.shell);

  // Mirror toggle — appears after Room 1 (bright) is cleared
  if (state.rooms.bright.cleared) {
    const mirrorRack = createRackModule('mirror', 'rack-module-mirror');

    const mirrorBtn = document.createElement('button');
    const available = isMirrorAvailable();
    mirrorBtn.id = 'mirror-toggle-btn';
    mirrorBtn.className = 'mirror-toggle-btn';
    if (state.soundboard.mirrorActive) mirrorBtn.classList.add('active');
    if (available) mirrorBtn.classList.add('available');
    mirrorBtn.setAttribute('aria-label', 'mirror');

    const glyph = document.createElement('span');
    glyph.className = 'mirror-toggle-glyph';
    glyph.textContent = state.soundboard.mirrorActive ? '◈' : '◇';

    const whisper = document.createElement('span');
    whisper.className = 'mirror-toggle-whisper';
    whisper.textContent = available ? 'aligned' : 'asymmetry';

    mirrorBtn.addEventListener('click', () => {
      const availableNow = isMirrorAvailable();

      if (!availableNow) {
        state.soundboard.mirrorActive = false;
        glyph.textContent = '◇';
        mirrorBtn.classList.remove('active');
        mirrorBtn.classList.remove('available');
        whisper.textContent = 'asymmetry';
        mirrorBtn.classList.remove('failed');
        void mirrorBtn.offsetWidth;
        mirrorBtn.classList.add('failed');
        setMirrorActive(false);
        updateMirrorAvailability();
        import('../rooms/manager.js').then(m => m.renderDoors());
        onChange();
        return;
      }

      state.soundboard.mirrorActive = !state.soundboard.mirrorActive;
      mirrorBtn.classList.toggle('active', state.soundboard.mirrorActive);
      mirrorBtn.classList.add('available');
      glyph.textContent = state.soundboard.mirrorActive ? '◈' : '◇';
      whisper.textContent = state.soundboard.mirrorActive ? 'open' : 'aligned';
      setMirrorActive(state.soundboard.mirrorActive);
      import('../rooms/manager.js').then(m => m.renderDoors());
      onChange();
    });

    mirrorBtn.append(glyph, whisper);
    mirrorRack.body.appendChild(mirrorBtn);
    panel.appendChild(mirrorRack.shell);
  }

  updateMirrorAvailability();
}

function toggleInstrument(name) {
  const active = state.soundboard.activeInstruments;
  const idx = active.indexOf(name);
  if (idx >= 0) {
    active.splice(idx, 1);
  } else {
    active.push(name);
  }
  const btn = document.querySelector(`.instr-btn[data-instr="${name}"]`);
  if (btn) btn.classList.toggle('active', active.includes(name));
  onChange();
}

// ─── Sequencer ────────────────────────────────────────────────────────────────

function renderSequencer() {
  const panel = document.getElementById('sequencer-panel');
  panel.innerHTML = '';
  panel.classList.add('control-panel-section', 'panel-sequence');

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'sequence';
  panel.appendChild(label);

  const topDeck = document.createElement('div');
  topDeck.className = 'sequence-topdeck';

  const spectrumRack = createRackModule('spectrum', 'rack-module-spectrum');
  const spectrum = document.createElement('div');
  spectrum.className = 'spectrum-control';
  spectrum.innerHTML = `
    <div class="spectrum-header">
      <span class="spectrum-title">melody</span>
      <span class="spectrum-hint">click and drag</span>
    </div>
    <div class="spectrum-pad" role="application" aria-label="spectrum melody control"></div>
    <div class="spectrum-footer">
      <span>A2</span>
      <span>—</span>
      <span>A4</span>
    </div>
  `;

  const spectrumPad = spectrum.querySelector('.spectrum-pad');
  if (spectrumPad) {
    for (let i = 0; i < SPECTRUM_SCALE.length; i++) {
      const cell = document.createElement('div');
      cell.className = 'spectrum-cell';
      if (i % 5 === 0) cell.classList.add('major');
      spectrumPad.appendChild(cell);
    }

    spectrumPad.addEventListener('pointerdown', onSpectrumPointerDown);
    spectrumPad.addEventListener('pointermove', onSpectrumPointerMove);
    spectrumPad.addEventListener('pointerup', onSpectrumPointerUp);
    spectrumPad.addEventListener('pointercancel', onSpectrumPointerUp);
    spectrumPad.addEventListener('pointerleave', event => {
      if (event.buttons === 0) onSpectrumPointerUp(event);
    });
  }

  spectrumRack.body.appendChild(spectrum);

  const transport = document.createElement('div');
  transport.className = 'transport-row';

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'transport-btn transport-play';
  playBtn.dataset.transport = 'play';
  playBtn.innerHTML = '<span class="transport-icon" aria-hidden="true">▶</span><span>play</span>';
  playBtn.addEventListener('click', () => {
    resumeSequencer();
    syncTransportButtons();
  });

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'transport-btn';
  pauseBtn.dataset.transport = 'pause';
  pauseBtn.innerHTML = '<span class="transport-icon" aria-hidden="true">▮▮</span><span>pause</span>';
  pauseBtn.addEventListener('click', () => {
    stopSequencer();
    syncTransportButtons();
  });

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'transport-btn transport-secondary';
  restartBtn.dataset.transport = 'restart';
  restartBtn.innerHTML = '<span class="transport-icon" aria-hidden="true">↺</span><span>restart</span>';
  restartBtn.addEventListener('click', () => {
    restartSequencer();
    syncTransportButtons();
  });

  transport.append(playBtn, pauseBtn, restartBtn);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'transport-btn transport-secondary clear-btn';
  clearBtn.innerHTML = '<span class="transport-icon" aria-hidden="true">×</span><span>clear</span>';
  clearBtn.addEventListener('click', clearSequence);

  const presets = document.createElement('div');
  presets.className = 'preset-row';

  for (let i = 0; i < PRESET_SLOTS; i++) {
    const slot = document.createElement('div');
    slot.className = 'preset-slot';
    if (state.soundboard.presets[i]) slot.classList.add('has-preset');

    const recallBtn = document.createElement('button');
    recallBtn.type = 'button';
    recallBtn.className = 'preset-btn';
    recallBtn.dataset.slot = String(i);
    recallBtn.textContent = `preset ${i + 1}`;
    recallBtn.disabled = !state.soundboard.presets[i];
    if (state.soundboard.presets[i]) {
      recallBtn.classList.add('has-preset');
    }
    recallBtn.addEventListener('click', () => loadPreset(i));

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'preset-save-btn';
    saveBtn.dataset.slot = String(i);
    saveBtn.setAttribute('aria-label', `save preset ${i + 1}`);
    saveBtn.textContent = '◦';
    saveBtn.addEventListener('click', () => savePreset(i));

    slot.append(recallBtn, saveBtn);
    presets.appendChild(slot);
  }

  const transportRack = createRackModule('transport', 'rack-module-sequence', 'rack-module-transport');
  const transportBlock = document.createElement('div');
  transportBlock.className = 'sequence-transport-block';
  transportBlock.append(transport, clearBtn, presets);
  transportRack.body.appendChild(transportBlock);

  topDeck.append(spectrumRack.shell, transportRack.shell);
  panel.appendChild(topDeck);

  // Step grid
  const rows = state.unlocks.instruments.length;
  const STEPS = SEQUENCE_STEPS;
  const LABEL_W = '42px';

  // Beat markers row (with spacer to align with labelled grid)
  const laneRack = createRackModule('pattern lanes', 'rack-module-lanes');
  const markersWrap = document.createElement('div');
  markersWrap.className = 'seq-markers-wrap';

  const markerSpacer = document.createElement('div');
  markerSpacer.className = 'seq-marker-spacer';
  markerSpacer.style.width = LABEL_W;
  markersWrap.appendChild(markerSpacer);

  const markers = document.createElement('div');
  markers.className = 'seq-markers';
  markers.style.gridTemplateColumns = `repeat(${STEPS}, 1fr)`;

  for (let s = 0; s < STEPS; s++) {
    const marker = document.createElement('span');
    marker.className = 'seq-marker';
    if (s % 4 === 0) {
      marker.classList.add('seq-marker-major');
      marker.textContent = String((s / 4) + 1);
    } else {
      marker.textContent = '';
    }
    if (s === 0) marker.classList.add('seq-marker-origin');
    markers.appendChild(marker);
  }
  markersWrap.appendChild(markers);
  laneRack.body.appendChild(markersWrap);

  // Seq body: labels column + step grid
  const seqBody = document.createElement('div');
  seqBody.className = 'seq-body';

  const labelsCol = document.createElement('div');
  labelsCol.className = 'seq-row-labels';
  labelsCol.style.width = LABEL_W;
  labelsCol.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

  state.unlocks.instruments.forEach(name => {
    const lbl = document.createElement('div');
    lbl.className = 'seq-row-label';
    lbl.dataset.instr = name;
    lbl.classList.add(INSTRUMENT_TONE_CLASS[name] || 'tone-generic');
    const laneMeta = document.createElement('div');
    laneMeta.className = 'seq-row-meta';
    laneMeta.append(createLaneMeter(state.soundboard.activeInstruments.includes(name)));

    const laneName = document.createElement('span');
    laneName.className = 'seq-row-name';
    laneName.textContent = name;
    lbl.append(laneMeta, laneName);
    labelsCol.appendChild(lbl);
  });

  const grid = document.createElement('div');
  grid.id = 'seq-grid';
  grid.className = 'seq-grid';
  grid.style.gridTemplateColumns = `repeat(${STEPS}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  grid.style.setProperty('--seq-rows', String(rows));

  for (let r = 0; r < rows; r++) {
    for (let s = 0; s < STEPS; s++) {
      const btn = document.createElement('button');
      btn.className = 'seq-step';
      btn.dataset.row = r;
      btn.dataset.step = s;
      btn.dataset.instr = state.unlocks.instruments[r] || '';
      btn.classList.add(INSTRUMENT_TONE_CLASS[state.unlocks.instruments[r]] || 'tone-generic');
      if (s % 4 === 0) btn.classList.add('seq-step-major');
      if (s === 0) btn.classList.add('seq-step-origin');
      if (state.soundboard.sequence[r]?.[s]) btn.classList.add('on');
      btn.addEventListener('click', () => toggleStep(r, s));
      grid.appendChild(btn);
    }
  }

  seqBody.append(labelsCol, grid);
  laneRack.body.appendChild(seqBody);

  const outputStrip = document.createElement('div');
  outputStrip.className = 'sequence-output-strip';

  const outputLeds = document.createElement('div');
  outputLeds.className = 'sequence-output-leds';
  for (let i = 0; i < 8; i++) {
    outputLeds.appendChild(createLaneMeter(i < state.soundboard.activeInstruments.length));
  }

  const outputReadout = document.createElement('div');
  outputReadout.className = 'sequence-output-readout';
  outputReadout.innerHTML = `
    <span class="sequence-output-value">${rows}</span>
    <span class="sequence-output-copy">lanes / ${STEPS} steps</span>
  `;

  outputStrip.append(outputLeds, outputReadout);
  laneRack.body.appendChild(outputStrip);
  panel.appendChild(laneRack.shell);
  syncTransportButtons();
}

function onSpectrumPointerDown(event) {
  const pad = event.currentTarget;
  if (!(pad instanceof HTMLElement)) return;

  spectrumPointerId = event.pointerId;
  pad.setPointerCapture?.(event.pointerId);
  pad.classList.add('active');
  const config = getSpectrumVoiceConfig(event, pad);
  startSpectrumVoice(config);
  updateSpectrumReadout(pad, config);
}

function onSpectrumPointerMove(event) {
  const pad = event.currentTarget;
  if (!(pad instanceof HTMLElement)) return;
  if (spectrumPointerId !== event.pointerId) return;

  const config = getSpectrumVoiceConfig(event, pad);
  updateSpectrumVoice(config);
  updateSpectrumReadout(pad, config);
}

function onSpectrumPointerUp(event) {
  const pad = event.currentTarget;
  if (!(pad instanceof HTMLElement)) return;
  if (spectrumPointerId !== null && spectrumPointerId !== event.pointerId) return;

  spectrumPointerId = null;
  pad.classList.remove('active');
  stopSpectrumVoice();
  updateSpectrumReadout(pad, null);
}

function getSpectrumVoiceConfig(event, pad) {
  const rect = pad.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const note = getSpectrumFrequency(x);
  return {
    freq: note.freq,
    brightness: 1 - y,
    level: 0.5 + (1 - y) * 0.25,
    noteLabel: note.label,
    x,
    y,
  };
}

const SPECTRUM_SCALE = [
  ['A2', 110.0],
  ['C3', 130.81],
  ['D3', 146.83],
  ['E3', 164.81],
  ['G3', 196.0],
  ['A3', 220.0],
  ['C4', 261.63],
  ['D4', 293.66],
  ['E4', 329.63],
  ['G4', 392.0],
  ['A4', 440.0],
];

function getSpectrumFrequency(x) {
  const index = Math.min(SPECTRUM_SCALE.length - 1, Math.floor(x * SPECTRUM_SCALE.length));
  const [label, freq] = SPECTRUM_SCALE[index];
  return { label, freq };
}

function updateSpectrumReadout(pad, config) {
  pad.style.setProperty('--spectrum-x', config ? config.x.toFixed(4) : '0.5');
  pad.style.setProperty('--spectrum-y', config ? config.y.toFixed(4) : '0.5');
  pad.dataset.note = config?.noteLabel || '';
}

function changeBpm(delta) {
  const [min, max] = state.unlocks.bpmRange;
  state.soundboard.bpm = Math.max(min, Math.min(max, state.soundboard.bpm + delta));
  syncBpmControls();
  onChange();
}

function setBpm(rawValue) {
  const [min, max] = state.unlocks.bpmRange;
  if (rawValue === '' || rawValue === '-') {
    return;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) {
    syncBpmControls();
    return;
  }

  state.soundboard.bpm = Math.max(min, Math.min(max, parsed));
  syncBpmControls();
  onChange();
}

function toggleStep(row, step) {
  if (!state.soundboard.sequence[row]) {
    state.soundboard.sequence[row] = new Array(SEQUENCE_STEPS).fill(false);
  }
  state.soundboard.sequence[row][step] = !state.soundboard.sequence[row][step];
  const btn = document.querySelector(`.seq-step[data-row="${row}"][data-step="${step}"]`);
  if (btn) btn.classList.toggle('on', state.soundboard.sequence[row][step]);
  onChange();
}

/**
 * updatePlayhead(step)
 * Called by audio engine on each sequencer tick.
 */
export function updatePlayhead(step) {
  document.querySelectorAll('.seq-step').forEach(btn => {
    btn.classList.toggle('playing', step >= 0 && parseInt(btn.dataset.step, 10) === step);
  });
}

// ─── Effects ─────────────────────────────────────────────────────────────────

function renderEffects() {
  const panel = document.getElementById('effects-panel');
  panel.innerHTML = '';
  panel.classList.add('control-panel-section', 'panel-signal');

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'signal';
  panel.appendChild(label);

  const mixerRack = createRackModule('mixer', 'rack-module-signal');

  const volumeRow = document.createElement('div');
  volumeRow.className = 'effect-row master-volume-row';

  const volumeLabel = document.createElement('label');
  volumeLabel.className = 'effect-label';
  volumeLabel.textContent = 'volume';

  const volumeVal = document.createElement('span');
  volumeVal.className = 'effect-val';
  volumeVal.textContent = formatLevel(state.soundboard.volume ?? 0.5);
  volumeLabel.appendChild(volumeVal);

  const volumeSlider = document.createElement('input');
  volumeSlider.className = 'effect-slider';
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '1';
  volumeSlider.step = '0.01';
  volumeSlider.value = String(state.soundboard.volume ?? 0.5);
  volumeSlider.id = 'master-volume-slider';
  volumeSlider.addEventListener('input', () => {
    const val = parseFloat(volumeSlider.value);
    state.soundboard.volume = val;
    volumeVal.textContent = formatLevel(val);
    onChange();
  });

  volumeRow.append(volumeLabel, volumeSlider);
  mixerRack.body.appendChild(volumeRow);

  const sep = document.createElement('div');
  sep.className = 'panel-separator';
  mixerRack.body.appendChild(sep);
  const channelDeck = document.createElement('div');
  channelDeck.className = 'channel-effects-deck';

  const effectNames = getAvailableEffectNames();
  effectNames.forEach(name => {
    mixerRack.body.appendChild(createMasterEffectRow(name));
  });

  panel.appendChild(mixerRack.shell);

  state.unlocks.instruments.forEach(name => {
    channelDeck.appendChild(createChannelStrip(name, effectNames));
  });

  panel.appendChild(channelDeck);
}

function createMasterEffectRow(name) {
  const row = document.createElement('div');
  row.className = 'effect-row';

  const lbl = document.createElement('label');
  lbl.className = 'effect-label';
  lbl.textContent = name;

  const valDisp = document.createElement('span');
  valDisp.className = 'effect-val';
  valDisp.textContent = (state.soundboard.effects[name] ?? 0).toFixed(2);
  lbl.appendChild(valDisp);

  const slider = document.createElement('input');
  slider.className = 'effect-slider';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.value = state.soundboard.effects[name] ?? 0;
  slider.dataset.effect = name;
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    state.soundboard.effects[name] = val;
    valDisp.textContent = val.toFixed(2);
    onChange();
  });

  row.append(lbl, slider);
  return row;
}

function createChannelStrip(name, effectNames) {
  const rack = createRackModule(name, 'rack-module-signal', 'rack-module-channel', INSTRUMENT_TONE_CLASS[name] || 'tone-generic');
  rack.shell.dataset.instr = name;

  const strip = document.createElement('div');
  strip.className = 'channel-effects-strip';
  const channelState = state.soundboard.channelEffects[name] || {};

  effectNames.forEach(effectName => {
    strip.appendChild(createChannelKnob(name, effectName, channelState[effectName] ?? 0));
  });

  rack.body.appendChild(strip);
  return rack.shell;
}

function createChannelKnob(instrument, effectName, value) {
  const wrap = document.createElement('label');
  wrap.className = 'channel-knob';
  wrap.dataset.instr = instrument;
  wrap.dataset.effect = effectName;

  const title = document.createElement('span');
  title.className = 'channel-knob-label';
  title.textContent = effectName;

  const dial = document.createElement('span');
  dial.className = 'channel-knob-dial';
  dial.style.setProperty('--knob-value', String(value));

  const range = document.createElement('input');
  range.className = 'channel-knob-input';
  range.type = 'range';
  range.min = '0';
  range.max = '1';
  range.step = '0.01';
  range.value = String(value);

  const readout = document.createElement('span');
  readout.className = 'channel-knob-value';
  readout.textContent = value.toFixed(2);

  range.addEventListener('input', () => {
    const next = parseFloat(range.value);
    state.soundboard.channelEffects[instrument] ??= {};
    state.soundboard.channelEffects[instrument][effectName] = next;
    dial.style.setProperty('--knob-value', String(next));
    readout.textContent = next.toFixed(2);
    onChange();
  });

  dial.appendChild(range);
  wrap.append(title, dial, readout);
  return wrap;
}

// ─── Boss hold bar ────────────────────────────────────────────────────────────

/**
 * updateBossState()
 * Called from puzzle/logic when boss phase changes.
 * Adds/removes boss-active class and renders hold bar.
 */
export function updateBossState() {
  const cp = document.getElementById('control-panel');
  if (!cp) return;

  if (state.boss.active && state.boss.phase === 'puzzle') {
    cp.classList.add('boss-active');
    ensureHoldBar();
    animateHoldBar();
  } else if (state.boss.phase === 'leadup') {
    cp.classList.add('boss-active');
  } else {
    cp.classList.remove('boss-active');
    removeHoldBar();
  }
}

function ensureHoldBar() {
  if (document.getElementById('hold-bar-wrap')) return;

  const wrap = document.createElement('div');
  wrap.id = 'hold-bar-wrap';
  wrap.style.cssText = [
    'position:absolute',
    'bottom:0',
    'left:0',
    'right:0',
    'height:2px',
    'background:var(--border)',
    'z-index:10',
  ].join(';');

  const bar = document.createElement('div');
  bar.id = 'hold-bar';
  bar.style.cssText = [
    'height:100%',
    'width:0%',
    'background:var(--accent-portal)',
    'transition:background 0.3s',
  ].join(';');

  wrap.appendChild(bar);
  const cp = document.getElementById('control-panel');
  cp.style.position = 'relative';
  cp.appendChild(wrap);
}

function removeHoldBar() {
  if (holdBarRaf) { cancelAnimationFrame(holdBarRaf); holdBarRaf = null; }
  const el = document.getElementById('hold-bar-wrap');
  if (el) el.remove();
}

function animateHoldBar() {
  if (holdBarRaf) cancelAnimationFrame(holdBarRaf);

  function tick() {
    const bar = document.getElementById('hold-bar');
    if (!bar) return;

    if (state.boss.holdStart) {
      const elapsed = Date.now() - state.boss.holdStart;
      const progress = Math.min(1, elapsed / 8000);
      bar.style.width = `${progress * 100}%`;
      bar.style.background = progress > 0.8 ? 'var(--accent-warm)' : 'var(--accent-portal)';
    } else {
      bar.style.width = '0%';
      bar.style.background = 'var(--accent-portal)';
    }

    holdBarRaf = requestAnimationFrame(tick);
  }

  holdBarRaf = requestAnimationFrame(tick);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function onChange() {
  saveState();
  updateFromState(state);
  checkPuzzleState(state);
}

function isMirrorAvailable() {
  return state.rooms.bright.cleared
    && Math.abs(state.soundboard.lights.warm - state.soundboard.lights.cool) < 0.05;
}

export function updateMirrorAvailability() {
  const available = isMirrorAvailable();
  const portalArea = document.getElementById('portal-area');
  const mirrorBtn = document.getElementById('mirror-toggle-btn');

  portalArea?.classList.toggle('mirror-available', available);
  document.body.classList.toggle('mirror-available', available);

  if (!available && state.soundboard.mirrorActive) {
    state.soundboard.mirrorActive = false;
    setMirrorActive(false);
    mirrorBtn?.classList.remove('active');
  }

  if (mirrorBtn) {
    mirrorBtn.classList.toggle('available', available);
    const glyph = mirrorBtn.querySelector('.mirror-toggle-glyph');
    const whisper = mirrorBtn.querySelector('.mirror-toggle-whisper');

    if (glyph) {
      glyph.textContent = state.soundboard.mirrorActive ? '◈' : '◇';
    }

    if (whisper) {
      whisper.textContent = state.soundboard.mirrorActive ? 'open' : available ? 'aligned' : 'asymmetry';
    }
  }
}

function ensurePresets() {
  if (!Array.isArray(state.soundboard.presets)) {
    state.soundboard.presets = Array.from({ length: PRESET_SLOTS }, () => null);
    return;
  }

  while (state.soundboard.presets.length < PRESET_SLOTS) {
    state.soundboard.presets.push(null);
  }

  if (state.soundboard.presets.length > PRESET_SLOTS) {
    state.soundboard.presets = state.soundboard.presets.slice(0, PRESET_SLOTS);
  }
}

function getAvailableEffectNames() {
  return [
    ...EFFECT_ORDER.filter(name => state.unlocks.effects.includes(name)),
    ...state.unlocks.effects.filter(name => !EFFECT_ORDER.includes(name)),
  ];
}

function syncTransportButtons() {
  const running = isSequencerRunning();
  const play = document.querySelector('.transport-btn[data-transport="play"]');
  const pause = document.querySelector('.transport-btn[data-transport="pause"]');
  const restart = document.querySelector('.transport-btn[data-transport="restart"]');

  play?.classList.toggle('active', running);
  pause?.classList.remove('active');
  restart?.classList.remove('active');
  document.body.classList.toggle('transport-running', running);
  document.getElementById('portal-area')?.classList.toggle('transport-running', running);
}

function syncBpmControls() {
  const bpm = String(state.soundboard.bpm);
  const display = document.getElementById('bpm-display');
  const input = document.getElementById('bpm-input');
  const slider = document.getElementById('bpm-slider');

  if (display) display.textContent = bpm;
  if (input) input.value = bpm;
  if (slider) slider.value = bpm;
}

function savePreset(index) {
  state.soundboard.presets[index] = createPresetSnapshot();
  saveState();
  initControls();
}

function loadPreset(index) {
  const preset = state.soundboard.presets[index];
  if (!preset) return;

  state.soundboard.bpm = preset.bpm;
  state.soundboard.volume = preset.volume ?? 0.5;
  state.soundboard.activeInstruments = [...preset.activeInstruments];
  state.soundboard.sequence = preset.sequence.map(row => [...row]);
  state.soundboard.effects = { ...preset.effects };
  state.soundboard.channelEffects = {
    ...(state.soundboard.channelEffects || {}),
    ...Object.fromEntries(
      Object.entries(preset.channelEffects || {}).map(([name, effectState]) => [name, { ...effectState }]),
    ),
  };
  state.soundboard.lights = { ...preset.lights };
  state.soundboard.mirrorActive = Boolean(preset.mirrorActive);

  setMirrorActive(state.soundboard.mirrorActive);
  initControls();
  import('./lights.js').then(m => m.initLights());
  import('../rooms/manager.js').then(m => m.renderDoors());
  onChange();
}

function clearSequence() {
  const rows = state.unlocks.instruments.length;
  for (let r = 0; r < rows; r++) {
    state.soundboard.sequence[r] = new Array(SEQUENCE_STEPS).fill(false);
  }
  document.querySelectorAll('.seq-step').forEach(btn => btn.classList.remove('on'));
  onChange();
}

function createPresetSnapshot() {
  return {
    bpm: state.soundboard.bpm,
    volume: state.soundboard.volume ?? 0.5,
    activeInstruments: [...state.soundboard.activeInstruments],
    sequence: state.soundboard.sequence.map(row => [...row]),
    effects: { ...state.soundboard.effects },
    channelEffects: Object.fromEntries(
      Object.entries(state.soundboard.channelEffects || {}).map(([name, effectState]) => [name, { ...effectState }]),
    ),
    lights: { ...state.soundboard.lights },
    mirrorActive: state.soundboard.mirrorActive,
  };
}

export function enhanceDockablePanels() {
  bindFloatingPanelListeners();

  Object.keys(PANEL_TITLES).forEach(id => {
    const panel = document.getElementById(id);
    if (!panel) return;

    let chrome = panel.querySelector('.panel-chrome');
    if (!chrome) {
      chrome = document.createElement('div');
      chrome.className = 'panel-chrome';

      const grip = document.createElement('button');
      grip.type = 'button';
      grip.className = 'panel-drag-handle';
      grip.textContent = '::';
      grip.setAttribute('aria-label', `drag ${PANEL_TITLES[id]} panel`);
      grip.addEventListener('pointerdown', event => startPanelDrag(event, panel));

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'panel-undock-btn';
      toggle.textContent = '□';
      toggle.setAttribute('aria-label', `undock ${PANEL_TITLES[id]} panel`);
      toggle.addEventListener('click', () => togglePanelFloating(panel));

      chrome.append(grip, toggle);
      panel.appendChild(chrome);
    }

    applyFloatingState(panel);
  });
}

function bindFloatingPanelListeners() {
  if (dragListenersBound) return;
  dragListenersBound = true;

  document.addEventListener('pointermove', onPanelDragMove);
  document.addEventListener('pointerup', stopPanelDrag);
  document.addEventListener('pointercancel', stopPanelDrag);
}

function startPanelDrag(event, panel) {
  const floating = floatingPanels.get(panel.id);
  if (!floating?.active) return;

  event.preventDefault();
  const rect = panel.getBoundingClientRect();
  dragState = {
    panel,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  panel.setPointerCapture?.(event.pointerId);
  panel.classList.add('panel-dragging');
}

function onPanelDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const { panel, offsetX, offsetY } = dragState;
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  const left = clamp(event.clientX - offsetX, 0, maxLeft);
  const top = clamp(event.clientY - offsetY, 0, maxTop);

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;

  const state = floatingPanels.get(panel.id);
  if (state) {
    state.left = left;
    state.top = top;
  }
}

function stopPanelDrag(event) {
  if (!dragState) return;
  if (event && event.pointerId !== undefined && event.pointerId !== dragState.pointerId) return;

  dragState.panel.classList.remove('panel-dragging');
  dragState = null;
}

function togglePanelFloating(panel) {
  const state = floatingPanels.get(panel.id) || createFloatingState(panel);
  state.active = !state.active;
  floatingPanels.set(panel.id, state);

  if (state.active) {
    const rect = panel.getBoundingClientRect();
    state.left = state.left ?? clamp(rect.left, 12, Math.max(12, window.innerWidth - rect.width - 12));
    state.top = state.top ?? clamp(rect.top, 56, Math.max(56, window.innerHeight - rect.height - 12));
    state.width = state.width ?? Math.max(rect.width, 220);
    state.height = state.height ?? Math.max(rect.height, 180);
  }

  applyFloatingState(panel);
}

function createFloatingState(panel) {
  const rect = panel.getBoundingClientRect();
  return {
    active: false,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function applyFloatingState(panel) {
  const state = floatingPanels.get(panel.id);
  const active = Boolean(state?.active);
  panel.classList.toggle('panel-floating', active);

  const toggle = panel.querySelector('.panel-undock-btn');
  const grip = panel.querySelector('.panel-drag-handle');
  if (toggle) {
    toggle.textContent = active ? '▣' : '□';
    toggle.setAttribute('aria-label', `${active ? 'dock' : 'undock'} ${PANEL_TITLES[panel.id] || 'panel'}`);
  }
  if (grip) {
    grip.disabled = !active;
    grip.setAttribute('aria-hidden', String(!active));
  }

  if (!active) {
    panel.style.left = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.zIndex = '';
    return;
  }

  panel.style.left = `${state.left}px`;
  panel.style.top = `${state.top}px`;
  panel.style.width = `${state.width}px`;
  panel.style.height = `${state.height}px`;
  panel.style.zIndex = '140';

  requestAnimationFrame(() => {
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    if (width !== state.width || height !== state.height) {
      state.width = width;
      state.height = height;
      panel.style.width = `${width}px`;
      panel.style.height = `${height}px`;
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatLevel(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}
