import { SIG } from './signatures.js';

// Procedural art for the museum: painting homages, monster sprites, wall and floor textures.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TAU = Math.PI * 2;
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// A small figure used to populate crowds.
function figure(g, x, y, s, col, r) {
  g.fillStyle = col;
  g.beginPath(); g.arc(x, y - s * 1.6, s * 0.35, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x - s * 0.4, y - s * 1.2); g.lineTo(x + s * 0.4, y - s * 1.2); g.lineTo(x + s * 0.25 + (r() - 0.5) * s * 0.4, y); g.lineTo(x - s * 0.25, y); g.closePath(); g.fill();
  g.lineWidth = s * 0.15; g.strokeStyle = col;
  g.beginPath(); g.moveTo(x - s * 0.35, y - s * 1.1); g.lineTo(x - s * 0.8, y - s * (0.6 + r())); g.moveTo(x + s * 0.35, y - s * 1.1); g.lineTo(x + s * 0.8, y - s * (0.6 + r())); g.stroke();
}
function face(g, x, y, s, skin, dark, r, open = 0.5) {
  g.fillStyle = skin; g.beginPath(); g.ellipse(x, y, s * 0.42, s * 0.55, 0, 0, TAU); g.fill();
  g.fillStyle = dark;
  g.beginPath(); g.ellipse(x - s * 0.16, y - s * 0.1, s * 0.08, s * 0.1, 0, 0, TAU); g.ellipse(x + s * 0.16, y - s * 0.1, s * 0.08, s * 0.1, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x, y + s * 0.28, s * 0.12, s * 0.15 * open + 0.01, 0, 0, TAU); g.fill();
}

