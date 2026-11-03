// Karawane: a Dada sound poem (Hugo Ball, 1916) built syllable by syllable, typeset like a riot.
import { h } from '../core/dom.js';
import { stageCanvas, loop, input, arcadeLayout, toStage, TAU } from '../core/arcade.js';
import { download } from '../core/export.js';
import { useFonts } from '../core/fonts.js';
import { store } from '../core/store.js';
import { stamp, vibrate, shake, sfx } from '../core/fx.js';

const TIME = 75;
const PAGE_W = 900, PAGE_H = 1200;
const PAPER = '#ECE3CF', INK = '#141210', RED = '#D3271D', BLUE = '#2343A8';
const WORDS = [
  'jo-li-fan-to', 'bam-bla', 'fal-li', 'gros-si-ga', 'ha-bla', 'ho-rem', 'é-gi-ga', 'go-ra-men', 'hi-go', 'bloi-ko',
  'rus-su-la', 'hu-ju', 'hol-la-ka', 'hol-la-la', 'an-lo-go', 'bla-go-bung', 'bos-so', 'fa-ta-ka', 'scham-pa', 'wul-la',
  'wus-sa', 'ó-lo-bo', 'tat-ta', 'gô-rem', 'e-schi-ge', 'zun-ba-da', 'wu-lu-bu', 'ssu-bu-du', 'tum-ba', 'ku-sa-gau-ma',
].map((w) => w.split('-'));
const FONTS = ['"Abril Fatface"', 'Bungee', '"UnifrakturMaguntia"', '"Special Elite"', '"Rubik Mono One"', '"IM Fell English"', 'Archivo', '"JetBrains Mono"'];
const EXTRA = ['Abril Fatface', 'Bungee', 'UnifrakturMaguntia', 'Special Elite', 'Rubik Mono One'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Tiny "voice": a buzzing source through a vowel formant.
let actx = null;
function voice(syl, pitch = 1) {
  if (store.muted) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const v = (syl.match(/[aeiouôóéü]/i) || ['a'])[0].toLowerCase();
    const F = { a: [800, 1200], e: [500, 1900], é: [450, 2100], i: [300, 2300], o: [500, 900], ô: [450, 850], ó: [520, 950], u: [330, 800], ü: [300, 1700] }[v] || [700, 1200];
    const t0 = actx.currentTime;
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(110 * pitch * (0.9 + Math.random() * 0.3), t0);
    o.frequency.exponentialRampToValueAtTime(90 * pitch, t0 + 0.22);
    const out = actx.createGain(); out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02); out.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    F.forEach((f) => { const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 9; o.connect(bp).connect(out); });
    out.connect(actx.destination);
    o.start(t0); o.stop(t0 + 0.3);
  } catch {}
}

// The page: words land where there is room, in a different face each time.
function makePage() {
  const c = document.createElement('canvas'); c.width = PAGE_W; c.height = PAGE_H;
  const g = c.getContext('2d');
  g.fillStyle = PAPER; g.fillRect(0, 0, PAGE_W, PAGE_H);
  // paper grain and a big ghost hand
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(60,40,20,${Math.random() * 0.06})`; g.fillRect(Math.random() * PAGE_W, Math.random() * PAGE_H, 2, 2); }
  return { c, g, boxes: [] };
}

function typeset(page, word, size, { faded = false } = {}) {
  const g = page.g;
  const face = pick(FONTS);
  const style = faded ? 'faded' : pick(['plain', 'plain', 'red', 'invert', 'outline', 'rule', 'vertical', 'blue']);
  g.font = `${size}px ${face}`;
  const w = g.measureText(word).width, hh = size * 0.9;
  const vertical = style === 'vertical';
  const bw = vertical ? hh : w, bh = vertical ? w : hh;
  // find a free spot (fewest overlaps)
  let best = null, bestScore = Infinity;
  for (let k = 0; k < 40; k++) {
    const x = 40 + Math.random() * Math.max(10, PAGE_W - 80 - bw), y = 150 + Math.random() * Math.max(10, PAGE_H - 230 - bh);
    let s = 0;
    for (const b of page.boxes) {
      const ox = Math.max(0, Math.min(x + bw, b.x + b.w) - Math.max(x, b.x)), oy = Math.max(0, Math.min(y + bh, b.y + b.h) - Math.max(y, b.y));
      s += ox * oy;
    }
    if (s < bestScore) { bestScore = s; best = { x, y }; }
    if (s === 0) break;
  }
  page.boxes.push({ x: best.x, y: best.y, w: bw, h: bh });
  const rot = faded ? (Math.random() - 0.5) * 0.3 : vertical ? 0 : (Math.random() - 0.5) * (size > 80 ? 0.25 : 0.7);
  g.save(); g.translate(best.x + bw / 2, best.y + bh / 2); g.rotate(rot + (vertical ? -Math.PI / 2 : 0));
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${size}px ${face}`;
  if (style === 'invert') { g.fillStyle = INK; g.fillRect(-w / 2 - 10, -hh / 2 - 6, w + 20, hh + 12); g.fillStyle = PAPER; g.fillText(word, 0, 2); }
  else if (style === 'outline') { g.strokeStyle = INK; g.lineWidth = Math.max(1.5, size / 30); g.strokeText(word, 0, 0); }
  else if (style === 'rule') { g.fillStyle = INK; g.fillText(word, 0, 0); g.fillStyle = RED; g.fillRect(-w / 2, hh / 2, w, Math.max(4, size / 10)); }
  else if (style === 'faded') { g.globalAlpha = 0.35; g.fillStyle = INK; g.fillText(word, 0, 0); g.globalAlpha = 1; g.strokeStyle = RED; g.lineWidth = 3; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.stroke(); }
  else { g.fillStyle = style === 'red' ? RED : style === 'blue' ? BLUE : INK; g.fillText(word, 0, 0); }
  g.restore();
}

