import { h, rand, randInt, shuffle, clamp } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { stamp, sfx, vibrate, shake } from '../core/fx.js';
import { store } from '../core/store.js';

// Fluxus event scores as 3-second microgames, typed and photocopied.
const PAPER = '#ECEAE3';
const INK = '#111111';
const PINK = '#FF2D95';
const TYPE = '"Special Elite", "Courier New", monospace';
const MAX_EVENTS = 24;

function loadTypewriter() {
  if (document.getElementById('font-special-elite')) return;
  const l = document.createElement('link');
  l.id = 'font-special-elite'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Special+Elite&display=swap';
  document.head.append(l);
}

// ---------- the microgames ----------
// Each one: { title, hint, setup(w,h), update(dt, P, w, h) -> 'win' | 'lose' | undefined, draw(g, w, h, P), timeout: 'win' | 'lose' }
const EVENTS = [
  () => ({
    title: { it: 'ROMPI IL VIOLINO', en: 'SMASH THE VIOLIN' }, hint: { it: 'tocca a raffica', en: 'tap like mad' }, timeout: 'lose',
    hits: 0, need: 7, cracks: [], shards: [], shake: 0,
    update(dt, P, w, h) {
      this.shake = Math.max(0, this.shake - dt * 4);
      for (const s of this.shards) { s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; }
      if (P.justDown && this.hits < this.need) {
        this.hits++; this.shake = 1; sfx.tap(); vibrate(15);
        const cx = w / 2, cy = h * 0.55;
        const a = rand(0, TAU), x0 = cx + rand(-30, 30), y0 = cy + rand(-60, 60);
        this.cracks.push([x0, y0, x0 + Math.cos(a) * rand(30, 70), y0 + Math.sin(a) * rand(30, 70), x0 + Math.cos(a + 0.6) * rand(50, 100), y0 + Math.sin(a + 0.6) * rand(50, 100)]);
        if (this.hits >= this.need) {
          for (let i = 0; i < 18; i++) this.shards.push({ x: cx + rand(-40, 40), y: cy + rand(-90, 90), vx: rand(-420, 420), vy: rand(-600, -100), r: 0, vr: rand(-10, 10), s: rand(10, 30) });
          this.doneT = 0.5;
        }
      }
      if (this.doneT != null && (this.doneT -= dt) <= 0) return 'win';
    },
    draw(g, w, h) {
      const cx = w / 2 + (Math.random() - 0.5) * 16 * this.shake, cy = h * 0.55, s = Math.min(w, h) / 420;
      if (this.hits < this.need) {
        g.save(); g.translate(cx, cy); g.scale(s, s); g.rotate(-0.25);
        g.fillStyle = INK; g.strokeStyle = INK; g.lineWidth = 4;
        // body: two bouts and a waist
        g.beginPath(); g.ellipse(0, 50, 62, 70, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(0, -40, 50, 56, 0, 0, TAU); g.fill();
        g.fillStyle = PAPER; g.beginPath(); g.ellipse(-60, 5, 16, 22, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(60, 5, 16, 22, 0, 0, TAU); g.fill();
        g.fillStyle = INK; g.fillRect(-9, -200, 18, 150);
        g.beginPath(); g.arc(0, -210, 16, 0, TAU); g.fill();
        g.strokeStyle = PAPER; g.lineWidth = 1.5; for (let k = -1.5; k <= 1.5; k++) { g.beginPath(); g.moveTo(k * 5, -200); g.lineTo(k * 6, 90); g.stroke(); }
        g.fillStyle = PAPER; g.fillRect(-20, 60, 40, 6);
        g.font = `bold 22px ${TYPE}`; g.fillStyle = PAPER; g.fillText('f', -30, 10); g.fillText('f', 18, 10);
        g.restore();
        g.strokeStyle = PINK; g.lineWidth = 4; g.lineCap = 'round';
        for (const c of this.cracks) { g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]); g.lineTo(c[4], c[5]); g.stroke(); }
      }
      g.fillStyle = INK;
      for (const sh of this.shards) { g.save(); g.translate(sh.x, sh.y); g.rotate(sh.r); g.beginPath(); g.moveTo(0, -sh.s); g.lineTo(sh.s * 0.6, sh.s); g.lineTo(-sh.s * 0.7, sh.s * 0.4); g.fill(); g.restore(); }
      meter(g, w, h, this.hits / this.need);
    },
  }),
  () => ({
    title: { it: 'TAGLIA LA CRAVATTA', en: 'CUT THE TIE' }, hint: { it: 'un taglio netto', en: 'one clean cut' }, timeout: 'lose',
    t: 0, cut: null,
    update(dt, P, w, h) {
      this.t += dt;
      if (this.cut) { this.cut.vy += 1200 * dt; this.cut.y += this.cut.vy * dt; this.cut.r += dt * 3; if (this.cut.y > h + 200) return 'win'; return; }
      const x = this.tieX(w), y0 = h * 0.32, y1 = h * 0.62;
      const seg = P.seg();
      if (seg && Math.min(seg[0], seg[2]) < x && Math.max(seg[0], seg[2]) > x) {
        const yy = seg[1] + ((seg[3] - seg[1]) * (x - seg[0])) / (seg[2] - seg[0] || 1);
        if (yy > y0 && yy < y1) { this.cut = { y: yy, vy: -80, r: 0, x }; this.cutY = yy; sfx.great(); vibrate(25); }
      }
    },
    tieX(w) { return w / 2 + Math.sin(this.t * 3.4) * w * 0.22; },
    draw(g, w, h, P) {
      const knotY = h * 0.18, x = this.cut ? this.cut.x : this.tieX(w), s = Math.min(w, h) / 420;
      // collar
      g.fillStyle = INK; g.beginPath(); g.moveTo(w / 2 - 90 * s, 0); g.lineTo(w / 2, knotY + 10 * s); g.lineTo(w / 2 + 90 * s, 0); g.fill();
      g.strokeStyle = INK; g.lineWidth = 3;
      const bottom = this.cut ? this.cutY : h * 0.75;
      g.save();
      g.fillStyle = INK;
      g.beginPath(); g.moveTo(w / 2 - 16 * s, knotY); g.lineTo(w / 2 + 16 * s, knotY); g.lineTo(x + 30 * s, bottom - 20 * s); g.lineTo(x, bottom); g.lineTo(x - 30 * s, bottom - 20 * s); g.closePath(); g.fill();
      // stripes in pink
      g.clip(); g.strokeStyle = PINK; g.lineWidth = 8 * s;
      for (let k = -10; k < 20; k++) { g.beginPath(); g.moveTo(0, knotY + k * 34 * s); g.lineTo(w, knotY + k * 34 * s + 80 * s); g.stroke(); }
      g.restore();
      if (this.cut) {
        g.save(); g.translate(this.cut.x, this.cut.y); g.rotate(this.cut.r);
        g.fillStyle = INK; g.beginPath(); g.moveTo(-26 * s, 0); g.lineTo(26 * s, 0); g.lineTo(30 * s, h * 0.75 - this.cutY - 20 * s); g.lineTo(0, h * 0.75 - this.cutY); g.lineTo(-30 * s, h * 0.75 - this.cutY - 20 * s); g.fill(); g.restore();
      } else {
        g.setLineDash([10, 8]); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h * 0.47); g.lineTo(w, h * 0.47); g.stroke(); g.setLineDash([]);
        scissors(g, w * 0.08, h * 0.47, s);
      }
      trail(g, P);
    },
  }),
  () => ({
    title: { it: 'TRACCIA UNA LINEA DRITTA', en: 'DRAW A STRAIGHT LINE' }, hint: { it: 'da un punto all’altro', en: 'from dot to dot' }, timeout: 'lose', ys: rand(0.35, 0.7),
    update(dt, P, w, h) {
      if (!P.justUp || P.path.length < 4) return;
      const a = P.path[0], b = P.path.at(-1), y = h * this.ys;
      if (Math.hypot(a.x - w * 0.12, a.y - y) > 60 || Math.hypot(b.x - w * 0.88, b.y - y) > 60) { this.bad = true; return 'lose'; }
      let dev = 0;
      for (const p of P.path) dev = Math.max(dev, Math.abs(p.y - (a.y + ((b.y - a.y) * (p.x - a.x)) / (b.x - a.x || 1))));
      this.dev = dev;
      return dev < Math.max(16, h * 0.045) ? 'win' : 'lose';
    },
    draw(g, w, h, P) {
      const y = h * this.ys;
      for (const [x, c] of [[w * 0.12, INK], [w * 0.88, PINK]]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill(); }
      g.font = `20px ${TYPE}`; g.fillStyle = INK; g.fillText('A', w * 0.12 - 7, y - 26); g.fillText('B', w * 0.88 - 7, y - 26);
      g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); P.path.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
    },
  }),
  () => ({
    title: { it: 'ACCENDI IL FIAMMIFERO', en: 'STRIKE THE MATCH' }, hint: { it: 'striscia veloce sulla carta vetrata', en: 'swipe fast on the strip' }, timeout: 'lose', lit: 0, flame: 0,
    update(dt, P, w, h) {
      if (this.lit) { this.flame += dt; if (this.flame > 0.6) return 'win'; return; }
      const seg = P.seg();
      const y0 = h * 0.6, y1 = h * 0.72;
      if (seg && seg[1] > y0 - 20 && seg[1] < y1 + 20) {
        const sp = Math.hypot(seg[2] - seg[0], seg[3] - seg[1]) / Math.max(dt, 0.008);
        if (sp > 900) { this.strokes = (this.strokes || 0) + 1; sfx.tick(); if (this.strokes > 4) { this.lit = 1; sfx.great(); vibrate(30); } }
      }
    },
    draw(g, w, h, P) {
      const y0 = h * 0.6, y1 = h * 0.72;
      g.fillStyle = INK; g.fillRect(w * 0.15, y0 - 50, w * 0.7, y1 - y0 + 100);
      g.fillStyle = '#5a5a5a'; g.fillRect(w * 0.15, y0, w * 0.7, y1 - y0);
      for (let i = 0; i < 300; i++) { g.fillStyle = Math.random() < 0.5 ? '#222' : '#999'; g.fillRect(w * 0.15 + Math.random() * w * 0.7, y0 + Math.random() * (y1 - y0), 2, 2); }
      g.fillStyle = PAPER; g.font = `bold ${Math.min(34, w / 16)}px ${TYPE}`; g.fillText('FLUX MATCHES', w * 0.2, y0 - 14);
      // the match follows the finger
      const mx = P.down ? P.x : w * 0.5, my = P.down ? P.y : h * 0.38;
      g.save(); g.translate(mx, my); g.rotate(-0.5);
      g.fillStyle = '#C9A56A'; g.fillRect(-5, 0, 10, 120);
      g.fillStyle = PINK; g.beginPath(); g.ellipse(0, -4, 10, 14, 0, 0, TAU); g.fill();
      if (this.lit) {
        const f = 1 + Math.sin(this.flame * 40) * 0.15;
        g.fillStyle = INK; g.beginPath(); g.moveTo(-16 * f, -10); g.quadraticCurveTo(-18, -50 * f, 0, -80 * f); g.quadraticCurveTo(18, -50 * f, 16 * f, -10); g.fill();
        g.fillStyle = PINK; g.beginPath(); g.moveTo(-8, -10); g.quadraticCurveTo(-8, -34, 0, -50 * f); g.quadraticCurveTo(8, -34, 8, -10); g.fill();
      }
      g.restore();
      if (!this.lit) meter(g, w, h, (this.strokes || 0) / 5);
    },
  }),
  () => ({
    title: { it: '4′33″ · NON TOCCARE NIENTE', en: '4′33″ · TOUCH NOTHING' }, hint: { it: 'ascolta il silenzio', en: 'listen to the silence' }, timeout: 'win', t: 0,
    update(dt, P) { this.t += dt; if (P.justDown) { this.broke = true; return 'lose'; } },
    draw(g, w, h) {
      const s = Math.min(w, h) / 420, cx = w / 2, cy = h * 0.58;
      // grand piano, lid open
      g.fillStyle = INK;
      g.beginPath(); g.moveTo(cx - 150 * s, cy); g.lineTo(cx + 120 * s, cy); g.quadraticCurveTo(cx + 170 * s, cy - 10 * s, cx + 150 * s, cy - 60 * s); g.lineTo(cx - 150 * s, cy - 60 * s); g.fill();
      g.beginPath(); g.moveTo(cx - 150 * s, cy - 60 * s); g.lineTo(cx + 100 * s, cy - 170 * s); g.lineTo(cx + 110 * s, cy - 160 * s); g.lineTo(cx - 130 * s, cy - 60 * s); g.fill();
      for (const x of [-130, 100]) g.fillRect(cx + x * s, cy, 10 * s, 70 * s);
      g.fillStyle = PAPER; for (let k = 0; k < 18; k++) g.fillRect(cx - 148 * s + k * 15 * s, cy - 22 * s, 12 * s, 20 * s);
      // the bait
      const blink = Math.sin(this.t * 14) > 0;
      g.fillStyle = blink ? PINK : INK; g.beginPath(); g.arc(w * 0.78, h * 0.25, 44 * s, 0, TAU); g.fill();
      g.fillStyle = PAPER; g.font = `bold ${20 * s}px ${TYPE}`; g.textAlign = 'center'; g.fillText(this.t > 1 ? 'PREMI!' : 'PREMI?', w * 0.78, h * 0.25 + 7 * s); g.textAlign = 'left';
      // stopwatch
      g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.arc(w * 0.18, h * 0.24, 34 * s, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(w * 0.18, h * 0.24); g.lineTo(w * 0.18 + Math.cos(this.t * 4 - 1.57) * 28 * s, h * 0.24 + Math.sin(this.t * 4 - 1.57) * 28 * s); g.stroke();
    },
  }),
  () => ({
    title: { it: 'URLA FINO ALLA LINEA', en: 'SCREAM UP TO THE LINE' }, hint: { it: 'tieni premuto, lascia nella zona rosa', en: 'hold, release in the pink zone' }, timeout: 'lose', v: 0, lo: rand(0.55, 0.72),
    update(dt, P) {
      if (P.down) { this.v += dt * 0.62; this.on = true; if (this.v > 1) { this.v = 1; return 'lose'; } }
      if (P.justUp && this.on) return this.v >= this.lo && this.v <= this.lo + 0.16 ? 'win' : 'lose';
    },
    draw(g, w, h) {
      const s = Math.min(w, h) / 420, cx = w * 0.4, cy = h * 0.55, o = this.v;
      // a face that opens its mouth
      g.fillStyle = INK; g.beginPath(); g.ellipse(cx, cy, 110 * s, 140 * s, 0, 0, TAU); g.fill();
      g.fillStyle = PAPER; g.beginPath(); g.ellipse(cx, cy + 40 * s, (20 + o * 50) * s, (8 + o * 70) * s, 0, 0, TAU); g.fill();
      g.fillStyle = PINK; g.beginPath(); g.ellipse(cx, cy + (50 + o * 30) * s, (10 + o * 30) * s, (4 + o * 30) * s, 0, 0, TAU); g.fill();
      for (const sx of [-1, 1]) { g.fillStyle = PAPER; g.beginPath(); g.ellipse(cx + sx * 40 * s, cy - 40 * s, 18 * s, (10 + o * 10) * s, 0, 0, TAU); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(cx + sx * 40 * s, cy - 40 * s, 6 * s, 0, TAU); g.fill(); }
      // sound waves
      g.strokeStyle = INK; g.lineWidth = 3;
      for (let k = 1; k <= Math.floor(o * 8); k++) { g.beginPath(); g.arc(cx, cy + 40 * s, (60 + k * 22) * s, -0.6, 0.6); g.stroke(); }
      // meter
      const mx = w * 0.82, my0 = h * 0.85, my1 = h * 0.2, mh = my0 - my1;
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(mx - 18, my1, 36, mh);
      g.fillStyle = PINK; g.fillRect(mx - 18, my0 - mh * (this.lo + 0.16), 36, mh * 0.16);
      g.fillStyle = INK; g.fillRect(mx - 10, my0 - mh * o, 20, mh * o);
      g.font = `18px ${TYPE}`; g.fillText('AAAA', mx - 26, my1 - 10);
    },
  }),
  () => ({
    title: { it: 'INCOLLA IL FRANCOBOLLO', en: 'STICK THE STAMP' }, hint: { it: 'tocca al momento giusto', en: 'tap at the right moment' }, timeout: 'lose', t: rand(0, 3), drop: null,
    update(dt, P, w, h) {
      this.t += dt;
      const bx = w * 0.72;
      if (this.drop) {
        this.drop.y += 1400 * dt;
        if (this.drop.y >= h * 0.5) { this.drop.y = h * 0.5; return Math.abs(this.drop.x - bx) < Math.max(26, w * 0.05) ? 'win' : 'lose'; }
        return;
      }
      if (P.justDown) { this.drop = { x: this.sx(w), y: h * 0.16 }; sfx.tap(); }
    },
    sx(w) { return w / 2 + Math.sin(this.t * 3.8) * w * 0.38; },
    draw(g, w, h) {
      const s = Math.min(w, h) / 420;
      // envelope
      g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = PAPER;
      g.fillRect(w * 0.12, h * 0.38, w * 0.76, h * 0.42); g.strokeRect(w * 0.12, h * 0.38, w * 0.76, h * 0.42);
      g.beginPath(); g.moveTo(w * 0.12, h * 0.38); g.lineTo(w / 2, h * 0.6); g.lineTo(w * 0.88, h * 0.38); g.stroke();
      g.font = `${18 * s}px ${TYPE}`; g.fillStyle = INK; g.fillText('FLUXPOST · G. MACIUNAS', w * 0.18, h * 0.74);
      const bx = w * 0.72;
      g.setLineDash([6, 6]); g.strokeRect(bx - 30 * s, h * 0.5 - 38 * s, 60 * s, 76 * s); g.setLineDash([]);
      const x = this.drop ? this.drop.x : this.sx(w), y = this.drop ? this.drop.y : h * 0.16;
      g.fillStyle = PINK; g.fillRect(x - 28 * s, y - 36 * s, 56 * s, 72 * s);
      g.fillStyle = INK; g.font = `bold ${22 * s}px ${TYPE}`; g.textAlign = 'center'; g.fillText('5¢', x, y + 6 * s); g.textAlign = 'left';
      g.strokeStyle = PAPER; g.setLineDash([3, 4]); g.strokeRect(x - 24 * s, y - 32 * s, 48 * s, 64 * s); g.setLineDash([]);
    },
  }),
  () => ({
    title: { it: 'SPEGNI TUTTE LE LAMPADE', en: 'TURN OFF EVERY LAMP' }, hint: { it: 'tocca quelle accese', en: 'tap the lit ones' }, timeout: 'lose',
    lamps: null, relight: 0.9,
    setup() { this.lamps = Array.from({ length: 5 }, () => Math.random() < 0.75); if (!this.lamps.some(Boolean)) this.lamps[2] = true; },
    pos(i, w, h) { return { x: w * (0.14 + i * 0.18), y: h * (0.42 + (i % 2) * 0.14) }; },
    update(dt, P, w, h) {
      this.relight -= dt;
      if (this.relight <= 0) { const off = this.lamps.map((v, i) => (!v ? i : -1)).filter((i) => i >= 0); if (off.length && Math.random() < 0.6) this.lamps[off[randInt(0, off.length - 1)]] = true; this.relight = 0.9; }
      if (P.justDown) this.lamps.forEach((on, i) => { const p = this.pos(i, w, h); if (on && Math.hypot(P.x - p.x, P.y - p.y) < Math.max(40, w * 0.07)) { this.lamps[i] = false; sfx.tick(); } });
      if (!this.lamps.some(Boolean)) return 'win';
    },
    draw(g, w, h) {
      const s = Math.min(w, h) / 420;
      this.lamps.forEach((on, i) => {
        const p = this.pos(i, w, h);
        g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, 0); g.lineTo(p.x, p.y - 34 * s); g.stroke();
        if (on) { g.fillStyle = PINK; for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; g.fillRect(p.x + Math.cos(a) * 50 * s - 3, p.y + Math.sin(a) * 50 * s - 3, 6, 6); } }
        g.fillStyle = on ? PINK : INK; g.beginPath(); g.arc(p.x, p.y, 30 * s, 0, TAU); g.fill();
        g.fillStyle = INK; g.fillRect(p.x - 12 * s, p.y - 42 * s, 24 * s, 16 * s);
      });
    },
  }),
  () => ({
    title: { it: 'COLPISCI I TASTI CON LA X', en: 'HIT THE KEYS MARKED X' }, hint: { it: 'solo quelli!', en: 'only those!' }, timeout: 'lose',
    marked: null, hit: new Set(),
    setup() { this.marked = new Set(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3)); },
    key(i, w, h) { const kw = (w * 0.86) / 10; return { x: w * 0.07 + i * kw, y: h * 0.32, w: kw, h: h * 0.5 }; },
    update(dt, P, w, h) {
      if (!P.justDown) return;
      for (let i = 0; i < 10; i++) {
        const k = this.key(i, w, h);
        if (P.x > k.x && P.x < k.x + k.w && P.y > k.y && P.y < k.y + k.h) {
          if (!this.marked.has(i)) { this.wrong = i; return 'lose'; }
          this.hit.add(i); sfx.combo(this.hit.size + 2); vibrate(12);
        }
      }
      if (this.hit.size === this.marked.size) return 'win';
    },
    draw(g, w, h) {
      for (let i = 0; i < 10; i++) {
        const k = this.key(i, w, h), hit = this.hit.has(i);
        g.fillStyle = hit ? PINK : PAPER; g.strokeStyle = INK; g.lineWidth = 3;
        g.fillRect(k.x, k.y + (hit ? 10 : 0), k.w - 3, k.h); g.strokeRect(k.x, k.y + (hit ? 10 : 0), k.w - 3, k.h);
        if (i % 7 !== 2 && i % 7 !== 6 && i < 9) { g.fillStyle = INK; g.fillRect(k.x + k.w * 0.62, k.y, k.w * 0.7, k.h * 0.55); }
        if (this.marked.has(i)) {
          g.strokeStyle = hit ? INK : PINK; g.lineWidth = 7; const cx = k.x + k.w / 2, cy = k.y + k.h * 0.8, r = Math.min(k.w * 0.32, 22);
          g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy + r); g.moveTo(cx + r, cy - r); g.lineTo(cx - r, cy + r); g.stroke();
        }
      }
    },
  }),
  () => ({
    title: { it: 'DISEGNA UN CERCHIO', en: 'DRAW A CIRCLE' }, hint: { it: 'un solo gesto, chiuso', en: 'one closed stroke' }, timeout: 'lose',
    update(dt, P, w, h) {
      if (!P.justUp || P.path.length < 8) return;
      const pts = P.path, cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const rs = pts.map((p) => Math.hypot(p.x - cx, p.y - cy)), m = rs.reduce((a, b) => a + b, 0) / rs.length;
      const sd = Math.sqrt(rs.reduce((a, r) => a + (r - m) ** 2, 0) / rs.length) / m;
      const gap = Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) / m;
      let turn = 0; for (let i = 1; i < pts.length; i++) { let d = Math.atan2(pts[i].y - cy, pts[i].x - cx) - Math.atan2(pts[i - 1].y - cy, pts[i - 1].x - cx); if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; turn += d; }
      return m > Math.min(w, h) * 0.1 && sd < 0.2 && gap < 0.6 && Math.abs(turn) > TAU * 0.8 ? 'win' : 'lose';
    },
    draw(g, w, h, P) {
      g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 1; i < P.path.length; i++) { g.lineWidth = 6 + 10 * Math.abs(Math.sin(i / 9)); g.beginPath(); g.moveTo(P.path[i - 1].x, P.path[i - 1].y); g.lineTo(P.path[i].x, P.path[i].y); g.stroke(); }
      if (!P.path.length) { g.setLineDash([4, 10]); g.strokeStyle = '#999'; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h * 0.55, Math.min(w, h) * 0.25, 0, TAU); g.stroke(); g.setLineDash([]); }
    },
  }),
  () => ({
    title: { it: 'FAI GIRARE LA RUOTA', en: 'SPIN THE WHEEL' }, hint: { it: 'gira il dito intorno al centro', en: 'circle around the hub' }, timeout: 'lose', ang: 0, spin: 0, total: 0, last: null,
    update(dt, P, w, h) {
      const cx = w / 2, cy = h * 0.42;
      if (P.down) {
        const a = Math.atan2(P.y - cy, P.x - cx);
        if (this.last != null) { let d = a - this.last; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; this.spin += d * 0.9; this.total += Math.abs(d); }
        this.last = a;
      } else this.last = null;
      this.ang += this.spin; this.spin *= 0.94;
      if (this.total > TAU * 3) return 'win';
    },
    draw(g, w, h) {
      const s = Math.min(w, h) / 420, cx = w / 2, cy = h * 0.42, R = 110 * s;
      // the stool
      g.fillStyle = INK; g.fillRect(cx - 70 * s, cy + R + 30 * s, 140 * s, 18 * s);
      for (const x of [-60, 50]) g.fillRect(cx + x * s, cy + R + 48 * s, 12 * s, h);
      g.fillRect(cx - 5 * s, cy, 10 * s, R + 30 * s);
      g.strokeStyle = INK; g.lineWidth = 8 * s; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
      g.lineWidth = 2;
      for (let k = 0; k < 24; k++) { const a = this.ang + (k / 24) * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
      g.fillStyle = PINK; g.beginPath(); g.arc(cx + Math.cos(this.ang) * R * 0.8, cy + Math.sin(this.ang) * R * 0.8, 10 * s, 0, TAU); g.fill();
      meter(g, w, h, this.total / (TAU * 3));
    },
  }),
  () => ({
    title: { it: 'MUSICA A GOCCE: PRENDILE', en: 'DRIP MUSIC: CATCH THEM' }, hint: { it: 'muovi la ciotola', en: 'move the bowl' }, timeout: 'lose', drops: [], caught: 0, next: 0.2, bx: null,
    update(dt, P, w, h) {
      this.bx ??= w / 2;
      if (P.down || P.moved) this.bx = clamp(P.x, 40, w - 40);
      this.next -= dt;
      if (this.next <= 0 && this.drops.length + this.caught < 3) { this.drops.push({ x: rand(w * 0.15, w * 0.85), y: 0, vy: rand(260, 360) }); this.next = rand(0.45, 0.7); }
      for (const d of this.drops) {
        d.vy += 600 * dt; d.y += d.vy * dt;
        if (d.y > h * 0.78 && !d.done) {
          d.done = true;
          if (Math.abs(d.x - this.bx) < Math.max(44, w * 0.08)) { this.caught++; sfx.combo(this.caught + 3); vibrate(10); }
          else return 'lose';
        }
      }
      this.drops = this.drops.filter((d) => !d.done);
      if (this.caught >= 3) return 'win';
    },
    draw(g, w, h) {
      const s = Math.min(w, h) / 420;
      g.fillStyle = INK; g.fillRect(0, 0, w, 14 * s);
      g.fillStyle = PINK; for (const d of this.drops) { g.beginPath(); g.moveTo(d.x, d.y - 18 * s); g.quadraticCurveTo(d.x + 10 * s, d.y, d.x, d.y + 6 * s); g.quadraticCurveTo(d.x - 10 * s, d.y, d.x, d.y - 18 * s); g.fill(); }
      const bx = this.bx ?? w / 2, by = h * 0.8;
      g.fillStyle = INK; g.beginPath(); g.moveTo(bx - 60 * s, by - 20 * s); g.lineTo(bx + 60 * s, by - 20 * s); g.quadraticCurveTo(bx + 50 * s, by + 40 * s, bx, by + 40 * s); g.quadraticCurveTo(bx - 50 * s, by + 40 * s, bx - 60 * s, by - 20 * s); g.fill();
      g.fillStyle = PAPER; g.font = `bold ${16 * s}px ${TYPE}`; g.textAlign = 'center'; g.fillText(`${this.caught}/3`, bx, by + 12 * s); g.textAlign = 'left';
    },
  }),
];

