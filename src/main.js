/**
 * main.js
 * Entry point. Imports and wires all modules together.
 */

import { loadState } from './state.js';
import { initPortal } from './loseamp/portal.js';
import { initControls } from './loseamp/controls.js';
import { initLights }   from './loseamp/lights.js';
import { initRooms }    from './rooms/manager.js';
import { initAudio }    from './audio/engine.js';
import { initHud }      from './ui/hud.js';
import { initDevTools } from './dev/tools.js';

function init() {
  loadState();

  const canvas = document.getElementById('loseamp-canvas');
  initPortal(canvas);

  initControls();
  initLights();
  initRooms();
  initAudio();
  initHud();
  initDevTools();

  // Escape sequence complete
  window.addEventListener('loseamp:escaped', () => {
    showEndScreen();
  });
}

function showEndScreen() {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = '';

  const frame = document.createElement('div');
  frame.className = 'end-screen';
  frame.style.cssText = 'opacity:0;transition:opacity 2.5s ease;text-align:center;';

  const word = document.createElement('p');
  word.className = 'end-word';
  word.style.cssText = [
    'font-family:Georgia,serif',
    'color:rgba(128,160,140,0.7)',
    'font-size:14px',
    'letter-spacing:0.2em',
    'text-transform:lowercase',
    'margin-bottom:32px',
  ].join(';');
  word.textContent = 'out';

  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'end-reset';
  again.style.cssText = 'opacity:0;transition:opacity 1.2s ease;margin-top:16px;';
  again.textContent = 'again';
  again.addEventListener('click', () => window.location.reload());

  frame.append(word, again);
  overlay.appendChild(frame);

  // Overlay fades in, then text, then reset button
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    requestAnimationFrame(() => {
      frame.style.opacity = '1';
      setTimeout(() => { again.style.opacity = '0.4'; }, 2000);
    });
  });
}

init();
