/**
 * loseamp/portal.js
 * The central soundwave portal — the Loseamp.
 * Canvas-based visualizer that responds to soundboard state.
 */

import { getCurrentSequencerStep, getSignalLevel, isSequencerRunning } from '../audio/engine.js';
import { state } from '../state.js';

let canvas, ctx;
let width, height;
let frame = 0;
let escaping = false;
let escapeProgress = 0;

let mirrorActive = false;
let bossPhase = null; // 'leadup' | 'puzzle' | 'escape' | null

// ─── Demo mode ────────────────────────────────────────────────────────────
let demoT = 0;
const DEMO_CYCLE = 0.0003;

// ─── Wave layers ─────────────────────────────────────────────────────────
const LAYERS = [
  { freqMult: 1.0,  phaseOffset: 0,           ampMult: 1.0,  alpha: 0.85, color: [80,  112, 96]  },
  { freqMult: 1.7,  phaseOffset: Math.PI/3,   ampMult: 0.55, alpha: 0.45, color: [64,  96,  120] },
  { freqMult: 0.5,  phaseOffset: Math.PI*0.8, ampMult: 0.75, alpha: 0.25, color: [96,  112, 80]  },
  { freqMult: 2.3,  phaseOffset: Math.PI*1.4, ampMult: 0.3,  alpha: 0.2,  color: [80,  80,  100] },
];

const INSTRUMENT_COLORS = {
  piano: { base: [196, 168, 120], glow: [228, 204, 162] },
  bass:  { base: [88, 164, 210], glow: [142, 200, 236] },
  pad:   { base: [144, 116, 188], glow: [188, 162, 226] },
  noise: { base: [210, 102, 118], glow: [236, 146, 164] },
};

// ─── Init ─────────────────────────────────────────────────────────────────

export function initPortal(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(loop);
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width  || window.innerWidth;
  canvas.height = rect.height || window.innerHeight * 0.55;
  width  = canvas.width;
  height = canvas.height;
}

// ─── External setters ─────────────────────────────────────────────────────

export function setMirrorActive(active) {
  mirrorActive = active;
  document.body.classList.toggle('mirror-active', active);
  document.getElementById('portal-area')?.classList.toggle('mirror-active', active);
}

export function setBossPhase(phase) {
  bossPhase = phase;
  document.body.dataset.bossPhase = phase || '';
  document.getElementById('portal-area')?.setAttribute('data-boss-phase', phase || '');
}

// ─── Main loop ────────────────────────────────────────────────────────────

function loop() {
  requestAnimationFrame(loop);
  frame++;
  demoT += DEMO_CYCLE;
  draw();
}

// ─── Derive parameters from state ────────────────────────────────────────

function getIntensity() {
  const signal = getSignalLevel();
  if (signal > 0) {
    return Math.min(1, signal * 1.55 + (isSequencerRunning() ? 0.16 : 0));
  }
  if (document.body.classList.contains('pre-awaken')) {
    return 0.035 + (Math.sin(demoT * 0.28) * 0.5 + 0.5) * 0.028;
  }
  // Demo fallback
  const demoBase = Math.sin(demoT) * 0.5 + 0.5;
  return isSequencerRunning() ? Math.min(1, demoBase * 1.18 + 0.2) : demoBase;
}

