import { h } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { stageCanvas, artLayer, loop, input, arcadeLayout, toStage, splat, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { shake, vibrate, stamp, sfx, floatText } from '../core/fx.js';
import { store } from '../core/store.js';

const TIME = 70;
const WW = 2400, WH = 1600;
const FLOORS = [
  { bg: '#0E0E10', grid: 'rgba(198,255,0,0.22)' },
  { bg: '#14002B', grid: 'rgba(255,43,214,0.25)' },
  { bg: '#F3EFE6', grid: 'rgba(14,14,16,0.16)' },
];
const wrapPI = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(d) < 1e-6) return false;
  const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
  const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

export default {
  id: 'drift-acido',
  cat: 'folle',
  title: { it: 'Drift Acido', en: 'Acid Drift' },
  tagline: { it: 'Sgomma di traverso su un pavimento che si scioglie. Ogni drift dipinge una pennellata al neon: alla fine hai un quadro fatto di gomme.', en: 'Slide sideways on a melting floor. Every drift paints a neon stroke: at the end you own a painting made of tyres.' },
  how: {
    it: 'Passa dentro le porte una dopo l’altra: la freccia ti indica la prossima.|Tastiera: ↑ gas, ↓ freno, ← → sterzo, spazio freno a mano. Mouse o dito: tieni premuto e l’auto va dove punti.|Stai di traverso il più a lungo possibile: i punti del drift crescono e si incassano quando raddrizzi.|Se sbatti contro un muro o una colonna perdi i punti del drift in corso. Le sgommate restano: sono la tua opera.',
    en: 'Drive through the gates one after another: the arrow points to the next one.|Keyboard: ↑ gas, ↓ brake, ← → steer, space handbrake. Mouse or finger: hold and the car goes where you point.|Stay sideways as long as you can: drift points grow and are banked when you straighten out.|Hit a wall or a pillar and you lose the drift in progress. The skid marks stay: they are your artwork.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#0E0E10"/><g fill="none" stroke-linecap="round"><path d="M-10 80 C30 90 50 20 90 40 S140 90 170 30" stroke="#FF2BD6" stroke-width="9"/><path d="M-10 92 C30 100 50 32 90 52 S140 102 170 42" stroke="#29F0FF" stroke-width="9"/><path d="M-10 70 C40 70 60 10 100 22" stroke="#C6FF00" stroke-width="4"/></g><g transform="translate(112 46) rotate(-30)"><rect x="-18" y="-10" width="36" height="20" rx="7" fill="#FF2BD6" stroke="#fff" stroke-width="2"/><rect x="0" y="-7" width="9" height="14" rx="2" fill="#0E0E10"/><rect x="-20" y="-11" width="5" height="22" fill="#C6FF00"/></g><g stroke="#FFE629" stroke-width="5"><line x1="30" y1="14" x2="30" y2="40"/><line x1="70" y1="10" x2="70" y2="36"/></g></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    const touchy = matchMedia('(pointer: coarse)').matches;
    controls.append(h('span', { class: 'keys-hint' }, api.t(touchy
      ? { it: 'Tieni premuto: l’auto va dove punti il dito', en: 'Hold: the car goes where your finger points' }
      : { it: '↑ ↓ ← → + spazio, oppure tieni premuto il mouse', en: '↑ ↓ ← → + space, or hold the mouse' })));
    const floor = FLOORS[Math.floor(Math.random() * FLOORS.length)];
    const art = artLayer(WW, WH, floor.bg, 0.75);
    const lightFloor = floor.bg === '#F3EFE6';

    // pillars: wobbling chrome blobs
    const pillars = [];
    for (let i = 0; i < 9 && pillars.length < 7; i++) {
      for (let k = 0; k < 30; k++) {
        const r = 50 + Math.random() * 45, x = 260 + Math.random() * (WW - 520), y = 260 + Math.random() * (WH - 520);
        if (Math.hypot(x - WW / 2, y - WH / 2) < 300) continue;
        if (pillars.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r + 260)) continue;
        pillars.push({ x, y, r, ph: Math.random() * TAU }); break;
      }
    }
    const newGate = (px, py) => {
      for (let k = 0; k < 80; k++) {
        const x = 220 + Math.random() * (WW - 440), y = 220 + Math.random() * (WH - 440);
        const d = Math.hypot(x - px, y - py);
        if (d < 420 || d > 1300) continue;
        if (pillars.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 150)) continue;
        return { x, y, a: Math.random() * Math.PI, w: 190 };
      }
      return { x: WW / 2, y: WH / 2, a: 0, w: 190 };
    };

    const car = { x: WW / 2, y: WH / 2, th: -Math.PI / 2, vx: 0, vy: 0 };
    let gate = newGate(car.x, car.y), next = newGate(gate.x, gate.y);
    let t = 0, over = false, gates = 0, driftPts = 0, driftTime = 0, calmT = 0, chain = 0, lastBank = -9, bestDrift = 0, hue = Math.random() * 360;
    let wheels = null, smoke = [], camShake = 0;
    api.hud(api.t({ it: 'Porte', en: 'Gates' }), '0', false);

    const finish = () => {
      if (over) return; over = true; stopLoop();
      api.end({
        summary: api.t({ it: `${gates} porte · drift migliore ${Math.round(bestDrift)} punti`, en: `${gates} gates · best drift ${Math.round(bestDrift)} points` }),
        exports: [{ label: api.t({ it: 'Pittura a sgommate (PNG)', en: 'Skid-mark painting (PNG)' }), run: () => signed().toBlob((b) => download('occhio-drift-acido.png', b), 'image/png') }],
      });
    };
    api.timer(TIME, finish);

    function signed() {
      const c = document.createElement('canvas'); c.width = art.c.width; c.height = art.c.height;
      const g = c.getContext('2d'); g.drawImage(art.c, 0, 0);
      g.font = '700 22px "JetBrains Mono", monospace'; g.textAlign = 'right';
      g.fillStyle = lightFloor ? '#0E0E10' : '#F3EFE6';
      g.fillText(`DRIFT ACIDO · ${(store.name || '').toUpperCase()} · ${api.score.toLocaleString()} PT`, c.width - 24, c.height - 24);
      return c;
    }

    function bank() {
      if (driftPts < 5) { driftPts = 0; return; }
      const pts = Math.round(driftPts);
      chain = t - lastBank < 2.2 ? Math.min(5, chain + 1) : 1;
      lastBank = t;
      const total = pts * chain;
      bestDrift = Math.max(bestDrift, total);
      const s = screen(car.x, car.y);
      const p = toStage(stage, A.box, s.x, s.y - 30);
      api.add(total);
      floatText(stage, `DRIFT +${total}${chain > 1 ? ` ×${chain}` : ''}`, p.x, p.y, '#FF2BD6');
      if (total > 400) { stamp(stage, total > 1200 ? 'MOSTRUOSO!' : api.t({ it: 'DRIFT!', en: 'DRIFT!' }), 'great'); sfx.great(); splat(art.g, car.x, car.y, 18 + Math.min(40, total / 60), hsl(hue, 1, 0.6)); }
      else sfx.good();
      driftPts = 0;
    }
    function crash(strength) {
      if (strength < 160) return;
      if (driftPts > 0) { stamp(stage, api.t({ it: 'DRIFT PERSO', en: 'DRIFT LOST' }), 'bad'); }
      driftPts = 0; chain = 0;
      api.hit(0, { silent: true }); shake(A.box); vibrate([40, 30, 40]); camShake = 0.4;
    }

    let cam = { x: car.x, y: car.y, z: 1 };
    const screen = (x, y) => ({ x: (x - cam.x) * cam.z + A.w / 2, y: (y - cam.y) * cam.z + A.h / 2 });

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      hue = (hue + dt * 50) % 360;
      cam.z = clamp(Math.max(A.w, A.h) / 1250, 0.42, 1.25);

      // ---- input ----
      let thr = 0, brk = 0, steer = 0, hb = false;
      const K = inp.keys;
      if (K.has('ArrowUp') || K.has('w') || K.has('W')) thr = 1;
      if (K.has('ArrowDown') || K.has('s') || K.has('S')) brk = 1;
      if (K.has('ArrowLeft') || K.has('a') || K.has('A')) steer -= 1;
      if (K.has('ArrowRight') || K.has('d') || K.has('D')) steer += 1;
      if (K.has(' ')) hb = true;
      const sp = Math.hypot(car.vx, car.vy);
      if (inp.down) {
        const wx = (inp.x - A.w / 2) / cam.z + cam.x, wy = (inp.y - A.h / 2) / cam.z + cam.y;
        const diff = wrapPI(Math.atan2(wy - car.y, wx - car.x) - car.th);
        steer = clamp(diff * 2.4, -1, 1); thr = 1;
        if (Math.abs(diff) > 1.25 && sp > 260) hb = true;
      }

      // ---- physics ----
      const fx = Math.cos(car.th), fy = Math.sin(car.th), rx = -fy, ry = fx;
      let vf = car.vx * fx + car.vy * fy, vl = car.vx * rx + car.vy * ry;
      vf += thr * 760 * dt;
      if (brk) vf -= (vf > 0 ? 1100 : 380) * dt;
      if (hb) vf *= Math.exp(-0.9 * dt);
      const grip = hb ? 0.8 : 6.2 - Math.min(3.4, sp / 160);
      vl *= Math.exp(-grip * dt);
      vf *= Math.exp(-0.5 * dt);
      vf = clamp(vf, -260, 760);
      car.vx = fx * vf + rx * vl; car.vy = fy * vf + ry * vl;
      car.th += steer * (hb ? 3.6 : 2.9) * dt * Math.min(1, Math.abs(vf) / 170) * Math.sign(vf || 1);
      const px = car.x, py = car.y;
      car.x += car.vx * dt; car.y += car.vy * dt;

      // walls
      const R = 24;
      if (car.x < R || car.x > WW - R) { crash(Math.abs(car.vx)); car.x = clamp(car.x, R, WW - R); car.vx *= -0.45; }
      if (car.y < R || car.y > WH - R) { crash(Math.abs(car.vy)); car.y = clamp(car.y, R, WH - R); car.vy *= -0.45; }
      for (const p of pillars) {
        const pr = p.r + Math.sin(t * 2 + p.ph) * 6;
        const dx = car.x - p.x, dy = car.y - p.y, d = Math.hypot(dx, dy);
        if (d < pr + R) {
          const nx = dx / d, ny = dy / d, vn = car.vx * nx + car.vy * ny;
          if (vn < 0) { crash(-vn); car.vx -= 1.5 * vn * nx; car.vy -= 1.5 * vn * ny; }
          car.x = p.x + nx * (pr + R); car.y = p.y + ny * (pr + R);
        }
      }

      // gate
      const gx0 = gate.x - Math.cos(gate.a) * gate.w / 2, gy0 = gate.y - Math.sin(gate.a) * gate.w / 2;
      const gx1 = gate.x + Math.cos(gate.a) * gate.w / 2, gy1 = gate.y + Math.sin(gate.a) * gate.w / 2;
      if (segHit(px, py, car.x, car.y, gx0, gy0, gx1, gy1)) {
        gates++;
        const drifting = Math.abs(vl) > 140;
        const s = screen(gate.x, gate.y), p = toStage(stage, A.box, s.x, s.y);
        api.hit(drifting ? 1 : 0.8, { x: p.x, y: p.y, silent: !drifting });
        if (drifting) stamp(stage, api.t({ it: 'PORTA IN DRIFT!', en: 'DRIFT GATE!' }), 'great');
        api.hud(api.t({ it: 'Porte', en: 'Gates' }), String(gates));
        // leave a neon ring on the floor
        const g = art.g; g.save(); g.globalAlpha = 0.9; g.strokeStyle = hsl(hue + 180, 1, 0.6); g.lineWidth = 8;
        g.beginPath(); g.arc(gate.x, gate.y, gate.w * 0.55, 0, TAU); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.arc(gate.x, gate.y, gate.w * 0.7, 0, TAU); g.stroke(); g.restore();
        gate = next; next = newGate(gate.x, gate.y);
        vibrate(15);
      }

      // drift scoring
      const drift = Math.abs(vl);
      if (drift > 110 && sp > 180) {
        driftPts += drift * dt * 0.35; driftTime += dt; calmT = 0;
      } else if (driftPts > 0) { calmT += dt; if (calmT > 0.45) { bank(); driftTime = 0; } }

      // skid marks on the floor = the artwork
      const rw = [[-20, -12], [-20, 12]].map(([a, b]) => [car.x + fx * a + rx * b, car.y + fy * a + ry * b]);
      if (wheels) {
        const g = art.g;
        g.lineCap = 'round';
        if (drift > 60) {
          g.globalAlpha = 0.85;
          g.strokeStyle = hsl(hue + drift * 0.15, 1, lightFloor ? 0.5 : 0.6);
          g.lineWidth = clamp(3 + drift / 32, 3, 18);
        } else if (sp > 60) {
          g.globalAlpha = 0.18; g.strokeStyle = lightFloor ? '#0E0E10' : '#F3EFE6'; g.lineWidth = 2;
        } else g.globalAlpha = 0;
        if (g.globalAlpha > 0) for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(wheels[i][0], wheels[i][1]); g.lineTo(rw[i][0], rw[i][1]); g.stroke(); }
        g.globalAlpha = 1;
      }
      wheels = rw;
      if (drift > 140 && Math.random() < 0.7) { const w = rw[Math.floor(Math.random() * 2)]; smoke.push({ x: w[0], y: w[1], r: 8, life: 1, c: hsl(hue + Math.random() * 60, 1, 0.65) }); }
      for (const s of smoke) { s.life -= dt * 1.6; s.r += dt * 50; }
      smoke = smoke.filter((s) => s.life > 0).slice(-80);

      // camera
      const lead = 0.35;
      cam.x += (car.x + car.vx * lead - cam.x) * Math.min(1, dt * 5);
      cam.y += (car.y + car.vy * lead - cam.y) * Math.min(1, dt * 5);
      const hw = A.w / 2 / cam.z, hh = A.h / 2 / cam.z;
      cam.x = hw * 2 >= WW ? WW / 2 : clamp(cam.x, hw, WW - hw);
      cam.y = hh * 2 >= WH ? WH / 2 : clamp(cam.y, hh, WH - hh);
      camShake = Math.max(0, camShake - dt);

      // ---- draw ----
      const g = A.g;
      g.save();
      g.fillStyle = '#000'; g.fillRect(0, 0, A.w, A.h);
      g.translate(A.w / 2 + (Math.random() - 0.5) * camShake * 30, A.h / 2 + (Math.random() - 0.5) * camShake * 30);
      g.scale(cam.z, cam.z);
      g.translate(-cam.x, -cam.y);
      g.drawImage(art.c, 0, 0, WW, WH);
      // acid puddles drifting under the paint
      g.globalCompositeOperation = lightFloor ? 'multiply' : 'screen';
      for (let i = 0; i < 5; i++) {
        const bx = WW * (0.5 + 0.42 * Math.sin(t * 0.13 + i * 1.7)), by = WH * (0.5 + 0.4 * Math.cos(t * 0.11 + i * 2.3)), br = 380 + 120 * Math.sin(t * 0.5 + i);
        const rg = g.createRadialGradient(bx, by, 0, bx, by, br);
        const hh2 = Math.round(hue + i * 72) % 360; rg.addColorStop(0, `hsla(${hh2},100%,${lightFloor ? 80 : 50}%,0.35)`); rg.addColorStop(1, `hsla(${hh2},100%,50%,0)`);
        g.fillStyle = rg; g.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      g.globalCompositeOperation = 'source-over';
      // melting grid
      g.strokeStyle = floor.grid; g.lineWidth = 2 / cam.z;
      g.beginPath();
      for (let x = 0; x <= WW; x += 120) { for (let y = 0; y <= WH; y += 40) { const ox = Math.sin(y * 0.01 + t * 1.3 + x * 0.003) * 14; y ? g.lineTo(x + ox, y) : g.moveTo(x + ox, y); } }
      for (let y = 0; y <= WH; y += 120) { for (let x = 0; x <= WW; x += 40) { const oy = Math.sin(x * 0.01 + t * 1.1 + y * 0.004) * 14 + Math.max(0, Math.sin(x * 0.03 + y)) ** 6 * 30 * (0.5 + 0.5 * Math.sin(t)); x ? g.lineTo(x, y + oy) : g.moveTo(x, y + oy); } }
      g.stroke();
      // hazard border
      g.lineWidth = 16; g.setLineDash([40, 40]); g.lineDashOffset = -t * 120;
      g.strokeStyle = '#FFE629'; g.strokeRect(8, 8, WW - 16, WH - 16);
      g.strokeStyle = '#0E0E10'; g.lineDashOffset = -t * 120 + 40; g.strokeRect(8, 8, WW - 16, WH - 16); g.setLineDash([]);
      // pillars
      for (const p of pillars) drawPillar(g, p, t);
      // next gate faint, current gate loud
      drawGate(g, next, t, 0.25, hue);
      drawGate(g, gate, t, 1, hue);
      // smoke
      g.globalCompositeOperation = lightFloor ? 'multiply' : 'lighter';
      for (const s of smoke) { g.globalAlpha = s.life * 0.35; g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // car (with RGB ghosts when fast)
      if (sp > 420) {
        g.globalCompositeOperation = 'lighter';
        drawCar(g, car.x - car.vx * 0.03, car.y - car.vy * 0.03, car.th, '#FF0033', 0.5, true);
        drawCar(g, car.x - car.vx * 0.06, car.y - car.vy * 0.06, car.th, '#00B3FF', 0.4, true);
        g.globalCompositeOperation = 'source-over';
      }
      drawCar(g, car.x, car.y, car.th, hsl(hue, 1, 0.6), 1, false);
      // live drift counter
      if (driftPts > 5) {
        g.font = `900 ${Math.round(26 / Math.max(0.6, cam.z))}px Archivo, sans-serif`; g.textAlign = 'center';
        g.lineWidth = 6 / cam.z; g.strokeStyle = '#0E0E10'; g.fillStyle = '#C6FF00';
        const txt = `${Math.round(driftPts)}${chain > 0 && t - lastBank < 2.2 ? ` ×${Math.min(5, chain + 1)}` : ''}`;
        g.strokeText(txt, car.x, car.y - 48 / Math.max(0.7, cam.z)); g.fillText(txt, car.x, car.y - 48 / Math.max(0.7, cam.z));
      }
      g.restore();
      // arrow to gate if off screen
      const s = screen(gate.x, gate.y);
      if (s.x < 0 || s.y < 0 || s.x > A.w || s.y > A.h) {
        const a = Math.atan2(s.y - A.h / 2, s.x - A.w / 2);
        const ex = clamp(s.x, 34, A.w - 34), ey = clamp(s.y, 34, A.h - 34);
        g.save(); g.translate(ex, ey); g.rotate(a);
        g.fillStyle = '#C6FF00'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(22, 0); g.lineTo(-12, -16); g.lineTo(-4, 0); g.lineTo(-12, 16); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      inp.frame();
    });

    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};

