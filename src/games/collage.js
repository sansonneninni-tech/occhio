import { h, pick, rand } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 60;
const WORDS = ['DADA', 'SOGNO', 'NO!', 'MERZ', 'ARTE', 'OCCHIO', 'BANG', 'CIAO', '1916', 'ZANG', 'FUTURO', 'VOX'];

// Procedural magazine fragments, drawn once into small canvases.
function fragment() {
  const kind = pick(['halftone', 'text', 'photo', 'eye', 'stripes', 'lips', 'type']);
  const w = rand(90, 150), hh = rand(70, 130);
  const c = document.createElement('canvas'); c.width = w * 2; c.height = hh * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  const col = hsl(rand(0, 360), rand(0.5, 0.9), rand(0.45, 0.65));
  g.fillStyle = '#F7F3EA'; g.fillRect(0, 0, w, hh);
  if (kind === 'halftone') { g.fillStyle = col; for (let y = 4; y < hh; y += 8) for (let x = 4; x < w; x += 8) { const r = 3.6 * (x / w); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
  else if (kind === 'text') { g.fillStyle = '#222'; for (let y = 10; y < hh - 4; y += 9) g.fillRect(6, y, rand(w * 0.4, w - 12), 4); g.fillStyle = col; g.fillRect(6, 4, w * 0.5, 6); }
  else if (kind === 'photo') { const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, col); gr.addColorStop(1, hsl(rand(0, 360), 0.6, 0.3)); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(w * 0.5, hh * 0.7, hh * 0.35, Math.PI, 0); g.fill(); g.beginPath(); g.arc(w * 0.5, hh * 0.35, hh * 0.17, 0, TAU); g.fill(); }
  else if (kind === 'eye') { g.fillStyle = col; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, hh / 2, w * 0.4, hh * 0.22, 0, 0, TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2, hh / 2, hh * 0.15, 0, TAU); g.fill(); }
  else if (kind === 'stripes') { for (let x = 0; x < w; x += 10) { g.fillStyle = x % 20 ? col : '#111'; g.fillRect(x, 0, 10, hh); } }
  else if (kind === 'lips') { g.fillStyle = '#F2D6C4'; g.fillRect(0, 0, w, hh); g.fillStyle = '#D21F3C'; g.beginPath(); g.ellipse(w / 2, hh / 2, w * 0.35, hh * 0.18, 0, 0, TAU); g.fill(); g.strokeStyle = '#7a0d1f'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.17, hh / 2); g.quadraticCurveTo(w / 2, hh * 0.56, w * 0.83, hh / 2); g.stroke(); }
  else { g.fillStyle = col; g.fillRect(0, 0, w, hh); g.fillStyle = '#111'; g.font = `900 ${hh * 0.5}px Archivo`; g.textBaseline = 'middle'; g.fillText(pick(WORDS), 6, hh / 2); }
  // torn edge
  g.globalCompositeOperation = 'destination-out';
  for (let x = 0; x < w; x += 4) { g.beginPath(); g.arc(x, 0, rand(0.5, 2.5), 0, TAU); g.arc(x, hh, rand(0.5, 2.5), 0, TAU); g.fill(); }
  return { c, w, h: hh };
}

