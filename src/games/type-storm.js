import { h, pick } from '../core/dom.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { shake, vibrate, stamp } from '../core/fx.js';

const TIME = 70;
const PW = 600, PH = 850;
const ABC = 'ABCDEFGHIJKLMNOPRSTUVZ';
const STRETCH = ['ultra-condensed', 'condensed', 'normal', 'expanded', 'ultra-expanded'];
const SCHEMES = [
  { bg: '#F3EFE6', ink: ['#0E0E10', '#FF4D1F', '#2D3BFF'] },
  { bg: '#FF4D1F', ink: ['#0E0E10', '#F3EFE6', '#FFD400'] },
  { bg: '#2D3BFF', ink: ['#F3EFE6', '#FFD400', '#FF8AD0'] },
  { bg: '#0E0E10', ink: ['#F3EFE6', '#12C97A', '#FF4D1F'] },
];

export default {
  id: 'tipo-tempesta',
  cat: 'design',
  title: { it: 'Tipo Tempesta', en: 'Type Storm' },
  tagline: { it: 'Piovono lettere. Prendile al volo e componi un manifesto svizzero.', en: 'Letters rain down. Catch them and compose a Swiss poster.' },
  how: {
    it: 'Le lettere cadono: digita la lettera sulla tastiera o toccala.|Più in alto la prendi, più pesante e grande sarà nel manifesto.|Se una lettera tocca terra perdi una vita (ne hai 5).',
    en: 'Letters fall: type the letter on your keyboard or tap it.|The higher you catch it, the heavier and bigger it gets in the poster.|If a letter hits the ground you lose a life (you have 5).',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#2D3BFF"/><text x="22" y="46" font-family="Archivo" font-weight="900" font-size="40" fill="#FFD400">A</text><text x="64" y="30" font-family="Archivo" font-weight="900" font-size="26" fill="#F3EFE6">K</text><text x="96" y="64" font-family="Archivo" font-weight="900" font-size="48" fill="#FF8AD0">R</text><rect x="20" y="78" width="120" height="4" fill="#F3EFE6"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Digita le lettere · oppure toccale', en: 'Type the letters · or tap them' })));
    const scheme = pick(SCHEMES);
    const art = artLayer(PW, PH, scheme.bg, 2);
    const placed = [];
    let falling = [], t = 0, spawnT = 0.4, lives = 5, over = false, slot = 0;
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '●●●●●', false);

    // Poster grid: 6 columns, cells of varying span decided per slot.
    const nextCell = () => {
      const cols = 6, rowH = 92;
      const spans = [2, 1, 1, 3, 1, 2, 1, 2, 2, 1, 3, 2];
      let x = 0, y = 150, k = 0;
      const out = [];
      while (y < PH - 60) {
        const span = spans[k++ % spans.length];
        if (x + span > cols) { x = 0; y += rowH; continue; }
        out.push({ x: 30 + x * ((PW - 60) / cols), y, w: span * ((PW - 60) / cols), h: rowH });
        x += span;
      }
      return out;
    };
    const cells = nextCell();
    const place = (ch, quality) => {
      const c = cells[slot % cells.length];
      const g = art.g;
      const ink = scheme.ink[slot % 3 === 0 ? 0 : slot % 3];
      g.save();
      g.fillStyle = ink;
      if ('fontStretch' in g) g.fontStretch = STRETCH[Math.min(4, Math.floor(quality * 4.99))];
      const size = c.h * (0.85 + quality * 0.55);
      const weight = 300 + Math.round(quality * 6) * 100;
      g.font = `${weight} ${size}px Archivo`;
      g.textBaseline = 'alphabetic';
      if (slot >= cells.length) g.globalAlpha = 0.55; // second pass overprints
      const rotate = Math.random() < 0.15;
      g.translate(c.x + (rotate ? c.w * 0.3 : 0), c.y + c.h);
      if (rotate) g.rotate(-Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
      placed.push(ch);
      slot++;
    };

    const spawn = () => {
      const lvl = t / TIME;
      const ch = ABC[Math.floor(Math.random() * ABC.length)];
      const size = 46 + Math.random() * 26;
      falling.push({ ch, x: 30 + Math.random() * (A.w * (A.w > 700 ? 0.6 : 1) - 60), y: -size, size, vy: 55 + lvl * 120 + Math.random() * 30, col: pick(scheme.ink) });
    };
    const catchLetter = (f) => {
      falling = falling.filter((x) => x !== f);
      const q = Math.max(0.15, 1 - f.y / (A.h * 0.9));
      place(f.ch, q);
      const p = toStage(stage, A.box, f.x, f.y);
      api.hit(Math.min(1, 0.35 + q * 0.8), { x: p.x, y: p.y, silent: true });
      if (placed.length % 20 === 0) stamp(stage, `${placed.length}!`, 'great');
    };

    const finish = () => {
      if (over) return; over = true; stopLoop();
      // Header and colophon, Swiss style.
      const g = art.g;
      g.fillStyle = scheme.ink[0];
      g.font = '900 64px Archivo'; if ('fontStretch' in g) g.fontStretch = 'expanded';
      g.fillText((store.name || 'OCCHIO').toUpperCase().slice(0, 12), 30, 96);
      if ('fontStretch' in g) g.fontStretch = 'normal';
      g.font = '600 14px "JetBrains Mono"';
      g.fillText(`TIPO TEMPESTA — ${placed.length} ${api.t({ it: 'LETTERE', en: 'LETTERS' })} — ${new Date().toLocaleDateString()}`, 30, 124);
      g.fillRect(30, 134, PW - 60, 4);
      api.end({ exports: [{ label: api.t({ it: 'Manifesto (PNG)', en: 'Poster (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-manifesto.png', b), 'image/png') }] });
    };
    api.timer(TIME, finish);

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.32, 1.1 - t / TIME * 0.8); }
      for (const k of inp.pressed) {
        const K = k.toUpperCase();
        const f = falling.filter((x) => x.ch === K).sort((a, b) => b.y - a.y)[0];
        if (f) catchLetter(f);
        else if (/^[A-Z]$/.test(K)) { api.hit(0, { silent: true, quiet: true }); shake(A.box); }
      }
      if (inp.justDown) {
        const f = falling.filter((x) => Math.abs(x.x + x.size * 0.3 - inp.x) < x.size * 0.75 && Math.abs(x.y - x.size * 0.35 - inp.y) < x.size * 0.8).sort((a, b) => b.y - a.y)[0];
        if (f) catchLetter(f);
      }
      for (const f of falling) f.y += f.vy * dt;
      const fallen = falling.filter((f) => f.y > A.h + 10);
      if (fallen.length) {
        falling = falling.filter((f) => f.y <= A.h + 10);
        lives -= fallen.length;
        fallen.forEach(() => api.hit(0, { silent: true }));
        vibrate([40, 30, 40]); shake(A.box);
        api.hud(api.t({ it: 'Vite', en: 'Lives' }), '●'.repeat(Math.max(0, lives)) || '–');
        if (lives <= 0) { finish(); return; }
      }
      // draw
      const g = A.g;
      const side = A.w > 700;
      g.fillStyle = '#E9E3D6'; g.fillRect(0, 0, A.w, A.h);
      g.textBaseline = 'alphabetic';
      for (const f of falling) {
        g.font = `900 ${f.size}px Archivo`;
        g.fillStyle = '#0E0E10'; g.fillText(f.ch, f.x + 3, f.y + 3);
        g.fillStyle = f.col === scheme.bg ? '#FF4D1F' : f.col; g.fillText(f.ch, f.x, f.y);
      }
      // poster preview
      const ph = side ? A.h - 30 : Math.min(150, A.h * 0.28), pw = ph * (PW / PH);
      const px = A.w - pw - 15, py = 15;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + 5, py + 5, pw, ph);
      g.drawImage(art.c, px, py, pw, ph);
      g.strokeStyle = '#0E0E10'; g.lineWidth = 2; g.strokeRect(px, py, pw, ph);
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