function drawCar(g, x, y, th, color, alpha, ghost) {
  g.save(); g.translate(x, y); g.rotate(th); g.globalAlpha = alpha;
  if (!ghost) { g.shadowColor = color; g.shadowBlur = 26; }
  g.fillStyle = ghost ? color : '#0E0E10';
  g.beginPath(); g.roundRect(-30, -16, 60, 32, 10); g.fill();
  g.shadowBlur = 0;
  if (!ghost) {
    const grd = g.createLinearGradient(-30, -16, 30, 16);
    grd.addColorStop(0, color); grd.addColorStop(0.5, '#FFFFFF'); grd.addColorStop(1, color);
    g.fillStyle = grd; g.beginPath(); g.roundRect(-27, -13, 54, 26, 8); g.fill();
    g.fillStyle = '#0E0E10'; g.beginPath(); g.roundRect(2, -10, 13, 20, 4); g.fill();
    g.fillStyle = '#C6FF00'; g.fillRect(-33, -17, 6, 34);
    g.fillStyle = '#FFE629'; g.fillRect(26, -12, 5, 6); g.fillRect(26, 6, 5, 6);
    g.strokeStyle = '#0E0E10'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-30, -16, 60, 32, 10); g.stroke();
  }
  g.restore();
}

function drawPillar(g, p, t) {
  const r = p.r + Math.sin(t * 2 + p.ph) * 6;
  g.save(); g.translate(p.x, p.y);
  const grd = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(0.35, '#B8C2FF'); grd.addColorStop(0.7, '#5B00FF'); grd.addColorStop(1, '#0E0E10');
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, rr = r * (1 + Math.sin(a * 3 + t * 3 + p.ph) * 0.07); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
  g.strokeStyle = '#0E0E10'; g.lineWidth = 4; g.stroke();
  // drips
  g.fillStyle = '#5B00FF';
  for (let i = 0; i < 3; i++) { const a = p.ph + i * 2.1, len = 14 + (Math.sin(t * 1.5 + i) * 0.5 + 0.5) * 26; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.8, r * 0.75 + len * 0.5, 5, len * 0.5, 0, 0, TAU); g.fill(); }
  g.restore();
}

function drawGate(g, gate, t, alpha, hue) {
  g.save(); g.translate(gate.x, gate.y); g.rotate(gate.a); g.globalAlpha = alpha;
  const half = gate.w / 2;
  if (alpha > 0.5) {
    g.strokeStyle = hsl(hue + 180, 1, 0.6); g.lineWidth = 4; g.setLineDash([14, 12]); g.lineDashOffset = -t * 60;
    g.beginPath(); g.moveTo(-half, 0); g.lineTo(half, 0); g.stroke(); g.setLineDash([]);
  }
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * half, 0); g.rotate(t * 2 * s);
    g.fillStyle = '#FFE629'; g.strokeStyle = '#0E0E10'; g.lineWidth = 3;
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 9 : 20; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
}
