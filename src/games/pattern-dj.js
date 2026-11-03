import { h } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { stamp, vibrate } from '../core/fx.js';

const KEYS = ['d', 'f', 'j', 'k'];
const NOTES = 64;
const LEAD = 1.6; // seconds a note takes to fall

let actx = null;
function drum(kind, when = 0) {
  if (store.muted) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    if (kind === 'kick') { o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.15); g.gain.setValueAtTime(0.35, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18); }
    else if (kind === 'hat') { o.type = 'square'; o.frequency.setValueAtTime(6000 + Math.random() * 2000, t0); g.gain.setValueAtTime(0.03, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.04); }
    else { o.type = 'triangle'; o.frequency.setValueAtTime(kind, t0); g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2); }
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + 0.25);
  } catch {}
}
const SCALE = [261.6, 311.1, 349.2, 392, 466.2, 523.3];

function motif(g, lane, x, y, s, rot, col) {
  g.save(); g.translate(x + s / 2, y + s / 2); g.rotate(rot); g.fillStyle = col;
  const r = s / 2;
  g.beginPath();
  if (lane === 0) g.arc(0, 0, r * 0.8, 0, TAU);
  else if (lane === 1) g.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
  else if (lane === 2) { g.moveTo(-r, r); g.lineTo(r, r); g.lineTo(-r, -r); g.closePath(); }
  else { g.moveTo(-r, -r); g.arc(-r, -r, s, 0, Math.PI / 2); g.closePath(); }
  g.fill(); g.restore();
}
function motifSVG(lane, x, y, s, rotDeg, col) {
  const c = `${x + s / 2} ${y + s / 2}`, r = s / 2;
  let d;
  if (lane === 0) return `<circle cx="${x + r}" cy="${y + r}" r="${(r * 0.8).toFixed(2)}" fill="${col}"/>`;
  if (lane === 1) d = `M${-r * 0.7} ${-r * 0.7}h${r * 1.4}v${r * 1.4}h${-r * 1.4}Z`;
  else if (lane === 2) d = `M${-r} ${r}L${r} ${r}L${-r} ${-r}Z`;
  else d = `M${-r} ${-r}L${r} ${-r}A${s} ${s} 0 0 1 ${-r} ${r}Z`;
  return `<path d="${d}" transform="translate(${c}) rotate(${rotDeg})" fill="${col}"/>`;
}

