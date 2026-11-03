// Zang Tumb Tuum: a Futurist race. Speed, onomatopoeia, words in freedom.
import { h } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { stamp, vibrate, shake, sfx } from '../core/fx.js';

const TIME = 75;
const LAT = 600; // lateral size of the road, in world units
const WORDS = ['ZANG', 'TUMB', 'TUUUM', 'ZZZANG', 'BRRRR', 'TATATA', 'PLUFF', 'VRRRR', 'CIAAAK', 'TRAAAK', 'BUUUM', 'ZING', 'URRAAH', 'PIC PAC', 'SCRABrrRR', 'FLIC FLAC', 'TAM TUUMB', 'GLUGLU'];
const INK = '#0E0E10', CREAM = '#F1E6CF', RED = '#D7261E', ORANGE = '#F08A24', BLUE = '#1E3F9A', YEL = '#F6C31B';
const RAYS = [INK, RED, ORANGE, BLUE, YEL, RED, INK, ORANGE];

const font = (w, size, wdth = 100) => `${w} ${wdth > 100 ? 'expanded ' : wdth < 100 ? 'condensed ' : ''}${size}px Archivo, sans-serif`;

function drawWord(g, txt, size, rot, color) {
  g.save(); g.rotate(rot);
  g.font = font(900, size, 125); g.textAlign = 'center'; g.textBaseline = 'middle';
  // letters grow left to right, like a shout
  const letters = txt.split('');
  const widths = letters.map((c, i) => { g.font = font(900, size * (0.75 + 0.5 * i / Math.max(1, letters.length - 1))); return g.measureText(c).width; });
  let x = -widths.reduce((a, b) => a + b, 0) / 2;
  letters.forEach((c, i) => {
    const s = size * (0.75 + 0.5 * i / Math.max(1, letters.length - 1));
    g.font = font(900, s);
    g.fillStyle = INK; g.fillText(c, x + widths[i] / 2 + 3, 3);
    g.fillStyle = color; g.fillText(c, x + widths[i] / 2, 0);
    x += widths[i];
  });
  g.restore();
}

function drawColumn(g, w, hh) {
  // A "passatista" Doric column: marble, fluted, capital.
  g.fillStyle = '#D9D4C7'; g.strokeStyle = '#6E6A60'; g.lineWidth = 2;
  g.fillRect(-w / 2, -hh / 2 + 14, w, hh - 28); g.strokeRect(-w / 2, -hh / 2 + 14, w, hh - 28);
  for (let x = -w / 2 + 7; x < w / 2 - 3; x += 8) { g.beginPath(); g.moveTo(x, -hh / 2 + 16); g.lineTo(x, hh / 2 - 16); g.stroke(); }
  g.fillStyle = '#C9C3B4';
  g.fillRect(-w / 2 - 10, -hh / 2, w + 20, 14); g.strokeRect(-w / 2 - 10, -hh / 2, w + 20, 14);
  g.fillRect(-w / 2 - 10, hh / 2 - 14, w + 20, 14); g.strokeRect(-w / 2 - 10, hh / 2 - 14, w + 20, 14);
}

