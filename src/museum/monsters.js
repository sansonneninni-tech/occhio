// Monster sprites for the halls. Each monster is "paint that crawled out of a painting":
// full volumes with light and shadow, a dark outline so it reads in the gloom, brush and
// craquelure texture, and wet paint dripping from its lower edges.
// 128x128 frames: 0 walk A, 1 walk B, 2 attack.
import { rng } from './art.js';

const S = 128, FOOT = 124, TAU = Math.PI * 2;
const cv = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const tint = (hex, k, a = 1) => { const [r, g, b] = rgb(hex); const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k))); return `rgba(${f(r)},${f(g)},${f(b)},${a})`; };

// fill the current path with a light from the upper left
function shade(g, base, cx, cy, rad, k0 = 1.45, k1 = 0.42) {
  const gr = g.createRadialGradient(cx - rad * 0.35, cy - rad * 0.45, rad * 0.05, cx, cy, rad * 1.15);
  gr.addColorStop(0, tint(base, k0)); gr.addColorStop(0.55, base); gr.addColorStop(1, tint(base, k1));
  g.fillStyle = gr; g.fill();
}
function ell(g, x, y, rx, ry, base, rot = 0, flat = false) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, TAU);
  if (flat) { g.fillStyle = base; g.fill(); } else shade(g, base, x, y, Math.max(rx, ry));
}
// tapered limb with a cylindrical highlight
function limb(g, x1, y1, x2, y2, w1, w2, base) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  g.beginPath();
  g.moveTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x2 + nx * w2, y2 + ny * w2);
  g.arc(x2, y2, w2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI);
  g.lineTo(x1 - nx * w1, y1 - ny * w1);
  g.arc(x1, y1, w1, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI);
  const gr = g.createLinearGradient(x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1);
  gr.addColorStop(0, tint(base, 1.4)); gr.addColorStop(0.45, base); gr.addColorStop(1, tint(base, 0.4));
  g.fillStyle = gr; g.fill();
}
function claws(g, x, y, dir, n = 3, len = 8, col = '#f0e8d0') {
  g.strokeStyle = col; g.lineWidth = 1.6; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = dir + (i - (n - 1) / 2) * 0.35; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.7, y + Math.sin(a) * len * 0.7, x + Math.cos(a + 0.5) * len, y + Math.sin(a + 0.5) * len); g.stroke(); }
}
function eyes(g, x, y, gap, rad, n = 2) {
  for (let i = 0; i < n; i++) {
    const ex = x + (n === 1 ? 0 : (i / (n - 1) - 0.5) * gap);
    ell(g, ex, y, rad * 1.5, rad * 1.25, '#120606', 0, true);
    const gr = g.createRadialGradient(ex, y, 0, ex, y, rad * 1.4);
    gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.35, '#ff2a1a'); gr.addColorStop(1, 'rgba(200,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(ex, y, rad * 1.4, 0, TAU); g.fill();
  }
}
function maw(g, x, y, w, open, teeth = '#f0e6cc') {
  const h = w * (0.18 + open * 0.75);
  g.beginPath(); g.ellipse(x, y, w, h, 0, 0, TAU); g.fillStyle = '#1a0303'; g.fill();
  g.beginPath(); g.ellipse(x, y + h * 0.45, w * 0.55, h * 0.35, 0, 0, TAU); g.fillStyle = '#6a0e10'; g.fill();
  g.fillStyle = teeth; const n = Math.max(4, Math.round(w / 2.2));
  for (let i = 0; i < n; i++) {
    const tx = x - w * 0.9 + (i + 0.5) * (1.8 * w / n), tw = w / n * 0.8;
    g.beginPath(); g.moveTo(tx - tw, y - h * 0.85); g.lineTo(tx + tw, y - h * 0.85); g.lineTo(tx, y - h * 0.85 + h * 0.55); g.fill();
    g.beginPath(); g.moveTo(tx - tw, y + h * 0.85); g.lineTo(tx + tw, y + h * 0.85); g.lineTo(tx, y + h * 0.85 - h * 0.5); g.fill();
  }
}
function skull(g, x, y, s, bone, open) {
  ell(g, x, y - s * 0.15, s, s * 0.95, bone);
  g.beginPath(); g.moveTo(x - s * 0.62, y + s * 0.35); g.lineTo(x + s * 0.62, y + s * 0.35); g.lineTo(x + s * 0.5, y + s * 0.8 + open * s * 0.4); g.lineTo(x - s * 0.5, y + s * 0.8 + open * s * 0.4); g.closePath(); shade(g, bone, x, y + s * 0.5, s * 0.7);
  ell(g, x - s * 0.38, y, s * 0.27, s * 0.32, '#120806', 0, true); ell(g, x + s * 0.38, y, s * 0.27, s * 0.32, '#120806', 0, true);
  g.fillStyle = '#120806'; g.beginPath(); g.moveTo(x, y + s * 0.18); g.lineTo(x - s * 0.12, y + s * 0.42); g.lineTo(x + s * 0.12, y + s * 0.42); g.fill();
  g.fillStyle = '#120806'; g.fillRect(x - s * 0.45, y + s * 0.5, s * 0.9, s * 0.08 + open * s * 0.35);
  g.strokeStyle = tint(bone, 0.5); g.lineWidth = 1;
  for (let i = 0; i < 6; i++) { const tx = x - s * 0.42 + i * s * 0.17; g.beginPath(); g.moveTo(tx, y + s * 0.42); g.lineTo(tx, y + s * 0.62 + open * s * 0.35); g.stroke(); }
}

