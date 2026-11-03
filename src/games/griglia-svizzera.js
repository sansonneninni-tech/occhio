// Griglia Svizzera: a typographic rule that moves only at right angles on the grid (Swiss style, pushed to the limit).
import { h } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { stamp, vibrate, shake, sfx } from '../core/fx.js';

const TIME = 90;
const PAPER = '#F4F2EE', INK = '#0D0D0D', RED = '#E3000F', LINE = 'rgba(13,13,13,.08)';
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LOREM = ['ZÜRICH', 'BASEL', 'KONZERT', 'TONHALLE', 'MUSICA VIVA', 'DER FILM', 'AKZIDENZ', 'RASTER', 'SYSTEM', 'NEUE GRAFIK'];

const setStretch = (g, v) => { try { if ('fontStretch' in g) g.fontStretch = v; } catch {} };

export default {
  id: 'griglia-svizzera',
  cat: 'design',
  title: { it: 'Griglia Svizzera', en: 'Swiss Grid' },
  tagline: { it: 'Una linea che gira solo ad angolo retto. Mangia i moduli rossi, non toccarti, disegna un poster svizzero.', en: 'A rule that only turns at right angles. Eat the red modules, never cross yourself, draw a Swiss poster.' },
  how: {
    it: 'La linea avanza da sola sulla griglia: girala con le frecce, con uno swipe o toccando il lato dove vuoi andare.|Ogni modulo rosso la allunga. Prendilo con il percorso più corto: la precisione vale più punti.|Non toccare il bordo, i blocchi di testo neri e te stessa. Il cerchio rosso vale triplo, ma sparisce.',
    en: 'The rule moves on its own on the grid: turn it with the arrows, a swipe, or by tapping the side you want.|Each red module makes it longer. Take the shortest path: precision scores more.|Avoid the edge, the black text blocks and yourself. The red circle is worth triple, but it vanishes.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="${PAPER}"/><text x="-6" y="98" font-family="Archivo" font-weight="900" font-size="120" fill="${INK}">7</text><path d="M20 20 H90 V60 H130 V84" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="square"/><path d="M20 20 H90 V36" stroke="#fff" stroke-width="8" fill="none" style="mix-blend-mode:difference"/><rect x="124" y="12" width="10" height="10" fill="${RED}"/><circle cx="140" cy="60" r="7" fill="${RED}"/><rect x="40" y="68" width="30" height="14" fill="${INK}"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Frecce o WASD per girare', en: 'Arrows or WASD to turn' })));

    const COLS = A.w >= A.h ? 24 : 14;
    const ROWS = Math.max(12, Math.min(30, Math.round(COLS * (A.h / A.w))));
    let t = 0, acc = 0, over = false, eaten = 0, steps = 0, grow = 3, dir = 'right', flash = 0, circle = null;
    const queue = [];
    const sy = Math.floor(ROWS / 2);
    let body = [[3, sy], [2, sy], [1, sy]];
    const history = body.slice().reverse();
    const blocks = [];
    const eatenAt = [];
    let food = null, foodSteps = 0, foodDist = 1;
    api.hud(api.t({ it: 'Moduli', en: 'Modules' }), '0', false);

    const cellSize = () => { const c = Math.floor(Math.min(A.w / COLS, A.h / ROWS)); return { c, ox: Math.floor((A.w - c * COLS) / 2), oy: Math.floor((A.h - c * ROWS) / 2) }; };
    const occupied = (x, y) => body.some(([bx, by]) => bx === x && by === y) || blocks.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
    const freeCell = (minDist = 3) => {
      const [hx, hy] = body[0];
      for (let k = 0; k < 400; k++) {
        const x = 1 + Math.floor(Math.random() * (COLS - 2)), y = 1 + Math.floor(Math.random() * (ROWS - 2));
        if (!occupied(x, y) && Math.abs(x - hx) + Math.abs(y - hy) >= minDist && !(food && food[0] === x && food[1] === y)) return [x, y];
      }
      return null;
    };
    const placeFood = () => {
      food = freeCell(4) || freeCell(1);
      foodSteps = 0;
      foodDist = Math.max(1, Math.abs(food[0] - body[0][0]) + Math.abs(food[1] - body[0][1]));
    };
    const placeBlock = () => {
      const w = 2 + Math.floor(Math.random() * 3), hh = 1 + Math.floor(Math.random() * 2);
      const [hx, hy] = body[0];
      for (let k = 0; k < 200; k++) {
        const x = 1 + Math.floor(Math.random() * (COLS - w - 1)), y = 1 + Math.floor(Math.random() * (ROWS - hh - 1));
        let ok = Math.abs(x - hx) > 4 || Math.abs(y - hy) > 4;
        for (let i = 0; i < w && ok; i++) for (let j = 0; j < hh && ok; j++) if (occupied(x + i, y + j) || (food && food[0] === x + i && food[1] === y + j)) ok = false;
        // keep a clear lane ahead of the head
        const [dx, dy] = DIRS[dir];
        for (let s = 1; s <= 4 && ok; s++) { const ax = hx + dx * s, ay = hy + dy * s; if (ax >= x && ax < x + w && ay >= y && ay < y + hh) ok = false; }
        if (ok) { blocks.push({ x, y, w, h: hh, txt: LOREM[Math.floor(Math.random() * LOREM.length)] }); return; }
      }
    };
    placeFood();

    const turn = (d) => {
      const last = queue.at(-1) || dir;
      const [lx, ly] = DIRS[last], [nx, ny] = DIRS[d];
      if (lx === nx && ly === ny) return;
      if (lx === -nx && ly === -ny) return; // no U-turn into yourself
      if (queue.length < 2) queue.push(d);
    };

    const finish = (survived = false) => {
      if (over === true) return; over = true;
      stopLoop();
      if (survived) api.add(eaten * 20);
      api.end({
        exports: [{ label: api.t({ it: 'Poster svizzero (PNG)', en: 'Swiss poster (PNG)' }), run: poster }],
        summary: api.t({ it: `${eaten} moduli · ${steps} passi · lunghezza ${body.length}`, en: `${eaten} modules · ${steps} steps · length ${body.length}` }),
      });
    };
    api.timer(TIME, () => finish(true));

    const die = (why) => {
      api.hit(0, { silent: true });
      stamp(stage, why, 'bad');
      shake(A.box); vibrate([60, 40, 60]);
      flash = 0.3;
      setTimeout(() => finish(false), 650);
      over = 'dying';
    };

    const step = () => {
      if (queue.length) dir = queue.shift();
      const [dx, dy] = DIRS[dir];
      const nx = body[0][0] + dx, ny = body[0][1] + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return die(api.t({ it: 'FUORI GRIGLIA', en: 'OFF THE GRID' }));
      const tailFree = grow === 0 ? body.at(-1) : null;
      const selfHit = body.some(([bx, by], i) => bx === nx && by === ny && !(tailFree && i === body.length - 1));
      if (selfHit) return die(api.t({ it: 'INCROCIO!', en: 'CROSSED!' }));
      if (blocks.some((b) => nx >= b.x && nx < b.x + b.w && ny >= b.y && ny < b.y + b.h)) return die(api.t({ it: 'BLOCCO!', en: 'BLOCKED!' }));
      body.unshift([nx, ny]);
      history.push([nx, ny]);
      steps++; foodSteps++;
      if (grow > 0) grow--; else body.pop();
      const { c, ox, oy } = cellSize();
      if (food && nx === food[0] && ny === food[1]) {
        eaten++; grow += 3;
        eatenAt.push([nx, ny]);
        const q = Math.max(0.4, Math.min(1, foodDist / foodSteps));
        const p = toStage(stage, A.box, ox + (nx + 0.5) * c, oy + (ny + 0.5) * c);
        api.hit(q, { silent: true, x: p.x, y: p.y });
        if (q >= 0.95) stamp(stage, api.t({ it: 'PRECISO', en: 'PRECISE' }), 'great');
        flash = 0.12;
        api.hud(api.t({ it: 'Moduli', en: 'Modules' }), String(eaten));
        if (eaten % 4 === 0) placeBlock();
        if (eaten % 5 === 0 && !circle) { const cc = freeCell(5); if (cc) circle = { x: cc[0], y: cc[1], life: 6 }; }
        placeFood();
      } else if (circle && nx === circle.x && ny === circle.y) {
        grow += 1; eatenAt.push([nx, ny]);
        const p = toStage(stage, A.box, ox + (nx + 0.5) * c, oy + (ny + 0.5) * c);
        api.add(300, { x: p.x, y: p.y, color: RED }); sfx.great(); vibrate(20);
        stamp(stage, '×3', 'great'); circle = null; flash = 0.2;
      } else sfx.tick();
    };

    // swipe and tap steering
    let sw = null;
    const down = (e) => { sw = { x: e.clientX, y: e.clientY, done: false }; };
    const move = (e) => {
      if (!sw || sw.done) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (Math.hypot(dx, dy) < 22) return;
      sw.done = true;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const up = (e) => {
      if (sw && !sw.done) {
        // tap: turn toward the tapped side of the head
        const { c, ox, oy } = cellSize();
        const r = A.canvas.getBoundingClientRect();
        const hx = ox + (body[0][0] + 0.5) * c, hy = oy + (body[0][1] + 0.5) * c;
        const dx = e.clientX - r.left - hx, dy = e.clientY - r.top - hy;
        const [cx] = DIRS[queue.at(-1) || dir];
        if (cx !== 0) turn(dy > 0 ? 'down' : 'up'); else turn(dx > 0 ? 'right' : 'left');
      }
      sw = null;
    };
    A.canvas.addEventListener('pointerdown', down);
    A.canvas.addEventListener('pointermove', move);
    A.canvas.addEventListener('pointerup', up);

    const poster = () => {
      const PW = 1200, PH = 1700;
      const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
      const g = cv.getContext('2d');
      g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
      const cs = Math.min((PW - 120) / COLS, (PH - 520) / ROWS);
      const gx = (PW - cs * COLS) / 2, gy = 120;
      // giant numeral
      g.save(); setStretch(g, 'ultra-condensed'); g.fillStyle = INK; g.font = `900 ${PH * 0.62}px Archivo, sans-serif`; g.textBaseline = 'alphabetic';
      g.fillText(String(eaten), 30, PH * 0.66); g.restore();
      g.strokeStyle = LINE; g.lineWidth = 1;
      for (let i = 0; i <= COLS; i++) { g.beginPath(); g.moveTo(gx + i * cs, gy); g.lineTo(gx + i * cs, gy + ROWS * cs); g.stroke(); }
      for (let j = 0; j <= ROWS; j++) { g.beginPath(); g.moveTo(gx, gy + j * cs); g.lineTo(gx + COLS * cs, gy + j * cs); g.stroke(); }
      blocks.forEach((b) => { g.fillStyle = INK; g.fillRect(gx + b.x * cs, gy + b.y * cs, b.w * cs, b.h * cs); });
      // the whole path, inverted over the numeral
      g.save(); g.globalCompositeOperation = 'difference'; g.strokeStyle = '#ffffff'; g.lineWidth = cs * 0.55; g.lineCap = 'square'; g.lineJoin = 'miter';
      g.beginPath(); history.forEach(([x, y], i) => { const px = gx + (x + 0.5) * cs, py = gy + (y + 0.5) * cs; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); g.restore();
      eatenAt.forEach(([x, y]) => { g.fillStyle = RED; g.fillRect(gx + x * cs + cs * 0.2, gy + y * cs + cs * 0.2, cs * 0.6, cs * 0.6); });
      g.fillStyle = RED; g.beginPath(); g.arc(PW - 170, PH - 330, 110, 0, TAU); g.fill();
      // flush-left text block
      g.fillStyle = INK; g.font = '900 64px Archivo, sans-serif'; g.fillText('Griglia Svizzera', 60, PH - 260);
      g.font = '500 30px Archivo, sans-serif';
      [`${store.name || 'Occhio'}`, `${eaten} Moduli, ${steps} Schritte`, `Länge ${body.length}`, new Date().toLocaleDateString('de-CH')].forEach((l, i) => g.fillText(l, 60, PH - 200 + i * 40));
      g.fillRect(60, PH - 345, PW - 120, 6);
      cv.toBlob((b) => download(`occhio-griglia-${eaten}.png`, b), 'image/png');
    };

    const stopLoop = loop((dt) => {
      if (over === true) return;
      t += dt; flash -= dt;
      for (const k of inp.pressed) {
        const m = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }[k];
        if (m) turn(m);
      }
      if (over !== 'dying') {
        const interval = Math.max(0.065, 0.15 - eaten * 0.0035 - t * 0.0004);
        acc += dt;
        while (acc >= interval && !over) { acc -= interval; step(); }
        if (circle) { circle.life -= dt; if (circle.life <= 0) circle = null; }
      }

      // ---------- draw ----------
      const g = A.g;
      const { c, ox, oy } = cellSize();
      g.fillStyle = PAPER; g.fillRect(0, 0, A.w, A.h);
      // giant numeral: changes width and orientation every 5 modules
      g.save();
      const phase = Math.floor(eaten / 5) % 3;
      setStretch(g, ['ultra-condensed', 'normal', 'ultra-expanded'][phase]);
      g.fillStyle = INK; g.textBaseline = 'alphabetic';
      if (phase === 1) { g.translate(A.w, 0); g.rotate(Math.PI / 2); g.font = `900 ${A.w * 1.05}px Archivo, sans-serif`; g.fillText(String(eaten), -A.w * 0.05, A.w * 0.82); }
      else { g.font = `900 ${A.h * 1.02}px Archivo, sans-serif`; g.fillText(String(eaten), -A.h * 0.04, A.h * 0.86); }
      g.restore();
      // grid
      g.strokeStyle = 'rgba(128,128,128,.25)'; g.lineWidth = 1;
      for (let i = 0; i <= COLS; i++) { g.beginPath(); g.moveTo(ox + i * c + 0.5, oy); g.lineTo(ox + i * c + 0.5, oy + ROWS * c); g.stroke(); }
      for (let j = 0; j <= ROWS; j++) { g.beginPath(); g.moveTo(ox, oy + j * c + 0.5); g.lineTo(ox + COLS * c, oy + j * c + 0.5); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(ox, oy, COLS * c, ROWS * c);
      // text blocks
      for (const b of blocks) {
        g.fillStyle = INK; g.fillRect(ox + b.x * c, oy + b.y * c, b.w * c, b.h * c);
        g.fillStyle = PAPER; g.font = `700 ${Math.max(8, c * 0.32)}px "JetBrains Mono", monospace`; g.textBaseline = 'top';
        g.fillText(b.txt, ox + b.x * c + 4, oy + b.y * c + 4, b.w * c - 8);
      }
      // the rule: inverted over the numeral
      g.save(); g.globalCompositeOperation = 'difference';
      g.strokeStyle = '#ffffff'; g.lineWidth = c * 0.62; g.lineCap = 'square'; g.lineJoin = 'miter';
      g.beginPath(); body.forEach(([x, y], i) => { const px = ox + (x + 0.5) * c, py = oy + (y + 0.5) * c; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
      g.restore();
      // head
      const [hx, hy] = body[0];
      g.fillStyle = RED; g.fillRect(ox + hx * c + c * 0.3, oy + hy * c + c * 0.3, c * 0.4, c * 0.4);
      // food and bonus circle
      if (food) {
        const pulse = 1 + Math.sin(t * 10) * 0.08;
        g.fillStyle = RED; const s = c * 0.8 * pulse;
        g.fillRect(ox + (food[0] + 0.5) * c - s / 2, oy + (food[1] + 0.5) * c - s / 2, s, s);
      }
      if (circle) {
        g.fillStyle = RED; g.globalAlpha = circle.life < 2 && Math.floor(t * 8) % 2 ? 0.3 : 1;
        g.beginPath(); g.arc(ox + (circle.x + 0.5) * c, oy + (circle.y + 0.5) * c, c * 0.48, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      // vertical caption
      g.save(); g.translate(ox + COLS * c - 6, oy + ROWS * c - 8); g.rotate(-Math.PI / 2);
      g.fillStyle = RED; g.font = '700 11px "JetBrains Mono", monospace'; g.textBaseline = 'bottom';
      g.fillText(`${(store.name || 'OCCHIO').toUpperCase()} · RASTER ${COLS}×${ROWS}`, 0, 0); g.restore();
      if (flash > 0) { g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.globalAlpha = Math.min(1, flash * 5); g.fillRect(0, 0, A.w, A.h); g.restore(); }
      inp.frame();
    });
    api.onCleanup(() => {
      stopLoop(); inp.destroy(); A.destroy();
      A.canvas.removeEventListener('pointerdown', down);
      A.canvas.removeEventListener('pointermove', move);
      A.canvas.removeEventListener('pointerup', up);
    });
  },
};
