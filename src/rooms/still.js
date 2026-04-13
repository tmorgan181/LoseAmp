/**
 * rooms/still.js
 * Room 2 — Still
 *
 * Almost nothing moves. Dark. You have to look carefully and wait.
 * Clues are hidden in absence — what's not there is the information.
 *
 * Puzzle style: patience, close inspection, absence as information
 * Reward: unlocks an effect or filter on the soundboard
 *
 * State flags (state.rooms.still.flags):
 *   - waited: bool         — player stayed long enough
 *   - absenceFound: bool   — player identified what's missing
 *   - itemCollected: bool
 */

import { exitRoom } from './manager.js';

/**
 * enterStill(state)
 */
export function enterStill(state) {
  const el = document.getElementById('room-still');
  el.classList.remove('hidden');
  // TODO: render room, start slow fade-in, begin wait timer
}

function exitStill() {
  const el = document.getElementById('room-still');
  el.classList.add('hidden');
  exitRoom();
}

/**
 * onWaitComplete(state)
 * Fires after player has remained in the room long enough.
 * Something subtle changes — a new detail becomes visible.
 */
function onWaitComplete(state) {
  state.rooms.still.flags.waited = true;
  // TODO: reveal hidden detail
}

function onAbsenceFound(state) {
  state.rooms.still.flags.absenceFound = true;
  // TODO: unlock next step
}

function onItemCollected(state) {
  state.rooms.still.flags.itemCollected = true;
  state.rooms.still.cleared = true;
  // TODO: add item to inventory, trigger effect unlock
}