// ---------- bodies ----------
const BODY = {
  humanoid(g, m, f, r, pose) {
    const { c1, c2, extra } = m, sw = f === 1 ? 1 : f === 0 ? -1 : 0;
    const lean = pose * 4;
    if (extra === 'shroud' || extra === 'hood') { // a cloak hides the legs
      g.beginPath(); g.moveTo(-20, -84); g.quadraticCurveTo(-34, -30, -30 + sw * 3, 0); for (let i = 0; i <= 6; i++) g.lineTo(-30 + i * 10 + sw * 2, i % 2 ? -6 : 0); g.quadraticCurveTo(34, -30, 20, -84); g.closePath(); shade(g, c2, 0, -40, 50);
    } else {
      for (const s of [-1, 1]) { const k = s * sw; limb(g, s * 9, -50, s * 13 + k * 5, -25, 8, 5.5, tint(c1, 0.85)); limb(g, s * 13 + k * 5, -25, s * 11 - k * 4, -3, 5.5, 3.5, tint(c1, 0.8)); ell(g, s * 13 - k * 4, -2, 6, 2.5, tint(c1, 0.6)); }
    }
    // torso, hunched forward
    g.beginPath(); g.moveTo(-19 + lean, -88); g.bezierCurveTo(-26, -70, -16, -56, -11, -46); g.lineTo(11, -46); g.bezierCurveTo(16, -56, 26, -70, 19 + lean, -88); g.quadraticCurveTo(0, -94, -19 + lean, -88); shade(g, extra === 'drowned' ? '#8a9a88' : c1, -4, -72, 26);
    if (extra !== 'shroud' && extra !== 'hood') { g.strokeStyle = tint(c1, 0.5, 0.8); g.lineWidth = 1.3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-14 + i * 0.5, -80 + i * 7); g.quadraticCurveTo(0, -76 + i * 7, 14 - i * 0.5, -80 + i * 7); g.stroke(); } }
    else { g.beginPath(); g.moveTo(-22, -86); g.quadraticCurveTo(0, -60, 22, -86); g.strokeStyle = tint(c2, 0.5); g.lineWidth = 2; g.stroke(); }
    ell(g, -2, -64, 22, 6, c2 === '#1a1a1a' ? '#2a2a2a' : tint(c2, 0.9, 0.5), 0, true);
    // arms: too long, reaching
    const reach = 32 + pose * 10, hy = -40 - pose * 34;
    for (const s of [-1, 1]) { const ex = s * (28 + pose * 4), ey = -66 - pose * 8; limb(g, s * 17, -84, ex, ey, 6, 4.5, c1); limb(g, ex, ey, s * reach, hy, 4.5, 3.2, tint(c1, 0.95)); claws(g, s * reach, hy, s > 0 ? 0.6 : Math.PI - 0.6 - 1, 3, 9); }
    // weapon
    if (extra === 'scythe' || extra === 'blade') { g.strokeStyle = '#3a2614'; g.lineWidth = 3; g.beginPath(); g.moveTo(reach, hy + 26); g.lineTo(reach + 4, hy - 46); g.stroke(); g.beginPath(); g.moveTo(reach + 4, hy - 46); g.quadraticCurveTo(reach - 24, hy - 58, extra === 'scythe' ? reach - 40 : reach - 6, hy - 30); g.lineTo(reach - 2, hy - 44); g.fillStyle = '#d8dce0'; g.fill(); }
    // head
    const hx = lean * 0.8, hyy = -102 + pose * 2;
    limb(g, 0, -88, hx, hyy + 8, 5, 5, tint(c1, 0.8));
    if (extra === 'longhair' || extra === 'wild' || extra === 'hair') { // hair behind the face
      g.strokeStyle = extra === 'longhair' ? '#e84a2a' : extra === 'wild' ? '#d8d0c0' : c2; g.lineWidth = 1.6;
      for (let i = 0; i < 26; i++) { const t = i / 25 - 0.5; g.beginPath(); g.moveTo(hx + t * 20, hyy - 14); g.bezierCurveTo(hx + t * 46, hyy - 6, hx + t * 40 + (r() - 0.5) * 10, hyy + 20, hx + t * 34, hyy + (extra === 'longhair' ? 56 : extra === 'wild' ? 14 : 26)); g.stroke(); }
    }
    ell(g, hx, hyy, 12.5, 15, extra === 'drowned' ? '#a8b8a8' : c1);
    ell(g, hx - 5, hyy - 2, 4.2, 5, '#140606', 0, true); ell(g, hx + 5, hyy - 2, 4.2, 5, '#140606', 0, true);
    eyes(g, hx, hyy - 2, 10, 1.8, Math.max(1, m.eyes || 2));
    maw(g, hx, hyy + 8, 5.5, pose);
    if (extra === 'beard') { g.beginPath(); g.moveTo(hx - 11, hyy + 2); g.quadraticCurveTo(hx - 12, hyy + 30, hx, hyy + 34); g.quadraticCurveTo(hx + 12, hyy + 30, hx + 11, hyy + 2); g.quadraticCurveTo(hx + 6, hyy + 16, hx, hyy + 16 + pose * 4); g.quadraticCurveTo(hx - 6, hyy + 16, hx - 11, hyy + 2); shade(g, '#e8e0d0', hx, hyy + 18, 18); maw(g, hx, hyy + 10, 5, pose); }
    if (extra === 'horns') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * 7, hyy - 10); g.quadraticCurveTo(hx + s * 22, hyy - 22, hx + s * 16, hyy - 34); g.lineTo(hx + s * 3, hyy - 13); g.closePath(); shade(g, c2, hx + s * 12, hyy - 20, 12); }
    if (extra === 'hood' || extra === 'shroud') { g.beginPath(); g.moveTo(hx - 17, hyy + 14); g.quadraticCurveTo(hx - 20, hyy - 26, hx, hyy - 24); g.quadraticCurveTo(hx + 20, hyy - 26, hx + 17, hyy + 14); g.quadraticCurveTo(hx + 9, hyy - 6, hx, hyy - 8); g.quadraticCurveTo(hx - 9, hyy - 6, hx - 17, hyy + 14); shade(g, c2, hx, hyy - 8, 22); }
    if (extra === 'turban') { ell(g, hx, hyy - 14, 16, 8, c2); ell(g, hx, hyy - 19, 9, 5, tint(c2, 1.2)); }
    if (extra === 'twin') { ell(g, hx + 20, hyy + 6, 10, 12, tint(c2, 1.1)); ell(g, hx + 17, hyy + 4, 2, 2, '#140606', 0, true); ell(g, hx + 23, hyy + 4, 2, 2, '#140606', 0, true); maw(g, hx + 20, hyy + 12, 3.5, 1 - pose); }
    if (extra === 'drowned') { g.strokeStyle = '#3a5a3a'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-12 + i * 5, -84); g.quadraticCurveTo(-14 + i * 5, -60, -10 + i * 5 + sw * 2, -38); g.stroke(); } }
  },
  skeleton(g, m, f, r, pose) {
    const { c1, c2, extra } = m, bone = c1, sw = f === 1 ? 1 : f === 0 ? -1 : 0;
    if (extra === 'shroud') { g.beginPath(); g.moveTo(-18, -92); g.quadraticCurveTo(-36, -40, -28, 0); for (let i = 0; i <= 7; i++) g.lineTo(-28 + i * 8 + sw * 2, i % 2 ? -10 : 0); g.quadraticCurveTo(36, -40, 18, -92); g.closePath(); shade(g, tint(c2, 0.5), 0, -40, 50); }
    for (const s of [-1, 1]) { const k = s * sw; limb(g, s * 8, -50, s * 11 + k * 5, -26, 3, 2.5, bone); ell(g, s * 11 + k * 5, -26, 3.6, 3.6, bone); limb(g, s * 11 + k * 5, -26, s * 10 - k * 4, -3, 2.5, 2, bone); ell(g, s * 12 - k * 4, -2, 5, 2, bone); }
    // pelvis + spine
    g.beginPath(); g.moveTo(-14, -54); g.quadraticCurveTo(0, -44, 14, -54); g.lineTo(9, -46); g.quadraticCurveTo(0, -40, -9, -46); g.closePath(); shade(g, bone, 0, -50, 14);
    for (let i = 0; i < 6; i++) ell(g, 0, -58 - i * 5, 3, 2.4, tint(bone, 0.9));
    // ribcage
    for (let i = 0; i < 5; i++) { const y = -84 + i * 6, w = 15 - i * 1.4; g.beginPath(); g.moveTo(-1, y); g.bezierCurveTo(-w - 4, y - 2, -w, y + 6, -3, y + 7); g.moveTo(1, y); g.bezierCurveTo(w + 4, y - 2, w, y + 6, 3, y + 7); g.strokeStyle = bone; g.lineWidth = 2.6; g.stroke(); }
    ell(g, 0, -88, 17, 4, tint(bone, 0.85));
    const reach = 30 + pose * 10, hy = -44 - pose * 32;
    for (const s of [-1, 1]) { const ex = s * 26, ey = -68 - pose * 8; limb(g, s * 15, -87, ex, ey, 2.8, 2.4, bone); ell(g, ex, ey, 3.2, 3.2, bone); limb(g, ex, ey, s * reach, hy, 2.4, 2, bone); claws(g, s * reach, hy, s > 0 ? 0.5 : Math.PI - 1.5, 4, 7, bone); }
    if (extra === 'scythe') { g.strokeStyle = '#3a2614'; g.lineWidth = 3; g.beginPath(); g.moveTo(reach, hy + 30); g.lineTo(reach + 3, hy - 50); g.stroke(); g.beginPath(); g.moveTo(reach + 3, hy - 50); g.quadraticCurveTo(reach - 26, hy - 62, reach - 44, hy - 34); g.lineTo(reach - 2, hy - 47); g.fillStyle = '#d8dce0'; g.fill(); }
    if (extra === 'fiddle') { g.save(); g.translate(-24, -78); g.rotate(-0.6); ell(g, 0, 0, 8, 12, '#7a3a14'); ell(g, 0, -4, 6, 5, '#7a3a14'); g.fillStyle = '#2a1408'; g.fillRect(-1.5, -26, 3, 18); g.restore(); g.strokeStyle = '#d8c8a0'; g.lineWidth = 1; g.beginPath(); g.moveTo(-40, -60 - pose * 10); g.lineTo(10, -96 + pose * 10); g.stroke(); }
    skull(g, pose * 2, -104, 12, bone, pose);
    eyes(g, pose * 2 + 0, -104, 9, 1.6, extra === 'shroud' ? 0 : 2);
    if (extra === 'hat') { g.fillStyle = '#1a1a1a'; g.fillRect(-12, -138, 24, 22); ell(g, 0, -116, 19, 4, '#1a1a1a', 0, true); g.fillStyle = c2; g.fillRect(-12, -122, 24, 4); }
    if (extra === 'shroud') { g.beginPath(); g.moveTo(-18, -94); g.quadraticCurveTo(0, -136, 18, -94); g.quadraticCurveTo(10, -112, 0, -114); g.quadraticCurveTo(-10, -112, -18, -94); shade(g, tint(c2, 0.5), 0, -110, 20); }
    if (extra === 'hair') { g.strokeStyle = '#c8a050'; g.lineWidth = 1.2; for (let i = 0; i < 16; i++) { const t = i / 15 - 0.5; g.beginPath(); g.moveTo(t * 20, -116); g.quadraticCurveTo(t * 40, -96, t * 34, -70); g.stroke(); } }
  },
  head(g, m, f, r, pose) {
    const { c1, c2, extra } = m, bob = f === 1 ? -2 : 0, y = -70 + bob, R = extra === 'oval' ? 30 : 36;
    if (extra === 'halo') { const gr = g.createRadialGradient(0, y, R * 0.6, 0, y, R * 1.6); gr.addColorStop(0, 'rgba(255,220,120,.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, y, R * 1.6, 0, TAU); g.fill(); g.strokeStyle = '#ffd060'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * R * 1.1, y + Math.sin(a) * R * 1.1); g.lineTo(Math.cos(a) * R * 1.55, y + Math.sin(a) * R * 1.55); g.stroke(); } }
    if (extra === 'snakes') for (let i = 0; i < 14; i++) { const a = -Math.PI * 1.05 + (i / 13) * Math.PI * 1.1, w = (f === 1 ? 4 : -4) * (i % 2 ? 1 : -1); const x0 = Math.cos(a) * R * 0.7, y0 = y + Math.sin(a) * R * 0.8, x1 = Math.cos(a) * R * 1.55 + w, y1 = y + Math.sin(a) * R * 1.45; g.strokeStyle = tint(c2, 0.5); g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(Math.cos(a + 0.4) * R * 1.2, y + Math.sin(a + 0.4) * R * 1.2, x1, y1); g.stroke(); g.strokeStyle = c2; g.lineWidth = 3.5; g.stroke(); ell(g, x1, y1, 4, 3, c2, a); ell(g, x1 + Math.cos(a) * 2, y1 + Math.sin(a) * 2, 1, 1, '#ff2a1a', 0, true); }
    // neck stump: veins and paint dripping
    g.beginPath(); g.moveTo(-12, y + R * 0.75); g.lineTo(12, y + R * 0.75); g.lineTo(9, y + R + 8); g.quadraticCurveTo(0, y + R + 12, -9, y + R + 8); g.closePath(); shade(g, tint(c1, 0.8), 0, y + R, 14);
    ell(g, 0, y + R + 8, 9, 3.5, '#7a0a0a', 0, true);
    g.strokeStyle = '#6a0a0a'; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6 + i * 4, y + R + 9); g.quadraticCurveTo(-8 + i * 5 + (f ? 2 : -2), y + R + 20, -6 + i * 4, y + R + 26 + i * 3); g.stroke(); }
    // skull
    g.beginPath(); g.ellipse(0, y, R * (extra === 'oval' ? 0.72 : 0.9), R, 0, 0, TAU); shade(g, c1, 0, y, R);
    g.strokeStyle = tint(c1, 0.6, 0.7); g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-R * 0.5, y - R * 0.55 + i * 4); g.quadraticCurveTo(0, y - R * 0.62 + i * 4, R * 0.5, y - R * 0.55 + i * 4); g.stroke(); }
    if (extra === 'blood') { g.fillStyle = c2; for (let i = 0; i < 7; i++) g.fillRect(-R * 0.6 + i * R * 0.2, y + R * 0.4, 2.5, 8 + r() * 14); }
    if (extra === 'oval') { for (const s of [-1, 1]) { limb(g, s * R * 1.0, y + R * 1.5, s * R * 0.78, y + R * 0.15, 5, 4.5, tint(c1, 0.7)); ell(g, s * R * 0.74, y, 6, 11, tint(c1, 0.8)); } }
    if (extra === 'nested') { for (const [x, yy, s] of [[-R * 0.36, y - R * 0.12, R * 0.3], [R * 0.36, y - R * 0.12, R * 0.3], [0, y + R * 0.45, R * 0.34]]) { ell(g, x, yy, s, s * 1.05, '#140a06', 0, true); skull(g, x, yy - s * 0.1, s * 0.58, tint(c1, 0.95), 0.2); eyes(g, x, yy - s * 0.1, s * 0.45, 0.9, 2); } }
    else {
      const ey = y - R * 0.12, gap = R * 0.72;
      if (extra === 'closed') { g.strokeStyle = '#2a1410'; g.lineWidth = 2; g.beginPath(); g.moveTo(-gap * 0.7, ey); g.quadraticCurveTo(-gap * 0.5, ey + 4, -gap * 0.25, ey); g.moveTo(gap * 0.25, ey); g.quadraticCurveTo(gap * 0.5, ey + 4, gap * 0.7, ey); g.stroke(); }
      else { for (const s of [-1, 1]) { ell(g, s * gap * 0.5, ey, R * 0.2, R * 0.17, '#f4ecd8', 0, true); ell(g, s * gap * 0.5, ey, R * 0.1, R * 0.1, extra === 'snakes' ? '#5a7a2a' : '#3a2010', 0, true); ell(g, s * gap * 0.5, ey, R * 0.045, R * 0.045, '#000', 0, true); g.strokeStyle = tint(c1, 0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(s * gap * 0.2, ey - R * 0.25 - pose * 3); g.lineTo(s * gap * 0.8, ey - R * 0.32 + pose * 2); g.stroke(); } if ((m.eyes || 0) > 2) eyes(g, 0, ey - R * 0.4, 0, 2, 1); }
      g.beginPath(); g.moveTo(0, ey + 2); g.lineTo(-4, y + R * 0.25); g.lineTo(4, y + R * 0.25); g.fillStyle = tint(c1, 0.6); g.fill();
      maw(g, 0, y + R * 0.52, R * (extra === 'teeth' ? 0.62 : extra === 'oval' ? 0.2 : 0.4), Math.max(pose, extra === 'teeth' || extra === 'oval' ? 0.9 : 0.35));
    }
  },
  beast(g, m, f, r, pose) {
    const { c1, c2, extra } = m, sw = f === 1 ? 1 : f === 0 ? -1 : 0;
    if (extra === 'neck') { // Bacon's fury: a body on a pedestal, a long neck ending in a mouth with a bandage
      g.fillStyle = '#2a1c14'; g.fillRect(-26, -18, 52, 18);
      ell(g, 0, -36, 30, 20, c1);
      limb(g, 4, -46, -10 + sw * 4, -78, 9, 7, c1); limb(g, -10 + sw * 4, -78, 6, -104 - pose * 6, 7, 8, c1);
      ell(g, 6, -106 - pose * 6, 13, 11, c1);
      g.fillStyle = '#f4f0e8'; g.fillRect(-6, -116 - pose * 6, 26, 6);
      maw(g, 8, -100 - pose * 6, 10, 0.7 + pose * 0.3);
      return;
    }
    for (const s of [-1, 1]) for (const b of [0, 1]) { const k = (b ? -s : s) * sw; const lx = s * (b ? 26 : 12); limb(g, lx, -40, lx + s * 6 + k * 5, -14, 7, 5, tint(c1, b ? 0.7 : 0.85)); limb(g, lx + s * 6 + k * 5, -14, lx + s * 3 - k * 3, -2, 5, 3.5, tint(c1, 0.7)); claws(g, lx + s * 3 - k * 3, -2, s > 0 ? 0.2 : Math.PI - 0.9, 3, 6); }
    g.beginPath(); g.ellipse(0, -52, 40, 28, 0, 0, TAU); shade(g, c1, 0, -52, 40);
    // spine ridge
    for (let i = 0; i < 7; i++) { const x = -28 + i * 9; g.beginPath(); g.moveTo(x - 4, -74 + Math.abs(x) * 0.12); g.lineTo(x, -86 + Math.abs(x) * 0.18); g.lineTo(x + 4, -74 + Math.abs(x) * 0.12); g.closePath(); shade(g, c2, x, -78, 6); }
    if (extra === 'shell') { g.beginPath(); g.ellipse(4, -62, 32, 22, 0, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(26, -54); for (let i = 0; i < 6; i++) g.lineTo(26 - i * 9, i % 2 ? -50 : -58); g.closePath(); shade(g, '#f0e6d0', 4, -66, 30); g.fillStyle = '#1a0a06'; g.beginPath(); g.ellipse(10, -58, 10, 6, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,170,60,.85)'; g.beginPath(); g.arc(10, -58, 4, 0, TAU); g.fill(); }
    if (extra === 'boils') for (let i = 0; i < 12; i++) ell(g, (r() - 0.5) * 60, -40 - r() * 30, 2 + r() * 4, 2 + r() * 4, c2);
    if (extra === 'tentacles') for (let i = 0; i < 8; i++) { const a = Math.PI * (0.1 + i / 7 * 0.8), x0 = Math.cos(a) * 34, w = f === 1 ? 6 : -6; g.strokeStyle = tint(c1, 0.7); g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, -34); g.bezierCurveTo(x0 * 1.4, -20, x0 * 1.2 + w, -6, x0 * 1.7, -2); g.stroke(); g.strokeStyle = c1; g.lineWidth = 3; g.stroke(); }
    // head low and forward
    const hx = 30 + pose * 6, hy = -56 + pose * 4;
    ell(g, hx, hy, 18, 16, tint(c1, 1.05));
    if (extra === 'horns') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * 6, hy - 12); g.bezierCurveTo(hx + s * 26, hy - 30, hx + s * 4, hy - 46, hx + s * 18, hy - 50); g.lineTo(hx + s * 12, hy - 34); g.lineTo(hx, hy - 14); g.closePath(); shade(g, c2, hx + s * 12, hy - 30, 16); }
    if (extra === 'ears') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * 4, hy - 12); g.lineTo(hx + s * 16, hy - 34); g.lineTo(hx + s * 14, hy - 8); g.closePath(); shade(g, c1, hx + s * 10, hy - 20, 12); }
    eyes(g, hx + 2, hy - 4, 12, 2, Math.max(1, m.eyes || 2));
    maw(g, hx + 4, hy + 8, 10, pose * 0.8 + 0.25);
  },
  blob(g, m, f, r, pose) {
    const { c1, c2 } = m, sw = f === 1 ? 1 : -1;
    // tail
    g.beginPath(); g.moveTo(-34, -60); g.lineTo(-56, -84 + sw * 6); g.lineTo(-52, -60); g.lineTo(-56, -36 - sw * 6); g.closePath(); shade(g, c2, -48, -60, 14);
    g.beginPath(); g.ellipse(0, -60, 42, 30, 0, 0, TAU); shade(g, c1, 0, -60, 42);
    g.strokeStyle = tint(c1, 0.6, 0.7); g.lineWidth = 1; for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) { g.beginPath(); g.arc(-26 + x * 9 + (y % 2) * 4, -76 + y * 8, 4, 0, Math.PI); g.stroke(); }
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-4, -60 + s * 24); g.lineTo(-14, -60 + s * (44 + sw * 4)); g.lineTo(12, -60 + s * 26); g.closePath(); shade(g, c2, 0, -60 + s * 32, 14); }
    // little legs under the fish: it walks
    for (const s of [-1, 1]) { limb(g, s * 14, -34, s * 18 + sw * s * 4, -2, 4, 3, tint(c2, 0.8)); }
    eyes(g, 18, -68, 12, 2.4, m.eyes || 2);
    maw(g, 32, -54, 11, pose * 0.8 + 0.3);
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-6, -90); g.lineTo(-6, -122); g.stroke(); g.beginPath(); g.moveTo(-5, -120); g.lineTo(16, -108); g.lineTo(-5, -98); g.closePath(); shade(g, '#d8c8a0', 2, -110, 10);
  },
  winged(g, m, f, r, pose) {
    const { c1, c2, extra } = m, flap = f === 1 ? 18 : f === 0 ? -6 : 8;
    for (const s of [-1, 1]) {
      const tipX = s * 60, tipY = -96 - flap;
      g.beginPath(); g.moveTo(s * 6, -78);
      g.quadraticCurveTo(s * 30, -100 - flap, tipX, tipY);
      for (let i = 0; i < 4; i++) { const t = (i + 1) / 4; g.quadraticCurveTo(s * (54 - i * 12), tipY + 26 + i * 6, s * (60 - (i + 1) * 13), tipY + 24 + t * 22 - flap * 0.3 * (1 - t)); }
      g.lineTo(s * 6, -56); g.closePath(); shade(g, tint(c1, 0.8), s * 30, -80, 40, 1.3, 0.35);
      g.strokeStyle = tint(c1, 0.45); g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(s * 6, -74); g.lineTo(s * (58 - i * 13), tipY + 22 + i * 5); g.stroke(); }
    }
    g.beginPath(); g.ellipse(0, -66, 13, 24, 0, 0, TAU); shade(g, c1, 0, -66, 24);
    for (const s of [-1, 1]) { limb(g, s * 6, -46, s * 9, -24 - pose * 6, 3, 2, c2); claws(g, s * 9, -24 - pose * 6, Math.PI / 2 - s * 0.3, 3, 7); }
    if (extra === 'tail') { g.strokeStyle = c1; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -44); g.bezierCurveTo(20, -30, -20, -16, 10, -4); g.stroke(); g.beginPath(); g.moveTo(10, -4); g.lineTo(4, -10); g.lineTo(16, -10); g.fillStyle = c2; g.fill(); }
    const owl = extra === 'owl';
    ell(g, 0, -94, owl ? 15 : 10, owl ? 14 : 11, owl ? '#5a5a50' : tint(c1, 1.1));
    if (extra === 'beak' || owl) { g.beginPath(); g.moveTo(-3, -92); g.lineTo(3, -92); g.lineTo(0, -82 - pose * 2); g.closePath(); shade(g, c2, 0, -88, 6); }
    if (extra === 'horns') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 4, -102); g.quadraticCurveTo(s * 14, -112, s * 12, -122); g.lineTo(s * 8, -104); g.closePath(); shade(g, c2, s * 9, -110, 8); }
    if (owl) for (const s of [-1, 1]) { ell(g, s * 6, -96, 5.5, 5.5, '#f0e8c0', 0, true); ell(g, s * 6, -96, 2.4, 2.4, '#000', 0, true); }
    else eyes(g, 0, -96, 8, 1.6, Math.min(2, m.eyes || 2));
    if (!owl && extra !== 'beak') maw(g, 0, -88, 5, pose);
  },
  spider(g, m, f, r, pose) {
    const { c1, c2 } = m;
    for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, k = i % 4, up = (f === 1) === (k % 2 === 0) ? 6 : 0; const kx = s * (34 + k * 6), ky = -78 + k * 8 - up; limb(g, s * 10, -50, kx, ky, 3, 2.4, c1); limb(g, kx, ky, s * (44 + k * 8), -2, 2.4, 1.4, tint(c1, 0.8)); }
    g.beginPath(); g.ellipse(0, -52, 30, 26, 0, 0, TAU); shade(g, c1, 0, -52, 30);
    g.strokeStyle = tint(c1, 0.4); g.lineWidth = 1; for (let i = 0; i < 70; i++) { const a = r() * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 26, -52 + Math.sin(a) * 22); g.lineTo(Math.cos(a) * 34, -52 + Math.sin(a) * 30); g.stroke(); }
    ell(g, 0, -54, 17, 19, c2);
    ell(g, -6, -58, 3.2, 2.2, '#1a1410', 0, true); ell(g, 6, -58, 3.2, 2.2, '#1a1410', 0, true);
    g.strokeStyle = '#1a1410'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, -44 + pose * 2); g.quadraticCurveTo(0, -48 - pose * 3, 6, -44 + pose * 2); g.stroke();
    g.fillStyle = '#9ab8d0'; g.fillRect(-7, -56, 1.6, 10 + (f === 1 ? 3 : 0)); g.fillRect(5.5, -56, 1.6, 13);
  },
  eye(g, m, f, r, pose) {
    const { c1, c2 } = m, y = -86 + (f === 1 ? -3 : 0);
    g.strokeStyle = '#8a7a5a'; g.lineWidth = 1.2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 28, y + 14); g.lineTo(s * 9, -26); g.stroke(); }
    g.fillStyle = '#5a4428'; g.fillRect(-12, -28, 24, 16); g.strokeStyle = '#3a2a14'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-12, -26 + i * 4); g.lineTo(12, -26 + i * 4); g.stroke(); }
    g.beginPath(); g.arc(0, y, 36, 0, TAU); shade(g, c1, 0, y, 36, 1.2, 0.5);
    g.strokeStyle = 'rgba(170,20,20,.7)'; g.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = r() * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 34, y + Math.sin(a) * 34); g.quadraticCurveTo(Math.cos(a + 0.2) * 24, y + Math.sin(a + 0.2) * 24, Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke(); }
    const lx = pose * 4; g.beginPath(); g.arc(lx, y + 2, 18, 0, TAU); shade(g, c2, lx, y + 2, 18, 1.6, 0.4);
    ell(g, lx, y + 2, 8 + pose * 4, 8 + pose * 4, '#000', 0, true); ell(g, lx - 5, y - 4, 3, 3, 'rgba(255,255,255,.85)', 0, true);
    g.strokeStyle = '#1a1a14'; g.lineWidth = 1.5; for (let i = 0; i < 16; i++) { const a = Math.PI * 1.05 + (i / 15) * Math.PI * 0.9; g.beginPath(); g.moveTo(Math.cos(a) * 36, y + Math.sin(a) * 36); g.lineTo(Math.cos(a) * 46, y + Math.sin(a) * 48); g.stroke(); }
  },
  mask(g, m, f, r, pose) {
    const { c1, c2 } = m, sw = f === 1 ? 4 : -4;
    g.beginPath(); g.moveTo(-18, -50); g.quadraticCurveTo(-30, -20, -24 + sw, 0); g.lineTo(24 + sw, 0); g.quadraticCurveTo(30, -20, 18, -50); g.closePath(); shade(g, '#3a2a3a', 0, -30, 30);
    for (const s of [-1, 1]) { g.strokeStyle = s > 0 ? c2 : '#8ac0e8'; g.lineWidth = 3; g.beginPath(); g.moveTo(s * 20, -70); g.bezierCurveTo(s * 40, -60 + sw, s * 30, -40, s * 44, -26 - sw); g.stroke(); }
    g.beginPath(); g.ellipse(0, -80, 30, 38, 0, 0, TAU); shade(g, c1, 0, -80, 38);
    ell(g, -14, -60, 8, 5, c2); ell(g, 14, -60, 8, 5, c2);
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 12, -88, 8, 5, s * 0.3, 0, TAU); g.fillStyle = '#0a0606'; g.fill(); }
    eyes(g, 0, -88, 24, 1.6, 2);
    g.beginPath(); g.moveTo(0, -84); g.lineTo(5, -72); g.lineTo(-5, -72); g.closePath(); shade(g, c2, 0, -76, 6);
    g.beginPath(); g.moveTo(-18, -62); g.quadraticCurveTo(0, -42 + pose * 6, 18, -62); g.quadraticCurveTo(0, -52, -18, -62); g.fillStyle = '#1a0303'; g.fill();
    g.fillStyle = '#f0e6cc'; for (let i = 0; i < 8; i++) g.fillRect(-14 + i * 3.6, -58, 2.4, 3);
  },
  serpent(g, m, f, r, pose) {
    const { c1, c2 } = m, w = f === 1 ? 6 : -6;
    const pts = []; for (let i = 0; i <= 26; i++) { const t = i / 26; pts.push([Math.sin(t * 7 + (f ? 0.6 : 0)) * (26 - t * 16) + (t > 0.8 ? (t - 0.8) * 40 : 0), -6 - t * 96]); }
    for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; const rad = 11 - i * 0.22; ell(g, x, y, rad, rad * 0.85, i % 2 ? c1 : tint(c1, 0.92)); if (i % 3 === 0) ell(g, x, y, rad * 0.4, rad * 0.25, c2, 0, true); }
    const [hx, hy] = pts[pts.length - 1];
    ell(g, hx + 4, hy - 4, 14, 10, c1, -0.3);
    eyes(g, hx + 6, hy - 8, 9, 1.5, 2);
    g.fillStyle = '#f0e6cc'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + 10 + s * 3, hy + 2); g.lineTo(hx + 12 + s * 3, hy + 10 + pose * 4); g.lineTo(hx + 14 + s * 3, hy + 2); g.fill(); }
    g.strokeStyle = '#c81010'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(hx + 16, hy); g.lineTo(hx + 26 + w * 0.3, hy + 4); g.moveTo(hx + 26 + w * 0.3, hy + 4); g.lineTo(hx + 30, hy); g.moveTo(hx + 26 + w * 0.3, hy + 4); g.lineTo(hx + 30, hy + 8); g.stroke();
  },
  cage(g, m, f, r, pose) {
    const { c1, c2 } = m;
    // gold throne
    g.fillStyle = '#8a6a20'; g.fillRect(-26, -70, 6, 70); g.fillRect(20, -70, 6, 70); g.fillRect(-28, -50, 56, 6);
    ell(g, -23, -72, 5, 5, '#d8b040'); ell(g, 23, -72, 5, 5, '#d8b040');
    // robe and cape
    g.beginPath(); g.moveTo(-22, -4); g.lineTo(-18, -62); g.quadraticCurveTo(0, -74, 18, -62); g.lineTo(22, -4); g.closePath(); shade(g, c1, 0, -40, 34);
    g.beginPath(); g.moveTo(-14, -64); g.quadraticCurveTo(0, -52, 14, -64); g.lineTo(10, -74); g.quadraticCurveTo(0, -68, -10, -74); g.closePath(); shade(g, '#e8e0d0', 0, -66, 14);
    for (const s of [-1, 1]) { limb(g, s * 16, -60, s * 22, -36 - pose * 6, 4, 3.5, c1); ell(g, s * 22, -36 - pose * 6, 4, 4, '#d8b090'); }
    // screaming face smeared
    ell(g, 0, -88, 11, 14, '#d8b090');
    ell(g, 0, -100, 11, 5, c1);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(-9, -94, 18, 3);
    maw(g, 0, -80, 6, 1);
    g.save(); g.globalAlpha = 0.25; g.fillStyle = '#fff'; for (let i = 0; i < 12; i++) g.fillRect(-30 + i * 5 + (f ? 1 : 0), -120, 1.5, 116); g.restore();
    // the glass cage
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5;
    g.strokeRect(-40, -120, 80, 116); g.beginPath(); g.moveTo(-40, -4); g.lineTo(-54, 2); g.moveTo(40, -4); g.lineTo(54, 2); g.moveTo(-40, -120); g.lineTo(-52, -126); g.moveTo(40, -120); g.lineTo(52, -126); g.stroke();
    eyes(g, 0, -92, 8, 1.3, 2);
  },
};