function getColor(intensity) {
  if (document.body.classList.contains('pre-awaken')) {
    return {
      r: 156,
      g: 44,
      b: 56,
    };
  }

  // Apply boss tint: leadup shifts toward cooler
  const bossTint = bossPhase === 'leadup' ? 0.4 : bossPhase === 'puzzle' ? 0.7 : 0;

  if (intensity < 0.35) {
    return {
      r: Math.round(50  + bossTint * 10),
      g: Math.round(65  + bossTint * 30),
      b: Math.round(90  + bossTint * 20),
    };
  } else if (intensity < 0.65) {
    const t = (intensity - 0.35) / 0.3;
    return {
      r: Math.round(50  + t * 30),
      g: Math.round(65  + t * 47 + bossTint * 20),
      b: Math.round(90  - t * 10 + bossTint * 20),
    };
  } else {
    const t = (intensity - 0.65) / 0.35;
    return {
      r: Math.round(80  + t * 148),
      g: Math.round(112 - t * 80),
      b: Math.round(80  - t * 60),
    };
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────

function draw() {
  if (escaping) {
    drawEscape();
    return;
  }

  // Boss lead-up: slow down the demo cycle
  if (bossPhase === 'leadup' || bossPhase === 'puzzle') {
    demoT -= DEMO_CYCLE * 0.65; // net advance much slower
  }

  const intensity = getIntensity();
  const tint = getColor(intensity);
  const beatVisual = getBeatVisualState(intensity);

  ctx.fillStyle = 'rgba(10, 10, 15, 0.18)';
  ctx.fillRect(0, 0, width, height);

  drawVignette();
  drawBeatAura(beatVisual, intensity);
  drawPortalFrame(intensity, tint, beatVisual);

  for (const layer of LAYERS) {
    drawWave(layer, intensity, tint, beatVisual);
  }

  if (mirrorActive) {
    drawMirrorOverlay(intensity);
  }

  if (intensity > 0.7) {
    drawNoise(intensity, tint);
  }

  if (intensity >= 0.42 && intensity <= 0.58) {
    drawMiddleGlow(intensity);
  }

  drawScanlines();
}

// ─── Wave ────────────────────────────────────────────────────────────────

function drawWave(layer, intensity, tint, beatVisual) {
  const cy = height / 2;
  const baseAmp = height * 0.22;

  const ampScale = Math.pow(intensity, 0.7);
  const amp = baseAmp * ampScale * layer.ampMult;

  const freq = (0.008 + intensity * 0.006) * layer.freqMult;
  const speed = (0.4 + intensity * 1.2) * layer.freqMult;
  const phase = frame * speed * 0.01 + layer.phaseOffset;

  const { r, g, b } = tint;
  const a = layer.alpha * (0.3 + intensity * 0.7);

  ctx.beginPath();
  ctx.strokeStyle = createWaveGradient(r, g, b, a, beatVisual);
  ctx.lineWidth = intensity < 0.35 ? 0.5 : 1.0;
  const glow = beatVisual.colors[0] || [r, g, b];
  ctx.shadowColor = `rgba(${glow[0]},${glow[1]},${glow[2]},${a * 0.52})`;
  ctx.shadowBlur  = 8 + intensity * 16 + beatVisual.pulse * 8;

  for (let x = 0; x <= width; x += 2) {
    let y = cy + Math.sin(x * freq + phase) * amp;

    if (intensity > 0.6) {
      const harmonic = intensity - 0.6;
      y += Math.sin(x * freq * 3.1 + phase * 1.3) * amp * harmonic * 0.4;
    }

    if (intensity > 0.82) {
      const distort = (intensity - 0.82) * 5;
      y += (Math.random() - 0.5) * amp * distort * 0.3;
      y = Math.max(cy - baseAmp * 1.3, Math.min(cy + baseAmp * 1.3, y));
    }

    // Mirror: reflect waves symmetrically around center Y
    if (mirrorActive) {
      const offset = y - cy;
      y = cy + offset * Math.cos(frame * 0.004);
    }

    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

function createWaveGradient(r, g, b, a, beatVisual) {
  const gradient = ctx.createLinearGradient(0, height / 2, width, height / 2);

  if (!beatVisual.colors.length) {
    gradient.addColorStop(0, `rgba(${r},${g},${b},${a * 0.45})`);
    gradient.addColorStop(0.5, `rgba(${r},${g},${b},${a})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},${a * 0.45})`);
    return gradient;
  }

  const colorA = beatVisual.colors[0];
  const colorB = beatVisual.colors[1] || beatVisual.colors[0];
  gradient.addColorStop(0, `rgba(${colorA[0]},${colorA[1]},${colorA[2]},${a * 0.55})`);
  gradient.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.72})`);
  gradient.addColorStop(0.65, `rgba(${r},${g},${b},${a * 0.86})`);
  gradient.addColorStop(1, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},${a * 0.55})`);
  return gradient;
}

function getBeatVisualState(intensity) {
  const step = getCurrentSequencerStep();
  const running = isSequencerRunning();
  const colors = [];

  if (running && step >= 0) {
    state.soundboard.activeInstruments.forEach(name => {
      const rowIdx = state.unlocks.instruments.indexOf(name);
      if (rowIdx < 0) return;
      const row = state.soundboard.sequence[rowIdx];
      if (!row?.[step]) return;
      const color = INSTRUMENT_COLORS[name]?.base;
      if (color) colors.push(color);
    });
  }

  return {
    step,
    running,
    colors,
    pulse: colors.length ? 0.55 + intensity * 0.9 : 0,
  };
}

function drawBeatAura(beatVisual, intensity) {
  if (!beatVisual.colors.length && !beatVisual.running) return;

  const left = beatVisual.colors[0] || [108, 126, 138];
  const right = beatVisual.colors[1] || beatVisual.colors[0] || [82, 102, 116];
  const power = beatVisual.colors.length
    ? 0.1 + beatVisual.pulse * 0.09
    : 0.03 + intensity * 0.02;

  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, width * 0.34
  );
  gradient.addColorStop(0, `rgba(${left[0]},${left[1]},${left[2]},${power})`);
  gradient.addColorStop(0.5, `rgba(${right[0]},${right[1]},${right[2]},${power * 0.6})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (beatVisual.running) {
    const frameGradient = ctx.createLinearGradient(0, height * 0.82, width, height * 0.82);
    frameGradient.addColorStop(0, 'rgba(0,0,0,0)');
    frameGradient.addColorStop(0.18, `rgba(${left[0]},${left[1]},${left[2]},${0.06 + beatVisual.pulse * 0.04})`);
    frameGradient.addColorStop(0.5, `rgba(${right[0]},${right[1]},${right[2]},${0.08 + beatVisual.pulse * 0.05})`);
    frameGradient.addColorStop(0.82, `rgba(${left[0]},${left[1]},${left[2]},${0.06 + beatVisual.pulse * 0.04})`);
    frameGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = frameGradient;
    ctx.fillRect(width * 0.12, height * 0.8, width * 0.76, 2 + beatVisual.pulse * 2.5);
  }
}

// ─── Mirror overlay ───────────────────────────────────────────────────────

function drawMirrorOverlay(intensity) {
  // Horizontal axis line
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.strokeStyle = `rgba(80,112,96,${0.08 + intensity * 0.06})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Vertical symmetry line
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.strokeStyle = `rgba(80,112,96,0.05)`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Mirror portal indicator — pulsing diamond
  const pulse = Math.sin(frame * 0.04) * 0.5 + 0.5;
  const cx = width / 2, cy = height / 2;
  const s = 8 + pulse * 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.strokeStyle = `rgba(80,112,96,${0.3 + pulse * 0.3})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─── Noise (high intensity only) ─────────────────────────────────────────

function drawNoise(intensity, tint) {
  const density = Math.floor((intensity - 0.7) * 80);
  const { r, g, b } = tint;
  ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
  for (let i = 0; i < density; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const s = Math.random() * 2;
    ctx.fillRect(x, y, s, s);
  }
}

// ─── Portal frame ────────────────────────────────────────────────────────

function drawPortalFrame(intensity, tint, beatVisual) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.44;
  const ry = height * 0.40;

  const { r, g, b } = tint;
  const alpha = 0.11 + intensity * 0.12 + (beatVisual.running ? 0.04 : 0);
  const edge = beatVisual.colors[0] || [r, g, b];

  // Boss puzzle phase: additional ring
  if (bossPhase === 'puzzle') {
    const pulse = Math.sin(frame * 0.03) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(80,112,96,${0.04 + pulse * 0.06})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${edge[0]},${edge[1]},${edge[2]},${alpha})`;
  ctx.lineWidth = beatVisual.running ? 1.65 : 1;
  ctx.shadowColor = `rgba(${edge[0]},${edge[1]},${edge[2]},${alpha * 0.6})`;
  ctx.shadowBlur = beatVisual.running ? 22 + beatVisual.pulse * 18 : 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (beatVisual.running) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.82, ry * 0.8, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${edge[0]},${edge[1]},${edge[2]},${0.05 + beatVisual.pulse * 0.08})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ─── Middle glow ──────────────────────────────────────────────────────────

function drawMiddleGlow(intensity) {
  const nearness = 1 - Math.abs(intensity - 0.5) / 0.08;
  const a = Math.max(0, nearness) * 0.06;
  const grad = ctx.createRadialGradient(
    width/2, height/2, 0,
    width/2, height/2, width * 0.3
  );
  grad.addColorStop(0, `rgba(80, 112, 96, ${a})`);
  grad.addColorStop(1, `rgba(80, 112, 96, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

// ─── Vignette ────────────────────────────────────────────────────────────

function drawVignette() {
  const grad = ctx.createRadialGradient(
    width/2, height/2, height * 0.25,
    width/2, height/2, width * 0.7
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(5,5,8,0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

// ─── Scanlines ───────────────────────────────────────────────────────────

function drawScanlines() {
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
}

// ─── Escape sequence ─────────────────────────────────────────────────────

export function playEscapeSequence() {
  escaping = true;
  escapeProgress = 0;
  bossPhase = 'escape';
}

function drawEscape() {
  escapeProgress += 0.004;

  ctx.fillStyle = 'rgba(10,10,15,0.12)';
  ctx.fillRect(0, 0, width, height);

  const cy = height / 2;

  if (escapeProgress < 0.4) {
    const t = escapeProgress / 0.4;
    const amp = (1 - t) * height * 0.22;
    const freq = 0.008;
    const phase = frame * 0.004;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(80,112,96,${0.6 + t * 0.4})`;
    ctx.lineWidth = 1 + t;
    ctx.shadowColor = 'rgba(80,140,100,0.5)';
    ctx.shadowBlur  = 6 + t * 20;

    for (let x = 0; x <= width; x += 2) {
      const y = cy + Math.sin(x * freq + phase) * amp * (1 - t * 0.7);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else if (escapeProgress < 0.7) {
    const t = (escapeProgress - 0.4) / 0.3;
    const pulse = Math.sin(t * Math.PI) * 0.5;

    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.strokeStyle = `rgba(80,140,100,${0.4 + pulse * 0.5})`;
    ctx.lineWidth = 1 + pulse * 2;
    ctx.shadowColor = 'rgba(80,160,110,0.6)';
    ctx.shadowBlur  = 12 + pulse * 30;
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else {
    const t = (escapeProgress - 0.7) / 0.3;
    ctx.fillStyle = `rgba(10,10,15,${t * 0.15})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (escapeProgress >= 1.0) {
    escaping = false;
    dispatchEvent(new CustomEvent('loseamp:escaped'));
  }
}
