/**
 * rooms/threshold.js
 * Room 5 — Threshold
 * Sparse. A single door outline at center. Clicking it triggers the boss.
 * First-visit text appears after 3 seconds, never again.
 */

import { exitRoom } from './manager.js';
import { triggerBossLeadup } from '../puzzle/logic.js';

export function enterThreshold(state) {
  const el = document.getElementById('room-threshold');
  el.innerHTML = '';

  state.rooms.threshold.flags.reached = true;
  state.rooms.threshold.visited = true;

  // Back button
  const back = document.createElement('button');
  back.className = 'room-back';
  back.textContent = '←';
  back.addEventListener('click', () => exitThreshold());
  el.appendChild(back);

  // The door — centered, just an outline
  const door = document.createElement('div');
  door.className = 'exit-door';
  door.style.cssText = [
    'width:60px',
    'height:100px',
    'border:1px solid rgba(80,112,96,0.2)',
    'cursor:pointer',
    'transition:border-color var(--transition-slow)',
    'position:relative',
  ].join(';');
  door.addEventListener('click', () => onExitDoorInteract(state));
  door.addEventListener('mouseenter', () => {
    door.style.borderColor = 'rgba(80,112,96,0.5)';
  });
  door.addEventListener('mouseleave', () => {
    door.style.borderColor = 'rgba(80,112,96,0.2)';
  });
  el.appendChild(door);

  // First-visit text — appears once after 3s, never shown again
  if (!state.rooms.threshold.flags.textShown) {
    setTimeout(() => {
      if (document.getElementById('room-threshold').classList.contains('active')) {
        showFirstVisitText(el);
        state.rooms.threshold.flags.textShown = true;
      }
    }, 3000);
  }
}

function showFirstVisitText(container) {
  const txt = document.createElement('div');
  txt.style.cssText = [
    'position:absolute',
    'bottom:var(--space-xl)',
    'left:50%',
    'transform:translateX(-50%)',
    'font-family:var(--font-mono)',
    'font-size:11px',
    'letter-spacing:0.2em',
    'color:rgba(112,128,144,0)',
    'white-space:nowrap',
    'pointer-events:none',
    'transition:color 1.5s ease',
  ].join(';');
  txt.textContent = 'stay in the middle';
  container.appendChild(txt);

  requestAnimationFrame(() => {
    txt.style.color = 'rgba(112,128,144,0.4)';
  });

  // Fade out after a while
  setTimeout(() => {
    txt.style.color = 'rgba(112,128,144,0)';
    setTimeout(() => txt.remove(), 1600);
  }, 5000);
}

function exitThreshold() {
  const el = document.getElementById('room-threshold');
  el.innerHTML = '';
  exitRoom();
}

export function onExitDoorInteract(state) {
  if (state.rooms.threshold.flags.bossTriggered) {
    exitThreshold();
    return;
  }
  state.rooms.threshold.flags.bossTriggered = true;
  exitThreshold();
  triggerBossLeadup(state);
}
