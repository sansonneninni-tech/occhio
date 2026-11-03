// Shared touch-friendly controls for the games.
import { h, clamp, onDrag } from './dom.js';
import { sfx } from './fx.js';

// Big slider. gradient: CSS background for the track (string or fn(value) => string).
export function slider({ label, min = 0, max = 1, step = 0, value = 0.5, gradient, format, onInput }) {
  let v = value;
  const thumb = h('div', { class: 'sl-thumb' });
  const track = h('div', { class: 'sl-track', role: 'slider', tabindex: 0, 'aria-label': label, 'aria-valuemin': min, 'aria-valuemax': max }, thumb);
  const out = h('span', { class: 'sl-val' });
  const root = h('div', { class: 'sl' }, h('div', { class: 'sl-head' }, h('span', { class: 'sl-label' }, label), out), track);
  const render = () => {
    const p = (v - min) / (max - min);
    thumb.style.left = `calc(${p * 100}% )`;
    out.textContent = format ? format(v) : '';
    track.setAttribute('aria-valuenow', v);
    if (typeof gradient === 'function') track.style.background = gradient(v);
  };
  const setFromX = (e) => {
    const r = track.getBoundingClientRect();
    let p = clamp((e.clientX - r.left) / r.width);
    let nv = min + p * (max - min);
    if (step) nv = Math.round(nv / step) * step;
    if (nv !== v) { v = nv; render(); onInput?.(v); }
  };
  onDrag(track, { start: (e) => { root.classList.add('is-active'); setFromX(e); }, move: setFromX, end: () => root.classList.remove('is-active') });
  track.addEventListener('keydown', (e) => {
    const d = step || (max - min) / 100;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = clamp(v + d, min, max);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = clamp(v - d, min, max);
    else return;
    e.preventDefault(); render(); onInput?.(v);
  });
  if (typeof gradient === 'string') track.style.background = gradient;
  render();
  return {
    el: root,
    get value() { return v; },
    set(nv, silent) { v = clamp(nv, min, max); render(); if (!silent) onInput?.(v); },
    setGradient(g) { track.style.background = g; },
    disable(d) { root.classList.toggle('is-disabled', d); },
  };
}

export function button(label, onClick, cls = '') {
  const b = h('button', { class: `btn ${cls}`, type: 'button' }, label);
  b.addEventListener('click', (e) => { sfx.tap(); onClick?.(e); });
  return b;
}

// Row of choice buttons; resolves to the chosen index.
export function choices(items, { cls = '', render } = {}) {
  let resolve;
  const p = new Promise((r) => (resolve = r));
  const btns = items.map((it, i) => {
    const b = h('button', { class: `choice ${cls}`, type: 'button' }, render ? render(it, i) : it);
    b.addEventListener('click', () => { sfx.tap(); btns.forEach((x) => (x.disabled = true)); resolve({ index: i, el: b }); });
    return b;
  });
  return { el: h('div', { class: 'choices' }, btns), btns, chosen: p };
}

// Builds the standard game layout.
export function layout(stage, { boardClass = '' } = {}) {
  const board = h('div', { class: `g-board ${boardClass}` });
  const controls = h('div', { class: 'g-controls' });
  stage.replaceChildren(board, controls);
  return { board, controls };
}

export function hint(text) {
  return h('p', { class: 'g-hint' }, text);
}
