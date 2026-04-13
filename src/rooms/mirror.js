/**
 * rooms/mirror.js
 * Room 4 — Mirror
 *
 * Only accessible via the Loseamp mirror portal (not a standard door).
 * Visually identical to another room — but something is wrong, missing, or added.
 * Spotting the difference reveals a code or position used elsewhere.
 *
 * Puzzle style: spot the difference, inversion reveals truth
 * Reward: a code, number sequence, or positional clue
 *
 * State flags (state.rooms.mirror.flags):
 *   - sourceRoom: string    — which room this is mirroring
 *   - differenceFound: bool
 *   - codeRevealed: string  — the actual code/clue value
 */

import { exitRoom } from './manager.js';

/**
 * enterMirror(state)
 * Render this room as a mirrored version of state.rooms.mirror.flags.sourceRoom.
 * The difference is determined by what the player has set on the soundboard.
 */
export function enterMirror(state) {
  const el = document.getElementById('room-mirror');
  el.classList.remove('hidden');
  const source = state.rooms.mirror.flags.sourceRoom ?? 'bright';
  // TODO: render mirrored version of source room with one deliberate change
}

function exitMirror() {
  const el = document.getElementById('room-mirror');
  el.classList.add('hidden');
  exitRoom();
}

/**
 * onDifferenceFound(state, location)
 * Player identifies the thing that's different.
 * Reveals the code and marks the room cleared.
 */
export function onDifferenceFound(state, location) {
  state.rooms.mirror.flags.differenceFound = true;
  const code = deriveCode(state, location);
  state.rooms.mirror.flags.codeRevealed = code;
  state.rooms.mirror.cleared = true;
  // TODO: display the code to the player, add to inventory
}

/**
 * deriveCode(state, location)
 * Pure function — compute the clue value from state and the found location.
 * This code is used in another room's puzzle.
 */
function deriveCode(state, location) {
  // TODO: define code derivation logic
  return null;
}
