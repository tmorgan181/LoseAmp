/**
 * rooms/threshold.js
 * Room 5 — Threshold
 *
 * Only visible when the Loseamp is in the middle state — not too hot, not too quiet.
 * Contains the exit. Getting here requires balance, not power.
 * The final puzzle is in the hub (the Concert), not in this room.
 * This room is the confirmation that you're ready.
 *
 * Puzzle style: gating — presence here means you've already done the work
 * Reward: access to the final boss sequence
 *
 * State flags (state.rooms.threshold.flags):
 *   - reached: bool        — player made it here
 *   - bossTriggered: bool
 */

import { exitRoom } from './manager.js';
import { triggerBossLeadup } from '../puzzle/logic.js';

/**
 * enterThreshold(state)
 */
export function enterThreshold(state) {
  const el = document.getElementById('room-threshold');
  el.classList.remove('hidden');
  state.rooms.threshold.flags.reached = true;
  state.rooms.threshold.visited = true;
  // TODO: render room — quiet, spare, the door to outside visible
}

function exitThreshold() {
  const el = document.getElementById('room-threshold');
  el.classList.add('hidden');
  exitRoom();
}

/**
 * onExitDoorInteract(state)
 * Player interacts with the exit door.
 * Sends them back to the hub and triggers the boss lead-up phase.
 */
export function onExitDoorInteract(state) {
  state.rooms.threshold.flags.bossTriggered = true;
  exitThreshold();
  triggerBossLeadup(state);
}