// Original homage composition for each motif. Returns a canvas.
export function paintingArt(level, idx, W = 320, H = 240) {
  const c = cv(W, H), g = c.getContext('2d');
  const r = rng(idx * 7919 + 13);
  const { pal, monster } = level;
  const bg = g.createLinearGradient(0, 0, 0, H);
  const m = level.motif;
  const sig = SIG[idx];
  if (sig?.full) {
    g.save(); g.scale(W / 320, H / 240); sig.full(g, r, level); g.restore();
  } else if (m === 'hell') {
    bg.addColorStop(0, '#000'); bg.addColorStop(0.35, shade(pal.accent, 0.7)); bg.addColorStop(0.55, pal.wall2); bg.addColorStop(1, pal.floor);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { g.fillStyle = hexA(pal.accent, 0.15 + r() * 0.3); g.beginPath(); g.ellipse(r() * W, H * 0.3 + r() * 30, 20 + r() * 50, 6 + r() * 14, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#0a0503'; for (let i = 0; i < 9; i++) { const x = r() * W, w = 10 + r() * 30, h2 = 20 + r() * 60; g.fillRect(x, H * 0.45 - h2, w, h2); }
    for (let i = 0; i < 70; i++) figure(g, r() * W, H * 0.55 + r() * H * 0.45, 3 + r() * 4, r() < 0.5 ? '#e8d8c0' : shade(monster.c1, 0.8), r);
    drawMonsterShape(g, monster, W * (0.3 + r() * 0.4), H * 0.62, H * 0.32, r, 0);
  } else if (m === 'skulls') {
    bg.addColorStop(0, '#2a2418'); bg.addColorStop(0.4, pal.wall2); bg.addColorStop(1, pal.floor);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) { g.fillStyle = hexA('#000000', 0.25); g.beginPath(); g.arc(r() * W, H * 0.2, 20 + r() * 30, 0, TAU); g.fill(); }
    for (let i = 0; i < 40; i++) drawMonsterShape(g, monster, r() * W, H * 0.5 + r() * H * 0.5, 14 + r() * 24, r, 0);
  } else if (m === 'portrait' || m === 'void') {
    g.fillStyle = m === 'void' ? pal.wall2 : '#070605'; g.fillRect(0, 0, W, H);
    if (m === 'void') { const gr = g.createLinearGradient(0, H * 0.6, 0, H); gr.addColorStop(0, pal.floor); gr.addColorStop(1, shade(pal.floor, 0.6)); g.fillStyle = gr; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.7); g.quadraticCurveTo(W * 0.4, H * 0.55, W, H * 0.8); g.lineTo(W, H); g.fill(); }
    const lx = W * (0.3 + r() * 0.2);
    const lg = g.createRadialGradient(lx, H * 0.4, 10, lx, H * 0.4, W * 0.6);
    lg.addColorStop(0, hexA(pal.accent, m === 'void' ? 0.05 : 0.25)); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    drawMonsterShape(g, monster, W * 0.5, H * (m === 'void' ? 0.72 : 0.92), H * (m === 'void' ? 0.22 : 0.8), r, 0);
  } else if (m === 'beast') {
    bg.addColorStop(0, '#050403'); bg.addColorStop(1, pal.wall2); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = hexA(pal.accent, 0.12); g.beginPath(); g.arc(W * 0.75, H * 0.2, 30, 0, TAU); g.fill();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI; figure(g, W / 2 + Math.cos(a) * W * 0.38, H * 0.95 - Math.sin(a) * 20, 6 + r() * 3, shade(pal.wall2, 1.6), r); }
    drawMonsterShape(g, monster, W * 0.5, H * 0.85, H * 0.65, r, 0);
  } else if (m === 'sea') {
    bg.addColorStop(0, '#2a2a20'); bg.addColorStop(0.5, shade(pal.accent, 0.5)); bg.addColorStop(1, '#0a100c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0c1410'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, H * 0.6 + i * 14); for (let x = 0; x <= W; x += 20) g.lineTo(x, H * 0.6 + i * 14 + Math.sin(x / 30 + i) * 8); g.lineTo(W, H); g.lineTo(0, H); g.fill(); }
    g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(W * 0.15, H * 0.8); g.lineTo(W * 0.85, H * 0.72); g.lineTo(W * 0.5, H * 0.2); g.closePath(); g.globalAlpha = 0.3; g.fill(); g.globalAlpha = 1;
    for (let i = 0; i < 18; i++) figure(g, W * (0.2 + r() * 0.6), H * (0.72 + r() * 0.1), 6 + r() * 4, shade(monster.c1, 0.6 + r() * 0.5), r);
  } else if (m === 'island') {
    bg.addColorStop(0, '#2a3030'); bg.addColorStop(0.55, '#4a5050'); bg.addColorStop(0.56, '#101616'); bg.addColorStop(1, '#060808'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8a8478'; g.beginPath(); g.moveTo(W * 0.2, H * 0.56); g.lineTo(W * 0.28, H * 0.2); g.lineTo(W * 0.4, H * 0.28); g.lineTo(W * 0.6, H * 0.3); g.lineTo(W * 0.72, H * 0.18); g.lineTo(W * 0.8, H * 0.56); g.fill();
    g.fillStyle = '#050806'; for (let i = 0; i < 7; i++) { const x = W * (0.42 + i * 0.028); g.beginPath(); g.ellipse(x, H * 0.32, 6, 60 + r() * 20, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#3a2a1a'; g.fillRect(W * 0.44, H * 0.7, W * 0.14, 6);
    g.fillStyle = '#f0f0e8'; g.fillRect(W * 0.49, H * 0.62, 7, 18); g.beginPath(); g.arc(W * 0.49 + 3.5, H * 0.61, 4, 0, TAU); g.fill();
  } else if (m === 'eye') {
    g.fillStyle = pal.wall2; g.fillRect(0, 0, W, H);
    g.fillStyle = shade(pal.wall2, 0.6); g.fillRect(0, H * 0.75, W, H * 0.25);
    drawMonsterShape(g, monster, W * 0.5, H * 0.7, H * 0.55, r, 0);
  } else if (m === 'masks') {
    g.fillStyle = pal.wall2; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) drawMonsterShape(g, { ...monster, c1: ['#e8d0b0', '#e85a8a', '#8ac0e8', '#e8c040', '#9ad88a'][i % 5] }, r() * W, r() * H + 30, 30 + r() * 40, r, 0);
    drawMonsterShape(g, { ...monster, body: 'skeleton', c1: '#f0f0e8' }, W * 0.5, H * 0.95, H * 0.6, r, 0);
  } else if (m === 'scream') {
    for (let i = 0; i < 12; i++) { g.strokeStyle = i % 2 ? pal.accent : '#c83a1a'; g.lineWidth = 12; g.beginPath(); for (let x = 0; x <= W; x += 10) g.lineTo(x, i * 12 + Math.sin(x / 40 + i) * 10); g.stroke(); }
    g.fillStyle = '#2a3a6a'; g.beginPath(); g.moveTo(0, H * 0.5); for (let x = 0; x <= W; x += 10) g.lineTo(x, H * 0.55 + Math.sin(x / 50) * 18); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = '#5a3a1a'; g.lineWidth = 20; g.beginPath(); g.moveTo(-10, H * 0.55); g.lineTo(W * 1.1, H * 1.1); g.stroke();
    drawMonsterShape(g, monster, W * 0.45, H * 1.0, H * 0.55, r, 0.9);
  } else if (m === 'cage') {
    g.fillStyle = pal.wall2; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 3) { g.fillStyle = hexA('#000000', r() * 0.35); g.fillRect(x, 0, 2, H); }
    g.strokeStyle = hexA('#ffffff', 0.5); g.lineWidth = 2;
    g.strokeRect(W * 0.25, H * 0.2, W * 0.5, H * 0.6);
    g.beginPath(); g.moveTo(W * 0.25, H * 0.8); g.lineTo(W * 0.1, H); g.moveTo(W * 0.75, H * 0.8); g.lineTo(W * 0.9, H); g.moveTo(W * 0.25, H * 0.2); g.lineTo(W * 0.15, H * 0.05); g.moveTo(W * 0.75, H * 0.2); g.lineTo(W * 0.85, H * 0.05); g.stroke();
    drawMonsterShape(g, monster, W * 0.5, H * 0.82, H * 0.55, r, 1);
    // smear
    const id = g.getImageData(W * 0.3, H * 0.2, W * 0.4, H * 0.6);
    for (let k = 0; k < 4; k++) g.putImageData(id, W * 0.3 + (r() - 0.5) * 10, H * 0.2 + k * 2);
  }
  if (sig?.add) { g.save(); g.scale(W / 320, H / 240); sig.add(g, r, level); g.restore(); }
  // varnish: vignette, cracks, grain
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.6;
  for (let i = 0; i < 40; i++) { let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 18; y += (r() - 0.5) * 18; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(255,220,150,.06)'; g.fillRect(0, 0, W, H);
  return c;
}

// Draws a monster, feet at (x, y), height s. pose 0..1 = mouth opening / attack.
export function drawMonsterShape(g, mon, x, y, s, r = Math.random, pose = 0, frame = 0) {
  const { body, c1, c2, eyes, extra } = mon;
  const bob = frame ? s * 0.02 : 0;
  g.save(); g.translate(x, y - bob);
  const dark = '#0a0606';
  const eyeDots = (cx, cy, rad, n) => {
    for (let i = 0; i < n; i++) {
      const ex = cx + (n === 1 ? 0 : (i / (n - 1) - 0.5) * rad * 4.2);
      g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(ex, cy, rad, 0, TAU); g.fill();
      g.fillStyle = '#c81010'; g.beginPath(); g.arc(ex, cy, rad * 0.5, 0, TAU); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(ex, cy, rad * 0.22, 0, TAU); g.fill();
    }
  };
  const mouth = (cx, cy, w, open) => {
    g.fillStyle = '#1a0404'; g.beginPath(); g.ellipse(cx, cy, w, w * (0.2 + open * 0.8), 0, 0, TAU); g.fill();
    g.fillStyle = '#f0e8d0';
    const n = 7;
    for (let i = 0; i < n; i++) { const tx = cx - w + (i + 0.5) * (2 * w / n); g.beginPath(); g.moveTo(tx - w / n * 0.8, cy - w * (0.2 + open * 0.8) * 0.8); g.lineTo(tx + w / n * 0.8, cy - w * (0.2 + open * 0.8) * 0.8); g.lineTo(tx, cy - w * 0.05); g.fill(); g.beginPath(); g.moveTo(tx - w / n * 0.8, cy + w * (0.2 + open * 0.8) * 0.8); g.lineTo(tx + w / n * 0.8, cy + w * (0.2 + open * 0.8) * 0.8); g.lineTo(tx, cy + w * 0.05); g.fill(); }
  };
  const legSwing = frame ? 0.18 : -0.18;
  if (body === 'humanoid' || body === 'skeleton') {
    const bone = body === 'skeleton';
    g.strokeStyle = c1; g.lineCap = 'round';
    g.lineWidth = s * (bone ? 0.05 : 0.11);
    // legs
    g.beginPath(); g.moveTo(-s * 0.08, -s * 0.45); g.lineTo(-s * (0.14 + legSwing * 0.4), 0); g.moveTo(s * 0.08, -s * 0.45); g.lineTo(s * (0.14 - legSwing * 0.4), 0); g.stroke();
    // torso
    if (bone) { g.lineWidth = s * 0.03; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(0, -s * (0.55 + i * 0.06), s * 0.13, s * 0.025, 0, 0, TAU); g.stroke(); } g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(0, -s * 0.45); g.lineTo(0, -s * 0.85); g.stroke(); }
    else { g.fillStyle = c1; g.beginPath(); g.moveTo(-s * 0.2, -s * 0.85); g.quadraticCurveTo(-s * 0.26, -s * 0.6, -s * 0.12, -s * 0.42); g.lineTo(s * 0.12, -s * 0.42); g.quadraticCurveTo(s * 0.26, -s * 0.6, s * 0.2, -s * 0.85); g.fill(); g.fillStyle = c2; g.globalAlpha = 0.5; g.fillRect(-s * 0.12, -s * 0.7, s * 0.24, s * 0.05); g.globalAlpha = 1; }
    // arms (too long: unsettling)
    g.lineWidth = s * (bone ? 0.04 : 0.08);
    const reach = 0.45 + pose * 0.25;
    g.beginPath(); g.moveTo(-s * 0.18, -s * 0.82); g.quadraticCurveTo(-s * 0.42, -s * 0.6, -s * reach, -s * (0.25 + pose * 0.4)); g.moveTo(s * 0.18, -s * 0.82); g.quadraticCurveTo(s * 0.42, -s * 0.6, s * reach, -s * (0.25 + pose * 0.4)); g.stroke();
    // claws
    g.lineWidth = s * 0.015; for (const sx of [-1, 1]) for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(sx * s * reach, -s * (0.25 + pose * 0.4)); g.lineTo(sx * s * (reach + 0.06), -s * (0.2 + pose * 0.4) + k * s * 0.04); g.stroke(); }
    // head
    const hy = -s * 0.97;
    g.fillStyle = bone ? c1 : c1; g.beginPath(); g.ellipse(0, hy, s * 0.13, s * 0.16, 0, 0, TAU); g.fill();
    if (extra === 'hood' || extra === 'shroud') { g.fillStyle = c2; g.beginPath(); g.moveTo(-s * 0.2, hy + s * 0.3); g.quadraticCurveTo(0, hy - s * 0.42, s * 0.2, hy + s * 0.3); g.fill(); }
    if (extra === 'horns') { g.fillStyle = c2; g.beginPath(); g.moveTo(-s * 0.1, hy - s * 0.1); g.quadraticCurveTo(-s * 0.3, hy - s * 0.3, -s * 0.22, hy - s * 0.42); g.lineTo(-s * 0.04, hy - s * 0.14); g.fill(); g.beginPath(); g.moveTo(s * 0.1, hy - s * 0.1); g.quadraticCurveTo(s * 0.3, hy - s * 0.3, s * 0.22, hy - s * 0.42); g.lineTo(s * 0.04, hy - s * 0.14); g.fill(); }
    if (extra === 'longhair' || extra === 'wild' || extra === 'hair') { g.strokeStyle = extra === 'longhair' ? c1 : c2; g.lineWidth = s * 0.012; for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo((i / 17 - 0.5) * s * 0.26, hy - s * 0.12); g.quadraticCurveTo((i / 17 - 0.5) * s * 0.6, hy + s * 0.1, (i / 17 - 0.5) * s * 0.5, hy + s * 0.45); g.stroke(); } }
    if (extra === 'scythe' || extra === 'blade' || extra === 'fiddle') { g.strokeStyle = '#d8d8d0'; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(s * reach, -s * (0.25 + pose * 0.4)); g.lineTo(s * (reach + 0.05), -s * 1.2); g.stroke(); if (extra === 'scythe') { g.beginPath(); g.moveTo(s * (reach + 0.05), -s * 1.2); g.quadraticCurveTo(s * 0.1, -s * 1.3, -s * 0.1, -s * 1.05); g.stroke(); } }
    if (extra === 'turban') { g.fillStyle = c2; g.beginPath(); g.ellipse(0, hy - s * 0.12, s * 0.17, s * 0.09, 0, 0, TAU); g.fill(); }
    if (extra === 'twin') { g.save(); g.globalAlpha = 0.5; g.translate(s * 0.22, 0); g.fillStyle = c2; g.beginPath(); g.ellipse(0, hy + s * 0.05, s * 0.12, s * 0.15, 0, 0, TAU); g.fill(); g.restore(); }
    if (eyes) eyeDots(0, hy - s * 0.02, s * 0.025, eyes);
    if (extra !== 'shroud') mouth(0, hy + s * 0.08, s * 0.06, pose);
  } else if (body === 'head') {
    const hs = s * 0.55;
    if (extra === 'halo') { g.fillStyle = 'rgba(255,208,96,.35)'; g.beginPath(); g.arc(0, -hs, hs * 0.95, 0, TAU); g.fill(); g.strokeStyle = '#ffd060'; g.lineWidth = s * 0.02; g.stroke(); }
    if (extra === 'snakes') { g.strokeStyle = c2; g.lineWidth = s * 0.035; g.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a = -Math.PI + (i / 11) * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * hs * 0.5, -hs + Math.sin(a) * hs * 0.6); g.bezierCurveTo(Math.cos(a) * hs * 0.9, -hs + Math.sin(a) * hs, Math.cos(a + 0.4) * hs * 1.1, -hs + Math.sin(a + 0.4) * hs * 1.1 + (frame ? 4 : -4), Math.cos(a) * hs * 1.2, -hs + Math.sin(a) * hs * 1.2); g.stroke(); } }
    g.fillStyle = c1; g.beginPath(); g.ellipse(0, -hs, hs * (extra === 'oval' ? 0.42 : 0.55), hs * 0.7, 0, 0, TAU); g.fill();
    if (extra === 'blood') { g.fillStyle = c2; g.beginPath(); g.ellipse(0, -hs * 0.32, hs * 0.5, hs * 0.12, 0, 0, TAU); g.fill(); for (let i = 0; i < 6; i++) g.fillRect(-hs * 0.4 + i * hs * 0.15, -hs * 0.35, hs * 0.05, hs * (0.2 + r() * 0.5)); }
    if (extra === 'oval') { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(-hs * 0.3, -hs, hs * 0.08, hs * 0.5, 0, 0, TAU); g.fill(); g.fillStyle = c1; g.fillRect(-hs * 0.65, -hs * 0.9, hs * 0.2, hs * 0.5); g.fillRect(hs * 0.45, -hs * 0.9, hs * 0.2, hs * 0.5); }
    if (extra === 'nested') { for (const sx of [-1, 1]) { g.fillStyle = '#1a1410'; g.beginPath(); g.ellipse(sx * hs * 0.22, -hs * 1.1, hs * 0.16, hs * 0.2, 0, 0, TAU); g.fill(); g.fillStyle = c1; g.beginPath(); g.ellipse(sx * hs * 0.22, -hs * 1.1, hs * 0.08, hs * 0.1, 0, 0, TAU); g.fill(); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(sx * hs * 0.22, -hs * 1.1, hs * 0.03, 0, TAU); g.fill(); } }
    else if (extra === 'closed') { g.strokeStyle = dark; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(-hs * 0.32, -hs * 1.08); g.lineTo(-hs * 0.1, -hs * 1.05); g.moveTo(hs * 0.1, -hs * 1.05); g.lineTo(hs * 0.32, -hs * 1.08); g.stroke(); }
    else if (eyes) eyeDots(0, -hs * 1.1, hs * 0.09, eyes);
    mouth(0, -hs * 0.65, hs * (extra === 'oval' ? 0.14 : 0.3), Math.max(pose, extra === 'teeth' || extra === 'oval' ? 0.8 : 0.2));
  } else if (body === 'blob' || body === 'beast') {
    const bw = s * (body === 'blob' ? 0.5 : 0.42);
    g.fillStyle = c1;
    if (body === 'beast') { g.strokeStyle = c1; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(-bw * 0.6, -s * 0.3); g.lineTo(-bw * (0.8 + legSwing), 0); g.moveTo(bw * 0.6, -s * 0.3); g.lineTo(bw * (0.8 - legSwing), 0); g.stroke(); }
    if (extra === 'neck') {
      g.strokeStyle = c1; g.lineWidth = s * 0.09; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -s * 0.3); g.bezierCurveTo(-s * 0.3, -s * 0.6, s * 0.3, -s * 0.8, s * 0.05, -s * 1.0); g.stroke();
      g.fillStyle = c1; g.beginPath(); g.ellipse(0, -s * 0.28, bw, s * 0.22, 0, 0, TAU); g.fill();
      g.fillStyle = c2; g.beginPath(); g.ellipse(0, -s * 0.2, bw * 0.6, s * 0.06, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-s * 0.12, -s * 1.08, s * 0.3, s * 0.06);
      mouth(s * 0.05, -s * 1.0, s * 0.12, 0.6 + pose * 0.4);
    } else {
      g.beginPath(); g.ellipse(0, -s * 0.45, bw, s * 0.42, 0, 0, TAU); g.fill();
      if (extra === 'shell') { g.fillStyle = c2; g.beginPath(); g.ellipse(0, -s * 0.55, bw * 0.75, s * 0.28, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#ffcc66'; g.fillRect(-bw * 0.2, -s * 0.6, bw * 0.4, s * 0.12); }
      if (extra === 'fins') { g.fillStyle = c2; g.beginPath(); g.moveTo(bw, -s * 0.5); g.lineTo(bw * 1.6, -s * (0.8 + legSwing)); g.lineTo(bw * 1.5, -s * 0.3); g.fill(); g.beginPath(); g.moveTo(-bw, -s * 0.5); g.lineTo(-bw * 1.6, -s * (0.8 - legSwing)); g.lineTo(-bw * 1.5, -s * 0.3); g.fill(); }
      if (extra === 'boils') { for (let i = 0; i < 9; i++) { g.fillStyle = c2; g.beginPath(); g.arc((r() - 0.5) * bw * 1.6, -s * (0.2 + r() * 0.5), s * (0.02 + r() * 0.04), 0, TAU); g.fill(); } }
      if (extra === 'horns' || extra === 'ears') { g.fillStyle = extra === 'horns' ? c2 : c1; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * bw * 0.4, -s * 0.8); g.quadraticCurveTo(sx * bw * 1.1, -s * 1.05, sx * bw * 0.9, -s * 1.25); g.lineTo(sx * bw * 0.15, -s * 0.82); g.fill(); } }
      if (extra === 'tentacles') { g.strokeStyle = c1; g.lineWidth = s * 0.04; for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * bw * 0.8, -s * 0.2); g.bezierCurveTo(Math.cos(a) * bw * 1.6, -s * 0.1, Math.cos(a) * bw * 1.4 + (frame ? 6 : -6), s * 0.05, Math.cos(a) * bw * 2, 0); g.stroke(); } }
      if (eyes) eyeDots(0, -s * 0.6, s * 0.045, eyes);
      mouth(0, -s * 0.38, bw * 0.45, pose * 0.8 + 0.2);
    }
  } else if (body === 'winged') {
    g.fillStyle = c1;
    const flap = frame ? 0.3 : -0.1;
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, -s * 0.6); g.quadraticCurveTo(sx * s * 0.6, -s * (1.1 + flap), sx * s * 0.75, -s * (0.5 + flap)); g.quadraticCurveTo(sx * s * 0.4, -s * 0.55, sx * s * 0.5, -s * 0.3); g.quadraticCurveTo(sx * s * 0.25, -s * 0.45, 0, -s * 0.4); g.fill(); }
    g.fillStyle = shade(c1, 0.7); g.beginPath(); g.ellipse(0, -s * 0.5, s * 0.14, s * 0.25, 0, 0, TAU); g.fill();
    if (extra === 'tail') { g.strokeStyle = c1; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(0, -s * 0.28); g.quadraticCurveTo(s * 0.2, -s * 0.05, -s * 0.1, 0); g.stroke(); }
    g.fillStyle = extra === 'owl' ? '#5a5a50' : shade(c1, 0.8); g.beginPath(); g.arc(0, -s * 0.78, s * 0.12, 0, TAU); g.fill();
    if (extra === 'beak' || extra === 'owl') { g.fillStyle = c2; g.beginPath(); g.moveTo(-s * 0.03, -s * 0.76); g.lineTo(s * 0.03, -s * 0.76); g.lineTo(0, -s * 0.64); g.fill(); }
    if (extra === 'horns') { g.fillStyle = c2; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * s * 0.06, -s * 0.86); g.lineTo(sx * s * 0.16, -s * 1.02); g.lineTo(sx * s * 0.1, -s * 0.84); g.fill(); } }
    if (eyes) eyeDots(0, -s * 0.8, s * (extra === 'owl' ? 0.045 : 0.025), Math.min(eyes, 2));
  } else if (body === 'spider') {
    g.strokeStyle = c1; g.lineWidth = s * 0.025;
    for (let i = 0; i < 8; i++) { const sx = i < 4 ? -1 : 1, k = i % 4; g.beginPath(); g.moveTo(0, -s * 0.35); g.quadraticCurveTo(sx * s * (0.3 + k * 0.08), -s * (0.75 - k * 0.08) + (frame && k % 2 ? 4 : 0), sx * s * (0.45 + k * 0.05), 0); g.stroke(); }
    g.fillStyle = c1; g.beginPath(); g.arc(0, -s * 0.35, s * 0.2, 0, TAU); g.fill();
    face(g, 0, -s * 0.35, s * 0.32, c2, '#1a1a14', r, pose);
    if (extra === 'tears') { g.fillStyle = '#d8e8f0'; g.fillRect(-s * 0.06, -s * 0.36, s * 0.015, s * 0.1); g.fillRect(s * 0.045, -s * 0.36, s * 0.015, s * 0.12); }
  } else if (body === 'eye') {
    if (extra === 'basket') { g.strokeStyle = '#8a7a5a'; g.lineWidth = s * 0.01; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * s * 0.25, -s * 0.5); g.lineTo(sx * s * 0.08, -s * 0.12); g.stroke(); } g.fillStyle = '#6a5a3a'; g.fillRect(-s * 0.1, -s * 0.14, s * 0.2, s * 0.1); }
    g.fillStyle = c1; g.beginPath(); g.arc(0, -s * 0.72, s * 0.3, 0, TAU); g.fill();
    g.fillStyle = c2; g.beginPath(); g.arc(0, -s * 0.7, s * 0.16, 0, TAU); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(0, -s * 0.7, s * 0.07 + pose * s * 0.05, 0, TAU); g.fill();
    g.strokeStyle = '#1a1a14'; g.lineWidth = s * 0.012; for (let i = 0; i < 14; i++) { const a = Math.PI + (i / 13) * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.3, -s * 0.72 + Math.sin(a) * s * 0.3); g.lineTo(Math.cos(a) * s * 0.4, -s * 0.72 + Math.sin(a) * s * 0.42); g.stroke(); }
  } else if (body === 'mask') {
    g.fillStyle = c1; g.beginPath(); g.ellipse(0, -s * 0.5, s * 0.3, s * 0.42, 0, 0, TAU); g.fill();
    g.fillStyle = c2; g.beginPath(); g.ellipse(-s * 0.18, -s * 0.36, s * 0.07, s * 0.05, 0, 0, TAU); g.ellipse(s * 0.18, -s * 0.36, s * 0.07, s * 0.05, 0, 0, TAU); g.fill();
    g.fillStyle = '#0a0606'; g.beginPath(); g.ellipse(-s * 0.12, -s * 0.6, s * 0.06, s * 0.04, 0, 0, TAU); g.ellipse(s * 0.12, -s * 0.6, s * 0.06, s * 0.04, 0, 0, TAU); g.fill();
    g.strokeStyle = '#0a0606'; g.lineWidth = s * 0.03; g.beginPath(); g.arc(0, -s * 0.38, s * 0.16, 0.15, Math.PI - 0.15); g.stroke();
    g.fillStyle = c2; g.beginPath(); g.moveTo(0, -s * 0.55); g.lineTo(s * 0.05, -s * 0.42); g.lineTo(-s * 0.05, -s * 0.42); g.fill();
    g.fillStyle = '#2a1a2a'; g.fillRect(-s * 0.18, -s * 0.1, s * 0.36, s * 0.1);
  } else if (body === 'serpent') {
    g.strokeStyle = c1; g.lineWidth = s * 0.12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * 0.3, 0); g.bezierCurveTo(s * 0.4, -s * 0.1, -s * 0.4, -s * 0.4, s * 0.1, -s * (0.6 + (frame ? 0.04 : 0))); g.stroke();
    g.strokeStyle = c2; g.lineWidth = s * 0.03; g.setLineDash([s * 0.04, s * 0.05]); g.stroke(); g.setLineDash([]);
    g.fillStyle = c1; g.beginPath(); g.ellipse(s * 0.12, -s * 0.66, s * 0.11, s * 0.08, -0.3, 0, TAU); g.fill();
    if (eyes) eyeDots(s * 0.14, -s * 0.69, s * 0.02, 2);
    g.strokeStyle = '#c81010'; g.lineWidth = s * 0.012; g.beginPath(); g.moveTo(s * 0.22, -s * 0.66); g.lineTo(s * 0.3, -s * 0.62); g.moveTo(s * 0.3, -s * 0.62); g.lineTo(s * 0.34, -s * 0.66); g.moveTo(s * 0.3, -s * 0.62); g.lineTo(s * 0.34, -s * 0.6); g.stroke();
  } else if (body === 'cage') {
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = s * 0.012;
    g.strokeRect(-s * 0.35, -s * 1.05, s * 0.7, s * 1.0);
    g.fillStyle = c1; g.beginPath(); g.moveTo(-s * 0.25, -s * 0.05); g.lineTo(-s * 0.2, -s * 0.6); g.quadraticCurveTo(0, -s * 0.72, s * 0.2, -s * 0.6); g.lineTo(s * 0.25, -s * 0.05); g.fill();
    g.fillStyle = '#e8d0a0'; g.fillRect(-s * 0.04, -s * 0.62, s * 0.08, s * 0.2);
    g.fillStyle = '#d8b090'; g.beginPath(); g.ellipse(0, -s * 0.78, s * 0.1, s * 0.13, 0, 0, TAU); g.fill();
    mouth(0, -s * 0.73, s * 0.06, 1);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(-s * 0.09, -s * 0.85, s * 0.18, s * 0.04);
    // vertical smear
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 10; i++) g.fillRect(-s * 0.3 + i * s * 0.06, -s * 1.0, s * 0.02, s * 0.95);
  }
  g.restore();
}