// Ragged black edges where the copier lid stayed open. Same shape for the whole event.
function drawLid(g, w, h, seed) {
  const r = (k) => Math.abs(Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1;
  g.fillStyle = INK;
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0, k = 0; x <= w; x += 18, k++) g.lineTo(x, h - 10 - r(k) * 22 - (r(k + 50) > 0.92 ? 30 : 0));
  g.lineTo(w, h); g.fill();
  g.beginPath(); g.moveTo(w, 40);
  for (let y = 40, k = 0; y <= h; y += 16, k++) g.lineTo(w - 6 - r(k + 99) * 16, y);
  g.lineTo(w, h); g.fill();
}

function meter(g, w, h, v) {
  const x = w * 0.2, y = h - 56, mw = w * 0.6;
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x, y, mw, 12);
  g.fillStyle = PINK; g.fillRect(x + 2, y + 2, (mw - 4) * clamp(v), 8);
}
function trail(g, P) {
  if (P.path.length < 2) return;
  g.strokeStyle = PINK; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); P.path.slice(-8).forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
}
function scissors(g, x, y, s) {
  g.strokeStyle = INK; g.lineWidth = 4 * s;
  g.beginPath(); g.arc(x - 12 * s, y - 10 * s, 9 * s, 0, TAU); g.stroke(); g.beginPath(); g.arc(x - 12 * s, y + 10 * s, 9 * s, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(x - 4 * s, y - 6 * s); g.lineTo(x + 30 * s, y + 6 * s); g.moveTo(x - 4 * s, y + 6 * s); g.lineTo(x + 30 * s, y - 6 * s); g.stroke();
}

// Photocopy grain: toner specks and edge shadows.
function makeToner() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`; const s = Math.random() < 0.9 ? 1 : 2.5; g.fillRect(Math.random() * 256, Math.random() * 256, s, s); }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, Math.random() * 256, 256, 1); }
  return c;
}

export default {
  id: 'fluxus',
  cat: 'folle',
  title: { it: 'Partitura Fluxus', en: 'Fluxus Score' },
  tagline: { it: 'Istruzioni assurde scritte a macchina, tre secondi per eseguirle. Rompi violini, taglia cravatte, stai in silenzio.', en: 'Absurd typed instructions, three seconds to perform them. Smash violins, cut ties, stay silent.' },
  how: {
    it: 'Leggi la partitura e fai subito quello che dice: tocca, trascina, tieni premuto o… non fare niente.|Ogni evento riuscito vale punti, più veloce sei più ne prendi. Ogni 5 eventi si accelera.|Hai 3 vite. Alla fine scarichi il tuo Fluxkit: il poster con tutte le performance.',
    en: 'Read the score and do what it says right away: tap, drag, hold or… do nothing.|Each event done earns points, faster means more. Every 5 events it speeds up.|You have 3 lives. At the end you download your Fluxkit: a poster of all your performances.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#ECEAE3"/><rect x="14" y="12" width="96" height="66" fill="#fff" stroke="#111" stroke-width="2" transform="rotate(-4 60 45)"/><line x1="20" y1="28" x2="104" y2="22" stroke="#FF2D95" stroke-width="2"/><text x="22" y="46" font-family="Courier New" font-weight="700" font-size="11" fill="#111" transform="rotate(-4 60 45)">ROMPI IL</text><text x="22" y="60" font-family="Courier New" font-weight="700" font-size="11" fill="#111" transform="rotate(-4 60 45)">VIOLINO.</text><ellipse cx="128" cy="62" rx="16" ry="22" fill="#111"/><rect x="125" y="14" width="6" height="40" fill="#111"/><path d="M116 50 L140 74 M138 48 L120 78" stroke="#FF2D95" stroke-width="3"/></svg>`,

  mount(stage, api) {
    loadTypewriter();
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    A.box.style.background = PAPER;
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Leggi e fai. Veloce.', en: 'Read and do. Fast.' })));
    const toner = makeToner();
    const tonerPat = A.g.createPattern(toner, 'repeat');

    let lives = 3, n = 0, over = false, phase = 'card', pt = 0, cur = null, dur = 4, bag = [], log = [], speedLvl = 0, flash = 0;
    const P = { x: 0, y: 0, down: false, justDown: false, justUp: false, moved: false, path: [], lx: null, ly: null, segv: null, seg() { return this.segv; } };
    const livesHud = () => api.hud(api.t({ it: 'Vite', en: 'Lives' }), '✕'.repeat(3 - lives) + '◯'.repeat(lives), false);
    livesHud();

    const nextEvent = () => {
      if (!bag.length) bag = shuffle(EVENTS.map((_, i) => i));
      const forced = window.__occhioFluxEvent; // test hook: force one event
      cur = EVENTS[forced != null ? forced : bag.pop()]();
      cur.setup?.(A.w, A.h);
      n++;
      const lvl = Math.floor((n - 1) / 5);
      if (lvl > speedLvl) { speedLvl = lvl; stamp(stage, api.t({ it: 'PIÙ VELOCE!', en: 'FASTER!' }), 'great'); }
      dur = Math.max(2.3, 4.4 - speedLvl * 0.5);
      phase = 'card'; pt = 0;
      sfx.tick();
    };

    const snapshot = (ok) => {
      const tw = 300, th = Math.round((tw * A.h) / A.w);
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      const g = c.getContext('2d');
      g.drawImage(A.canvas, 0, 0, tw, th);
      log.push({ c, title: api.t(cur.title), ok, n });
    };

    const resolve = (res) => {
      phase = 'result'; pt = 0;
      const ok = res === 'win';
      cur.ok = ok;
      snapshot(ok);
      if (ok) {
        const speed = clamp(1 - cur.t0 / dur);
        api.hit(1, { speed, silent: true });
        stamp(stage, api.t({ it: 'ESEGUITO', en: 'PERFORMED' }), 'great');
      } else {
        lives--; livesHud();
        api.hit(0, { silent: true });
        stamp(stage, api.t({ it: 'FALLITO', en: 'FAILED' }), 'bad'); shake(A.box);
      }
    };

    const finish = () => {
      if (over) return; over = true;
      api.end({
        summary: `${log.filter((l) => l.ok).length}/${log.length} ${api.t({ it: 'eventi eseguiti', en: 'events performed' })}`,
        exports: [{ label: api.t({ it: 'Il tuo Fluxkit (PNG)', en: 'Your Fluxkit (PNG)' }), run: async () => (await poster()).toBlob((b) => download('occhio-fluxkit.png', b), 'image/png') }],
      });
    };

    nextEvent();
    const stopLoop = loop((dt) => {
      const w = A.w, hh = A.h, g = A.g;
      // input bookkeeping shared by all events
      P.x = inp.x; P.y = inp.y; P.down = inp.down; P.justDown = inp.justDown; P.justUp = inp.justUp; P.moved = inp.moved;
      inp.moved = false;
      P.segv = null;
      if (phase === 'play') {
        if (P.justDown) P.path = [];
        if (P.down) {
          if (P.lx != null) P.segv = [P.lx, P.ly, P.x, P.y];
          if (!P.path.length || Math.hypot(P.path.at(-1).x - P.x, P.path.at(-1).y - P.y) > 3) P.path.push({ x: P.x, y: P.y });
          P.lx = P.x; P.ly = P.y;
        } else { P.lx = null; }
      }
      if (!over) {
        pt += dt;
        if (phase === 'card' && pt > Math.max(0.85, 1.35 - speedLvl * 0.12)) { phase = 'play'; pt = 0; flash = 1; P.path = []; P.lx = null; cur.t0 = 0; }
        else if (phase === 'play') {
          cur.t0 = pt;
          const r = cur.update(dt, P, w, hh);
          if (r) resolve(r);
          else if (pt >= dur) resolve(cur.timeout);
        } else if (phase === 'result' && pt > 0.75) {
          if (lives <= 0 || n >= MAX_EVENTS) { if (lives > 0) { api.add(2000); stamp(stage, 'FLUXFEST!', 'great'); } finish(); }
          else nextEvent();
        }
      }
      // ---- draw ----
      g.fillStyle = PAPER; g.fillRect(0, 0, w, hh);
      if (phase === 'card') drawCard(g, w, hh, pt);
      else {
        // a huge event number behind, and the copier lid's black ragged border
        g.save(); g.globalAlpha = 0.3; g.strokeStyle = PINK; g.lineWidth = 2; g.font = `${Math.min(hh * 0.45, w * 0.4)}px ${TYPE}`; g.textBaseline = 'alphabetic'; g.textAlign = 'right';
        g.strokeText(String(n).padStart(2, '0'), w - 34, hh - 44); g.restore();
        g.save();
        if (phase === 'result' && !cur.ok) g.translate((Math.random() - 0.5) * 6, 0);
        cur.draw(g, w, hh, P);
        g.restore();
        // double image, like a sheet that slipped on the glass
        g.save(); g.globalAlpha = 0.16; g.globalCompositeOperation = 'multiply';
        g.drawImage(A.canvas, 0, 0, A.canvas.width, A.canvas.height, 5 + Math.sin(n) * 3, 3, w, hh); g.restore();
        drawLid(g, w, hh, n);
        // instruction strip + burning fuse
        g.fillStyle = INK; g.fillRect(0, 0, w, 40);
        g.fillStyle = PAPER; g.font = `${Math.min(22, w / 22)}px ${TYPE}`; g.textBaseline = 'middle';
        g.fillText(`N°${String(n).padStart(2, '0')}  ${api.t(cur.title)}`, 12, 21);
        if (phase === 'play') {
          const left = 1 - pt / dur;
          g.fillStyle = PINK; g.fillRect(0, 40, w * left, 6);
          g.fillStyle = INK; g.beginPath(); g.arc(w * left, 43, 6 + Math.random() * 3, 0, TAU); g.fill();
        }
        g.textBaseline = 'alphabetic';
      }
      // photocopy finish: toner, edge shadow, scan light
      g.save();
      g.globalAlpha = 0.9; g.fillStyle = tonerPat;
      g.translate(randInt(0, 255), randInt(0, 255)); g.fillRect(-256, -256, w + 512, hh + 512);
      g.restore();
      const edge = g.createLinearGradient(0, 0, w, 0);
      edge.addColorStop(0, 'rgba(0,0,0,.35)'); edge.addColorStop(0.04, 'rgba(0,0,0,0)'); edge.addColorStop(0.96, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.35)');
      g.fillStyle = edge; g.fillRect(0, 0, w, hh);
      if (flash > 0) {
        const x = w * (1 - flash);
        const gr = g.createLinearGradient(x - 80, 0, x + 80, 0);
        gr.addColorStop(0, 'rgba(120,255,180,0)'); gr.addColorStop(0.5, 'rgba(120,255,180,.75)'); gr.addColorStop(1, 'rgba(120,255,180,0)');
        g.fillStyle = gr; g.fillRect(x - 80, 0, 160, hh);
        flash -= dt * 4;
      }
      inp.frame();
    });

    function drawCard(g, w, hh, t) {
      const cw = Math.min(w * 0.86, 620), ch = Math.min(hh * 0.62, 360), x = (w - cw) / 2, y = (hh - ch) / 2;
      g.save(); g.translate(w / 2, hh / 2); g.rotate(((n * 37) % 7 - 3) * 0.006); g.translate(-w / 2, -hh / 2);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 8, y + 10, cw, ch);
      g.fillStyle = '#FBFAF6'; g.fillRect(x, y, cw, ch);
      g.strokeStyle = PINK; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 58); g.lineTo(x + cw, y + 58); g.stroke();
      g.strokeStyle = 'rgba(40,120,220,.25)'; g.lineWidth = 1; for (let ly = y + 92; ly < y + ch - 10; ly += 30) { g.beginPath(); g.moveTo(x, ly); g.lineTo(x + cw, ly); g.stroke(); }
      g.fillStyle = INK; g.font = `${Math.min(22, cw / 22)}px ${TYPE}`; g.textBaseline = 'alphabetic';
      g.fillText(`${api.t({ it: 'EVENTO', en: 'EVENT' })} N° ${String(n).padStart(2, '0')}`, x + 20, y + 38);
      g.textAlign = 'right'; g.fillText(`${lives} ◯`, x + cw - 20, y + 38); g.textAlign = 'left';
      const full = api.t(cur.title) + '.';
      const shown = full.slice(0, Math.floor(t * 40));
      const fs = Math.min(46, cw / 12);
      g.font = `${fs}px ${TYPE}`;
      wrapText(g, shown + (Math.floor(t * 8) % 2 ? '_' : ''), x + 24, y + 58 + fs * 1.5, cw - 48, fs * 1.15);
      g.font = `${Math.min(18, cw / 28)}px ${TYPE}`; g.fillStyle = '#555';
      g.fillText(`(${api.t(cur.hint)})`, x + 24, y + ch - 46);
      g.fillText(`— ${store.name || 'anon'}, ${new Date().getFullYear()}`, x + 24, y + ch - 20);
      g.restore();
    }

    async function poster() {
      try { await document.fonts.ready; } catch {}
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
      const g = c.getContext('2d');
      g.fillStyle = PAPER; g.fillRect(0, 0, 1080, 1350);
      g.fillStyle = INK; g.fillRect(0, 0, 1080, 230);
      g.fillStyle = PAPER; g.font = `150px ${TYPE}`; g.fillText('FLUXKIT', 40, 160);
      g.fillStyle = PINK; g.font = `30px ${TYPE}`;
      g.fillText(`${api.t({ it: 'PARTITURE ESEGUITE DA', en: 'SCORES PERFORMED BY' })} ${(store.name || 'ANON').toUpperCase()}`, 44, 210);
      const items = log.slice(-16);
      const cols = items.length <= 4 ? 2 : items.length <= 9 ? 3 : 4, gap = 18, cw = (1080 - 80 - gap * (cols - 1)) / cols;
      const rows = Math.ceil(items.length / cols) || 1;
      const ch = Math.min((1350 - 260 - 90 - gap * (rows - 1)) / rows, cw * 1.6);
      items.forEach((l, i) => {
        const x = 40 + (i % cols) * (cw + gap), y = 260 + Math.floor(i / cols) * (ch + gap);
        g.save(); g.translate(x + cw / 2, y + ch / 2); g.rotate(((i * 53) % 9 - 4) * 0.008); g.translate(-cw / 2, -ch / 2);
        g.fillStyle = '#FBFAF6'; g.fillRect(0, 0, cw, ch);
        const ih = ch - 64, ratio = l.c.width / l.c.height;
        let iw = cw - 16, ih2 = iw / ratio; if (ih2 > ih) { ih2 = ih; iw = ih * ratio; }
        g.drawImage(l.c, (cw - iw) / 2, 8, iw, ih2);
        g.fillStyle = INK; g.font = `${cols === 2 ? 24 : 16}px ${TYPE}`;
        wrapText(g, `${String(l.n).padStart(2, '0')}. ${l.title}`, 8, ch - 38, cw - 16, 18);
        g.strokeStyle = l.ok ? INK : PINK; g.lineWidth = 3; g.font = `22px ${TYPE}`;
        g.save(); g.translate(cw - 70, 40); g.rotate(-0.25); g.strokeRect(-8, -24, 86, 34); g.fillStyle = l.ok ? INK : PINK; g.fillText(l.ok ? api.t({ it: 'FATTO', en: 'DONE' }) : 'NO.', 0, 0); g.restore();
        g.restore();
      });
      g.fillStyle = INK; g.font = `22px ${TYPE}`;
      g.fillText(`OCCHIO · FLUXUS · ${new Date().toLocaleDateString()} · ${log.filter((l) => l.ok).length}/${log.length}`, 40, 1310);
      g.globalAlpha = 0.6; g.fillStyle = g.createPattern(toner, 'repeat'); g.fillRect(0, 0, 1080, 1350); g.globalAlpha = 1;
      return c;
    }

    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};

function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = wd; y += lh; }
    else line = test;
  }
  g.fillText(line, x, y);
}
