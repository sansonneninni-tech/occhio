import { h } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';
import { reduceMotion } from '../core/dom.js';
import { store } from '../core/store.js';

const TIME = 60;
const SECT = 6;
// Op-art phases: background pair + wall color. They change every 12 s.
const PHASES = [
  { a: '#FF2BD6', b: '#FF8A00', c: '#5B00FF', wall: '#C6FF00', glow: '#C6FF00' },
  { a: '#00E5A0', b: '#FF0055', c: '#FFE629', wall: '#29F0FF', glow: '#29F0FF' },
  { a: '#FF4D1F', b: '#2D3BFF', c: '#FF8AD0', wall: '#FFE629', glow: '#FFE629' },
  { a: '#9D00FF', b: '#C6FF00', c: '#FF2BD6', wall: '#F3EFE6', glow: '#FFFFFF' },
  { a: '#FFE629', b: '#E0005A', c: '#00B3FF', wall: '#C6FF00', glow: '#C6FF00' },
];

// Logarithmic spiral arms plus wobbling "liquid" rings.
function spiral(g, far, t, rot, P, arms = 9) {
  g.fillStyle = P.a; g.fillRect(-far, -far, far * 2, far * 2);
  const twist = 2.6, spin = -rot * 0.5 + t * 0.6;
  g.fillStyle = P.b;
  g.beginPath();
  for (let i = 0; i < arms; i++) {
    const a0 = (i / arms) * TAU + spin, w = (TAU / arms) * 0.5;
    const pts = [];
    for (let r = 2; r < far; r *= 1.05) pts.push([r, a0 + twist * Math.log(r)]);
    g.moveTo(0, 0);
    for (const [r, a] of pts) g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    for (let k = pts.length - 1; k >= 0; k--) { const [r, a] = pts[k]; g.lineTo(Math.cos(a + w) * r, Math.sin(a + w) * r); }
    g.closePath();
  }
  g.fill();
  g.fillStyle = P.c;
  g.globalAlpha = 0.85;
  const band = far * 0.06, off = (t * far * 0.09) % (band * 3);
  for (let r0 = off; r0 < far; r0 += band * 3) {
    g.beginPath();
    for (let k = 0; k <= 64; k++) { const a = (k / 64) * TAU, r = r0 + Math.sin(a * 5 + t * 2 + r0 * 0.02) * band * 0.45; k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    for (let k = 64; k >= 0; k--) { const a = (k / 64) * TAU, r = r0 + band * 0.8 + Math.sin(a * 5 + t * 2 + r0 * 0.02 + 0.6) * band * 0.45; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
}


// Wall patterns: each returns a list of rings, each ring a Set of blocked sectors.
const PATTERNS = [
  (r) => [blocked([r(SECT)])],
  (r) => { const g = r(SECT); return [blocked([g, (g + 3) % SECT])]; },
  (r) => { const g = r(SECT), d = r(2) ? 1 : -1; return [0, 1, 2, 3].map((k) => blocked([(g + d * k + SECT * 4) % SECT])); },
  (r) => { const g = r(SECT); return [blocked([g, (g + 2) % SECT, (g + 4) % SECT]), blocked([(g + 1) % SECT, (g + 3) % SECT, (g + 5) % SECT])].map((s) => s); },
  (r) => { const g = r(SECT); return [blocked([g]), blocked([(g + 3) % SECT]), blocked([g])]; },
];
// Warm-up rings: two or three gaps.
const EASY = [
  (r) => { const g = r(SECT); return [blocked([g, (g + 3) % SECT])]; },
  (r) => { const g = r(2); return [blocked([g, g + 2, g + 4])]; },
  (r) => { const g = r(SECT); return [blocked([g, (g + 1) % SECT])]; },
];
function blocked(open) { const s = new Set(); for (let i = 0; i < SECT; i++) if (!open.includes(i)) s.add(i); return s; }
const wrap = (a) => ((a % TAU) + TAU) % TAU;

export default {
  id: 'vortice',
  cat: 'folle',
  title: { it: 'Vortice', en: 'Vortex' },
  tagline: { it: 'Un vortice psichedelico anni 60 ti risucchia. Scivola nei varchi: la tua corsa diventa un poster da concerto col tuo nome che si scioglie.', en: 'A 60s psychedelic vortex sucks you in. Slip through the gaps: your run becomes a concert poster with your name melting.' },
  how: {
    it: 'Gli anelli si stringono verso il centro: gira intorno e passa nei varchi aperti.|Frecce ← → (o A D). Sul telefono tieni premuto a sinistra o a destra dello schermo.|Passare rasente a un muro vale il doppio: SFIORATO!|Tre vite. Ogni anello passato aumenta la combo. Attenzione: luci forti e lampeggianti.',
    en: 'Rings close in toward the center: circle around and pass through the open gaps.|Arrows ← → (or A D). On phone, hold the left or right side of the screen.|Passing right next to a wall scores double: CLOSE CALL!|Three lives. Each ring passed raises the combo. Warning: strong flashing light.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#FF2BD6"/><g transform="translate(80 50)">${Array.from({ length: 9 }, (_, i) => { const a0 = (i / 9) * TAU; let d = 'M0 0'; let back = ''; for (let r = 2; r < 130; r *= 1.15) { const a = a0 + 2.6 * Math.log(r); d += ` L${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; back = ` L${(Math.cos(a + 0.35) * r).toFixed(1)} ${(Math.sin(a + 0.35) * r).toFixed(1)}` + back; } return `<path d="${d}${back}Z" fill="#FF8A00"/>`; }).join('')}${[44, 30, 18].map((r, i) => `<circle r="${r}" fill="none" stroke="${i % 2 ? '#5B00FF' : '#C6FF00'}" stroke-width="7" stroke-dasharray="${r * 4.2} ${r * 1.1}" transform="rotate(${i * 50})"/>`).join('')}<circle r="7" fill="#fff" stroke="#0E0E10" stroke-width="2"/><circle cx="2" r="3" fill="#0E0E10"/></g></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    const touchy = matchMedia('(pointer: coarse)').matches;
    controls.append(h('span', { class: 'keys-hint' }, api.t(touchy
      ? { it: 'Tieni premuto a sinistra o a destra', en: 'Hold left or right side' }
      : { it: '← → oppure A D · o tieni premuto a sinistra / destra', en: '← → or A D · or hold left / right' })));
    const calm = reduceMotion();
    const rnd = (n) => Math.floor(Math.random() * n);

    let surv = 0, t = 0, lives = 3, over = false, inv = 0, pa = -Math.PI / 2, rot = 0, rotV = 0.6, rotFlip = 3;
    let rings = [], spawnT = 0.8, passed = 0, phase = 0, flash = 0, beat = 0, nearCount = 0;
    const path = []; let pathT = 0;
    const livesTxt = () => '◆'.repeat(Math.max(0, lives)) || '–';
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), livesTxt(), false);

    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.end({
        summary: api.t({ it: `${passed} anelli passati · ${nearCount} sfiorati`, en: `${passed} rings passed · ${nearCount} close calls` }),
        exports: [{ label: api.t({ it: 'Poster psichedelico (PNG)', en: 'Psychedelic poster (PNG)' }), run: () => poster().toBlob((b) => download('occhio-vortice.png', b), 'image/png') }],
      });
    };
    api.timer(TIME, finish);

    function spawnPattern() {
      const lvl = Math.min(1, t / TIME);
      const pick = lvl < 0.2 ? EASY[rnd(EASY.length)](rnd) : PATTERNS[rnd(PATTERNS.length)](rnd);
      const gap = 0.36 - lvl * 0.1;
      pick.forEach((set, k) => rings.push({ r: 1.25 + k * gap, set, done: false, hitOnce: false }));
      spawnT = (pick.length * gap + 0.42 - lvl * 0.16) / speed();
    }
    const speed = () => 0.42 + Math.min(1, t / TIME) * 0.38;

    function hitWall() {
      lives--; inv = 1.3; flash = 1;
      api.hit(0, { silent: true }); shake(A.box); vibrate([60, 40, 60]); sfx.bad();
      stamp(stage, api.t({ it: 'SCHIANTO', en: 'CRASH' }), 'bad');
      api.hud(api.t({ it: 'Vite', en: 'Lives' }), livesTxt());
      if (lives <= 0) finish();
    }

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt; beat += dt;
      const R = Math.min(A.w, A.h) * 0.5;
      const cx = A.w / 2, cy = A.h / 2;
      const pr = 0.2;               // player orbit, in units of R
      const thick = 0.075;
      phase = Math.floor(t / 12) % PHASES.length;
      const P = PHASES[phase] || PHASES[0];

      // input
      let dir = 0;
      if (inp.keys.has('ArrowLeft') || inp.keys.has('a') || inp.keys.has('A')) dir -= 1;
      if (inp.keys.has('ArrowRight') || inp.keys.has('d') || inp.keys.has('D')) dir += 1;
      if (inp.down) dir = inp.x < A.w / 2 ? -1 : 1;
      const turn = 5.4;
      const prevPa = pa;
      pa += dir * turn * dt;

      // world spin, flips direction now and then
      rotFlip -= dt;
      if (rotFlip <= 0) { rotV = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.min(1, t / TIME) * 1.4); rotFlip = 2.5 + Math.random() * 3; }
      rot += rotV * dt;

      // rings
      spawnT -= dt;
      if (spawnT <= 0) spawnPattern();
      const v = speed();
      const rel = wrap(pa - rot);
      const sec = Math.floor(rel / (TAU / SECT)) % SECT;
      for (const ring of rings) {
        ring.r -= v * dt;
        const inner = ring.r - thick;
        if (!ring.hitOnce && inner <= pr && ring.r >= pr - 0.01) {
          if (ring.set.has(sec) && inv <= 0) {
            // sliding sideways into a wall: push back instead of crashing if we just entered
            const prevSec = Math.floor(wrap(prevPa - rot) / (TAU / SECT)) % SECT;
            if (prevSec !== sec && !ring.set.has(prevSec) && inner < pr - 0.02) { pa = prevPa; }
            else { ring.hitOnce = true; hitWall(); }
          }
        }
        if (!ring.done && ring.r < pr - 0.02) {
          ring.done = true;
          if (!ring.hitOnce) {
            passed++;
            // close call: how near the wall edge we were in the open sector
            const within = (rel % (TAU / SECT)) / (TAU / SECT);
            const nb = ring.set.has((sec + 1) % SECT) && within > 0.8 || ring.set.has((sec + SECT - 1) % SECT) && within < 0.2;
            const p = toStage(stage, A.box, cx + Math.cos(pa) * pr * R, cy + Math.sin(pa) * pr * R);
            api.hit(1, { x: p.x, y: p.y, silent: true, quiet: true });
            api.add(nb ? 60 : 0);
            if (nb) { nearCount++; stamp(stage, api.t({ it: 'SFIORATO!', en: 'CLOSE CALL!' }), 'great'); sfx.great(); vibrate(15); }
            else sfx.tick();
            if (passed % 10 === 0) { flash = 0.6; stamp(stage, `${passed}`, 'great'); }
          }
        }
      }
      rings = rings.filter((r) => r.r > 0.02);
      inv = Math.max(0, inv - dt);
      flash = Math.max(0, flash - dt * 2.2);
      surv += dt * 8;
      if (surv >= 1) { api.add(Math.floor(surv)); surv -= Math.floor(surv); }

      pathT -= dt;
      if (pathT <= 0) { path.push({ a: pa, r: rot, n: lives }); pathT = 0.1; }

      // ---------- draw ----------
      const g = A.g;
      g.save();
      g.fillStyle = P.a; g.fillRect(0, 0, A.w, A.h);
      const pulse = calm ? 1 : 1 + Math.sin(beat * TAU * 2) * 0.012;
      const squash = calm ? 1 : 0.9 + Math.sin(t * 0.9) * 0.1;
      g.translate(cx, cy);
      g.scale(pulse, pulse * squash);
      const far = Math.hypot(A.w, A.h);
      // liquid spiral arms, 60s poster style
      spiral(g, far, t, rot, P);
      // dim the background a touch so walls read clearly
      g.fillStyle = 'rgba(10,0,20,0.30)';
      g.beginPath(); g.arc(0, 0, far, 0, TAU); g.fill();

      // walls
      g.rotate(rot);
      for (const ring of rings) {
        const ro = ring.r * R, ri = Math.max(0, (ring.r - thick) * R);
        if (ro <= 0) continue;
        for (const s of ring.set) {
          const a0 = (s / SECT) * TAU, a1 = ((s + 1) / SECT) * TAU;
          g.beginPath(); g.arc(0, 0, ro, a0, a1); g.arc(0, 0, ri, a1, a0, true); g.closePath();
          g.fillStyle = ring.hitOnce ? '#FF0033' : P.wall;
          g.shadowColor = P.glow; g.shadowBlur = 18;
          g.fill();
          g.shadowBlur = 0;
          g.lineWidth = 3; g.strokeStyle = '#0E0E10'; g.stroke();
        }
      }
      // core
      const core = pr * R * 0.62;
      g.beginPath();
      for (let i = 0; i < SECT; i++) { const a = (i / SECT) * TAU; i ? g.lineTo(Math.cos(a) * core, Math.sin(a) * core) : g.moveTo(Math.cos(a) * core, Math.sin(a) * core); }
      g.closePath(); g.fillStyle = '#0E0E10'; g.fill(); g.lineWidth = 4; g.strokeStyle = P.wall; g.stroke();
      // sector guides on the orbit
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, pr * R, 0, TAU); g.stroke();
      g.rotate(-rot);
      // player: a little eye
      if (!(inv > 0 && Math.floor(inv * 12) % 2)) {
        const px = Math.cos(pa) * pr * R, py = Math.sin(pa) * pr * R;
        const s = Math.max(9, R * 0.04);
        g.save(); g.translate(px, py); g.rotate(pa);
        g.fillStyle = '#FFFFFF'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(0, 0, s * 1.3, s, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#FF2BD6'; g.beginPath(); g.arc(s * 0.35, 0, s * 0.55, 0, TAU); g.fill();
        g.fillStyle = '#0E0E10'; g.beginPath(); g.arc(s * 0.45, 0, s * 0.25, 0, TAU); g.fill();
        g.restore();
      }
      g.restore();
      if (flash > 0 && !calm) { g.fillStyle = `rgba(255,255,255,${flash * 0.5})`; g.fillRect(0, 0, A.w, A.h); }
      // touch zones hint
      if (touchy && inp.down) {
        g.fillStyle = 'rgba(255,255,255,0.10)';
        if (inp.x < A.w / 2) g.fillRect(0, 0, A.w / 2, A.h); else g.fillRect(A.w / 2, 0, A.w / 2, A.h);
      }
      inp.frame();
    });

    // Poster: 60s concert poster. The spiral is twisted by your path, your name melts.
    function poster() {
      const W = 1200, H = 1700;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const P = PHASES[(passed + nearCount) % PHASES.length];
      const last = path[path.length - 1] || { a: 0, r: 0 };
      g.save(); g.translate(W / 2, H * 0.42);
      spiral(g, H, path.length * 0.07 + last.a, last.r * 3, P, 7 + (passed % 5));
      g.restore();
      // melting lettering: draw the name on a scratch canvas, then smear it in slices
      const name = (store.name || 'OCCHIO').toUpperCase();
      const tx = document.createElement('canvas'); tx.width = W; tx.height = 520;
      const tg = tx.getContext('2d');
      let fs = 320; tg.font = `900 ${fs}px Archivo, sans-serif`;
      while (tg.measureText(name).width > W - 120 && fs > 80) { fs -= 10; tg.font = `900 ${fs}px Archivo, sans-serif`; }
      tg.textAlign = 'center'; tg.textBaseline = 'middle';
      tg.lineJoin = 'round'; tg.lineWidth = 26; tg.strokeStyle = '#0E0E10'; tg.strokeText(name, W / 2, 260);
      tg.fillStyle = P.wall; tg.fillText(name, W / 2, 260);
      const seed = path.map((p) => p.a).filter((_, i) => i % 7 === 0);
      for (let x = 0; x < W; x += 6) {
        const k = seed.length ? seed[Math.floor((x / W) * seed.length)] : 0;
        const dy = Math.sin(x / 110 + k) * 60 + Math.sin(x / 37 + k * 2) * 14;
        const drip = Math.max(0, Math.sin(x / 23 + k * 5)) ** 8 * 90;
        g.drawImage(tx, x, 0, 6, 520, x, H * 0.1 + dy, 6, 520 + drip);
      }
      // footer band
      g.fillStyle = '#0E0E10'; g.fillRect(0, H - 250, W, 250);
      g.fillStyle = P.wall; g.font = '900 120px Archivo, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('VORTICE', 50, H - 70);
      g.font = '700 30px "JetBrains Mono", monospace'; g.fillStyle = '#F3EFE6';
      g.fillText(`${api.score.toLocaleString()} PT · ${passed} ANELLI · ${nearCount} SFIORATI`, 56, H - 195);
      g.textAlign = 'right';
      g.fillText(`OCCHIO · ${new Date().toLocaleDateString()}`, W - 50, H - 30);
      return c;
    }

    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
