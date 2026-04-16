/**
 * loseamp/lights.js
 * Stage lighting system for the Loseamp hub.
 */

import { SUPPORTED_LIGHT_MODES, state, saveState } from '../state.js';
import { checkPuzzleState } from '../puzzle/logic.js';
import { enhanceDockablePanels, updateMirrorAvailability } from './controls.js';

const MODE_LABELS = {
  off:      'off',
  warm:     'warm',
  cool:     'cool',
  balanced: 'balanced',
  pulse:    'pulse',
  strobe:   'strobe',
};
const MODE_ORDER = ['off', ...SUPPORTED_LIGHT_MODES];

export function initLights() {
  renderLightControls();
  applyLights();
  updateMirrorAvailability();
  enhanceDockablePanels();
}

function renderLightControls() {
  const panel = document.getElementById('lights-panel');
  panel.innerHTML = '';
  panel.classList.add('control-panel-section', 'panel-light');

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'light';
  panel.appendChild(label);

  const ambience = document.createElement('section');
  ambience.className = 'rack-module rack-module-light';

  const ambienceTitle = document.createElement('div');
  ambienceTitle.className = 'rack-module-title';
  ambienceTitle.textContent = 'ambience';
  ambience.appendChild(ambienceTitle);

  const ambienceBody = document.createElement('div');
  ambienceBody.className = 'rack-module-body';
  ambience.appendChild(ambienceBody);

  // Warm slider
  ambienceBody.appendChild(makeSlider('warm', state.soundboard.lights.warm, val => {
    state.soundboard.lights.warm = val;
    onChange();
  }));

  // Cool slider
  ambienceBody.appendChild(makeSlider('cool', state.soundboard.lights.cool, val => {
    state.soundboard.lights.cool = val;
    onChange();
  }));
  panel.appendChild(ambience);

  // Mode buttons
  const modesWrap = document.createElement('div');
  modesWrap.id = 'light-modes';
  modesWrap.className = 'light-modes';

  const scenes = document.createElement('section');
  scenes.className = 'rack-module rack-module-light rack-module-scenes';

  const scenesTitle = document.createElement('div');
  scenesTitle.className = 'rack-module-title';
  scenesTitle.textContent = 'scenes';
  scenes.appendChild(scenesTitle);

  const scenesBody = document.createElement('div');
  scenesBody.className = 'rack-module-body';
  scenes.appendChild(scenesBody);

  const modes = [
    'off',
    ...MODE_ORDER.filter(mode => mode !== 'off' && state.unlocks.lightModes.includes(mode)),
    ...state.unlocks.lightModes.filter(mode => !MODE_ORDER.includes(mode)),
  ];

  modes.forEach(mode => {
    if (!state.unlocks.lightModes.includes(mode) && mode !== 'off') return;

    const btn = document.createElement('button');
    btn.className = 'light-mode-btn';
    btn.dataset.mode = mode;
    btn.textContent = MODE_LABELS[mode];
    if (state.soundboard.lights.mode === mode) btn.classList.add('active');

    btn.addEventListener('click', () => setMode(mode));
    modesWrap.appendChild(btn);
  });

  scenesBody.appendChild(modesWrap);
  panel.appendChild(scenes);
}

function makeSlider(name, initial, onInput) {
  const row = document.createElement('div');
  row.className = 'light-row';

  const lbl = document.createElement('label');
  lbl.className = 'light-label';
  lbl.textContent = name;

  const valDisp = document.createElement('span');
  valDisp.className = 'light-val';
  valDisp.textContent = initial.toFixed(2);
  lbl.appendChild(valDisp);

  const slider = document.createElement('input');
  slider.className = 'light-slider';
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
  document.querySelectorAll('#lights-panel label span').forEach((el, index) => {
    el.textContent = [state.soundboard.lights.warm, state.soundboard.lights.cool][index].toFixed(2);
  });
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
  updateMirrorAvailability();
  import('../rooms/manager.js').then(m => m.renderDoors());
  saveState();
  checkPuzzleState(state);
}
