import { h } from '../core/dom.js';
import { hsl, mix } from '../core/color.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, splat, toStage, TAU } from '../core/arcade.js';
import { paletteExports, download } from '../core/export.js';
import { sfx, vibrate, shake, stamp } from '../core/fx.js';

const TIME = 60;

function makePalette() {
  const base = Math.random() * 360;
  return [0, 72, 144, 216, 288].map((o, i) => hsl(base + o + (i % 2 ? 8 : -8), 0.78, i === 2 ? 0.6 : 0.52));
}

export default {
  id: 'raffica',
  cat: 'colore',
  title: { it: 'Raffica di Colore', en: 'Paint Barrage' },
  tagline: { it: 'Spara vernice sui Censori grigi. La battaglia diventa il tuo quadro.', en: 'Blast paint at the grey Censors. The battle becomes your painting.' },
  how: {
    it: 'Muovi il cannone e tocca (o tieni premuto) per sparare vernice.|Ogni Censore ha un alone colorato: colpiscilo col colore uguale per il doppio dei punti e una macchia enorme.|Cambia colore con i pallini sotto o i tasti 1-5. Se un Censore arriva in fondo, cancella il quadro e perdi una vita.',
    en: 'Move the cannon and tap (or hold) to fire paint.|Each Censor has a colored halo: hit it with the matching color for double points and a huge splat.|Switch color with the dots below or keys 1-5. If a Censor reaches the bottom it erases your painting and you lose a life.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#F3EFE6"/><circle cx="44" cy="40" r="20" fill="#FF4D1F"/><circle cx="66" cy="26" r="5" fill="#FF4D1F"/><circle cx="104" cy="56" r="26" fill="#2D3BFF"/><circle cx="130" cy="30" r="6" fill="#2D3BFF"/><circle cx="84" cy="22" r="11" fill="#FFD400"/><circle cx="118" cy="20" r="10" fill="#9C968A" stroke="#0E0E10" stroke-width="2.5"/><circle cx="115" cy="18" r="2.5" fill="#0E0E10"/><circle cx="122" cy="18" r="2.5" fill="#0E0E10"/><rect x="72" y="80" width="16" height="20" rx="4" fill="#0E0E10"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    let art = artLayer(A.w, A.h, '#F3EFE6');
    const palette = makePalette();
    let ci = 0;
    const pal = h('div', { class: 'pal' }, palette.map((c, i) => {
      const b = h('button', { type: 'button', style: { background: c }, 'aria-label': c, 'aria-pressed': String(i === 0) });
      b.onclick = () => setColor(i);
      return b;
    }));
    controls.append(pal, h('span', { class: 'keys-hint' }, api.t({ it: 'Mouse per mirare · clic per sparare · 1-5 colori', en: 'Mouse to aim · click to fire · 1-5 colors' })));
    const setColor = (i) => { ci = i; [...pal.children].forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); sfx.tap(); };

    let lives = 3, t = 0, spawnT = 0, fireT = 0, kills = 0, over = false;
    const shots = [], foes = [], parts = [];
    let gunX = A.w / 2;
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '♥♥♥', false);

    const spawn = () => {
      const tint = Math.floor(Math.random() * palette.length);
      const lvl = t / TIME;
      const big = Math.random() < 0.12 + lvl * 0.15;
      foes.push({
        x: 30 + Math.random() * (A.w - 60), y: -30, r: big ? 30 : 18 + Math.random() * 6,
        vy: (34 + lvl * 70 + Math.random() * 20) * (big ? 0.6 : 1), wob: Math.random() * TAU, tint, hp: big ? 3 : 1, blink: 0,
      });
    };

    const finish = () => {
      if (over) return; over = true;
      stopLoop();
      api.end({
        exports: [
          { label: api.t({ it: 'Il tuo quadro (PNG)', en: 'Your painting (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-raffica.png', b), 'image/png') },
          ...paletteExports(palette, 'occhio-raffica-palette').slice(0, 3),
        ],
      });
    };
    api.timer(TIME, finish);

    const stopLoop = loop((dt) => {
      t += dt;
      // aim
      if (inp.keys.has('ArrowLeft')) gunX -= 420 * dt;
      if (inp.keys.has('ArrowRight')) gunX += 420 * dt;
      if (inp.moved) { gunX += (inp.x - gunX) * Math.min(1, dt * 18); }
      gunX = Math.max(20, Math.min(A.w - 20, gunX));
      for (const k of inp.pressed) if (k >= '1' && k <= '5') setColor(+k - 1);
      // fire
      fireT -= dt;
      const firing = inp.down || inp.keys.has(' ');
      if (firing && fireT <= 0) {
        fireT = 0.16;
        shots.push({ x: gunX, y: A.h - 40, vy: -760, c: ci });
        sfx.tick();
      }
      // spawn
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 1.3 - t / TIME * 0.95) * (0.7 + Math.random() * 0.6); }
      // update shots
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.y += s.vy * dt;
        if (s.y < -10) {
          art.g.globalAlpha = 0.9; splat(art.g, s.x, 6, 5, palette[s.c]); art.g.globalAlpha = 1;
          shots.splice(i, 1);
          continue;
        }
        for (let j = foes.length - 1; j >= 0; j--) {
          const f = foes[j];
          if (Math.hypot(f.x - s.x, f.y - s.y) < f.r + 6) {
            shots.splice(i, 1);
            const match = s.c === f.tint;
            f.hp -= match ? 2 : 1; f.blink = 0.12;
            splat(art.g, f.x + (Math.random() - 0.5) * 10, f.y, (match ? 1.6 : 0.8) * f.r, palette[s.c]);
            for (let k = 0; k < 10; k++) parts.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 300, life: 0.5, c: palette[s.c] });
            if (f.hp <= 0) {
              foes.splice(j, 1);
              kills++;
              const p = toStage(stage, A.box, f.x, f.y);
              api.hit(match ? 1 : 0.62, { silent: true, x: p.x, y: p.y });
              if (kills % 15 === 0) stamp(stage, `${kills}!`, 'great');
              vibrate(12);
            } else sfx.tap();
            break;
          }
        }
      }
      // update foes
      for (let j = foes.length - 1; j >= 0; j--) {
        const f = foes[j];
        f.wob += dt * 3; f.blink -= dt;
        f.y += f.vy * dt; f.x += Math.sin(f.wob) * 30 * dt;
        if (f.y > A.h - 20) {
          foes.splice(j, 1);
          // Erase: grey smear across the painting.
          art.g.save(); art.g.globalAlpha = 0.85; art.g.fillStyle = '#B9B3A6';
          art.g.translate(f.x, A.h - 60); art.g.rotate((Math.random() - 0.5) * 0.4);
          art.g.fillRect(-90, -24, 180, 48); art.g.restore();
          lives--;
          api.hit(0, { silent: true });
          api.hud(api.t({ it: 'Vite', en: 'Lives' }), '♥'.repeat(Math.max(0, lives)) || '–');
          shake(A.box); vibrate([40, 30, 40]);
          if (lives <= 0) { finish(); return; }
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; if (p.life <= 0) parts.splice(i, 1); }

      // draw
      const g = A.g;
      g.drawImage(art.c, 0, 0, A.w, A.h);
      for (const f of foes) {
        g.save(); g.translate(f.x, f.y);
        g.fillStyle = palette[f.tint]; g.globalAlpha = 0.35; g.beginPath(); g.arc(0, 0, f.r + 9, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.fillStyle = f.blink > 0 ? '#fff' : '#8F8A80'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
        g.beginPath(); g.arc(0, 0, f.r, 0, TAU); g.fill(); g.stroke();
        // eyes and stitched mouth
        g.fillStyle = '#0E0E10';
        g.beginPath(); g.arc(-f.r * 0.35, -f.r * 0.15, f.r * 0.16, 0, TAU); g.arc(f.r * 0.35, -f.r * 0.15, f.r * 0.16, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-f.r * 0.4, f.r * 0.35); g.lineTo(f.r * 0.4, f.r * 0.35); g.lineWidth = 2.5; g.stroke();
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * f.r * 0.16, f.r * 0.25); g.lineTo(k * f.r * 0.16, f.r * 0.45); g.stroke(); }
        if (f.hp > 1) { g.fillStyle = '#0E0E10'; g.font = '900 13px Archivo'; g.textAlign = 'center'; g.fillText('×' + f.hp, 0, -f.r - 12); }
        g.restore();
      }
      for (const s of shots) { g.fillStyle = palette[s.c]; g.strokeStyle = '#0E0E10'; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, 7, 0, TAU); g.fill(); g.stroke(); }
      for (const p of parts) { g.fillStyle = p.c; g.globalAlpha = Math.max(0, p.life * 2); g.beginPath(); g.arc(p.x, p.y, 4, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      // cannon
      g.save(); g.translate(gunX, A.h - 26);
      g.fillStyle = palette[ci]; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(-12, -30, 24, 36, 6); g.fill(); g.stroke();
      g.fillStyle = '#0E0E10'; g.beginPath(); g.roundRect(-26, 0, 52, 22, 8); g.fill();
      g.restore();
      inp.frame();
    });
    A.onResize = (w, hh) => {
      // Keep the painting: copy it into a new layer of the new size.
      const old = art; art = artLayer(w, hh, '#F3EFE6'); art.g.drawImage(old.c, 0, 0, w, hh);
    };
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
