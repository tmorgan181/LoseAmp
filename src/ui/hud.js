/**
 * ui/hud.js
 * Lightweight HUD support for inventory and ambient state tags.
 */

import { state } from '../state.js';

let lastSignature = '';
let rafId = null;

const ITEM_LABELS = {
  piano: 'piano',
  bass: 'bass',
  pad: 'pad',
  noise: 'noise',
  delay: 'delay',
  distortion: 'distortion',
  reverb: 'reverb',
  filter: 'filter',
  balanced: 'balanced',
};

export function initHud() {
  syncHud();
  startLoop();
}

export function syncHud() {
  renderInventoryBar();
}

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);

  const tick = () => {
    const signature = getSignature();
    if (signature !== lastSignature) {
      lastSignature = signature;
      syncHud();
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

function getSignature() {
  return JSON.stringify({
    inventory: state.inventory,
    mirrorActive: state.soundboard.mirrorActive,
    bossPhase: state.boss.phase,
    escaped: state.boss.escaped,
    clearedRooms: Object.fromEntries(
      Object.entries(state.rooms).map(([name, room]) => [name, room.cleared]),
    ),
  });
}

function renderInventoryBar() {
  const bar = document.getElementById('inventory-bar');
  if (!bar) return;

  bar.innerHTML = '';

  const items = normalizeInventory(state.inventory);
  const tags = getAmbientTags();

  if (!items.length) {
    const empty = document.createElement('span');
    empty.className = 'inventory-empty';
    empty.textContent = 'nothing carried';
    bar.appendChild(empty);
  } else {
    items.forEach(item => {
      const pill = document.createElement('span');
      pill.className = 'inventory-item';
      pill.textContent = item;
      bar.appendChild(pill);
    });
  }

  tags.forEach(tag => {
    const el = document.createElement('span');
    el.className = 'status-tag';
    el.textContent = tag;
    bar.appendChild(el);
  });
}

function normalizeInventory(inventory) {
  const seen = new Set();
  const items = [];

  inventory.forEach(entry => {
    const raw = typeof entry === 'string'
      ? entry
      : entry && typeof entry === 'object'
        ? entry.label || entry.name || entry.id || JSON.stringify(entry)
        : String(entry);

    const key = raw.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);

    items.push(ITEM_LABELS[key] || raw);
  });

  return items;
}

function getAmbientTags() {
  const tags = [];

  if (state.soundboard.mirrorActive) {
    tags.push('symmetry');
  }

  if (state.boss.phase === 'leadup') {
    tags.push('threshold');
  }

  if (state.boss.phase === 'puzzle') {
    tags.push('hold');
  }

  if (state.boss.escaped) {
    tags.push('out');
  }

  return tags;
}
