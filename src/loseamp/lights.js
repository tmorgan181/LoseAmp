/**
 * loseamp/lights.js
 * Stage lighting system for the Loseamp hub.
 *
 * Responsibilities:
 * - Render light controls (only unlocked modes)
 * - Apply lighting state as CSS classes / variables to the hub
 * - Specific light combinations are part of the final puzzle
 */

import { state, saveState } from '../state.js';
import { checkPuzzleState } from '../puzzle/logic.js';

/**
 * initLights()
 * Build light controls from state.unlocks.lightModes.
 */
export function initLights() {
  renderLightControls();
  applyLights();
}

function renderLightControls() {
  // TODO: render warm/cool sliders + mode toggles for unlocked modes
  // On change: update state.soundboard.lights, call onChange()
}

/**
 * applyLights()
 * Push current light state to the DOM via CSS variables.
 * Called whenever lights change.
 */
export function applyLights() {
  // TODO: set --light-warm, --light-cool, --light-mode on :root or hub element
}

function onChange() {
  applyLights();
  saveState();
  checkPuzzleState(state);
}
