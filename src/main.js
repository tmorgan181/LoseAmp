/**
 * main.js
 * Entry point. Imports and wires all modules together.
 */

import { loadState } from './state.js';
import { initPortal } from './loseamp/portal.js';

// Modules with stubs — imported safely, called if they exist
import { initControls } from './loseamp/controls.js';
import { initLights }   from './loseamp/lights.js';
import { initRooms }    from './rooms/manager.js';

function init() {
  loadState();

  const canvas = document.getElementById('loseamp-canvas');
  initPortal(canvas);

  // Stubs — safe to call, will no-op until implemented
  initControls();
  initLights();
  initRooms();

  // Escape sequence complete
  window.addEventListener('loseamp:escaped', () => {
    showEndScreen();
  });
}

function showEndScreen() {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('active');
  overlay.innerHTML = `<p style="
    font-family: Georgia, serif;
    color: rgba(128,160,140,0.7);
    font-size: 14px;
    letter-spacing: 0.2em;
    text-transform: lowercase;
  ">out</p>`;
}

init();
