import { h } from '../core/dom.js';
import { hsl, mix } from '../core/color.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download, paletteExports } from '../core/export.js';
import { store } from '../core/store.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 75;
const FAR = 30;

export default {
  id: 'prisma-runner',
  cat: '3d',
  title: { it: 'Prisma Runner', en: 'Prism Runner' },
  tagline: { it: 'Corri nel 3D, raccogli prismi, evita i monoliti. La corsa diventa uno spettro.', en: 'Run through 3D, grab prisms, dodge monoliths. Your run becomes a spectrum.' },
  how: {
    it: 'Cambia corsia con le frecce, scorrendo col dito o toccando a destra/sinistra.|Ogni prisma raccolto aggiunge una banda di colore al tuo spettro.|I monoliti neri ti tolgono una vita. Gli archi bianchi danno un arcobaleno bonus.',
    en: 'Change lane with arrows, swipes, or tapping left/right.|Every prism adds a color band to your spectrum.|Black monoliths cost a life. White arches give a rainbow bonus.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="pr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1036"/><stop offset="1" stop-color="#ff4d8a"/></linearGradient></defs><rect width="160" height="100" fill="url(#pr)"/><path d="M80 40 L0 100 M80 40 L160 100 M80 40 L53 100 M80 40 L107 100" stroke="#12C97A" stroke-width="2"/><path d="M70 60l8-12 8 12-8 6z" fill="#FFD400" stroke="#0E0E10" stroke-width="2"/><rect x="96" y="56" width="10" height="20" fill="#0E0E10"/><path d="M74 92l6-10 6 10z" fill="#F3EFE6" stroke="#0E0E10" stroke-width="2"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Frecce ← → · oppure tocca/scorri', en: 'Arrows ← → · or tap/swipe' })));
    let lane = 1, px = 1, t = 0, speed = 9, dist = 0, lives = 3, over = false, spawnZ = 6, inv = 0, swipeX = null;
    let objs = [];
    const bands = [];
    let tint = '#12C97A';
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '▲▲▲', false);

    const spawnRow = (z) => {
      const lvl = Math.min(1, t / TIME);
      const blocked = new Set();
      const nMono = Math.random() < 0.25 + lvl * 0.5 ? (Math.random() < lvl * 0.6 ? 2 : 1) : 0;
      while (blocked.size < nMono) blocked.add(Math.floor(Math.random() * 3));
      for (const l of blocked) objs.push({ kind: 'mono', lane: l, z });
      const free = [0, 1, 2].filter((l) => !blocked.has(l));
      if (Math.random() < 0.08) objs.push({ kind: 'arch', lane: free[Math.floor(Math.random() * free.length)], z });
      else if (Math.random() < 0.8) objs.push({ kind: 'gem', lane: free[Math.floor(Math.random() * free.length)], z, c: hsl((t * 25 + Math.random() * 90) % 360, 0.85, 0.58) });
    };
    for (let z = 8; z < FAR; z += 3.2) spawnRow(z);

    const proj = (laneX, z, H) => {
      const hor = A.h * 0.36;
      const s = 1 / (1 + z * 0.35);
      const roadW = A.w * 0.9;
      return { x: A.w / 2 + (laneX - 1) * (roadW / 3) * s, y: hor + (A.h - hor) * s - H * s * A.h * 0.25, s };
    };

    const finish = () => {
      if (over) return; over = true; stopLoop();
      const uniq = bands.filter((b, i) => b && i % Math.max(1, Math.floor(bands.length / 8)) === 0).slice(0, 8);
      const poster = () => {
        const W = 1200, H = 1600;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.fillStyle = '#120d22'; g.fillRect(0, 0, W, H);
        const rows = 6, per = Math.ceil(Math.max(1, bands.length) / rows), bw = (W - 160) / per;
        bands.forEach((b, i) => {
          const r = Math.floor(i / per), k = i % per;
          g.fillStyle = b || '#0E0E10';
          g.fillRect(80 + k * bw, 220 + r * 200, Math.ceil(bw), 170);
        });
        g.fillStyle = '#F3EFE6'; g.font = '900 110px Archivo'; g.fillText('SPETTRO', 80, 160);
        g.font = '700 26px "JetBrains Mono"';
        g.fillText(`${(store.name || '').toUpperCase()} · ${Math.round(dist)} m · ${bands.filter(Boolean).length} prismi`, 80, H - 120);
        c.toBlob((bl) => download('occhio-spettro.png', bl), 'image/png');
      };
      api.end({
        exports: [{ label: api.t({ it: 'Spettro della corsa (PNG)', en: 'Run spectrum (PNG)' }), run: poster }, ...(uniq.length ? paletteExports(uniq, 'occhio-spettro').slice(0, 3) : [])],
        summary: uniq.map((c) => h('i', { class: 'sw', style: { background: c } })),
      });
    };
    api.timer(TIME, finish);

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      speed = 9 + t * 0.22;
      inv -= dt;
      if (inp.pressed.has('ArrowLeft') || inp.pressed.has('a')) lane = Math.max(0, lane - 1);
      if (inp.pressed.has('ArrowRight') || inp.pressed.has('d')) lane = Math.min(2, lane + 1);
      if (inp.justDown) swipeX = inp.x;
      if (inp.justUp && swipeX != null) {
        const dx = inp.x - swipeX;
        if (Math.abs(dx) > 30) lane = Math.max(0, Math.min(2, lane + Math.sign(dx)));
        else lane = Math.max(0, Math.min(2, lane + (inp.x < A.w / 2 ? -1 : 1)));
        swipeX = null;
      }
      px += (lane - px) * Math.min(1, dt * 14);
      dist += speed * dt;
      for (const o of objs) o.z -= speed * dt;
      spawnZ -= speed * dt;
      const maxZ = Math.max(...objs.map((o) => o.z), 0);
      if (maxZ < FAR - 3.2) spawnRow(maxZ + 3.2 + Math.random() * 1.2);
      // collisions at z≈0
      for (const o of objs) {
        if (o.hit || o.z > 0.6 || o.z < -0.6) continue;
        if (Math.abs(o.lane - px) > 0.45) continue;
        o.hit = true;
        const p = proj(px, 0.2, 0.3), sp = toStage(stage, A.box, p.x, p.y);
        if (o.kind === 'gem') { bands.push(o.c); tint = o.c; api.hit(1, { x: sp.x, y: sp.y, silent: true }); }
        else if (o.kind === 'arch') { for (let k = 0; k < 6; k++) bands.push(hsl(k * 60, 0.85, 0.6)); api.add(300, { x: sp.x, y: sp.y }); stamp(stage, api.t({ it: 'ARCOBALENO!', en: 'RAINBOW!' }), 'great'); sfx.great(); }
        else if (inv <= 0) {
          lives--; inv = 1.2; bands.push(null);
          api.hit(0, { silent: true }); shake(A.box); vibrate([50, 30, 50]);
          api.hud(api.t({ it: 'Vite', en: 'Lives' }), '▲'.repeat(Math.max(0, lives)) || '–');
          if (lives <= 0) { finish(); return; }
        }
      }
      objs = objs.filter((o) => o.z > -1.5);
      // draw
      const g = A.g;
      const hor = A.h * 0.36;
      const sky = g.createLinearGradient(0, 0, 0, hor);
      sky.addColorStop(0, '#120d22'); sky.addColorStop(1, mix(tint, '#120d22', 0.55));
      g.fillStyle = sky; g.fillRect(0, 0, A.w, hor);
      // sun with stripes
      g.save(); g.beginPath(); g.rect(0, 0, A.w, hor); g.clip();
      const sunR = Math.min(A.w, A.h) * 0.16;
      g.fillStyle = mix(tint, '#FFD400', 0.4); g.beginPath(); g.arc(A.w / 2, hor, sunR, Math.PI, 0); g.fill();
      g.fillStyle = sky; for (let k = 0; k < 6; k++) g.fillRect(A.w / 2 - sunR, hor - k * sunR / 6 - 3 - (t * 20) % (sunR / 6), sunR * 2, 3 + k * 0.6);
      g.restore();
      g.fillStyle = '#0b0818'; g.fillRect(0, hor, A.w, A.h - hor);
      // grid
      g.strokeStyle = tint; g.lineWidth = 2; g.globalAlpha = 0.7;
      for (let l = -1; l <= 4; l++) { const a = proj(l - 0.5, 0, 0), b = proj(l - 0.5, FAR, 0); g.beginPath(); g.moveTo(a.x, A.h); g.lineTo(b.x, b.y); g.stroke(); }
      for (let z = (-(dist % 2)); z < FAR; z += 2) { const a = proj(-1.5, z, 0), b = proj(3.5, z, 0); if (a.y < hor) continue; g.globalAlpha = 0.25 + 0.5 * (1 - z / FAR); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      g.globalAlpha = 1;
      // objects far to near
      for (const o of objs.slice().sort((a, b) => b.z - a.z)) {
        if (o.hit && o.kind !== 'mono') continue;
        if (o.z < -0.8) continue;
        const p = proj(o.lane, Math.max(0.01, o.z), 0);
        const s = p.s * Math.min(A.w, A.h) * 0.22;
        if (o.kind === 'gem') {
          const y = p.y - s * 0.9 - Math.sin(t * 4 + o.z) * s * 0.1;
          g.fillStyle = o.c; g.strokeStyle = '#0E0E10'; g.lineWidth = Math.max(1, 3 * p.s);
          g.beginPath(); g.moveTo(p.x, y - s * 0.55); g.lineTo(p.x + s * 0.4, y); g.lineTo(p.x, y + s * 0.35); g.lineTo(p.x - s * 0.4, y); g.closePath(); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(p.x, y - s * 0.55); g.lineTo(p.x + s * 0.4, y); g.lineTo(p.x, y); g.closePath(); g.fill();
        } else if (o.kind === 'mono') {
          g.fillStyle = '#050407'; g.strokeStyle = tint; g.lineWidth = Math.max(1, 2 * p.s);
          g.fillRect(p.x - s * 0.32, p.y - s * 1.6, s * 0.64, s * 1.6); g.strokeRect(p.x - s * 0.32, p.y - s * 1.6, s * 0.64, s * 1.6);
        } else {
          g.strokeStyle = '#F3EFE6'; g.lineWidth = Math.max(2, 8 * p.s);
          g.beginPath(); g.arc(p.x, p.y, s * 0.7, Math.PI, 0); g.stroke();
        }
      }
      // player prism
      const pp = proj(px, 0.05, 0);
      const ps = Math.min(A.w, A.h) * 0.075;
      if (!(inv > 0 && Math.floor(t * 12) % 2)) {
        g.fillStyle = '#F3EFE6'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(pp.x, pp.y - ps * 1.4); g.lineTo(pp.x + ps * 0.8, pp.y - ps * 0.1); g.lineTo(pp.x - ps * 0.8, pp.y - ps * 0.1); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = tint; g.lineWidth = 4; g.beginPath(); g.moveTo(pp.x - ps * 0.2, pp.y - ps * 0.7); g.lineTo(pp.x + ps * 1.6, pp.y - ps * 0.4); g.stroke();
      }
      // live spectrum strip
      const bw = Math.min(8, (A.w - 20) / Math.max(1, bands.length));
      bands.slice(-Math.floor((A.w - 20) / bw)).forEach((b, i) => { g.fillStyle = b || '#333'; g.fillRect(10 + i * bw, 10, Math.ceil(bw), 14); });
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
