// Real reproductions: loading the painting, cropping it, cutting figures out of it.
// Every monster sprite is cut from the real painting; nothing here invents an image.
import * as THREE from 'three';

const cache = new Map();

// Loads an image once. If the file is missing the game still runs on a dark placeholder.
export function loadImage(src) {
  if (!src) return Promise.resolve(placeholder('?'));
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((res) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => { console.warn('[museo] immagine mancante', src); res(placeholder(src.split('/').pop())); };
    img.src = src;
  });
  cache.set(src, p);
  return p;
}

function placeholder(label) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 170, 10, 256, 192, 300); gr.addColorStop(0, '#3a2a20'); gr.addColorStop(1, '#050303');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  g.fillStyle = '#d8c8a0'; g.beginPath(); g.ellipse(256, 160, 60, 80, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#050303'; for (const x of [232, 280]) { g.beginPath(); g.arc(x, 150, 11, 0, 7); g.fill(); }
  g.beginPath(); g.ellipse(256, 200, 14, 22, 0, 0, 7); g.fill();
  g.fillStyle = '#8a7a60'; g.font = '16px monospace'; g.textAlign = 'center'; g.fillText('riproduzione mancante: ' + label, 256, 360);
  c.isPlaceholder = true;
  return c;
}

const W = (img) => img.naturalWidth || img.width;
const H = (img) => img.naturalHeight || img.height;

// rect = [x, y, w, h] in 0..1 of the painting. Returns a canvas.
export function crop(img, rect = [0, 0, 1, 1], maxSide = 1024) {
  const [x, y, w, h] = rect;
  const sw = W(img) * w, sh = H(img) * h;
  const k = Math.min(1, maxSide / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
  c.getContext('2d').drawImage(img, W(img) * x, H(img) * y, sw, sh, 0, 0, c.width, c.height);
  return c;
}

// Cuts a figure out of the painting.
//   rect:  [x, y, w, h] 0..1 of the painting
//   poly:  optional outline, points [x, y] 0..1 inside the rect (the scissors)
//   key:   optional { dark: 0..1 } or { light: 0..1 } removes background darker/lighter than the value
//   oval:  fades the cut out in an oval (default when there is no poly), so no rectangle edge ever shows
//   feather: soft edge in px; rot: 0..1 eats the edges with holes, like old paper
export function cutout(img, { rect = [0, 0, 1, 1], poly = null, key = null, oval = !poly, feather = 3, rot = 0.3, maxSide = 512, seed = 1 } = {}) {
  const c = crop(img, rect, maxSide);
  const w = c.width, h = c.height;
  const g = c.getContext('2d');
  if (poly?.length > 2) {
    const m = document.createElement('canvas'); m.width = w; m.height = h;
    const mg = m.getContext('2d');
    mg.filter = feather ? `blur(${feather}px)` : 'none';
    mg.beginPath(); poly.forEach(([px, py], i) => (i ? mg.lineTo(px * w, py * h) : mg.moveTo(px * w, py * h))); mg.closePath();
    mg.fillStyle = '#fff'; mg.fill();
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over';
  }
  const d = g.getImageData(0, 0, w, h), p = d.data;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // a few round holes and a ragged rim
  const holes = Array.from({ length: Math.round(rot * 14) }, () => [rnd() * w, rnd() * h, (2 + rnd() * 10) * (w / 256)]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let a = p[i + 3];
    if (key) {
      const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255;
      if (key.dark != null) a *= Math.min(1, Math.max(0, (l - key.dark) / 0.08));
      if (key.light != null) a *= Math.min(1, Math.max(0, (key.light - l) / 0.08));
    }
    if (oval) {
      // no rectangle ever shows: the cut fades out in an oval
      const dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2, r = Math.sqrt(dx * dx + dy * dy);
      a *= Math.max(0, Math.min(1, (1 - r) / 0.18));
    }
    if (rot > 0) {
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y) / Math.min(w, h);
      if (edge < 0.06 * rot && rnd() < 0.5) a = 0;
      for (const [hx, hy, hr] of holes) if ((x - hx) ** 2 + (y - hy) ** 2 < hr * hr) { a = 0; break; }
    }
    p[i + 3] = a;
  }
  g.putImageData(d, 0, 0);
  return c;
}

export function texture(canvasOrImg, { repeat = false, pixel = false } = {}) {
  const t = new THREE.CanvasTexture(canvasOrImg);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  t.anisotropy = 4;
  return t;
}

// A dirty, tileable wall made from a piece of the painting: darkened, blotched, with drips.
export function wallFrom(img, rect = [0, 0, 1, 1], { dark = 0.55, size = 256, seed = 3 } = {}) {
  const src = crop(img, rect, size);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  // mirrored tiling so it repeats without seams
  const half = size / 2;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    g.save(); g.translate(half + (sx < 0 ? half : 0), sy < 0 ? size : 0); g.scale(sx, sy);
    g.drawImage(src, sx < 0 ? 0 : -half, 0, half, half); g.restore();
  }
  g.drawImage(src, 0, 0, size, size);
  g.globalCompositeOperation = 'multiply';
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${20 + rnd() * 30},${10 + rnd() * 15},${5},${0.15 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * size, rnd() * size, 4 + rnd() * 40, 0, 7); g.fill(); }
  for (let i = 0; i < 14; i++) { const x = rnd() * size; g.fillStyle = `rgba(30,8,4,${0.2 + rnd() * 0.4})`; g.fillRect(x, rnd() * size * 0.5, 1 + rnd() * 3, 20 + rnd() * size * 0.6); }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = `rgba(0,0,0,${dark})`; g.fillRect(0, 0, size, size);
  return c;
}
