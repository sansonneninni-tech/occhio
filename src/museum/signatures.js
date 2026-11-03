// The recognisable "signature" of each painting: the composition, figures and objects
// people remember from the original. Drawn on a 320x240 grid, then scaled.
// `full` replaces the generic motif; `add` paints on top of it.
import { drawMonsterShape } from './art.js';

const TAU = Math.PI * 2;
const ell = (g, x, y, rx, ry, c, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); };
const poly = (g, c, ...pts) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
const line = (g, c, w, ...pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
const grad = (g, stops, x0 = 0, y0 = 0, x1 = 0, y1 = 240) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
const sky = (g, ...stops) => { g.fillStyle = grad(g, stops); g.fillRect(0, 0, 320, 240); };
const glow = (g, x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
// a nude/clothed person: head at (x,y), height s, tilt in radians
function person(g, x, y, s, skin, cloth = skin, tilt = 0) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  ell(g, 0, 0, s * 0.12, s * 0.14, skin);
  poly(g, cloth, -s * 0.18, s * 0.16, s * 0.18, s * 0.16, s * 0.14, s * 0.62, -s * 0.14, s * 0.62);
  line(g, cloth, s * 0.09, -s * 0.09, s * 0.62, -s * 0.12, s);
  line(g, cloth, s * 0.09, s * 0.09, s * 0.62, s * 0.12, s);
  g.restore();
}
function crowd(g, r, n, x0, x1, y0, y1, cols, s0 = 5, s1 = 9) {
  for (let i = 0; i < n; i++) { const s = s0 + r() * (s1 - s0); person(g, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), s * 2.4, cols[i % cols.length], cols[(i + 1) % cols.length], (r() - 0.5) * 0.8); }
}
function skull(g, x, y, s, c = '#e8dcc0') {
  ell(g, x, y, s, s * 1.05, c); poly(g, c, x - s * 0.6, y + s * 0.6, x + s * 0.6, y + s * 0.6, x + s * 0.45, y + s * 1.25, x - s * 0.45, y + s * 1.25);
  ell(g, x - s * 0.38, y + s * 0.1, s * 0.26, s * 0.3, '#1a1008'); ell(g, x + s * 0.38, y + s * 0.1, s * 0.26, s * 0.3, '#1a1008');
  poly(g, '#1a1008', x, y + s * 0.4, x - s * 0.1, y + s * 0.62, x + s * 0.1, y + s * 0.62);
}
function skeleton(g, x, y, s, c = '#e8dcc0', arms = [-0.6, 0.6]) {
  skull(g, x, y, s * 0.12, c);
  line(g, c, s * 0.04, x, y + s * 0.15, x, y + s * 0.6);
  for (let i = 0; i < 4; i++) line(g, c, s * 0.025, x - s * 0.13, y + s * (0.22 + i * 0.07), x + s * 0.13, y + s * (0.22 + i * 0.07));
  line(g, c, s * 0.035, x - s * 0.15, y + s * 0.2, x - s * 0.15 + Math.sin(arms[0]) * s * 0.4, y + s * 0.2 + Math.cos(arms[0]) * s * 0.4);
  line(g, c, s * 0.035, x + s * 0.15, y + s * 0.2, x + s * 0.15 + Math.sin(arms[1]) * s * 0.4, y + s * 0.2 + Math.cos(arms[1]) * s * 0.4);
  line(g, c, s * 0.035, x, y + s * 0.6, x - s * 0.14, y + s); line(g, c, s * 0.035, x, y + s * 0.6, x + s * 0.14, y + s);
}
function owl(g, x, y, s, c = '#1a1814') {
  ell(g, x, y, s * 0.5, s * 0.6, c);
  poly(g, c, x - s * 0.5, y - s * 0.1, x - s * 1.4, y - s * 0.5, x - s * 0.6, y + s * 0.3);
  poly(g, c, x + s * 0.5, y - s * 0.1, x + s * 1.4, y - s * 0.6, x + s * 0.6, y + s * 0.3);
  ell(g, x - s * 0.2, y - s * 0.2, s * 0.14, s * 0.14, '#e8e0c0'); ell(g, x + s * 0.2, y - s * 0.2, s * 0.14, s * 0.14, '#e8e0c0');
  ell(g, x - s * 0.2, y - s * 0.2, s * 0.06, s * 0.06, '#000'); ell(g, x + s * 0.2, y - s * 0.2, s * 0.06, s * 0.06, '#000');
}
function bat(g, x, y, s, c = '#0a0806') {
  g.fillStyle = c; g.beginPath(); g.moveTo(x, y);
  g.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x - s, y - s * 0.2); g.quadraticCurveTo(x - s * 0.6, y, x - s * 0.5, y + s * 0.2);
  g.quadraticCurveTo(x, y, x + s * 0.5, y + s * 0.2); g.quadraticCurveTo(x + s * 0.6, y, x + s, y - s * 0.2); g.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x, y); g.fill();
}

