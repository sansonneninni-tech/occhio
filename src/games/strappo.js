import { h, rand, randInt, pick, clamp } from '../core/dom.js';
import { stageCanvas, loop, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { stamp, sfx, vibrate, shake } from '../core/fx.js';
import { store } from '../core/store.js';

// Décollage: a wall with 5 layers of posters over the concrete.
// Tear one layer at a time to reach the film stars hidden underneath.
const TIME = 75;
const L = 5; // paper layers; index L is the bare wall
const CELL = 8;
const PAPER = '#F1EBDD';
const WORDS = ['CINE', 'LUX', 'VESPA', 'ROMA', 'SALDI', 'CIRCO', 'BOXE', 'JAZZ', 'TWIST', 'NOTTE', 'DIVA', 'FILM', 'BAR', 'GOL', 'SUPER', 'OGGI', 'ULTIMI GIORNI', 'PRIMA', 'LIRA', 'ROCK'];
const PALETTES = [
  ['#FFE600', '#0E0E10', '#FF2E88', '#F3EFE6'],
  ['#FF2E88', '#00B7FF', '#0E0E10', '#FFF4D6'],
  ['#E8202A', '#F3EFE6', '#0E0E10', '#FFB000'],
  ['#1F3BFF', '#FF7A00', '#F3EFE6', '#0E0E10'],
  ['#12C97A', '#FF8AD0', '#0E0E10', '#FFF0B3'],
];

export default {
  id: 'strappo',
  cat: 'folle',
  title: { it: 'Strappo', en: 'Rip Off' },
  tagline: { it: 'Un muro di manifesti a cinque strati. Strappa la carta, trova le dive nascoste e scappa dalle multe.', en: 'A wall of posters, five layers deep. Rip the paper, find the hidden film stars and dodge the fines.' },
  how: {
    it: 'Trascina il dito per strappare uno strato alla volta. Per scendere più giù, ricomincia dentro il buco.|I cerchi tratteggiati sono le dive nascoste: il numero dice quanti strati mancano. Fermati quando appare il volto!|L’attacchino ricopre i buchi: toccalo per farlo scappare. Non strappare i cartelli VIETATO AFFIGGERE: sono multe.',
    en: 'Drag to rip one layer at a time. To go deeper, start again inside the hole.|Dashed circles are hidden film stars: the number says how many layers are left. Stop when the face appears!|The bill-sticker covers the holes: tap him to scare him off. Don’t rip the POST NO BILLS signs: they are fines.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#FF2E88"/><rect x="0" y="0" width="70" height="100" fill="#FFE600"/><text x="4" y="62" font-family="Archivo" font-weight="900" font-size="42" fill="#0E0E10">CI</text><path d="M60 0 L74 14 L62 26 L80 40 L66 58 L84 74 L70 100 L160 100 L160 0Z" fill="#1F3BFF"/><path d="M60 0 L74 14 L62 26 L80 40 L66 58 L84 74 L70 100" fill="none" stroke="#F1EBDD" stroke-width="5"/><circle cx="118" cy="50" r="24" fill="#F3D2B8"/><path d="M94 46 C96 20 140 20 142 46 C136 34 100 34 94 46Z" fill="#0E0E10"/><ellipse cx="118" cy="62" rx="8" ry="4" fill="#E8202A"/><circle cx="110" cy="48" r="3" fill="#0E0E10"/><circle cx="126" cy="48" r="3" fill="#0E0E10"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    A.box.style.background = '#8C8780';
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Trascina per strappare · tocca l’attacchino', en: 'Drag to rip · tap the bill-sticker' })));

    const W = A.w, H = A.h;
    const S = clamp(1700 / Math.max(W, H), 1, 2);
    const sc = Math.sqrt(W * H) / 640; // size unit
    const gw = Math.ceil(W / CELL), gh = Math.ceil(H / CELL);
    const FULL = (1 << L) - 1;
    const intact = new Uint8Array(gw * gh).fill(FULL);
    const layers = [];
    for (let k = 0; k <= L; k++) {
      const c = document.createElement('canvas'); c.width = Math.ceil(W * S); c.height = Math.ceil(H * S);
      const g = c.getContext('2d'); g.scale(S, S);
      layers.push({ c, g });
    }
    drawWall(layers[L].g, W, H);
    for (let k = L - 1; k >= 0; k--) fillLayer(layers[k].g, W, H, PALETTES[k % PALETTES.length], sc);

    const depthAt = (i) => { const m = intact[i]; if (!m) return L; let d = 0; while (!((m >> d) & 1)) d++; return d; };
    const cellIdx = (x, y) => { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); return cx < 0 || cy < 0 || cx >= gw || cy >= gh ? -1 : cy * gw + cx; };
    const depthXY = (x, y) => { const i = cellIdx(x, y); return i < 0 ? L : depthAt(i); };
    const cellsIn = (x, y, r, fn) => {
      const x0 = Math.max(0, Math.floor((x - r) / CELL)), x1 = Math.min(gw - 1, Math.floor((x + r) / CELL));
      const y0 = Math.max(0, Math.floor((y - r) / CELL)), y1 = Math.min(gh - 1, Math.floor((y + r) / CELL));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
        if ((px - x) ** 2 + (py - y) ** 2 <= r * r) fn(cy * gw + cx);
      }
    };

    let t = 0, over = false, lives = 3, scraps = [], faces = [], notices = [], found = 0, flashes = [];
    const lifeHud = () => api.hud(api.t({ it: 'Multe', en: 'Fines' }), '●'.repeat(3 - lives) + '○'.repeat(lives), false);
    lifeHud();

    // ---- sound: a short noise burst for the rip ----
    let actx = null, noise = null;
    const rip = (v = 0.5) => {
      if (store.muted) return;
      try {
        actx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (!noise) { noise = actx.createBuffer(1, actx.sampleRate * 0.25, actx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3); }
        const src = actx.createBufferSource(); src.buffer = noise; src.playbackRate.value = rand(0.7, 1.4);
        const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rand(1200, 3200); f.Q.value = 0.8;
        const gn = actx.createGain(); gn.gain.value = 0.12 * v;
        src.connect(f).connect(gn).connect(actx.destination); src.start();
      } catch {}
    };

    // ---- tearing ----
    function jag(g, x, y, r, seed) {
      g.beginPath();
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU, rr = r * (0.72 + 0.5 * Math.abs(Math.sin(seed + i * 2.7)));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath();
    }
    function tearBlob(x, y, d, ang) {
      const g = layers[d].g, r = 18 * sc, seed = Math.random() * 10;
      // a scrap of the paper flies off
      if (Math.random() < 0.35 && scraps.length < 40) {
        const sz = Math.ceil(r * 2.4), c = document.createElement('canvas'); c.width = c.height = Math.ceil(sz * S);
        const sg = c.getContext('2d'); sg.scale(S, S);
        jag(sg, sz / 2, sz / 2, r * 1.1, seed); sg.clip();
        sg.drawImage(layers[d].c, (x - sz / 2) * S, (y - sz / 2) * S, sz * S, sz * S, 0, 0, sz, sz);
        scraps.push({ c, sz, x, y, vx: Math.cos(ang) * rand(60, 160), vy: rand(-140, -40), r: 0, vr: rand(-6, 6), life: 1.2 });
      }
      g.save();
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = PAPER;
      jag(g, x, y, r * 1.28, seed + 1); g.fill();
      g.globalCompositeOperation = 'destination-out';
      jag(g, x, y, r, seed); g.fill();
      g.restore();
      const bit = 1 << d;
      cellsIn(x, y, r * 0.95, (i) => { if (depthAt(i) === d) intact[i] &= ~bit; });
      // fines
      if (d === 0) for (const n of notices) if (!n.ripped && x > n.x && x < n.x + n.w && y > n.y && y < n.y + n.h) fine(n);
    }
    function fine(n) {
      n.ripped = true;
      lives--; lifeHud();
      api.hit(0, { silent: true, quiet: true });
      stamp(stage, api.t({ it: 'MULTA!', en: 'FINED!' }), 'bad'); sfx.bad(); shake(A.box); vibrate([60, 40, 60]);
      if (lives <= 0) finish();
    }

    // ---- input ----
    const ptr = { down: false, x: 0, y: 0, layer: -1, lx: 0, ly: 0, acc: 0 };
    const pos = (e) => { const r = A.canvas.getBoundingClientRect(); ptr.x = ((e.clientX - r.left) / r.width) * W; ptr.y = ((e.clientY - r.top) / r.height) * H; };
    const onDown = (e) => {
      if (over) return; pos(e); e.preventDefault();
      A.canvas.setPointerCapture?.(e.pointerId);
      if (man.state !== 'away' && Math.hypot(ptr.x - man.x, ptr.y - (H - 75 * sc)) < 62 * sc) { scare(); return; }
      ptr.down = true; ptr.lx = ptr.x; ptr.ly = ptr.y; ptr.acc = 0;
      ptr.layer = depthXY(ptr.x, ptr.y);
      if (ptr.layer < L) { tearBlob(ptr.x, ptr.y, ptr.layer, 0); rip(0.7); }
    };
    const onMove = (e) => {
      pos(e);
      if (!ptr.down || over || ptr.layer >= L) return;
      const dx = ptr.x - ptr.lx, dy = ptr.y - ptr.ly, d = Math.hypot(dx, dy);
      const step = 6 * sc;
      if (d < step) return;
      const ang = Math.atan2(dy, dx);
      for (let s = step; s <= d; s += step) {
        const x = ptr.lx + (dx * s) / d, y = ptr.ly + (dy * s) / d;
        if (depthXY(x, y) === ptr.layer) { tearBlob(x, y, ptr.layer, ang); ptr.acc++; }
      }
      if (ptr.acc > 4) { rip(0.6); ptr.acc = 0; api.add(1); }
      ptr.lx = ptr.x; ptr.ly = ptr.y;
    };
    const onUp = () => { ptr.down = false; };
    A.canvas.addEventListener('pointerdown', onDown);
    A.canvas.addEventListener('pointermove', onMove);
    A.canvas.addEventListener('pointerup', onUp);
    A.canvas.addEventListener('pointercancel', onUp);

    // ---- hidden film stars ----
    function spawnFace() {
      const R = 44 * sc;
      for (let tries = 0; tries < 30; tries++) {
        const x = rand(R + 10, W - R - 10), y = rand(R + 50, H - R - 90 * sc);
        if (faces.some((f) => Math.hypot(f.x - x, f.y - y) < R * 2.6)) continue;
        let maxD = 0;
        cellsIn(x, y, R, (i) => { maxD = Math.max(maxD, depthAt(i)); });
        if (maxD >= L - 1) continue;
        const layer = Math.min(L - 1, maxD + randInt(1, Math.min(3, 1 + Math.floor(t / 20))));
        cellsIn(x, y, R * 1.3, (i) => { intact[i] |= 1 << layer; });
        drawStar(layers[layer].g, x, y, R, PALETTES[layer % PALETTES.length]);
        faces.push({ x, y, r: R, layer, born: t, left: layer, state: 'hidden' });
        return;
      }
    }
    function checkFaces() {
      for (const f of faces) {
        if (f.state !== 'hidden') continue;
        let n = 0, on = 0, past = 0, sum = 0;
        cellsIn(f.x, f.y, f.r * 0.85, (i) => { const d = depthAt(i); n++; sum += Math.min(d, f.layer); if (d === f.layer) on++; else if (d > f.layer) past++; });
        f.left = Math.max(0, Math.round(f.layer - sum / n));
        if (past / n > 0.45) {
          f.state = 'lost'; f.t = t;
          api.hit(0.1, { silent: true });
          stamp(stage, api.t({ it: 'TROPPO GIÙ!', en: 'TOO DEEP!' }), 'bad');
        } else if (on / n > 0.62) {
          f.state = 'found'; f.t = t; found++;
          const sp = toStage(stage, A.box, (f.x / W) * A.w, (f.y / H) * A.h);
          const q = clamp(1 - (t - f.born - 4) / 16, 0.55, 1);
          api.hit(q, { x: sp.x, y: sp.y, silent: true });
          api.add(f.layer * 80, { x: sp.x, y: sp.y + 30, color: '#FF2E88' });
          stamp(stage, pick(['CIAK!', 'DIVA!', 'STAR!', 'FLASH!']), 'great');
          flashes.push({ x: f.x, y: f.y, life: 1 });
          vibrate(25);
        }
      }
      faces = faces.filter((f) => f.state === 'hidden' || t - f.t < 1.2);
      const want = 2 + (t > 35 ? 1 : 0);
      if (faces.filter((f) => f.state === 'hidden').length < want) spawnFace();
    }

    // ---- the bill-sticker ----
    const man = { x: -60, tx: W * 0.5, state: 'walk', wait: 2.5, paste: null, phase: 0, away: 0 };
    function chooseSpot() {
      // goes where the wall has the most holes, often right on top of a star you are digging out
      const hidden = faces.filter((f) => f.state === 'hidden' && f.left <= 1);
      if (hidden.length && Math.random() < 0.55) { const f = pick(hidden); return { x: f.x, y: f.y }; }
      let best = null, bs = -1;
      for (let k = 0; k < 12; k++) {
        const x = rand(60, W - 60), y = rand(80, H - 140 * sc);
        let s = 0; cellsIn(x, y, 60 * sc, (i) => { s += depthAt(i); });
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    }
    function scare() {
      man.state = 'away'; man.away = 4; man.paste = null;
      stamp(stage, api.t({ it: 'SCIÒ!', en: 'SHOO!' }), 'good'); sfx.good(); vibrate(15);
      api.add(30, { ...toStage(stage, A.box, (man.x / W) * A.w, A.h - 80), color: '#0E0E10' });
    }
    function updateMan(dt) {
      const speed = 150 * sc * (1 + t / TIME);
      if (man.state === 'away') {
        man.x += speed * 2.2 * dt; man.phase += dt * 16;
        man.away -= dt;
        if (man.away <= 0) { man.state = 'walk'; man.x = -60; man.target = chooseSpot(); man.tx = man.target.x; }
        return;
      }
      if (man.state === 'walk') {
        if (!man.target) { man.target = chooseSpot(); man.tx = man.target.x; }
        const d = man.tx - man.x;
        man.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt); man.phase += dt * 10;
        if (Math.abs(d) < 2) { man.state = 'paste'; const pw = rand(150, 230) * sc, ph = rand(200, 300) * sc; man.paste = { x: clamp(man.target.x - pw / 2, 0, W - pw), y: clamp(man.target.y - ph / 2, 0, H - ph), w: pw, h: ph, p: 0, pal: pick(PALETTES), seed: Math.random() }; }
      } else if (man.state === 'paste') {
        const P = man.paste;
        P.p += dt / Math.max(0.55, 1.1 - t / 120);
        if (P.p >= 1) {
          const c = posterCanvas(P.w, P.h, P.pal, sc, S);
          layers[0].g.drawImage(c, P.x, P.y, P.w, P.h);
          for (let cy = Math.floor(P.y / CELL); cy < Math.min(gh, Math.ceil((P.y + P.h) / CELL)); cy++) for (let cx = Math.floor(P.x / CELL); cx < Math.min(gw, Math.ceil((P.x + P.w) / CELL)); cx++) intact[cy * gw + cx] |= 1;
          for (const n of notices) if (n.x < P.x + P.w && n.x + n.w > P.x && n.y < P.y + P.h && n.y + n.h > P.y) n.ripped = true;
          man.paste = null; man.state = 'walk'; man.target = null;
          man.wait = rand(1.5, 3.5) * (1 - t / TIME * 0.6);
          sfx.tick();
        }
      }
    }

    // ---- POST NO BILLS ----
    let noticeT = 7;
    function postNotice() {
      const w = 150 * sc, hh = 82 * sc;
      const x = rand(10, W - w - 10), y = rand(40, H - hh - 120 * sc);
      const g = layers[0].g;
      g.save();
      g.fillStyle = '#FBFAF5'; g.fillRect(x, y, w, hh);
      g.strokeStyle = '#E8202A'; g.lineWidth = 5 * sc; g.strokeRect(x + 5 * sc, y + 5 * sc, w - 10 * sc, hh - 10 * sc);
      g.fillStyle = '#0E0E10'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${22 * sc}px Archivo, sans-serif`; g.fillText(api.t({ it: 'VIETATO', en: 'POST NO' }), x + w / 2, y + hh * 0.36);
      g.fillText(api.t({ it: 'AFFIGGERE', en: 'BILLS' }), x + w / 2, y + hh * 0.66);
      g.font = `600 ${8 * sc}px "JetBrains Mono", monospace`; g.fillText(api.t({ it: 'IL SINDACO · MULTA L. 5000', en: 'BY ORDER · FINE £5' }), x + w / 2, y + hh * 0.88);
      g.restore();
      for (let cy = Math.floor(y / CELL); cy < Math.ceil((y + hh) / CELL); cy++) for (let cx = Math.floor(x / CELL); cx < Math.ceil((x + w) / CELL); cx++) if (cx < gw && cy < gh) intact[cy * gw + cx] |= 1;
      notices.push({ x, y, w, h: hh, ripped: false, t });
    }

    // ---- loop ----
    const finish = () => {
      if (over) return; over = true;
      api.end({
        summary: `${found} ${api.t({ it: 'dive trovate', en: 'stars found' })}`,
        exports: [{ label: api.t({ it: 'Il muro strappato (PNG)', en: 'The ripped wall (PNG)' }), run: () => exportPNG().toBlob((b) => download('occhio-strappo.png', b), 'image/png') }],
      });
    };
    api.timer(TIME, finish);
    let checkT = 0;
    spawnFace(); spawnFace();
    const stopLoop = loop((dt) => {
      if (!over) {
        t += dt;
        checkT -= dt;
        if (checkT <= 0) { checkFaces(); checkT = 0.15; }
        if (man.state === 'walk' && man.wait > 0) man.wait -= dt; else updateMan(dt);
        noticeT -= dt;
        if (noticeT <= 0) { postNotice(); noticeT = rand(6, 9) * (1 - t / TIME * 0.5); }
      }
      for (const s of scraps) { s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; s.life -= dt; }
      scraps = scraps.filter((s) => s.life > 0 && s.y < H + 60);
      draw();
    });

    function draw() {
      const g = A.g;
      g.save();
      g.scale(A.w / W, A.h / H);
      for (let k = L; k >= 0; k--) g.drawImage(layers[k].c, 0, 0, W, H);
      // wet sheen + shadow on the poster being pasted
      if (man.paste) {
        const P = man.paste, hh = P.h * Math.min(1, P.p);
        g.save();
        g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 12;
        g.fillStyle = P.pal[0]; g.fillRect(P.x, P.y, P.w, hh);
        g.restore();
        g.fillStyle = P.pal[2]; g.globalAlpha = 0.85;
        g.font = `900 ${P.w * 0.3}px Archivo, sans-serif`; g.textBaseline = 'top';
        g.save(); g.beginPath(); g.rect(P.x, P.y, P.w, hh); g.clip(); g.fillText('···', P.x + 10, P.y + 10); g.restore();
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(P.x, P.y + hh - 6, P.w, 6);
      }
      // star markers
      for (const f of faces) {
        if (f.state === 'hidden') {
          const pulseR = f.r * (1 + 0.04 * Math.sin(t * 6 + f.x));
          g.setLineDash([8, 6]); g.lineWidth = 3; g.strokeStyle = '#0E0E10';
          g.beginPath(); g.arc(f.x, f.y, pulseR, 0, TAU); g.stroke();
          g.setLineDash([8, 6]); g.lineDashOffset = 7; g.strokeStyle = '#FFE600';
          g.beginPath(); g.arc(f.x, f.y, pulseR, 0, TAU); g.stroke();
          g.setLineDash([]); g.lineDashOffset = 0;
          if (f.left > 0) {
            const bx = f.x + f.r * 0.72, by = f.y - f.r * 0.72, br = 15;
            g.fillStyle = '#0E0E10'; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
            g.fillStyle = '#FFE600'; g.font = '900 17px Archivo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(String(f.left), bx, by + 1);
            g.textAlign = 'left';
          }
        } else if (f.state === 'found') {
          const k = (t - f.t) / 1.2;
          g.strokeStyle = '#FFE600'; g.lineWidth = 6 * (1 - k); g.beginPath(); g.arc(f.x, f.y, f.r * (1 + k * 0.6), 0, TAU); g.stroke();
        }
      }
      for (const fl of flashes) { fl.life -= 1 / 25; g.fillStyle = `rgba(255,255,255,${Math.max(0, fl.life) * 0.8})`; g.beginPath(); g.arc(fl.x, fl.y, 160 * sc * (1.2 - fl.life), 0, TAU); g.fill(); }
      flashes = flashes.filter((f) => f.life > 0);
      for (const s of scraps) {
        g.save(); g.translate(s.x, s.y); g.rotate(s.r); g.globalAlpha = Math.min(1, s.life * 2);
        g.scale(Math.cos(s.r * 1.7), 1);
        g.drawImage(s.c, -s.sz / 2, -s.sz / 2, s.sz, s.sz); g.restore();
      }
      g.globalAlpha = 1;
      drawMan(g, man, H, sc);
      g.restore();
    }

    function exportPNG() {
      const c = document.createElement('canvas'); c.width = layers[0].c.width; c.height = layers[0].c.height + Math.round(70 * S);
      const g = c.getContext('2d');
      g.fillStyle = '#F3EFE6'; g.fillRect(0, 0, c.width, c.height);
      for (let k = L; k >= 0; k--) g.drawImage(layers[k].c, 0, 0);
      g.scale(S, S);
      g.fillStyle = '#0E0E10'; g.font = '700 14px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
      g.fillText(`${(store.name || '—').toUpperCase()} — ${api.t({ it: 'Strappo', en: 'Rip Off' })}, ${new Date().getFullYear()}. ${api.t({ it: 'Décollage, manifesti lacerati su muro', en: 'Décollage, torn posters on wall' })}. ${found} ★`, 16, H + 35);
      return c;
    }

    api.onCleanup(() => {
      stopLoop(); A.destroy();
      A.canvas.removeEventListener('pointerdown', onDown);
      A.canvas.removeEventListener('pointermove', onMove);
      A.canvas.removeEventListener('pointerup', onUp);
      A.canvas.removeEventListener('pointercancel', onUp);
      try { actx?.close(); } catch {}
    });
  },
};

// ---------- drawing ----------
function drawWall(g, W, H) {
  g.fillStyle = '#8C8780'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.12})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  g.strokeStyle = 'rgba(40,36,32,.35)'; g.lineWidth = 2;
  for (let y = 0; y < H; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 46) % 2 ? 0 : 50; x < W; x += 100) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 46); g.stroke(); } }
  // old glue stains
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(200,190,160,${rand(0.1, 0.3)})`; g.beginPath(); g.ellipse(rand(0, W), rand(0, H), rand(20, 90), rand(10, 50), rand(0, 3), 0, TAU); g.fill(); }
}

