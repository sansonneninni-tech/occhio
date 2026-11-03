// Cuneo Rosso: "Beat the Whites with the Red Wedge" (El Lissitzky, 1919) as an arcade shooter.
import { h } from '../core/dom.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { useFonts } from '../core/fonts.js';
import { store } from '../core/store.js';
import { stamp, vibrate, shake, sfx } from '../core/fx.js';

const TIME = 60;
const RED = '#D2201A', INK = '#111111', CREAM = '#EFE8D8', GREY = '#8E8A82';
const CYR = '"Russo One", "Archivo", sans-serif';

// Diagonal split of the field: cream on the left, black on the right.
function field(g, W, H, t = 0) {
  g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
  g.fillStyle = INK; g.beginPath();
  const sway = Math.sin(t * 0.4) * W * 0.03;
  g.moveTo(W * 0.62 + sway, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * 0.38 - sway, H); g.closePath(); g.fill();
}

function wedge(g, len, wid, color = RED) {
  g.fillStyle = color; g.beginPath(); g.moveTo(len * 0.6, 0); g.lineTo(-len * 0.4, -wid / 2); g.lineTo(-len * 0.4, wid / 2); g.closePath(); g.fill();
}

// Which side of the diagonal a point is on (true = black side).
const onBlack = (x, y, W, H) => x > W * 0.62 - (W * 0.24) * (y / H);

