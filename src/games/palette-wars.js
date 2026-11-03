import { h } from '../core/dom.js';
import { hsl, rgbToOklab, oklabToRgb, hexToRgb, rgbToHex, lightness } from '../core/color.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { paletteExports, download } from '../core/export.js';
import { sfx, vibrate, stamp, shake } from '../core/fx.js';

const TIME = 90;
const WORLD = 2400;
const NAMES = ['Bosch', 'Goya', 'Klee', 'Frida', 'Albers', 'Itten', 'Turner', 'Munch', 'Ensor', 'Kahlo', 'Rothko', 'Bacon'];

const mixLab = (a, b, t) => {
  const A = rgbToOklab(hexToRgb(a)), B = rgbToOklab(hexToRgb(b));
  return rgbToHex(oklabToRgb(A.map((v, i) => v + (B[i] - v) * t)));
};
const rad = (m) => Math.sqrt(m) * 4;

export default {
  id: 'palette-wars',
  cat: 'colore',
  title: { it: 'Palette Wars', en: 'Palette Wars' },
  tagline: { it: 'Sei una goccia di colore. Mangi, cresci, ti mescoli. Il percorso è il quadro.', en: 'You are a drop of color. Eat, grow, blend. Your path is the painting.' },
  how: {
    it: 'Muovi la goccia col mouse, il dito o le frecce.|Mangia i pigmenti: il tuo colore si mescola con quello che mangi.|Mangia i pittori più piccoli, scappa da quelli più grandi. Tieni premuto per uno scatto (costa massa).',
    en: 'Steer your drop with mouse, finger or arrows.|Eat pigments: your color blends with what you eat.|Eat smaller painters, flee bigger ones. Hold to dash (costs mass).',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#F3EFE6"/><path d="M10 80 C40 20 70 90 110 40 S150 30 150 30" fill="none" stroke="#FF8AD0" stroke-width="10" stroke-linecap="round" opacity=".7"/><circle cx="110" cy="40" r="20" fill="#FF4D1F" stroke="#0E0E10" stroke-width="3"/><circle cx="40" cy="30" r="12" fill="#2D3BFF" stroke="#0E0E10" stroke-width="3"/><circle cx="70" cy="70" r="5" fill="#FFD400"/><circle cx="135" cy="75" r="4" fill="#12C97A"/><circle cx="20" cy="55" r="4" fill="#FF4D1F"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    const art = artLayer(WORLD, WORLD, '#F3EFE6', 0.5);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Mouse o frecce per muoverti · tieni premuto per lo scatto', en: 'Mouse or arrows to move · hold to dash' })));

    const me = { x: WORLD / 2, y: WORLD / 2, m: 40, c: hsl(Math.random() * 360, 0.8, 0.55), name: 'TU', me: true };
    const bots = NAMES.slice(0, 9).map((n, i) => ({ x: Math.random() * WORLD, y: Math.random() * WORLD, m: 20 + Math.random() * 90, c: hsl(i * 40, 0.75, 0.5), name: n, tx: 0, ty: 0, think: 0 }));
    const pel = [];
    const addPellet = () => pel.push({ x: Math.random() * WORLD, y: Math.random() * WORLD, c: hsl(Math.random() * 360, 0.7 + Math.random() * 0.3, 0.35 + Math.random() * 0.4), m: 2 + Math.random() * 2 });
    for (let i = 0; i < 380; i++) addPellet();
    const history = [me.c];
    let t = 0, histT = 0, over = false, eatenBy = null, kills = 0;
    api.hud(api.t({ it: 'Massa', en: 'Mass' }), Math.round(me.m), false);

    const finish = (dead) => {
      if (over) return; over = true;
      stopLoop();
      // Score: final mass + kills, converted into hits for rank.
      api.add(Math.round(me.m * 4));
      const pal = history.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 8)) === 0).slice(0, 8);
      api.end({
        exports: [
          { label: api.t({ it: 'Mappa dipinta (PNG)', en: 'Painted map (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-palette-wars.png', b), 'image/png') },
          ...paletteExports(pal, 'occhio-palette-wars').slice(0, 3),
        ],
        summary: pal.map((c) => h('i', { class: 'sw', style: { background: c } })),
      });
    };
    api.timer(TIME, () => finish(false));

    const eat = (a, b) => {
      // a eats b
      const t2 = b.m / (a.m + b.m);
      a.c = mixLab(a.c, b.c, t2 * 0.9);
      a.m += b.m * 0.85;
    };
    const paint = (o, r) => {
      art.g.globalAlpha = 0.18;
      art.g.fillStyle = o.c;
      art.g.beginPath(); art.g.arc(o.x, o.y, r, 0, TAU); art.g.fill();
      art.g.globalAlpha = 1;
    };

    const stopLoop = loop((dt) => {
      t += dt;
      // steer
      let dx = 0, dy = 0;
      if (inp.keys.has('ArrowLeft')) dx -= 1; if (inp.keys.has('ArrowRight')) dx += 1;
      if (inp.keys.has('ArrowUp')) dy -= 1; if (inp.keys.has('ArrowDown')) dy += 1;
      if (!dx && !dy && inp.moved) { dx = inp.x - A.w / 2; dy = inp.y - A.h / 2; }
      const len = Math.hypot(dx, dy);
      const dash = (inp.down && len > 30) || inp.keys.has(' ');
      const sp = (dash && me.m > 30 ? 2 : 1) * 260 / Math.pow(me.m, 0.22);
      if (len > 4) { me.x += (dx / len) * sp * dt * Math.min(1, len / 60 + (inp.keys.size ? 1 : 0)); me.y += (dy / len) * sp * dt * Math.min(1, len / 60 + (inp.keys.size ? 1 : 0)); }
      if (dash && me.m > 30) me.m -= 6 * dt;
      me.x = Math.max(0, Math.min(WORLD, me.x)); me.y = Math.max(0, Math.min(WORLD, me.y));
      paint(me, rad(me.m) * 0.9);
      // bots
      for (const b of bots) {
        if (b.dead) { b.respawn -= dt; if (b.respawn <= 0) Object.assign(b, { dead: false, x: Math.random() * WORLD, y: Math.random() * WORLD, m: 20 + Math.random() * 40 }); continue; }
        b.think -= dt;
        if (b.think <= 0) {
          b.think = 0.4 + Math.random() * 0.6;
          const dm = Math.hypot(me.x - b.x, me.y - b.y);
          if (dm < 500 && b.m > me.m * 1.15) { b.tx = me.x; b.ty = me.y; }
          else if (dm < 400 && me.m > b.m * 1.15) { b.tx = b.x - (me.x - b.x); b.ty = b.y - (me.y - b.y); }
          else { let best = null, bd = 1e9; for (const p of pel) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = p; } } if (best) { b.tx = best.x; b.ty = best.y; } }
        }
        const d = Math.hypot(b.tx - b.x, b.ty - b.y) || 1;
        const bs = 230 / Math.pow(b.m, 0.22) * (0.75 + t / TIME * 0.35);
        b.x += ((b.tx - b.x) / d) * bs * dt; b.y += ((b.ty - b.y) / d) * bs * dt;
        b.x = Math.max(0, Math.min(WORLD, b.x)); b.y = Math.max(0, Math.min(WORLD, b.y));
        paint(b, rad(b.m) * 0.6);
      }
      // pellets
      const all = [me, ...bots.filter((b) => !b.dead)];
      for (let i = pel.length - 1; i >= 0; i--) {
        const p = pel[i];
        for (const o of all) {
          if (Math.hypot(p.x - o.x, p.y - o.y) < rad(o.m)) {
            eat(o, p); pel.splice(i, 1); addPellet();
            if (o.me) { sfx.tick(); api.add(2); }
            break;
          }
        }
      }
      // fights
      for (const a of all) for (const b of all) {
        if (a === b || a.dead || b.dead) continue;
        if (a.m > b.m * 1.15 && Math.hypot(a.x - b.x, a.y - b.y) < rad(a.m) - rad(b.m) * 0.4) {
          eat(a, b);
          if (b.me) { eatenBy = a; shake(A.box); vibrate([60, 40, 60]); sfx.bad(); stamp(stage, api.t({ it: `MANGIATO DA ${a.name.toUpperCase()}`, en: `EATEN BY ${a.name.toUpperCase()}` }), 'bad'); api.hit(0, { silent: true, quiet: true }); setTimeout(() => finish(true), 900); over = true; stopLoop(); return; }
          b.dead = true; b.respawn = 4;
          if (a.me) {
            kills++;
            const p = toStage(stage, A.box, A.w / 2, A.h / 2 - 40);
            api.hit(1, { silent: true, x: p.x, y: p.y });
            stamp(stage, b.name.toUpperCase() + '!', 'great');
          }
        }
      }
      histT += dt;
      if (histT > 4) { histT = 0; history.push(me.c); }
      api.hud(api.t({ it: 'Massa', en: 'Mass' }), Math.round(me.m), false);

      // draw (camera on me, zoom out as you grow)
      const g = A.g;
      const zoom = Math.max(0.45, Math.min(1.2, 1.3 - me.m / 900)) * Math.min(A.w, A.h) / 700;
      g.save();
      g.fillStyle = '#E9E3D6'; g.fillRect(0, 0, A.w, A.h);
      g.translate(A.w / 2, A.h / 2); g.scale(zoom, zoom); g.translate(-me.x, -me.y);
      g.drawImage(art.c, 0, 0, WORLD, WORLD);
      g.strokeStyle = 'rgba(14,14,16,.08)'; g.lineWidth = 1 / zoom;
      for (let x = 0; x <= WORLD; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, WORLD); g.stroke(); }
      for (let y = 0; y <= WORLD; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(WORLD, y); g.stroke(); }
      g.strokeStyle = '#0E0E10'; g.lineWidth = 6; g.strokeRect(0, 0, WORLD, WORLD);
      for (const p of pel) { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 6, 0, TAU); g.fill(); }
      for (const o of all.sort((a, b) => a.m - b.m)) {
        const r = rad(o.m);
        g.fillStyle = o.c; g.strokeStyle = '#0E0E10'; g.lineWidth = 4;
        g.beginPath(); g.arc(o.x, o.y, r, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = lightness(o.c) > 0.62 ? '#0E0E10' : '#F3EFE6';
        g.font = `900 ${Math.max(12, r * 0.42)}px Archivo`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(o.me ? (api.t({ it: 'TU', en: 'YOU' })) : o.name, o.x, o.y);
      }
      g.restore();
      // mini leaderboard
      const lb = all.slice().sort((a, b) => b.m - a.m).slice(0, 5);
      g.fillStyle = 'rgba(243,239,230,.9)'; g.strokeStyle = '#0E0E10'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(A.w - 170, 12, 158, 22 + lb.length * 20, 10); g.fill(); g.stroke();
      g.font = '700 12px "JetBrains Mono"'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      lb.forEach((o, i) => { g.fillStyle = o.me ? '#FF4D1F' : '#0E0E10'; g.fillText(`${i + 1}. ${o.me ? api.t({ it: 'TU', en: 'YOU' }) : o.name}`, A.w - 158, 34 + i * 20); g.textAlign = 'right'; g.fillText(Math.round(o.m), A.w - 22, 34 + i * 20); g.textAlign = 'left'; });
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