function drawBust(g, r) {
  g.fillStyle = '#D9D4C7'; g.strokeStyle = '#6E6A60'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(0, r * 0.55, r * 0.95, r * 0.45, 0, Math.PI, 0); g.fill(); g.stroke();
  g.fillRect(-r * 0.25, r * 0.05, r * 0.5, r * 0.5);
  g.beginPath(); g.ellipse(0, -r * 0.25, r * 0.5, r * 0.62, 0, 0, TAU); g.fill(); g.stroke();
  // laurel and blank eyes
  g.strokeStyle = '#9C9686'; g.beginPath(); g.arc(0, -r * 0.3, r * 0.55, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.fillStyle = '#6E6A60'; g.fillRect(-r * 0.24, -r * 0.32, r * 0.14, 3); g.fillRect(r * 0.1, -r * 0.32, r * 0.14, 3);
}

function drawFrame(g, w, hh) {
  g.fillStyle = '#B48A2C'; g.strokeStyle = '#5E4512'; g.lineWidth = 3;
  g.fillRect(-w / 2, -hh / 2, w, hh); g.strokeRect(-w / 2, -hh / 2, w, hh);
  g.fillStyle = '#4A5A3C'; g.fillRect(-w / 2 + 12, -hh / 2 + 12, w - 24, hh - 24);
  g.fillStyle = '#D9C49A'; g.beginPath(); g.ellipse(0, -4, w * 0.18, hh * 0.22, 0, 0, TAU); g.fill();
  g.font = font(800, 11); g.fillStyle = '#F1E6CF'; g.textAlign = 'center'; g.fillText('MUSEO', 0, hh / 2 - 18);
}

function drawCar(g, boost) {
  // Geometric wedge car with spiral wheels.
  g.fillStyle = boost ? YEL : RED; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.moveTo(46, 0); g.lineTo(-34, -24); g.lineTo(-40, 18); g.lineTo(30, 16); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.moveTo(4, -6); g.lineTo(-18, -18); g.lineTo(-20, -4); g.closePath(); g.fill();
  for (const wx of [-24, 24]) {
    g.fillStyle = INK; g.beginPath(); g.arc(wx, 18, 11, 0, TAU); g.fill();
    g.strokeStyle = CREAM; g.lineWidth = 1.5; g.beginPath();
    for (let a = 0; a < TAU * 2; a += 0.3) { const rr = a * 1.3; g.lineTo(wx + Math.cos(a) * rr, 18 + Math.sin(a) * rr); }
    g.stroke();
  }
}

export default {
  id: 'zang-tumb-tuum',
  cat: 'arte',
  title: { it: 'Zang Tumb Tuum', en: 'Zang Tumb Tuum' },
  tagline: { it: 'Corsa futurista. Prendi le onomatopee, travolgi la velocità, evita i musei. Esce una tavola parolibera.', en: 'A Futurist race. Grab the onomatopoeia, outrun the past, dodge the museums. You get a words-in-freedom poster.' },
  how: {
    it: 'Il bolide accelera da solo: guidalo col mouse, col dito o con le frecce.|Prendi le parole (ZANG! TUMB!) di fila per la combo. Le frecce gialle sono turbo: ti rendono invincibile.|Colonne, busti e cornici sono il passato: se li tocchi perdi un motore. Ne hai tre.',
    en: 'The racer speeds up on its own: steer with the mouse, your finger or the arrows.|Grab words (ZANG! TUMB!) in a row for the combo. Yellow arrows are turbo: they make you invincible.|Columns, busts and frames are the past: touch them and you lose an engine. You have three.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="${CREAM}"/><g opacity=".85"><path d="M-10 50 L170 -20 L170 10Z" fill="${RED}"/><path d="M-10 50 L170 30 L170 60Z" fill="${INK}"/><path d="M-10 50 L170 80 L170 120Z" fill="${ORANGE}"/><path d="M-10 50 L170 100 L120 120Z" fill="${BLUE}"/></g><g transform="translate(56 58) rotate(-8)"><path d="M30 0 L-22 -15 L-26 12 L20 10Z" fill="${RED}" stroke="${INK}" stroke-width="2.5"/><path d="M14 0 L-38 -15 L-42 12 L4 10Z" fill="${INK}" opacity=".35"/></g><text x="92" y="38" font-family="Archivo" font-weight="900" font-size="26" fill="${INK}" transform="rotate(-12 92 38)">ZANG</text><text x="100" y="86" font-family="Archivo" font-weight="900" font-size="18" fill="${RED}" transform="rotate(8 100 86)">TUMB</text></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Mouse o frecce per sterzare', en: 'Mouse or arrows to steer' })));

    let t = 0, d = 0, v = 300, lat = LAT / 2, tLat = LAT / 2, lives = 3, inv = 0, boost = 0, over = false;
    let lastPk = null, nextSpawn = 400, distPts = 0, words = 0, maxV = 0, flash = 0;
    const ents = [], parts = [], trail = [], path = [], got = [], crashes = [];
    api.hud(api.t({ it: 'Motori', en: 'Engines' }), '●●●', false);

    const view = () => {
      const portrait = A.h > A.w * 1.05;
      const sc = portrait ? A.w / LAT : A.h / LAT;
      const VL = (portrait ? A.h : A.w) / sc;
      return { portrait, sc, VL, P: Math.max(120, VL * 0.2) };
    };
    // world (forward, lateral) -> screen
    const toScreen = (f, l) => {
      const { portrait, sc } = view();
      return portrait ? { x: l * sc, y: A.h - f * sc } : { x: f * sc, y: l * sc };
    };

    const spawn = (VL) => {
      const f = d + VL + 80;
      const lvl = Math.min(1, t / TIME);
      const r = Math.random();
      if (r < 0.5 + lvl * 0.15) {
        // obstacle: column from top or bottom, a bust in the middle, or a frame
        const k = Math.random();
        if (k < 0.5) {
          const len = 170 + Math.random() * 140 + lvl * 80;
          const top = Math.random() < 0.5;
          ents.push({ kind: 'col', f, l: top ? len / 2 : LAT - len / 2, w: 44, hh: len });
        } else if (k < 0.8) ents.push({ kind: 'bust', f, l: 80 + Math.random() * (LAT - 160), w: 70, hh: 80 });
        else ents.push({ kind: 'frame', f, l: 90 + Math.random() * (LAT - 180), w: 90, hh: 120, spin: (Math.random() - 0.5) * 0.6 });
        // a reward word in the gap, to tempt you near the danger
        if (Math.random() < 0.7) ents.push({ kind: 'word', f: f + 120 + Math.random() * 80, l: 60 + Math.random() * (LAT - 120), txt: WORDS[Math.floor(Math.random() * WORDS.length)], rot: (Math.random() - 0.5) * 0.7, c: [RED, BLUE, ORANGE, YEL][Math.floor(Math.random() * 4)] });
      } else if (r < 0.9) {
        ents.push({ kind: 'word', f, l: 60 + Math.random() * (LAT - 120), txt: WORDS[Math.floor(Math.random() * WORDS.length)], rot: (Math.random() - 0.5) * 0.7, c: [RED, BLUE, ORANGE, YEL][Math.floor(Math.random() * 4)] });
      } else ents.push({ kind: 'boost', f, l: 70 + Math.random() * (LAT - 140) });
      nextSpawn = f + Math.max(150, 330 - lvl * 170) * (0.7 + Math.random() * 0.6) - VL - 80;
    };

    const finish = () => {
      if (over) return; over = true;
      stopLoop();
      const km = (d / 1000).toFixed(1);
      api.end({
        exports: [{ label: api.t({ it: 'Tavola parolibera (PNG)', en: 'Words-in-freedom poster (PNG)' }), run: () => poster(km) }],
        summary: api.t({ it: `${words} parole · ${km} km · punta ${Math.round(maxV * 0.36)} km/h`, en: `${words} words · ${km} km · top ${Math.round(maxV * 0.36)} km/h` }),
      });
    };
    api.timer(TIME, finish);

    const poster = (km) => {
      const PW = 1800, PH = 1200;
      const c = document.createElement('canvas'); c.width = PW; c.height = PH;
      const g = c.getContext('2d');
      g.fillStyle = CREAM; g.fillRect(0, 0, PW, PH);
      const maxF = Math.max(1, d);
      const X = (f) => 80 + (f / maxF) * (PW - 160), Y = (l) => 200 + (l / LAT) * (PH - 360);
      // force rays from the start
      RAYS.forEach((col, i) => {
        g.globalAlpha = 0.16; g.fillStyle = col; g.beginPath();
        const a0 = -0.9 + i * 0.24; g.moveTo(40, PH * 0.55);
        g.lineTo(40 + Math.cos(a0) * 3000, PH * 0.55 + Math.sin(a0) * 3000);
        g.lineTo(40 + Math.cos(a0 + 0.12) * 3000, PH * 0.55 + Math.sin(a0 + 0.12) * 3000); g.fill();
      });
      g.globalAlpha = 1;
      // the trajectory, repeated (Balla's dynamism)
      const echo = [[INK, 18, 0], [RED, 7, 16], [BLUE, 4, -14], [ORANGE, 3, 30], [INK, 2, -30]];
      echo.forEach(([col, lw, off]) => {
        g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath();
        path.forEach((p, i) => { const x = X(p.f), y = Y(p.l) + off; i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.stroke();
      });
      crashes.forEach((p) => {
        g.save(); g.translate(X(p.f), Y(p.l));
        g.fillStyle = INK; g.beginPath();
        for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, rr = i % 2 ? 26 : 70; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.fill(); g.font = font(900, 30); g.fillStyle = CREAM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TUMB', 0, 0);
        g.restore();
      });
      got.forEach((w, i) => { g.save(); g.translate(X(w.f), Y(w.l) + (i % 2 ? -70 : 70)); drawWord(g, w.txt, w.size, w.rot, w.c); g.restore(); });
      // title block
      g.save(); g.translate(70, 175); g.rotate(-0.04);
      g.fillStyle = INK; g.font = font(900, 108, 125); g.fillText('ZANG TUMB TUUUM', 0, 0);
      g.restore();
      g.fillStyle = RED; g.fillRect(70, PH - 120, PW - 140, 10);
      g.fillStyle = INK; g.font = '700 26px "JetBrains Mono", monospace';
      g.fillText(`${(store.name || 'OCCHIO').toUpperCase()} · ${words} PAROLE IN LIBERTÀ · ${km} KM · ${Math.round(maxV * 0.36)} KM/H · ${new Date().getFullYear()}`, 70, PH - 60);
      g.textAlign = 'right'; g.font = font(900, 40); g.fillText('OCCHIO', PW - 70, PH - 56);
      c.toBlob((b) => download(`occhio-zang-tumb-${words}.png`, b), 'image/png');
    };

    const crash = (e) => {
      lives--; inv = 1.4; v *= 0.65; flash = 0.25;
      crashes.push({ f: d + view().P, l: lat });
      api.hit(0, { silent: true });
      const s = toScreen(view().P, lat);
      stamp(stage, 'TUMB!', 'bad');
      api.hud(api.t({ it: 'Motori', en: 'Engines' }), '●'.repeat(Math.max(0, lives)) || '–');
      for (let k = 0; k < 26; k++) parts.push({ f: e.f, l: e.l, vf: (Math.random() - 0.3) * 500, vl: (Math.random() - 0.5) * 500, life: 0.8, c: Math.random() < 0.5 ? '#D9D4C7' : INK, s: 4 + Math.random() * 10 });
      shake(A.box); vibrate([40, 30, 60]);
      if (lives <= 0) setTimeout(finish, 500);
      return s;
    };

    const stopLoop = loop((dt) => {
      if (over) return;
      const { portrait, sc, VL, P } = view();
      t += dt;
      // speed: always faster, turbo on top
      v = Math.min(1150, v + (12 + t * 0.25) * dt);
      const sp = v * (boost > 0 ? 1.45 : 1);
      maxV = Math.max(maxV, sp);
      d += sp * dt;
      distPts += sp * dt * (boost > 0 ? 0.04 : 0.02);
      if (distPts >= 1) { const n = Math.floor(distPts); distPts -= n; api.add(n); }
      inv -= dt; boost -= dt; flash -= dt;
      // steering
      const pl = portrait ? inp.x / sc : inp.y / sc;
      const pk = inp.x * 7 + inp.y;
      if ((inp.moved && pk !== lastPk) || inp.down) { tLat = pl; lastPk = pk; }
      if (inp.keys.has('ArrowUp') || inp.keys.has('ArrowLeft') || inp.keys.has('w') || inp.keys.has('a')) tLat -= 620 * dt;
      if (inp.keys.has('ArrowDown') || inp.keys.has('ArrowRight') || inp.keys.has('s') || inp.keys.has('d')) tLat += 620 * dt;
      tLat = Math.max(30, Math.min(LAT - 30, tLat));
      const prev = lat;
      lat += (tLat - lat) * Math.min(1, dt * 11);
      const tilt = Math.max(-0.5, Math.min(0.5, (lat - prev) / Math.max(0.001, dt) / 1400));
      trail.unshift(lat); if (trail.length > 40) trail.pop();
      if (path.length === 0 || d + P - path.at(-1).f > 60) path.push({ f: d + P, l: lat });
      // spawn
      if (d >= nextSpawn) spawn(VL);
      // collisions
      const pf = d + P;
      for (let i = ents.length - 1; i >= 0; i--) {
        const e = ents[i];
        if (e.f < d - 200) {
          if (e.kind === 'word' && !e.got) api.hit(0.4, { silent: true, quiet: true });
          ents.splice(i, 1); continue;
        }
        const df = Math.abs(e.f - pf), dl = Math.abs(e.l - lat);
        if (e.kind === 'word') {
          const half = 26 + e.txt.length * 7;
          if (df < half && dl < 48) {
            ents.splice(i, 1); words++;
            const s = toScreen(P, lat);
            const p = toStage(stage, A.box, s.x, s.y);
            const q = boost > 0 ? 1 : 0.92;
            api.hit(q, { silent: true, x: p.x, y: p.y });
            got.push({ f: pf, l: lat, txt: e.txt, rot: e.rot, c: e.c, size: Math.min(110, 34 + sp * 0.06 + api.combo * 3) });
            flash = 0.06;
            for (let k = 0; k < 14; k++) parts.push({ f: e.f, l: e.l, vf: (Math.random() - 0.2) * 600, vl: (Math.random() - 0.5) * 600, life: 0.5, c: e.c, s: 3 + Math.random() * 6 });
            if (api.combo >= 5 && api.combo % 5 === 0) stamp(stage, `${e.txt}! ×${api.combo}`, 'great');
          }
        } else if (e.kind === 'boost') {
          if (df < 40 && dl < 50) { ents.splice(i, 1); boost = 2.2; inv = Math.max(inv, 2.2); sfx.great(); vibrate(20); stamp(stage, 'VRRRR!', 'great'); }
        } else if (inv <= 0 && df < e.w / 2 + 30 && dl < e.hh / 2 + 16) {
          crash(e); ents.splice(i, 1);
          if (over) return;
        } else if (boost > 0 && df < e.w / 2 + 30 && dl < e.hh / 2 + 16) {
          // turbo smashes the past
          ents.splice(i, 1); api.add(150, (() => { const s = toScreen(P, lat); const p = toStage(stage, A.box, s.x, s.y); return { x: p.x, y: p.y, color: RED }; })());
          for (let k = 0; k < 20; k++) parts.push({ f: e.f, l: e.l, vf: (Math.random() + 0.2) * 700, vl: (Math.random() - 0.5) * 700, life: 0.7, c: '#D9D4C7', s: 5 + Math.random() * 9 });
          sfx.combo(6); vibrate(25);
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.f += p.vf * dt; p.l += p.vl * dt; if (p.life <= 0) parts.splice(i, 1); }

      // ---------- draw ----------
      const g = A.g;
      g.fillStyle = flash > 0 ? (lives < 3 && inv > 1 ? RED : YEL) : CREAM;
      g.fillRect(0, 0, A.w, A.h);
      g.save();
      if (portrait) { g.translate(0, A.h); g.rotate(-Math.PI / 2); }
      g.scale(sc, sc);
      const up = portrait ? Math.PI / 2 : 0; // keep text upright
      // compenetrating rays from a moving vanishing point
      const vx = VL * 1.05, vy = LAT / 2 + Math.sin(t * 0.7) * 120;
      RAYS.forEach((col, i) => {
        const a0 = Math.PI + (i - RAYS.length / 2) * 0.17 + Math.sin(t * 0.5 + i) * 0.03;
        g.globalAlpha = 0.28 + (i % 3) * 0.1 + Math.min(0.2, sp / 4000); g.fillStyle = col; g.beginPath(); g.moveTo(vx, vy);
        g.lineTo(vx + Math.cos(a0) * 3000, vy + Math.sin(a0) * 3000);
        g.lineTo(vx + Math.cos(a0 + 0.09) * 3000, vy + Math.sin(a0 + 0.09) * 3000); g.fill();
      });
      g.globalAlpha = 1;
      // the rising city: skewed blocks, parallax
      for (let i = 0; i < 14; i++) {
        const span = VL + 400;
        const bx = ((i * 211 - d * 0.35) % span + span) % span - 200;
        const top = i % 2 === 0;
        const bh = 60 + ((i * 97) % 110);
        g.fillStyle = [INK, BLUE, RED, ORANGE][i % 4]; g.globalAlpha = 0.45;
        g.beginPath();
        if (top) { g.moveTo(bx, 0); g.lineTo(bx + 80, 0); g.lineTo(bx + 60 + 30, bh); g.lineTo(bx - 20, bh * 0.8); }
        else { g.moveTo(bx, LAT); g.lineTo(bx + 90, LAT); g.lineTo(bx + 70, LAT - bh); g.lineTo(bx - 30, LAT - bh * 0.7); }
        g.fill();
      }
      g.globalAlpha = 1;
      // speed lines
      g.strokeStyle = INK; g.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        const ly = (i * 53.7) % LAT;
        const len = 40 + sp * 0.18;
        const span = VL + len;
        const lx = ((i * 337 - d * 1.6) % span + span) % span - len;
        g.globalAlpha = 0.25; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + len, ly); g.stroke();
      }
      g.globalAlpha = 1;
      // entities
      for (const e of ents) {
        const x = e.f - d;
        if (x < -200 || x > VL + 200) continue;
        g.save(); g.translate(x, e.l);
        if (e.kind === 'col') drawColumn(g, e.w, e.hh);
        else if (e.kind === 'bust') { g.rotate(up); drawBust(g, 42); }
        else if (e.kind === 'frame') { g.rotate(up + Math.sin(t * 2) * e.spin); drawFrame(g, portrait ? e.hh : e.w, portrait ? e.w : e.hh); }
        else if (e.kind === 'word') { g.rotate(up); const pulse = 1 + Math.sin(t * 8 + e.f) * 0.06; g.scale(pulse, pulse); drawWord(g, e.txt, 34, e.rot, e.c); }
        else if (e.kind === 'boost') {
          g.rotate(0); g.fillStyle = YEL; g.strokeStyle = INK; g.lineWidth = 3;
          for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-30 + k * 18, -26); g.lineTo(-6 + k * 18, 0); g.lineTo(-30 + k * 18, 26); g.lineTo(-20 + k * 18, 26); g.lineTo(4 + k * 18, 0); g.lineTo(-20 + k * 18, -26); g.closePath(); g.fill(); g.stroke(); }
        }
        g.restore();
      }
      for (const p of parts) { g.globalAlpha = Math.max(0, p.life * 1.6); g.fillStyle = p.c; g.fillRect(p.f - d - p.s / 2, p.l - p.s / 2, p.s, p.s); }
      g.globalAlpha = 1;
      // trail of repeated lines behind the car
      [[RED, 10], [INK, 4], [BLUE, 3]].forEach(([col, lw], k) => {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        trail.forEach((l, i) => { const x = P - 30 - i * (8 + sp * 0.012), y = l + (k - 1) * 12; i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.stroke();
      });
      // ghost copies (Balla)
      const blink = inv > 0 && boost <= 0 && Math.floor(t * 14) % 2 === 0;
      for (let k = 5; k >= 0; k--) {
        g.save(); g.translate(P - k * (10 + sp * 0.02), trail[Math.min(trail.length - 1, k * 2)] ?? lat); g.rotate(tilt * 0.8);
        g.globalAlpha = k === 0 ? (blink ? 0.35 : 1) : 0.12 + (5 - k) * 0.05;
        drawCar(g, boost > 0);
        g.restore();
      }
      g.globalAlpha = 1;
      g.restore();
      if (sp > 450) {
        const off = Math.min(26, (sp - 450) * 0.03);
        g.save(); g.globalAlpha = 0.22; g.globalCompositeOperation = 'multiply';
        g.drawImage(A.canvas, 0, 0, A.canvas.width, A.canvas.height, portrait ? 0 : -off, portrait ? off : 0, A.w, A.h);
        g.restore();
      }
      // speedometer
      g.save();
      g.fillStyle = INK; g.font = font(900, Math.max(26, Math.min(A.w, A.h) * 0.09), 125); g.textBaseline = 'top';
      const kmh = String(Math.round(sp * 0.36));
      g.globalAlpha = 0.9; g.fillText(kmh, 12, 8);
      const kw = g.measureText(kmh).width;
      g.font = '700 12px "JetBrains Mono", monospace'; g.fillText('KM/H', 16 + kw, 14);
      g.restore();
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
