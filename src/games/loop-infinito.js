import { h } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx, animate } from '../core/fx.js';
import { glContext, glStage, program, quad, target, canvasTexture } from '../core/glkit.js';
import { reduceMotion } from '../core/dom.js';

const TIME = 60;
const STEP = 6;

// Video feedback: last frame, zoomed, spun and hue-shifted, under the fresh ink.
const FB_FS = `precision mediump float;
varying vec2 v;
uniform sampler2D prev; uniform sampler2D ink;
uniform vec2 c; uniform float zoom; uniform float rot; uniform float hue; uniform float decay; uniform float t; uniform float aspect; uniform float warp;
vec3 hueShift(vec3 col, float a){
  const mat3 toY = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toR = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 y = toY * col; float s = sin(a), co = cos(a);
  y.yz = mat2(co, -s, s, co) * y.yz;
  return toR * y;
}
void main(){
  vec2 p = v - c; p.x *= aspect;
  float s = sin(rot), co = cos(rot);
  p = mat2(co, -s, s, co) * p / zoom;
  p += warp * 0.004 * vec2(sin(p.y * 14.0 + t * 2.0), cos(p.x * 14.0 + t * 1.7));
  p.x /= aspect;
  vec2 uv = p + c;
  vec3 col = texture2D(prev, uv).rgb * decay;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) col = vec3(0.0);
  col = clamp(hueShift(col, hue), 0.0, 1.0);
  vec4 k = texture2D(ink, v);
  gl_FragColor = vec4(mix(col, k.rgb, k.a), 1.0);
}`;

const SHOW_FS = `precision mediump float;
varying vec2 v; uniform sampler2D s; uniform vec2 c; uniform float ab;
void main(){
  vec2 d = (v - c) * ab;
  gl_FragColor = vec4(texture2D(s, v + d).r, texture2D(s, v).g, texture2D(s, v - d).b, 1.0);
}`;

