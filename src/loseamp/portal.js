/**
 * loseamp/portal.js
 * The central soundwave portal — the Loseamp.
 * Canvas-based visualizer that responds to soundboard state.
 */

import { getSignalLevel } from '../audio/engine.js';

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
}

export function setBossPhase(phase) {
  bossPhase = phase;
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
  if (signal > 0) return signal;
  // Demo fallback
  return Math.sin(demoT) * 0.5 + 0.5;
}

function getColor(intensity) {
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

  ctx.fillStyle = 'rgba(10, 10, 15, 0.18)';
  ctx.fillRect(0, 0, width, height);

  drawVignette();
  drawPortalFrame(intensity, tint);

  for (const layer of LAYERS) {
    drawWave(layer, intensity, tint);
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

function drawWave(layer, intensity, tint) {
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
  ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
  ctx.lineWidth = intensity < 0.35 ? 0.5 : 1.0;
  ctx.shadowColor = `rgba(${r},${g},${b},${a * 0.6})`;
  ctx.shadowBlur  = 8 + intensity * 16;

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

function drawPortalFrame(intensity, tint) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.44;
  const ry = height * 0.40;

  const { r, g, b } = tint;
  const alpha = 0.08 + intensity * 0.08;

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
  ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
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
