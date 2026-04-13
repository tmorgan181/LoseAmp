/**
 * rooms/bright.js — Room 1: Bright
 * Particle chaos. Piano + bass silhouettes briefly appear.
 * Click during reveal to collect. Teaches: piano + bass are the answer.
 * Unlocks: both instruments, mirror portal toggle.
 */

import { state, saveState } from '../state.js';
import { exitRoom } from './manager.js';

const PARTICLE_COUNT  = 100;
const REVEAL_MIN      = 30000;
const REVEAL_MAX      = 50000;
const REVEAL_DURATION = 2500;
const REVEAL_FADE     = 600;
const IMAGE_OPACITY   = 0.28;
const IMAGE_SIZE      = 160;

let canvas, ctx;
let particles = [];
let images = { piano: null, bass: null };
let imagesLoaded = false;
let revealActive = false;
let revealStart  = null;
let revealTimer  = null;
let animFrameId  = null;
let foci = { piano: { x: 0, y: 0 }, bass: { x: 0, y: 0 } };

// ─── Entry / Exit ─────────────────────────────────────────────────────────────

export function enterBright() {
  const el = document.getElementById('room-bright');
  el.classList.remove('hidden');
  el.classList.add('active');

  if (!canvas) buildDOM(el);
  resizeCanvas();
  loadImages();
  spawnParticles();
  scheduleNextReveal();
  animFrameId = requestAnimationFrame(loop);

  state.rooms.bright.visited = true;
  saveState();
}

function exitBright() {
  cancelAnimationFrame(animFrameId);
  clearTimeout(revealTimer);
  revealActive = false;
  document.getElementById('room-bright').classList.add('hidden');
  document.getElementById('room-bright').classList.remove('active');
  exitRoom();
}

// ─── DOM ──────────────────────────────────────────────────────────────────────

function buildDOM(el) {
  el.innerHTML = '';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;';
  el.appendChild(canvas);
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'room-back';
  back.textContent = '←';
  back.addEventListener('click', exitBright);
  el.appendChild(back);

  canvas.addEventListener('click', onCanvasClick);
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;
  foci.piano = { x: rect.width * 0.32, y: rect.height * 0.50 };
  foci.bass  = { x: rect.width * 0.68, y: rect.height * 0.50 };
}

// ─── Images ───────────────────────────────────────────────────────────────────

function loadImages() {
  if (imagesLoaded) return;
  let loaded = 0;
  for (const [name, file] of [['piano','piano.png'],['bass','upright_bass.png']]) {
    const img = new Image();
    img.onload = () => { images[name] = img; if (++loaded === 2) imagesLoaded = true; };
    img.src = `assets/${file}`;
  }
}

// ─── Particles ────────────────────────────────────────────────────────────────

function spawnParticles() {
  particles = [];
  const w = canvas?.width  || window.innerWidth;
  const h = canvas?.height || window.innerHeight;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2,
      size: Math.random() * 2.5 + 0.5,
      life: Math.random(), decay: Math.random() * 0.003 + 0.001,
    });
  }
}

function updateParticles() {
  const w = canvas.width, h = canvas.height;
  const attract = revealActive ? revealProgress() : 0;

  for (const p of particles) {
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;

    if (attract > 0) {
      const target = p.x < w / 2 ? foci.piano : foci.bass;
      const dx = target.x - p.x, dy = target.y - p.y;
      const d  = Math.sqrt(dx*dx + dy*dy) || 1;
      const f  = attract * 0.06;
      p.vx += dx / d * f;
      p.vy += dy / d * f;
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if (speed > 4) { p.vx = p.vx/speed*4; p.vy = p.vy/speed*4; }
    } else {
      p.vx *= 0.99; p.vy *= 0.99;
    }

    p.x += p.vx; p.y += p.vy;
    p.life -= p.decay;

    if (p.life <= 0) {
      p.x = Math.random() * w; p.y = Math.random() * h;
      p.vx = (Math.random() - 0.5) * 1.2; p.vy = (Math.random() - 0.5) * 1.2;
      p.life = 1;
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100,120,110,${Math.min(1, p.life) * 0.6})`;
    ctx.fill();
  }
}

// ─── Reveal ───────────────────────────────────────────────────────────────────

function scheduleNextReveal() {
  const delay = REVEAL_MIN + Math.random() * (REVEAL_MAX - REVEAL_MIN);
  revealTimer = setTimeout(startReveal, delay);
}

function startReveal() {
  if (state.rooms.bright.cleared) return;
  revealActive = true;
  revealStart  = Date.now();
  setTimeout(() => {
    revealActive = false;
    revealStart  = null;
    if (!state.rooms.bright.cleared) scheduleNextReveal();
  }, REVEAL_DURATION);
}

function revealProgress() {
  if (!revealActive || !revealStart) return 0;
  const e = Date.now() - revealStart;
  if (e < REVEAL_FADE) return e / REVEAL_FADE;
  if (e > REVEAL_DURATION - REVEAL_FADE) return (REVEAL_DURATION - e) / REVEAL_FADE;
  return 1;
}

function drawSilhouettes() {
  if (!revealActive || !imagesLoaded) return;
  const t = revealProgress();
  if (t <= 0) return;
  const half = IMAGE_SIZE / 2;

  ctx.save();
  ctx.globalAlpha = t * IMAGE_OPACITY;
  ctx.globalCompositeOperation = 'screen';

  if (images.piano) ctx.drawImage(images.piano, foci.piano.x - half, foci.piano.y - half, IMAGE_SIZE, IMAGE_SIZE);
  if (images.bass)  ctx.drawImage(images.bass,  foci.bass.x  - half, foci.bass.y  - half, IMAGE_SIZE, IMAGE_SIZE);

  ctx.restore();
}

// ─── Click ────────────────────────────────────────────────────────────────────

function onCanvasClick(e) {
  if (!revealActive || state.rooms.bright.cleared) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const r = IMAGE_SIZE * 0.6;
  if (dst(x, y, foci.piano.x, foci.piano.y) < r || dst(x, y, foci.bass.x, foci.bass.y) < r) {
    collectItem();
  }
}

function dst(x1, y1, x2, y2) {
  return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

function collectItem() {
  state.rooms.bright.cleared = true;
  state.rooms.bright.flags.itemCollected = true;
  if (!state.unlocks.instruments.includes('piano')) state.unlocks.instruments.push('piano');
  if (!state.unlocks.instruments.includes('bass'))  state.unlocks.instruments.push('bass');
  state.unlocks.mirrorToggle = true;
  saveState();

  for (const p of particles) { p.vx *= 0.3; p.vy *= 0.3; p.decay *= 3; }
  import('../loseamp/controls.js').then(m => m.initControls());
}

// ─── Loop ─────────────────────────────────────────────────────────────────────

function loop() {
  animFrameId = requestAnimationFrame(loop);
  if (!canvas) return;
  ctx.fillStyle = 'rgba(10,10,15,0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSilhouettes();
  updateParticles();
  drawParticles();
}
