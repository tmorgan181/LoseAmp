/**
 * rooms/manager.js
 * Room routing, transitions, and door logic.
 */

import { state } from '../state.js';
import { evaluateDoors } from '../puzzle/logic.js';
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

// Atmospheric door labels — not room names
const DOOR_LABELS = {
  bright:    '▲',
  still:     '◦',
  clock:     '○',
  mirror:    '◈',
  threshold: '—',
};

/**
 * initRooms()
 */
export function initRooms() {
  renderDoors();
}

/**
 * renderDoors()
 * Inject door buttons into #room-doors based on evaluateDoors().
 */
export function renderDoors() {
  const container = document.getElementById('room-doors');
  if (!container) return;
  container.innerHTML = '';

  const visibility = evaluateDoors(state);

  Object.entries(visibility).forEach(([name, vis]) => {
    if (vis === 'hidden') return;

    const btn = document.createElement('button');
    btn.className = `door-btn ${vis}`;
    btn.dataset.room = name;
    btn.textContent = DOOR_LABELS[name] || name;

    if (vis === 'locked') {
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => enterRoom(name));
    }

    container.appendChild(btn);
  });
}

/**
 * enterRoom(name)
 */
export function enterRoom(name) {
  const hub = document.getElementById('hub');
  const roomEl = document.getElementById(`room-${name}`);
  if (!roomEl) return;

  hub.classList.remove('active');
  roomEl.classList.remove('hidden');

  // Small delay so CSS transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      roomEl.classList.add('active');
    });
  });

  state.currentScreen = name;
  if (!state.rooms[name]) state.rooms[name] = { visited: false, cleared: false, flags: {} };
  state.rooms[name].visited = true;

  const enterFn = roomMap[name];
  if (enterFn) enterFn(state);
}

/**
 * exitRoom()
 */
export function exitRoom() {
  const current = state.currentScreen;
  if (current === 'hub') return;

  const roomEl = document.getElementById(`room-${current}`);
  const hub = document.getElementById('hub');

  if (roomEl) {
    roomEl.classList.remove('active');
    setTimeout(() => {
      roomEl.classList.add('hidden');
    }, 400); // match transition-med
  }

  hub.classList.add('active');
  state.currentScreen = 'hub';

  renderDoors();
}
