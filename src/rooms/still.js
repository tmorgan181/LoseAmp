/**
 * rooms/still.js
 * Room 2 — Still
 * Near-black, 10x10 dot grid. One dot missing at col=2, row=7.
 * After 8 seconds: axis labels appear. Row 7, col 2 → 72.
 * Click the empty space to collect.
 * No item unlock — reward is knowledge of BPM = 72.
 */

import { exitRoom } from './manager.js';
import { saveState } from '../state.js';

const COLS = 10;
const ROWS = 10;
const MISSING_COL = 2;  // col index 0-9
const MISSING_ROW = 7;  // row index 0-9
const MISSING_IDX = MISSING_ROW * COLS + MISSING_COL;

let waitTimer = null;
let labelsShown = false;

export function enterStill(state) {
  labelsShown = false;
  const el = document.getElementById('room-still');
  el.innerHTML = '';
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;';

  const back = document.createElement('button');
  back.className = 'room-back';
  back.textContent = '←';
  back.addEventListener('click', () => exitStill());
  el.appendChild(back);

  // Outer wrapper holds axis labels + grid
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;';
  el.appendChild(wrapper);

  // Column axis labels (0–9) above the grid — hidden initially
  const colAxis = document.createElement('div');
  colAxis.id = 'still-col-axis';
  colAxis.style.cssText = [
    'display:grid',
    `grid-template-columns:repeat(${COLS},1fr)`,
    'gap:14px',
    'padding:0 0 6px 0',
    'opacity:0',
    'transition:opacity 3s ease',
  ].join(';');

  for (let c = 0; c < COLS; c++) {
    const lbl = document.createElement('div');
    lbl.style.cssText = [
      'font-family:var(--font-mono)',
      'font-size:9px',
      'color:rgba(112,128,144,0.35)',
      'text-align:center',
      'letter-spacing:0.05em',
    ].join(';');
    lbl.textContent = c;
    colAxis.appendChild(lbl);
  }
  wrapper.appendChild(colAxis);

  // Row axis label wrapper (left side, positioned absolutely)
  const rowAxis = document.createElement('div');
  rowAxis.id = 'still-row-axis';
  rowAxis.style.cssText = [
    'position:absolute',
    'left:-20px',
    'top:0',
    'display:flex',
    'flex-direction:column',
    `gap:14px`,
    'opacity:0',
    'transition:opacity 3s ease',
  ].join(';');

  // Grid
  const grid = document.createElement('div');
  grid.id = 'still-grid';
  grid.style.cssText = [
    `display:grid`,
    `grid-template-columns:repeat(${COLS},1fr)`,
    'gap:14px',
    'padding:2px',
  ].join(';');

  for (let i = 0; i < COLS * ROWS; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;

    // Add row label at start of each row
    if (col === 0 && i < COLS * ROWS) {
      const lbl = document.createElement('div');
      lbl.style.cssText = [
        'font-family:var(--font-mono)',
        'font-size:9px',
        'color:rgba(112,128,144,0.35)',
        'line-height:1',
        'letter-spacing:0.05em',
        'height:3px',          // matches dot height
        'display:flex',
        'align-items:center',
      ].join(';');
      lbl.textContent = row;
      rowAxis.appendChild(lbl);
    }

    const dot = document.createElement('div');
    dot.className = 'still-dot';
    dot.dataset.idx = i;
    dot.dataset.row = row;
    dot.dataset.col = col;

    const isMissing = i === MISSING_IDX;

    dot.style.cssText = [
      'width:3px',
      'height:3px',
      'border-radius:50%',
      isMissing
        ? 'background:transparent'
        : 'background:rgba(200,200,220,0.12)',
      'transition:background 2s ease',
    ].join(';');

    if (isMissing) {
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => onAbsenceFound(state));
    }

    grid.appendChild(dot);
  }

  wrapper.appendChild(rowAxis);
  wrapper.appendChild(grid);

  state.rooms.still.visited = true;

  // After 8 seconds: fade in axes
  waitTimer = setTimeout(() => {
    onWaitComplete(state, colAxis, rowAxis);
  }, 8000);
}

function exitStill() {
  cleanup();
  exitRoom();
}

function cleanup() {
  if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; }
}

function onWaitComplete(state, colAxis, rowAxis) {
  state.rooms.still.flags.waited = true;
  labelsShown = true;

  colAxis.style.opacity = '1';
  rowAxis.style.opacity = '1';

  // Make the empty space barely perceptible now that axes are visible
  const dots = document.querySelectorAll('.still-dot');
  const dot = dots[MISSING_IDX];
  if (dot) {
    dot.style.background = 'rgba(80,112,96,0.05)';
  }
}

function onAbsenceFound(state) {
  if (state.rooms.still.flags.absenceFound) return;

  // Only collectible after labels appear — player needs to know what they found
  if (!labelsShown && !state.rooms.still.flags.waited) return;

  state.rooms.still.flags.absenceFound = true;

  const dots = document.querySelectorAll('.still-dot');
  const dot = dots[MISSING_IDX];
  if (dot) {
    dot.style.background = 'rgba(80,112,96,0.7)';
    dot.style.boxShadow = '0 0 4px rgba(80,112,96,0.4)';
    dot.style.transition = 'background 1.2s ease, box-shadow 1.2s ease';
  }

  setTimeout(() => onItemCollected(state), 1600);
}

function onItemCollected(state) {
  if (state.rooms.still.cleared) return;

  // No inventory item — the BPM "72" is implied by the grid coordinates.
  // Flag it so the player could theoretically check the coordinate they found.
  state.rooms.still.flags.itemCollected = true;
  state.rooms.still.flags.bpmClue = 72;
  state.rooms.still.cleared = true;

  saveState();

  setTimeout(() => {
    cleanup();
    exitStill();
  }, 800);
}
