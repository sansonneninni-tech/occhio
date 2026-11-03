import { h } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp } from '../core/fx.js';

const TIME = 60;

export default {
  id: 'light-painting',
  cat: '3d',
  title: { it: 'Light Painting', en: 'Light Painting' },
  tagline: { it: 'Una lunga esposizione. Cattura le luci che arrivano dal buio e dipingi col tuo movimento.', en: 'A long exposure. Catch lights flying out of the dark and paint with your motion.' },
  how: {
    it: 'Le sfere di luce volano verso di te dalla profondità.|Porta la tua torcia (mouse o dito) sopra la sfera quando arriva in primo piano: prendi il suo colore.|Ogni tuo movimento resta impresso nella foto. Evita le schegge rosse.',
    en: 'Light orbs fly toward you from the depth.|Bring your torch (mouse or finger) over an orb as it reaches the front: you take its color.|Every movement stays burned into the photo. Avoid the red shards.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#07060a"/><path d="M10 70 C40 10 70 90 100 30 S150 60 150 60" fill="none" stroke="#29F0FF" stroke-width="5" opacity=".9"/><path d="M10 74 C40 14 70 94 100 34" fill="none" stroke="#FF2BD6" stroke-width="3"/><circle cx="100" cy="30" r="8" fill="#fff"/><circle cx="40" cy="26" r="3" fill="#FFE629"/><circle cx="128" cy="20" r="2" fill="#fff"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Muovi la torcia · prendi le sfere quando sono grandi', en: 'Move the torch · catch orbs when they are big' })));
    let art = artLayer(A.w, A.h, '#050407', 2);
    let color = '#ffffff', t = 0, spawnT = 0, lives = 3, over = false, last = null, caught = 0;
    let orbs = [];
    const flashes = [];
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '✦✦✦', false);

    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.end({ exports: [{ label: api.t({ it: 'Foto a lunga esposizione (PNG)', en: 'Long exposure photo (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-light-painting.png', b), 'image/png') }] });
    };
    api.timer(TIME, finish);
    const spawn = () => {
      const lvl = t / TIME;
      const bad = Math.random() < 0.12 + lvl * 0.2;
      orbs.push({ x: (Math.random() - 0.5) * 1.7, y: (Math.random() - 0.5) * 1.4, z: 1, vz: 0.32 + lvl * 0.45 + Math.random() * 0.1, bad, c: hsl(Math.random() * 360, 1, 0.62), vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 });
    };
    const project = (o) => { const s = 1 / (0.15 + o.z * 1.6); return { x: A.w / 2 + o.x * A.w * 0.35 * s, y: A.h / 2 + o.y * A.h * 0.35 * s, r: Math.min(A.w, A.h) * 0.03 * s, s }; };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.28, 0.9 - t / TIME * 0.6); }
      const tx = inp.x, ty = inp.y;
      const active = matchMedia('(hover: none)').matches ? inp.down : inp.moved;
      if (!active) last = null;
      // paint trail into exposure (additive)
      if (active) {
        const g = art.g;
        g.save(); g.globalCompositeOperation = 'lighter';
        if (last) {
          const sp = Math.hypot(tx - last.x, ty - last.y);
          g.strokeStyle = color; g.lineCap = 'round'; g.globalAlpha = 0.5; g.lineWidth = Math.max(2, 9 - sp * 0.05);
          g.shadowColor = color; g.shadowBlur = 16;
          g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(tx, ty); g.stroke();
          g.globalAlpha = 0.9; g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.shadowBlur = 0;
          g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(tx, ty); g.stroke();
        }
        g.restore();
        last = { x: tx, y: ty };
      }
      for (const o of orbs) { o.z -= o.vz * dt; o.x += o.vx * dt; o.y += o.vy * dt; }
      // catch zone: z between 0.0 and 0.18
      for (const o of orbs) {
        if (o.done) continue;
        const p = project(o);
        if (o.z < 0.2 && o.z > -0.05 && active && Math.hypot(p.x - tx, p.y - ty) < p.r * 1.25 + 14) {
          o.done = true;
          const sp = toStage(stage, A.box, p.x, p.y);
          if (o.bad) {
            lives--; api.hit(0, { silent: true }); shake(A.box); vibrate([50, 30, 50]);
            const g = art.g; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,40,40,.25)'; g.beginPath(); g.arc(p.x, p.y, p.r * 3, 0, TAU); g.fill(); g.restore();
            api.hud(api.t({ it: 'Vite', en: 'Lives' }), '✦'.repeat(Math.max(0, lives)) || '–');
            if (lives <= 0) { finish(); return; }
          } else {
            color = o.c; caught++;
            const q = Math.max(0.5, 1 - Math.abs(o.z - 0.08) / 0.14);
            api.hit(q, { x: sp.x, y: sp.y, silent: true });
            flashes.push({ x: p.x, y: p.y, r: p.r, c: o.c, life: 1 });
            // burst burned into the exposure
            const g = art.g; g.save(); g.globalCompositeOperation = 'lighter';
            for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; g.strokeStyle = o.c; g.globalAlpha = 0.5; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.cos(a) * p.r * 2.6, p.y + Math.sin(a) * p.r * 2.6); g.stroke(); }
            g.restore();
            if (caught % 12 === 0) stamp(stage, `${caught}`, 'great');
          }
        } else if (o.z < -0.05 && !o.done) {
          o.done = true;
          if (!o.bad) api.hit(0.2, { silent: true, quiet: true });
        }
      }
      orbs = orbs.filter((o) => o.z > -0.2);
      // draw
      const g = A.g;
      g.drawImage(art.c, 0, 0, A.w, A.h);
      for (const o of orbs.slice().sort((a, b) => b.z - a.z)) {
        if (o.done) continue;
        const p = project(o);
        const ready = o.z < 0.2;
        g.save();
        if (o.bad) {
          g.fillStyle = '#FF2B2B'; g.translate(p.x, p.y); g.rotate(t * 3);
          g.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? p.r * 0.45 : p.r * 1.2; const a = (k / 8) * TAU; k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
        } else {
          g.shadowColor = o.c; g.shadowBlur = ready ? 30 : 12;
          g.fillStyle = o.c; g.globalAlpha = Math.min(1, 0.3 + (1 - o.z));
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, p.r * 0.4, 0, TAU); g.fill();
          if (ready) { g.shadowBlur = 0; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, p.r * 1.4, 0, TAU); g.stroke(); }
        }
        g.restore();
      }
      for (const f of flashes) { f.life -= dt * 2.5; g.strokeStyle = f.c; g.globalAlpha = Math.max(0, f.life); g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, f.r * (3 - f.life * 2), 0, TAU); g.stroke(); g.globalAlpha = 1; }
      for (let i = flashes.length - 1; i >= 0; i--) if (flashes[i].life <= 0) flashes.splice(i, 1);
      if (active) { g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 20; g.beginPath(); g.arc(tx, ty, 8, 0, TAU); g.fill(); g.shadowBlur = 0; }
      inp.frame();
    });
    A.onResize = (w, hh) => { const old = art; art = artLayer(w, hh, '#050407', 2); art.g.drawImage(old.c, 0, 0, w, hh); last = null; };
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
