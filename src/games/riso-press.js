import { h, rand, pick } from '../core/dom.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { button } from '../core/ui.js';
import { sfx, stamp, vibrate } from '../core/fx.js';

const INKS = [
  { name: 'Fluo Pink', c: '#FF48B0' }, { name: 'Medium Blue', c: '#3255A4' }, { name: 'Yellow', c: '#FFE800' },
  { name: 'Green', c: '#00A95C' }, { name: 'Orange', c: '#FF6C2F' }, { name: 'Black', c: '#1A1A1A' },
];
const PRINTS = 3;
const W = 600, H = 800;

// One layer = a set of random bold shapes drawn as a mask.
function layerShapes(k) {
  const out = [];
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    out.push({ kind: pick(['circle', 'half', 'rect', 'stripes', 'tri', 'blob']), x: rand(80, W - 80), y: rand(100, H - 140), s: rand(90, 220), r: rand(0, TAU) });
  }
  if (k === 3) out.push({ kind: 'text', x: W / 2, y: H - 90, s: 90, r: 0 });
  return out;
}
function drawShape(g, sh, word) {
  g.save(); g.translate(sh.x, sh.y); g.rotate(sh.r);
  g.beginPath();
  const s = sh.s;
  if (sh.kind === 'circle') g.arc(0, 0, s / 2, 0, TAU);
  else if (sh.kind === 'half') g.arc(0, 0, s / 2, 0, Math.PI);
  else if (sh.kind === 'rect') g.rect(-s / 2, -s / 3, s, s * 0.66);
  else if (sh.kind === 'tri') { g.moveTo(0, -s / 2); g.lineTo(s / 2, s / 2); g.lineTo(-s / 2, s / 2); g.closePath(); }
  else if (sh.kind === 'stripes') { for (let i = -3; i <= 3; i++) g.rect(-s / 2, i * s / 7 - s / 28, s, s / 14); }
  else if (sh.kind === 'blob') { for (let i = 0; i <= 10; i++) { const a = (i / 10) * TAU, rr = s / 2 * (0.7 + 0.3 * Math.sin(a * 3 + s)); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
  else if (sh.kind === 'text') { g.restore(); g.save(); g.font = `900 ${s}px Archivo`; g.textAlign = 'center'; g.fillText(word, sh.x, sh.y); g.restore(); return; }
  g.fill();
  g.restore();
}
// Paint the layer through a halftone-ish grain, multiply blend, with registration offset.
function inkLayer(target, shapes, ink, dx, dy, word) {
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mg = m.getContext('2d');
  mg.fillStyle = ink; shapes.forEach((s) => drawShape(mg, s, word));
  mg.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { mg.globalAlpha = Math.random() * 0.5; mg.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  target.save(); target.globalCompositeOperation = 'multiply'; target.globalAlpha = 0.92;
  target.drawImage(m, dx, dy); target.restore();
}

export default {
  id: 'riso-press',
  cat: 'colore',
  title: { it: 'Riso Press', en: 'Riso Press' },
  tagline: { it: 'Stampa a tempo: ogni colpo è uno strato di inchiostro. Il registro sballato è il tuo stile.', en: 'Print on the beat: every hit is an ink layer. Your misregistration is your style.' },
  how: {
    it: 'Il telaio con lo strato di colore scorre sopra il foglio.|Premi STAMPA (o spazio) quando le crocette di registro coincidono.|4 strati per stampa, 3 stampe. Più vai avanti, più il telaio corre.',
    en: 'The screen with the color layer slides over the paper.|Hit PRINT (or space) when the registration crosses line up.|4 layers per print, 3 prints. It gets faster each time.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#F7F3EA"/><circle cx="70" cy="50" r="30" fill="#FF48B0" opacity=".9"/><circle cx="80" cy="46" r="26" fill="#3255A4" style="mix-blend-mode:multiply" opacity=".85"/><rect x="40" y="62" width="80" height="16" fill="#FFE800" style="mix-blend-mode:multiply"/><path d="M14 14h14M21 7v14M132 86h14M139 79v14" stroke="#0E0E10" stroke-width="2.5"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    let press = null;
    const btn = button(api.t({ it: 'STAMPA', en: 'PRINT' }), () => (press = true), 'btn--big');
    btn.style.minWidth = '240px';
    controls.append(btn, h('span', { class: 'keys-hint' }, api.t({ it: 'oppure spazio / clic sul foglio', en: 'or space / click the paper' })));
    const word = (api.t({ it: 'OCCHIO', en: 'OCCHIO' }));
    const prints = [];
    let printIdx = 0, layerIdx = 0, sheet = null, shapes = null, inks = null, phase = 0, flash = 0, over = false;
    let offs = { x: 0, y: 0 }, axis = 'x', speed = 1;
    const newPrint = () => {
      sheet = artLayer(W, H, '#F7F3EA', 1.5);
      inks = [...INKS].sort(() => Math.random() - 0.5).slice(0, 4);
      if (!inks.find((i) => i.name === 'Black')) inks[3] = INKS[5];
      shapes = inks.map((_, k) => layerShapes(k));
      layerIdx = 0;
    };
    newPrint();
    api.hud(api.t({ it: 'Stampa', en: 'Print' }), `1/${PRINTS}`, false);

    const stopLoop = loop((dt) => {
      if (over) return;
      const total = printIdx * 4 + layerIdx;
      speed = 1 + total * 0.22;
      phase += dt * speed * 1.6;
      axis = layerIdx % 2 === 0 ? 'x' : 'y';
      const amp = 120;
      const o = Math.sin(phase) * amp;
      offs = axis === 'x' ? { x: o, y: 0 } : { x: 0, y: o };
      if (inp.justDown || inp.pressed.has(' ') || inp.pressed.has('Enter')) press = true;
      if (press) {
        press = false;
        const err = Math.hypot(offs.x, offs.y);
        inkLayer(sheet.g, shapes[layerIdx], inks[layerIdx].c, offs.x, offs.y, word);
        flash = 1;
        const q = Math.max(0, 1 - Math.max(0, err - 3) / 45);
        const p = toStage(stage, A.box, A.w / 2, A.h * 0.3);
        api.hit(q, { x: p.x, y: p.y, silent: q < 0.95 });
        vibrate(25);
        layerIdx++;
        phase = Math.random() * TAU;
        if (layerIdx >= 4) {
          prints.push(sheet);
          printIdx++;
          stamp(stage, api.t({ it: 'STAMPATO!', en: 'PRINTED!' }), 'great');
          if (printIdx >= PRINTS) { over = true; setTimeout(finish, 900); }
          else { newPrint(); api.hud(api.t({ it: 'Stampa', en: 'Print' }), `${printIdx + 1}/${PRINTS}`); }
        }
      }
      // draw
      const g = A.g;
      g.fillStyle = '#2A2724'; g.fillRect(0, 0, A.w, A.h);
      const sc = Math.min((A.w - 40) / W, (A.h - 40) / H);
      const ox = (A.w - W * sc) / 2, oy = (A.h - H * sc) / 2;
      g.save(); g.translate(ox, oy); g.scale(sc, sc);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(10, 12, W, H);
      g.drawImage(sheet.c, 0, 0, W, H);
      // registration crosses on paper
      const cross = (x, y, col) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.moveTo(x, y - 18); g.lineTo(x, y + 18); g.stroke(); g.beginPath(); g.arc(x, y, 10, 0, TAU); g.stroke(); };
      [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].forEach(([x, y]) => cross(x, y, '#1A1A1A'));
      if (!over && layerIdx < 4) {
        // the moving screen preview
        g.save(); g.translate(offs.x, offs.y);
        g.globalAlpha = 0.45; g.fillStyle = inks[layerIdx].c;
        shapes[layerIdx].forEach((s) => drawShape(g, s, word));
        g.globalAlpha = 1;
        [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].forEach(([x, y]) => cross(x, y, inks[layerIdx].c));
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.setLineDash([8, 8]); g.strokeRect(-8, -8, W + 16, H + 16); g.setLineDash([]);
        g.restore();
        g.fillStyle = '#F7F3EA'; g.font = '700 22px "JetBrains Mono"'; g.textAlign = 'left';
        g.fillText(`${layerIdx + 1}/4 · ${inks[layerIdx].name}`, 0, -14 / sc + 6);
      }
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.6})`; g.fillRect(0, 0, W, H); flash -= dt * 4; }
      g.restore();
      inp.frame();
    });
    function finish() {
      stopLoop();
      const combo = () => {
        const c = document.createElement('canvas'); c.width = prints.length * W * 1.5 + (prints.length - 1) * 40; c.height = H * 1.5;
        const g = c.getContext('2d'); g.fillStyle = '#2A2724'; g.fillRect(0, 0, c.width, c.height);
        prints.forEach((p, i) => g.drawImage(p.c, i * (W * 1.5 + 40), 0));
        c.toBlob((b) => download('occhio-riso-serie.png', b), 'image/png');
      };
      api.end({
        exports: [
          ...prints.map((p, i) => ({ label: api.t({ it: `Stampa ${i + 1} (PNG)`, en: `Print ${i + 1} (PNG)` }), run: () => p.c.toBlob((b) => download(`occhio-riso-${i + 1}.png`, b), 'image/png') })),
          { label: api.t({ it: 'Serie completa (PNG)', en: 'Full series (PNG)' }), run: combo },
        ],
      });
    }
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
