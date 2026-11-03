// Balletto Triadico: Bauhaus stage (Oskar Schlemmer, 1922). Catch triangles, squares and circles with the right side of the costume.
import { h } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { stamp, vibrate, shake } from '../core/fx.js';

const TIME = 70;
const YEL = '#F2C230', RED = '#E03A28', BLUE = '#1F4FBF', INK = '#111014', CREAM = '#F1ECE0';
// Kandinsky's Bauhaus questionnaire: yellow triangle, red square, blue circle.
const FORMS = [{ col: YEL, note: 659.25 }, { col: RED, note: 523.25 }, { col: BLUE, note: 783.99 }];
const SECT = TAU / 3;
const norm = (a) => ((a % TAU) + TAU) % TAU;

function form(g, k, s, col = FORMS[k].col) {
  g.fillStyle = col;
  g.beginPath();
  if (k === 0) { g.moveTo(0, -s); g.lineTo(s * 0.9, s * 0.65); g.lineTo(-s * 0.9, s * 0.65); g.closePath(); }
  else if (k === 1) g.rect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
  else g.arc(0, 0, s * 0.8, 0, TAU);
  g.fill();
}

let actx = null;
function note(f, when = 0, dur = 0.35) {
  if (store.muted) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + when;
    const o = actx.createOscillator(), gn = actx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(0.14, t0 + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch {}
}

// The dancer: Schlemmer's geometric figure with a spiral skirt.
function dancer(g, R, spin, t) {
  g.save();
  // skirt: a stack of discs seen in perspective, spinning
  for (let i = 0; i < 5; i++) {
    const y = R * (0.05 + i * 0.13), rx = R * (0.55 - i * 0.04), ry = rx * 0.28;
    g.fillStyle = [YEL, CREAM, RED, CREAM, BLUE][i];
    g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, y, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
    // spiral stripe
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(0, y, rx * 0.7, ry * 0.7, 0, spin * (i % 2 ? 1 : -1), spin * (i % 2 ? 1 : -1) + 1.6); g.stroke();
  }
  // legs
  g.fillStyle = INK; g.fillRect(-R * 0.12, R * 0.62, R * 0.07, R * 0.22); g.fillRect(R * 0.05, R * 0.62, R * 0.07, R * 0.22);
  // torso: a cone
  g.fillStyle = INK; g.beginPath(); g.moveTo(-R * 0.22, 0); g.lineTo(R * 0.22, 0); g.lineTo(R * 0.12, -R * 0.42); g.lineTo(-R * 0.12, -R * 0.42); g.closePath(); g.fill();
  // arms: rods with balls, swinging
  const sw = Math.sin(t * 3) * 0.4;
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * R * 0.14, -R * 0.36); g.rotate(s * (1.1 + sw));
    g.fillStyle = INK; g.fillRect(-2, 0, 4, R * 0.42);
    g.fillStyle = s < 0 ? RED : BLUE; g.beginPath(); g.arc(0, R * 0.45, R * 0.07, 0, TAU); g.fill();
    g.restore();
  }
  // head: mask with a single slit
  g.fillStyle = CREAM; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.arc(0, -R * 0.56, R * 0.15, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = INK; g.fillRect(-R * 0.1, -R * 0.58, R * 0.2, R * 0.035);
  g.fillStyle = YEL; g.beginPath(); g.moveTo(0, -R * 0.9); g.lineTo(R * 0.08, -R * 0.72); g.lineTo(-R * 0.08, -R * 0.72); g.closePath(); g.fill();
  g.restore();
}

