/**
 * rooms/clock.js
 * Room 3 — Clock
 * Single pulsing circle at 72 BPM. Click at the peak 8 times in a row.
 * As hits land, a 16-step pattern builds at positions 1,5,9,13.
 * When cleared: the pattern is held on screen for 5 seconds.
 * Teaches: the sequencer answer. The number 8 appears prominently.
 */

import { exitRoom } from './manager.js';
import { applyUnlock } from '../puzzle/logic.js';
import { initControls } from '../loseamp/controls.js';
import { saveState } from '../state.js';

const REQUIRED_CONSECUTIVE = 8;
const BPM = 72;
const BEAT_INTERVAL_MS = (60 / BPM) * 1000;
const PEAK_WINDOW_MS = 180;
const STEPS = 16;
const PATTERN = [1, 5, 9, 13]; // four-on-the-floor, 0-indexed

let intervalId = null;
let animFrame = null;
let beatWindowOpen = false;
let lastBeatTime = 0;
let patternDisplayTimer = null;

export function enterClock(state) {
  const el = document.getElementById('room-clock');
  el.innerHTML = '';

  state.rooms.clock.flags.consecutiveHits ??= 0;
  state.rooms.clock.flags.resetCount      ??= 0;
  state.rooms.clock.flags.patternDots     ??= 0; // how many pattern positions lit

  // Back
  const back = document.createElement('button');
  back.className = 'room-back';
  back.textContent = '←';
  back.addEventListener('click', exitClock);
  el.appendChild(back);

  // Counter — prominent, top right
  const counter = document.createElement('div');
  counter.id = 'clock-counter';
  counter.style.cssText = [
    'position:absolute',
    'top:var(--space-md)',
    'right:var(--space-md)',
    'font-family:var(--font-mono)',
    'font-size:32px',
    'color:var(--fg-muted)',
    'letter-spacing:-0.02em',
    'line-height:1',
  ].join(';');
  counter.textContent = `${state.rooms.clock.flags.consecutiveHits}`;
  el.appendChild(counter);

  const counterLabel = document.createElement('div');
  counterLabel.style.cssText = [
    'position:absolute',
    'top:calc(var(--space-md) + 40px)',
    'right:var(--space-md)',
    'font-family:var(--font-mono)',
    'font-size:10px',
    'color:var(--fg-muted)',
    'letter-spacing:0.15em',
    'opacity:0.5',
  ].join(';');
  counterLabel.textContent = `/ ${REQUIRED_CONSECUTIVE}`;
  el.appendChild(counterLabel);

  // Pattern row — 16 steps, shown at bottom
  const patternRow = document.createElement('div');
  patternRow.id = 'clock-pattern';
  patternRow.style.cssText = [
    'position:absolute',
    'bottom:var(--space-xl)',
    'left:50%',
    'transform:translateX(-50%)',
    'display:grid',
    `grid-template-columns:repeat(${STEPS},1fr)`,
    'gap:4px',
    'width:60%',
  ].join(';');

  for (let s = 0; s < STEPS; s++) {
    const step = document.createElement('div');
    step.dataset.step = s;
    step.style.cssText = [
      'height:3px',
      'background:var(--fg-muted)',
      'opacity:0.08',
      'border-radius:1px',
      'transition:opacity 0.4s ease, background 0.4s ease',
    ].join(';');
    patternRow.appendChild(step);
  }
  el.appendChild(patternRow);

  // Restore already-lit pattern dots from state
  if (state.rooms.clock.flags.patternDots > 0) {
    const litCount = state.rooms.clock.flags.patternDots;
    for (let i = 0; i < litCount && i < PATTERN.length; i++) {
      lightPatternStep(PATTERN[i]);
    }
  }

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'clock-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:pointer;';
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  canvas.addEventListener('click', () => onPlayerAction(state));

  // Start rhythm
  lastBeatTime = performance.now();
  intervalId = setInterval(() => {
    lastBeatTime = performance.now();
    beatWindowOpen = true;
    setTimeout(() => { beatWindowOpen = false; }, PEAK_WINDOW_MS);
  }, BEAT_INTERVAL_MS);

  // Draw loop
  animFrame = requestAnimationFrame(function tick(now) {
    animFrame = requestAnimationFrame(tick);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const elapsed = now - lastBeatTime;
    const beatT   = Math.min(1, elapsed / BEAT_INTERVAL_MS);
    const pulse   = Math.sin(beatT * Math.PI);

    drawClock(ctx, w, h, pulse, state);
  });

  state.rooms.clock.visited = true;
}

