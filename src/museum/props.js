// Furniture of the haunted museum: drawn once per level, shown as billboards.
// 96x96 sprites, feet on the bottom edge.
const S = 96, TAU = Math.PI * 2;
const cv = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const tint = (hex, k) => { const [r, g, b] = rgb(hex); const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
const lin = (g, x0, y0, x1, y1, ...st) => { const gr = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => gr.addColorStop(i / (st.length - 1), c)); return gr; };
const box = (g, x, y, w, h, base) => { g.fillStyle = lin(g, x, 0, x + w, 0, tint(base, 1.35), base, tint(base, 0.45)); g.fillRect(x, y, w, h); };
const ball = (g, x, y, r, base) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, tint(base, 1.5)); gr.addColorStop(1, tint(base, 0.45)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };

const DRAW = {
  // a marble bust on a plinth, its face cracked open
  bust(g, pal) {
    box(g, 34, 44, 28, 52, '#b8b0a4'); box(g, 30, 40, 36, 6, '#d0c8bc'); box(g, 30, 90, 36, 6, '#a8a094');
    g.fillStyle = lin(g, 30, 0, 66, 0, '#e8e2d8', '#b8b0a4', '#78706a'); g.beginPath(); g.moveTo(28, 40); g.quadraticCurveTo(48, 20, 68, 40); g.closePath(); g.fill();
    ball(g, 48, 16, 11, '#d8d2c6');
    g.fillStyle = '#1a0a08'; g.beginPath(); g.ellipse(44, 15, 2.5, 3, 0, 0, TAU); g.ellipse(52, 15, 2.5, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = '#2a1410'; g.lineWidth = 1; g.beginPath(); g.moveTo(50, 6); g.lineTo(47, 14); g.lineTo(51, 20); g.lineTo(48, 30); g.stroke();
    g.fillStyle = pal.accent; g.fillRect(44, 17, 1.4, 8); g.fillRect(52, 17, 1.4, 11);
  },
  // a long red velvet bench
  bench(g) {
    g.fillStyle = '#2a1408'; for (const x of [12, 80]) g.fillRect(x, 70, 5, 26);
    g.fillStyle = lin(g, 0, 58, 0, 74, '#c8303a', '#7a1018', '#3a0408'); g.beginPath(); g.roundRect(6, 58, 84, 16, 5); g.fill();
    g.fillStyle = 'rgba(255,200,200,.18)'; g.fillRect(10, 60, 76, 2);
    g.fillStyle = '#d8a840'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(16 + i * 13, 66, 1.4, 0, TAU); g.fill(); }
  },
  // a brass candelabra, three candles burning: the only warm light in the hall
  candles(g) {
    box(g, 45, 40, 6, 54, '#b08a3a'); g.fillStyle = '#8a6a2a'; g.beginPath(); g.ellipse(48, 94, 14, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = '#c8a040'; g.lineWidth = 3; g.beginPath(); g.moveTo(30, 34); g.quadraticCurveTo(30, 46, 48, 46); g.quadraticCurveTo(66, 46, 66, 34); g.stroke();
    for (const [x, top] of [[30, 22], [48, 16], [66, 22]]) {
      g.fillStyle = '#f0e8d0'; g.fillRect(x - 2.5, top, 5, (x === 48 ? 30 : 12));
      g.fillStyle = 'rgba(255,170,60,.35)'; g.beginPath(); g.arc(x, top - 6, 8, 0, TAU); g.fill();
      g.fillStyle = '#ffb040'; g.beginPath(); g.ellipse(x, top - 5, 2.8, 5.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff8e0'; g.beginPath(); g.ellipse(x, top - 3, 1.3, 2.6, 0, 0, TAU); g.fill();
    }
  },
  // brass post with a red rope: keep your distance from the masterpiece
  rope(g) {
    box(g, 44, 34, 8, 60, '#c8a040'); ball(g, 48, 32, 6, '#e0b850'); g.fillStyle = '#8a6a2a'; g.beginPath(); g.ellipse(48, 94, 12, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = '#a01020'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(24, 66, 48, 40); g.quadraticCurveTo(72, 66, 96, 40); g.stroke();
  },
  // an easel with an unfinished canvas the paint has run off
  easel(g, pal) {
    g.strokeStyle = '#5a3a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(48, 6); g.lineTo(24, 96); g.moveTo(48, 6); g.lineTo(72, 96); g.moveTo(48, 6); g.lineTo(54, 96); g.stroke();
    g.fillStyle = '#e8e0cc'; g.fillRect(26, 18, 44, 40); g.fillStyle = '#3a2a1a'; g.fillRect(22, 58, 52, 4);
    g.fillStyle = pal.accent; for (let i = 0; i < 6; i++) g.fillRect(30 + i * 7, 22, 3, 14 + ((i * 37) % 30));
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(26, 18, 44, 6);
  },
  // an empty gilt frame fallen to the floor
  fallen(g) {
    g.save(); g.translate(48, 82); g.rotate(-0.18);
    g.fillStyle = lin(g, -40, 0, 40, 0, '#e0b850', '#8a6418', '#c8a040'); g.fillRect(-40, -22, 80, 30);
    g.fillStyle = '#0a0604'; g.fillRect(-32, -16, 64, 18);
    g.strokeStyle = 'rgba(200,0,0,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-26, -10); g.lineTo(-6, 0); g.lineTo(10, -12); g.lineTo(26, -2); g.stroke();
    g.restore();
  },
};

export const PROP_KINDS = Object.keys(DRAW);
// world size (height in cells), collision radius, self-lit
export const PROP_INFO = {
  bust: { size: 1.0, r: 0.28, lit: false }, bench: { size: 0.95, r: 0.34, lit: false }, candles: { size: 1.0, r: 0.2, lit: true },
  rope: { size: 0.75, r: 0.12, lit: false }, easel: { size: 1.05, r: 0.26, lit: false }, fallen: { size: 0.7, r: 0, lit: false },
};

export function propSprites(level) {
  const out = {};
  for (const k of PROP_KINDS) {
    const c = cv(), g = c.getContext('2d');
    DRAW[k](g, level.pal);
    out[k] = { w: S, h: S, data: new Uint32Array(g.getImageData(0, 0, S, S).data.buffer) };
  }
  return out;
}