export default {
  id: 'balletto-triadico',
  cat: 'arte',
  title: { it: 'Balletto Triadico', en: 'Triadic Ballet' },
  tagline: { it: 'Sei il danzatore del Bauhaus. Prendi triangoli, quadrati e cerchi col lato giusto del costume.', en: 'You are the Bauhaus dancer. Catch triangles, squares and circles with the right side of your costume.' },
  how: {
    it: 'Il costume ha tre spicchi: giallo per i triangoli, rosso per i quadrati, blu per i cerchi.|Giralo trascinando attorno al danzatore, o tocca a destra e a sinistra (frecce o A/D) per scattare di un terzo.|Prendi la forma col colore giusto, meglio se al centro dello spicchio. Col colore sbagliato perdi una maschera.',
    en: 'The costume has three wedges: yellow for triangles, red for squares, blue for circles.|Turn it by dragging around the dancer, or tap right and left (arrows or A/D) to snap a third.|Catch each form with the right color, best at the center of the wedge. The wrong color costs a mask.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="${INK}"/><path d="M80 0 L20 100 H140Z" fill="#fff" opacity=".08"/><g transform="translate(80 54)"><path d="M0 -30 A30 30 0 0 1 26 15" stroke="${YEL}" stroke-width="7" fill="none"/><path d="M26 15 A30 30 0 0 1 -26 15" stroke="${RED}" stroke-width="7" fill="none"/><path d="M-26 15 A30 30 0 0 1 0 -30" stroke="${BLUE}" stroke-width="7" fill="none"/><ellipse cx="0" cy="6" rx="13" ry="4" fill="${YEL}"/><ellipse cx="0" cy="11" rx="11" ry="3.5" fill="${RED}"/><circle cx="0" cy="-12" r="5" fill="${CREAM}"/></g><path d="M20 20 l8 14 h-16z" fill="${YEL}"/><rect x="128" y="18" width="14" height="14" fill="${RED}"/><circle cx="136" cy="84" r="7" fill="${BLUE}"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Trascina attorno al danzatore · frecce o A/D per scattare', en: 'Drag around the dancer · arrows or A/D to snap' })));

    let t = 0, rot = 0, rotTarget = 0, spawnT = 1, lives = 3, over = false, caught = 0, perfect = 0, spin = 0;
    let drag = null;
    const shapes = [], costume = [], flashes = [];
    api.hud(api.t({ it: 'Maschere', en: 'Masks' }), '◐◐◐', false);

    const geo = () => {
      const m = Math.min(A.w, A.h);
      return { cx: A.w / 2, cy: A.h / 2 + m * 0.03, R: m * 0.2, far: Math.hypot(A.w, A.h) / 2 + 40 };
    };
    // which form the costume shows toward angle a
    const facing = (a) => Math.floor(norm(a - rot + SECT / 2) / SECT) % 3;
    const offCenter = (a) => { const x = norm(a - rot + SECT / 2) % SECT; return Math.abs(x - SECT / 2) / (SECT / 2); };

    const spawn = () => {
      const lvl = Math.min(1, t / TIME);
      const { far } = geo();
      const make = (a) => shapes.push({ a, r: far, k: Math.floor(Math.random() * 3), v: (140 + lvl * 230) * (0.85 + Math.random() * 0.3), spin: (Math.random() - 0.5) * 4, ang: 0, morph: lvl > 0.45 && Math.random() < 0.25 ? 1 : 0 });
      const a = Math.random() * TAU;
      make(a);
      if (lvl > 0.3 && Math.random() < 0.3 + lvl * 0.3) make(a + Math.PI + (Math.random() - 0.5) * 0.6);
      spawnT = Math.max(0.5, 1.45 - lvl * 0.95) * (0.75 + Math.random() * 0.5);
    };

    const finish = () => {
      if (over) return; over = true;
      stopLoop();
      api.end({
        exports: [{ label: api.t({ it: 'Figurino del costume (PNG)', en: 'Costume plate (PNG)' }), run: poster }],
        summary: api.t({ it: `${caught} forme prese · ${perfect} al centro`, en: `${caught} forms caught · ${perfect} dead center` }),
      });
    };
    api.timer(TIME, finish);

    const poster = () => {
      const PW = 1200, PH = 1600;
      const c = document.createElement('canvas'); c.width = PW; c.height = PH;
      const g = c.getContext('2d');
      g.fillStyle = CREAM; g.fillRect(0, 0, PW, PH);
      // Bauhaus grid of the plate
      g.strokeStyle = 'rgba(17,16,20,.12)'; g.lineWidth = 1;
      for (let x = 60; x < PW; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, PH); g.stroke(); }
      g.fillStyle = INK; g.fillRect(0, 0, 60, PH);
      g.fillStyle = RED; g.fillRect(60, 0, 300, 40);
      g.fillStyle = BLUE; g.beginPath(); g.arc(PW - 180, 230, 120, 0, TAU); g.fill();
      g.fillStyle = YEL; g.beginPath(); g.moveTo(PW - 120, PH - 420); g.lineTo(PW - 20, PH - 220); g.lineTo(PW - 220, PH - 220); g.closePath(); g.fill();
      // the costume: every caught form, in a spiral around the dancer
      const cx = PW * 0.5, cy = PH * 0.54, R = 330;
      costume.forEach((p, i) => {
        const rr = R * 0.75 + i * 4.2;
        g.save(); g.translate(cx + Math.cos(p.a + i * 0.12) * rr, cy + Math.sin(p.a + i * 0.12) * rr * 0.85); g.rotate(p.ang);
        form(g, p.k, 16 + (p.perfect ? 10 : 0));
        g.restore();
      });
      g.save(); g.translate(cx, cy); dancer(g, R * 1.2, 0.8, 0.4); g.restore();
      // ring
      FORMS.forEach((f, k) => { g.strokeStyle = f.col; g.lineWidth = 26; g.beginPath(); g.arc(cx, cy, R * 0.82, -Math.PI / 2 + k * SECT - SECT / 2, -Math.PI / 2 + k * SECT + SECT / 2); g.stroke(); });
      g.save(); g.translate(40, PH - 80); g.rotate(-Math.PI / 2);
      g.fillStyle = CREAM; g.font = '900 44px Archivo, sans-serif'; g.fillText('das triadische ballett', 0, 0); g.restore();
      g.fillStyle = INK; g.font = '900 120px Archivo, sans-serif'; g.fillText(String(caught), 100, 170);
      g.font = '800 30px Archivo, sans-serif'; g.fillText('forme · figurino', 104, 210);
      g.font = '700 24px "JetBrains Mono", monospace';
      g.fillText(`${(store.name || 'occhio').toLowerCase()} · ${perfect} al centro · bauhaus ${new Date().getFullYear()}`, 100, PH - 60);
      c.toBlob((b) => download(`occhio-balletto-${caught}.png`, b), 'image/png');
    };

    const snap = (dir) => { rotTarget += dir * SECT; };

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt; spin += dt * (2 + caught * 0.03);
      const { cx, cy, R } = geo();
      // input: drag turns the costume like a knob, a quick tap snaps a third
      const pa = Math.atan2(inp.y - cy, inp.x - cx);
      if (inp.justDown) drag = { a: pa, rot: rotTarget, t: t, x: inp.x, y: inp.y, moved: 0 };
      if (drag && inp.down) {
        let da = pa - drag.a; da = Math.atan2(Math.sin(da), Math.cos(da));
        drag.moved = Math.max(drag.moved, Math.hypot(inp.x - drag.x, inp.y - drag.y));
        if (drag.moved > 12) { rotTarget = drag.rot + da; }
      }
      if (inp.justUp && drag) {
        if (drag.moved <= 12 && t - drag.t < 0.35) snap(inp.x < cx ? -1 : 1);
        drag = null;
      }
      if (inp.pressed.has('ArrowLeft') || inp.pressed.has('a') || inp.pressed.has('A')) snap(-1);
      if (inp.pressed.has('ArrowRight') || inp.pressed.has('d') || inp.pressed.has('D')) snap(1);
      rot += (rotTarget - rot) * Math.min(1, dt * 18);

      spawnT -= dt;
      if (spawnT <= 0) spawn();
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        s.r -= s.v * dt; s.ang += s.spin * dt;
        // morphing forms change shape while they fly
        if (s.morph && s.r < R * 2.6 && s.morph === 1) { s.k = (s.k + 1) % 3; s.morph = 2; }
        if (s.r <= R + 14) {
          shapes.splice(i, 1);
          const k = facing(s.a);
          const x = cx + Math.cos(s.a) * (R + 14), y = cy + Math.sin(s.a) * (R + 14);
          const p = toStage(stage, A.box, x, y);
          if (k === s.k) {
            caught++;
            const off = offCenter(s.a);
            const isPerfect = off < 0.35;
            if (isPerfect) perfect++;
            costume.push({ a: s.a - rot, k: s.k, ang: s.ang, perfect: isPerfect });
            api.hit(isPerfect ? 1 : 0.84, { silent: true, x: p.x, y: p.y });
            note(FORMS[s.k].note * (api.combo >= 8 ? 2 : 1));
            if (api.combo >= 3) note(FORMS[(s.k + 1) % 3].note, 0.06, 0.25);
            if (api.combo > 0 && api.combo % 6 === 0) stamp(stage, api.t({ it: 'TRIADE!', en: 'TRIAD!' }), 'great');
            flashes.push({ x, y, col: FORMS[s.k].col, life: 0.5, k: s.k });
            vibrate(10);
          } else {
            lives--;
            api.hit(0, { silent: true });
            api.hud(api.t({ it: 'Maschere', en: 'Masks' }), '◐'.repeat(Math.max(0, lives)) || '–');
            stamp(stage, api.t({ it: 'STONATO!', en: 'OUT OF STEP!' }), 'bad');
            flashes.push({ x, y, col: '#ffffff', life: 0.5, k: s.k, bad: true });
            shake(A.box); vibrate([40, 30, 40]);
            if (lives <= 0) { finish(); return; }
          }
        }
      }
      for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt; if (flashes[i].life <= 0) flashes.splice(i, 1); }

      // ---------- draw ----------
      const g = A.g;
      g.fillStyle = INK; g.fillRect(0, 0, A.w, A.h);
      // stage geometry: floor diagonals and circle
      g.strokeStyle = 'rgba(241,236,224,.16)'; g.lineWidth = 1;
      const fy = cy + R * 0.9;
      for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(cx + i * 30, fy); g.lineTo(cx + i * 200, A.h); g.stroke(); }
      for (let i = 0; i < 6; i++) { const y = fy + (A.h - fy) * (i / 6) ** 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(A.w, y); g.stroke(); }
      g.beginPath(); g.ellipse(cx, fy + 10, R * 1.6, R * 0.35, 0, 0, TAU); g.stroke();
      // spotlight
      g.fillStyle = 'rgba(255,255,240,.07)'; g.beginPath(); g.moveTo(cx - 30, 0); g.lineTo(cx + 30, 0); g.lineTo(cx + R * 1.7, fy + 20); g.lineTo(cx - R * 1.7, fy + 20); g.closePath(); g.fill();
      // telegraph lines of incoming forms
      for (const s of shapes) {
        g.strokeStyle = FORMS[s.k].col; g.globalAlpha = 0.18; g.setLineDash([4, 8]); g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx + Math.cos(s.a) * (R + 16), cy + Math.sin(s.a) * (R + 16)); g.lineTo(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r); g.stroke();
      }
      g.setLineDash([]); g.globalAlpha = 1;
      // costume ornaments orbit with the ring
      costume.slice(-70).forEach((p, i, arr) => {
        const rr = R * 0.35 + ((arr.length - i) % 7) * R * 0.05;
        g.save(); g.translate(cx + Math.cos(p.a + rot + spin * 0.15) * rr, cy + Math.sin(p.a + rot + spin * 0.15) * rr * 0.6 + R * 0.25); g.rotate(p.ang + spin);
        g.globalAlpha = 0.85; form(g, p.k, R * 0.06); g.restore();
      });
      g.globalAlpha = 1;
      g.save(); g.translate(cx, cy); dancer(g, R, spin, t); g.restore();
      // the ring: three wedges of the costume
      const lw = Math.max(14, R * 0.16);
      FORMS.forEach((f, k) => {
        const a0 = rot + k * SECT - SECT / 2;
        g.strokeStyle = f.col; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, R, a0 + 0.03, a0 + SECT - 0.03); g.stroke();
        // the form icon on its wedge
        g.save(); g.translate(cx + Math.cos(rot + k * SECT) * (R + lw * 1.3), cy + Math.sin(rot + k * SECT) * (R + lw * 1.3)); g.rotate(rot + k * SECT + Math.PI / 2);
        form(g, k, lw * 0.45, 'rgba(241,236,224,.8)'); g.restore();
      });
      // incoming forms
      for (const s of shapes) {
        g.save(); g.translate(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r); g.rotate(s.ang);
        const sz = Math.max(16, R * 0.17);
        if (s.morph === 1) { g.strokeStyle = CREAM; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, sz * 1.25, 0, TAU); g.stroke(); }
        form(g, s.k, sz);
        g.restore();
      }
      for (const f of flashes) {
        g.save(); g.translate(f.x, f.y); g.globalAlpha = f.life * 2; g.scale(1 + (0.5 - f.life) * 4, 1 + (0.5 - f.life) * 4);
        if (f.bad) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, 12); g.moveTo(12, -12); g.lineTo(-12, 12); g.stroke(); }
        else form(g, f.k, R * 0.12, f.col);
        g.restore();
      }
      g.globalAlpha = 1;
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
