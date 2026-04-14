/**
 * main.js
 * Entry point. Imports and wires all modules together.
 */

import { configureState, loadState, state } from './state.js';
import { initPortal } from './loseamp/portal.js';
import { initControls } from './loseamp/controls.js';
import { initLights }   from './loseamp/lights.js';
import { initRooms }    from './rooms/manager.js';
import { initAudio }    from './audio/engine.js';
import { initHud }      from './ui/hud.js';
import { initDevTools } from './dev/tools.js';

function init() {
  const routeMode = window.location.pathname.includes('/demo') ? 'demo' : 'game';

  configureState(routeMode);
  loadState();

  const canvas = document.getElementById('loseamp-canvas');
  initPortal(canvas);

  initControls();
  initLights();
  initRooms();
  initAudio();
  initHud();
  initDevTools();
  initRouteMode(routeMode);

  // Escape sequence complete
  window.addEventListener('loseamp:escaped', () => {
    showEndScreen();
  });
}

function initRouteMode(routeMode) {
  document.body.dataset.routeMode = routeMode;

  if (routeMode === 'demo') {
    document.body.classList.add('demo-mode', 'awakened');
    document.getElementById('title-screen')?.classList.add('hidden');
    return;
  }

  document.body.classList.add('game-mode', 'pre-awaken');
  showTitleScreen();
  bindWakeInteraction();
}

function showTitleScreen() {
  const titleScreen = document.getElementById('title-screen');
  const startBtn = document.getElementById('title-start');
  if (!titleScreen || !startBtn) return;

  titleScreen.classList.remove('hidden');
  requestAnimationFrame(() => titleScreen.classList.add('active'));

  startBtn.addEventListener('click', () => {
    state.meta.titleDismissed = true;
    titleScreen.classList.remove('active');
    setTimeout(() => titleScreen.classList.add('hidden'), 500);
  }, { once: true });
}

function bindWakeInteraction() {
  const portal = document.getElementById('portal-area');
  if (!portal) return;

  portal.addEventListener('click', wakeLoseamp);
}

function wakeLoseamp() {
  if (state.meta.routeMode !== 'game' || state.meta.awakened === true || !state.meta.titleDismissed) {
    return;
  }

  state.meta.awakened = true;
  document.body.classList.remove('pre-awaken');
  document.body.classList.add('awakened');
  initRooms();
}

function showEndScreen() {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = '';

  const frame = document.createElement('div');
  frame.className = 'end-screen';

  const word = document.createElement('p');
  word.className = 'end-word';
  word.textContent = 'out';

  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'end-reset';
  again.textContent = 'again';
  again.addEventListener('click', () => window.location.reload());

  frame.append(word, again);
  overlay.appendChild(frame);

  requestAnimationFrame(() => {
    overlay.classList.add('active');
    requestAnimationFrame(() => {
      frame.classList.add('revealed');
      setTimeout(() => { again.classList.add('revealed'); }, 2200);
    });
  });
}

init();
