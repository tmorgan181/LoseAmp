/**
 * loseamp/controls.js
 * The soundboard control panel.
 * Renders all unlocked controls and writes user input back to state.
 *
 * Responsibilities:
 * - Render instrument toggles (only unlocked ones)
 * - Render beat sequencer grid (BPM + steps)
 * - Render effects knobs/sliders
 * - On any change: update state.soundboard, trigger puzzle check
 */

import { state, saveState } from '../state.js';
import { checkPuzzleState } from '../puzzle/logic.js';

/**
 * initControls()
 * Build the control panel DOM from current unlocks.
 * Re-call when new unlocks are added.
 */
export function initControls() {
  renderInstruments();
  renderSequencer();
  renderEffects();
}

function renderInstruments() {
  // TODO: for each instrument in state.unlocks.instruments, render a toggle button
  // On toggle: update state.soundboard.activeInstruments, call onChange()
}

function renderSequencer() {
  // TODO: render BPM input + 16-step grid
  // Rows limited to state.unlocks.sequencerRows
  // On change: update state.soundboard.sequence, state.soundboard.bpm, call onChange()
}

function renderEffects() {
  // TODO: for each effect in state.unlocks.effects, render a knob or slider
  // On change: update state.soundboard.effects[name], call onChange()
}

function onChange() {
  saveState();
  checkPuzzleState(state);
}
