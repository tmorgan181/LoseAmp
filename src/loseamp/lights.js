/**
 * loseamp/lights.js
 * Stage lighting system for the Loseamp hub.
 */

import { state, saveState } from '../state.js';
import { checkPuzzleState } from '../puzzle/logic.js';

const MODE_LABELS = {
  off:      'off',
  warm:     'warm',
  cool:     'cool',
  balanced: 'balanced',
  pulse:    'pulse',
  strobe:   'strobe',
};

export function initLights() {
  renderLightControls();
  applyLights();
}

function renderLightControls() {
  const panel = document.getElementById('lights-panel');
  panel.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'light';
  panel.appendChild(label);

  // Warm slider
  panel.appendChild(makeSlider('warm', state.soundboard.lights.warm, val => {
    state.soundboard.lights.warm = val;
    onChange();
  }));

  // Cool slider
  panel.appendChild(makeSlider('cool', state.soundboard.lights.cool, val => {
    state.soundboard.lights.cool = val;
    onChange();
  }));

  // Mode buttons
  const modesWrap = document.createElement('div');
  modesWrap.id = 'light-modes';
  modesWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-top:6px;';

  const ALL_MODES = ['off', 'warm', 'cool', 'balanced', 'pulse', 'strobe'];
  ALL_MODES.forEach(mode => {
    if (!state.unlocks.lightModes.includes(mode) && mode !== 'off') return;

    const btn = document.createElement('button');
    btn.className = 'light-mode-btn';
    btn.dataset.mode = mode;
    btn.textContent = MODE_LABELS[mode];
    btn.style.cssText = 'font-size:10px;padding:3px 6px;';
    if (state.soundboard.lights.mode === mode) btn.classList.add('active');

    btn.addEventListener('click', () => setMode(mode));
    modesWrap.appendChild(btn);
  });

  panel.appendChild(modesWrap);
}

function makeSlider(name, initial, onInput) {
  const row = document.createElement('div');
  row.style.cssText = 'margin-bottom:8px;';

  const lbl = document.createElement('label');
  lbl.textContent = name;
  lbl.style.cssText = 'display:block;margin-bottom:3px;';

  const valDisp = document.createElement('span');
  valDisp.style.cssText = 'float:right;color:var(--fg-muted);font-size:10px;';
  valDisp.textContent = initial.toFixed(2);
  lbl.appendChild(valDisp);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.value = initial;
  slider.id = `light-${name}-slider`;
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    valDisp.textContent = val.toFixed(2);
    onInput(val);
  });

  row.append(lbl, slider);
  return row;
}

function setMode(mode) {
  state.soundboard.lights.mode = mode;

  // Apply preset warm/cool values for mode shortcuts
  if (mode === 'warm') {
    state.soundboard.lights.warm = 0.8;
    state.soundboard.lights.cool = 0.1;
    syncSliders();
  } else if (mode === 'cool') {
    state.soundboard.lights.warm = 0.1;
    state.soundboard.lights.cool = 0.8;
    syncSliders();
  } else if (mode === 'balanced') {
    state.soundboard.lights.warm = 0.5;
    state.soundboard.lights.cool = 0.5;
    syncSliders();
  } else if (mode === 'off') {
    state.soundboard.lights.warm = 0;
    state.soundboard.lights.cool = 0;
    syncSliders();
  }

  document.querySelectorAll('.light-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  onChange();
}

function syncSliders() {
  const ws = document.getElementById('light-warm-slider');
  const cs = document.getElementById('light-cool-slider');
  if (ws) ws.value = state.soundboard.lights.warm;
  if (cs) cs.value = state.soundboard.lights.cool;
}

/**
 * applyLights()
 * Push current light state to the DOM via CSS variables.
 */
export function applyLights() {
  const root = document.documentElement;
  root.style.setProperty('--light-warm', state.soundboard.lights.warm);
  root.style.setProperty('--light-cool', state.soundboard.lights.cool);
}

function onChange() {
  applyLights();
  saveState();
  checkPuzzleState(state);
}