function toTex(c) { return new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer); }

// Wall textures: 0 plain panel (64px), 1 framed painting and 2 empty frame (128px, so the
// painting stays readable up close). Each one is { T, d } with d a T*T pixel array.
export function wallTextures(level, idx) {
  const r = rng(idx * 101 + 3);
  const base = (T) => {
    const c = cv(T, T), g = c.getContext('2d'), k = T / 64;
    g.fillStyle = level.pal.wall; g.fillRect(0, 0, T, T);
    // damask-like pattern
    g.fillStyle = level.pal.wall2;
    for (let y = 0; y < T; y += 16 * k) for (let x = (y / (16 * k)) % 2 ? 8 * k : 0; x < T; x += 16 * k) { g.beginPath(); g.ellipse(x + 4 * k, y + 8 * k, 3 * k, 5 * k, 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 52 * k, T, 12 * k);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 50 * k, T, 2 * k);
    for (let i = 0; i < 160 * k; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.2})`; g.fillRect(r() * T, r() * T, k, (1 + r() * 3) * k); }
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(30,0,0,.18)'; g.fillRect(r() * T, r() * 30 * k, (2 + r() * 3) * k, (10 + r() * 30) * k); }
    return { c, g };
  };
  // big gilt frame with a brass plaque under it
  const frame = (g) => {
    g.fillStyle = '#3a2808'; g.fillRect(8, 6, 112, 86);
    g.fillStyle = '#c8a040'; g.fillRect(11, 9, 106, 80);
    g.fillStyle = '#8a6a20'; g.fillRect(15, 13, 98, 72);
    g.fillStyle = '#e8c860'; g.fillRect(11, 9, 106, 2);
    g.fillStyle = '#2a1c08'; g.fillRect(46, 95, 36, 11);
    g.fillStyle = '#d8b450'; g.fillRect(47, 96, 34, 9);
    g.fillStyle = '#5a4010'; for (let i = 0; i < 3; i++) g.fillRect(51, 98 + i * 2.4, i === 0 ? 26 : 18 + i * 3, 1);
  };
  const plain = base(64);
  const framed = base(128);
  frame(framed.g);
  framed.g.drawImage(paintingArt(level, idx, 320, 240), 17, 15, 94, 68);
  // the engine brightens walls ~1.9x: pre-darken the canvas so its colours survive
  framed.g.fillStyle = 'rgba(0,0,0,.4)'; framed.g.fillRect(17, 15, 94, 68);
  framed.g.fillStyle = 'rgba(255,240,200,.08)'; framed.g.fillRect(17, 15, 94, 14);
  const empty = base(128);
  frame(empty.g);
  empty.g.fillStyle = '#050303'; empty.g.fillRect(17, 15, 94, 68);
  empty.g.strokeStyle = 'rgba(200,0,0,.6)'; empty.g.lineWidth = 1.5; for (let i = 0; i < 9; i++) { empty.g.beginPath(); empty.g.moveTo(19 + r() * 90, 17 + r() * 64); empty.g.lineTo(19 + r() * 90, 17 + r() * 64); empty.g.stroke(); }
  // the masterpiece: two cells wide, a heavy carved frame, red velvet drapes, a big plaque
  const mp = cv(256, 128), mg = mp.getContext('2d');
  for (const x of [0, 128]) mg.drawImage(base(128).c, x, 0);
  const drape = (x, d) => { const gr = mg.createLinearGradient(x, 0, x + 34 * d, 0); gr.addColorStop(0, '#3a0408'); gr.addColorStop(0.5, '#9a1420'); gr.addColorStop(1, '#2a0206'); mg.fillStyle = gr; mg.beginPath(); mg.moveTo(x, 0); mg.lineTo(x + 40 * d, 0); mg.quadraticCurveTo(x + 22 * d, 60, x + 12 * d, 128); mg.lineTo(x, 128); mg.fill(); mg.fillStyle = '#d8a840'; mg.fillRect(x + (d > 0 ? 6 : -14), 58, 8, 4); };
  drape(0, 1); drape(256, -1);
  mg.fillStyle = '#2a1c06'; mg.fillRect(42, 2, 172, 112);
  const fr = mg.createLinearGradient(42, 0, 214, 0); fr.addColorStop(0, '#8a6418'); fr.addColorStop(0.3, '#f0cc60'); fr.addColorStop(0.6, '#a87c20'); fr.addColorStop(1, '#e0b850');
  mg.fillStyle = fr; mg.fillRect(45, 5, 166, 106);
  mg.fillStyle = '#5a4010'; for (let i = 0; i < 20; i++) { mg.beginPath(); mg.arc(50 + i * 8.2, 8, 1.6, 0, TAU); mg.arc(50 + i * 8.2, 108, 1.6, 0, TAU); mg.fill(); }
  mg.fillStyle = '#3a2808'; mg.fillRect(54, 13, 148, 90);
  mg.drawImage(paintingArt(level, idx, 480, 360), 56, 15, 144, 86);
  mg.fillStyle = 'rgba(0,0,0,.3)'; mg.fillRect(56, 15, 144, 86);
  mg.fillStyle = '#2a1c08'; mg.fillRect(96, 113, 64, 13); mg.fillStyle = '#e0bc58'; mg.fillRect(97, 114, 62, 11);
  mg.fillStyle = '#5a4010'; mg.fillRect(104, 117, 48, 1.5); mg.fillRect(110, 121, 36, 1.2);
  const half = (x) => { const c = cv(128, 128); c.getContext('2d').drawImage(mp, x, 0, 128, 128, 0, 0, 128, 128); return { T: 128, d: toTex(c) }; };
  return [{ T: 64, d: toTex(plain.c) }, { T: 128, d: toTex(framed.c) }, { T: 128, d: toTex(empty.c) }, half(0), half(128)];
}

export function floorTexture(level, idx, kind = 'parquet') {
  const T = 64, c = cv(T, T), g = c.getContext('2d'), r = rng(idx * 17 + 5);
  if (kind === 'carpet') { // a worn red runner with a damask pattern
    g.fillStyle = '#4a0c10'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#5e1418'; for (let y = 0; y < T; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < T; x += 16) { g.beginPath(); g.moveTo(x + 4, y + 2); g.lineTo(x + 8, y + 8); g.lineTo(x + 4, y + 14); g.lineTo(x, y + 8); g.fill(); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(r() * T, r() * T, 1, 1); }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(20,0,0,.35)'; g.beginPath(); g.arc(r() * T, r() * T, 2 + r() * 5, 0, TAU); g.fill(); }
    return toTex(c);
  }
  g.fillStyle = level.pal.floor; g.fillRect(0, 0, T, T);
  g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 31, 31); g.strokeRect(32.5, 32.5, 31, 31);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(80,0,0,.25)'; g.beginPath(); g.arc(r() * T, r() * T, 1 + r() * 4, 0, TAU); g.fill(); }
  return toTex(c);
}
