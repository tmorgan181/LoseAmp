/**
 * rooms/mirror.js
 * Room 4 — Mirror
 * Looks like Bright, but one thing is different: a 'noise' toggle that doesn't
 * exist in Bright. Clicking it reveals a 4-digit code and clears the room.
 */

import { exitRoom } from './manager.js';
import { applyUnlock } from '../puzzle/logic.js';
import { initControls } from '../loseamp/controls.js';

let canvas, ctx;
let particles = [];
let animFrame = null;
let mouseX = -9999, mouseY = -9999;

const PARTICLE_COUNT = 100;
const PUSH_RADIUS = 60;

export function enterMirror(state) {
  const el = document.getElementById('room-mirror');
  el.innerHTML = '';

  // Back button
  const back = document.createElement('button');
  back.className = 'room-back';
  back.textContent = '←';
  back.addEventListener('click', () => exitMirror());
  el.appendChild(back);

  // Canvas (mirrored particle field — same as Bright but hue-shifted)
  canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'filter:hue-rotate(180deg) brightness(0.85)',
  ].join(';');
  el.appendChild(canvas);
  ctx = canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  initParticles();
  canvas.addEventListener('mousemove', onMouseMove);
  animFrame = requestAnimationFrame(loop);

  // The "extra" element: a noise toggle that appears in mirror but not in Bright
  if (!state.rooms.mirror.cleared) {
    const noiseToggle = document.createElement('button');
    noiseToggle.id = 'mirror-noise-toggle';
    noiseToggle.textContent = 'noise';
    noiseToggle.style.cssText = [
      'position:absolute',
      'bottom:var(--space-lg)',
      'right:var(--space-lg)',
      'font-family:var(--font-mono)',
      'font-size:11px',
      'color:var(--fg-muted)',
      'border-color:var(--fg-muted)',
      'opacity:0',
      'transition:opacity 1.2s ease',
      'cursor:pointer',
    ].join(';');
    noiseToggle.addEventListener('click', () => onDifferenceFound(state, 'noise-toggle'));
    el.appendChild(noiseToggle);

    // Fade in after a moment so it's not immediately obvious
    setTimeout(() => { noiseToggle.style.opacity = '1'; }, 2000);
  } else {
    // Already cleared — show the code
    showCode(el, state.rooms.mirror.flags.codeRevealed);
  }
}

function exitMirror() {
  cleanup();
  exitRoom();
}

function cleanup() {
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  window.removeEventListener('resize', resizeCanvas);
  if (canvas) canvas.removeEventListener('mousemove', onMouseMove);
  particles = [];
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = canvas.offsetWidth  || window.innerWidth;
  canvas.height = canvas.offsetHeight || window.innerHeight;
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(makeParticle());
  }
}

function makeParticle() {
  const w = canvas.width || window.innerWidth;
  const h = canvas.height || window.innerHeight;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2,
    r: 1 + Math.random() * 2.5,
    a: 0.2 + Math.random() * 0.6,
    burstTimer: Math.random() * 200,
  };
}

function onMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouseY = (e.clientY - rect.top)  * (canvas.height / rect.height);
}

function loop() {
  animFrame = requestAnimationFrame(loop);
  update();
  draw();
}

function update() {
  const w = canvas.width, h = canvas.height;
  particles.forEach(p => {
    const dx = p.x - mouseX, dy = p.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < PUSH_RADIUS && dist > 0) {
      const force = (PUSH_RADIUS - dist) / PUSH_RADIUS;
      p.vx += (dx / dist) * force * 2;
      p.vy += (dy / dist) * force * 2;
    }
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.burstTimer--;
    if (p.burstTimer <= 0) {
      p.vx += (Math.random() - 0.5) * 3;
      p.vy += (Math.random() - 0.5) * 3;
      p.burstTimer = 80 + Math.random() * 160;
    }
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -10) p.x = w + 10;
    if (p.x > w + 10) p.x = -10;
    if (p.y < -10) p.y = h + 10;
    if (p.y > h + 10) p.y = -10;
  });
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = 'rgba(10,10,15,0.25)';
  ctx.fillRect(0, 0, w, h);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,200,220,${p.a})`;
    ctx.fill();
  });
}

export function onDifferenceFound(state, location) {
  if (state.rooms.mirror.flags.differenceFound) return;
  state.rooms.mirror.flags.differenceFound = true;

  const code = deriveCode(state, location);
  state.rooms.mirror.flags.codeRevealed = code;
  state.rooms.mirror.cleared = true;

  applyUnlock(state, 'noise');
  initControls();

  // Remove the toggle, show the code
  const toggle = document.getElementById('mirror-noise-toggle');
  if (toggle) toggle.style.opacity = '0';

  const el = document.getElementById('room-mirror');
  showCode(el, code);

  setTimeout(() => {
    cleanup();
    exitMirror();
  }, 3000);
}

function showCode(container, code) {
  const codeEl = document.createElement('div');
  codeEl.style.cssText = [
    'position:absolute',
    'top:50%',
    'left:50%',
    'transform:translate(-50%,-50%)',
    'font-family:var(--font-mono)',
    'font-size:24px',
    'color:rgba(80,112,96,0)',
    'letter-spacing:0.3em',
    'transition:color 1.2s ease',
    'pointer-events:none',
  ].join(';');
  codeEl.textContent = code || '----';
  container.appendChild(codeEl);
  requestAnimationFrame(() => {
    codeEl.style.color = 'rgba(80,112,96,0.8)';
  });
}

function deriveCode(state, location) {
  // Deterministic 4-digit code from state seed
  const seed = (state.rooms.bright.flags.clueCode || '000') + location.length;
  const n = parseInt(seed.replace(/\D/g, '').slice(0, 4).padEnd(4, '7'));
  return String((n * 37 + 1234) % 9000 + 1000);
}
