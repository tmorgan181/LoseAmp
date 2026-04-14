/**
 * puzzle/logic.js
 * Puzzle validation, inventory management, unlock conditions, boss sequence.
 */

import { playEscapeSequence, setBossPhase } from '../loseamp/portal.js';
import { saveState } from '../state.js';

// ─── Inventory / Unlocks ────────────────────────────────────────────────────

/**
 * applyUnlock(state, item)
 * Called when a room reward is collected.
 * Maps item names to soundboard unlocks.
 */
export function applyUnlock(state, item) {
  switch (item) {
    case 'pad':
      if (!state.unlocks.instruments.includes('pad')) {
        state.unlocks.instruments.push('pad');
      }
      break;
    case 'noise':
      if (!state.unlocks.instruments.includes('noise')) {
        state.unlocks.instruments.push('noise');
      }
      break;
    case 'delay':
      if (!state.unlocks.effects.includes('delay')) {
        state.unlocks.effects.push('delay');
      }
      break;
    case 'distortion':
      if (!state.unlocks.effects.includes('distortion')) {
        state.unlocks.effects.push('distortion');
      }
      break;
    case 'bpm-expand':
      state.unlocks.bpmRange = [15, 90];
      break;
    case 'sequencer-row':
      state.unlocks.sequencerRows = Math.min(4, state.unlocks.sequencerRows + 1);
      break;
  }
  saveState(state);
}

// ─── Door Conditions ────────────────────────────────────────────────────────

/**
 * evaluateDoors(state)
 * Returns visibility map for all rooms.
 */
export function evaluateDoors(state) {
  const sb = state.soundboard;
  const rooms = state.rooms;

  return {
    // Bright: only appears once the machine has been awakened
    bright: state.meta?.awakened ? 'visible' : 'hidden',

    // Still: opens after Bright is cleared
    still: rooms.bright.cleared ? 'visible' : 'hidden',

    // Clock: opens after Still is cleared
    clock: rooms.still.cleared ? 'visible' : 'hidden',

    // Mirror: only via mirror portal activation
    mirror: sb.mirrorActive ? 'visible' : 'hidden',

    // Threshold: only when soundboard is in the middle state
    threshold: isMiddleState(sb) && !state.boss.escaped ? 'visible' : 'hidden',
  };
}

/**
 * isMiddleState(soundboard)
 * True when the board is balanced — not too much, not too little.
 * This is the condition that makes the Threshold door appear.
 */
function isMiddleState(sb) {
  const bpmOk = sb.bpm >= 65 && sb.bpm <= 80;
  const hasInstruments = sb.activeInstruments.length >= 1 && sb.activeInstruments.length <= 3;
  const notLoud = sb.effects.distortion < 0.5;
  const lightsOk = sb.lights.warm > 0 || sb.lights.cool > 0;
  return bpmOk && hasInstruments && notLoud && lightsOk;
}

// ─── Puzzle State Check ─────────────────────────────────────────────────────

/**
 * checkPuzzleState(state)
 * Called on every soundboard change.
 */
export function checkPuzzleState(state) {
  if (!state.boss.active) return;
  if (state.boss.phase !== 'puzzle') return;

  if (isConcertSolved(state.soundboard)) {
    if (!state.boss.holdStart) {
      state.boss.holdStart = Date.now();
      startHoldTimer(state);
    }
  } else {
    state.boss.holdStart = null;
    clearHoldTimer();
  }
}

let holdTimer = null;
const HOLD_DURATION_MS = 8000;

function startHoldTimer(state) {
  clearHoldTimer();
  holdTimer = setTimeout(() => {
    triggerEscape(state);
  }, HOLD_DURATION_MS);
}

function clearHoldTimer() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
}

// ─── The Concert Puzzle ─────────────────────────────────────────────────────

/**
 * isConcertSolved(soundboard)
 * The answer: the middle path. Held.
 */
export function isConcertSolved(sb) {
  const bpmOk     = sb.bpm >= 70 && sb.bpm <= 75;
  const instrOk   = arraysMatch(sb.activeInstruments, ['piano', 'bass']);
  const reverbOk  = sb.effects.reverb >= 0.3 && sb.effects.reverb <= 0.6;
  const delayOk   = sb.effects.delay >= 0.2 && sb.effects.delay <= 0.5;
  const distortOk = sb.effects.distortion === 0;
  const filterOk  = sb.effects.filter >= 0.4 && sb.effects.filter <= 0.6;
  const lightsOk  = sb.lights.warm >= 0.4 && sb.lights.warm <= 0.6
                 && sb.lights.cool >= 0.4 && sb.lights.cool <= 0.6
                 && sb.lights.mode !== 'strobe' && sb.lights.mode !== 'pulse';

  return bpmOk && instrOk && reverbOk && delayOk && distortOk && filterOk && lightsOk;
}

function arraysMatch(a, b) {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

// ─── Boss Phase Transitions ─────────────────────────────────────────────────

/**
 * triggerBossLeadup(state)
 * Called when player interacts with the Threshold exit door.
 */
export function triggerBossLeadup(state) {
  state.boss.active = true;
  state.boss.phase = 'leadup';

  setBossPhase('leadup');

  // Signal control panel
  import('../loseamp/controls.js').then(m => m.updateBossState?.());

  // Show a quiet hint after lead-up settles
  setTimeout(() => {
    showLeadupHint();
  }, 1500);

  setTimeout(() => {
    state.boss.phase = 'puzzle';
    setBossPhase('puzzle');
    import('../loseamp/controls.js').then(m => m.updateBossState?.());
  }, 6000);
}

function showLeadupHint() {
  const existing = document.getElementById('boss-hint');
  if (existing) return;

  const hint = document.createElement('div');
  hint.id = 'boss-hint';
  hint.style.cssText = [
    'position:fixed',
    'top:50px',
    'left:50%',
    'transform:translateX(-50%)',
    'font-family:var(--font-mono)',
    'font-size:11px',
    'color:rgba(80,112,96,0)',
    'letter-spacing:0.2em',
    'pointer-events:none',
    'z-index:50',
    'transition:color 2s ease',
  ].join(';');
  hint.textContent = 'something has shifted';
  document.body.appendChild(hint);

  requestAnimationFrame(() => {
    hint.style.color = 'rgba(80,112,96,0.5)';
  });

  setTimeout(() => {
    hint.style.color = 'rgba(80,112,96,0)';
    setTimeout(() => hint.remove(), 2500);
  }, 4000);
}

/**
 * triggerEscape(state)
 * Called when isConcertSolved() sustained long enough.
 */
function triggerEscape(state) {
  state.boss.phase = 'escape';
  state.boss.escaped = true;
  saveState(state);
  playEscapeSequence();
}
