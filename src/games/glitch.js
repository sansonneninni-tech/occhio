import { h, rand, pick } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 60;
const S = 600;

function generativeArt(g) {
  const base = rand(0, 360);
  g.fillStyle = hsl(base, 0.3, 0.9); g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = hsl(base + pick([0, 30, 180, 210]) + rand(-10, 10), rand(0.5, 0.9), rand(0.3, 0.7));
    g.globalAlpha = rand(0.6, 1);
    const k = pick(['c', 'r', 'a']);
    g.beginPath();
    if (k === 'c') g.arc(rand(80, 520), rand(80, 520), rand(40, 160), 0, TAU);
    else if (k === 'r') g.rect(rand(0, 400), rand(0, 400), rand(80, 300), rand(60, 240));
    else { g.moveTo(rand(0, S), rand(0, S)); g.arc(rand(100, 500), rand(100, 500), rand(80, 220), rand(0, 3), rand(3, 6)); }
    g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#0E0E10'; g.lineWidth = 6;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(rand(0, S), rand(0, S)); g.bezierCurveTo(rand(0, S), rand(0, S), rand(0, S), rand(0, S), rand(0, S), rand(0, S)); g.stroke(); }
}
// Glitch effects applied where a bug is chewing.
function chew(g, x, y, power) {
  const kind = pick(['shift', 'sort', 'rgb', 'block']);
  const sc = 2;
  const w = Math.round(rand(30, 90) * power), hh = Math.round(rand(6, 30) * power);
  const X = Math.max(0, Math.min(S - w, x - w / 2)), Y = Math.max(0, Math.min(S - hh, y - hh / 2));
  try {
    const img = g.getImageData(X * sc, Y * sc, w * sc, hh * sc);
    const d = img.data;
    if (kind === 'shift') { g.putImageData(img, (X + rand(-40, 40)) * sc, Y * sc); return; }
    if (kind === 'rgb') { for (let i = 0; i < d.length; i += 4) { const r = d[i]; d[i] = d[i + 2]; d[i + 2] = r; d[i + 1] = 255 - d[i + 1]; } }
    if (kind === 'sort') {
      const W2 = w * sc, H2 = hh * sc;
      for (let row = 0; row < H2; row++) {
        const px = [];
        for (let c = 0; c < W2; c++) { const i = (row * W2 + c) * 4; px.push([d[i], d[i + 1], d[i + 2]]); }
        px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
        px.forEach((p, c) => { const i = (row * W2 + c) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; });
      }
    }
    if (kind === 'block') { const c = [rand(0, 255), rand(0, 255), rand(0, 255)]; for (let i = 0; i < d.length; i += 4) if (Math.random() < 0.6) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; } }
    g.putImageData(img, X * sc, Y * sc);
  } catch {}
}