export default {
  id: 'loop-infinito',
  cat: 'folle',
  title: { it: 'Loop Infinito', en: 'Infinite Loop' },
  tagline: { it: 'Un serpente dentro un feedback video senza fine: ogni curva fa girare il tunnel. Mangia occhi e scatta la tua allucinazione.', en: 'A snake inside endless video feedback: every turn spins the tunnel. Eat eyes and snap your hallucination.' },
  how: {
    it: 'Il serpente segue il mouse o il dito (o frecce ← →). Passa sui bordi e ricompari dall’altra parte.|Mangia gli occhi per crescere: mangiarli uno dopo l’altro alza la combo.|Non morderti la coda e stai lontano dai buchi neri. L’occhio d’oro scatena il TRIP: punti doppi.|Premi Scatta (o P) per fotografare il tunnel: le foto e l’ultimo fotogramma sono la tua opera. Luci lampeggianti.',
    en: 'The snake follows your mouse or finger (or ← → arrows). Go off an edge and you come back on the other side.|Eat eyes to grow: eating them back to back raises the combo.|Don’t bite your tail and keep away from black holes. The golden eye unleashes the TRIP: double points.|Press Snap (or P) to photograph the tunnel: the shots and the last frame are your artwork. Flashing lights.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#000"/>${[0, 1, 2, 3, 4, 5].map((i) => { const s = 1 - i * 0.16; return `<g transform="translate(80 50) rotate(${i * 14}) scale(${s})"><path d="M-70 20 C-40 -30 -10 40 20 -6 S60 -30 70 10" fill="none" stroke="${['#FF2BD6', '#29F0FF', '#C6FF00', '#FFE629', '#FF4D1F', '#5B00FF'][i]}" stroke-width="${12 - i}" stroke-linecap="round" opacity="${1 - i * 0.12}"/></g>`; }).join('')}<circle cx="150" cy="60" r="7" fill="#fff"/><circle cx="152" cy="60" r="3.5" fill="#0E0E10"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    A.box.style.background = '#000';
    A.canvas.style.position = 'relative';
    A.canvas.style.opacity = '0';
    const glc = glStage(A.box);
    const ctx = glContext(glc);
    if (!ctx) {
      board.replaceChildren(h('p', { class: 'g-hint' }, api.t({ it: 'Questo browser non supporta WebGL. Prova con Chrome, Firefox o Safari aggiornati.', en: 'This browser lacks WebGL. Try an up-to-date Chrome, Firefox or Safari.' })));
      api.timer(3, () => api.end({}));
      return;
    }
    const { gl } = ctx;
    const shots = [];
    const shotBtn = h('button', { class: 'btn f-shot', type: 'button' }, api.t({ it: 'Scatta', en: 'Snap' }), h('span', {}, ' 0/5'));
    controls.append(shotBtn, h('span', { class: 'keys-hint' }, api.t({ it: 'Il serpente segue il puntatore · P per scattare', en: 'The snake follows your pointer · P to snap' })));
    const inp = input(A.canvas);
    const calm = reduceMotion();

    const q = quad(gl);
    const fbp = program(gl, FB_FS), show = program(gl, SHOW_FS);
    const inkTex = canvasTexture(gl);
    const ink = document.createElement('canvas');
    const ig = ink.getContext('2d');
    let ta = null, tb = null, RES = 1;
    const ensureSize = () => {
      RES = Math.min(1.25, window.devicePixelRatio || 1);
      const w = Math.max(16, Math.round(A.w * RES)), hh = Math.max(16, Math.round(A.h * RES));
      if (glc.width === w && glc.height === hh && ta) return;
      glc.width = w; glc.height = hh; ink.width = w; ink.height = hh;
      ta?.dispose(); tb?.dispose();
      ta = target(gl, w, hh); tb = target(gl, w, hh);
    };
    ensureSize();

    let t = 0, over = false, lives = 3, inv = 0, hue = Math.random() * 360, trip = 0, lastEat = -9, eaten = 0;
    const head = { x: A.w * 0.3, y: A.h * 0.5, a: 0 };
    let body = [{ x: head.x, y: head.y }], len = 140, sinceStep = 0;
    let eyes = [], holes = [], goldT = 9, holeT = 14, spinDir = 1, spinAmt = 0, flash = 0, usedPointer = false;
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '◆◆◆', false);

    const addEye = (gold = false) => {
      for (let k = 0; k < 30; k++) {
        const x = 40 + Math.random() * (A.w - 80), y = 40 + Math.random() * (A.h - 80);
        if (Math.hypot(x - head.x, y - head.y) < 120) continue;
        eyes.push({ x, y, r: gold ? 20 : 15, gold, born: t, ph: Math.random() * TAU }); return;
      }
    };
    for (let i = 0; i < 4; i++) addEye();

    function snap() {
      if (shots.length >= 5 || over) return;
      const c = document.createElement('canvas'); c.width = glc.width; c.height = glc.height;
      c.getContext('2d').drawImage(glc, 0, 0);
      shots.push(c);
      shotBtn.lastChild.textContent = ` ${shots.length}/5`;
      flash = 1; sfx.tap(); vibrate(10);
      animate(shotBtn, [{ transform: 'scale(1.15)' }, { transform: 'none' }], { duration: 220, fill: 'none' });
    }
    shotBtn.onclick = snap;

    const finish = () => {
      if (over) return; over = true; stopLoop();
      const last = document.createElement('canvas'); last.width = glc.width; last.height = glc.height;
      last.getContext('2d').drawImage(glc, 0, 0);
      const ex = [{ label: api.t({ it: 'Ultimo fotogramma (PNG)', en: 'Last frame (PNG)' }), run: () => last.toBlob((b) => download('occhio-loop-infinito.png', b), 'image/png') }];
      shots.forEach((c, i) => ex.push({ label: api.t({ it: `Scatto ${i + 1} (PNG)`, en: `Shot ${i + 1} (PNG)` }), run: () => c.toBlob((b) => download(`occhio-loop-${i + 1}.png`, b), 'image/png') }));
      api.end({ summary: api.t({ it: `${eaten} occhi mangiati · serpente lungo ${Math.round(len)} px`, en: `${eaten} eyes eaten · snake ${Math.round(len)} px long` }), exports: ex });
    };
    api.timer(TIME, finish);

    function hurt(label) {
      lives--; inv = 1.4; api.hit(0, { silent: true }); shake(A.box); vibrate([50, 30, 50]); sfx.bad();
      stamp(stage, label, 'bad');
      api.hud(api.t({ it: 'Vite', en: 'Lives' }), '◆'.repeat(Math.max(0, lives)) || '–');
      if (lives <= 0) finish();
    }

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      ensureSize();
      const lvl = t / TIME;
      if (inp.keys.has('p') || inp.keys.has('P')) { if (inp.pressed.has('p') || inp.pressed.has('P')) snap(); }

      // steering
      let turn = 0;
      if (inp.keys.has('ArrowLeft') || inp.keys.has('a') || inp.keys.has('A')) { turn = -1; usedPointer = false; }
      if (inp.keys.has('ArrowRight') || inp.keys.has('d') || inp.keys.has('D')) { turn = 1; usedPointer = false; }
      if (inp.moved && !turn) usedPointer = true;
      const maxTurn = 4.6;
      if (!turn && usedPointer && (inp.down || !matchMedia('(pointer: coarse)').matches)) {
        const want = Math.atan2(inp.y - head.y, inp.x - head.x);
        const d = Math.atan2(Math.sin(want - head.a), Math.cos(want - head.a));
        if (Math.hypot(inp.x - head.x, inp.y - head.y) > 12) turn = Math.max(-1, Math.min(1, d * 3));
      }
      head.a += turn * maxTurn * dt;
      spinAmt += (turn - spinAmt) * Math.min(1, dt * 3);
      const speed = (190 + lvl * 90) * (trip > 0 ? 1.15 : 1);
      head.x += Math.cos(head.a) * speed * dt; head.y += Math.sin(head.a) * speed * dt;
      let wrapped = false;
      if (head.x < 0) { head.x += A.w; wrapped = true; } if (head.x > A.w) { head.x -= A.w; wrapped = true; }
      if (head.y < 0) { head.y += A.h; wrapped = true; } if (head.y > A.h) { head.y -= A.h; wrapped = true; }
      sinceStep += speed * dt;
      if (sinceStep >= STEP || wrapped) { body.unshift({ x: head.x, y: head.y, cut: wrapped }); sinceStep = 0; }
      const maxPts = Math.ceil(len / STEP);
      if (body.length > maxPts) body.length = maxPts;

      // self bite
      inv = Math.max(0, inv - dt);
      if (inv <= 0) {
        for (let i = 9; i < body.length; i++) {
          if (Math.hypot(body[i].x - head.x, body[i].y - head.y) < 9) {
            len = Math.max(80, i * STEP); body.length = Math.min(body.length, i);
            hurt(api.t({ it: 'MORSO!', en: 'BITTEN!' }));
            break;
          }
        }
      }
      // eyes
      for (const e of eyes) {
        if (Math.hypot(e.x - head.x, e.y - head.y) < e.r + 10) {
          e.dead = true; eaten++;
          len += e.gold ? 70 : 38;
          const quick = t - lastEat < 2.6; lastEat = t;
          const p = toStage(stage, A.box, e.x, e.y);
          api.hit(quick || e.gold ? 1 : 0.7, { x: p.x, y: p.y, silent: true });
          api.add((trip > 0 ? 2 : 1) * Math.round(len / 10));
          if (e.gold) { trip = 4.5; stamp(stage, 'TRIP!', 'great'); sfx.record(); vibrate([20, 20, 60]); }
          else { sfx.good(); vibrate(12); }
          if (eaten % 10 === 0) stamp(stage, `${eaten}!`, 'great');
        }
        if (e.gold && t - e.born > 6) e.dead = true;
      }
      eyes = eyes.filter((e) => !e.dead);
      while (eyes.filter((e) => !e.gold).length < 4) addEye();
      goldT -= dt;
      if (goldT <= 0) { addEye(true); goldT = 10 + Math.random() * 4; }
      // black holes
      holeT -= dt;
      if (holeT <= 0 && holes.length < 1 + Math.floor(lvl * 4)) {
        const x = Math.random() * A.w, y = Math.random() * A.h;
        if (Math.hypot(x - head.x, y - head.y) > 200) holes.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, r: 24 + Math.random() * 10, born: t });
        holeT = 5 - lvl * 2.5;
      }
      for (const o of holes) {
        o.x = (o.x + o.vx * dt + A.w) % A.w; o.y = (o.y + o.vy * dt + A.h) % A.h;
        const grow = Math.min(1, (t - o.born) / 1.2);
        if (grow >= 1 && inv <= 0 && Math.hypot(o.x - head.x, o.y - head.y) < o.r + 8) { o.dead = true; hurt(api.t({ it: 'RISUCCHIATO', en: 'SWALLOWED' })); }
      }
      holes = holes.filter((o) => !o.dead && t - o.born < 14);
      trip = Math.max(0, trip - dt);
      flash = Math.max(0, flash - dt * 3);
      hue = (hue + dt * (trip > 0 ? 160 : 40)) % 360;

      // ---- ink layer ----
      const S = RES, g = ig;
      g.setTransform(S, 0, 0, S, 0, 0);
      g.clearRect(0, 0, A.w, A.h);
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const o of holes) {
        const grow = Math.min(1, (t - o.born) / 1.2), r = o.r * grow;
        g.fillStyle = '#000'; g.beginPath(); g.arc(o.x, o.y, r * 1.25, 0, TAU); g.fill();
        g.strokeStyle = '#FFFFFF'; g.lineWidth = 2.5;
        for (let k = 0; k < 3; k++) { g.beginPath(); for (let i = 0; i < 30; i++) { const f = i / 30, a = t * 5 + k * 2.1 + f * 7, rr = r * (1 - f); i ? g.lineTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr) : g.moveTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr); } g.stroke(); }
      }
      for (const e of eyes) drawEye(g, e, head, t);
      // snake body: black outline, then a rainbow ribbon
      const blink = inv > 0 && Math.floor(inv * 10) % 2;
      if (!blink) {
        const seg = (i) => { const a = body[i - 1], b = body[i]; return !(b.cut || (a.cut && i > 1) || Math.abs(a.x - b.x) > 40 || Math.abs(a.y - b.y) > 40); };
        g.strokeStyle = '#0E0E10'; g.lineWidth = 22;
        g.beginPath();
        for (let i = 1; i < body.length; i++) { if (!seg(i)) { g.moveTo(body[i].x, body[i].y); continue; } if (i === 1) g.moveTo(body[0].x, body[0].y); g.lineTo(body[i].x, body[i].y); }
        g.stroke();
        for (let i = 1; i < body.length; i++) {
          if (!seg(i)) continue;
          const a = body[i - 1], b = body[i];
          g.lineWidth = 16 * (1 - (i / body.length) * 0.5);
          g.strokeStyle = hsl(hue + i * 5, 1, 0.6);
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
        // head: a big eye
        g.save(); g.translate(head.x, head.y); g.rotate(head.a);
        g.fillStyle = '#FFFFFF'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(2, 0, 15, 12, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = hsl(hue + 180, 1, 0.5); g.beginPath(); g.arc(7, 0, 6.5, 0, TAU); g.fill();
        g.fillStyle = '#0E0E10'; g.beginPath(); g.arc(8, 0, 3.2, 0, TAU); g.fill();
        g.restore();
      }
      inkTex.upload(ink);

      // ---- feedback ----
      const c = [head.x / A.w, 1 - head.y / A.h];
      const zoom = calm ? 1.004 : 1.016 + (trip > 0 ? 0.02 : 0) + lvl * 0.008;
      const rot = calm ? 0 : (0.004 + spinAmt * 0.018) * (trip > 0 ? 2.2 : 1);
      fbp.use().tex('prev', 0, ta.tex).tex('ink', 1, inkTex.tex)
        .f('c', ...c).f('zoom', zoom).f('rot', rot).f('hue', calm ? 0.01 : trip > 0 ? 0.12 : 0.035).f('decay', trip > 0 ? 0.99 : 0.984).f('t', t).f('aspect', A.w / A.h).f('warp', trip > 0 ? 2 : 0.6);
      q.draw(tb.fb, tb.w, tb.h);
      [ta, tb] = [tb, ta];
      show.use().tex('s', 0, ta.tex).f('c', ...c).f('ab', calm ? 0 : 0.006 + (trip > 0 ? 0.02 : 0) + flash * 0.03);
      q.draw(null, glc.width, glc.height);
      if (flash > 0) { glc.style.filter = `brightness(${1 + flash})`; } else if (glc.style.filter) glc.style.filter = '';
      inp.frame();
    });

    api.onCleanup(() => {
      stopLoop(); inp.destroy(); A.destroy();
      ta?.dispose(); tb?.dispose(); inkTex.dispose(); fbp.dispose(); show.dispose(); q.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    });
  },
};

