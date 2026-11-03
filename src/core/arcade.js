// Shared plumbing for real-time canvas games: sized canvas, art layer, loop, input.
import { h } from './dom.js';

// A canvas that fills its parent and keeps a crisp backing store.
export function stageCanvas(parent, { aspect = null, maxDpr = 2 } = {}) {
  const canvas = h('canvas', { style: { display: 'block', width: '100%', height: '100%', touchAction: 'none' } });
  const box = h('div', { class: 'arena' }, canvas);
  if (aspect) box.style.aspectRatio = aspect;
  parent.append(box);
  const g = canvas.getContext('2d');
  const state = { canvas, box, g, w: 0, h: 0, dpr: 1, onResize: null };
  const resize = () => {
    const r = box.getBoundingClientRect();
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const w = Math.max(10, Math.round(r.width)), hh = Math.max(10, Math.round(r.height));
    if (w === state.w && hh === state.h && dpr === state.dpr) return;
    state.w = w; state.h = hh; state.dpr = dpr;
    canvas.width = w * dpr; canvas.height = hh * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.onResize?.(w, hh);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(box);
  resize();
  state.destroy = () => ro.disconnect();
  return state;
}

// Offscreen art layer in fixed "world" units so the artwork is resolution independent.
export function artLayer(W, H, bg = '#F3EFE6', scale = 2) {
  const c = document.createElement('canvas');
  c.width = W * scale; c.height = H * scale;
  const g = c.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  return { c, g, W, H, scale };
}

// requestAnimationFrame loop with clamped dt (seconds). Returns stop().
export function loop(fn) {
  let raf = 0, last = performance.now(), running = true;
  const step = (now) => {
    if (!running) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    fn(dt, now / 1000);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => { running = false; cancelAnimationFrame(raf); };
}

// Pointer + keyboard state relative to an element.
export function input(el) {
  const st = { x: 0, y: 0, down: false, justDown: false, justUp: false, keys: new Set(), pressed: new Set(), moved: false, path: [] };
  const pos = (e) => { const r = el.getBoundingClientRect(); st.x = e.clientX - r.left; st.y = e.clientY - r.top; };
  const down = (e) => { pos(e); st.down = true; st.justDown = true; st.moved = true; el.setPointerCapture?.(e.pointerId); e.preventDefault(); };
  const move = (e) => { pos(e); st.moved = true; };
  const up = (e) => { pos(e); st.down = false; st.justUp = true; };
  const kd = (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    if (!st.keys.has(e.key)) st.pressed.add(e.key);
    st.keys.add(e.key);
  };
  const ku = (e) => st.keys.delete(e.key);
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  st.frame = () => { st.justDown = false; st.justUp = false; st.pressed.clear(); };
  st.destroy = () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
  };
  return st;
}

export const TAU = Math.PI * 2;
export const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
export const POP = ['#FF4D1F', '#2D3BFF', '#FFD400', '#FF8AD0', '#12C97A', '#0E0E10', '#F3EFE6'];

// Convert arena-local coords to stage-local coords (for floating score text).
export function toStage(stage, box, x, y) {
  const s = stage.getBoundingClientRect(), b = box.getBoundingClientRect();
  return { x: b.left - s.left + x, y: b.top - s.top + y };
}

// Arcade layout: big arena on top, slim controls row below.
export function arcadeLayout(stage) {
  stage.classList.add('g-stage--arcade');
  const board = h('div', { class: 'g-board' });
  const controls = h('div', { class: 'g-controls g-controls--row' });
  stage.replaceChildren(board, controls);
  return { board, controls };
}

// Paint splat: blob plus droplets.
export function splat(g, x, y, r, color, rnd = Math.random) {
  g.fillStyle = color;
  g.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.7 + rnd() * 0.5);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath(); g.fill();
  const drops = 6 + Math.floor(rnd() * 8);
  for (let i = 0; i < drops; i++) {
    const a = rnd() * Math.PI * 2, d = r * (1.1 + rnd() * 1.6), s = r * (0.06 + rnd() * 0.18);
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, Math.PI * 2); g.fill();
    // streak
    g.lineWidth = s * 0.9; g.strokeStyle = color; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); g.stroke();
  }
}