function fillLayer(g, W, H, pal, sc) {
  // stacked rows of posters that overlap a little, like a real billboard
  let y = -rand(0, 40);
  while (y < H) {
    const rowH = rand(170, 300) * sc;
    let x = -rand(0, 60);
    while (x < W) {
      const w = rand(110, 240) * sc, hh = rowH + rand(-20, 30) * sc;
      const c = posterCanvas(w, hh, pal, sc, 1);
      g.save(); g.translate(x, y + rand(-8, 8)); g.rotate(rand(-0.015, 0.015));
      g.drawImage(c, 0, 0, w, hh); g.restore();
      x += w - rand(0, 18) * sc;
    }
    y += rowH - rand(0, 20) * sc;
  }
  // glue wrinkles
  g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1;
  for (let i = 0; i < 30; i++) { const x = rand(0, W), yy = rand(0, H); g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + rand(-30, 30), yy + rand(10, 40), x + rand(-10, 10), yy + rand(40, 90)); g.stroke(); }
}

function posterCanvas(w, hh, pal, sc, S) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w * S * 1.4); c.height = Math.ceil(hh * S * 1.4);
  const g = c.getContext('2d'); g.scale((S * 1.4), (S * 1.4));
  const [a, b, ink, paper] = [...pal].sort(() => Math.random() - 0.5);
  const kind = pick(['type', 'type', 'dots', 'stripes', 'number', 'silhouette', 'split']);
  g.fillStyle = a; g.fillRect(0, 0, w, hh);
  g.textBaseline = 'alphabetic';
  if (kind === 'type') {
    const word = pick(WORDS);
    g.save(); g.scale(0.62, 1);
    g.fillStyle = b; g.font = `900 ${hh * rand(0.32, 0.5)}px Archivo, sans-serif`;
    g.fillText(word, 6 / 0.62, hh * 0.55);
    g.fillStyle = ink; g.font = `900 ${hh * 0.16}px Archivo, sans-serif`;
    g.fillText(pick(WORDS), 8 / 0.62, hh * 0.85);
    g.restore();
  } else if (kind === 'dots') {
    g.fillStyle = b;
    const step = rand(9, 14) * sc;
    for (let y = step / 2; y < hh; y += step) for (let x = step / 2; x < w; x += step) { const r = (step / 2) * Math.abs(Math.sin(x / w * 2.2 + y / hh * 1.4)); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillStyle = ink; g.font = `900 ${w * 0.22}px Archivo, sans-serif`; g.fillText(pick(WORDS).slice(0, 5), 6, hh - 10);
  } else if (kind === 'stripes') {
    g.fillStyle = b; const st = rand(12, 26) * sc;
    g.save(); g.rotate(rand(-0.8, 0.8)); for (let x = -hh * 2; x < w * 2; x += st * 2) g.fillRect(x, -hh, st, hh * 3); g.restore();
    g.fillStyle = paper; g.fillRect(0, hh * 0.62, w, hh * 0.22);
    g.fillStyle = ink; g.font = `900 ${hh * 0.16}px Archivo, sans-serif`; g.fillText(pick(WORDS), 6, hh * 0.8);
  } else if (kind === 'number') {
    g.fillStyle = ink; g.font = `900 ${w * 0.6}px Archivo, sans-serif`; g.fillText(pick(['1962', 'L.50', '33', '45', 'N°7', '1960', '!']), -4, hh * 0.7);
    g.fillStyle = b; g.fillRect(0, hh * 0.78, w, hh * 0.08);
  } else if (kind === 'silhouette') {
    g.fillStyle = b; g.beginPath(); g.arc(w / 2, hh * 0.38, w * 0.22, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(w / 2, hh * 0.95, w * 0.45, hh * 0.35, 0, Math.PI, 0); g.fill();
    g.fillStyle = ink; g.font = `900 ${hh * 0.12}px Archivo, sans-serif`; g.fillText(pick(WORDS), 6, hh * 0.14);
  } else {
    g.fillStyle = b; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(0, hh); g.fill();
    g.fillStyle = ink; g.save(); g.translate(w * 0.5, hh * 0.5); g.rotate(-Math.atan2(hh, w)); g.font = `900 ${w * 0.24}px Archivo, sans-serif`; g.textAlign = 'center'; g.fillText(pick(WORDS), 0, 0); g.restore();
  }
  // print wear
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; g.fillRect(Math.random() * w, Math.random() * hh, rand(1, 6), rand(1, 3)); }
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
  return c;
}