export default {
  id: 'pattern-dj',
  cat: 'design',
  title: { it: 'Pattern DJ', en: 'Pattern DJ' },
  tagline: { it: 'Suona il ritmo, stampa la fantasia. Ogni nota è una mattonella.', en: 'Play the beat, print the pattern. Every note is a tile.' },
  how: {
    it: 'Le note scendono su 4 corsie: tocca la corsia (o premi D F J K) quando arrivano sulla linea.|Ogni nota presa a tempo stampa un motivo nella tua mattonella 8×8.|Più sei preciso, più il motivo è grande. Alla fine scarichi una fantasia che si ripete all’infinito.',
    en: 'Notes fall on 4 lanes: tap the lane (or press D F J K) when they hit the line.|Every on-beat note stamps a motif into your 8×8 tile.|The more precise, the bigger the motif. At the end you download a seamless pattern.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#2D3BFF"/>${[0, 1, 2, 3].map((x) => [0, 1, 2].map((y) => { const c = ['#FFD400', '#FF4D1F', '#F3EFE6', '#FF8AD0'][(x + y) % 4]; const X = 24 + x * 30, Y = 6 + y * 30; return (x + y) % 2 ? `<circle cx="${X + 13}" cy="${Y + 13}" r="11" fill="${c}"/>` : `<path d="M${X} ${Y + 26}L${X + 26} ${Y + 26}L${X} ${Y}Z" fill="${c}"/>`; }).join('')).join('')}</svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Tasti D F J K oppure tocca le corsie', en: 'Keys D F J K or tap the lanes' })));
    const base = Math.random() * 360;
    const cols = [0, 1, 2, 3].map((i) => hsl(base + i * 70, 0.8, 0.55));
    const bg = hsl(base + 200, 0.35, 0.92);
    // Chart: notes on 8th notes with rests; BPM rises.
    const notes = [];
    let tt = 2.2, bpm = 100;
    while (notes.length < NOTES) {
      const step = 60 / bpm / 2;
      if (Math.random() < 0.72) {
        const lane = Math.floor(Math.random() * 4);
        notes.push({ t: tt, lane, done: false });
        // occasional chord
        if (notes.length > 20 && Math.random() < 0.12 && notes.length < NOTES) notes.push({ t: tt, lane: (lane + 2) % 4, done: false });
      }
      tt += step;
      bpm = Math.min(158, bpm + 0.9);
    }
    const endT = notes.at(-1).t + 1.2;
    const cells = []; // {lane, q, rot}
    let t = -0.2, beatIdx = 0, over = false, flashes = [0, 0, 0, 0];
    api.hud(api.t({ it: 'Mattonelle', en: 'Tiles' }), `0/${NOTES}`, false);

    const layoutDims = () => {
      const side = A.w > 700;
      const lanesW = side ? A.w * 0.55 : A.w;
      const tileS = side ? Math.min(A.w - lanesW - 40, A.h - 40) : Math.min(120, A.w * 0.3);
      return { side, lanesW, laneW: lanesW / 4, lineY: A.h * 0.82, tileS, tileX: side ? lanesW + (A.w - lanesW - tileS) / 2 : A.w - tileS - 10, tileY: side ? (A.h - tileS) / 2 : 10 };
    };
    const judge = (lane) => {
      const cand = notes.filter((n) => !n.done && n.lane === lane && Math.abs(n.t - t) < 0.22).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
      flashes[lane] = 1;
      const L = layoutDims();
      if (!cand) return;
      cand.done = true;
      const e = Math.abs(cand.t - t);
      const q = e < 0.05 ? 1 : e < 0.1 ? 0.82 : e < 0.16 ? 0.55 : 0.3;
      cells.push({ lane, q, rot: ((cells.length + lane) % 4) * Math.PI / 2 });
      drum(SCALE[(lane + cells.length) % SCALE.length]);
      const p = toStage(stage, A.box, (lane + 0.5) * L.laneW, L.lineY - 30);
      api.hit(q, { x: p.x, y: p.y, silent: true, quiet: true });
      if (q === 1) vibrate(10);
      api.hud(api.t({ it: 'Mattonelle', en: 'Tiles' }), `${cells.length}/${NOTES}`, false);
      if (api.combo && api.combo % 16 === 0) stamp(stage, `COMBO ${api.combo}`, 'great');
    };

    const finish = () => {
      if (over) return; over = true; stopLoop();
      const S = 50, N = 8;
      const tileSVG = (ox = 0, oy = 0) => cells.slice(0, 64).map((c, i) => c.lane < 0 ? '' : motifSVG(c.lane, ox + (i % N) * S, oy + Math.floor(i / N) * S, S * (0.55 + c.q * 0.45), (c.rot * 180) / Math.PI, cols[c.lane])).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S * N} ${S * N}"><rect width="100%" height="100%" fill="${bg}"/>${tileSVG()}</svg>`;
      const png = () => {
        const c = document.createElement('canvas'); c.width = c.height = 1200;
        const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 1200, 1200);
        for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) cells.slice(0, 64).forEach((cl, i) => cl.lane >= 0 && motif(g, cl.lane, tx * 400 + (i % N) * S, ty * 400 + Math.floor(i / N) * S, S * (0.55 + cl.q * 0.45), cl.rot, cols[cl.lane]));
        c.toBlob((b) => download('occhio-pattern-3x3.png', b), 'image/png');
      };
      api.end({
        exports: [
          { label: api.t({ it: 'Mattonella (SVG)', en: 'Tile (SVG)' }), run: () => download('occhio-pattern-tile.svg', svg, 'image/svg+xml') },
          { label: api.t({ it: 'Fantasia 3×3 (PNG)', en: 'Pattern 3×3 (PNG)' }), run: png },
        ],
      });
    };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      // beat
      const beatLen = 60 / Math.min(158, 100 + beatIdx * 0.45);
      if (t > beatIdx * beatLen) { drum(beatIdx % 2 ? 'hat' : 'kick'); beatIdx++; }
      const L = layoutDims();
      for (const k of inp.pressed) { const lane = KEYS.indexOf(k.toLowerCase()); if (lane >= 0) judge(lane); }
      if (inp.justDown && inp.x < L.lanesW) judge(Math.min(3, Math.floor(inp.x / L.laneW)));
      // misses
      for (const n of notes) if (!n.done && t - n.t > 0.22) { n.done = true; n.missed = true; cells.push({ lane: -1 }); api.hit(0, { silent: true, quiet: true }); }
      if (t > endT) { finish(); return; }
      // draw
      const g = A.g;
      g.fillStyle = '#0E0E10'; g.fillRect(0, 0, A.w, A.h);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? '#17171b' : '#1d1d22'; g.fillRect(i * L.laneW, 0, L.laneW, A.h);
        if (flashes[i] > 0) { g.fillStyle = cols[i]; g.globalAlpha = flashes[i] * 0.25; g.fillRect(i * L.laneW, 0, L.laneW, A.h); g.globalAlpha = 1; flashes[i] -= dt * 5; }
        g.fillStyle = '#F3EFE6'; g.globalAlpha = 0.5; g.font = '700 14px "JetBrains Mono"'; g.textAlign = 'center';
        g.fillText(KEYS[i].toUpperCase(), (i + 0.5) * L.laneW, A.h - 14); g.globalAlpha = 1;
      }
      g.strokeStyle = '#F3EFE6'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, L.lineY); g.lineTo(L.lanesW, L.lineY); g.stroke();
      const size = Math.min(L.laneW * 0.6, 56);
      for (const n of notes) {
        if (n.done) continue;
        const y = L.lineY - ((n.t - t) / LEAD) * L.lineY;
        if (y < -size || y > A.h) continue;
        motif(g, n.lane, (n.lane + 0.5) * L.laneW - size / 2, y - size / 2, size, 0, cols[n.lane]);
      }
      // tile under construction
      g.fillStyle = bg; g.fillRect(L.tileX, L.tileY, L.tileS, L.tileS);
      const cs = L.tileS / 8;
      cells.slice(0, 64).forEach((c, i) => { if (c.lane >= 0) motif(g, c.lane, L.tileX + (i % 8) * cs + cs * (1 - (0.55 + c.q * 0.45)) / 2, L.tileY + Math.floor(i / 8) * cs + cs * (1 - (0.55 + c.q * 0.45)) / 2, cs * (0.55 + c.q * 0.45), c.rot, cols[c.lane]); });
      g.strokeStyle = '#F3EFE6'; g.lineWidth = 2; g.strokeRect(L.tileX, L.tileY, L.tileS, L.tileS);
      inp.frame();
    });
    api.timer(endT, () => {});
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
