/**
 * loseamp/controls.js
 * The soundboard control panel.
 * Renders all unlocked controls and writes user input back to state.
 */

import { state, saveState } from '../state.js';
import { checkPuzzleState } from '../puzzle/logic.js';
import {
  isSequencerRunning,
  restartSequencer,
  resumeSequencer,
  stopSequencer,
  updateFromState,
} from '../audio/engine.js';
import { setMirrorActive } from './portal.js';

let holdBarRaf = null;
const INSTRUMENT_ORDER = ['piano', 'bass', 'pad', 'noise'];
const EFFECT_ORDER = ['reverb', 'delay', 'distortion', 'filter'];

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
}

function ensureSequence() {
  const rows = state.unlocks.sequencerRows;
  if (!Array.isArray(state.soundboard.sequence)) {
    state.soundboard.sequence = [];
  }
  for (let r = 0; r < rows; r++) {
    if (!Array.isArray(state.soundboard.sequence[r])) {
      state.soundboard.sequence[r] = new Array(16).fill(false);
    }
  }
  if (state.soundboard.sequence.length > rows) {
    state.soundboard.sequence = state.soundboard.sequence.slice(0, rows);
  }
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

  const cluster = document.createElement('div');
  cluster.className = 'instrument-cluster';
  panel.appendChild(cluster);

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

  // Mirror toggle — appears after Room 1 (bright) is cleared
  if (state.rooms.bright.cleared) {
    const sep = document.createElement('div');
    sep.className = 'panel-separator';
    panel.appendChild(sep);

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
    panel.appendChild(mirrorBtn);
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

  // BPM row
  const bpmRow = document.createElement('div');
  bpmRow.className = 'bpm-row';

  const minus = document.createElement('button');
  minus.className = 'bpm-nudge';
  minus.textContent = '−';
  minus.addEventListener('click', () => changeBpm(-1));

  const bpmDisplay = document.createElement('span');
  bpmDisplay.id = 'bpm-display';
  bpmDisplay.textContent = state.soundboard.bpm;

  const bpmInput = document.createElement('input');
  bpmInput.type = 'number';
  bpmInput.id = 'bpm-input';
  bpmInput.className = 'bpm-input';
  bpmInput.min = String(state.unlocks.bpmRange[0]);
  bpmInput.max = String(state.unlocks.bpmRange[1]);
  bpmInput.step = '1';
  bpmInput.value = String(state.soundboard.bpm);
  bpmInput.addEventListener('input', () => setBpm(bpmInput.value));
  bpmInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      setBpm(bpmInput.value);
      bpmInput.blur();
    }
  });

  const plus = document.createElement('button');
  plus.className = 'bpm-nudge';
  plus.textContent = '+';
  plus.addEventListener('click', () => changeBpm(1));

  bpmRow.append(minus, bpmDisplay, bpmInput, plus);
  panel.appendChild(bpmRow);

  const bpmSlider = document.createElement('input');
  bpmSlider.type = 'range';
  bpmSlider.id = 'bpm-slider';
  bpmSlider.className = 'bpm-slider';
  bpmSlider.min = String(state.unlocks.bpmRange[0]);
  bpmSlider.max = String(state.unlocks.bpmRange[1]);
  bpmSlider.step = '1';
  bpmSlider.value = String(state.soundboard.bpm);
  bpmSlider.addEventListener('input', () => setBpm(bpmSlider.value));
  panel.appendChild(bpmSlider);

  const transport = document.createElement('div');
  transport.className = 'transport-row';

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'transport-btn';
  playBtn.dataset.transport = 'play';
  playBtn.textContent = 'play';
  playBtn.addEventListener('click', () => {
    resumeSequencer();
    syncTransportButtons();
  });

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'transport-btn';
  pauseBtn.dataset.transport = 'pause';
  pauseBtn.textContent = 'pause';
  pauseBtn.addEventListener('click', () => {
    stopSequencer();
    syncTransportButtons();
  });

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'transport-btn';
  restartBtn.dataset.transport = 'restart';
  restartBtn.textContent = 'restart';
  restartBtn.addEventListener('click', () => {
    restartSequencer();
    syncTransportButtons();
  });

  transport.append(playBtn, pauseBtn, restartBtn);
  panel.appendChild(transport);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'transport-btn clear-btn';
  clearBtn.textContent = 'clear';
  clearBtn.addEventListener('click', clearSequence);
  panel.appendChild(clearBtn);

  const presets = document.createElement('div');
  presets.className = 'preset-row';

  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'preset-slot';

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
    saveBtn.textContent = 'save';
    saveBtn.addEventListener('click', () => savePreset(i));

    slot.append(recallBtn, saveBtn);
    presets.appendChild(slot);
  }

  panel.appendChild(presets);

  // Step grid
  const rows = state.unlocks.sequencerRows;
  const STEPS = 16;

  const grid = document.createElement('div');
  grid.id = 'seq-grid';
  grid.className = 'seq-grid';
  grid.style.gridTemplateColumns = `repeat(${STEPS}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  grid.style.setProperty('--seq-rows', String(rows));

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
      marker.textContent = '·';
    }
    markers.appendChild(marker);
  }

  panel.appendChild(markers);
  for (let r = 0; r < rows; r++) {
    for (let s = 0; s < STEPS; s++) {
      const btn = document.createElement('button');
      btn.className = 'seq-step';
      btn.dataset.row = r;
      btn.dataset.step = s;
      if (s % 4 === 0) btn.classList.add('seq-step-major');
      if (state.soundboard.sequence[r]?.[s]) btn.classList.add('on');
      btn.addEventListener('click', () => toggleStep(r, s));
      grid.appendChild(btn);
    }
  }

  panel.appendChild(grid);
  syncTransportButtons();
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
    state.soundboard.sequence[row] = new Array(16).fill(false);
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

  const effectNames = [
    ...EFFECT_ORDER.filter(name => state.unlocks.effects.includes(name)),
    ...state.unlocks.effects.filter(name => !EFFECT_ORDER.includes(name)),
  ];

  effectNames.forEach(name => {

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
    panel.appendChild(row);
  });
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
    state.soundboard.presets = [null, null, null];
    return;
  }

  while (state.soundboard.presets.length < 3) {
    state.soundboard.presets.push(null);
  }

  if (state.soundboard.presets.length > 3) {
    state.soundboard.presets = state.soundboard.presets.slice(0, 3);
  }
}

function syncTransportButtons() {
  const running = isSequencerRunning();
  const play = document.querySelector('.transport-btn[data-transport="play"]');
  const pause = document.querySelector('.transport-btn[data-transport="pause"]');

  play?.classList.toggle('active', running);
  pause?.classList.toggle('active', !running);
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
  state.soundboard.activeInstruments = [...preset.activeInstruments];
  state.soundboard.sequence = preset.sequence.map(row => [...row]);
  state.soundboard.effects = { ...preset.effects };
  state.soundboard.lights = { ...preset.lights };
  state.soundboard.mirrorActive = Boolean(preset.mirrorActive);

  setMirrorActive(state.soundboard.mirrorActive);
  initControls();
  import('./lights.js').then(m => m.initLights());
  import('../rooms/manager.js').then(m => m.renderDoors());
  onChange();
}

function clearSequence() {
  const rows = state.unlocks.sequencerRows;
  for (let r = 0; r < rows; r++) {
    state.soundboard.sequence[r] = new Array(16).fill(false);
  }
  document.querySelectorAll('.seq-step').forEach(btn => btn.classList.remove('on'));
  onChange();
}

function createPresetSnapshot() {
  return {
    bpm: state.soundboard.bpm,
    activeInstruments: [...state.soundboard.activeInstruments],
    sequence: state.soundboard.sequence.map(row => [...row]),
    effects: { ...state.soundboard.effects },
    lights: { ...state.soundboard.lights },
    mirrorActive: state.soundboard.mirrorActive,
  };
}