export const SIG = {
  // 1 · Bosch, Garden of Earthly Delights, Hell panel: tree-man, giant ears with a blade, burning city
  0: { full(g, r) {
    sky(g, '#050302', '#2a0c04', '#5a2a10', '#1a120c', '#0e0a08');
    for (let i = 0; i < 9; i++) glow(g, 20 + i * 36, 40 + r() * 20, 30, 'rgba(255,110,20,.55)');
    for (let i = 0; i < 14; i++) { const x = r() * 320, w = 8 + r() * 18, hh = 15 + r() * 30; g.fillStyle = '#080402'; g.fillRect(x, 70 - hh, w, hh); }
    // icy lake
    ell(g, 160, 205, 170, 26, '#5a6a72'); ell(g, 160, 203, 150, 20, '#7a8a90');
    // giant ears and blade
    ell(g, 66, 95, 22, 30, '#e8c0a0', -0.2); ell(g, 104, 95, 22, 30, '#e8c0a0', 0.2);
    ell(g, 66, 95, 10, 18, '#a86a50', -0.2); ell(g, 104, 95, 10, 18, '#a86a50', 0.2);
    poly(g, '#d8d8d0', 82, 56, 90, 56, 92, 128, 80, 128); poly(g, '#2a1a10', 79, 128, 93, 128, 92, 140, 80, 140);
    // tree-man: two trunk legs in boats, broken egg body, turned head with a disc hat
    poly(g, '#3a2414', 186, 214, 196, 214, 206, 130, 198, 128); poly(g, '#3a2414', 236, 214, 246, 214, 232, 128, 224, 130);
    ell(g, 190, 216, 18, 5, '#2a1a10'); ell(g, 242, 216, 18, 5, '#2a1a10');
    ell(g, 216, 118, 34, 22, '#f0e4cc'); poly(g, '#1a0c06', 230, 108, 252, 112, 246, 132, 228, 128);
    glow(g, 240, 120, 14, 'rgba(255,160,60,.6)');
    ell(g, 192, 92, 14, 16, '#f0dcc0'); ell(g, 196, 90, 2, 2, '#000');
    ell(g, 192, 76, 30, 6, '#e8d8c0'); ell(g, 196, 68, 7, 9, '#e88aa0');
    for (let i = 0; i < 5; i++) person(g, 205 + i * 6, 72, 7, '#e8c8b0');
    crowd(g, r, 60, 0, 320, 150, 226, ['#f0dcc0', '#d8b090', '#3a2a20', '#e8c8b0'], 3, 6);
  } },
  // 2 · Bosch, Temptation of St Anthony: ship-fish in the sky, kneeling saint, burning village
  1: { add(g, r) {
    glow(g, 270, 110, 60, 'rgba(255,120,30,.6)');
    ell(g, 150, 46, 46, 14, '#7a8a6a'); poly(g, '#7a8a6a', 106, 46, 84, 30, 88, 60); ell(g, 186, 42, 4, 4, '#f0e8d0');
    line(g, '#3a2a1a', 2, 140, 34, 140, 6); poly(g, '#d8c8a0', 141, 8, 166, 22, 141, 30);
    person(g, 160, 150, 34, '#e8c8a0', '#5a3a2a', 0.2);
  } },
  // 3 · Bosch, Last Judgement: triptych, Christ in glory on top, hell below
  2: { add(g, r) {
    g.fillStyle = '#0a0806'; g.fillRect(104, 0, 5, 240); g.fillRect(211, 0, 5, 240);
    g.fillStyle = 'rgba(90,120,170,.75)'; g.fillRect(0, 0, 320, 50);
    glow(g, 160, 26, 40, 'rgba(255,230,150,.8)'); ell(g, 160, 26, 18, 22, '#f0e0a0'); person(g, 160, 14, 24, '#f0d8b0', '#c83a2a');
    for (let i = 0; i < 6; i++) person(g, 110 + i * 20, 42, 10, '#f0d8b0', '#3a5a9a');
  } },
  // 4 · Bruegel, Triumph of Death: skeleton army behind coffin shields, wheel on a pole, burnt land
  3: { full(g, r) {
    sky(g, '#3a3020', '#6a5030', '#4a3a24', '#2a2014');
    for (let i = 0; i < 8; i++) glow(g, r() * 320, 30 + r() * 40, 24, 'rgba(255,120,40,.4)');
    poly(g, '#2a2014', 0, 90, 80, 70, 180, 86, 320, 70, 320, 240, 0, 240);
    line(g, '#1a1008', 2, 60, 110, 60, 40); g.strokeStyle = '#1a1008'; g.lineWidth = 2; g.beginPath(); g.arc(60, 40, 10, 0, TAU); g.stroke();
    line(g, '#1a1008', 2, 250, 100, 250, 50); line(g, '#1a1008', 2, 238, 58, 262, 58);
    // coffin wall of shields
    for (let i = 0; i < 9; i++) poly(g, '#5a4024', 150 + i * 18, 120, 166 + i * 18, 120, 168 + i * 18, 170, 148 + i * 18, 170);
    for (let i = 0; i < 9; i++) skull(g, 158 + i * 18, 108, 6);
    for (let i = 0; i < 14; i++) skeleton(g, 20 + r() * 280, 150 + r() * 50, 30 + r() * 20, '#e6dcc4', [-1 - r(), 1 + r()]);
    // skeleton on a pale horse with a scythe
    ell(g, 90, 160, 34, 14, '#8a7a60'); line(g, '#8a7a60', 5, 66, 168, 62, 196); line(g, '#8a7a60', 5, 112, 168, 118, 196); poly(g, '#8a7a60', 116, 150, 136, 136, 140, 148, 122, 160);
    skeleton(g, 90, 112, 44); line(g, '#d8d8d0', 2, 104, 128, 120, 74); g.strokeStyle = '#d8d8d0'; g.beginPath(); g.moveTo(120, 74); g.quadraticCurveTo(96, 66, 84, 80); g.stroke();
    crowd(g, r, 30, 0, 320, 190, 230, ['#c84a2a', '#e8d0b0', '#3a3a50', '#8a6a3a'], 4, 6);
  } },
  // 5 · Bruegel, Dulle Griet: armoured woman with sword striding before a giant hellmouth
  4: { full(g, r) {
    sky(g, '#1a0a04', '#8a2a0a', '#ff6a1a', '#4a1a08', '#1e0e08');
    for (let i = 0; i < 6; i++) { const x = 160 + r() * 160; g.fillStyle = '#100604'; g.fillRect(x, 60 + r() * 40, 10 + r() * 20, 120); }
    ell(g, 60, 150, 70, 80, '#6a2a14'); ell(g, 60, 165, 40, 46, '#1a0404'); for (let i = 0; i < 7; i++) poly(g, '#f0e0c0', 26 + i * 10, 122, 34 + i * 10, 122, 30 + i * 10, 136);
    ell(g, 40, 104, 8, 6, '#ffcc66'); ell(g, 80, 104, 8, 6, '#ffcc66');
    // Mad Meg
    poly(g, '#3a3a40', 168, 110, 196, 110, 210, 220, 150, 220); ell(g, 182, 98, 11, 13, '#e8c0a0'); poly(g, '#8a8a90', 170, 92, 194, 92, 190, 84, 174, 84);
    line(g, '#3a3a40', 6, 172, 125, 140, 150); line(g, '#d8d8d0', 3, 196, 125, 240, 92);
    poly(g, '#6a4a2a', 196, 120, 226, 130, 220, 170, 196, 160);
    line(g, '#3a3a40', 7, 172, 220, 150, 236); line(g, '#3a3a40', 7, 196, 220, 222, 236);
    crowd(g, r, 26, 0, 320, 190, 236, ['#e8c0a0', '#2a2a2a', '#c8a040'], 3, 5);
  } },
  // 6 · Bruegel, Fall of the Rebel Angels: Michael with sword in a blue sky, hybrids tumbling
  5: { add(g, r) {
    g.fillStyle = grad(g, ['#e8e0a0', '#5a7aa8', 'rgba(52,64,90,0)'], 0, 0, 0, 120); g.fillRect(0, 0, 320, 120);
    glow(g, 160, 12, 50, 'rgba(255,250,200,.9)');
    person(g, 160, 40, 44, '#f0d8b0', '#e8d070'); poly(g, '#f0f0e8', 152, 48, 110, 26, 140, 66); poly(g, '#f0f0e8', 168, 48, 210, 26, 180, 66);
    line(g, '#f0f0f0', 3, 172, 54, 206, 30);
    for (let i = 0; i < 10; i++) person(g, 40 + r() * 240, 60 + r() * 50, 16, '#f0f0e8', '#e8e0d0', r() * 3);
  } },
  // 8 · Signorelli, The Damned: muscular nude bodies, winged devils in the air, armoured angels above
  7: { add(g, r) {
    g.fillStyle = 'rgba(120,150,180,.5)'; g.fillRect(0, 0, 320, 40);
    for (let i = 0; i < 3; i++) { person(g, 110 + i * 50, 16, 22, '#e8c8a0', '#8a8a90'); poly(g, '#e8e0d0', 100 + i * 50, 20, 120 + i * 50, 4, 120 + i * 50, 26); }
    for (let i = 0; i < 4; i++) { const x = 40 + i * 80; drawMonsterShape(g, { body: 'winged', c1: '#5a8a5a', c2: '#2a3a2a', eyes: 2, extra: 'horns' }, x, 100, 40, r); }
    crowd(g, r, 40, 0, 320, 130, 230, ['#d8a080', '#c89070', '#5a8a5a', '#e8b890'], 7, 11);
  } },
  // 9 · Baldung Grien, Death and the Maiden: a rotting corpse grabs the hair of a pale nude woman
  8: { full(g, r) {
    sky(g, '#050505', '#0e0d0c', '#16140f');
    glow(g, 140, 120, 140, 'rgba(216,200,168,.18)');
    // maiden
    ell(g, 130, 66, 20, 24, '#f0e0cc'); ell(g, 130, 118, 30, 46, '#f0e0cc'); ell(g, 120, 170, 22, 42, '#f0e0cc'); ell(g, 142, 172, 20, 40, '#e8d8c0');
    ell(g, 124, 64, 3, 2, '#3a2a20'); ell(g, 138, 64, 3, 2, '#3a2a20'); ell(g, 131, 78, 4, 3, '#6a2a20');
    g.strokeStyle = '#c8a050'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(118 + i * 2, 46); g.quadraticCurveTo(160 + i, 30 + i * 2, 196, 50 + i); g.stroke(); }
    // death
    skull(g, 214, 58, 18, '#b8a888');
    poly(g, '#8a7a5a', 194, 82, 234, 82, 244, 190, 190, 190);
    for (let i = 0; i < 5; i++) line(g, '#3a3020', 1.5, 198, 96 + i * 10, 230, 96 + i * 10);
    line(g, '#8a7a5a', 6, 196, 90, 196, 52); line(g, '#8a7a5a', 6, 234, 92, 190, 140);
    line(g, '#8a7a5a', 7, 204, 190, 196, 236); line(g, '#8a7a5a', 7, 232, 190, 244, 236);
  } },
  // 10 · Caravaggio, Medusa: a screaming head on a round parade shield
  9: { full(g, r) {
    sky(g, '#3a4a20', '#5a6a2a', '#2a3010');
    ell(g, 160, 120, 104, 104, '#2a2a14'); ell(g, 160, 120, 98, 98, '#7a8a40'); glow(g, 130, 90, 90, 'rgba(255,255,200,.35)');
    g.strokeStyle = '#3a6a2a'; g.lineWidth = 7; g.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const a = -Math.PI + (i / 15) * Math.PI; g.beginPath(); g.moveTo(160 + Math.cos(a) * 30, 110 + Math.sin(a) * 34); g.bezierCurveTo(160 + Math.cos(a) * 60, 110 + Math.sin(a) * 60, 160 + Math.cos(a + 0.5) * 70, 110 + Math.sin(a + 0.5) * 70, 160 + Math.cos(a) * 80, 110 + Math.sin(a) * 78); g.stroke(); }
    ell(g, 160, 120, 38, 46, '#e0b890');
    ell(g, 146, 108, 7, 8, '#fff'); ell(g, 174, 108, 7, 8, '#fff'); ell(g, 146, 108, 3, 4, '#2a1a10'); ell(g, 174, 108, 3, 4, '#2a1a10');
    line(g, '#5a3020', 3, 138, 96, 152, 100); line(g, '#5a3020', 3, 182, 96, 168, 100);
    ell(g, 160, 144, 15, 13, '#1a0404'); for (let i = 0; i < 5; i++) poly(g, '#f0e8d0', 148 + i * 5, 133, 152 + i * 5, 133, 150 + i * 5, 138);
    g.fillStyle = '#a01010'; for (let i = 0; i < 5; i++) g.fillRect(148 + i * 6, 166, 3, 20 + r() * 18);
  } },
  // 11 · Caravaggio, Judith Beheading Holofernes: Judith, the old maid, the man on the bed, a red curtain
  10: { full(g, r) { judith(g, r, false); } },
  // 12 · Artemisia Gentileschi, Judith Slaying Holofernes: two women pin him down, gold dress
  11: { full(g, r) { judith(g, r, true); } },
  // 13 · Rubens, Saturn: an old bearded giant biting the chest of a child, scythe, stars
  12: { full(g, r) {
    sky(g, '#05060a', '#1a1a24', '#3a2a1a');
    for (let i = 0; i < 3; i++) ell(g, 40 + i * 30, 30 + i * 8, 3, 3, '#f0f0d0');
    poly(g, '#6a4030', 80, 90, 210, 80, 250, 220, 60, 220);
    ell(g, 150, 70, 30, 34, '#d8a070'); g.fillStyle = '#e8e0d0'; g.beginPath(); g.moveTo(124, 78); g.quadraticCurveTo(150, 150, 176, 78); g.fill();
    ell(g, 140, 64, 3, 2, '#2a1a10'); ell(g, 160, 64, 3, 2, '#2a1a10');
    ell(g, 196, 110, 22, 30, '#f0c8b0', 0.6); ell(g, 216, 88, 13, 14, '#f0c8b0'); line(g, '#f0c8b0', 8, 210, 128, 236, 160); line(g, '#f0c8b0', 8, 200, 134, 214, 176);
    g.fillStyle = '#a01010'; g.fillRect(178, 98, 8, 6);
    line(g, '#d8a070', 12, 120, 110, 186, 116); line(g, '#5a4030', 4, 70, 220, 100, 40); g.strokeStyle = '#d8d8d0'; g.lineWidth = 4; g.beginPath(); g.moveTo(100, 40); g.quadraticCurveTo(60, 26, 34, 52); g.stroke();
  } },
  // 16 · Füssli, The Nightmare: a sleeper flung over the bed, an incubus on her chest, a mare's head
  15: { full(g, r) {
    sky(g, '#0a0606', '#2a1410', '#140a08');
    g.fillStyle = '#6a1a14'; g.fillRect(0, 0, 320, 60); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i * 40 + 10, 0, 8, 60); }
    glow(g, 150, 150, 130, 'rgba(255,230,200,.25)');
    poly(g, '#8a7a6a', 40, 160, 290, 160, 300, 200, 30, 200); poly(g, '#5a4a40', 30, 200, 300, 200, 300, 240, 30, 240);
    // sleeper, head and arm hanging over the edge
    ell(g, 180, 152, 92, 16, '#fbf6ee'); ell(g, 200, 160, 70, 8, '#e8e0d4'); ell(g, 76, 168, 16, 14, '#f0d8c4'); line(g, '#f0d8c4', 6, 96, 158, 84, 210);
    g.strokeStyle = '#c8a060'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(70 + i * 2, 160); g.lineTo(60 + i * 3, 200 + i * 2); g.stroke(); }
    // incubus squatting on her belly
    ell(g, 170, 120, 22, 26, '#3a2e2a'); ell(g, 172, 92, 15, 14, '#4a3a34'); poly(g, '#4a3a34', 160, 84, 156, 68, 166, 80); poly(g, '#4a3a34', 184, 84, 188, 68, 178, 80);
    ell(g, 166, 92, 2.5, 2.5, '#f0e0a0'); ell(g, 178, 92, 2.5, 2.5, '#f0e0a0'); line(g, '#3a2e2a', 6, 156, 136, 150, 150); line(g, '#3a2e2a', 6, 186, 136, 194, 150);
    // the mare through the curtain, white blind eyes
    poly(g, '#2a1c18', 250, 60, 286, 56, 300, 96, 282, 120, 256, 104); ell(g, 276, 78, 6, 5, '#f8f8f0'); ell(g, 290, 108, 4, 3, '#1a0a08');
    poly(g, '#2a1c18', 262, 58, 266, 40, 272, 58);
  } },
  // 17 · Blake, The Great Red Dragon and the Woman Clothed with Sun: dragon seen from behind, wings spread
  16: { full(g, r) {
    sky(g, '#f0d890', '#e8a040', '#5a3a1a');
    glow(g, 160, 190, 80, 'rgba(255,255,220,.9)'); person(g, 160, 176, 46, '#f0e0c0', '#f8f0d0');
    poly(g, '#c83a1a', 160, 140, 30, 20, 60, 90, 20, 70, 70, 140); poly(g, '#c83a1a', 160, 140, 290, 20, 260, 90, 300, 70, 250, 140);
    for (let i = 0; i < 6; i++) { line(g, '#7a1a0a', 2, 160, 140, 40 + i * 6, 30 + i * 18); line(g, '#7a1a0a', 2, 160, 140, 280 - i * 6, 30 + i * 18); }
    ell(g, 160, 120, 26, 52, '#d84a20'); ell(g, 160, 64, 16, 16, '#d84a20'); poly(g, '#ffcc40', 150, 56, 144, 36, 156, 52); poly(g, '#ffcc40', 170, 56, 176, 36, 164, 52);
    line(g, '#d84a20', 10, 150, 168, 130, 236); line(g, '#d84a20', 10, 170, 168, 190, 236);
    g.strokeStyle = '#d84a20'; g.lineWidth = 8; g.beginPath(); g.moveTo(160, 170); g.quadraticCurveTo(230, 210, 290, 236); g.stroke();
  } },
  // 18 · Goya, Saturn Devouring His Son: wild eyes in the dark, a headless body in his hands
  17: { full(g, r) {
    sky(g, '#020202', '#0a0806', '#1a120a');
    glow(g, 160, 100, 120, 'rgba(184,152,122,.2)');
    g.fillStyle = '#5a4a3a'; for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(130 + i * 4, 30); g.lineTo(110 + i * 6, 70 + r() * 10); g.lineTo(116 + i * 6, 70); g.fill(); }
    ell(g, 160, 72, 30, 36, '#b8987a'); ell(g, 146, 64, 10, 12, '#fff'); ell(g, 174, 64, 10, 12, '#fff'); ell(g, 146, 64, 3, 3, '#000'); ell(g, 174, 64, 3, 3, '#000');
    ell(g, 160, 94, 16, 12, '#1a0806');
    poly(g, '#8a6a50', 110, 110, 210, 110, 220, 240, 100, 240);
    ell(g, 118, 120, 14, 30, '#b8987a'); ell(g, 202, 120, 14, 30, '#b8987a');
    // the son
    poly(g, '#e8c8a8', 146, 98, 176, 98, 180, 190, 142, 190); g.fillStyle = '#a01010'; g.fillRect(146, 96, 30, 10); g.fillRect(150, 104, 6, 14);
    line(g, '#e8c8a8', 9, 150, 190, 140, 236); line(g, '#e8c8a8', 9, 172, 190, 184, 236);
    line(g, '#b8987a', 10, 124, 140, 148, 150); line(g, '#b8987a', 10, 196, 140, 172, 150);
  } },
  // 19 · Goya, Witches' Sabbath: the great goat in black silhouette, a crowd of hags
  18: { full(g, r) {
    sky(g, '#14100a', '#2a2418', '#4a3a24', '#1a140c');
    poly(g, '#050403', 0, 40, 70, 30, 100, 80, 110, 160, 90, 240, 0, 240);
    poly(g, '#050403', 60, 40, 40, 6, 74, 30); poly(g, '#050403', 84, 46, 110, 16, 96, 54);
    ell(g, 92, 74, 3, 2, '#d8c8a0');
    for (let i = 0; i < 22; i++) { const x = 120 + (i % 11) * 18 + r() * 6, y = 110 + Math.floor(i / 11) * 40 + r() * 10; ell(g, x, y, 10, 13, i % 3 ? '#c8b080' : '#a89060'); ell(g, x - 3, y - 2, 2, 3, '#1a1008'); ell(g, x + 3, y - 2, 2, 3, '#1a1008'); ell(g, x, y + 6, 3, 2, '#1a1008'); poly(g, '#2a2014', x - 14, y + 10, x + 14, y + 10, x + 16, y + 60, x - 16, y + 60); }
  } },
  // 20 · Goya, The Sleep of Reason Produces Monsters: a man asleep on his desk, owls and bats rising
  19: { full(g, r) {
    sky(g, '#d8d0b8', '#b8b098', '#8a8470');
    for (let x = 0; x < 320; x += 3) { g.fillStyle = 'rgba(60,50,40,.05)'; g.fillRect(x, 0, 1, 240); }
    poly(g, '#3a342c', 110, 170, 240, 160, 250, 240, 120, 240); g.fillStyle = '#f0ecdc'; g.fillRect(150, 166, 50, 8);
    ell(g, 160, 150, 40, 28, '#4a443a'); ell(g, 196, 148, 18, 16, '#d8c8a8'); line(g, '#4a443a', 10, 140, 160, 186, 160);
    for (let i = 0; i < 6; i++) owl(g, 70 + i * 30 + r() * 10, 60 + r() * 50, 12 + r() * 6, '#2a2620');
    for (let i = 0; i < 14; i++) bat(g, 40 + r() * 260, 10 + r() * 80, 10 + r() * 10, '#14120e');
    ell(g, 80, 210, 18, 12, '#2a2620'); ell(g, 86, 200, 3, 3, '#f0f0c0'); ell(g, 76, 200, 3, 3, '#f0f0c0');
  } },
  // 21 · Goya, The Dog: a tiny head peering over a slope into a huge empty ochre field
  20: { full(g, r) {
    sky(g, '#c8a868', '#b89858', '#a88850', '#8a7040');
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,60,30,${r() * 0.08})`; g.fillRect(r() * 320, r() * 160, 20 + r() * 60, 2 + r() * 6); }
    g.fillStyle = '#4a3820'; g.beginPath(); g.moveTo(0, 200); g.quadraticCurveTo(100, 170, 170, 186); g.lineTo(320, 196); g.lineTo(320, 240); g.lineTo(0, 240); g.fill();
    ell(g, 140, 172, 9, 10, '#2a2216'); ell(g, 146, 176, 6, 5, '#2a2216'); poly(g, '#2a2216', 134, 166, 132, 156, 140, 164);
    ell(g, 144, 170, 1.8, 1.8, '#e8d8a0');
  } },
  // 22 · Géricault, Raft of the Medusa: a pyramid of bodies, a man waving a cloth, the sail
  21: { full(g, r) {
    sky(g, '#3a3020', '#8a7040', '#c8a868', '#2a2a20');
    g.fillStyle = '#0c1410'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 170 + i * 12); for (let x = 0; x <= 320; x += 16) g.lineTo(x, 170 + i * 12 + Math.sin(x / 26 + i) * 7); g.lineTo(320, 240); g.lineTo(0, 240); g.fill(); }
    poly(g, '#3a2a1a', 20, 200, 300, 186, 290, 210, 30, 220);
    line(g, '#2a1a10', 4, 90, 196, 76, 40); poly(g, '#8a7a5a', 78, 44, 130, 70, 92, 150);
    const bodies = [[60, 192, -1.2], [100, 186, -0.6], [140, 176, 0.2], [176, 160, -0.3], [206, 140, 0.4], [230, 120, 0.1], [250, 100, 0]];
    bodies.forEach(([x, y, t], i) => person(g, x, y, 36, i % 2 ? '#a88c70' : '#8a7058', '#5a4a3a', t));
    line(g, '#8a7058', 4, 254, 96, 262, 70); poly(g, '#e8dcc0', 262, 70, 282, 64, 278, 80, 262, 80);
    ell(g, 300, 130, 3, 2, '#5a5a50');
  } },
  // 23 · Géricault, Heads of the Executed: two severed heads side by side on a white cloth
  22: { full(g, r) {
    sky(g, '#0c0a08', '#1e1a14');
    poly(g, '#e8e0d0', 30, 150, 290, 140, 310, 240, 10, 240); for (let i = 0; i < 6; i++) line(g, '#b8b0a0', 1.5, 40 + i * 40, 150, 60 + i * 40, 236);
    ell(g, 120, 140, 38, 32, '#a89880', 0.3); ell(g, 104, 136, 6, 2, '#3a2a20'); ell(g, 124, 128, 6, 2, '#3a2a20'); ell(g, 136, 156, 8, 4, '#5a2a20');
    ell(g, 206, 128, 34, 40, '#c8b8a0'); ell(g, 196, 120, 6, 3, '#3a2a20'); ell(g, 218, 120, 6, 3, '#3a2a20'); ell(g, 206, 148, 7, 4, '#5a2a20');
    g.fillStyle = '#7a1010'; g.fillRect(180, 164, 50, 6); g.fillRect(90, 168, 60, 6);
  } },
  // 24 · Delacroix, Death of Sardanapalus: a red bed on a diagonal, the reclining king, slaughter
  23: { add(g, r) {
    poly(g, '#c81e1e', 40, 60, 300, 30, 320, 120, 120, 200); ell(g, 250, 52, 30, 10, '#f0e8d0');
    person(g, 260, 44, 30, '#8a5030', '#f0f0e8', 1.3);
    person(g, 120, 160, 40, '#f0d8c0', '#f0d8c0', -1.1); person(g, 200, 170, 36, '#f0d8c0', '#f0d8c0', 0.9);
    glow(g, 180, 200, 40, 'rgba(255,200,60,.5)');
  } },
  // 26 · Böcklin, Self-Portrait with Death Playing the Fiddle
  25: { full(g, r) {
    sky(g, '#1a2418', '#2a3424', '#1a2014');
    poly(g, '#2a1e16', 120, 110, 240, 110, 270, 240, 90, 240);
    ell(g, 180, 80, 28, 34, '#d8b090'); g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(180, 54, 30, 16, 0, Math.PI, TAU); g.fill();
    ell(g, 170, 76, 3, 3, '#2a1a10'); ell(g, 190, 76, 3, 3, '#2a1a10'); g.fillStyle = '#6a4a2a'; g.beginPath(); g.moveTo(160, 92); g.quadraticCurveTo(180, 130, 200, 92); g.fill();
    line(g, '#d8b090', 6, 240, 150, 260, 170); poly(g, '#e8d8c0', 256, 160, 300, 150, 300, 200, 262, 200);
    line(g, '#8a6a3a', 3, 264, 160, 292, 140);
    skull(g, 110, 60, 20, '#d8ccb0'); line(g, '#d8ccb0', 4, 100, 92, 70, 130); poly(g, '#6a3a1a', 60, 110, 90, 102, 96, 140, 66, 146); line(g, '#d8ccb0', 2, 70, 100, 30, 150);
  } },
  // 30 · Ensor, Skeletons Fighting over a Pickled Herring
  29: { full(g, r) {
    sky(g, '#c8b8a0', '#a89880');
    skull(g, 110, 100, 46, '#e8e0d0'); poly(g, '#4a6a5a', 70, 52, 150, 52, 136, 30, 84, 30);
    skull(g, 214, 106, 46, '#d8d0b8'); poly(g, '#2a2a6a', 172, 60, 254, 60, 240, 36, 186, 36);
    poly(g, '#a8b0a0', 140, 180, 196, 176, 210, 186, 196, 194, 140, 190); ell(g, 146, 184, 4, 4, '#2a2a2a');
    line(g, '#6a4a2a', 3, 110, 160, 144, 186); line(g, '#6a4a2a', 3, 220, 166, 196, 186);
  } },
  // 31 · Munch, The Scream: the screamer on the bridge, two figures behind, blood-red sky
  30: { add(g, r) {
    line(g, '#3a2210', 3, 30, 240, 320, 120); line(g, '#3a2210', 2, 60, 240, 320, 140);
    for (let i = 0; i < 10; i++) line(g, '#3a2210', 2, 50 + i * 28, 240 - i * 11, 50 + i * 28, 226 - i * 11);
    person(g, 270, 120, 30, '#1a1a1a', '#1a1a1a'); person(g, 290, 116, 28, '#1a1a1a', '#1a1a1a');
    line(g, '#d8c890', 5, 132, 160, 124, 136); line(g, '#d8c890', 5, 160, 160, 168, 136);
  } },
  // 32 · Munch, Vampire: a red-haired woman bent over a man's neck
  31: { full(g, r) {
    sky(g, '#1a1410', '#2a2018', '#1a1410');
    poly(g, '#2a2a3a', 110, 120, 230, 110, 240, 240, 100, 240);
    ell(g, 150, 120, 30, 26, '#d8c8b0'); ell(g, 188, 104, 22, 24, '#e8c8b0', -0.5);
    g.strokeStyle = '#e84a2a'; g.lineWidth = 3; for (let i = 0; i < 26; i++) { g.beginPath(); g.moveTo(180 + i * 1.2, 86); g.bezierCurveTo(170 - i, 110, 150 - i * 2, 150, 130 - i * 2, 200 + r() * 20); g.stroke(); }
    line(g, '#e8c8b0', 7, 176, 130, 130, 150);
    glow(g, 180, 110, 60, 'rgba(232,74,42,.25)');
  } },
  // 33 · Moreau, The Apparition: Salome points at the Baptist's head floating in a halo of light
  32: { add(g, r) {
    glow(g, 180, 70, 70, 'rgba(255,220,120,.6)');
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; line(g, 'rgba(255,220,120,.6)', 1.5, 180 + Math.cos(a) * 30, 70 + Math.sin(a) * 30, 180 + Math.cos(a) * 70, 70 + Math.sin(a) * 70); }
    person(g, 80, 120, 70, '#f0d8c0', '#d8b050'); line(g, '#f0d8c0', 4, 86, 140, 140, 96);
    g.strokeStyle = 'rgba(216,176,80,.5)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(0, 30 + i * 20); g.lineTo(320, 20 + i * 22); g.stroke(); }
  } },
  // 35 · von Stuck, The Sin: a pale woman in the dark, a black serpent across her shoulders
  34: { full(g, r) {
    sky(g, '#020202', '#080806');
    ell(g, 160, 110, 28, 34, '#e8d8c0'); g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(160, 96, 34, 30, 0, Math.PI, TAU); g.fill(); g.fillRect(126, 96, 14, 80); g.fillRect(180, 96, 14, 80);
    ell(g, 150, 108, 4, 3, '#1a1410'); ell(g, 170, 108, 4, 3, '#1a1410'); ell(g, 160, 124, 6, 2, '#8a2a20');
    poly(g, '#e8d8c0', 120, 150, 200, 150, 220, 240, 100, 240);
    g.strokeStyle = '#1a1a14'; g.lineWidth = 16; g.beginPath(); g.moveTo(80, 240); g.bezierCurveTo(100, 150, 150, 170, 220, 150); g.bezierCurveTo(250, 140, 250, 110, 230, 110); g.stroke();
    ell(g, 226, 108, 14, 10, '#1a1a14'); ell(g, 230, 104, 3, 3, '#ffd060');
  } },
  // 37 · Dalí, The Face of War: a dead face whose eyes and mouth hold more skulls, snakes, a desert
  36: { full(g, r) {
    sky(g, '#6a7a8a', '#c8b080', '#a88a5a', '#6a5030');
    poly(g, '#8a6a40', 0, 200, 320, 180, 320, 240, 0, 240);
    ell(g, 160, 110, 86, 80, '#c8a878'); ell(g, 160, 110, 80, 74, '#b8986a');
    const nest = (x, y, s, d) => { ell(g, x, y, s, s * 1.1, '#1a1008'); if (d > 0) { ell(g, x, y, s * 0.8, s * 0.9, '#c8a878'); nest(x - s * 0.3, y - s * 0.1, s * 0.25, d - 1); nest(x + s * 0.3, y - s * 0.1, s * 0.25, d - 1); nest(x, y + s * 0.4, s * 0.22, d - 1); } };
    nest(126, 92, 22, 2); nest(194, 92, 22, 2); nest(160, 156, 24, 2);
    g.strokeStyle = '#5a4020'; g.lineWidth = 6; for (const [x, y, k] of [[70, 80, 1], [250, 80, -1], [80, 160, 1], [240, 160, -1]]) { g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - k * 30, y - 20, x - k * 10, y + 40, x - k * 40, y + 30); g.stroke(); }
  } },
  // 38 · Beksiński: a burning cathedral of bones in an orange haze
  37: { add(g, r) {
    for (let i = 0; i < 7; i++) { const x = 60 + i * 34, hh = 90 + r() * 80; poly(g, 'rgba(40,20,10,.85)', x - 12, 200, x + 12, 200, x + 3, 200 - hh, x, 190 - hh - 20, x - 3, 200 - hh); }
    glow(g, 160, 120, 120, 'rgba(255,154,64,.45)');
  } },
  // 39 · Bacon, Study after Velázquez's Innocent X: the screaming Pope on a gold throne, curtain streaks
  38: { add(g, r) {
    for (let x = 0; x < 320; x += 6) { g.fillStyle = `rgba(${10 + r() * 20},${0},${20 + r() * 30},.5)`; g.fillRect(x, 0, 3, 240); }
    line(g, '#c8a040', 5, 110, 240, 110, 120); line(g, '#c8a040', 5, 210, 240, 210, 120); line(g, '#c8a040', 4, 104, 150, 216, 150);
  } },
  // 40 · Bacon, Three Studies for Figures at the Base of a Crucifixion: three orange panels
  39: { full(g, r) {
    for (let p = 0; p < 3; p++) {
      const x0 = p * 108;
      g.fillStyle = '#e8701a'; g.fillRect(x0, 0, 104, 240); g.fillStyle = '#0a0606'; g.fillRect(x0 + 104, 0, 4, 240);
      line(g, 'rgba(0,0,0,.5)', 1.5, x0 + 10, 150, x0 + 94, 150); line(g, 'rgba(0,0,0,.5)', 1.5, x0 + 30, 150, x0 + 10, 240);
      poly(g, '#3a2a20', x0 + 30, 200, x0 + 74, 200, x0 + 70, 230, x0 + 34, 230);
      drawMonsterShape(g, { body: 'beast', c1: '#e8d0b0', c2: '#ff6a1a', eyes: 0, extra: 'neck' }, x0 + 52, 200, 120 - p * 10, r, 0.6);
    }
  } },
// 14 · Rubens, Head of Medusa: a severed head on the rocks, snakes crawling out of the hair
  13: { full(g, r) {
    sky(g, '#0a0806', '#1a140c', '#2a2016');
    poly(g, '#3a3024', 0, 170, 120, 150, 320, 176, 320, 240, 0, 240);
    ell(g, 170, 160, 50, 34, '#c8b8a0', 0.3); ell(g, 150, 152, 7, 4, '#2a2a2a'); ell(g, 176, 146, 7, 4, '#2a2a2a'); ell(g, 182, 172, 9, 5, '#4a2020');
    g.fillStyle = '#8a1010'; g.fillRect(200, 186, 40, 5); g.fillRect(214, 188, 4, 30);
    g.strokeStyle = '#4a6a2a'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = Math.PI * 0.8 + (i / 11) * Math.PI * 1.1; const x = 170 + Math.cos(a) * 50, y = 150 + Math.sin(a) * 34; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + Math.cos(a) * 40, y + Math.sin(a) * 30, x + Math.cos(a + 1) * 50, y + Math.sin(a + 1) * 40, x + Math.cos(a) * 80, y + Math.sin(a) * 50 + 20); g.stroke(); }
    for (let i = 0; i < 4; i++) { const x = 40 + i * 70; g.strokeStyle = '#6a8a40'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 230); g.quadraticCurveTo(x + 20, 210, x + 40, 224); g.stroke(); ell(g, x + 42, 224, 5, 3, '#6a8a40'); }
  } },
  // 15 · Salvator Rosa, Witches and Their Incantations: a hanged man, a skeleton, hags around a fire
  14: { full(g, r) {
    sky(g, '#050403', '#14100a', '#2a2014');
    line(g, '#2a1e12', 6, 60, 240, 90, 20); line(g, '#2a1e12', 5, 90, 30, 200, 20);
    line(g, '#c8b8a0', 1, 170, 22, 170, 60); person(g, 170, 64, 50, '#c8b8a0', '#5a4a3a', 0.1);
    glow(g, 200, 190, 70, 'rgba(255,140,40,.6)'); poly(g, '#ffb040', 186, 200, 214, 200, 200, 160);
    skeleton(g, 270, 120, 80, '#d8ccb0', [-2, 2.2]);
    for (let i = 0; i < 5; i++) { const x = 60 + i * 56, y = 170 + (i % 2) * 14; ell(g, x, y, 9, 10, '#a89878'); poly(g, '#2a2418', x - 14, y - 4, x, y - 22, x + 14, y - 4, x + 18, y + 50, x - 18, y + 50); }
    owl(g, 40, 60, 16, '#1a1610');
  } },
  // 27 · Redon, The Crying Spider: a hairy spider with a sad human face, charcoal on paper
  26: { full(g, r) {
    sky(g, '#c8c0a8', '#a8a088', '#8a8470');
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(30,28,20,${r() * 0.08})`; g.fillRect(r() * 320, r() * 240, 1 + r() * 3, 1 + r() * 3); }
    g.strokeStyle = '#1a1a14'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const sx = i < 5 ? -1 : 1, k = i % 5; g.beginPath(); g.moveTo(160, 130); g.quadraticCurveTo(160 + sx * (50 + k * 14), 70 + k * 18, 160 + sx * (70 + k * 16), 210 - k * 4); g.stroke(); }
    ell(g, 160, 128, 52, 50, '#1a1a14');
    g.strokeStyle = '#1a1a14'; g.lineWidth = 1; for (let i = 0; i < 80; i++) { const a = r() * TAU; g.beginPath(); g.moveTo(160 + Math.cos(a) * 48, 128 + Math.sin(a) * 46); g.lineTo(160 + Math.cos(a) * 60, 128 + Math.sin(a) * 58); g.stroke(); }
    ell(g, 160, 128, 30, 34, '#d8d0b8');
    ell(g, 149, 120, 6, 4, '#1a1a14'); ell(g, 171, 120, 6, 4, '#1a1a14'); line(g, '#1a1a14', 2, 152, 146, 160, 142, 168, 146);
    g.fillStyle = '#8aa0b0'; g.fillRect(147, 126, 2, 14); g.fillRect(171, 126, 2, 18);
  } },
};

