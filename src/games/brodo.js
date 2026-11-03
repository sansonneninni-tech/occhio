import { h } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';
import { glContext, glStage, program, quad, target } from '../core/glkit.js';

const TIME = 60;
const MAX_PHAGES = 8;
// Gray-Scott feed / kill pairs: each one grows a different living pattern.
const MUTATIONS = [
  { F: 0.0545, K: 0.062, it: 'CORALLO', en: 'CORAL', pal: ['#12001F', '#5B00FF', '#FF2BD6', '#FFE629', '#FFFFFF'] },
  { F: 0.029, K: 0.057, it: 'LABIRINTO', en: 'MAZE', pal: ['#001A12', '#00B37A', '#C6FF00', '#F3EFE6', '#FF4D1F'] },
  { F: 0.0367, K: 0.0649, it: 'MITOSI', en: 'MITOSIS', pal: ['#1F0008', '#E0005A', '#FF8A00', '#29F0FF', '#FFFFFF'] },
  { F: 0.078, K: 0.061, it: 'VERMI', en: 'WORMS', pal: ['#000B2E', '#2D3BFF', '#29F0FF', '#FF2BD6', '#FFE629'] },
];

const SIM_FS = `precision highp float;
varying vec2 v;
uniform sampler2D s; uniform vec2 px; uniform float F; uniform float K;
uniform vec4 brush; uniform vec4 er[${MAX_PHAGES}]; uniform vec4 burst; uniform float seed;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
void main(){
  vec2 c = texture2D(s, v).rg;
  vec2 l = -c
    + 0.2 * (texture2D(s, v + vec2(px.x, 0.0)).rg + texture2D(s, v - vec2(px.x, 0.0)).rg + texture2D(s, v + vec2(0.0, px.y)).rg + texture2D(s, v - vec2(0.0, px.y)).rg)
    + 0.05 * (texture2D(s, v + px).rg + texture2D(s, v - px).rg + texture2D(s, v + vec2(px.x, -px.y)).rg + texture2D(s, v + vec2(-px.x, px.y)).rg);
  float a = c.r, b = c.g, abb = a * b * b;
  float na = a + (1.0 * l.r - abb + F * (1.0 - a));
  float nb = b + (0.5 * l.g + abb - (K + F) * b);
  vec2 d = (v - brush.xy) / px;
  if (brush.w > 0.5 && dot(d, d) < brush.z * brush.z && hash(v * 517.0) > 0.35) nb = 1.0;
  d = (v - burst.xy) / px;
  if (burst.w > 0.5 && dot(d, d) < burst.z * burst.z && hash(v * 911.0) > 0.6) nb = 1.0;
  for (int i = 0; i < ${MAX_PHAGES}; i++) {
    vec2 e = (v - er[i].xy) / px;
    if (er[i].w > 0.5 && dot(e, e) < er[i].z * er[i].z) { na = 1.0; nb = 0.0; }
  }
  gl_FragColor = vec4(clamp(na, 0.0, 1.0), clamp(nb, 0.0, 1.0), 0.0, 1.0);
}`;

const INIT_FS = `precision highp float;
varying vec2 v; uniform vec4 spots[4]; uniform vec2 px;
void main(){
  float b = 0.0;
  for (int i = 0; i < 4; i++) { vec2 d = (v - spots[i].xy) / px; if (dot(d, d) < spots[i].z * spots[i].z) b = 1.0; }
  gl_FragColor = vec4(1.0, b, 0.0, 1.0);
}`;

