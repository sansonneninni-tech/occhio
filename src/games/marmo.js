import { h, rand, clamp } from '../core/dom.js';
import { stageCanvas, loop, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { stamp, sfx, vibrate, pulse } from '../core/fx.js';
import { store } from '../core/store.js';

// Suminagashi war. Every drop pushes the old rings outward with the real marbling formula
// P' = C + (P - C) * sqrt(1 + r^2 / |P - C|^2), so ink is pushed off the tray, never erased.
const TIME = 60;
const WATER = '#EFE7D4';
const INKS = [
  { col: '#2333E8', col2: '#7FD6FF', name: { it: 'TU', en: 'YOU' } },
  { col: '#F2421B', col2: '#FF9CC8', name: { it: 'VERMIGLIO', en: 'VERMILION' } },
  { col: '#141216', col2: '#8F8A7E', name: { it: 'SUMI', en: 'SUMI' } },
];
const hexRGB = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
// palette used to read the tray back: [rgb, owner]
const PAL = [[hexRGB(WATER), -1], ...INKS.flatMap((k, i) => [[hexRGB(k.col), i], [hexRGB(k.col2), i]])];
const fillOf = (d) => (d.o < 0 ? WATER : d.tone ? INKS[d.o].col2 : INKS[d.o].col);
const MAXPTS = 3500;

export default {
  id: 'marmo',
  cat: 'folle',
  title: { it: 'Marmo', en: 'Marble War' },
  tagline: { it: 'Guerra di inchiostri sull’acqua. Ogni goccia spinge via le altre: butta fuori i rivali e tieni la carta marmorizzata.', en: 'An ink war on water. Every drop pushes the others away: push your rivals off and keep the marbled paper.' },
  how: {
    it: 'Tieni premuto sull’acqua: più tieni, più grande è la goccia blu.|La goccia spinge via gli anelli intorno. L’inchiostro spinto fuori dalla vasca è perso.|Trascina per pettinare e tirare l’inchiostro dove vuoi. Dopo 60 secondi vince chi copre di più.',
    en: 'Hold on the water: the longer you hold, the bigger the blue drop.|The drop pushes the nearby rings away. Ink pushed off the tray is lost.|Drag to comb and pull ink wherever you want. After 60 seconds, whoever covers the most wins.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#EFE7D4"/>${[44, 36, 28, 20, 12].map((r, i) => `<circle cx="58" cy="52" r="${r}" fill="${['#141216', '#EFE7D4', '#F2421B', '#EFE7D4', '#2333E8'][i]}"/>`).join('')}<path d="M100 0 C90 30 130 40 112 100 L160 100 L160 0Z" fill="#2333E8"/><path d="M120 0 C108 34 146 44 130 100 L160 100 L160 0Z" fill="#F2421B"/><path d="M0 84 C40 70 80 98 160 80" fill="none" stroke="#141216" stroke-width="4"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    A.box.style.background = WATER;
    const inkBar = h('i', { style: { display: 'block', height: '100%', width: '100%', background: INKS[0].col, transformOrigin: 'left', transition: 'transform .08s linear' } });
    controls.append(
      h('span', { class: 'keys-hint' }, api.t({ it: 'Tieni premuto = goccia · trascina = pettine', en: 'Hold = drop · drag = comb' })),
      h('span', { style: { display: 'inline-block', width: '120px', height: '12px', border: 'var(--line)', borderRadius: '99px', overflow: 'hidden', background: '#fff' }, title: 'ink' }, inkBar),
    );

    let W = A.w, H = A.h;
    let drops = []; // { o: owner (-1 = clear water), p: number[] }
    let ripples = [];
    let lastStamp = 0, t = 0, over = false, ink = 100, share = [0, 0, 0], leader = -1, secAcc = 0, qAcc = 0;
    const cov = document.createElement('canvas');
    const cg = cov.getContext('2d', { willReadFrequently: true });
    let grid = null, gw = 96, gh = 64;
    const grain = makeGrain();

    // ---- marbling operations ----
    function circle(cx, cy, r) {
      const n = Math.max(36, Math.ceil((TAU * r) / 5));
      const p = new Array(n * 2);
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; p[i * 2] = cx + Math.cos(a) * r; p[i * 2 + 1] = cy + Math.sin(a) * r; }
      return p;
    }
    function dropAt(cx, cy, r, o, tone = 0) {
      const r2 = r * r;
      for (const d of drops) {
        const p = d.p;
        for (let i = 0; i < p.length; i += 2) {
          const dx = p[i] - cx, dy = p[i + 1] - cy, m2 = dx * dx + dy * dy || 1e-6;
          const k = Math.sqrt(1 + r2 / m2);
          p[i] = cx + dx * k; p[i + 1] = cy + dy * k;
        }
      }
      drops.push({ o, tone, p: circle(cx, cy, r) });
      refine();
      ripples.push({ x: cx, y: cy, r, life: 1, col: o >= 0 ? INKS[o].col : '#ffffff' });
    }
    // a comb with several parallel tines
    function comb(ax, ay, bx, by, power = 0.9, tines = 5, gap = 26) {
      const L = Math.hypot(bx - ax, by - ay);
      if (L < 1) return;
      const nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (let k = 0; k < tines; k++) {
        const o = (k - (tines - 1) / 2) * gap * scaleR();
        tine(ax + nx * o, ay + ny * o, bx + nx * o, by + ny * o, power);
      }
      refine();
    }
    function tine(ax, ay, bx, by, power) {
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const lam = 14;
      for (const d of drops) {
        const p = d.p;
        for (let i = 0; i < p.length; i += 2) {
          const px = p[i], py = p[i + 1];
          const tt = clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1);
          const qx = ax + dx * tt - px, qy = ay + dy * tt - py;
          const dd = Math.sqrt(qx * qx + qy * qy);
          const f = (lam / (dd + lam)) ** 3 * power;
          p[i] = px + dx * f; p[i + 1] = py + dy * f;
        }
      }
    }
    function swirl(dt) {
      // slow, area-preserving vortex: angle depends only on radius
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.45, w0 = 0.05 * Math.sin(t * 0.21);
      for (const d of drops) {
        const p = d.p;
        for (let i = 0; i < p.length; i += 2) {
          const dx = p[i] - cx, dy = p[i + 1] - cy, rr = Math.sqrt(dx * dx + dy * dy);
          const a = w0 * dt * Math.exp(-rr / R), c = Math.cos(a), s = Math.sin(a);
          p[i] = cx + dx * c - dy * s; p[i + 1] = cy + dx * s + dy * c;
        }
      }
    }
    function refine() {
      const m = 40;
      drops = drops.filter((d) => {
        const p = d.p;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < p.length; i += 2) { if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i]; if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1]; }
        if (x1 < -m || y1 < -m || x0 > W + m || y0 > H + m) return false;
        // a drop wrapping the whole tray: keep it, it is the background ring
        if (p.length / 2 >= MAXPTS) return true;
        const out = [];
        const n = p.length / 2;
        for (let i = 0; i < n; i++) {
          const ax = p[i * 2], ay = p[i * 2 + 1], j = (i + 1) % n, bx = p[j * 2], by = p[j * 2 + 1];
          out.push(ax, ay);
          const L = Math.hypot(bx - ax, by - ay);
          // only refine where it is visible
          const vis = !((ax < -m && bx < -m) || (ax > W + m && bx > W + m) || (ay < -m && by < -m) || (ay > H + m && by > H + m));
          if (L > 9 && vis && out.length / 2 + (n - i) < MAXPTS) {
            const k = Math.min(6, Math.floor(L / 9));
            for (let s = 1; s <= k; s++) out.push(ax + ((bx - ax) * s) / (k + 1), ay + ((by - ay) * s) / (k + 1));
          }
        }
        d.p = out;
        return true;
      });
      let total = drops.reduce((a, d) => a + d.p.length / 2, 0);
      while (total > 70000 && drops.length > 4) { total -= drops[0].p.length / 2; drops.shift(); }
    }

    // ---- coverage ----
    function measure() {
      gw = 96; gh = Math.max(24, Math.round((96 * H) / W));
      cov.width = gw; cov.height = gh;
      cg.setTransform(gw / W, 0, 0, gh / H, 0, 0);
      cg.fillStyle = WATER; cg.fillRect(0, 0, W, H);
      for (const d of drops) { cg.fillStyle = fillOf(d); path(cg, d.p); cg.fill(); }
      const px = cg.getImageData(0, 0, gw, gh).data;
      grid = new Int8Array(gw * gh);
      const cnt = [0, 0, 0, 0];
      for (let i = 0; i < gw * gh; i++) {
        const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
        let best = -1, bd = Infinity;
        for (const [c, o] of PAL) { const dd = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (dd < bd) { bd = dd; best = o; } }
        grid[i] = best; cnt[best + 1]++;
      }
      const tot = gw * gh;
      share = [cnt[1] / tot, cnt[2] / tot, cnt[3] / tot];
      const lead = share.indexOf(Math.max(...share));
      if (lead !== leader && t > 3 && t - lastStamp > 2.5) {
        lastStamp = t;
        if (lead === 0) { stamp(stage, api.t({ it: 'IN TESTA!', en: 'IN THE LEAD!' }), 'great'); sfx.great(); }
        else if (leader === 0) { stamp(stage, api.t({ it: 'SORPASSO!', en: 'OVERTAKEN!' }), 'bad'); sfx.bad(); }
      }
      leader = lead;
    }
    const cellOwner = (x, y) => {
      if (!grid) return -1;
      const gx = Math.floor((x / W) * gw), gy = Math.floor((y / H) * gh);
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) return -1;
      return grid[gy * gw + gx];
    };

    // ---- rivals ----
    const cpus = [1, 2].map((o) => ({ o, next: rand(0.6, 1.4) }));
    function cpuAct(c) {
      const lvl = t / TIME;
      if (Math.random() < 0.22 + lvl * 0.15) {
        // comb an enemy patch toward the closest edge
        let best = null, bs = -1;
        for (let k = 0; k < 14; k++) {
          const x = rand(0, W), y = rand(0, H), ow = cellOwner(x, y);
          const s = ow >= 0 && ow !== c.o ? (ow === 0 ? 1.4 : 1) + Math.random() * 0.3 : Math.random() * 0.2;
          if (s > bs) { bs = s; best = { x, y }; }
        }
        const ex = best.x < W / 2 ? -1 : 1, ey = best.y < H / 2 ? -1 : 1;
        const horiz = Math.min(best.x, W - best.x) < Math.min(best.y, H - best.y);
        const len = rand(60, 130);
        c.comb = { x: best.x, y: best.y, tx: best.x + (horiz ? ex * len : rand(-20, 20)), ty: best.y + (horiz ? rand(-20, 20) : ey * len), life: 0.5 };
        return;
      }
      // drop: prefer spots near the edges where enemies sit, so they get pushed off
      let best = null, bs = -Infinity;
      for (let k = 0; k < 16; k++) {
        const x = rand(W * 0.05, W * 0.95), y = rand(H * 0.05, H * 0.95);
        const ow = cellOwner(x, y);
        const edge = 1 - Math.min(x, W - x, y, H - y) / (Math.min(W, H) / 2);
        const s = (ow >= 0 && ow !== c.o ? (ow === 0 ? 1.3 : 0.9) : ow === c.o ? -0.6 : 0.3) + edge * 0.9 + Math.random() * 0.5;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      // a burst of concentric rings, like a real marbler: ink, second tone, clear water...
      c.burst = { x: best.x + rand(-6, 6), y: best.y + rand(-6, 6), n: 2 + Math.floor(Math.random() * (3 + lvl * 4)), k: 0, next: 0 };
    }

    // ---- input ----
    const ptr = { down: false, x: 0, y: 0, sx: 0, sy: 0, lx: 0, ly: 0, t0: 0, combing: false, rings: 0, next: 0, dx: 1, dy: 0 };
    const pos = (e) => { const r = A.canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; };
    const scaleR = () => Math.sqrt(W * H) / 600;
    const ringR = () => (ptr.rings ? 28 : 38) * scaleR();
    const COST = 6;
    const onDown = (e) => {
      if (over) return; pos(e); e.preventDefault();
      A.canvas.setPointerCapture?.(e.pointerId);
      Object.assign(ptr, { down: true, sx: ptr.x, sy: ptr.y, lx: ptr.x, ly: ptr.y, t0: t, combing: false, rings: 0, next: 0.12 });
    };
    const onMove = (e) => { pos(e); if (ptr.down && !ptr.combing && !ptr.rings && Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy) > 14) { ptr.combing = true; ptr.lx = ptr.sx; ptr.ly = ptr.sy; } };
    const ring = () => {
      if (ink < COST) { ptr.next = 0.1; return; }
      ink -= COST;
      dropAt(ptr.sx, ptr.sy, ringR(), 0, ptr.rings % 2);
      ptr.rings++;
      sfx.combo(Math.min(8, ptr.rings)); vibrate(8);
      if (ptr.rings % 5 === 0) {
        api.add(ptr.rings * 6, { ...toStage(stage, A.box, ptr.sx, ptr.sy - 30), color: INKS[0].col });
        if (ptr.rings >= 10) stamp(stage, `${api.t({ it: 'ANELLI', en: 'RINGS' })} ×${ptr.rings}`, 'great');
      }
      ptr.next = 0.17;
    };
    const onUp = (e) => {
      if (!ptr.down) return; pos(e); ptr.down = false;
      if (over || ptr.combing) return;
      if (!ptr.rings) ring();
    };
    A.canvas.addEventListener('pointerdown', onDown);
    A.canvas.addEventListener('pointermove', onMove);
    A.canvas.addEventListener('pointerup', onUp);
    A.canvas.addEventListener('pointercancel', onUp);

    // ---- start: one seed ring for each ink ----
    const seed = () => {
      const s = scaleR();
      const spots = [[0.5, 0.62, 0], [0.2, 0.3, 1], [0.8, 0.3, 2]];
      for (let k = 0; k < 5; k++) for (const [x, y, o] of spots) dropAt(W * x, H * y, (k ? 26 : 44) * s, o, k % 2);
      measure();
    };
    seed();

    A.onResize = (nw, nh) => {
      const sx = nw / W, sy = nh / H;
      for (const d of drops) for (let i = 0; i < d.p.length; i += 2) { d.p[i] *= sx; d.p[i + 1] *= sy; }
      W = nw; H = nh;
    };

    const finish = () => {
      if (over) return; over = true;
      measure();
      const mine = share[0], best = Math.max(share[1], share[2]);
      if (mine >= best) { api.add(1500); stamp(stage, api.t({ it: 'VASCA TUA!', en: 'TRAY IS YOURS!' }), 'great'); }
      api.hit(clamp(mine / 0.45), { silent: true, quiet: true });
      const pct = (v) => Math.round(v * 100) + '%';
      api.end({
        summary: INKS.map((k, i) => `${api.t(k.name)} ${pct(share[i])}`).join(' · '),
        exports: [
          { label: api.t({ it: 'Carta marmorizzata (PNG)', en: 'Marbled paper (PNG)' }), run: () => exportPNG().toBlob((b) => download('occhio-marmo.png', b), 'image/png') },
          { label: 'SVG', run: () => download('occhio-marmo.svg', exportSVG(), 'image/svg+xml') },
        ],
      });
    };
    api.timer(TIME, finish);

    let measureT = 0;
    const stopLoop = loop((dt) => {
      if (!over) {
        t += dt;
        ink = Math.min(100, ink + dt * 24);
        inkBar.style.transform = `scaleX(${ink / 100})`;
        swirl(dt);
        if (ptr.down && ptr.combing) {
          const d = Math.hypot(ptr.x - ptr.lx, ptr.y - ptr.ly);
          if (d > 2) { ptr.dx = (ptr.x - ptr.lx) / d; ptr.dy = (ptr.y - ptr.ly) / d; comb(ptr.lx, ptr.ly, ptr.x, ptr.y); ptr.lx = ptr.x; ptr.ly = ptr.y; }
        } else if (ptr.down) {
          ptr.next -= dt;
          if (ptr.next <= 0) ring();
        }
        for (const c of cpus) {
          if (c.comb) {
            const k = Math.min(1, dt / c.comb.life);
            const nx = c.comb.x + (c.comb.tx - c.comb.x) * k * 2, ny = c.comb.y + (c.comb.ty - c.comb.y) * k * 2;
            comb(c.comb.x, c.comb.y, nx, ny, 0.8);
            c.comb.x = nx; c.comb.y = ny; c.comb.life -= dt;
            if (c.comb.life <= 0) c.comb = null;
            continue;
          }
          if (c.burst) {
            const b = c.burst;
            b.next -= dt;
            if (b.next <= 0) { dropAt(b.x, b.y, (b.k ? 26 : 36) * scaleR() * (0.8 + Math.random() * 0.5), Math.random() < 0.12 ? -1 : c.o, b.k % 2); b.k++; b.next = 0.17; }
            if (b.k >= b.n) c.burst = null;
            continue;
          }
          c.next -= dt;
          if (c.next <= 0) { cpuAct(c); c.next = rand(0.8, 1.7) / (1 + (t / TIME) * 1.1); }
        }
        measureT -= dt;
        if (measureT <= 0) { measure(); measureT = 0.25; }
        secAcc += dt; qAcc += dt;
        if (secAcc >= 1) { secAcc -= 1; api.add(Math.round(share[0] * 60)); }
        if (qAcc >= 4) { qAcc -= 4; api.hit(clamp(share[0] / 0.45), { silent: true, quiet: true }); }
        api.hud(api.t({ it: 'Vasca', en: 'Tray' }), Math.round(share[0] * 100) + '%', false);
      }
      draw();
    });

    function draw() {
      const g = A.g;
      g.fillStyle = WATER; g.fillRect(0, 0, W, H);
      g.lineJoin = 'round';
      for (const d of drops) {
        path(g, d.p);
        g.fillStyle = fillOf(d); g.fill();
      }
      // thin darker rims, like pigment gathering at the edge of each ring
      g.strokeStyle = 'rgba(20,18,22,.22)'; g.lineWidth = 0.8;
      for (const d of drops) { path(g, d.p); g.stroke(); }
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5;
      g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      for (const r of ripples) {
        r.life -= 1 / 40;
        g.strokeStyle = r.col; g.globalAlpha = Math.max(0, r.life) * 0.6; g.lineWidth = 2;
        g.beginPath(); g.arc(r.x, r.y, r.r * (1 + (1 - r.life) * 1.2), 0, TAU); g.stroke();
      }
      g.globalAlpha = 1;
      ripples = ripples.filter((r) => r.life > 0);
      // pointer preview
      if (ptr.down && !over) {
        if (ptr.combing) {
          const nx = -ptr.dy, ny = ptr.dx, gap = 26 * scaleR();
          g.strokeStyle = '#0E0E10'; g.lineWidth = 3; g.lineCap = 'round';
          g.beginPath(); g.moveTo(ptr.x - nx * gap * 2.4, ptr.y - ny * gap * 2.4); g.lineTo(ptr.x + nx * gap * 2.4, ptr.y + ny * gap * 2.4); g.stroke();
          g.fillStyle = '#0E0E10';
          for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(ptr.x + nx * gap * k, ptr.y + ny * gap * k, 4, 0, TAU); g.fill(); }
        } else {
          const r = ringR() * (1 + 0.15 * Math.sin(t * 20));
          g.setLineDash([5, 5]); g.strokeStyle = INKS[0].col; g.lineWidth = 2.5;
          g.beginPath(); g.arc(ptr.sx, ptr.sy, r, 0, TAU); g.stroke(); g.setLineDash([]);
        }
      }
      // share bars
      const bw = Math.min(W - 24, 360), bx = (W - bw) / 2, by = 12;
      g.fillStyle = 'rgba(239,231,212,.85)'; g.fillRect(bx - 6, by - 6, bw + 12, 34);
      let x = bx;
      const tot = share[0] + share[1] + share[2] || 1;
      INKS.forEach((k, i) => { const w = (share[i] / tot) * bw; g.fillStyle = k.col; g.fillRect(x, by, w, 12); x += w; });
      g.strokeStyle = '#0E0E10'; g.lineWidth = 2; g.strokeRect(bx, by, bw, 12);
      g.font = '700 11px "JetBrains Mono", monospace'; g.textBaseline = 'top';
      INKS.forEach((k, i) => {
        g.fillStyle = k.col; g.textAlign = i === 0 ? 'left' : i === 1 ? 'center' : 'right';
        g.fillText(`${api.t(k.name)} ${Math.round(share[i] * 100)}%`, i === 0 ? bx : i === 1 ? bx + bw / 2 : bx + bw, by + 15);
      });
      g.textAlign = 'left';
    }

    function exportPNG() {
      const S = Math.max(2, Math.ceil(2400 / Math.max(W, H)));
      const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
      const g = c.getContext('2d'); g.scale(S, S);
      g.fillStyle = WATER; g.fillRect(0, 0, W, H);
      for (const d of drops) { path(g, d.p); g.fillStyle = fillOf(d); g.fill(); }
      g.strokeStyle = 'rgba(20,18,22,.2)'; g.lineWidth = 0.5;
      for (const d of drops) { path(g, d.p); g.stroke(); }
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.45;
      g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.fillStyle = '#0E0E10'; g.font = '600 9px "JetBrains Mono", monospace'; g.textAlign = 'right';
      g.fillText(`${store.name || '—'} · MARMO · OCCHIO · ${new Date().toLocaleDateString()}`, W - 10, H - 10);
      return c;
    }
    function exportSVG() {
      const f = (v) => Math.round(v * 10) / 10;
      const paths = drops.map((d) => {
        let s = '';
        for (let i = 0; i < d.p.length; i += 2) s += (i ? 'L' : 'M') + f(d.p[i]) + ' ' + f(d.p[i + 1]);
        return `<path d="${s}Z" fill="${fillOf(d)}"/>`;
      }).join('\n');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}" height="${f(H)}">\n<defs><clipPath id="t"><rect width="${f(W)}" height="${f(H)}"/></clipPath></defs>\n<rect width="100%" height="100%" fill="${WATER}"/>\n<g clip-path="url(#t)">\n${paths}\n</g>\n</svg>`;
    }

    api.onCleanup(() => {
      stopLoop(); A.destroy();
      A.canvas.removeEventListener('pointerdown', onDown);
      A.canvas.removeEventListener('pointermove', onMove);
      A.canvas.removeEventListener('pointerup', onUp);
      A.canvas.removeEventListener('pointercancel', onUp);
    });
  },
};

function path(g, p) {
  g.beginPath();
  g.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
  g.closePath();
}

// Fibrous paper grain, tiled.
function makeGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 160, 160);
  const img = g.getImageData(0, 0, 160, 160);
  for (let i = 0; i < img.data.length; i += 4) { const v = 225 + Math.random() * 30; img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v - 6; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(120,100,70,.18)'; g.lineWidth = 0.6;
  for (let i = 0; i < 60; i++) { const x = Math.random() * 160, y = Math.random() * 160, a = Math.random() * TAU, l = 6 + Math.random() * 18; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return c;
}
