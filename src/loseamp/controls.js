/**
 * loseamp/controls.js
 * The soundboard control panel.
 * Renders all unlocked controls and writes user input back to state.
 */

import { state, saveState } from '../state.js';
import { checkPuzzleState } from '../puzzle/logic.js';
import { updateFromState } from '../audio/engine.js';
import { setMirrorActive } from './portal.js';

let holdBarRaf = null;

/**
 * initControls()
 * Build the control panel DOM from current unlocks.
 * Re-call when new unlocks are added.
 */
export function initControls() {
  ensureSequence();
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
}

// ─── Instruments ─────────────────────────────────────────────────────────────

function renderInstruments() {
  const panel = document.getElementById('instruments-panel');
  panel.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'tone';
  panel.appendChild(label);

  const ALL = ['piano', 'bass', 'pad', 'noise'];
  ALL.forEach(name => {
    if (!state.unlocks.instruments.includes(name)) return;

    const btn = document.createElement('button');
    btn.className = 'instr-btn';
    btn.dataset.instr = name;
    btn.textContent = name;
    if (state.soundboard.activeInstruments.includes(name)) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => toggleInstrument(name));
    panel.appendChild(btn);
  });

  // Mirror toggle — appears after Room 1 (bright) is cleared
  if (state.rooms.bright.cleared) {
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--border);margin:6px 0;';
    panel.appendChild(sep);

    const mirrorBtn = document.createElement('button');
    mirrorBtn.id = 'mirror-toggle-btn';
    mirrorBtn.textContent = state.soundboard.mirrorActive ? '◈' : '◇';
    mirrorBtn.style.cssText = 'display:block;width:100%;letter-spacing:0.1em;';
    if (state.soundboard.mirrorActive) mirrorBtn.classList.add('active');

    mirrorBtn.addEventListener('click', () => {
      state.soundboard.mirrorActive = !state.soundboard.mirrorActive;
      mirrorBtn.classList.toggle('active', state.soundboard.mirrorActive);
      mirrorBtn.textContent = state.soundboard.mirrorActive ? '◈' : '◇';
      setMirrorActive(state.soundboard.mirrorActive);
      // Re-evaluate doors
      import('../rooms/manager.js').then(m => m.renderDoors());
      onChange();
    });

    panel.appendChild(mirrorBtn);
  }
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

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'sequence';
  panel.appendChild(label);

  // BPM row
  const bpmRow = document.createElement('div');
  bpmRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';

  const minus = document.createElement('button');
  minus.textContent = '−';
  minus.style.cssText = 'width:22px;height:22px;padding:0;flex-shrink:0;font-size:14px;line-height:1;';
  minus.addEventListener('click', () => changeBpm(-1));

  const bpmDisplay = document.createElement('span');
  bpmDisplay.id = 'bpm-display';
  bpmDisplay.textContent = state.soundboard.bpm;

  const plus = document.createElement('button');
  plus.textContent = '+';
  plus.style.cssText = 'width:22px;height:22px;padding:0;flex-shrink:0;font-size:14px;line-height:1;';
  plus.addEventListener('click', () => changeBpm(1));

  bpmRow.append(minus, bpmDisplay, plus);
  panel.appendChild(bpmRow);

  // Step grid
  const rows = state.unlocks.sequencerRows;
  const STEPS = 16;

  const grid = document.createElement('div');
  grid.id = 'seq-grid';
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${STEPS},1fr);gap:3px;`;

  for (let r = 0; r < rows; r++) {
    for (let s = 0; s < STEPS; s++) {
      const btn = document.createElement('button');
      btn.className = 'seq-step';
      btn.dataset.row = r;
      btn.dataset.step = s;
      if (state.soundboard.sequence[r]?.[s]) btn.classList.add('on');
      btn.addEventListener('click', () => toggleStep(r, s));
      grid.appendChild(btn);
    }
  }

  panel.appendChild(grid);
}

function changeBpm(delta) {
  const [min, max] = state.unlocks.bpmRange;
  state.soundboard.bpm = Math.max(min, Math.min(max, state.soundboard.bpm + delta));
  const disp = document.getElementById('bpm-display');
  if (disp) disp.textContent = state.soundboard.bpm;
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
    btn.classList.toggle('playing', parseInt(btn.dataset.step) === step);
  });
}

// ─── Effects ─────────────────────────────────────────────────────────────────

function renderEffects() {
  const panel = document.getElementById('effects-panel');
  panel.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'panel-label';
  label.textContent = 'signal';
  panel.appendChild(label);

  const ALL = ['reverb', 'delay', 'distortion', 'filter'];
  ALL.forEach(name => {
    if (!state.unlocks.effects.includes(name)) return;

    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:9px;';

    const lbl = document.createElement('label');
    lbl.textContent = name;
    lbl.style.cssText = 'display:block;margin-bottom:3px;';

    const valDisp = document.createElement('span');
    valDisp.className = 'effect-val';
    valDisp.style.cssText = 'float:right;color:var(--fg-muted);font-size:10px;';
    valDisp.textContent = (state.soundboard.effects[name] ?? 0).toFixed(2);
    lbl.appendChild(valDisp);

    const slider = document.createElement('input');
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
