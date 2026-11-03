// Juice: sounds, haptics, floating score, stamps, confetti. Only transform/opacity are animated.
import { store } from './store.js';
import { h, reduceMotion, rand } from './dom.js';

let ctx = null;
function audio() {
  if (store.muted) return null;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
function tone(freq, dur = 0.08, type = 'sine', vol = 0.12, when = 0, slide = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap: () => tone(520, 0.04, 'triangle', 0.06),
  tick: () => tone(880, 0.03, 'square', 0.03),
  good: () => { tone(660, 0.08, 'triangle'); tone(990, 0.1, 'triangle', 0.1, 0.06); },
  great: () => { tone(660, 0.07, 'triangle'); tone(880, 0.07, 'triangle', 0.1, 0.06); tone(1320, 0.14, 'triangle', 0.1, 0.12); },
  bad: () => tone(220, 0.18, 'sawtooth', 0.06, 0, -90),
  combo: (n) => tone(500 + n * 90, 0.09, 'square', 0.05),
  start: () => { tone(440, 0.08, 'triangle'); tone(660, 0.12, 'triangle', 0.1, 0.09); },
  end: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.09)); },
  record: () => { [523, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.06, i * 0.07)); },
};

export function vibrate(p) {
  try { if (!store.muted) navigator.vibrate?.(p); } catch {}
}

export function animate(el, frames, opts) {
  if (!el?.animate) return { finished: Promise.resolve() };
  if (reduceMotion()) opts = { ...opts, duration: Math.min(120, opts?.duration ?? 120) };
  return el.animate(frames, { easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both', ...opts });
}

// Floating "+120" at a point inside a container.
export function floatText(container, text, x, y, color = 'var(--ink)') {
  const el = h('div', { class: 'fx-float', style: { left: x + 'px', top: y + 'px', color } }, text);
  container.append(el);
  animate(el, [
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%,-200%) scale(1)', opacity: 0 },
  ], { duration: 900 }).finished.then(() => el.remove());
}

// Big rotated stamp in the middle of the board.
export function stamp(container, text, kind = 'good') {
  container.querySelectorAll('.fx-stamp').forEach((n) => n.remove());
  const el = h('div', { class: `fx-stamp fx-stamp--${kind}` }, text);
  container.append(el);
  const rot = rand(-8, 8);
  animate(el, [
    { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(2.2)`, opacity: 0 },
    { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.22 },
    { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.78 },
    { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(.9)`, opacity: 0 },
  ], { duration: 1100 }).finished.then(() => el.remove());
}

export function shake(el) {
  animate(el, [
    { transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' },
    { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' },
  ], { duration: 320, fill: 'none' });
}

export function pulse(el, scale = 1.08) {
  animate(el, [{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }], { duration: 260, fill: 'none' });
}

const CONFETTI = ['#FF4D1F', '#2D3BFF', '#FFD400', '#FF8AD0', '#12C97A', '#0E0E10'];
export function confetti(container, n = 60) {
  if (reduceMotion()) return;
  const r = container.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = CONFETTI[i % CONFETTI.length];
    const size = rand(6, 14);
    const el = h('i', { class: 'fx-confetti', style: { background: c, width: size + 'px', height: size * rand(0.4, 1.4) + 'px', left: r.width / 2 + 'px', top: r.height * 0.35 + 'px', borderRadius: Math.random() > 0.6 ? '50%' : '2px' } });
    container.append(el);
    const ang = rand(0, Math.PI * 2), dist = rand(120, Math.max(r.width, 400) * 0.6);
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.7;
    animate(el, [
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${rand(-360, 360)}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx * 1.1}px, ${dy + 260}px) rotate(${rand(-720, 720)}deg)`, opacity: 0 },
    ], { duration: rand(1200, 1900), easing: 'cubic-bezier(.15,.7,.3,1)' }).finished.then(() => el.remove());
  }
}

// Count a number up inside an element.
export function countUp(el, to, dur = 900) {
  if (reduceMotion()) { el.textContent = to.toLocaleString(); return; }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(to * (1 - (1 - p) ** 3)).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
