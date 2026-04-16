/**
 * rooms/mirror.js
 * Room 4 — Mirror
 * Passive observation room: a horizontally mirrored EQ-style display
 * encoding the target effect values for the final puzzle.
 */

import { exitRoom } from './manager.js';
import { applyUnlock } from '../puzzle/logic.js';
import { initControls } from '../loseamp/controls.js';
import { saveState } from '../state.js';

const EFFECT_BARS = [
  { key: 'filter', label: 'filter', value: 0.5 },
  { key: 'distortion', label: 'distortion', value: 0 },
  { key: 'delay', label: 'delay', value: 0.35 },
  { key: 'reverb', label: 'reverb', value: 0.5 },
];

export function enterMirror(state) {
  const el = document.getElementById('room-mirror');
  el.innerHTML = '';

  state.rooms.mirror.visited = true;
  state.rooms.mirror.cleared = true;

  applyUnlock(state, 'delay');
  initControls();
  saveState();

  const back = document.createElement('button');
  back.className = 'room-back';
  back.textContent = '←';
  back.addEventListener('click', exitMirror);
  el.appendChild(back);

  const shell = document.createElement('div');
  shell.style.cssText = [
    'position:absolute',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:radial-gradient(circle at 50% 46%, rgba(80,112,96,0.06), transparent 22%)',
  ].join(';');

  const frame = document.createElement('div');
  frame.style.cssText = [
    'position:relative',
    'width:min(720px, calc(100vw - 96px))',
    'height:min(360px, calc(100vh - 120px))',
    'padding:32px 36px 44px',
    'border:1px solid rgba(80,112,96,0.14)',
    'background:linear-gradient(180deg, rgba(12,12,16,0.96), rgba(8,8,12,0.98))',
    'box-shadow:inset 0 0 0 1px rgba(255,255,255,0.02), 0 24px 80px rgba(0,0,0,0.4)',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'reflection';
  title.style.cssText = [
    'position:absolute',
    'top:14px',
    'left:18px',
    'font-family:var(--font-mono)',
    'font-size:9px',
    'letter-spacing:0.22em',
    'text-transform:uppercase',
    'color:var(--fg-dim)',
  ].join(';');
  frame.appendChild(title);

  const barsWrap = document.createElement('div');
  barsWrap.style.cssText = [
    'position:absolute',
    'left:36px',
    'right:36px',
    'top:42px',
    'bottom:50px',
    'display:flex',
    'align-items:flex-end',
    'justify-content:space-between',
    'gap:18px',
  ].join(';');

  EFFECT_BARS.forEach(({ label, value }) => {
    const column = document.createElement('div');
    column.style.cssText = [
      'position:relative',
      'flex:1 1 0',
      'height:100%',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:flex-end',
      'gap:12px',
    ].join(';');

    const meter = document.createElement('div');
    meter.style.cssText = [
      'position:relative',
      'width:min(72px, 100%)',
      'height:100%',
      'min-height:160px',
      'border:1px solid rgba(80,112,96,0.18)',
      'background:linear-gradient(180deg, rgba(18,18,24,0.78), rgba(8,8,12,0.96))',
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,0.015)',
      'overflow:hidden',
    ].join(';');

    const grid = document.createElement('div');
    grid.style.cssText = [
      'position:absolute',
      'inset:0',
      'background-image:linear-gradient(to top, rgba(80,112,96,0.06) 1px, transparent 1px)',
      'background-size:100% 20%',
      'pointer-events:none',
    ].join(';');
    meter.appendChild(grid);

    const fill = document.createElement('div');
    fill.style.cssText = [
      'position:absolute',
      'left:0',
      'right:0',
      'bottom:0',
      `height:${Math.max(0, Math.min(1, value)) * 100}%`,
      value === 0
        ? 'background:linear-gradient(180deg, rgba(80,112,96,0), rgba(80,112,96,0));'
        : 'background:linear-gradient(180deg, rgba(108,144,132,0.82), rgba(80,112,96,0.96));',
      value === 0
        ? 'box-shadow:none;'
        : 'box-shadow:0 0 24px rgba(80,112,96,0.14), inset 0 1px 0 rgba(210,226,218,0.08);',
    ].join('');
    meter.appendChild(fill);

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = [
      'font-family:var(--font-mono)',
      'font-size:10px',
      'letter-spacing:0.14em',
      'text-transform:lowercase',
      value === 0 ? 'color:var(--fg-muted)' : 'color:rgba(178,192,200,0.7)',
    ].join(';');

    column.append(meter, labelEl);
    barsWrap.appendChild(column);
  });

  const faintEight = document.createElement('div');
  faintEight.textContent = '8';
  faintEight.style.cssText = [
    'position:absolute',
    'right:18px',
    'bottom:12px',
    'font-family:var(--font-mono)',
    'font-size:10px',
    'letter-spacing:0.18em',
    'color:rgba(80,112,96,0.16)',
    'pointer-events:none',
  ].join(';');

  frame.append(title, barsWrap, faintEight);
  shell.appendChild(frame);
  el.appendChild(shell);
}

function exitMirror() {
  const el = document.getElementById('room-mirror');
  el.innerHTML = '';
  exitRoom();
}