const SHOW_FS = `precision highp float;
varying vec2 v;
uniform sampler2D s; uniform vec2 px; uniform vec2 size; uniform float t;
uniform vec3 p0; uniform vec3 p1; uniform vec3 p2; uniform vec3 p3; uniform vec3 p4;
float B(vec2 uv){
  vec2 q = uv * size - 0.5; vec2 f = fract(q); vec2 i = (floor(q) + 0.5) / size;
  float a = texture2D(s, i).g, b = texture2D(s, i + vec2(px.x, 0.0)).g;
  float c = texture2D(s, i + vec2(0.0, px.y)).g, d = texture2D(s, i + px).g;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0) * 4.0;
  if (x < 1.0) return mix(p0, p1, x);
  if (x < 2.0) return mix(p1, p2, x - 1.0);
  if (x < 3.0) return mix(p2, p3, x - 2.0);
  return mix(p3, p4, x - 3.0);
}
void main(){
  float b = B(v);
  float gx = B(v + vec2(px.x, 0.0)) - B(v - vec2(px.x, 0.0));
  float gy = B(v + vec2(0.0, px.y)) - B(v - vec2(0.0, px.y));
  vec3 n = normalize(vec3(-gx * 6.0, -gy * 6.0, 1.0));
  vec3 L = normalize(vec3(-0.5, 0.6, 0.8));
  float dif = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
  float k = smoothstep(0.08, 0.38, b);
  float wave = 0.5 + 0.5 * sin(v.x * 4.0 + v.y * 3.0 + t * 0.35) * cos(v.y * 2.5 - t * 0.2);
  vec3 col = mix(p0, ramp(0.25 + 0.75 * fract(wave * 1.3 + b * 0.8 + t * 0.03)), k);
  vec3 iri = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + b * 2.5 + t * 0.08));
  col = mix(col, col * (0.55 + 0.6 * dif) + iri * 0.25 * k, 0.8) + spec * 0.7 * k;
  float vig = smoothstep(1.2, 0.35, length(v - 0.5));
  gl_FragColor = vec4(col * (0.75 + 0.25 * vig), 1.0);
}`;

const COVER_FS = `precision highp float;
varying vec2 v; uniform sampler2D s;
void main(){ gl_FragColor = vec4(step(0.2, texture2D(s, v).g), 0.0, 0.0, 1.0); }`;

const hex3 = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16) / 255);