function drawClock(ctx, w, h, pulse, state) {
  const failTint = state.rooms.clock.flags.failFlash || 0;
  const bgR = Math.round(10 + failTint * 30);
  ctx.fillStyle = `rgba(${bgR},10,15,0.4)`;
  ctx.fillRect(0, 0, w, h);

  if (state.rooms.clock.flags.failFlash > 0) {
    state.rooms.clock.flags.failFlash = Math.max(0, failTint - 0.02);
  }

  const cx = w / 2, cy = h / 2;
  const baseR = Math.min(w, h) * 0.18;
  const r = baseR * (0.85 + pulse * 0.2);
  const alpha = 0.25 + pulse * 0.55;

  // Guide ring
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 1.05, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(80,112,96,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pulsing ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(80,112,96,${alpha})`;
  ctx.lineWidth = 1 + pulse * 1.5;
  ctx.shadowColor = `rgba(80,140,100,${alpha * 0.5})`;
  ctx.shadowBlur = 8 + pulse * 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner fill at peak
  if (pulse > 0.85) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80,112,96,${(pulse - 0.85) * 0.4})`;
    ctx.fill();
  }
}

function lightPatternStep(stepIdx) {
  const el = document.querySelector(`#clock-pattern [data-step="${stepIdx}"]`);
  if (el) {
    el.style.background = 'var(--accent-portal)';
    el.style.opacity    = '0.85';
  }
}

function exitClock() {
  cleanup();
  exitRoom();
}

function cleanup() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (animFrame)  { cancelAnimationFrame(animFrame); animFrame = null; }
  if (patternDisplayTimer) { clearTimeout(patternDisplayTimer); patternDisplayTimer = null; }
  beatWindowOpen = false;
}

export function onPlayerAction(state) {
  if (state.rooms.clock.cleared) return;
  beatWindowOpen ? onHit(state) : onMiss(state);
}

function onHit(state) {
  state.rooms.clock.flags.consecutiveHits++;
  updateCounter(state);

  // Light the next pattern dot
  const hitsSoFar = state.rooms.clock.flags.consecutiveHits;
  const patternIdx = Math.floor((hitsSoFar - 1) / (REQUIRED_CONSECUTIVE / PATTERN.length));
  const dotsToLight = Math.min(PATTERN.length, Math.ceil(hitsSoFar / 2));

  if (dotsToLight > state.rooms.clock.flags.patternDots) {
    state.rooms.clock.flags.patternDots = dotsToLight;
    lightPatternStep(PATTERN[dotsToLight - 1]);
  }

  if (state.rooms.clock.flags.consecutiveHits >= REQUIRED_CONSECUTIVE) {
    onCleared(state);
  }
}

function onMiss(state) {
  state.rooms.clock.flags.consecutiveHits = 0;
  state.rooms.clock.flags.resetCount = (state.rooms.clock.flags.resetCount || 0) + 1;
  state.rooms.clock.flags.failFlash = 1;
  // Pattern dots persist — they don't reset on miss
  updateCounter(state);
}

function updateCounter(state) {
  const el = document.getElementById('clock-counter');
  if (el) el.textContent = `${state.rooms.clock.flags.consecutiveHits}`;
}

function onCleared(state) {
  cleanup();
  state.rooms.clock.cleared = true;

  // Light any remaining pattern dots immediately
  PATTERN.forEach(s => lightPatternStep(s));
  state.rooms.clock.flags.patternDots = PATTERN.length;

  applyUnlock(state, 'bpm-expand');
  applyUnlock(state, 'sequencer-row');
  saveState();
  initControls();

  // Hold pattern on screen for 5 seconds, then exit
  patternDisplayTimer = setTimeout(() => {
    cleanup();
    exitClock();
  }, 5000);
}
