/**
 * dev/tools.js
 * Hidden debug affordances for local iteration and QA.
 */

import { state } from '../state.js';

let panel;
let body;
let copyBtn;
let visible = false;
let lastSignature = '';
let rafId = null;

export function initDevTools() {
  buildPanel();
  bindHotkeys();
  startLoop();
}

function buildPanel() {
  panel = document.createElement('aside');
  panel.id = 'dev-panel';
  panel.className = 'hidden';
  panel.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'dev-panel-header';
  header.textContent = 'debug';

  const hint = document.createElement('div');
  hint.className = 'dev-panel-hint';
  hint.textContent = 'ctrl+shift+d';

  body = document.createElement('pre');
  body.className = 'dev-panel-body';

  const actions = document.createElement('div');
  actions.className = 'dev-panel-actions';

  copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = 'copy state';
  copyBtn.addEventListener('click', copyState);

  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.textContent = 'reload';
  reloadBtn.addEventListener('click', () => window.location.reload());

  actions.append(copyBtn, reloadBtn);
  panel.append(header, hint, body, actions);
  document.body.appendChild(panel);
}

function bindHotkeys() {
  document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      togglePanel();
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      window.location.reload();
    }
  });
}

function startLoop() {
  const tick = () => {
    const signature = getSignature();
    if (signature !== lastSignature) {
      lastSignature = signature;
      renderSnapshot();
    }
    rafId = requestAnimationFrame(tick);
  };

  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function togglePanel() {
  visible = !visible;
  panel.classList.toggle('hidden', !visible);
  panel.setAttribute('aria-hidden', String(!visible));
}

function renderSnapshot() {
  if (!body) return;

  const snapshot = {
    screen: state.currentScreen,
    inventory: state.inventory,
    unlocks: {
      instruments: state.unlocks.instruments,
      effects: state.unlocks.effects,
      bpmRange: state.unlocks.bpmRange,
      sequencerRows: state.unlocks.sequencerRows,
      lightModes: state.unlocks.lightModes,
    },
    soundboard: {
      bpm: state.soundboard.bpm,
      activeInstruments: state.soundboard.activeInstruments,
      mirrorActive: state.soundboard.mirrorActive,
      lights: state.soundboard.lights,
      effects: state.soundboard.effects,
    },
    boss: state.boss,
  };

  body.textContent = JSON.stringify(snapshot, null, 2);
}

function getSignature() {
  return JSON.stringify({
    currentScreen: state.currentScreen,
    inventory: state.inventory,
    unlocks: state.unlocks,
    soundboard: state.soundboard,
    boss: state.boss,
  });
}

async function copyState() {
  try {
    await navigator.clipboard.writeText(body.textContent);
    copyBtn.textContent = 'copied';
    window.setTimeout(() => {
      copyBtn.textContent = 'copy state';
    }, 1200);
  } catch {
    copyBtn.textContent = 'copy failed';
    window.setTimeout(() => {
      copyBtn.textContent = 'copy state';
    }, 1200);
  }
}