function ornament(page, kind) {
  const g = page.g;
  const x = 60 + Math.random() * (PAGE_W - 160), y = 160 + Math.random() * (PAGE_H - 260);
  g.save(); g.translate(x, y); g.rotate((Math.random() - 0.5) * 0.8);
  if (kind === 'hand') { g.font = '110px serif'; g.fillStyle = INK; g.fillText('☞', 0, 0); }
  else if (kind === 'dada') { g.strokeStyle = RED; g.lineWidth = 6; g.strokeRect(-10, -70, 250, 90); g.font = '74px Bungee, Archivo'; g.fillStyle = RED; g.fillText('DADA', 4, 6); }
  else if (kind === 'bar') { g.fillStyle = Math.random() < 0.5 ? INK : RED; g.fillRect(0, 0, 160 + Math.random() * 300, 14 + Math.random() * 20); }
  else { g.fillStyle = BLUE; g.beginPath(); g.arc(0, 0, 30 + Math.random() * 40, 0, TAU); g.fill(); }
  g.restore();
}

export default {
  id: 'karawane',
  cat: 'design',
  title: { it: 'Karawane', en: 'Karawane' },
  tagline: { it: 'Poesia sonora dada. Componi parole senza senso a sillabe e la pagina impazzisce di caratteri.', en: 'A Dada sound poem. Build nonsense words syllable by syllable and the page goes wild with type.' },
  how: {
    it: 'In alto c’è la parola da comporre, per esempio jo·li·fan·to.|Tocca le sillabe giuste nell’ordine giusto: volano in giro e ci sono sillabe trappola.|Più sei veloce, più grande la parola si stampa sulla poesia. Sbagli = perdi la combo e tempo.',
    en: 'At the top is the word to build, for example jo·li·fan·to.|Tap the right syllables in the right order: they fly around and some are decoys.|The faster you are, the bigger the word is printed on the poem. Mistakes break the combo and cost time.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="${PAPER}"/><text x="10" y="34" font-family="serif" font-weight="900" font-size="26" fill="${INK}" transform="rotate(-6 10 34)">jolifanto</text><rect x="70" y="44" width="80" height="24" fill="${INK}"/><text x="76" y="62" font-family="monospace" font-weight="700" font-size="18" fill="${PAPER}">bambla</text><text x="14" y="84" font-family="sans-serif" font-weight="900" font-size="22" fill="${RED}" transform="rotate(5 14 84)">ô falli</text><text x="120" y="96" font-family="serif" font-size="16" fill="${BLUE}">ü üü</text></svg>`,

  mount(stage, api) {
    useFonts(EXTRA);
    const { board, controls } = arcadeLayout(stage);
    const A = stageCanvas(board);
    const inp = input(A.canvas);
    controls.append(h('span', { class: 'keys-hint' }, api.t({ it: 'Clicca le sillabe in ordine', en: 'Click the syllables in order' })));
    const page = makePage();
    ['bar', 'hand', 'dot', 'bar'].forEach((k) => ornament(page, k));
    let t = 0, over = false, made = 0, word = null, step = 0, wT = 0, wDur = 6, wrongT = 0, banner = 0;
    let tiles = [];
    const deck = [...WORDS].sort(() => Math.random() - 0.5);
    let deckI = 0;
    api.hud(api.t({ it: 'Parole', en: 'Words' }), '0', false);

    const tileFont = () => pick(FONTS);
    const makeTile = (txt, target) => {
      const size = Math.max(22, Math.min(40, Math.min(A.w, A.h) * 0.06));
      const top = bannerH() + 10;
      return {
        txt, target, size, font: tileFont(),
        x: 40 + Math.random() * Math.max(10, A.w - 80), y: top + 30 + Math.random() * Math.max(10, A.h - top - 70),
        vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, rot: (Math.random() - 0.5) * 0.5, vr: (Math.random() - 0.5) * 0.6,
        style: pick(['paper', 'ink', 'red', 'blue', 'paper']), flash: 0, w: 0, h: 0,
      };
    };
    const bannerH = () => Math.max(70, Math.min(110, A.h * 0.16));

    const nextWord = () => {
      word = deck[deckI++ % deck.length];
      step = 0;
      const lvl = Math.min(1, t / TIME);
      wDur = Math.max(2.6, 1.6 * word.length + 1.6 - lvl * 1.8 * (word.length / 3));
      wT = wDur;
      banner = 1;
      // the word's syllables plus decoys from other words
      const decoys = [];
      const nDecoy = 3 + Math.floor(lvl * 5);
      while (decoys.length < nDecoy) { const s = pick(pick(WORDS)); if (!word.includes(s)) decoys.push(s); }
      tiles = [...word.map((s) => makeTile(s, true)), ...decoys.map((s) => makeTile(s, false))];
      // faster chaos later on
      tiles.forEach((tl) => { tl.vx *= 1 + lvl * 1.8; tl.vy *= 1 + lvl * 1.8; });
    };

    const complete = () => {
      const rem = Math.max(0, wT / wDur);
      made++;
      const q = 0.62 + 0.38 * rem;
      const size = Math.round(34 + rem * 110 + Math.min(4, api.combo) * 6);
      typeset(page, word.join(''), size);
      if (Math.random() < 0.35) ornament(page, pick(['hand', 'bar', 'dot', 'bar']));
      const p = toStage(stage, A.box, A.w / 2, bannerH() / 2 + 10);
      api.hit(q, { silent: true, x: p.x, y: p.y + 30 });
      if (api.combo > 0 && api.combo % 5 === 0) { ornament(page, 'dada'); stamp(stage, 'DADA!', 'great'); }
      else stamp(stage, word.join('').toUpperCase(), rem > 0.6 ? 'great' : 'good');
      api.hud(api.t({ it: 'Parole', en: 'Words' }), String(made));
      nextWord();
    };
    const expire = () => {
      typeset(page, word.join(''), 26, { faded: true });
      api.hit(0.15, { silent: true });
      stamp(stage, api.t({ it: 'MUTO!', en: 'MUTE!' }), 'bad');
      nextWord();
    };

    const finish = () => {
      if (over) return; over = true;
      stopLoop();
      api.end({
        exports: [{ label: api.t({ it: 'La tua poesia dada (PNG)', en: 'Your Dada poem (PNG)' }), run: poster }],
        summary: api.t({ it: `${made} parole cantate`, en: `${made} words sung` }),
      });
    };
    api.timer(TIME, finish);

    const header = (g) => {
      g.save();
      g.fillStyle = INK; g.font = '96px "Abril Fatface", serif'; g.fillText('KARAWANE', 40, 110);
      g.fillStyle = RED; g.font = '22px "Special Elite", monospace'; g.fillText(`poesia sonora · ${(store.name || 'anonimo dada')}`, 46, 140);
      g.restore();
    };
    const poster = async () => {
      await useFonts(EXTRA);
      const c = document.createElement('canvas'); c.width = PAGE_W; c.height = PAGE_H;
      const g = c.getContext('2d');
      g.drawImage(page.c, 0, 0);
      header(g);
      g.fillStyle = INK; g.fillRect(40, PAGE_H - 70, PAGE_W - 80, 4);
      g.font = '700 18px "JetBrains Mono", monospace';
      g.fillText(`${made} PAROLE · OCCHIO · ZURIGO ${new Date().getFullYear()} (QUASI)`, 40, PAGE_H - 36);
      c.toBlob((b) => download(`occhio-karawane-${made}.png`, b), 'image/png');
    };

    const tileAt = (x, y) => {
      for (let i = tiles.length - 1; i >= 0; i--) {
        const tl = tiles[i];
        if (Math.abs(x - tl.x) < tl.w / 2 + 8 && Math.abs(y - tl.y) < tl.h / 2 + 8) return tl;
      }
      return null;
    };

    nextWord();
    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt; wrongT -= dt; banner = Math.max(0, banner - dt * 3);
      wT -= dt;
      if (wT <= 0) expire();
      const top = bannerH();
      // tap
      if (inp.justDown) {
        const tl = tileAt(inp.x, inp.y);
        if (tl) {
          if (tl.txt === word[step]) {
            voice(tl.txt, 1 + step * 0.15);
            tiles.splice(tiles.indexOf(tl), 1);
            step++; vibrate(8);
            if (step >= word.length) complete();
          } else {
            tl.flash = 0.4; wrongT = 0.3; wT -= 1.2;
            api.hit(0.2, { silent: true, quiet: true });
            sfx.bad(); vibrate([20, 20, 20]); shake(A.box);
          }
        }
      }
      // tiles drift and bounce, Dada style
      for (const tl of tiles) {
        tl.x += tl.vx * dt; tl.y += tl.vy * dt; tl.rot += tl.vr * dt; tl.flash -= dt;
        if (Math.abs(tl.rot) > 0.5) tl.vr = -tl.vr;
        const hw = tl.w / 2, hh = tl.h / 2;
        if (tl.x < hw + 4) { tl.x = hw + 4; tl.vx = Math.abs(tl.vx); }
        if (tl.x > A.w - hw - 4) { tl.x = A.w - hw - 4; tl.vx = -Math.abs(tl.vx); }
        if (tl.y < top + hh + 6) { tl.y = top + hh + 6; tl.vy = Math.abs(tl.vy); }
        if (tl.y > A.h - hh - 4) { tl.y = A.h - hh - 4; tl.vy = -Math.abs(tl.vy); }
      }

      // ---------- draw ----------
      const g = A.g;
      g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, A.w, A.h);
      // the poem being written, behind everything
      const sc = Math.max(A.w / PAGE_W, (A.h - top) / PAGE_H);
      g.save(); g.globalAlpha = 0.75;
      g.drawImage(page.c, (A.w - PAGE_W * sc) / 2, top + (A.h - top - PAGE_H * sc) / 2, PAGE_W * sc, PAGE_H * sc);
      g.restore();
      // tiles
      for (const tl of tiles) {
        g.save(); g.translate(tl.x, tl.y); g.rotate(tl.rot);
        g.font = `${tl.size}px ${tl.font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const w = Math.max(56, g.measureText(tl.txt).width + 26), hh = Math.max(48, tl.size * 1.35);
        tl.w = w; tl.h = hh;
        const bg = tl.flash > 0 ? RED : { paper: PAPER, ink: INK, red: RED, blue: BLUE }[tl.style];
        const fg = tl.flash > 0 ? PAPER : tl.style === 'paper' ? INK : PAPER;
        g.fillStyle = INK; g.fillRect(-w / 2 + 4, -hh / 2 + 4, w, hh);
        g.fillStyle = bg; g.fillRect(-w / 2, -hh / 2, w, hh);
        g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(-w / 2, -hh / 2, w, hh);
        g.fillStyle = fg; g.fillText(tl.txt, 0, 2);
        g.restore();
      }
      // banner: the word to sing, with filled and empty slots
      g.fillStyle = wrongT > 0 ? RED : INK; g.fillRect(0, 0, A.w, top);
      const frac = Math.max(0, wT / wDur);
      g.fillStyle = frac < 0.3 ? RED : '#F6C31B'; g.fillRect(0, top - 6, A.w * frac, 6);
      const bs = Math.min(top * 0.55, (A.w - 40) / (word.join('').length * 0.75 + word.length));
      g.font = `900 ${bs}px Archivo, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left';
      const parts = word.map((s) => ({ s, w: g.measureText(s).width }));
      const dotW = g.measureText('·').width;
      let x = (A.w - (parts.reduce((a, p) => a + p.w, 0) + dotW * (parts.length - 1))) / 2;
      const by = top / 2 - 2 + (banner > 0 ? Math.sin(banner * 20) * 4 : 0);
      parts.forEach((p, i) => {
        g.fillStyle = i < step ? '#F6C31B' : i === step ? PAPER : 'rgba(236,227,207,.4)';
        g.fillText(p.s, x, by);
        if (i === step) { g.fillRect(x, by + bs * 0.48, p.w, 4); }
        x += p.w;
        if (i < parts.length - 1) { g.fillStyle = 'rgba(236,227,207,.5)'; g.fillText('·', x, by); x += dotW; }
      });
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); inp.destroy(); A.destroy(); });
  },
};