function judith(g, r, artemisia) {
  sky(g, '#050303', '#140808');
  g.fillStyle = '#8a1010'; g.beginPath(); g.moveTo(0, 0); g.lineTo(320, 0); g.lineTo(320, 30); g.quadraticCurveTo(160, 80, 0, 40); g.fill();
  glow(g, 200, 120, 140, 'rgba(255,220,180,.2)');
  poly(g, '#e8e0d0', 0, 170, 220, 160, 230, 240, 0, 240);
  // Holofernes: head toward us, body on the sheet
  ell(g, 110, 160, 70, 16, '#c89878', 0.05); ell(g, 52, 156, 20, 18, '#c89878');
  ell(g, 46, 150, 3, 2, '#fff'); ell(g, 58, 150, 3, 2, '#fff'); ell(g, 52, 164, 6, 5, '#3a0a0a');
  g.fillStyle = '#b01010'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 6, 172, 3, 30 + r() * 30);
  line(g, '#c89878', 7, 66, 150, 40, 110);
  // Judith
  ell(g, artemisia ? 140 : 200, 80, 14, 16, '#f0d8c0');
  poly(g, artemisia ? '#c8a040' : '#f0f0e8', artemisia ? 120 : 184, 96, artemisia ? 166 : 220, 96, artemisia ? 176 : 232, 170, artemisia ? 112 : 176, 170);
  line(g, '#f0d8c0', 6, artemisia ? 130 : 190, 110, 70, 146); line(g, '#d8d8d0', 3, 66, 150, artemisia ? 146 : 160, artemisia ? 70 : 110);
  // the maid
  ell(g, artemisia ? 96 : 250, artemisia ? 100 : 76, 13, 15, '#b89070'); poly(g, '#4a3a2a', artemisia ? 80 : 236, artemisia ? 114 : 90, artemisia ? 114 : 266, artemisia ? 114 : 90, artemisia ? 120 : 276, 170, artemisia ? 74 : 232, 170);
  if (artemisia) line(g, '#b89070', 6, 96, 120, 70, 150);
}
