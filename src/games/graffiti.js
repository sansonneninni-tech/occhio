import { h } from '../core/dom.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 60;
const W = 1000, H = 560;
const SPRAYS = ['#FF2BD6', '#29F0FF', '#FFE629', '#7CFF4F', '#FF5A2B', '#F3EFE6'];

export default {
  id: 'writer-notturno',
  cat: 'arte',
  title: { it: 'Writer Notturno', en: 'Night Writer' },
  tagline: { it: 'Fai il tuo tag sul muro prima che la guardia ti illumini.', en: 'Paint your tag on the wall before the guard’s light finds you.' },
  how: {
    it: 'Tieni premuto per spruzzare. Riempi le lettere del tuo nome.|Quando il fascio della torcia ti passa sopra, smetti di spruzzare o ti beccano.|Cambia bomboletta con i pallini. Più copri, più punti.',
    en: 'Hold to spray. Fill in the letters of your name.|When the flashlight beam passes over you, stop spraying or you get caught.|Switch can with the dots. More coverage, more points.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#2a2522"/><g stroke="#3a332e" stroke-width="2">${[0, 1, 2, 3].map((y) => `<path d="M0 ${y * 25 + 25}H160"/>`).join('')}</g><text x="18" y="66" font-family="Archivo" font-weight="900" font-size="44" fill="#FF2BD6" transform="rotate(-6 80 50)">TAG</text><path d="M160 0 L90 100 L160 100Z" fill="#FFE9A0" opacity=".35"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    let ci = 0;
    const pal = h('div', { class: 'pal' }, SPRAYS.map((c, i) => { const b = h('button', { type: 'button', style: { background: c }, 'aria-pressed': String(i === 0), 'aria-label': c }); b.onclick = () => { ci = i; [...pal.children].forEach((x, k) => x.setAttribute('aria-pressed', String(k === i))); }; return b; }));
    controls.append(pal);
    const word = ((store.name || 'OCCHIO').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'OCCHIO').slice(0, 7);
    const art = artLayer(W, H, null, 1.5);
    // brick wall
    const wall = art.g;
    wall.fillStyle = '#3a312b'; wall.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? -50 : 0; x < W; x += 100) {
      wall.fillStyle = `hsl(18, ${12 + Math.random() * 10}%, ${20 + Math.random() * 8}%)`; wall.fillRect(x + 3, y + 3, 94, 34);
    }
    // letter mask
    const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
    const mg = mask.getContext('2d');
    mg.font = `900 ${Math.min(320, (W * 1.25) / word.length)}px Archivo`; mg.textAlign = 'center'; mg.textBaseline = 'middle';
    mg.fillStyle = '#000'; mg.fillText(word, W / 2, H / 2 + 10);
    const md = mg.getImageData(0, 0, W, H).data;
    const cellsTotal = [];
    const GRID = 10;
    for (let y = 0; y < H; y += GRID) for (let x = 0; x < W; x += GRID) if (md[((y + 5) * W + x + 5) * 4 + 3] > 128) cellsTotal.push(y * W + x);
    const covered = new Set();
    const inside = new Set(cellsTotal);
    let t = 0, lives = 3, over = false, caughtT = 0, beam = { a: 0, dir: 1, speed: 0.6 }, last = null, cov = 0;
    api.hud(api.t({ it: 'Copertura', en: 'Coverage' }), '0%', false);

    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.add(Math.round(cov * 1500));
      api.end({ exports: [{ label: api.t({ it: 'Il muro (PNG)', en: 'The wall (PNG)' }), run: () => art.c.toBlob((b) => download(`occhio-tag-${word.toLowerCase()}.png`, b), 'image/png') }] });
    };
    api.timer(TIME, finish);

    const view = () => { const sc = Math.min(A.w / W, A.h / H); return { sc, ox: (A.w - W * sc) / 2, oy: (A.h - H * sc) / 2 }; };
    const beamPoly = () => {
      const ox = W * (0.5 + 0.55 * Math.sin(beam.a)), oy = -40;
      const tx = W * (0.5 + 0.6 * Math.sin(beam.a * 1.7 + 1)), ty = H + 40;
      const wdt = 170 + 60 * Math.sin(t * 0.7);
      return [[ox - 20, oy], [ox + 20, oy], [tx + wdt, ty], [tx - wdt, ty]];
    };
    const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      beam.a += dt * (0.55 + t / TIME * 0.9);
      caughtT -= dt;
      const { sc, ox, oy } = view();
      const wx = (inp.x - ox) / sc, wy = (inp.y - oy) / sc;
      const poly = beamPoly();
      const spraying = (inp.down || inp.keys.has(' ')) && caughtT <= 0;
      if (spraying) {
        if (inPoly(wx, wy, poly)) {
          caughtT = 1.5; lives--; api.hit(0, { silent: true });
          stamp(stage, api.t({ it: 'BECCATO!', en: 'CAUGHT!' }), 'bad'); shake(A.box); vibrate([80, 40, 80]);
          api.hud(api.t({ it: 'Vite', en: 'Lives' }), '●'.repeat(Math.max(0, lives)) || '–');
          if (lives <= 0) { setTimeout(finish, 600); over = true; }
        } else {
          const g = art.g;
          const col = SPRAYS[ci];
          g.fillStyle = col;
          for (let k = 0; k < 26; k++) { const a = Math.random() * TAU, r = Math.random() ** 0.6 * 26; g.globalAlpha = 0.35; g.fillRect(wx + Math.cos(a) * r, wy + Math.sin(a) * r, 2, 2); }
          g.globalAlpha = 0.25; g.beginPath(); g.arc(wx, wy, 14, 0, TAU); g.fill(); g.globalAlpha = 1;
          if (last && Math.hypot(wx - last.x, wy - last.y) < 3 && Math.random() < 0.04) { // drip
            g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.random() * 2, wy + 20 + Math.random() * 40); g.stroke();
          }
          last = { x: wx, y: wy };
          // coverage
          let gained = 0;
          for (let dy = -20; dy <= 20; dy += GRID) for (let dx = -20; dx <= 20; dx += GRID) {
            if (dx * dx + dy * dy > 420) continue;
            const cx = Math.floor((wx + dx) / GRID) * GRID, cy = Math.floor((wy + dy) / GRID) * GRID;
            const key = cy * W + cx;
            if (inside.has(key) && !covered.has(key)) { covered.add(key); gained++; }
          }
          if (gained) { api.add(gained); if (Math.random() < 0.1) sfx.tick(); }
          const nc = covered.size / cellsTotal.length;
          if (Math.floor(nc * 10) > Math.floor(cov * 10)) { const p = toStage(stage, A.box, inp.x, inp.y); api.hit(1, { x: p.x, y: p.y, silent: true }); }
          cov = nc;
          api.hud(api.t({ it: 'Copertura', en: 'Coverage' }), Math.round(cov * 100) + '%', false);
          if (cov > 0.97) { stamp(stage, 'KING!', 'great'); setTimeout(finish, 700); over = true; }
        }
      } else last = null;
      // draw
      const g = A.g;
      g.fillStyle = '#0b0a09'; g.fillRect(0, 0, A.w, A.h);
      g.save(); g.translate(ox, oy); g.scale(sc, sc);
      g.drawImage(art.c, 0, 0, W, H);
      // night overlay + letter outlines
      g.fillStyle = 'rgba(5,5,12,.45)'; g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#F3EFE6'; g.setLineDash([10, 8]); g.lineWidth = 3;
      g.font = mg.font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(word, W / 2, H / 2 + 10); g.restore();
      // beam
      g.fillStyle = caughtT > 0 ? 'rgba(255,60,60,.35)' : 'rgba(255,236,170,.28)';
      g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      g.restore();
      // spray can cursor
      if (inp.moved) { g.strokeStyle = SPRAYS[ci]; g.lineWidth = 2; g.beginPath(); g.arc(inp.x, inp.y, 26 * sc, 0, TAU); g.stroke(); }
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
