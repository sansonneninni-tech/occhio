// Tiny DOM helpers used everywhere.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElementNS(
    tag === 'svg' || attrs.__svg ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml',
    tag
  );
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === '__svg' || v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const svgNS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pointer position relative to an element, in its own CSS pixels.
export function localPoint(e, el) {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
}

// Drag helper with pointer capture. Returns a cleanup fn.
export function onDrag(el, { start, move, end }) {
  let active = null;
  const down = (e) => {
    if (active !== null) return;
    active = e.pointerId;
    el.setPointerCapture?.(e.pointerId);
    start?.(e);
    e.preventDefault();
  };
  const mv = (e) => { if (e.pointerId === active) move?.(e); };
  const up = (e) => {
    if (e.pointerId !== active) return;
    active = null;
    end?.(e);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', mv);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', mv);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