// A film star drawn in halftone: hair, eyes, red lips. Pasted inside its own small poster.
function drawStar(g, x, y, R, pal) {
  g.save();
  g.translate(x, y);
  const bg = pick(['#FFE600', '#FF2E88', '#00B7FF', '#12C97A', '#FF7A00']);
  g.fillStyle = bg; g.fillRect(-R * 1.25, -R * 1.25, R * 2.5, R * 2.5);
  g.fillStyle = 'rgba(0,0,0,.3)';
  for (let yy = -R * 1.2; yy < R * 1.25; yy += 7) for (let xx = -R * 1.2; xx < R * 1.25; xx += 7) { const r = 2.6 * (0.3 + (xx + R) / (R * 4)); g.beginPath(); g.arc(xx, yy, r, 0, TAU); g.fill(); }
  const skin = pick(['#F3D2B8', '#E8B48E', '#C98A60', '#F6DCCB']);
  const hair = pick(['#0E0E10', '#5A2E12', '#E8C25A', '#B33A1A']);
  // hair back
  g.fillStyle = hair; g.beginPath(); g.ellipse(0, -R * 0.1, R * 0.86, R * 0.95, 0, 0, TAU); g.fill();
  // face
  g.fillStyle = skin; g.beginPath(); g.ellipse(0, R * 0.1, R * 0.56, R * 0.7, 0, 0, TAU); g.fill();
  // halftone shading on one side
  g.save(); g.beginPath(); g.ellipse(0, R * 0.1, R * 0.56, R * 0.7, 0, 0, TAU); g.clip();
  g.fillStyle = 'rgba(120,40,30,.35)';
  for (let yy = -R; yy < R; yy += 5) for (let xx = 0; xx < R; xx += 5) { const r = 2.2 * (xx / R); g.beginPath(); g.arc(xx, yy, r, 0, TAU); g.fill(); }
  g.restore();
  // fringe
  g.fillStyle = hair; g.beginPath(); g.moveTo(-R * 0.6, -R * 0.2); g.quadraticCurveTo(-R * 0.1, -R * 0.95, R * 0.62, -R * 0.25); g.quadraticCurveTo(R * 0.1, -R * 0.45, -R * 0.6, -R * 0.2); g.fill();
  // eyes
  for (const s of [-1, 1]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * R * 0.22, R * 0.02, R * 0.13, R * 0.07, 0, 0, TAU); g.fill();
    g.fillStyle = '#0E0E10'; g.beginPath(); g.arc(s * R * 0.22, R * 0.02, R * 0.055, 0, TAU); g.fill();
    g.strokeStyle = '#0E0E10'; g.lineWidth = R * 0.04; g.beginPath(); g.moveTo(s * R * 0.08, -R * 0.06); g.quadraticCurveTo(s * R * 0.22, -R * 0.13, s * R * 0.38, -R * 0.04); g.stroke();
  }
  // mole + lips
  g.fillStyle = '#0E0E10'; g.beginPath(); g.arc(R * 0.24, R * 0.32, R * 0.025, 0, TAU); g.fill();
  g.fillStyle = '#E8202A'; g.beginPath(); g.moveTo(-R * 0.18, R * 0.42); g.quadraticCurveTo(-R * 0.06, R * 0.32, 0, R * 0.38); g.quadraticCurveTo(R * 0.06, R * 0.32, R * 0.18, R * 0.42); g.quadraticCurveTo(0, R * 0.56, -R * 0.18, R * 0.42); g.fill();
  // name strip
  g.fillStyle = '#0E0E10'; g.fillRect(-R * 1.25, R * 0.95, R * 2.5, R * 0.3);
  g.fillStyle = bg; g.font = `900 ${R * 0.22}px Archivo, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pick(['LA DIVA', 'STELLA', 'LA DOLCE', 'STAR', 'MUSA', 'ICONA']), 0, R * 1.1);
  g.restore();
}

function drawMan(g, m, H, sc) {
  if (m.x < -80) return;
  const y = H - 6 * sc, s = sc * 1.15, step = Math.sin(m.phase) * 6 * s;
  g.save(); g.translate(m.x, y);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // pole brush
  const reach = m.state === 'paste' ? -Math.sin(m.paste?.p * Math.PI * 6 || 0) * 12 * s : 0;
  g.strokeStyle = '#6B4A2A'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(10 * s, -60 * s); g.lineTo(34 * s + reach, -130 * s); g.stroke();
  g.fillStyle = '#E8DCC0'; g.fillRect(26 * s + reach, -142 * s, 18 * s, 12 * s);
  // legs
  g.strokeStyle = '#1F3BFF'; g.lineWidth = 9 * s;
  g.beginPath(); g.moveTo(-5 * s, -38 * s); g.lineTo(-8 * s - step, 0); g.moveTo(5 * s, -38 * s); g.lineTo(8 * s + step, 0); g.stroke();
  // body (blue overalls)
  g.fillStyle = '#1F3BFF'; g.strokeStyle = '#0E0E10'; g.lineWidth = 2.5 * s;
  g.beginPath(); g.roundRect(-14 * s, -78 * s, 28 * s, 44 * s, 6 * s); g.fill(); g.stroke();
  // arm
  g.strokeStyle = '#1F3BFF'; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(8 * s, -70 * s); g.lineTo(14 * s, -58 * s); g.stroke();
  // head + cap
  g.fillStyle = '#E8B48E'; g.beginPath(); g.arc(0, -90 * s, 11 * s, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#E8202A'; g.beginPath(); g.arc(0, -94 * s, 11 * s, Math.PI, 0); g.fill(); g.fillRect(0, -96 * s, 16 * s, 4 * s);
  // bucket
  g.fillStyle = '#C9C3B6'; g.beginPath(); g.moveTo(-34 * s, -22 * s); g.lineTo(-18 * s, -22 * s); g.lineTo(-20 * s, 0); g.lineTo(-32 * s, 0); g.closePath(); g.fill(); g.stroke();
  if (m.state === 'away') { g.fillStyle = '#0E0E10'; g.font = `900 ${16 * s}px Archivo`; g.fillText('!!', 12 * s, -108 * s); }
  g.restore();
}
