/**
 * rooms/bright.js
 * Room 1 — Bright
 *
 * Too much happening. Fast, beautiful, overwhelming.
 * Clues are hidden in the noise — you have to find the signal.
 *
 * Puzzle style: find the signal in the chaos
 * Reward: unlocks a new instrument or tone on the soundboard
 *
 * State flags (state.rooms.bright.flags):
 *   - clueFound: bool
 *   - itemCollected: bool
 */

import { exitRoom } from './manager.js';

/**
 * enterBright(state)
 * Called when the player enters this room.
 * Render the room, start animations, restore any saved flags.
 */
export function enterBright(state) {
  const el = document.getElementById('room-bright');
  el.classList.remove('hidden');
  // TODO: render room contents based on state.rooms.bright.flags
}

/**
 * exitBright()
 * Clean up room, return to hub.
 */
function exitBright() {
  const el = document.getElementById('room-bright');
  el.classList.add('hidden');
  exitRoom();
}

/**
 * onClueFound(state)
 * Called when the player finds the hidden clue.
 * Updates flags, possibly changes room appearance.
 */
function onClueFound(state) {
  state.rooms.bright.flags.clueFound = true;
  // TODO: reveal item or next puzzle step
}

/**
 * onItemCollected(state)
 * Player picks up the reward item.
 * Adds to inventory, marks room cleared.
 */
function onItemCollected(state) {
  state.rooms.bright.flags.itemCollected = true;
  state.rooms.bright.cleared = true;
  // TODO: add item to state.inventory, trigger unlock in controls.js
}
