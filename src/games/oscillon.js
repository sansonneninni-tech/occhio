import { h, rand } from '../core/dom.js';
import { stageCanvas, artLayer, loop, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 60;
const ART = 1400;              // art layer size (world units)
const INKS = [125, 175, 200, 285, 320, 40, 55]; // phosphor hues, unlocked by hits
const MOVES = [
  { fx: 2, fy: 3, it: 'I · 2:3', en: 'I · 2:3' },
  { fx: 3, fy: 4, it: 'II · 3:4', en: 'II · 3:4' },
  { fx: 5, fy: 4, it: 'III · 5:4', en: 'III · 5:4' },
];

const CSS = `
.osc-crt{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 2px,#0006 2px 3px),radial-gradient(ellipse at center,#0000 55%,#000c 100%);mix-blend-mode:multiply}
.osc-btn{flex:1;min-width:120px;max-width:260px;min-height:64px;border:3px solid #0E0E10;border-radius:999px;background:#0b1a0f;color:#7CFF9B;font:700 18px/1 "JetBrains Mono",monospace;letter-spacing:.06em;box-shadow:0 5px 0 #0E0E10;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
.osc-btn.is-on{background:#7CFF9B;color:#0b1a0f;transform:translateY(4px);box-shadow:0 1px 0 #0E0E10}
.osc-btn small{display:block;font-size:11px;opacity:.7;margin-top:4px}
`;

export default {
  id: 'oscillon',
  cat: 'folle',
  title: { it: 'Oscillon', en: 'Oscillon' },
  tagline: { it: 'Suona due pendoli come Ben Laposky nel 1950: il raggio dell’oscilloscopio disegna la tua opera elettronica.', en: 'Play two pendulums like Ben Laposky in 1950: the oscilloscope beam draws your electronic artwork.' },
  how: {
    it: 'Tieni premuto X (sinistra) o Y (destra) per dare energia ai pendoli: la figura si allarga in larghezza o in altezza. Se lasci, si stringe.|Allarga la figura quanto basta perché il raggio passi nei cerchi bersaglio.|Non toccare i blocchi di rumore e non uscire dallo schermo: costano una vita. Ogni bersaglio cambia il colore del fosforo.',
    en: 'Hold X (left) or Y (right) to pump the pendulums: the figure widens or grows taller. Let go and it shrinks.|Open the figure just enough for the beam to cross the target rings.|Don’t touch the noise blocks or leave the screen: they cost a life. Every target changes the phosphor color.',
  },
  thumb: () => {
    let d = '';
    for (let i = 0; i <= 400; i++) { const t = i / 400 * TAU * 3; const x = 80 + 46 * Math.sin(2 * t) * Math.exp(-t * 0.03), y = 50 + 36 * Math.sin(3 * t + 0.6) * Math.exp(-t * 0.03); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#020a04"/><g stroke="#1d3a24" stroke-width=".6">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 20} 0V100M0 ${i * 12.5}H160"/>`).join('')}</g><path d="${d}" stroke="#7CFF9B" stroke-width="1.4" fill="none"/><circle cx="120" cy="24" r="7" fill="none" stroke="#FF4DD8" stroke-width="2"/></svg>`;
  },

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    if (!document.getElementById('osc-css')) document.head.append(h('style', { id: 'osc-css' }, CSS));
    const A = stageCanvas(board);
    A.box.style.background = '#020a04';
    A.box.append(h('div', { class: 'osc-crt' }));
    const art = artLayer(ART, ART, '#020a04', 1);
    const glow = artLayer(ART, ART, null, 0.5); // short persistence for the live beam

    const held = { x: false, y: false };
    const mkBtn = (axis, label, sub) => {
      const b = h('button', { class: 'osc-btn', type: 'button' }, label, h('small', {}, sub));
      const on = (e) => { e.preventDefault(); held[axis] = true; b.classList.add('is-on'); b.setPointerCapture?.(e.pointerId); };
      const off = () => { held[axis] = false; b.classList.remove('is-on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
      return b;
    };
    const bx = mkBtn('x', '↔ X', api.t({ it: 'tasto A / ←', en: 'key A / ←' }));
    const by = mkBtn('y', '↕ Y', api.t({ it: 'tasto L / →', en: 'key L / →' }));
    controls.append(bx, by);
    // Touching the left or right half of the screen also works.
    const touches = new Map();
    const syncTouch = () => {
      const vals = [...touches.values()];
      held.tx = vals.includes('x'); held.ty = vals.includes('y');
    };
    const pd = (e) => { const r = A.canvas.getBoundingClientRect(); touches.set(e.pointerId, e.clientX - r.left < r.width / 2 ? 'x' : 'y'); A.canvas.setPointerCapture?.(e.pointerId); syncTouch(); e.preventDefault(); };
    const pu = (e) => { touches.delete(e.pointerId); syncTouch(); };
    A.canvas.addEventListener('pointerdown', pd); A.canvas.addEventListener('pointerup', pu); A.canvas.addEventListener('pointercancel', pu);
    const keys = new Set();
    const kd = (e) => { if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'l', 'L'].includes(e.key)) { e.preventDefault(); keys.add(e.key.toLowerCase()); } };
    const ku = (e) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    // The two pendulums are also two oscillators: you hear the figure you draw.
    let actx = null, tone = null;
    if (!store.muted) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const master = actx.createGain(); master.gain.value = 0.05; master.connect(actx.destination);
        const mk = (pan) => { const o = actx.createOscillator(), gn = actx.createGain(), p = actx.createStereoPanner ? actx.createStereoPanner() : null; o.type = 'sine'; gn.gain.value = 0; o.connect(gn); if (p) { p.pan.value = pan; gn.connect(p).connect(master); } else gn.connect(master); o.start(); return { o, gn }; };
        const ox = mk(-0.6), oy = mk(0.6);
        tone = (pd, M, hx, hy) => {
          const now = actx.currentTime;
          ox.o.frequency.setTargetAtTime(110 * M.fx, now, 0.05); oy.o.frequency.setTargetAtTime(110 * (M.fy + 0.02), now, 0.05);
          ox.gn.gain.setTargetAtTime(Math.min(1, pd.ax) * (hx ? 1 : 0.5), now, 0.05); oy.gn.gain.setTargetAtTime(Math.min(1, pd.ay) * (hy ? 1 : 0.5), now, 0.05);
        };
      } catch { actx = null; tone = null; }
    }
    const pend = { ax: 0.25, ay: 0.2, px: 0, py: rand(0, TAU), base: TAU * 0.9 };
    let t = 0, rotA = 0, lives = 3, inv = 0, over = false, mode = 0, hits = 0, ink = 0, hue = INKS[0];
    let targets = [], noise = [], spawnN = 4, prev = null, pts = [], flash = 0;
    const lifeHud = () => api.hud(api.t({ it: 'Vite', en: 'Lives' }), '◆'.repeat(Math.max(0, lives)) || '–');
    lifeHud();

    const free = (x, y, r) => Math.abs(x) < 0.9 && Math.abs(y) < 0.9 && !noise.some((n) => Math.abs(n.x - x) < n.s + r && Math.abs(n.y - y) < n.s + r) && !targets.some((o) => Math.hypot(o.x - x, o.y - y) < 0.25);
    const spawnTarget = () => {
      for (let k = 0; k < 30; k++) {
        const lvl = t / TIME;
        const x = rand(-0.85, 0.85), y = rand(-0.85, 0.85);
        if (Math.hypot(x, y) < 0.2 || !free(x, y, 0.08)) continue;
        targets.push({ x, y, r: 0.095 - lvl * 0.025, age: 0, life: 6 - lvl * 1.5 });
        return;
      }
    };
    const spawnNoise = () => {
      for (let k = 0; k < 30; k++) {
        const s = rand(0.06, 0.1 + t / TIME * 0.05);
        const x = rand(-0.8, 0.8), y = rand(-0.8, 0.8);
        if (Math.hypot(x, y) < 0.3 || !free(x, y, s)) continue;
        noise.push({ x, y, s, warn: 0, life: rand(5, 8) });
        return;
      }
    };
    for (let i = 0; i < 2; i++) spawnTarget();

    const view = () => { const S = Math.min(A.w, A.h) * 0.46; return { S, cx: A.w / 2, cy: A.h / 2 }; };

    const finish = () => {
      if (over) return; over = true; stopLoop();
      try { actx?.close(); } catch {}
      actx = null;
      const svg = () => {
        const out = [];
        for (let i = 0; i < pts.length; i += 400) {
          const seg = pts.slice(i, i + 401);
          out.push(`<polyline fill="none" stroke="hsl(${seg[0][2]} 100% 65%)" stroke-width="1.4" stroke-opacity=".8" points="${seg.map((p) => `${(p[0] * 640 + 700).toFixed(1)},${(p[1] * 640 + 700).toFixed(1)}`).join(' ')}"/>`);
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1400"><rect width="1400" height="1400" fill="#020a04"/>${out.join('')}<text x="40" y="1360" fill="#7CFF9B" font-family="monospace" font-size="22">OSCILLON · ${(store.name || 'anonimo').toUpperCase()} · ${api.score}</text></svg>`;
      };
      api.end({
        exports: [
          { label: api.t({ it: 'Oscillon (PNG)', en: 'Oscillon (PNG)' }), run: () => art.c.toBlob((b) => download('occhio-oscillon.png', b), 'image/png') },
          { label: api.t({ it: 'Oscillon vettoriale (SVG)', en: 'Vector oscillon (SVG)' }), run: () => download('occhio-oscillon.svg', svg(), 'image/svg+xml') },
        ],
        summary: api.t({ it: `${hits} bersagli, ${INKS.slice(0, ink + 1).length} colori di fosforo.`, en: `${hits} targets, ${INKS.slice(0, ink + 1).length} phosphor colors.` }),
      });
    };
    api.timer(TIME, finish);

    const hurt = (msg) => {
      lives--; inv = 1.4; flash = 1; lifeHud();
      pend.ax *= 0.45; pend.ay *= 0.45;
      api.hit(0, { silent: true }); shake(A.box); vibrate([60, 40, 60]);
      stamp(stage, msg, 'bad');
      if (lives <= 0) finish();
    };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      const nm = t < 20 ? 0 : t < 40 ? 1 : 2;
      if (nm !== mode) { mode = nm; stamp(stage, api.t(MOVES[mode]), 'great'); sfx.combo(5 + mode * 2); }
      const M = MOVES[mode];
      // Pumping and damping.
      const hx = held.x || held.tx || keys.has('arrowleft') || keys.has('a');
      const hy = held.y || held.ty || keys.has('arrowright') || keys.has('l');
      pend.ax += hx ? 0.55 * dt : -0.16 * pend.ax * dt - 0.02 * dt;
      pend.ay += hy ? 0.55 * dt : -0.16 * pend.ay * dt - 0.02 * dt;
      pend.ax = Math.max(0.12, pend.ax); pend.ay = Math.max(0.12, pend.ay);
      tone?.(pend, M, hx, hy);
      rotA += dt * 0.12;

      const { S, cx, cy } = view();
      const g = A.g, ag = art.g, gg = glow.g;
      // Fade persistence.
      gg.globalCompositeOperation = 'source-over';
      gg.fillStyle = 'rgba(2,10,4,0.16)'; gg.fillRect(0, 0, ART, ART);

      const SUB = 10;
      const ca = Math.cos(rotA), sa = Math.sin(rotA);
      ag.globalCompositeOperation = 'lighter'; gg.globalCompositeOperation = 'lighter';
      for (let s = 0; s < SUB; s++) {
        const h2 = dt / SUB;
        pend.px += pend.base * M.fx / 2 * h2;
        pend.py += pend.base * (M.fy / 2 + 0.11) * h2;
        const x = pend.ax * Math.sin(pend.px), y = pend.ay * Math.sin(pend.py);
        if (prev) {
          // Live beam on screen frame.
          gg.strokeStyle = `hsla(${hue},100%,75%,1)`; gg.lineWidth = 5;
          gg.beginPath(); gg.moveTo(ART / 2 + prev[0] * ART * 0.5, ART / 2 + prev[1] * ART * 0.5); gg.lineTo(ART / 2 + x * ART * 0.5, ART / 2 + y * ART * 0.5); gg.stroke();
          // Permanent drawing on the rotating "paper".
          const rx0 = prev[0] * ca - prev[1] * sa, ry0 = prev[0] * sa + prev[1] * ca;
          const rx1 = x * ca - y * sa, ry1 = x * sa + y * ca;
          const ax0 = ART / 2 + rx0 * ART * 0.46, ay0 = ART / 2 + ry0 * ART * 0.46, ax1 = ART / 2 + rx1 * ART * 0.46, ay1 = ART / 2 + ry1 * ART * 0.46;
          ag.strokeStyle = `hsla(${hue},100%,55%,0.05)`; ag.lineWidth = 9;
          ag.beginPath(); ag.moveTo(ax0, ay0); ag.lineTo(ax1, ay1); ag.stroke();
          ag.strokeStyle = `hsla(${hue},100%,62%,0.3)`; ag.lineWidth = 1.8;
          ag.beginPath(); ag.moveTo(ax0, ay0); ag.lineTo(ax1, ay1); ag.stroke();
          if (s % 3 === 0 && pts.length < 60000) pts.push([+rx1.toFixed(4), +ry1.toFixed(4), hue]);
          // Targets.
          for (const tg of targets) {
            if (tg.dead) continue;
            if (segDist(prev[0], prev[1], x, y, tg.x, tg.y) < tg.r) {
              tg.dead = true; hits++;
              const q = Math.max(0.45, Math.min(1, 1.1 - tg.age / tg.life));
              const p = toStage(stage, A.box, cx + tg.x * S, cy + tg.y * S);
              api.hit(q, { x: p.x, y: p.y, silent: q < 0.95, speed: q });
              if (hits % 3 === 0 && ink < INKS.length - 1) { ink++; stamp(stage, api.t({ it: 'NUOVO FOSFORO', en: 'NEW PHOSPHOR' }), 'great'); }
              vibrate(12);
            }
          }
          if (inv <= 0) {
            for (const n of noise) if (n.warn >= 1 && Math.abs(x - n.x) < n.s && Math.abs(y - n.y) < n.s) { hurt(api.t({ it: 'RUMORE', en: 'NOISE' })); break; }
            if (inv <= 0 && (Math.abs(x) > 1 || Math.abs(y) > 1)) hurt(api.t({ it: 'FUORI SCALA', en: 'OFF SCALE' }));
          }
        }
        prev = [x, y];
      }
      ag.globalCompositeOperation = 'source-over'; gg.globalCompositeOperation = 'source-over';
      hue += (INKS[ink] + 28 * Math.sin(t * 0.35) - hue) * Math.min(1, dt * 2);
      inv -= dt; flash = Math.max(0, flash - dt * 3);

      for (const tg of targets) { tg.age += dt; if (tg.age > tg.life) { tg.dead = true; api.hit(0.25, { silent: true, quiet: true }); } }
      targets = targets.filter((x) => !x.dead);
      while (targets.length < 2 + (t > 30 ? 1 : 0)) spawnTarget();
      spawnN -= dt;
      if (spawnN <= 0) { spawnNoise(); spawnN = Math.max(1.6, 4 - t / TIME * 2.4); }
      for (const n of noise) { if (n.warn < 1) n.warn += dt; else n.life -= dt; }
      noise = noise.filter((n) => n.life > 0);

      // Draw screen.
      g.fillStyle = '#020a04'; g.fillRect(0, 0, A.w, A.h);
      // The rotating artwork, faint, behind the live beam.
      g.save(); g.translate(cx, cy); g.rotate(-rotA); g.globalAlpha = 0.9;
      const AS = S * 2 / 0.92;
      g.drawImage(art.c, -AS / 2, -AS / 2, AS, AS); g.restore();
      // Graticule.
      g.strokeStyle = '#1d3a24'; g.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        g.beginPath(); g.moveTo(cx + i * S / 5, cy - S); g.lineTo(cx + i * S / 5, cy + S); g.stroke();
        g.beginPath(); g.moveTo(cx - S, cy + i * S / 5); g.lineTo(cx + S, cy + i * S / 5); g.stroke();
      }
      g.strokeStyle = '#2f6b3d'; g.lineWidth = 2; g.strokeRect(cx - S, cy - S, S * 2, S * 2);
      // Envelope of the current figure.
      g.setLineDash([6, 6]); g.strokeStyle = `hsla(${hue},100%,70%,0.35)`;
      g.strokeRect(cx - pend.ax * S, cy - pend.ay * S, pend.ax * S * 2, pend.ay * S * 2); g.setLineDash([]);
      // Live beam.
      g.globalCompositeOperation = 'lighter';
      g.drawImage(glow.c, cx - S, cy - S, S * 2, S * 2);
      g.globalCompositeOperation = 'source-over';
      // Beam dot.
      if (prev) { g.fillStyle = '#fff'; g.shadowColor = `hsl(${hue},100%,60%)`; g.shadowBlur = 18; g.beginPath(); g.arc(cx + prev[0] * S, cy + prev[1] * S, 4, 0, TAU); g.fill(); g.shadowBlur = 0; }
      // Targets.
      for (const tg of targets) {
        const k = 1 - tg.age / tg.life;
        g.strokeStyle = '#FF4DD8'; g.lineWidth = 3;
        g.beginPath(); g.arc(cx + tg.x * S, cy + tg.y * S, tg.r * S, 0, TAU); g.stroke();
        g.lineWidth = 2; g.beginPath(); g.arc(cx + tg.x * S, cy + tg.y * S, tg.r * S + 6, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
      }
      // Noise blocks.
      for (const n of noise) {
        const x0 = cx + (n.x - n.s) * S, y0 = cy + (n.y - n.s) * S, sz = n.s * 2 * S;
        if (n.warn < 1) { if (Math.floor(t * 8) % 2) { g.strokeStyle = '#FF3B30'; g.lineWidth = 2; g.strokeRect(x0, y0, sz, sz); } continue; }
        const cells = 7;
        for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
          g.fillStyle = Math.random() < 0.5 ? '#E8FFE8' : (Math.random() < 0.3 ? '#FF3B30' : '#061208');
          g.fillRect(x0 + i * sz / cells, y0 + j * sz / cells, sz / cells + 0.5, sz / cells + 0.5);
        }
      }
      if (flash > 0) { g.fillStyle = `rgba(255,59,48,${flash * 0.35})`; g.fillRect(0, 0, A.w, A.h); }
      g.fillStyle = '#7CFF9B'; g.font = '600 12px "JetBrains Mono", monospace';
      g.fillText(`${api.t(MOVES[mode])}  X ${(pend.ax * 100) | 0}%  Y ${(pend.ay * 100) | 0}%`, cx - S + 8, cy - S + 18);
    });

    api.onCleanup(() => {
      stopLoop();
      try { actx?.close(); } catch {}
      A.canvas.removeEventListener('pointerdown', pd); A.canvas.removeEventListener('pointerup', pu); A.canvas.removeEventListener('pointercancel', pu);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      A.destroy();
    });
  },
};

function segDist(x0, y0, x1, y1, px, py) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1e-9;
  const k = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
  return Math.hypot(x0 + dx * k - px, y0 + dy * k - py);
}