function drawEye(g, e, head, t) {
  const pulse = 1 + Math.sin(t * 6 + e.ph) * 0.08;
  const r = e.r * pulse;
  const look = Math.atan2(head.y - e.y, head.x - e.x);
  g.save(); g.translate(e.x, e.y);
  if (e.gold) { g.shadowColor = '#FFE629'; g.shadowBlur = 24; }
  g.fillStyle = e.gold ? '#FFE629' : '#FFFFFF'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
  g.shadowBlur = 0;
  // veins
  if (!e.gold) {
    g.strokeStyle = '#FF0033'; g.lineWidth = 1;
    for (let k = 0; k < 5; k++) { const a = e.ph + k * 1.3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); g.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.7, Math.sin(a + 0.3) * r * 0.7, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); g.stroke(); }
  }
  const ix = Math.cos(look) * r * 0.35, iy = Math.sin(look) * r * 0.35;
  g.fillStyle = e.gold ? '#FF2BD6' : '#2D3BFF'; g.beginPath(); g.arc(ix, iy, r * 0.48, 0, TAU); g.fill();
  g.fillStyle = '#0E0E10'; g.beginPath(); g.arc(ix, iy, r * 0.24, 0, TAU); g.fill();
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ix - r * 0.12, iy - r * 0.12, r * 0.08, 0, TAU); g.fill();
  g.restore();
}
