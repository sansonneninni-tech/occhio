import { h, rand } from '../core/dom.js';
import { loop, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { shaderStage, renderShaderPNG } from '../core/gl.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 70;
const L = 8;         // length of one cell of the tunnel
const R = 2.2;       // tunnel radius
const NC = 6;        // cells sent to the shader
const BAR_H = 0.28, BAR_Z = 0.3, PR = 0.13, RING_R = 0.6;

// Raymarched infinite tunnel carved like a fractal, with crossbars and rings of light.
const FRAG = `
uniform vec2 u_res, u_cam;
uniform float u_t, u_z, u_k0, u_mut, u_hue, u_roll, u_flash, u_speed;
uniform vec4 u_bar[${NC}];
uniform vec4 u_ring[${NC}];
const float L = ${L.toFixed(1)}, R = ${R.toFixed(2)};

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2831 * (vec3(1.0, 1.0, 1.0) * t + vec3(0.0, 0.33, 0.67) + u_hue)); }

void cell(float k, out vec4 bar, out vec4 ring){
  bar = vec4(0.0); ring = vec4(0.0);
  for (int i = 0; i < ${NC}; i++) {
    if (abs(float(i) - (k - u_k0)) < 0.5) { bar = u_bar[i]; ring = u_ring[i]; }
  }
}
float barD(vec3 p, vec4 bar, float lz){
  if (bar.w < 0.5) return 1e3;
  vec2 q = rot(-(bar.x + bar.z * u_t)) * p.xy;
  float d = sdBox(vec3(q, lz), vec3(R + 1.0, ${BAR_H}, ${BAR_Z}));
  if (bar.y > 0.5) d = min(d, sdBox(vec3(q.y, q.x, lz), vec3(R + 1.0, ${BAR_H}, ${BAR_Z})));
  return d;
}
float ringD(vec3 p, vec4 ring, float lz){
  if (ring.z < 0.5) return 1e3;
  vec2 tq = vec2(length(p.xy - ring.xy) - ${RING_R}, lz);
  return length(tq) - 0.045;
}

float gRing;
vec4 gBar;
float map(vec3 p, out float mat){
  float len = length(p.xy);
  vec2 q2 = rot(p.z * 0.07 + u_mut * 0.5) * p.xy;
  float a = atan(q2.y, q2.x);
  float seg = 8.0 + 2.0 * mod(floor(u_mut), 4.0);
  float sa = 6.2831853 / seg;
  float ai = mod(a + sa * 0.5, sa) - sa * 0.5;
  vec3 c = vec3(len - R - 0.5, ai * R, mod(p.z, 1.6) - 0.8);
  float hole = sdBox(c, vec3(0.55, 0.3 * sa * R, 0.52));
  vec3 c2 = vec3(c.x - 0.6, mod(c.y + 0.22, 0.44) - 0.22, mod(p.z + 0.2, 0.4) - 0.2);
  float hole2 = sdBox(c2, vec3(0.9, 0.07 + 0.05 * sin(u_mut), 0.07));
  float d = max(R - len, -min(hole, hole2));
  mat = 0.0;
  float k = floor(p.z / L);
  float lz = p.z - k * L;
  vec4 bar, ring, bar2, ring2;
  cell(k, bar, ring); cell(k + 1.0, bar2, ring2);
  float db = barD(p, bar, lz - L * 0.5);
  if (db < d) { d = db; mat = 1.0; gBar = bar; }
  float dr = min(ringD(p, ring, lz), ringD(p, ring2, lz - L));
  gRing += 0.0008 / (0.004 + dr * dr);
  if (dr < d) { d = dr; mat = 2.0; }
  // Never step past the next cell boundary without looking at it.
  return min(d, min(lz, L - lz) + 0.5);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv = rot(u_roll) * uv;
  float fov = 1.0 + u_speed * 0.012;
  vec3 ro = vec3(u_cam, u_z);
  vec3 rd = normalize(vec3(uv * fov, 1.0));
  float t = 0.05, mat = 0.0, m;
  gRing = 0.0;
  float steps = 0.0;
  for (int i = 0; i < 64; i++) {
    float d = map(ro + rd * t, m);
    if (d < 0.002 * t) { mat = m; break; }
    t += d;
    steps += 1.0;
    if (t > 60.0) { mat = -1.0; break; }
  }
  vec3 p = ro + rd * t;
  vec3 col = vec3(0.0);
  if (mat >= 0.0) {
    vec2 e = vec2(0.004, -0.004);
    float q;
    vec3 n = normalize(e.xyy * map(p + e.xyy, q) + e.yyx * map(p + e.yyx, q) + e.yxy * map(p + e.yxy, q) + e.xxx * map(p + e.xxx, q));
    float dif = max(0.0, dot(n, -rd));
    float rim = pow(1.0 - dif, 3.0);
    float ao = 1.0 - steps / 64.0;
    if (mat < 0.5) {
      vec3 base = pal(p.z * 0.025 + length(p.xy) * 0.4);
      float lines = smoothstep(0.92, 1.0, abs(sin(p.z * 3.1416 / 0.4)));
      col = base * (0.15 + 0.85 * dif) * ao + rim * pal(p.z * 0.02 + 0.5) * 1.4 + lines * base * 0.5;
    } else if (mat < 1.5) {
      vec2 q = rot(-(gBar.x + gBar.z * u_t)) * p.xy;
      float stripe = step(0.0, sin((q.x + q.y) * 9.0));
      col = mix(vec3(0.02), vec3(1.0, 0.1, 0.35), stripe) * (0.4 + 0.8 * dif) + rim * vec3(1.0, 0.4, 0.6);
    } else {
      col = vec3(1.0);
    }
  }
  float fog = exp(-t * 0.045);
  col = mix(pal(u_z * 0.01 + 0.3) * 0.05, col, fog);
  col += min(gRing, 3.0) * mix(vec3(1.0), pal(u_t * 0.1), 0.5) * 0.25;
  col = mix(col, vec3(1.0, 0.1, 0.3), u_flash * 0.6);
  col *= 1.0 - 0.45 * dot(uv, uv);
  col = pow(col, vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}`;

export default {
  id: 'iperspazio',
  cat: 'folle',
  title: { it: 'Iperspazio', en: 'Hyperspace' },
  tagline: { it: 'Vola dentro un frattale infinito. Ogni anello di luce lo fa mutare. Il fotogramma finale è tuo.', en: 'Fly inside an endless fractal. Every ring of light mutates it. The final frame is yours.' },
  how: {
    it: 'Guidi col mouse, con le frecce o trascinando il dito. Il mirino al centro sei tu.|Passa dentro gli anelli di luce: più sei al centro, più punti e più velocità.|Evita le sbarre a strisce rosa: ogni urto costa una vita. Gli anelli fanno mutare forme e colori.',
    en: 'Steer with the mouse, arrow keys or by dragging a finger. The crosshair in the middle is you.|Fly through the rings of light: the closer to the center, the more points and speed.|Avoid the pink striped bars: every crash costs a life. Rings mutate shapes and colors.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#05030a"/>${Array.from({ length: 7 }, (_, i) => { const r = 6 + i * i * 2.2; return `<rect x="${80 - r}" y="${50 - r * 0.7}" width="${r * 2}" height="${r * 1.4}" fill="none" stroke="hsl(${200 + i * 25} 100% 60%)" stroke-width="${1 + i * 0.5}" transform="rotate(${i * 9} 80 50)"/>`; }).join('')}<rect x="20" y="46" width="120" height="8" fill="#FF1A5A" transform="rotate(-18 80 50)"/><circle cx="80" cy="50" r="10" fill="none" stroke="#fff" stroke-width="2.5"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    let A;
    try { A = shaderStage(board, FRAG, { maxDpr: 1, scale: 0.75 }); } catch (e) { board.append(h('p', { class: 'g-hint' }, String(e.message || e))); return; }
    const cv = A.canvas;
    const hud = h('canvas', { style: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' } });
    A.box.append(hud);
    const hg = hud.getContext('2d');
    A.box.style.background = '#000';
    const speedLabel = h('b', { class: 'keys-hint', style: { display: 'inline' } }, '');
    controls.append(speedLabel, h('span', { class: 'keys-hint' }, api.t({ it: ' · mouse o frecce', en: ' · mouse or arrows' })));

    const cells = new Map();
    const getCell = (k) => {
      if (!cells.has(k)) {
        const lvl = Math.min(1, k / 60);
        const ra = rand(0, TAU), rr = rand(0.2, R - 0.9);
        cells.set(k, {
          bar: k >= 2 && Math.random() < 0.75 + lvl * 0.25,
          theta: rand(0, Math.PI),
          dbl: k > 12 && Math.random() < 0.15 + lvl * 0.45,
          spin: k > 20 && Math.random() < 0.2 + lvl * 0.5 ? rand(-0.5, 0.5) * (0.5 + lvl) : 0,
          rx: Math.cos(ra) * rr, ry: Math.sin(ra) * rr,
          ring: k >= 1, passed: false,
        });
        if (cells.size > 40) cells.delete(Math.min(...cells.keys()));
      }
      return cells.get(k);
    };

    const pl = { x: 0, y: 0, tx: 0, ty: 0, z: 0 };
    let t = 0, speed = 9, boost = 0, lives = 3, inv = 0, flash = 0, over = false, mut = rand(0, 4), hue = rand(0, 1), roll = 0;
    let rings = 0, distAcc = 0, relative = false, lastPX = 0, lastPY = 0;
    const keys = new Set();
    const lifeHud = () => api.hud(api.t({ it: 'Vite', en: 'Lives' }), '◆'.repeat(Math.max(0, lives)) || '–');
    lifeHud();

    const toTarget = (cx, cy) => {
      const r = cv.getBoundingClientRect();
      const nx = ((cx - r.left) / r.width - 0.5) * 2, ny = -((cy - r.top) / r.height - 0.5) * 2;
      pl.tx = nx * (R - 0.35); pl.ty = ny * (R - 0.35);
    };
    const onDown = (e) => { relative = e.pointerType !== 'mouse'; lastPX = e.clientX; lastPY = e.clientY; cv.setPointerCapture?.(e.pointerId); if (!relative) toTarget(e.clientX, e.clientY); e.preventDefault(); };
    const onMove = (e) => {
      if (e.pointerType === 'mouse') { relative = false; toTarget(e.clientX, e.clientY); return; }
      const r = cv.getBoundingClientRect(), k = (2 * (R - 0.35)) / Math.min(r.width, r.height) * 1.6;
      pl.tx += (e.clientX - lastPX) * k; pl.ty -= (e.clientY - lastPY) * k;
      lastPX = e.clientX; lastPY = e.clientY;
    };
    const KEYMAP = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' };
    const kd = (e) => { const k = KEYMAP[e.key]; if (k) { e.preventDefault(); keys.add(k); } };
    const ku = (e) => keys.delete(KEYMAP[e.key]);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const uniforms = () => {
      const k0 = Math.floor(pl.z / L);
      const B = new Float32Array(NC * 4), G = new Float32Array(NC * 4);
      for (let i = 0; i < NC; i++) {
        const c = getCell(k0 + i);
        B.set([c.theta, c.dbl ? 1 : 0, c.spin, c.bar ? 1 : 0], i * 4);
        G.set([c.rx, c.ry, c.ring && !c.passed ? 1 : 0, 0], i * 4);
      }
      return {
        u_cam: [pl.x, pl.y], u_t: t, u_z: pl.z, u_k0: k0, u_mut: mut, u_hue: hue, u_roll: roll,
        u_flash: flash, u_speed: speed + boost, u_bar: { vec: 4, data: B }, u_ring: { vec: 4, data: G },
      };
    };

    const finish = () => {
      if (over) return; over = true; stopLoop();
      const snap = uniforms();
      snap.u_flash = 0;
      const params = { mutation: +mut.toFixed(3), hue: +hue.toFixed(3), depth: +pl.z.toFixed(1), rings, name: store.name || 'anonimo', score: api.score };
      api.end({
        exports: [
          { label: api.t({ it: 'Fotogramma (PNG 4K)', en: 'Frame (PNG 4K)' }), run: async () => download('occhio-iperspazio.png', await renderShaderPNG(FRAG, 3840, 2160, snap)) },
          { label: api.t({ it: 'Il tuo shader (.frag)', en: 'Your shader (.frag)' }), run: () => download('occhio-iperspazio.frag', `// Occhio · Iperspazio\n// ${JSON.stringify(params)}\n// Uniforms at the end of your run:\n// ${JSON.stringify({ u_cam: snap.u_cam, u_z: snap.u_z, u_mut: snap.u_mut, u_hue: snap.u_hue })}\n${FRAG}`) },
        ],
        summary: api.t({ it: `${rings} anelli, ${Math.round(pl.z)} metri di frattale.`, en: `${rings} rings, ${Math.round(pl.z)} meters of fractal.` }),
      });
    };
    api.timer(TIME, finish);

    let slowAcc = 0, slowN = 0;
    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      slowAcc += dt; slowN++;
      if (slowN >= 40) { if (slowAcc / slowN > 0.026 && A.scale > 0.35) A.setScale(A.scale * 0.8); slowAcc = 0; slowN = 0; }

      if (keys.size) {
        const kx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), ky = (keys.has('u') ? 1 : 0) - (keys.has('d') ? 1 : 0);
        pl.tx = pl.x + kx * 0.8; pl.ty = pl.y + ky * 0.8;
      }
      const lim = R - PR - 0.05, tl = Math.hypot(pl.tx, pl.ty);
      if (tl > lim) { pl.tx *= lim / tl; pl.ty *= lim / tl; }
      const ox = pl.x;
      const ease = 1 - Math.exp(-dt * 7);
      pl.x += (pl.tx - pl.x) * ease; pl.y += (pl.ty - pl.y) * ease;
      roll += ((-(pl.x - ox) / Math.max(dt, 1e-3)) * 0.06 - roll) * Math.min(1, dt * 5);

      const v = speed + boost;
      const z0 = pl.z;
      pl.z += v * dt;
      speed = Math.min(26, speed + dt * 0.14);
      boost = Math.max(0, boost - dt * 1.6);
      distAcc += v * dt;
      if (distAcc > 10) { api.add(Math.floor(distAcc)); distAcc -= Math.floor(distAcc); }

      // Ring crossings at cell boundaries.
      const kA = Math.floor(z0 / L), kB = Math.floor(pl.z / L);
      for (let k = kA + 1; k <= kB; k++) {
        const c = getCell(k);
        if (!c.ring || c.passed) continue;
        const d = Math.hypot(pl.x - c.rx, pl.y - c.ry);
        if (d < RING_R + 0.05) {
          c.passed = true; rings++;
          const q = Math.max(0.5, 1 - d / RING_R * 0.6);
          const s = toStage(stage, A.box, A.w / 2, A.h * 0.45);
          api.hit(q, { x: s.x, y: s.y, silent: q < 0.95, speed: Math.min(1, v / 26) });
          boost = Math.min(10, boost + 3 + q * 2);
          mut += 1; hue += 0.13;
          vibrate(15);
          if (rings % 10 === 0) stamp(stage, api.t({ it: `MUTAZIONE ${rings / 10}`, en: `MUTATION ${rings / 10}` }), 'great');
        } else {
          api.hit(0.3, { silent: true, quiet: true });
        }
      }
      // Bars.
      if (inv <= 0) {
        const k = Math.floor(pl.z / L), c = getCell(k);
        const lz = pl.z - k * L - L / 2;
        if (c.bar && Math.abs(lz) < BAR_Z + PR) {
          const th = c.theta + c.spin * t;
          // Same rotation as rot(-th) * p.xy in the shader.
          const dx = Math.abs(Math.cos(th) * pl.x - Math.sin(th) * pl.y);
          const dy = Math.abs(Math.sin(th) * pl.x + Math.cos(th) * pl.y);
          if (dy < BAR_H + PR || (c.dbl && dx < BAR_H + PR)) {
            lives--; inv = 1.3; flash = 1; speed = Math.max(9, speed * 0.7); boost = 0; lifeHud();
            api.hit(0, { silent: true }); shake(A.box); vibrate([70, 40, 70]);
            if (lives <= 0) { finish(); return; }
          }
        }
      }
      inv -= dt; flash = Math.max(0, flash - dt * 2.5);

      A.draw(uniforms());
      // Crosshair.
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (hud.width !== Math.round(A.w * dpr)) { hud.width = Math.round(A.w * dpr); hud.height = Math.round(A.h * dpr); }
      hg.setTransform(dpr, 0, 0, dpr, 0, 0);
      hg.clearRect(0, 0, A.w, A.h);
      const cx = A.w / 2, cy = A.h / 2, rr = Math.min(A.w, A.h) * 0.035;
      hg.strokeStyle = inv > 0 && Math.floor(t * 12) % 2 ? '#FF1A5A' : '#fff'; hg.lineWidth = 2;
      hg.beginPath(); hg.arc(cx, cy, rr, 0, TAU); hg.stroke();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t; hg.beginPath(); hg.moveTo(cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr * 1.4); hg.lineTo(cx + Math.cos(a) * rr * 2, cy + Math.sin(a) * rr * 2); hg.stroke(); }
      speedLabel.textContent = `${Math.round(v * 36)} km/h · ${Math.round(pl.z)} m`;
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
