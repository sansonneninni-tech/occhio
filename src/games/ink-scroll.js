import { h, rand } from '../core/dom.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const W = 500, LEN = 5200; // scroll world

export default {
  id: 'inchiostro-vivo',
  cat: 'arte',
  title: { it: 'Inchiostro Vivo', en: 'Living Ink' },
  tagline: { it: 'Un pennello corre lungo un rotolo di carta di riso. Schiva le rocce, raccogli i sigilli.', en: 'A brush races down a rice-paper scroll. Dodge rocks, collect seals.' },
  how: {
    it: 'Il pennello scende da solo: guidalo a destra e sinistra col mouse, il dito o le frecce.|Tieni premuto per premere il pennello: tratto più spesso, più punti, ma più largo da far passare.|Prendi i sigilli rossi, evita le rocce. Alla fine scarichi il tuo rotolo dipinto.',
    en: 'The brush moves on its own: steer left and right with mouse, finger or arrows.|Hold to press the brush: thicker stroke, more points, but wider to squeeze through.|Grab the red seals, avoid the rocks. At the end you download your painted scroll.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#F1EBDD"/><path d="M80 0 C60 30 110 50 80 100" fill="none" stroke="#141414" stroke-width="9" stroke-linecap="round"/><ellipse cx="40" cy="40" rx="20" ry="12" fill="#5a5a5a" opacity=".5"/><ellipse cx="124" cy="70" rx="22" ry="12" fill="#5a5a5a" opacity=".5"/><rect x="104" y="20" width="14" height="14" fill="#C81E1E"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Guida con mouse o frecce · tieni premuto per un tratto spesso', en: 'Steer with mouse or arrows · hold for a thick stroke' })));
    const art = artLayer(W, LEN, '#F1EBDD', 1);
    // paper fibers
    art.g.strokeStyle = 'rgba(120,100,70,.06)';
    for (let i = 0; i < 900; i++) { const x = rand(0, W), y = rand(0, LEN); art.g.beginPath(); art.g.moveTo(x, y); art.g.lineTo(x + rand(-12, 12), y + rand(-6, 6)); art.g.stroke(); }
    // obstacles and seals
    const rocks = [], seals = [];
    for (let y = 420; y < LEN - 200; y += rand(120, 210)) {
      const lvl = y / LEN;
      const gapW = 190 - lvl * 90;
      const gapX = rand(40 + gapW / 2, W - 40 - gapW / 2);
      if (gapX - gapW / 2 > 30) rocks.push({ x: (gapX - gapW / 2) / 2, y, rx: (gapX - gapW / 2) / 2 + rand(0, 10), ry: rand(22, 40) });
      if (gapX + gapW / 2 < W - 30) rocks.push({ x: (gapX + gapW / 2 + W) / 2, y: y + rand(-20, 20), rx: (W - gapX - gapW / 2) / 2 + rand(0, 10), ry: rand(22, 40) });
      if (Math.random() < 0.65) seals.push({ x: gapX + rand(-gapW * 0.3, gapW * 0.3), y: y + rand(-60, 60) });
    }
    // ink-wash the rocks onto the scroll
    for (const r of rocks) {
      for (let k = 0; k < 5; k++) { art.g.fillStyle = `rgba(30,30,30,${0.08 + k * 0.03})`; art.g.beginPath(); art.g.ellipse(r.x + rand(-6, 6), r.y + rand(-4, 4), r.rx * (1 - k * 0.12), r.ry * (1 - k * 0.12), rand(-0.2, 0.2), 0, TAU); art.g.fill(); }
    }
    let bx = W / 2, by = 60, vy = 150, t = 0, lives = 3, over = false, inv = 0, last = null, sealsGot = 0, dist = 0;
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '墨墨墨', false);

    const finish = (won) => {
      if (over) return; over = true; stopLoop();
      const crop = () => {
        const hh = Math.min(LEN, Math.max(600, by + 100));
        const c = document.createElement('canvas'); c.width = W; c.height = hh;
        const g = c.getContext('2d'); g.drawImage(art.c, 0, 0, W, hh, 0, 0, W, hh);
        g.fillStyle = '#C81E1E'; g.fillRect(W - 70, hh - 80, 44, 44); g.fillStyle = '#F1EBDD'; g.font = '900 22px Archivo'; g.fillText('目', W - 59, hh - 50);
        c.toBlob((b) => download('occhio-rotolo.png', b), 'image/png');
      };
      api.end({ exports: [{ label: api.t({ it: 'Il tuo rotolo (PNG)', en: 'Your scroll (PNG)' }), run: crop }] });
    };
    api.timer(LEN / 175, () => finish(false));

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      vy = 150 + t * 3.2;
      by += vy * dt; dist = by;
      inv -= dt;
      // steering
      const sc = A.w / W;
      if (inp.keys.has('ArrowLeft')) bx -= 320 * dt;
      if (inp.keys.has('ArrowRight')) bx += 320 * dt;
      if (inp.moved && !inp.keys.has('ArrowLeft') && !inp.keys.has('ArrowRight')) bx += (inp.x / sc - bx) * Math.min(1, dt * 9);
      bx = Math.max(10, Math.min(W - 10, bx));
      const press = inp.down || inp.keys.has(' ');
      const width = press ? 20 : 7;
      // ink stroke on the scroll
      const g = art.g;
      if (last) {
        g.strokeStyle = '#141414'; g.lineCap = 'round';
        g.lineWidth = width + Math.sin(t * 13) * 1.2; g.globalAlpha = 0.92;
        g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(bx, by); g.stroke();
        // dry brush bristles
        g.globalAlpha = 0.35; g.lineWidth = 1;
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(last.x + k * width * 0.35, last.y); g.lineTo(bx + k * width * 0.35 + rand(-1, 1), by); g.stroke(); }
        g.globalAlpha = 1;
      }
      last = { x: bx, y: by };
      api.add((press ? 4 : 1) * dt * 10);
      // seals
      for (const s of seals) {
        if (s.got || Math.abs(s.y - by) > 20 || Math.abs(s.x - bx) > 18 + width / 2) continue;
        s.got = true; sealsGot++;
        g.fillStyle = '#C81E1E'; g.fillRect(s.x - 10, s.y - 10, 20, 20);
        const p = toStage(stage, A.box, s.x * sc, A.h * 0.3);
        api.hit(1, { x: p.x, y: p.y, silent: true });
      }
      for (const s of seals) if (!s.got && !s.missed && s.y < by - 40) { s.missed = true; api.hit(0.4, { silent: true, quiet: true }); }
      // rocks
      if (inv <= 0) for (const r of rocks) {
        const dx = (bx - r.x) / (r.rx + width / 2), dy = (by - r.y) / (r.ry + width / 2);
        if (dx * dx + dy * dy < 1) {
          inv = 1; lives--;
          g.fillStyle = 'rgba(20,20,20,.85)';
          for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(bx + rand(-30, 30), by + rand(-30, 30), rand(4, 16), 0, TAU); g.fill(); }
          api.hit(0, { silent: true }); shake(A.box); vibrate([50, 30, 50]);
          api.hud(api.t({ it: 'Vite', en: 'Lives' }), '墨'.repeat(Math.max(0, lives)) || '–');
          if (lives <= 0) { finish(false); return; }
          break;
        }
      }
      if (by > LEN - 120) { stamp(stage, api.t({ it: 'ROTOLO FINITO', en: 'SCROLL DONE' }), 'great'); api.add(500); finish(true); return; }
      // draw: camera keeps brush at 30% height
      const view = A.g;
      const camY = by - (A.h * 0.3) / sc;
      view.fillStyle = '#E9E3D6'; view.fillRect(0, 0, A.w, A.h);
      view.save(); view.scale(sc, sc); view.translate(0, -camY);
      const y0 = Math.max(0, Math.floor(camY)), y1 = Math.min(LEN, Math.ceil(camY + A.h / sc));
      view.drawImage(art.c, 0, y0 * art.scale, W * art.scale, (y1 - y0) * art.scale, 0, y0, W, y1 - y0);
      for (const s of seals) if (!s.got && s.y > camY - 30 && s.y < camY + A.h / sc + 30) { view.fillStyle = '#C81E1E'; view.fillRect(s.x - 10, s.y - 10, 20, 20); view.fillStyle = '#F1EBDD'; view.fillRect(s.x - 4, s.y - 4, 8, 8); }
      // brush
      if (!(inv > 0 && Math.floor(t * 12) % 2)) {
        view.fillStyle = '#141414'; view.beginPath(); view.ellipse(bx, by, width / 2 + 2, width / 2 + 6, 0, 0, TAU); view.fill();
        view.fillStyle = '#8a5a2b'; view.fillRect(bx - 3, by - 60, 6, 48);
      }
      view.restore();
      // progress
      view.fillStyle = '#0E0E10'; view.fillRect(0, A.h - 6, (by / LEN) * A.w, 6);
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
