/**
 * rooms/manager.js
 * Room routing, transitions, and door logic.
 *
 * Responsibilities:
 * - Track which doors are currently visible based on soundboard state
 * - Handle entering/exiting rooms (screen transitions)
 * - Pass room-specific state flags to each room module on enter
 * - Update door visibility whenever state changes
 */

import { state } from '../state.js';
import { enterBright } from './bright.js';
import { enterStill } from './still.js';
import { enterClock } from './clock.js';
import { enterMirror } from './mirror.js';
import { enterThreshold } from './threshold.js';

const roomMap = {
  bright:    enterBright,
  still:     enterStill,
  clock:     enterClock,
  mirror:    enterMirror,
  threshold: enterThreshold,
};

/**
 * initRooms()
 * Set up door buttons and initial visibility.
 */
export function initRooms() {
  renderDoors();
}

/**
 * renderDoors()
 * Inject door buttons into #room-doors.
 * Visibility and lock state driven by state and getDoorVisibility().
 */
function renderDoors() {
  // TODO: for each room, render a door button if it should be visible
  // Attach click handler -> enterRoom(roomName)
}

/**
 * getDoorVisibility()
 * Returns an object mapping room names to 'visible' | 'hidden' | 'locked'.
 * Pure function of current soundboard state.
 */
export function getDoorVisibility(state) {
  // TODO: define conditions per room
  return {
    bright:    'hidden',
    still:     'hidden',
    clock:     'hidden',
    mirror:    'hidden',
    threshold: 'hidden',
  };
}

/**
 * enterRoom(name)
 * Transition from hub to a room screen.
 */
export function enterRoom(name) {
  // TODO: hide hub, show room, call room's enter function
  // Update state.currentScreen
  const enterFn = roomMap[name];
  if (enterFn) enterFn(state);
}

/**
 * exitRoom()
 * Return to the hub from any room.
 */
export function exitRoom() {
  // TODO: hide current room, show hub, re-evaluate doors
  state.currentScreen = 'hub';
  renderDoors();
}
