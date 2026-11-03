import { h, rand } from '../core/dom.js';
import { loop, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { shaderStage, renderShaderPNG } from '../core/gl.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 60;
const NW = 24, NT = 12, NH = 8, NN = 4;
const ACCENTS = [[0.16, 0.36, 1], [1, 0.83, 0], [0.07, 0.79, 0.48], [0.55, 0.3, 1], [0, 0.8, 0.95]];

// Op art field: black and white stripes that bend around everything you touch.
const FRAG = `
uniform vec2 u_res;
uniform float u_t, u_mode, u_freq, u_hurt, u_export;
uniform vec3 u_pl;
uniform vec3 u_warp[${NW}];
uniform vec3 u_trail[${NT}];
uniform vec4 u_haz[${NH}];
uniform vec4 u_node[${NN}];
uniform vec3 u_acc, u_acc2;

float aa(float s){ float w = fwidth(s) * 0.9 + 1e-4; return smoothstep(-w, w, s); }

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y * 2.0;
  float t = u_t;
  float d = 0.0, tint = 0.0;
  for (int i = 0; i < ${NW}; i++) {
    vec3 w = u_warp[i]; vec2 v = p - w.xy; float k = exp(-dot(v, v) * 6.0);
    d += w.z * k; tint = max(tint, k * min(1.0, abs(w.z)));
  }
  float game = 1.0 - u_export;
  for (int i = 0; i < ${NT}; i++) { vec3 w = u_trail[i]; vec2 v = p - w.xy; d += game * w.z * exp(-dot(v, v) * 26.0); }
  vec2 pv = p - u_pl.xy; float pr = length(pv);
  d += game * 1.4 * exp(-pr * pr / (u_pl.z * u_pl.z * 5.0));

  float s0 = sin(p.y * u_freq + sin(p.x * 2.2 + t * 0.6) * 1.3 + d * 4.0);
  float s1 = sin(atan(p.y, p.x) * 14.0 + length(p) * 7.0 - t * 0.9 + d * 5.0);
  float s2 = sin(p.x * u_freq * 0.45 + d * 3.0) * sin(p.y * u_freq * 0.45 - d * 3.0 + t * 0.3);
  float m = u_mode;
  float w0 = clamp(1.0 - abs(m), 0.0, 1.0), w1 = clamp(1.0 - abs(m - 1.0), 0.0, 1.0), w2 = clamp(1.0 - abs(m - 2.0), 0.0, 1.0);
  // Stripes swell and thin across the canvas, like Riley's 'Fall'.
  float s = w0 * s0 + w1 * s1 + w2 * s2 + 0.55 * sin(p.x * 1.7 - p.y * 0.9 + t * 0.45 + d * 1.5);
  vec3 ink = vec3(0.055, 0.055, 0.063), paper = vec3(0.953, 0.937, 0.902);
  float b = aa(s);
  vec3 col = mix(ink, paper, b);
  // Painted islands where you collected nodes.
  float isl = aa(tint - 0.55);
  col = mix(col, mix(ink, u_acc, b), isl * 0.95);

  if (u_export < 0.5) {
    // Hazards: concentric moiré that closes in.
    for (int i = 0; i < ${NH}; i++) {
      vec4 hz = u_haz[i];
      if (hz.z <= 0.0) continue;
      float l = length(p - hz.xy);
      if (hz.w < 1.0) {
        float ring = 1.0 - aa(abs(l - hz.z) - 0.008);
        float dash = aa(sin(atan(p.y - hz.y, p.x - hz.x) * 18.0 + t * 6.0));
        col = mix(col, u_acc2, ring * dash * (0.4 + 0.6 * hz.w));
      } else if (l < hz.z + 0.02) {
        float c = aa(sin(l * 80.0 - t * 14.0));
        vec3 hc = mix(ink, u_acc2, c);
        col = mix(col, hc, 1.0 - aa(l - hz.z));
        col = mix(col, ink, 1.0 - aa(abs(l - hz.z) - 0.012));
      }
    }
    // Nodes to collect.
    for (int i = 0; i < ${NN}; i++) {
      vec4 n = u_node[i];
      if (n.w <= 0.0) continue;
      vec2 v = p - n.xy; float l = length(v);
      float r = n.z * (1.0 + 0.12 * sin(t * 7.0 + float(i)));
      float c = aa(sin(atan(v.y, v.x) * 8.0 + t * 4.0));
      col = mix(col, mix(paper, u_acc, c), 1.0 - aa(l - r));
      col = mix(col, ink, 1.0 - aa(abs(l - r) - 0.01));
      float halo = 1.0 - aa(abs(l - r * 1.9 - 0.03 * sin(t * 5.0)) - 0.004);
      col = mix(col, u_acc, halo * 0.8);
    }
    // The rider: a lens with crossed stripes.
    float inside = 1.0 - aa(pr - u_pl.z);
    float cs = aa(sin(pv.x * 90.0 + pv.y * 20.0 - t * 10.0));
    col = mix(col, mix(ink, paper, cs), inside);
    col = mix(col, u_acc, 1.0 - aa(abs(pr - u_pl.z) - 0.012));
    col = mix(col, 1.0 - col, u_hurt);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const MOVES = [
  { it: 'I · Corrente', en: 'I · Current' },
  { it: 'II · Vortice', en: 'II · Vortex' },
  { it: 'III · Scacchiera', en: 'III · Checker' },
];

export default {
  id: 'op-rider',
  cat: 'folle',
  title: { it: 'Op Rider', en: 'Op Rider' },
  tagline: { it: 'Cavalca un quadro op art che vibra. Le strisce si piegano al tuo passaggio e diventano il tuo poster.', en: 'Ride a vibrating op art painting. The stripes bend as you pass and become your poster.' },
  how: {
    it: 'Muovi la lente col mouse, con le frecce o trascinando il dito ovunque.|Prendi i nodi colorati più in fretta che puoi: ognuno piega per sempre le strisce del quadro.|Evita i cerchi di moiré: prima appaiono tratteggiati, poi diventano pieni e ti tolgono una vita.',
    en: 'Move the lens with the mouse, arrow keys or by dragging a finger anywhere.|Grab the colored nodes as fast as you can: each one bends the stripes for good.|Avoid the moiré circles: they show up dashed, then turn solid and cost a life.',
  },
  thumb: () => {
    const lines = Array.from({ length: 14 }, (_, i) => {
      const y = i * 8 - 4;
      let d = `M-5 ${y}`;
      for (let x = 0; x <= 170; x += 10) d += ` L${x} ${y + Math.sin(x / 18 + i * 0.3) * 4 + 14 * Math.exp(-((x - 80) ** 2 + (y - 50) ** 2) / 700)}`;
      return `<path d="${d}" stroke="#0E0E10" stroke-width="4" fill="none"/>`;
    }).join('');
    return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#F3EFE6"/>${lines}<circle cx="80" cy="50" r="13" fill="#F3EFE6" stroke="#FF2B55" stroke-width="3"/><circle cx="124" cy="26" r="7" fill="#2D5BFF" stroke="#0E0E10" stroke-width="2"/></svg>`;
  },

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    let A;
    try { A = shaderStage(board, FRAG, { maxDpr: 1.5 }); } catch (e) { board.append(h('p', { class: 'g-hint' }, String(e.message || e))); return; }
    const cv = A.canvas;
    cv.style.cursor = 'none';
    const moveLabel = h('b', { class: 'keys-hint', style: { display: 'inline' } }, api.t(MOVES[0]));
    controls.append(moveLabel, h('span', { class: 'keys-hint' }, api.t({ it: ' · mouse o frecce', en: ' · mouse or arrows' })));

    const acc = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
    const acc2 = [1, 0.13, 0.2];
    const freq = rand(48, 62);
    const pl = { x: 0, y: 0, r: 0.07, tx: 0, ty: 0 };
    const warps = [], trail = [];
    let hazards = [], nodes = [];
    let t = 0, lives = 3, inv = 0, hurt = 0, over = false, spawnH = 2.5, trailT = 0, modeF = 0, mode = 0, sign = 1, collected = 0;
    let relative = false, lastPX = 0, lastPY = 0, pointerSeen = false;
    const keys = new Set();
    const aspect = () => A.w / A.h;
    const toWorld = (px, py) => [(px - A.w / 2) / (A.h / 2), -(py - A.h / 2) / (A.h / 2)];
    const toPx = (x, y) => [A.w / 2 + x * A.h / 2, A.h / 2 - y * A.h / 2];

    const onDown = (e) => {
      relative = e.pointerType !== 'mouse';
      lastPX = e.clientX; lastPY = e.clientY; pointerSeen = true;
      cv.setPointerCapture?.(e.pointerId);
      if (!relative) { const r = cv.getBoundingClientRect(); [pl.tx, pl.ty] = toWorld(e.clientX - r.left, e.clientY - r.top); }
      e.preventDefault();
    };
    const onMove = (e) => {
      const r = cv.getBoundingClientRect();
      if (e.pointerType === 'mouse') { relative = false; pointerSeen = true; [pl.tx, pl.ty] = toWorld(e.clientX - r.left, e.clientY - r.top); return; }
      if (!(e.buttons || e.pressure)) return;
      pl.tx += ((e.clientX - lastPX) / (A.h / 2)) * 1.4;
      pl.ty -= ((e.clientY - lastPY) / (A.h / 2)) * 1.4;
      lastPX = e.clientX; lastPY = e.clientY;
    };
    const kd = (e) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(e.key); pointerSeen = false; } };
    const ku = (e) => keys.delete(e.key);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const lifeHud = () => api.hud(api.t({ it: 'Vite', en: 'Lives' }), '◆'.repeat(Math.max(0, lives)) || '–');
    lifeHud();

    const spawnNode = () => {
      const ax = aspect() - 0.14;
      for (let k = 0; k < 20; k++) {
        const x = rand(-ax, ax), y = rand(-0.84, 0.84);
        if (Math.hypot(x - pl.x, y - pl.y) < 0.45) continue;
        if (hazards.some((z) => Math.hypot(x - z.x, y - z.y) < z.r + 0.12)) continue;
        nodes.push({ x, y, r: 0.055, age: 0 });
        return;
      }
    };
    for (let i = 0; i < 3; i++) spawnNode();

    const uniforms = (exportMode = 0) => {
      const W = new Float32Array(NW * 3), T = new Float32Array(NT * 3), H = new Float32Array(NH * 4), N = new Float32Array(NN * 4);
      warps.forEach((w, i) => W.set([w.x, w.y, w.s], i * 3));
      trail.forEach((w, i) => T.set([w.x, w.y, w.s], i * 3));
      hazards.slice(0, NH).forEach((z, i) => H.set([z.x, z.y, z.r, z.warn < 1 ? z.warn : 1 + z.life], i * 4));
      nodes.slice(0, NN).forEach((n, i) => N.set([n.x, n.y, n.r, 1], i * 4));
      return {
        u_t: t, u_mode: modeF, u_freq: freq, u_hurt: hurt, u_export: exportMode,
        u_pl: [pl.x, pl.y, pl.r], u_warp: { vec: 3, data: W }, u_trail: { vec: 3, data: T },
        u_haz: { vec: 4, data: H }, u_node: { vec: 4, data: N }, u_acc: acc, u_acc2: acc2,
      };
    };

    const exportPoster = async () => {
      // Same framing as the game, at print size (y always spans [-1, 1]).
      const asp = aspect(), M = 3200;
      const W = asp >= 1 ? M : Math.round(M * asp), H = asp >= 1 ? Math.round(M / asp) : M;
      const blob = await renderShaderPNG(FRAG, W, H, uniforms(1));
      const img = await createImageBitmap(blob);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const bar = Math.round(H * 0.07); g.fillStyle = '#0E0E10'; g.fillRect(0, H - bar, W, bar);
      g.fillStyle = '#F3EFE6'; g.font = `700 ${Math.round(bar * 0.4)}px Archivo, Arial, sans-serif`; g.textBaseline = 'middle';
      g.fillText('OP RIDER', bar * 0.4, H - bar / 2);
      g.textAlign = 'right'; g.font = `500 ${Math.round(bar * 0.24)}px "JetBrains Mono", monospace`;
      g.fillText(`${(store.name || 'anonimo').toUpperCase()} · ${api.score.toLocaleString()} · ${new Date().getFullYear()}`, W - bar * 0.4, H - bar / 2);
      c.toBlob((b) => download('occhio-op-rider.png', b), 'image/png');
    };

    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.end({
        exports: [{ label: api.t({ it: 'Poster op art (PNG)', en: 'Op art poster (PNG)' }), run: exportPoster }],
        summary: api.t({ it: `${collected} nodi presi, ${warps.length} pieghe nel quadro.`, en: `${collected} nodes taken, ${warps.length} folds in the painting.` }),
      });
    };
    api.timer(TIME, finish);

    let slowAcc = 0, slowN = 0;
    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      // Adaptive resolution for slow phones.
      slowAcc += dt; slowN++;
      if (slowN >= 40) { if (slowAcc / slowN > 0.026 && A.scale > 0.45) A.setScale(A.scale * 0.8); slowAcc = 0; slowN = 0; }

      const newMode = t < 20 ? 0 : t < 40 ? 1 : 2;
      if (newMode !== mode) { mode = newMode; stamp(stage, api.t(MOVES[mode]), 'great'); moveLabel.textContent = api.t(MOVES[mode]); sfx.combo(4 + mode * 2); }
      modeF += (mode - modeF) * Math.min(1, dt * 1.6);

      // Movement.
      const ax = aspect() - pl.r, ay = 1 - pl.r;
      if (keys.size) {
        const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
        const ky = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
        pl.tx = pl.x + kx * 0.3; pl.ty = pl.y + ky * 0.3;
      }
      pl.tx = Math.max(-ax, Math.min(ax, pl.tx)); pl.ty = Math.max(-ay, Math.min(ay, pl.ty));
      const dx = pl.tx - pl.x, dy = pl.ty - pl.y, dd = Math.hypot(dx, dy);
      const maxStep = (relative ? 4 : 2.4) * dt;
      const step = Math.min(dd, Math.max(maxStep * 0.3, Math.min(maxStep, dd * 12 * dt)));
      const ox = pl.x, oy = pl.y;
      if (dd > 1e-5) { pl.x += (dx / dd) * step; pl.y += (dy / dd) * step; }
      const speed = Math.hypot(pl.x - ox, pl.y - oy) / Math.max(dt, 1e-3);

      trailT -= dt;
      if (trailT <= 0) { trailT = 0.05; trail.unshift({ x: pl.x, y: pl.y, s: Math.min(1, speed * 0.6) }); if (trail.length > NT) trail.pop(); }
      trail.forEach((w) => { w.s *= Math.pow(0.25, dt); });

      // Nodes.
      for (const n of nodes) {
        n.age += dt;
        if (Math.hypot(n.x - pl.x, n.y - pl.y) < n.r + pl.r) {
          n.dead = true; collected++;
          const q = Math.max(0.4, Math.min(1, 1 - (n.age - 0.6) / 8));
          const [px, py] = toPx(n.x, n.y);
          const sp = toStage(stage, A.box, px, py);
          api.hit(q, { x: sp.x, y: sp.y, silent: q < 0.95, speed: q });
          const str = sign * (0.7 + Math.min(1.3, api.combo * 0.12));
          sign = -sign;
          if (warps.length < NW) warps.push({ x: n.x, y: n.y, s: str });
          else warps[collected % NW] = { x: n.x, y: n.y, s: str };
          if (collected % 10 === 0) stamp(stage, `${collected}!`, 'great');
        }
      }
      nodes = nodes.filter((n) => !n.dead);
      while (nodes.length < 3) spawnNode();

      // Hazards.
      spawnH -= dt;
      if (spawnH <= 0 && hazards.length < NH) {
        const lvl = t / TIME;
        const r = rand(0.1, 0.16 + lvl * 0.14);
        const ax2 = aspect() - r;
        let x = 0, y = 0;
        for (let k = 0; k < 12; k++) { x = rand(-ax2, ax2); y = rand(-1 + r, 1 - r); if (Math.hypot(x - pl.x, y - pl.y) > r + 0.3) break; }
        const a = rand(0, TAU), v = rand(0.05, 0.12 + lvl * 0.25);
        hazards.push({ x, y, r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, warn: 0, life: rand(4, 6.5) });
        spawnH = Math.max(0.7, 2.2 - lvl * 1.6);
      }
      for (const z of hazards) {
        if (z.warn < 1) { z.warn += dt / 1.0; continue; }
        z.life -= dt;
        z.x += z.vx * dt; z.y += z.vy * dt;
        const bx = aspect() - z.r;
        if (Math.abs(z.x) > bx) { z.vx *= -1; z.x = Math.sign(z.x) * bx; }
        if (Math.abs(z.y) > 1 - z.r) { z.vy *= -1; z.y = Math.sign(z.y) * (1 - z.r); }
        if (z.life <= 0) z.dead = true;
        if (inv <= 0 && Math.hypot(z.x - pl.x, z.y - pl.y) < z.r + pl.r * 0.7) {
          lives--; inv = 1.4; hurt = 1; lifeHud();
          api.hit(0, { silent: true }); shake(A.box); vibrate([60, 40, 60]);
          if (lives <= 0) { finish(); return; }
        }
      }
      hazards = hazards.filter((z) => !z.dead);
      inv -= dt; hurt = Math.max(0, hurt - dt * 4);
      pl.r = 0.07 * (inv > 0 && Math.floor(t * 12) % 2 ? 0.8 : 1);

      A.draw(uniforms(0));
    });

    api.onCleanup(() => {
      stopLoop();
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      A.destroy();
    });
  },
};
