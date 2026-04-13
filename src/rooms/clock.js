/**
 * rooms/clock.js
 * Room 3 — Clock
 *
 * A rhythm puzzle. Something must be done at a specific interval.
 * Miss it enough times and the room resets.
 * Habit is the mechanic.
 *
 * Puzzle style: timing, repetition, consistency
 * Reward: expands BPM range or unlocks additional sequencer rows
 *
 * State flags (state.rooms.clock.flags):
 *   - consecutiveHits: number   — how many times the player hit the beat
 *   - resetCount: number        — how many times the room has reset
 *   - cleared: bool
 */

import { exitRoom } from './manager.js';

const REQUIRED_CONSECUTIVE = 8;  // must hit the beat N times in a row to clear

let intervalId = null;
let beatWindowOpen = false;

/**
 * enterClock(state)
 */
export function enterClock(state) {
  const el = document.getElementById('room-clock');
  el.classList.remove('hidden');
  state.rooms.clock.flags.consecutiveHits ??= 0;
  state.rooms.clock.flags.resetCount ??= 0;
  // TODO: render room, start the rhythm cycle
}

function exitClock() {
  stopRhythm();
  const el = document.getElementById('room-clock');
  el.classList.add('hidden');
  exitRoom();
}

/**
 * startRhythm()
 * Open a beat window at regular intervals.
 * Player must act during the window.
 */
function startRhythm() {
  // TODO: setInterval based on current BPM from state
  // Open beatWindowOpen = true for a short duration
  // If player doesn't act: onMiss()
}

function stopRhythm() {
  if (intervalId) clearInterval(intervalId);
}

/**
 * onPlayerAction(state)
 * Player performs the required action.
 * If within the beat window: onHit(). Otherwise: onMiss().
 */
export function onPlayerAction(state) {
  if (beatWindowOpen) {
    onHit(state);
  } else {
    onMiss(state);
  }
}

function onHit(state) {
  state.rooms.clock.flags.consecutiveHits++;
  // TODO: visual feedback, check for clear condition
  if (state.rooms.clock.flags.consecutiveHits >= REQUIRED_CONSECUTIVE) {
    onCleared(state);
  }
}

function onMiss(state) {
  state.rooms.clock.flags.consecutiveHits = 0;
  state.rooms.clock.flags.resetCount++;
  // TODO: visual reset feedback
}

function onCleared(state) {
  stopRhythm();
  state.rooms.clock.cleared = true;
  // TODO: reveal reward item, trigger sequencer/BPM unlock
}