// paint texture, ambient occlusion, drips and outline, applied to the drawn silhouette
function finish(src, mon, accent, r) {
  const g = src.getContext('2d');
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 140; i++) { // brush strokes
    const x = r() * S, y = r() * S, a = r() * Math.PI, l = 3 + r() * 7;
    g.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,.16)' : 'rgba(255,240,210,.10)'; g.lineWidth = 1 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.strokeStyle = 'rgba(20,8,4,.32)'; g.lineWidth = 0.7; // craquelure
  for (let i = 0; i < 22; i++) { let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 12; y += (r() - 0.5) * 12; g.lineTo(x, y); } g.stroke(); }
  const ao = g.createLinearGradient(0, 0, 0, S); ao.addColorStop(0, 'rgba(255,230,190,.10)'); ao.addColorStop(0.55, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = ao; g.fillRect(0, 0, S, S);
  g.restore();
  // wet paint drips from the lower edge of the silhouette
  const id = g.getImageData(0, 0, S, S).data;
  g.fillStyle = accent; g.strokeStyle = accent; g.lineCap = 'round';
  for (let x = 4; x < S - 4; x += 3) {
    if (r() > 0.32) continue;
    let y = S - 1; while (y > 0 && id[(y * S + x) * 4 + 3] < 128) y--;
    if (y <= 4 || y >= FOOT - 2) continue;
    const len = 3 + r() * 12; g.lineWidth = 1.2 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x, Math.min(FOOT, y + len)); g.stroke();
    g.beginPath(); g.arc(x, Math.min(FOOT, y + len), g.lineWidth * 0.9, 0, TAU); g.fill();
  }
  // outline
  const out = cv(), o = out.getContext('2d');
  for (const [dx, dy] of [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5], [-1, -1], [1, 1], [-1, 1], [1, -1]]) o.drawImage(src, dx, dy);
  o.globalCompositeOperation = 'source-in'; o.fillStyle = '#080404'; o.fillRect(0, 0, S, S);
  o.globalCompositeOperation = 'source-over'; o.drawImage(src, 0, 0);
  return out;
}

export function drawMonster(g, mon, frame, pose, r) {
  (BODY[mon.body] || BODY.humanoid)(g, mon, frame, r, pose);
}

export function monsterSprites(mon, idx, accent = '#ff5a1a') {
  return [0, 1, 2].map((f) => {
    const c = cv(), g = c.getContext('2d');
    const r = rng(idx * 31 + 7);
    const k = mon.body === 'head' || mon.body === 'eye' ? 1 : 1;
    g.save(); g.translate(S / 2, FOOT); g.scale(k, k);
    drawMonster(g, mon, f, f === 2 ? 1 : 0.12, r);
    g.restore();
    const done = finish(c, mon, accent, rng(idx * 57 + f));
    return { w: S, h: S, data: new Uint32Array(done.getContext('2d').getImageData(0, 0, S, S).data.buffer) };
  });
}

// a contact sheet for checking the designs
export function monsterPreview(mon, idx, accent) {
  const sp = monsterSprites(mon, idx, accent);
  const c = document.createElement('canvas'); c.width = S * 3; c.height = S;
  const g = c.getContext('2d');
  sp.forEach((s, i) => { const id = new ImageData(new Uint8ClampedArray(s.data.buffer), S, S); g.putImageData(id, i * S, 0); });
  return c;
}