export default {
  id: 'cuneo-rosso',
  cat: 'design',
  title: { it: 'Cuneo Rosso', en: 'Red Wedge' },
  tagline: { it: 'Batti i bianchi col cuneo rosso. Ogni cerchio spezzato diventa un manifesto costruttivista.', en: 'Beat the Whites with the Red Wedge. Every broken circle becomes a Constructivist poster.' },
  how: {
    it: 'Tocca o clicca dove vuoi colpire: il cuneo rosso parte da sinistra e attraversa tutto.|I cerchi bianchi grandi si spezzano in due, i piccoli esplodono in schegge. Più cerchi con un solo cuneo = combo.|Se un cerchio arriva al bordo sinistro perdi un fronte. Ne hai tre.',
    en: 'Tap or click where you want to strike: the red wedge flies from the left and pierces everything.|Big white circles split in two, small ones shatter. More circles with one wedge = combo.|If a circle reaches the left edge you lose a front. You have three.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="${CREAM}"/><path d="M98 0H160V100H62Z" fill="${INK}"/><circle cx="112" cy="50" r="28" fill="${CREAM}"/><path d="M128 50 L30 30 L30 70Z" fill="${RED}"/><rect x="18" y="12" width="34" height="5" fill="${INK}" transform="rotate(-20 35 14)"/><rect x="120" y="84" width="30" height="5" fill="${RED}"/><circle cx="140" cy="18" r="6" fill="${CREAM}"/></svg>`,

  mount(stage, api) {
    useFonts(['Russo One']);
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Clic dove vuoi colpire · tieni premuto per raffica', en: 'Click where you want to strike · hold to keep firing' })));

    // The world keeps the proportions the arena had when the game started.
    const K = Math.min(A.w, A.h) / 700;
    const W = Math.round(A.w / K), H = Math.round(A.h / K);
    const art = artLayer(W, H, null, 1.5);
    const L = { x: 40, y: H / 2 };
    let t = 0, spawnT = 0.4, cool = 0, lives = 3, over = false, broken = 0, bestChain = 0, aimA = 0;
    const circles = [], wedges = [], shards = [];
    api.hud(api.t({ it: 'Fronti', en: 'Fronts' }), '▲▲▲', false);

    const view = () => { const sc = Math.min(A.w / W, A.h / H); return { sc, ox: (A.w - W * sc) / 2, oy: (A.h - H * sc) / 2 }; };

    const spawn = () => {
      const lvl = Math.min(1, t / TIME);
      const big = Math.random() < 0.45;
      const r = big ? 46 + Math.random() * 22 : 20 + Math.random() * 16;
      const armored = lvl > 0.35 && Math.random() < 0.18;
      circles.push({ x: W + r, y: r + Math.random() * (H - 2 * r), r, vx: -(40 + lvl * 85 + Math.random() * 25) * (big ? 0.75 : 1), vy: (Math.random() - 0.5) * 90, hp: armored ? 2 : 1, armored, rings: big ? 2 + Math.floor(Math.random() * 3) : 0, hitT: 0 });
    };

    const fire = (tx, ty) => {
      const a = Math.atan2(ty - L.y, tx - L.x);
      wedges.push({ x: L.x, y: L.y, a, v: 1500, hits: 0, life: 1.6, hitIds: new Set(), x0: L.x, y0: L.y });
      sfx.tick(); cool = 0.26;
    };

    const shatter = (c, a) => {
      // constructivist fragments: bars, squares and arcs that settle on the poster
      const n = 5 + Math.floor(c.r / 6);
      for (let k = 0; k < n; k++) {
        const kind = Math.random();
        shards.push({
          x: c.x, y: c.y, vx: Math.cos(a + (Math.random() - 0.5) * 1.6) * (200 + Math.random() * 380), vy: Math.sin(a + (Math.random() - 0.5) * 1.6) * (200 + Math.random() * 380),
          rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 0.45 + Math.random() * 0.35,
          kind: kind < 0.45 ? 'bar' : kind < 0.75 ? 'sq' : 'arc', s: 6 + Math.random() * c.r * 0.6,
          col: Math.random() < 0.4 ? RED : Math.random() < 0.6 ? INK : GREY,
        });
      }
    };
    const drawShard = (g, s) => {
      g.save(); g.translate(s.x, s.y); g.rotate(s.rot);
      const black = onBlack(s.x, s.y, W, H);
      g.fillStyle = s.col === INK && black ? CREAM : s.col; g.strokeStyle = g.fillStyle;
      if (s.kind === 'bar') g.fillRect(-s.s, -s.s * 0.08, s.s * 2, s.s * 0.16 + 2);
      else if (s.kind === 'sq') g.fillRect(-s.s * 0.3, -s.s * 0.3, s.s * 0.6, s.s * 0.6);
      else { g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s.s * 0.6, 0, Math.PI); g.stroke(); }
      g.restore();
    };

    const finish = () => {
      if (over) return; over = true;
      stopLoop();
      api.end({
        exports: [{ label: api.t({ it: 'Manifesto agitprop (PNG)', en: 'Agitprop poster (PNG)' }), run: poster }],
        summary: api.t({ it: `${broken} cerchi spezzati · catena migliore ×${bestChain}`, en: `${broken} circles broken · best chain ×${bestChain}` }),
      });
    };
    api.timer(TIME, finish);

    const poster = async () => {
      await useFonts(['Russo One']);
      const PW = 1200, PH = 1600;
      const c = document.createElement('canvas'); c.width = PW; c.height = PH;
      const g = c.getContext('2d');
      field(g, PW, PH);
      // the battle, from the game, placed in the middle band
      const bandH = PW * (H / W);
      g.drawImage(art.c, 0, 380, PW, bandH);
      // the great wedge and the white circle
      g.fillStyle = CREAM; g.beginPath(); g.arc(PW * 0.7, 380 + bandH / 2, Math.min(260, bandH * 0.42), 0, TAU); g.fill();
      g.save(); g.translate(PW * 0.48, 380 + bandH / 2); g.rotate(-0.08); wedge(g, 760, 240); g.restore();
      g.save(); g.translate(90, 200); g.rotate(-0.12);
      g.font = `110px ${CYR}`; g.fillStyle = INK; g.fillText('КЛИНОМ', 0, 0);
      g.fillStyle = RED; g.fillText('КРАСНЫМ', 40, 120);
      g.restore();
      g.save(); g.translate(PW - 80, PH - 300); g.rotate(-0.12); g.textAlign = 'right';
      g.font = `130px ${CYR}`; g.fillStyle = CREAM; g.fillText('БЕЙ', 0, 0); g.fillText('БЕЛЫХ', 0, 130);
      g.restore();
      // rules and caption
      g.fillStyle = RED; g.save(); g.translate(60, PH - 140); g.rotate(-0.12); g.fillRect(0, 0, 520, 14); g.restore();
      g.fillStyle = INK; g.font = '700 24px "JetBrains Mono", monospace';
      g.fillText(`${(store.name || 'OCCHIO').toUpperCase()} · ${broken} BIANCHI · ×${bestChain}`, 60, PH - 70);
      g.fillStyle = CREAM; g.textAlign = 'right'; g.font = '900 34px Archivo, sans-serif'; g.fillText(`OCCHIO ${new Date().getFullYear()}`, PW - 60, PH - 60);
      c.toBlob((b) => download(`occhio-cuneo-rosso-${broken}.png`, b), 'image/png');
    };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      const { sc, ox, oy } = view();
      const wx = (inp.x - ox) / sc, wy = (inp.y - oy) / sc;
      aimA = Math.atan2(wy - L.y, Math.max(20, wx - L.x));
      L.y += ((Math.max(60, Math.min(H - 60, wy))) - L.y) * Math.min(1, dt * 3) * 0.25;
      cool -= dt;
      if ((inp.justDown || ((inp.down || inp.keys.has(' ')) && cool <= 0)) && cool <= 0.1) fire(Math.max(L.x + 30, wx), wy);
      spawnT -= dt;
      const lvl = Math.min(1, t / TIME);
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.42, 1.35 - lvl * 0.9) * (0.7 + Math.random() * 0.6); }

      // circles
      for (let i = circles.length - 1; i >= 0; i--) {
        const c = circles[i];
        c.x += c.vx * dt; c.y += c.vy * dt; c.hitT -= dt;
        if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy); }
        if (c.y > H - c.r) { c.y = H - c.r; c.vy = -Math.abs(c.vy); }
        if (c.x < 0) {
          circles.splice(i, 1);
          lives--;
          api.hit(0, { silent: true });
          api.hud(api.t({ it: 'Fronti', en: 'Fronts' }), '▲'.repeat(Math.max(0, lives)) || '–');
          stamp(stage, api.t({ it: 'SFONDATO!', en: 'BREACHED!' }), 'bad');
          // a white stain on the poster
          art.g.fillStyle = CREAM; art.g.globalAlpha = 0.8; art.g.beginPath(); art.g.arc(30, c.y, c.r * 1.4, 0, TAU); art.g.fill(); art.g.globalAlpha = 1;
          shake(A.box); vibrate([40, 30, 40]);
          if (lives <= 0) { finish(); return; }
        }
      }
      // wedges
      for (let i = wedges.length - 1; i >= 0; i--) {
        const w = wedges[i];
        const px = w.x, py = w.y;
        w.x += Math.cos(w.a) * w.v * dt; w.y += Math.sin(w.a) * w.v * dt; w.life -= dt;
        for (let j = circles.length - 1; j >= 0; j--) {
          const c = circles[j];
          if (w.hitIds.has(c)) continue;
          // segment-circle test
          const sx = w.x - px, sy = w.y - py, l2 = sx * sx + sy * sy || 1;
          const tt = Math.max(0, Math.min(1, ((c.x - px) * sx + (c.y - py) * sy) / l2));
          const qx = px + sx * tt, qy = py + sy * tt;
          if (Math.hypot(c.x - qx, c.y - qy) > c.r + 8) continue;
          w.hitIds.add(c);
          c.hp--; c.hitT = 0.1;
          if (c.hp > 0) { c.armored = false; sfx.tap(); shatter({ ...c, r: c.r * 0.4 }, w.a); continue; }
          w.hits++; broken++;
          bestChain = Math.max(bestChain, w.hits);
          circles.splice(j, 1);
          // first impact leaves the wedge print on the poster
          if (w.hits === 1) { art.g.save(); art.g.translate(c.x, c.y); art.g.rotate(w.a); art.g.globalAlpha = 0.85; wedge(art.g, c.r * 2.4, c.r * 0.9); art.g.restore(); art.g.globalAlpha = 1; }
          if (c.r > 30) {
            // split in two halves that fly apart
            for (const s of [-1, 1]) circles.push({ x: c.x, y: c.y, r: c.r * 0.62, vx: c.vx * 0.6 + Math.cos(w.a + s * 1.4) * 130, vy: Math.sin(w.a + s * 1.4) * 200, hp: 1, armored: false, rings: Math.max(0, c.rings - 1), hitT: 0.15 });
            w.hitIds.add(circles.at(-1)); w.hitIds.add(circles.at(-2));
          } else {
            // small: shatter and print the fragments
            shatter(c, w.a);
          }
          // the poster keeps a geometric trace of every circle broken
          art.g.save(); art.g.translate(c.x, c.y); art.g.rotate(w.a + Math.PI / 2);
          art.g.strokeStyle = onBlack(c.x, c.y, W, H) ? CREAM : INK; art.g.lineWidth = 2;
          art.g.beginPath(); art.g.arc(0, 0, c.r, 0, Math.PI); art.g.stroke(); art.g.restore();
          const p = toStage(stage, A.box, ox + c.x * sc, oy + c.y * sc);
          api.hit(w.hits >= 2 ? 1 : 0.86, { silent: true, x: p.x, y: p.y });
          if (w.hits >= 3) { stamp(stage, `×${w.hits}!`, 'great'); sfx.combo(w.hits + 2); }
          vibrate(10);
        }
        if (w.life <= 0 || w.x > W + 80 || w.y < -80 || w.y > H + 80) {
          // the wedge path is a thin rule on the poster
          art.g.strokeStyle = w.hits ? RED : INK; art.g.globalAlpha = w.hits ? 0.55 : 0.18; art.g.lineWidth = w.hits ? 3 : 1;
          art.g.beginPath(); art.g.moveTo(w.x0, w.y0); art.g.lineTo(w.x, w.y); art.g.stroke(); art.g.globalAlpha = 1;
          if (!w.hits) api.hit(0.45, { silent: true, quiet: true });
          wedges.splice(i, 1);
        }
      }
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.9; s.vy *= 0.9; s.rot += s.vr * dt; s.life -= dt;
        if (s.life <= 0) { drawShard(art.g, s); shards.splice(i, 1); }
      }

      // ---------- draw ----------
      const g = A.g;
      g.fillStyle = INK; g.fillRect(0, 0, A.w, A.h);
      g.save(); g.translate(ox, oy); g.scale(sc, sc);
      field(g, W, H, t);
      // giant faint slogan in the background
      g.save(); g.globalAlpha = 0.08; g.font = `${H * 0.42}px ${CYR}`; g.fillStyle = RED; g.translate(W * 0.05, H * 0.78); g.rotate(-0.12); g.fillText('КЛИН', 0, 0); g.restore();
      g.drawImage(art.c, 0, 0, W, H);
      for (const s of shards) drawShard(g, s);
      for (const c of circles) {
        const black = onBlack(c.x, c.y, W, H);
        g.fillStyle = c.hitT > 0 ? RED : CREAM;
        g.beginPath(); g.arc(c.x, c.y, c.r, 0, TAU); g.fill();
        g.strokeStyle = INK; g.lineWidth = black ? 0 : 3; if (!black) g.stroke();
        g.strokeStyle = black ? INK : GREY; g.lineWidth = 2;
        for (let k = 1; k <= c.rings; k++) { g.beginPath(); g.arc(c.x, c.y, c.r * (1 - k * 0.22), 0, TAU); g.stroke(); }
        if (c.armored) { g.fillStyle = INK; g.fillRect(c.x - c.r * 0.55, c.y - 5, c.r * 1.1, 10); g.fillRect(c.x - 5, c.y - c.r * 0.55, 10, c.r * 1.1); }
      }
      for (const w of wedges) { g.save(); g.translate(w.x, w.y); g.rotate(w.a); wedge(g, 90, 34); g.restore(); }
      // launcher: a red wedge aiming at the pointer, with a dashed sight line
      g.save(); g.translate(L.x, L.y); g.rotate(aimA);
      g.setLineDash([6, 10]); g.strokeStyle = RED; g.globalAlpha = 0.5; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 0); g.lineTo(W, 0); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      wedge(g, 70 + Math.max(0, cool) * 60, 40);
      g.restore();
      g.fillStyle = INK; g.fillRect(0, 0, 10, H);
      g.restore();
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
