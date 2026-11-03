import { h } from '../core/dom.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { sfx, stamp, vibrate } from '../core/fx.js';

// Single-stroke skeleton font on a 4x6 grid.
const O = [[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]];
const P = [[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]];
const FONT = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 3.5], [3, 3.5]]],
  B: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 1], [3, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[1, 0], [3, 0]], [[1, 6], [3, 6]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 4]], [[1.5, 3], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [O],
  P: [P],
  Q: [O, [[2.5, 4.5], [4, 6.3]]],
  R: [P, [[2, 3], [4, 6]]],
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  0: [O, [[1, 5], [3, 1]]],
  1: [[[1, 1], [2, 0], [2, 6]]],
  2: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  3: [[[0, 0], [4, 0], [2, 2.5], [3, 2.5], [4, 3.5], [4, 5], [3, 6], [1, 6], [0, 5]]],
  4: [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  5: [[[4, 0], [0, 0], [0, 3], [3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  6: [[[3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  7: [[[0, 0], [4, 0], [1, 6]]],
  8: [[[1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]]],
  9: [[[4, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6]]],
};
const NEON = ['#FF2BD6', '#29F0FF', '#FFE629', '#7CFF4F', '#FF5A2B', '#B36BFF'];

function cleanWord(name) {
  const w = (name || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return w || 'OCCHIO';
}
// Resample a polyline into points every `step` px.
function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step));
    for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * (k / n), y0 + (y1 - y0) * (k / n)]);
  }
  return out;
}

export default {
  id: 'neon-bender',
  cat: 'design',
  title: { it: 'Neon Bender', en: 'Neon Bender' },
  tagline: { it: 'Piega il tubo al neon e scrivi il tuo nome. Ogni tremolio resta acceso.', en: 'Bend the neon tube and write your name. Every wobble stays lit.' },
  how: {
    it: 'Una scintilla percorre le lettere del tuo nome.|Tieni il dito (o il mouse) sopra la scintilla: dove passi tu, il neon si accende.|Se ti allontani, il tubo si spezza. La velocità aumenta a ogni lettera.',
    en: 'A spark runs along the letters of your name.|Keep your finger (or mouse) on the spark: where you go, the neon lights up.|Drift away and the tube breaks. It speeds up every letter.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#141218"/><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M30 76V24l26 52V24" stroke="#FF2BD6" stroke-width="7" opacity=".5"/><path d="M30 76V24l26 52V24" stroke="#FFD6F7" stroke-width="2.5"/><path d="M76 24h28M90 24v52" stroke="#29F0FF" stroke-width="7" opacity=".5"/><path d="M76 24h28M90 24v52" stroke="#DFFCFF" stroke-width="2.5"/><path d="M120 24v52h22" stroke="#FFE629" stroke-width="7" opacity=".5"/><path d="M120 24v52h22" stroke="#FFF8C8" stroke-width="2.5"/></g></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    const word = cleanWord(store.name);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: `Scrivi: ${word}`, en: `Writing: ${word}` })));
    // World: letters 4 wide + 2 gap, 6 tall, grid unit U.
    const U = 40, GAP = 2.2;
    const WW = (word.length * (4 + GAP) - GAP) * U + 2 * U, WH = 8 * U;
    const art = artLayer(WW, WH, '#141218', 2);
    // Brick wall texture on the art.
    art.g.strokeStyle = 'rgba(255,255,255,.04)'; art.g.lineWidth = 2;
    for (let y = 0; y < WH; y += 26) for (let x = (y / 26) % 2 ? -30 : 0; x < WW; x += 60) art.g.strokeRect(x, y, 60, 26);
    const strokes = [];
    [...word].forEach((ch, li) => {
      (FONT[ch] || []).forEach((st) => strokes.push({ li, color: NEON[li % NEON.length], pts: resample(st.map(([x, y]) => [U + (li * (4 + GAP) + x) * U, U + y * U]), 4) }));
    });
    let si = 0, pos = 0, waiting = true, over = false, letterQ = [], lastLi = 0, t = 0;
    const R = 34;
    const drawn = []; // svg paths
    let cur = null;
    api.hud(api.t({ it: 'Lettera', en: 'Letter' }), `1/${word.length}`, false);

    const view = () => {
      const sc = Math.min(A.w / WW, A.h / WH) * 0.96;
      return { sc, ox: (A.w - WW * sc) / 2, oy: (A.h - WH * sc) / 2 };
    };
    const neon = (g, pts, color) => {
      if (pts.length < 2) return;
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      g.shadowColor = color; g.shadowBlur = 24; g.strokeStyle = color; g.globalAlpha = 0.55; g.lineWidth = 13;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.shadowBlur = 8; g.globalAlpha = 1; g.lineWidth = 4.5; g.strokeStyle = '#fff';
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.restore();
    };
    const commit = () => {
      if (cur && cur.pts.length > 1) { neon(art.g, cur.pts, cur.color); drawn.push(cur); sfx.tick(); }
      cur = null;
    };
    const letterDone = (li) => {
      const q = letterQ.length ? letterQ.reduce((a, b) => a + b, 0) / letterQ.length : 0;
      letterQ = [];
      const { sc, ox, oy } = view();
      const p = toStage(stage, A.box, ox + (U + (li * (4 + GAP) + 2) * U) * sc, oy + U * sc);
      api.hit(q, { x: p.x, y: p.y, silent: q < 0.95 });
    };
    const finish = () => {
      if (over) return; over = true; commit(); stopLoop();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WW} ${WH}"><defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs><rect width="100%" height="100%" fill="#141218"/>${drawn.map((d) => { const pd = 'M' + d.pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L'); return `<path d="${pd}" fill="none" stroke="${d.color}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" filter="url(#g)" opacity=".8"/><path d="${pd}" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('')}</svg>`;
      api.end({
        exports: [
          { label: api.t({ it: 'Insegna neon (PNG)', en: 'Neon sign (PNG)' }), run: () => art.c.toBlob((b) => download(`occhio-neon-${word.toLowerCase()}.png`, b), 'image/png') },
          { label: 'SVG', run: () => download(`occhio-neon-${word.toLowerCase()}.svg`, svg, 'image/svg+xml') },
        ],
      });
    };
    api.timer(Math.max(30, word.length * 9), finish);

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      const { sc, ox, oy } = view();
      const wx = (inp.x - ox) / sc, wy = (inp.y - oy) / sc;
      const st = strokes[si];
      if (!st) { finish(); return; }
      const touching = inp.down || (inp.moved && matchMedia('(hover: hover)').matches);
      const spark = st.pts[Math.min(st.pts.length - 1, Math.floor(pos))];
      const d = Math.hypot(wx - spark[0], wy - spark[1]);
      if (waiting) {
        if (touching && d < R * 1.4) { waiting = false; cur = { color: st.color, pts: [] }; sfx.tap(); }
      } else {
        const speedPx = 150 + st.li * 26 + si * 3;
        pos += (speedPx / 4) * dt;
        const ok = touching && d < R * 2.2;
        letterQ.push(touching ? Math.max(0, 1 - Math.max(0, d - 6) / (R * 1.6)) : 0);
        if (ok) { if (!cur) cur = { color: st.color, pts: [] }; cur.pts.push([wx, wy]); }
        else if (cur) { commit(); vibrate(15); }
        if (pos >= st.pts.length - 1) {
          commit();
          si++; pos = 0; waiting = true;
          const next = strokes[si];
          if (!next || next.li !== st.li) {
            letterDone(st.li);
            if (next) api.hud(api.t({ it: 'Lettera', en: 'Letter' }), `${next.li + 1}/${word.length}`);
          }
          if (!next) { stamp(stage, word, 'great'); setTimeout(finish, 900); over = true; }
        }
      }
      // draw
      const g = A.g;
      g.fillStyle = '#0b0a0d'; g.fillRect(0, 0, A.w, A.h);
      g.save(); g.translate(ox, oy); g.scale(sc, sc);
      g.drawImage(art.c, 0, 0, WW, WH);
      // guides: remaining strokes faint
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; g.setLineDash([6, 8]);
      for (let k = si; k < strokes.length; k++) { const pts = strokes[k].pts; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
      g.setLineDash([]);
      if (cur) neon(g, cur.pts, cur.color);
      if (st && !over) {
        const pulse = 1 + Math.sin(t * 8) * 0.15;
        g.fillStyle = st.color; g.shadowColor = st.color; g.shadowBlur = 20;
        g.beginPath(); g.arc(spark[0], spark[1], 9 * pulse, 0, TAU); g.fill(); g.shadowBlur = 0;
        g.strokeStyle = waiting ? '#fff' : 'rgba(255,255,255,.35)'; g.lineWidth = 2;
        g.beginPath(); g.arc(spark[0], spark[1], R * (waiting ? pulse : 1), 0, TAU); g.stroke();
        if (waiting) { g.fillStyle = '#fff'; g.font = '700 16px "JetBrains Mono"'; g.textAlign = 'center'; g.fillText(api.t({ it: 'tocca qui', en: 'touch here' }), spark[0], spark[1] - R - 10); }
      }
      g.restore();
      // cursor
      if (inp.moved) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(inp.x, inp.y, 6, 0, TAU); g.stroke(); }
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