export default {
  id: 'glitch-guardian',
  cat: 'colore',
  title: { it: 'Glitch Guardian', en: 'Glitch Guardian' },
  tagline: { it: 'I bug divorano l’opera. Schiacciali. Quello che resta è glitch art.', en: 'Bugs are eating the artwork. Squash them. What remains is glitch art.' },
  how: {
    it: 'Bug di pixel arrivano dai bordi e mordono l’opera.|Toccali per schiacciarli: quelli grossi vanno toccati più volte.|Ogni morso glitcha il quadro (pixel spostati, ordinati, colori invertiti). Alla fine scarichi il risultato.',
    en: 'Pixel bugs crawl in from the edges and bite the artwork.|Tap to squash them: big ones need several taps.|Every bite glitches the piece (shifted, sorted, inverted pixels). Download the result at the end.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#FF8AD0"/><circle cx="70" cy="50" r="30" fill="#2D3BFF"/><rect x="40" y="40" width="80" height="8" fill="#FFD400"/><rect x="56" y="54" width="60" height="5" fill="#12C97A"/><rect x="30" y="62" width="40" height="6" fill="#F3EFE6"/><g fill="#0E0E10"><rect x="120" y="18" width="10" height="10"/><rect x="116" y="22" width="4" height="4"/><rect x="130" y="22" width="4" height="4"/></g></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Tocca o clicca i bug', en: 'Tap or click the bugs' })));
    const art = artLayer(S, S, null, 2);
    generativeArt(art.g);
    let bugs = [], t = 0, spawnT = 0.4, over = false, bites = 0, squashed = 0;
    const MAXBITES = 160;
    api.hud(api.t({ it: 'Integrità', en: 'Integrity' }), '100%', false);

    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.add(Math.round((1 - bites / MAXBITES) * 800));
      api.end({ exports: [{ label: api.t({ it: 'Glitch art (PNG)', en: 'Glitch art (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-glitch.png', b), 'image/png') }] });
    };
    api.timer(TIME, finish);
    const view = () => { const sc = Math.min(A.w, A.h) / (S * 1.25); return { sc, ox: (A.w - S * sc) / 2, oy: (A.h - S * sc) / 2 }; };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      const lvl = t / TIME;
      spawnT -= dt;
      if (spawnT <= 0) {
        const side = Math.floor(Math.random() * 4);
        const pos = rand(0, S);
        const [x, y] = side === 0 ? [pos, -60] : side === 1 ? [S + 60, pos] : side === 2 ? [pos, S + 60] : [-60, pos];
        const big = Math.random() < 0.1 + lvl * 0.25;
        bugs.push({ x, y, tx: rand(100, S - 100), ty: rand(100, S - 100), sp: (60 + lvl * 90) * (big ? 0.6 : 1), size: big ? 26 : 14, hp: big ? 4 : 1, chewT: 0, leg: 0, c: big ? '#0E0E10' : pick(['#0E0E10', '#2D3BFF', '#12C97A']) });
        spawnT = Math.max(0.22, 0.85 - lvl * 0.6);
      }
      const { sc, ox, oy } = view();
      if (inp.justDown) {
        const wx = (inp.x - ox) / sc, wy = (inp.y - oy) / sc;
        const b = bugs.filter((b) => Math.hypot(b.x - wx, b.y - wy) < b.size + 22).sort((a, c) => Math.hypot(a.x - wx, a.y - wy) - Math.hypot(c.x - wx, c.y - wy))[0];
        if (b) {
          b.hp--; b.hit = 0.1;
          if (b.hp <= 0) { b.dead = true; squashed++; const p = toStage(stage, A.box, inp.x, inp.y); api.hit(1, { x: p.x, y: p.y, silent: true }); if (squashed % 25 === 0) stamp(stage, `${squashed}!`, 'great'); }
          else sfx.tap();
        } else { api.hit(0.3, { silent: true, quiet: true }); }
      }
      for (const b of bugs) {
        if (b.dead) continue;
        b.leg += dt * 20; b.hit = (b.hit || 0) - dt;
        const d = Math.hypot(b.tx - b.x, b.ty - b.y);
        if (d > 4) { b.x += ((b.tx - b.x) / d) * b.sp * dt; b.y += ((b.ty - b.y) / d) * b.sp * dt; }
        else {
          b.chewT -= dt;
          if (b.chewT <= 0) {
            b.chewT = 0.35; bites++;
            chew(art.g, b.x, b.y, b.size > 20 ? 1.6 : 1);
            if (Math.random() < 0.3) { b.tx = Math.max(40, Math.min(S - 40, b.x + rand(-120, 120))); b.ty = Math.max(40, Math.min(S - 40, b.y + rand(-120, 120))); }
            api.hud(api.t({ it: 'Integrità', en: 'Integrity' }), Math.max(0, Math.round((1 - bites / MAXBITES) * 100)) + '%', false);
            if (bites % 12 === 0) { shake(A.box); vibrate(20); }
            if (bites >= MAXBITES) { stamp(stage, api.t({ it: 'CORROTTO', en: 'CORRUPTED' }), 'bad'); finish(); return; }
          }
        }
      }
      bugs = bugs.filter((b) => !b.dead);
      // draw
      const g = A.g;
      g.fillStyle = '#16141a'; g.fillRect(0, 0, A.w, A.h);
      g.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < A.h; y += 4) g.fillRect(0, y, A.w, 1);
      g.save(); g.translate(ox, oy); g.scale(sc, sc);
      g.fillStyle = '#000'; g.fillRect(12, 12, S, S);
      g.drawImage(art.c, 0, 0, S, S);
      g.strokeStyle = '#F3EFE6'; g.lineWidth = 3; g.strokeRect(0, 0, S, S);
      for (const b of bugs) {
        g.save(); g.translate(b.x, b.y);
        const s = b.size;
        g.fillStyle = b.hit > 0 ? '#fff' : b.c;
        g.fillRect(-s / 2, -s / 2, s, s);
        const lg = Math.sin(b.leg) * 3;
        g.fillRect(-s / 2 - 6, -s / 4 + lg, 6, 4); g.fillRect(s / 2, -s / 4 - lg, 6, 4);
        g.fillRect(-s / 2 - 6, s / 4 - lg, 6, 4); g.fillRect(s / 2, s / 4 + lg, 6, 4);
        g.fillStyle = '#FF2B2B'; g.fillRect(-s / 4 - 2, -s / 4, 4, 4); g.fillRect(s / 4 - 2, -s / 4, 4, 4);
        g.restore();
      }
      g.restore();
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
