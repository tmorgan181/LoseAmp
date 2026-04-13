/**
 * puzzle/logic.js
 * Puzzle validation, inventory management, unlock conditions, boss sequence.
 *
 * Responsibilities:
 * - Define what each room reward unlocks on the soundboard
 * - Define door visibility conditions (used by rooms/manager.js)
 * - Validate the final boss puzzle (the Concert)
 * - Manage the boss phase transitions: leadup → puzzle → escape
 */

import { playEscapeSequence } from '../loseamp/portal.js';
import { saveState } from '../state.js';

// ─── Inventory / Unlocks ────────────────────────────────────────────────────

/**
 * applyUnlock(state, item)
 * Called when a room reward is collected.
 * Maps item names to soundboard unlocks.
 */
export function applyUnlock(state, item) {
  // TODO: define item -> unlock mapping
  // e.g. item 'piano' -> state.unlocks.instruments.push('piano')
  saveState(state);
}

// ─── Door Conditions ────────────────────────────────────────────────────────

/**
 * evaluateDoors(state)
 * Returns visibility map for all rooms.
 * Called whenever soundboard state changes.
 *
 * @returns {{ [room]: 'visible' | 'locked' | 'hidden' }}
 */
export function evaluateDoors(state) {
  const sb = state.soundboard;
  return {
    bright:    'visible',  // TODO: define real conditions
    still:     'hidden',
    clock:     'hidden',
    mirror:    'hidden',   // only via mirror portal
    threshold: isMiddleState(sb) ? 'visible' : 'hidden',
  };
}

/**
 * isMiddleState(soundboard)
 * True when the soundboard is neither too flat nor too loud —
 * the condition that opens the Threshold door.
 */
function isMiddleState(sb) {
  const bpmOk = sb.bpm >= 65 && sb.bpm <= 80;
  // TODO: define instrument/effects/lights middle conditions
  return bpmOk;
}

// ─── Puzzle State Check ─────────────────────────────────────────────────────

/**
 * checkPuzzleState(state)
 * Called on every soundboard change.
 * Checks whether the final concert puzzle is currently satisfied.
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
const HOLD_DURATION_MS = 8000; // must sustain correct state for 8 bars (~8s at 60bpm)

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
 * The answer: the middle path.
 * Not the loudest. Not the emptiest. Held.
 *
 * Conditions (all must be true simultaneously):
 * - BPM in resting range (approx 70–75)
 * - Specific instruments active (foundation only — piano + bass)
 * - Effects: reverb moderate, delay present, distortion off, filter centered
 * - Lights: warm and cool balanced (both ~0.5), no strobe/pulse
 */
export function isConcertSolved(sb) {
  const bpmOk      = sb.bpm >= 70 && sb.bpm <= 75;
  const instrOk    = arraysMatch(sb.activeInstruments, ['piano', 'bass']);
  const reverbOk   = sb.effects.reverb >= 0.3 && sb.effects.reverb <= 0.6;
  const delayOk    = sb.effects.delay >= 0.2 && sb.effects.delay <= 0.5;
  const distortOk  = sb.effects.distortion === 0;
  const filterOk   = sb.effects.filter >= 0.4 && sb.effects.filter <= 0.6;
  const lightsOk   = sb.lights.warm >= 0.4 && sb.lights.warm <= 0.6
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
 * Called from threshold.js when player interacts with the exit door.
 * Begins the lead-up phase: portal shifts, a new UI element appears.
 */
export function triggerBossLeadup(state) {
  state.boss.active = true;
  state.boss.phase = 'leadup';
  // TODO: animate the Loseamp portal into lead-up mode
  // TODO: show hint/overlay that something is ready
  setTimeout(() => {
    state.boss.phase = 'puzzle';
    // TODO: signal to controls.js that boss puzzle is active (visual change)
  }, 6000); // lead-up lasts ~6 seconds
}

/**
 * triggerEscape(state)
 * Called when isConcertSolved() has been sustained long enough.
 */
function triggerEscape(state) {
  state.boss.phase = 'escape';
  state.boss.escaped = true;
  saveState(state);
  playEscapeSequence();
}
