import { h } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 60;
const S = 900; // mandala world size
const FOLD = 8;

export default {
  id: 'caleido-blaster',
  cat: 'arte',
  title: { it: 'Caleido Blaster', en: 'Kaleido Blaster' },
  tagline: { it: 'Difendi il centro. Ogni colpo si riflette otto volte e disegna un mandala.', en: 'Defend the center. Every shot mirrors eight times and draws a mandala.' },
  how: {
    it: 'Il cannone al centro punta verso il mouse o il dito: tieni premuto per sparare.|I nemici arrivano a spirale dai bordi: se toccano il centro perdi una vita.|Le scie dei colpi e le esplosioni si specchiano: alla fine hai un mandala unico.',
    en: 'The center cannon aims at your mouse or finger: hold to fire.|Enemies spiral in from the edges: if they reach the center you lose a life.|Shot trails and blasts are mirrored: at the end you own a unique mandala.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#0b0a12"/><g transform="translate(80 50)">${Array.from({ length: 8 }, (_, i) => `<g transform="rotate(${i * 45})"><path d="M0 0 C10 -20 26 -24 40 -14" stroke="${['#FF2BD6', '#29F0FF'][i % 2]}" stroke-width="2.5" fill="none"/><circle cx="40" cy="-14" r="3" fill="#FFE629"/></g>`).join('')}<circle r="8" fill="#F3EFE6"/></g></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Mira col mouse · tieni premuto per sparare', en: 'Aim with mouse · hold to fire' })));
    const art = artLayer(S, S, '#0b0a12', 1.4);
    const base = Math.random() * 360;
    let t = 0, spawnT = 0.6, fireT = 0, lives = 3, over = false, aim = 0, hue = base;
    let shots = [], foes = [], kills = 0;
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '◆◆◆', false);

    const mirror = (fn) => {
      const g = art.g;
      for (let k = 0; k < FOLD; k++) {
        g.save(); g.translate(S / 2, S / 2); g.rotate((k / FOLD) * TAU); if (k % 2) g.scale(1, -1);
        fn(g); g.restore();
      }
    };
    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.end({ exports: [{ label: api.t({ it: 'Il tuo mandala (PNG)', en: 'Your mandala (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-mandala.png', b), 'image/png') }] });
    };
    api.timer(TIME, finish);
    const view = () => { const sc = Math.min(A.w, A.h) / S; return { sc, ox: (A.w - S * sc) / 2, oy: (A.h - S * sc) / 2 }; };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      hue = base + t * 8;
      const { sc, ox, oy } = view();
      const wx = (inp.x - ox) / sc - S / 2, wy = (inp.y - oy) / sc - S / 2;
      if (inp.moved) aim = Math.atan2(wy, wx);
      fireT -= dt;
      if ((inp.down || inp.keys.has(' ')) && fireT <= 0) {
        fireT = 0.12;
        shots.push({ x: 0, y: 0, vx: Math.cos(aim) * 620, vy: Math.sin(aim) * 620, c: hsl(hue + Math.random() * 40, 1, 0.62), px: 0, py: 0 });
        sfx.tick();
      }
      spawnT -= dt;
      if (spawnT <= 0) {
        const lvl = t / TIME;
        const a = Math.random() * TAU;
        foes.push({ a, r: S * 0.52, va: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6), vr: 55 + lvl * 80 + Math.random() * 20, size: 14 + Math.random() * 10, c: hsl(hue + 180, 0.9, 0.55), hp: Math.random() < 0.15 + lvl * 0.2 ? 3 : 1 });
        spawnT = Math.max(0.3, 1.05 - lvl * 0.75);
      }
      for (const s of shots) {
        s.px = s.x; s.py = s.y; s.x += s.vx * dt; s.y += s.vy * dt;
        const c = s.c;
        mirror((g) => { g.strokeStyle = c; g.globalAlpha = 0.22; g.lineWidth = 2; g.beginPath(); g.moveTo(s.px, s.py); g.lineTo(s.x, s.y); g.stroke(); });
      }
      for (const f of foes) { f.a += f.va * dt * (1 + (S * 0.5 - f.r) / 400); f.r -= f.vr * dt; f.x = Math.cos(f.a) * f.r; f.y = Math.sin(f.a) * f.r; }
      for (const s of shots) for (const f of foes) {
        if (s.dead || f.dead) continue;
        if (Math.hypot(s.x - f.x, s.y - f.y) < f.size + 5) {
          s.dead = true; f.hp--;
          if (f.hp <= 0) {
            f.dead = true; kills++;
            const fx = f.x, fy = f.y, col = s.c;
            mirror((g) => {
              g.globalAlpha = 0.85; g.fillStyle = col; g.beginPath(); g.arc(fx, fy, f.size * 0.6, 0, TAU); g.fill();
              g.globalAlpha = 0.5; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
              for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * f.size * 1.8, fy + Math.sin(a) * f.size * 1.8); g.stroke(); }
            });
            const p = toStage(stage, A.box, ox + (S / 2 + fx) * sc, oy + (S / 2 + fy) * sc);
            api.hit(1, { x: p.x, y: p.y, silent: true });
            if (kills % 20 === 0) stamp(stage, `${kills}!`, 'great');
          }
        }
      }
      for (const f of foes) if (!f.dead && f.r < 30) {
        f.dead = true; lives--; api.hit(0, { silent: true }); shake(A.box); vibrate([50, 30, 50]);
        mirror((g) => { g.globalAlpha = 0.6; g.fillStyle = '#000'; g.beginPath(); g.arc(f.x * 3, f.y * 3, 40, 0, TAU); g.fill(); });
        api.hud(api.t({ it: 'Vite', en: 'Lives' }), '◆'.repeat(Math.max(0, lives)) || '–');
        if (lives <= 0) { finish(); return; }
      }
      shots = shots.filter((s) => !s.dead && Math.hypot(s.x, s.y) < S * 0.6);
      foes = foes.filter((f) => !f.dead);
      art.g.globalAlpha = 1;
      // draw
      const g = A.g;
      g.fillStyle = '#060509'; g.fillRect(0, 0, A.w, A.h);
      g.drawImage(art.c, ox, oy, S * sc, S * sc);
      g.save(); g.translate(ox + S / 2 * sc, oy + S / 2 * sc); g.scale(sc, sc);
      for (const f of foes) {
        g.save(); g.translate(f.x, f.y); g.rotate(t * 3 + f.a);
        g.fillStyle = f.c; g.strokeStyle = '#fff'; g.lineWidth = 2;
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, rr = k % 2 ? f.size * 0.5 : f.size; k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke();
        if (f.hp > 1) { g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); }
        g.restore();
      }
      for (const s of shots) { g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 5, 0, TAU); g.fill(); }
      g.rotate(aim);
      g.fillStyle = '#F3EFE6'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.stroke();
      g.fillRect(10, -7, 34, 14); g.strokeRect(10, -7, 34, 14);
      g.restore();
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