export default {
  id: 'brodo-primordiale',
  cat: 'folle',
  title: { it: 'Brodo Primordiale', en: 'Primordial Soup' },
  tagline: { it: 'Semina vita chimica che cresce da sola in coralli, labirinti e vermi. Difendila dai fagi e conquista lo schermo.', en: 'Seed chemical life that grows by itself into coral, mazes and worms. Defend it from phages and take over the screen.' },
  how: {
    it: 'Tieni premuto e trascina per seminare: il pattern cresce da solo (reazione-diffusione, come la pelle di una zebra).|Il seme costa inchiostro: la barra si ricarica, scegli bene dove spenderlo.|I fagi azzurri mangiano il tuo pattern: toccali per farli esplodere in nuovi semi.|Ogni 15 secondi la chimica muta. Più schermo copri, più punti. Ti porti a casa il pattern.',
    en: 'Hold and drag to seed: the pattern grows by itself (reaction-diffusion, like zebra skin).|Seeding costs ink: the bar refills, choose where to spend it.|Blue phages eat your pattern: tap them to burst them into new seeds.|Every 15 seconds the chemistry mutates. The more screen you cover, the more points. You take the pattern home.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#12001F"/><g fill="none" stroke-linecap="round" stroke-width="5">${Array.from({ length: 14 }, (_, i) => { const x = (i * 37) % 160, y = (i * 23) % 100; return `<path d="M${x} ${y} q12 -14 22 0 t22 0 q8 10 0 18" stroke="${['#FF2BD6', '#FFE629', '#5B00FF'][i % 3]}"/>`; }).join('')}</g><g transform="translate(112 38)"><polygon points="0,-10 9,-5 9,5 0,10 -9,5 -9,-5" fill="#29F0FF" stroke="#fff" stroke-width="2"/><path d="M0 10 v10 M0 20 l-8 8 M0 20 l8 8" stroke="#29F0FF" stroke-width="2.5"/></g></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    A.box.style.background = '#000';
    A.canvas.style.position = 'relative';
    const glc = glStage(A.box);
    const ctx = glContext(glc, { float: true });
    if (!ctx || !ctx.floatTarget) {
      board.replaceChildren(h('p', { class: 'g-hint' }, api.t({ it: 'Questo browser non supporta la grafica WebGL necessaria. Prova con Chrome, Firefox o Safari aggiornati.', en: 'This browser lacks the WebGL support this game needs. Try an up-to-date Chrome, Firefox or Safari.' })));
      api.timer(3, () => api.end({}));
      return;
    }
    const { gl, floatTarget } = ctx;
    const inkFill = h('i');
    controls.append(h('div', { class: 'f-meter', 'aria-label': api.t({ it: 'Inchiostro', en: 'Ink' }) }, h('small', {}, api.t({ it: 'Inchiostro', en: 'Ink' })), h('span', { class: 'f-meter-bar' }, inkFill)));
    const inp = input(A.canvas);

    const box = A.box.getBoundingClientRect();
    const long = Math.min(520, Math.max(260, Math.round(Math.max(box.width, box.height) / 2.4)));
    const aspect = Math.max(0.3, Math.min(3.5, box.width / Math.max(1, box.height)));
    const SW = aspect >= 1 ? long : Math.round(long * aspect);
    const SH = aspect >= 1 ? Math.round(long / aspect) : long;
    const px = [1 / SW, 1 / SH];
    const CW = 64, CH = Math.max(16, Math.round(64 / aspect));

    const q = quad(gl);
    const sim = program(gl, SIM_FS), init = program(gl, INIT_FS), show = program(gl, SHOW_FS), cover = program(gl, COVER_FS);
    let ta = target(gl, SW, SH, floatTarget), tb = target(gl, SW, SH, floatTarget);
    const tc = target(gl, CW, CH);
    const spots = [];
    for (let i = 0; i < 4; i++) spots.push(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, 6 + Math.random() * 6, 0);
    init.use().fv('spots', new Float32Array(spots)).f('px', ...px);
    q.draw(ta.fb, SW, SH);

    let t = 0, over = false, ink = 1, mut = 0, F = MUTATIONS[0].F, K = MUTATIONS[0].K, coverage = 0, coverT = 0.5, pops = 0, best = 0;
    let phages = [], spawnT = 2.2, burst = null, lastBrush = null;
    let covered = [];
    const pix = new Uint8Array(CW * CH * 4);
    api.hud(api.t({ it: 'Superficie', en: 'Surface' }), '0%', false);

    const finish = () => {
      if (over) return; over = true; stopLoop();
      render();
      const shot = document.createElement('canvas'); shot.width = glc.width; shot.height = glc.height;
      shot.getContext('2d').drawImage(glc, 0, 0);
      api.end({
        summary: api.t({ it: `Massima superficie ${Math.round(best * 100)}% · ${pops} fagi esplosi`, en: `Peak surface ${Math.round(best * 100)}% · ${pops} phages burst` }),
        exports: [{ label: api.t({ it: 'Il tuo pattern vivo (PNG)', en: 'Your living pattern (PNG)' }), run: () => shot.toBlob((b) => download('occhio-brodo-primordiale.png', b), 'image/png') }],
      });
    };
    api.timer(TIME, finish);

    const toUV = (x, y) => [x / A.w, 1 - y / A.h];
    const simPerCss = () => SW / Math.max(1, A.w);

    function spawnPhage() {
      const side = Math.floor(Math.random() * 4);
      const x = side === 0 ? -20 : side === 1 ? A.w + 20 : Math.random() * A.w;
      const y = side === 2 ? -20 : side === 3 ? A.h + 20 : Math.random() * A.h;
      const lvl = t / TIME;
      phages.push({ x, y, r: 16 + Math.random() * 6, sp: 45 + lvl * 70 + Math.random() * 25, tx: A.w / 2, ty: A.h / 2, retarget: 0, ph: Math.random() * TAU, born: t });
    }

    function render() {
      const m = MUTATIONS[mut].pal.map(hex3);
      gl.disable(gl.BLEND);
      show.use().tex('s', 0, ta.tex).f('px', ...px).f('size', SW, SH).f('t', t)
        .f('p0', ...m[0]).f('p1', ...m[1]).f('p2', ...m[2]).f('p3', ...m[3]).f('p4', ...m[4]);
      q.draw(null, glc.width, glc.height);
    }

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      // keep GL canvas sized to the arena
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const gw = Math.round(A.w * dpr), gh = Math.round(A.h * dpr);
      if (glc.width !== gw || glc.height !== gh) { glc.width = gw; glc.height = gh; }

      // mutation every 15 s, eased over 2 s
      const nm = Math.min(MUTATIONS.length - 1, Math.floor(t / 15));
      if (nm !== mut) { mut = nm; stamp(stage, api.t(MUTATIONS[mut]), 'great'); sfx.great(); vibrate(20); }
      F += (MUTATIONS[mut].F - F) * Math.min(1, dt * 1.5);
      K += (MUTATIONS[mut].K - K) * Math.min(1, dt * 1.5);

      // pointer: pop a phage or seed
      let seeding = false;
      if (inp.justDown) {
        const hit = phages.find((p) => Math.hypot(p.x - inp.x, p.y - inp.y) < p.r + 22);
        if (hit) {
          hit.dead = true; pops++;
          burst = { x: hit.x, y: hit.y, life: 3 };
          const p = toStage(stage, A.box, hit.x, hit.y);
          api.hit(1, { x: p.x, y: p.y, silent: true });
          sfx.good(); vibrate(25);
          if (pops % 5 === 0) stamp(stage, api.t({ it: `${pops} FAGI!`, en: `${pops} PHAGES!` }), 'great');
          inp.justDown = false; inp.popLock = true;
        }
      }
      if (inp.justUp || !inp.down) inp.popLock = false;
      if (inp.down && !inp.popLock && ink > 0.02) { seeding = true; ink = Math.max(0, ink - dt * 0.55); }
      else ink = Math.min(1, ink + dt * (inp.down ? 0.05 : 0.28));
      inkFill.style.transform = `scaleX(${ink.toFixed(3)})`;

      // phages
      spawnT -= dt;
      if (spawnT <= 0 && phages.length < MAX_PHAGES) { spawnPhage(); spawnT = Math.max(0.9, 3 - (t / TIME) * 2.2); }
      for (const p of phages) {
        p.retarget -= dt;
        if (p.retarget <= 0) {
          if (covered.length) { const c = covered[Math.floor(Math.random() * covered.length)]; p.tx = c[0] * A.w; p.ty = c[1] * A.h; }
          p.retarget = 1.2 + Math.random();
        }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1;
        p.x += (dx / d) * p.sp * dt + Math.sin(t * 3 + p.ph) * 20 * dt;
        p.y += (dy / d) * p.sp * dt + Math.cos(t * 2.6 + p.ph) * 20 * dt;
        p.ph += dt * 6;
      }
      phages = phages.filter((p) => !p.dead);

      // simulate
      const er = new Float32Array(MAX_PHAGES * 4);
      const k = simPerCss();
      phages.forEach((p, i) => { const [u, v] = toUV(p.x, p.y); er.set([u, v, p.r * 0.9 * k, 1], i * 4); });
      const cur = toUV(inp.x, inp.y);
      const from = lastBrush || cur;
      const bs = burst ? [...toUV(burst.x, burst.y), 26 * k, 1] : [0, 0, 0, 0];
      sim.use().f('px', ...px).f('F', F).f('K', K).fv('er', er).f('burst', ...bs).f('seed', Math.random() * 100);
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const f = (i + 1) / steps;
        sim.f('brush', from[0] + (cur[0] - from[0]) * f, from[1] + (cur[1] - from[1]) * f, Math.max(3, 9 * k * 2.2), seeding ? 1 : 0);
        sim.tex('s', 0, ta.tex);
        q.draw(tb.fb, SW, SH);
        [ta, tb] = [tb, ta];
      }
      if (burst && --burst.life <= 0) burst = null;
      lastBrush = seeding ? cur : null;

      // coverage sample
      coverT -= dt;
      if (coverT <= 0) {
        coverT = 0.5;
        cover.use().tex('s', 0, ta.tex);
        q.draw(tc.fb, CW, CH);
        gl.readPixels(0, 0, CW, CH, gl.RGBA, gl.UNSIGNED_BYTE, pix);
        let n = 0; covered = [];
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (pix[(y * CW + x) * 4] > 127) { n++; if ((x + y) % 3 === 0) covered.push([(x + 0.5) / CW, 1 - (y + 0.5) / CH]); }
        coverage = n / (CW * CH);
        best = Math.max(best, coverage);
        api.add(Math.round(coverage * 40));
        api.hud(api.t({ it: 'Superficie', en: 'Surface' }), `${Math.round(coverage * 100)}%`, false);
      }

      render();

      // overlay: phages and brush
      const g = A.g;
      g.clearRect(0, 0, A.w, A.h);
      for (const p of phages) drawPhage(g, p, t);
      if (inp.down && !inp.popLock) {
        g.strokeStyle = ink > 0.02 ? '#FFFFFF' : '#FF0033'; g.lineWidth = 2; g.setLineDash([4, 5]);
        g.beginPath(); g.arc(inp.x, inp.y, 9 * 2.2 + Math.sin(t * 12) * 2, 0, TAU); g.stroke(); g.setLineDash([]);
      }
      inp.frame();
    });

    api.onCleanup(() => {
      stopLoop(); inp.destroy(); A.destroy();
      [ta, tb, tc].forEach((x) => x.dispose()); [sim, init, show, cover].forEach((x) => x.dispose()); q.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    });
  },
};

