/**
 * ui/hud.js
 * Lightweight HUD support for inventory and ambient state tags.
 */

import { state } from '../state.js';

let lastSignature = '';
let rafId = null;

const ITEM_LABELS = {
  piano: 'piano trace',
  bass: 'bass trace',
  pad: 'pad trace',
  noise: 'noise trace',
  delay: 'delay trace',
  distortion: 'distortion trace',
  reverb: 'reverb trace',
  filter: 'filter trace',
  balanced: 'balanced trace',
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
    empty.textContent = 'no residue';
    bar.appendChild(empty);
  } else {
    items.forEach(item => {
      const fragment = document.createElement('span');
      fragment.className = 'inventory-item';
      fragment.textContent = item;
      bar.appendChild(fragment);
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
    tags.push('symmetry held');
  }

  if (state.boss.phase === 'leadup') {
    tags.push('threshold near');
  }

  if (state.boss.phase === 'puzzle') {
    tags.push('holding');
  }

  if (state.boss.escaped) {
    tags.push('out');
  }

  return tags;
}
