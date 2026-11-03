import { h } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { stamp, vibrate, shake, sfx } from '../core/fx.js';

const COLS = ['#E63B2E', '#F2C230', '#1F4FBF', '#0E0E10', '#F3EFE6'];
const BH = 34;

function deco(g, b, x, y) {
  const { w, kind, col } = b;
  g.fillStyle = col; g.strokeStyle = '#0E0E10'; g.lineWidth = 2.5;
  g.fillRect(x, y, w, BH); g.strokeRect(x, y, w, BH);
  const ink = col === '#0E0E10' ? '#F3EFE6' : '#0E0E10';
  g.fillStyle = ink;
  if (kind === 1 && w > 40) { g.beginPath(); g.arc(x + w / 2, y + BH / 2, BH * 0.32, 0, TAU); g.fill(); }
  else if (kind === 2 && w > 30) { for (let sx = x + 8; sx < x + w - 6; sx += 14) g.fillRect(sx, y + 6, 5, BH - 12); }
  else if (kind === 3 && w > 50) { g.beginPath(); g.moveTo(x + w * 0.2, y + BH); g.arc(x + w * 0.2 + BH * 0.5, y + BH, BH * 0.5, Math.PI, 0); g.fill(); }
  else if (kind === 4 && w > 40) { g.beginPath(); g.moveTo(x + w - 4, y + 4); g.lineTo(x + w - 4, y + BH - 4); g.lineTo(x + w - 4 - BH * 0.8, y + BH - 4); g.closePath(); g.fill(); }
}