// A bacteriophage: icosahedral head, collar, tail, six twitching legs.
function drawPhage(g, p, t) {
  const r = p.r;
  const a = Math.atan2(p.ty - p.y, p.tx - p.x) - Math.PI / 2;
  g.save(); g.translate(p.x, p.y); g.rotate(a + Math.PI);
  g.shadowColor = '#29F0FF'; g.shadowBlur = 16;
  g.strokeStyle = '#29F0FF'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, r * 0.6); g.lineTo(0, r * 1.7); g.stroke();
  for (let i = 0; i < 6; i++) {
    const s = i < 3 ? -1 : 1, k = i % 3;
    const w = Math.sin(t * 9 + p.ph + i) * 0.35;
    g.beginPath(); g.moveTo(0, r * 1.7);
    g.lineTo(s * r * (0.5 + k * 0.35), r * (2.0 + w * 0.3)); g.lineTo(s * r * (0.7 + k * 0.45), r * (2.6 + w)); g.stroke();
  }
  const grd = g.createLinearGradient(-r, -r, r, r);
  grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(0.45, '#29F0FF'); grd.addColorStop(1, '#2D3BFF');
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i < 6; i++) { const q = (i / 6) * TAU + Math.PI / 6; i ? g.lineTo(Math.cos(q) * r, Math.sin(q) * r - r * 0.2) : g.moveTo(Math.cos(q) * r, Math.sin(q) * r - r * 0.2); }
  g.closePath(); g.fill();
  g.shadowBlur = 0; g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(14,14,16,0.5)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-r * 0.86, -r * 0.7); g.lineTo(0, -r * 0.2); g.lineTo(r * 0.86, -r * 0.7); g.moveTo(0, -r * 0.2); g.lineTo(0, r * 0.8); g.stroke();
  // angry eye
  g.fillStyle = '#0E0E10'; g.beginPath(); g.arc(0, -r * 0.25, r * 0.28, 0, TAU); g.fill();
  g.fillStyle = '#FF0033'; g.beginPath(); g.arc(0, -r * 0.25, r * 0.13, 0, TAU); g.fill();
  g.restore();
}