export default {
  id: 'collage',
  cat: 'arte',
  title: { it: 'Taglia e Incolla', en: 'Cut & Paste' },
  tagline: { it: 'Ritagli di riviste volano: affettali al volo e diventano il tuo collage dadaista.', en: 'Magazine scraps fly: slice them mid-air and they become your dada collage.' },
  how: {
    it: 'Trascina veloce per tagliare i ritagli che volano.|Ogni ritaglio tagliato si incolla sul tuo collage dove cade.|Non tagliare le forbici rosse! Più ritagli in un colpo = combo.',
    en: 'Swipe fast to slice the flying scraps.|Every sliced scrap gets pasted onto your collage where it lands.|Don’t slice the red scissors! More scraps in one swipe = combo.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#FFD400"/><g transform="rotate(-10 60 50)"><rect x="30" y="24" width="56" height="44" fill="#F7F3EA" stroke="#0E0E10" stroke-width="2"/><circle cx="58" cy="46" r="12" fill="#FF4D1F"/></g><g transform="rotate(14 110 50)"><rect x="90" y="30" width="46" height="36" fill="#2D3BFF" stroke="#0E0E10" stroke-width="2"/><text x="94" y="54" font-family="Archivo" font-weight="900" font-size="16" fill="#F3EFE6">DADA</text></g><path d="M14 86 L150 12" stroke="#0E0E10" stroke-width="3" stroke-dasharray="8 5"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Trascina per tagliare', en: 'Drag to slice' })));
    let art = artLayer(A.w, A.h, '#EDE6D6', 2);
    let pieces = [], halves = [], t = 0, spawnT = 0.5, lives = 3, over = false, trail = [], sliced = 0;
    api.hud(api.t({ it: 'Vite', en: 'Lives' }), '✂✂✂', false);

    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.end({ exports: [{ label: api.t({ it: 'Il tuo collage (PNG)', en: 'Your collage (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-collage.png', b), 'image/png') }] });
    };
    api.timer(TIME, finish);

    const throwOne = () => {
      const lvl = t / TIME;
      const bomb = Math.random() < 0.1 + lvl * 0.12;
      const f = bomb ? null : fragment();
      pieces.push({ f, bomb, x: rand(A.w * 0.15, A.w * 0.85), y: A.h + 60, vx: rand(-120, 120), vy: -rand(A.h * 1.15, A.h * 1.45), r: rand(0, TAU), vr: rand(-3, 3), size: bomb ? 40 : 1 });
    };
    const segHit = (ax, ay, bx, by, cx, cy, rad) => {
      const dx = bx - ax, dy = by - ay; const L = dx * dx + dy * dy || 1;
      const tt = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / L));
      return Math.hypot(ax + dx * tt - cx, ay + dy * tt - cy) < rad;
    };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      spawnT -= dt;
      if (spawnT <= 0) { const n = 1 + Math.floor(Math.random() * (1 + t / 20)); for (let i = 0; i < n; i++) throwOne(); spawnT = Math.max(0.55, 1.4 - t / TIME * 0.8); }
      const G = A.h * 1.2;
      for (const p of pieces) { p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; }
      // slicing
      if (inp.down) trail.push({ x: inp.x, y: inp.y, life: 0.18 }); else if (trail.length) trail = trail.slice(-2);
      for (const tp of trail) tp.life -= dt;
      trail = trail.filter((tp) => tp.life > 0);
      let combo = 0;
      if (inp.down && trail.length > 1) {
        const a = trail.at(-2), b = trail.at(-1);
        if (Math.hypot(b.x - a.x, b.y - a.y) > 6) {
          for (const p of pieces) {
            if (p.cut) continue;
            const rad = p.bomb ? 30 : Math.max(p.f.w, p.f.h) * 0.45;
            if (!segHit(a.x, a.y, b.x, b.y, p.x, p.y, rad)) continue;
            p.cut = true;
            const sp = toStage(stage, A.box, p.x, p.y);
            if (p.bomb) {
              lives--; api.hit(0, { silent: true }); shake(A.box); vibrate([60, 40, 60]);
              // tear across the collage
              const g = art.g; g.save(); g.strokeStyle = '#EDE6D6'; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, p.y + rand(-80, 80)); for (let x = 0; x <= A.w; x += 30) g.lineTo(x, p.y + rand(-12, 12)); g.stroke(); g.restore();
              api.hud(api.t({ it: 'Vite', en: 'Lives' }), '✂'.repeat(Math.max(0, lives)) || '–');
              if (lives <= 0) { finish(); return; }
              continue;
            }
            combo++; sliced++;
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            for (const side of [-1, 1]) halves.push({ f: p.f, side, ang, x: p.x, y: p.y, vx: p.vx * 0.5 + Math.cos(ang + Math.PI / 2) * side * 140, vy: p.vy * 0.3, r: p.r, vr: p.vr + side * 2, life: 0.45 });
            api.hit(1, { x: sp.x, y: sp.y, silent: true });
            sfx.tap();
          }
        }
      }
      if (combo >= 3) { api.add(combo * 50); stamp(stage, `COMBO ×${combo}`, 'great'); }
      // missed pieces fall off-screen
      for (const p of pieces) if (!p.cut && p.vy > 0 && p.y > A.h + 80) { p.cut = true; if (!p.bomb) api.hit(0.3, { silent: true, quiet: true }); }
      pieces = pieces.filter((p) => !p.cut);
      // halves: when life ends they get glued onto the collage
      for (const hf of halves) {
        hf.vy += G * 0.5 * dt; hf.x += hf.vx * dt; hf.y += hf.vy * dt; hf.r += hf.vr * dt * 0.4; hf.life -= dt;
        if (hf.life <= 0 && !hf.glued) {
          hf.glued = true;
          const g = art.g;
          g.save(); g.translate(Math.max(20, Math.min(A.w - 20, hf.x)), Math.max(20, Math.min(A.h - 20, hf.y))); g.rotate(hf.r);
          g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 6; g.shadowOffsetY = 3;
          drawHalf(g, hf);
          g.restore();
        }
      }
      halves = halves.filter((hf) => !hf.glued);
      // draw
      const g = A.g;
      g.drawImage(art.c, 0, 0, A.w, A.h);
      for (const p of pieces) {
        g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        if (p.bomb) {
          g.fillStyle = '#E8202A'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
          g.beginPath(); g.arc(-10, 12, 12, 0, TAU); g.arc(10, 12, 12, 0, TAU); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(-6, 2); g.lineTo(14, -34); g.moveTo(6, 2); g.lineTo(-14, -34); g.lineWidth = 6; g.stroke();
        } else {
          g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 10; g.shadowOffsetY = 6;
          g.drawImage(p.f.c, -p.f.w / 2, -p.f.h / 2, p.f.w, p.f.h);
        }
        g.restore();
      }
      for (const hf of halves) { g.save(); g.translate(hf.x, hf.y); g.rotate(hf.r); drawHalf(g, hf); g.restore(); }
      if (trail.length > 1) {
        g.strokeStyle = '#0E0E10'; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let i = 1; i < trail.length; i++) { g.lineWidth = 2 + i * 0.8; g.beginPath(); g.moveTo(trail[i - 1].x, trail[i - 1].y); g.lineTo(trail[i].x, trail[i].y); g.stroke(); }
      }
      inp.frame();
    });
    function drawHalf(g, hf) {
      const { f } = hf;
      g.save();
      g.rotate(hf.ang - hf.r);
      g.beginPath(); g.rect(-f.w, hf.side < 0 ? -f.h : 0, f.w * 2, f.h); g.clip();
      g.rotate(hf.r - hf.ang);
      g.drawImage(f.c, -f.w / 2, -f.h / 2, f.w, f.h);
      g.restore();
    }
    A.onResize = (w, hh) => { const old = art; art = artLayer(w, hh, '#EDE6D6', 2); art.g.drawImage(old.c, 0, 0, w, hh); };
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