export default {
  id: 'torre-bauhaus',
  cat: 'design',
  title: { it: 'Torre Bauhaus', en: 'Bauhaus Tower' },
  tagline: { it: 'Impila blocchi geometrici. Quello che sporge cade. La torre diventa un manifesto.', en: 'Stack geometric blocks. Overhangs fall. The tower becomes a poster.' },
  how: {
    it: 'Il blocco scorre avanti e indietro: tocca (o spazio) per farlo cadere.|La parte che sporge viene tagliata via: il blocco dopo sarà più stretto.|Allineamento perfetto = il blocco ricresce. Quanto in alto arrivi?',
    en: 'The block slides back and forth: tap (or space) to drop it.|The overhang is cut off: the next block is narrower.|Perfect alignment = the block grows back. How high can you go?',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#2D3BFF"/><g stroke="#0E0E10" stroke-width="2.5"><rect x="40" y="80" width="80" height="14" fill="#E63B2E"/><rect x="44" y="66" width="72" height="14" fill="#F2C230"/><rect x="50" y="52" width="62" height="14" fill="#F3EFE6"/><rect x="54" y="38" width="54" height="14" fill="#0E0E10"/><rect x="62" y="24" width="40" height="14" fill="#E63B2E"/><rect x="90" y="8" width="40" height="14" fill="#F2C230"/></g><circle cx="81" cy="45" r="4" fill="#F3EFE6"/></svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Clic, tocco o spazio per far cadere il blocco', en: 'Click, tap or space to drop' })));
    const WORLD_W = 400;
    const tower = [{ x: 70, w: 260, col: COLS[3], kind: 0 }];
    let mover = null, dir = 1, cam = 0, debris = [], over = false, perfect = 0, t = 0;
    const newMover = () => {
      const top = tower.at(-1);
      const n = tower.length;
      mover = { x: dir > 0 ? -top.w : WORLD_W, w: top.w, col: COLS[n % 4 === 3 ? 4 : n % 4], kind: n % 5, speed: 150 + n * 9 };
    };
    newMover();
    api.hud(api.t({ it: 'Piani', en: 'Floors' }), '0', false);

    const finish = () => {
      if (over) return; over = true;
      setTimeout(() => { stopLoop(); end(); }, 1100);
    };
    const end = () => {
      const floors = tower.length - 1;
      const poster = () => {
        const PW = 900, PH = 1270;
        const c = document.createElement('canvas'); c.width = PW; c.height = PH;
        const g = c.getContext('2d');
        g.fillStyle = '#F3EFE6'; g.fillRect(0, 0, PW, PH);
        const th = tower.length * BH;
        const sc = Math.min(1.8, (PH - 380) / th, (PW - 120) / WORLD_W);
        g.save(); g.translate((PW - WORLD_W * sc) / 2, PH - 80); g.scale(sc, sc);
        tower.forEach((b, i) => deco(g, b, b.x, -(i + 1) * BH));
        g.restore();
        g.fillStyle = '#E63B2E'; g.beginPath(); g.arc(PW - 150, 170, 90, 0, TAU); g.fill();
        g.fillStyle = '#0E0E10'; g.font = '900 120px Archivo'; g.fillText(String(floors), 60, 200);
        g.font = '800 40px Archivo'; g.fillText(api.t({ it: 'PIANI', en: 'FLOORS' }), 64, 250);
        g.save(); g.translate(PW - 40, PH - 100); g.rotate(-Math.PI / 2); g.font = '700 22px "JetBrains Mono"'; g.fillText(`${(store.name || 'OCCHIO').toUpperCase()} · TORRE BAUHAUS · ${new Date().getFullYear()}`, 0, 0); g.restore();
        g.fillRect(60, PH - 60, PW - 120, 8);
        c.toBlob((b) => download(`occhio-torre-${floors}.png`, b), 'image/png');
      };
      api.end({ exports: [{ label: api.t({ it: 'Manifesto della torre (PNG)', en: 'Tower poster (PNG)' }), run: poster }] });
    };

    const drop = () => {
      const top = tower.at(-1);
      const L = Math.max(mover.x, top.x), R = Math.min(mover.x + mover.w, top.x + top.w);
      const ov = R - L;
      const p = toStage(stage, A.box, A.w / 2, A.h * 0.3);
      if (ov <= 0) {
        debris.push({ ...mover, y: tower.length * BH, vy: 0, vr: (Math.random() - 0.5) * 3, r: 0 });
        mover = null; api.hit(0, { silent: true }); shake(A.box);
        stamp(stage, api.t({ it: 'CROLLO!', en: 'COLLAPSE!' }), 'bad');
        finish();
        return;
      }
      const off = Math.abs(mover.x - top.x);
      let nb;
      if (off < 4) {
        perfect++;
        nb = { x: top.x - (perfect > 2 ? 4 : 0), w: Math.min(260, top.w + (perfect > 2 ? 8 : 0)), col: mover.col, kind: mover.kind };
        stamp(stage, perfect > 2 ? `PERFETTO ×${perfect}` : api.t('perfect'), 'great');
        vibrate(20);
      } else {
        perfect = 0;
        nb = { x: L, w: ov, col: mover.col, kind: mover.kind };
        // falling chunk
        const cut = mover.x < top.x ? { x: mover.x, w: top.x - mover.x } : { x: R, w: mover.x + mover.w - R };
        debris.push({ ...cut, col: mover.col, kind: 0, y: tower.length * BH, vy: 0, vr: (mover.x < top.x ? -1 : 1) * 2, r: 0 });
        sfx.tap();
      }
      tower.push(nb);
      api.hit(Math.min(1, ov / top.w + (off < 4 ? 0.05 : 0)), { x: p.x, y: p.y, silent: true, quiet: off >= 4 });
      api.hud(api.t({ it: 'Piani', en: 'Floors' }), String(tower.length - 1));
      dir *= -1;
      newMover();
    };

    const stopLoop = loop((dt) => {
      t += dt;
      if (!over && mover) {
        mover.x += dir * mover.speed * dt;
        if (mover.x > WORLD_W - mover.w * 0.2 && dir > 0) dir = -1;
        if (mover.x < -mover.w * 0.8 && dir < 0) dir = 1;
        if (inp.justDown || inp.pressed.has(' ') || inp.pressed.has('Enter')) drop();
      }
      for (const d of debris) { d.vy += 900 * dt; d.y -= d.vy * dt; d.r += d.vr * dt; }
      debris = debris.filter((d) => d.y > -2000);
      // draw
      const g = A.g;
      const sc = Math.min(A.w / (WORLD_W + 60), 1.6);
      const topY = tower.length * BH;
      cam += (Math.max(0, topY - (A.h / sc) * 0.55) - cam) * Math.min(1, dt * 5);
      g.fillStyle = '#F3EFE6'; g.fillRect(0, 0, A.w, A.h);
      // background bauhaus sun moves with height
      g.fillStyle = '#F2C230'; g.globalAlpha = 0.35; g.beginPath(); g.arc(A.w * 0.8, A.h * 0.25 + cam * 0.1 * sc, Math.min(A.w, A.h) * 0.2, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.save();
      g.translate((A.w - WORLD_W * sc) / 2, A.h - 20 + cam * sc);
      g.scale(sc, sc);
      g.fillStyle = '#0E0E10'; g.fillRect(-400, 0, WORLD_W + 800, 400);
      tower.forEach((b, i) => deco(g, b, b.x, -(i + 1) * BH));
      if (mover && !over) deco(g, mover, mover.x, -(tower.length + 1) * BH);
      for (const d of debris) { g.save(); g.translate(d.x + d.w / 2, -d.y - BH / 2); g.rotate(d.r); deco(g, d, -d.w / 2, -BH / 2); g.restore(); }
      g.restore();
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
