/**
 * main.js
 * Entry point. Imports and wires all modules together.
 */

import { configureState, loadState, resetState, saveState, seedStarterBoard, state } from './state.js';
import { initPortal, setMirrorActive } from './loseamp/portal.js';
import { initControls } from './loseamp/controls.js';
import { initLights }   from './loseamp/lights.js';
import { exitRoom, initRooms }    from './rooms/manager.js';
import { initAudio, prepareAudio, stopSequencer, stopSpectrumVoice, updateFromState } from './audio/engine.js';
import { initHud }      from './ui/hud.js';
import { initDevTools } from './dev/tools.js';

let panelResizeBound = false;
let panelResizeState = null;

function init() {
  const routeMode = window.location.pathname.includes('/demo') ? 'demo' : 'game';

  configureState(routeMode);
  loadState();
  seedStarterBoard();

  const canvas = document.getElementById('loseamp-canvas');
  initPortal(canvas);

  initRouteMode(routeMode);
  initControls();
  initLights();
  initRooms();
  initAudio();
  initHud();
  initDevTools();
  initControlPanelResizer();

  // Escape sequence complete
  window.addEventListener('loseamp:escaped', () => {
    showEndScreen();
  });
}

function initRouteMode(routeMode) {
  document.body.dataset.routeMode = routeMode;
  const titleScreen = document.getElementById('title-screen');

  if (routeMode === 'demo') {
    document.body.classList.remove('pre-awaken');
    document.body.classList.add('awakened');
    titleScreen?.classList.add('hidden');
    document.body.classList.remove('app-loading');
    return;
  }

  state.meta.awakened = false;
  state.meta.titleDismissed = false;
  document.body.classList.add('game-mode');
  document.body.classList.remove('awakened');
  document.body.classList.add('pre-awaken');
  titleScreen?.classList.add('hidden');
  showTitleScreen();

  document.body.classList.remove('app-loading');
}

function showTitleScreen() {
  const titleScreen = document.getElementById('title-screen');
  const startBtn = document.getElementById('title-start');
  if (!titleScreen || !startBtn) return;

  titleScreen.classList.remove('hidden');
  titleScreen.classList.add('active');

  startBtn.addEventListener('click', () => {
    resetState('game');
    seedStarterBoard();
    state.meta.titleDismissed = true;
    document.body.classList.remove('awakened');
    document.body.classList.add('pre-awaken');
    initRooms();
    updateFromState(state);
    initControls();
    initLights();
    titleScreen.classList.remove('active');
    setTimeout(() => titleScreen.classList.add('hidden'), 240);
  }, { once: true });
}

function setPowerState(nextAwakened) {
  state.meta.awakened = Boolean(nextAwakened);

  if (state.meta.awakened) {
    prepareAudio();
  }

  if (!state.meta.awakened) {
    stopSequencer();
    stopSpectrumVoice();
    state.soundboard.mirrorActive = false;
    setMirrorActive(false);
    if (state.currentScreen !== 'hub') {
      exitRoom();
    }
  }

  document.body.classList.toggle('pre-awaken', !state.meta.awakened);
  document.body.classList.toggle('awakened', state.meta.awakened);

  initRooms();
  saveState();
  updateFromState(state);
  initControls();
  initLights();
}

function togglePower() {
  setPowerState(!state.meta.awakened);
}

window.addEventListener('loseamp:power-on', () => setPowerState(true));
document.addEventListener('loseamp:power-on', () => setPowerState(true));
window.loseampPowerOn = () => setPowerState(true);
window.loseampTogglePower = togglePower;

function initControlPanelResizer() {
  if (panelResizeBound) return;

  const hub = document.getElementById('hub');
  const handle = document.getElementById('control-panel-resizer');
  if (!hub || !handle) return;

  panelResizeBound = true;

  handle.addEventListener('pointerdown', event => {
    event.preventDefault();
    panelResizeState = {
      pointerId: event.pointerId,
      hub,
    };
    document.body.classList.add('control-panel-resizing');
    handle.setPointerCapture?.(event.pointerId);
  });

  window.addEventListener('pointermove', onControlPanelResize);
  window.addEventListener('pointerup', stopControlPanelResize);
  window.addEventListener('pointercancel', stopControlPanelResize);
}

function onControlPanelResize(event) {
  if (!panelResizeState || event.pointerId !== panelResizeState.pointerId) return;

  const minHeight = Math.max(300, Math.round(window.innerHeight * 0.3));
  const maxHeight = Math.max(minHeight + 40, Math.round(window.innerHeight * 0.72));
  const nextHeight = clamp(window.innerHeight - event.clientY, minHeight, maxHeight);
  panelResizeState.hub.style.setProperty('--control-panel-height', `${nextHeight}px`);
}

function stopControlPanelResize(event) {
  if (!panelResizeState) return;
  if (event && event.pointerId !== undefined && event.pointerId !== panelResizeState.pointerId) return;

  document.body.classList.remove('control-panel-resizing');
  panelResizeState = null;
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

init();
