// "Il Museo Maledetto": the big game. 40 halls, one unsettling painting each.
import { h } from '../core/dom.js';
import { store } from '../core/store.js';
import { download } from '../core/export.js';
import { vibrate } from '../core/fx.js';
import { LEVELS, difficulty } from './levels.js';
import { paintingArt } from './art.js';
import { createEngine } from './engine.js';

const KEY = 'occhio:museum';
const loadProg = () => { try { return { max: 0, restored: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { max: 0, restored: [] }; } };
const saveProg = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };

const ROMAN = (n) => { const v = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [k, r] of v) while (n >= k) { s += r; n -= k; } return s; };

const ABIL = {
  melee: { it: 'Artigli', en: 'Claws', d: { it: 'ti colpisce da vicino', en: 'strikes up close' } },
  swarm: { it: 'Sciame', en: 'Swarm', d: { it: 'arrivano in tanti, più piccoli', en: 'many, smaller, faster' } },
  flight: { it: 'Volo', en: 'Flight', d: { it: 'ondeggia, difficile da centrare', en: 'weaves, hard to hit' } },
  charge: { it: 'Carica', en: 'Charge', d: { it: 'si ferma, poi si lancia', en: 'freezes, then lunges' } },
  shoot: { it: 'Sputo', en: 'Spit', d: { it: 'lancia colore a distanza', en: 'throws paint from afar' } },
  split: { it: 'Scissione', en: 'Split', d: { it: 'muore e diventa due', en: 'dies and becomes two' } },
  heal: { it: 'Restauro', en: 'Mend', d: { it: 'guarisce i vicini', en: 'heals its kin' } },
  teleport: { it: 'Salto', en: 'Blink', d: { it: 'ti compare accanto', en: 'appears beside you' } },
  gaze: { it: 'Sguardo', en: 'Gaze', d: { it: 'se lo guardi ti svuota e ti rallenta', en: 'its stare drains and slows you' } },
  invisible: { it: 'Velatura', en: 'Glaze', d: { it: 'quasi invisibile da lontano', en: 'nearly invisible from afar' } },
  devour: { it: 'Divora', en: 'Devour', d: { it: 'mordendo cresce e guarisce', en: 'grows and heals as it bites' } },
  summon: { it: 'Evoca', en: 'Summon', d: { it: 'genera piccoli dannati', en: 'spawns little damned' } },
  scream: { it: 'Urlo', en: 'Scream', d: { it: 'strappa la vista e ti spinge', en: 'tears your sight, pushes you' } },
  web: { it: 'Ragnatela', en: 'Web', d: { it: 'ti invischia e rallenta', en: 'snares and slows you' } },
};
const WHISPERS = {
  it: ['riportami dentro', 'la cornice è fredda', 'ti stavamo guardando', 'il colore brucia', 'non uscire dalla sala', 'resta. resta. resta.', 'chi ti ha dipinto?', 'anche tu avrai una cornice', 'senti la vernice che respira?', 'non guardarlo negli occhi'],
  en: ['put me back inside', 'the frame is cold', 'we were watching you', 'the paint burns', 'do not leave the hall', 'stay. stay. stay.', 'who painted you?', 'you will have a frame too', 'can you hear the paint breathe?', 'do not meet its eyes'],
};

function threat(i) { return Math.min(5, 1 + Math.floor(i / 8)); }

export function restoredPainting(idx, name, lang) {
  const L = LEVELS[idx];
  const W = 960, H = 720, PL = 150;
  const c = document.createElement('canvas'); c.width = W + 80; c.height = H + 80 + PL;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0807'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#5a4010'; g.fillRect(16, 16, W + 48, H + 48);
  g.fillStyle = '#c8a040'; g.fillRect(28, 28, W + 24, H + 24);
  g.drawImage(paintingArt(L, idx, W, H), 40, 40);
  g.fillStyle = '#c8a040'; g.fillRect(c.width / 2 - 300, H + 100, 600, 110);
  g.fillStyle = '#1a1208'; g.textAlign = 'center';
  g.font = '700 30px Archivo, sans-serif'; g.fillText(L.title[lang] || L.title.it, c.width / 2, H + 145);
  g.font = '500 20px "JetBrains Mono", monospace'; g.fillText(`${L.artist} · ${L.year}`, c.width / 2, H + 175);
  g.font = '500 15px "JetBrains Mono", monospace';
  g.fillText((lang === 'en' ? 'restored by ' : 'restaurato da ') + (name || '—') + ' · OCCHIO · ' + (lang === 'en' ? 'procedural homage' : 'omaggio procedurale'), c.width / 2, H + 198);
  return c;
}
function gallerySheet(list, name, lang) {
  const cols = Math.min(4, Math.max(1, list.length)), rows = Math.ceil(list.length / cols);
  const cw = 360, ch = 300, pad = 30;
  const c = document.createElement('canvas'); c.width = cols * cw + pad * 2; c.height = rows * ch + pad * 2 + 90;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0807'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e8dcc0'; g.font = '900 44px Archivo, sans-serif'; g.fillText(lang === 'en' ? 'THE CURSED MUSEUM' : 'IL MUSEO MALEDETTO', pad, 64);
  g.font = '500 16px "JetBrains Mono", monospace'; g.fillText(`${name || '—'} · ${list.length} ${lang === 'en' ? 'restored paintings' : 'quadri restaurati'}`, pad, 88);
  list.forEach((idx, k) => {
    const x = pad + (k % cols) * cw, y = 110 + Math.floor(k / cols) * ch;
    g.fillStyle = '#c8a040'; g.fillRect(x, y, cw - 20, 230);
    g.drawImage(paintingArt(LEVELS[idx], idx, 320, 240), x + 10, y + 10, cw - 40, 210);
    g.fillStyle = '#e8dcc0'; g.font = '700 15px Archivo, sans-serif'; g.fillText(`${ROMAN(idx + 1)} · ${(LEVELS[idx].title[lang] || LEVELS[idx].title.it).slice(0, 38)}`, x, y + 256);
    g.font = '500 12px "JetBrains Mono", monospace'; g.fillText(`${LEVELS[idx].artist} · ${LEVELS[idx].year}`, x, y + 276);
  });
  return c;
}

export default {
  id: 'museo-maledetto',
  cat: 'museo',
  featured: true,
  title: { it: 'Il Museo Maledetto', en: 'The Cursed Museum' },
  tagline: { it: 'Di notte i soggetti escono dai quadri. Rimandali dentro, sala dopo sala. 40 opere, 40 incubi.', en: 'At night the subjects crawl out of the paintings. Send them back, hall after hall. 40 works, 40 nightmares.' },
  how: {
    it: '40 livelli: ogni livello è una sala dedicata a un quadro inquietante (dal 1400 al 1900): i suoi soggetti sono diventati mostri, ognuno con poteri suoi.|Sparagli con il revolver a olio, caricato con il colore della sala: quando muoiono tornano volando nella cornice vuota più vicina. Svuota la sala e il quadro è restaurato.|PC: clicca per bloccare il mouse, WASD per muoverti, mouse per guardare e sparare, R per ricaricare il revolver (6 colpi), E per la trementina (bomba), Esc pausa. Telefono: joystick a sinistra, trascina a destra per guardare, tasti FUOCO e BOMBA.|Ogni 5 livelli c’è un mostro enorme e si sblocca un punto di partenza. Arrivare al livello 25 è un’impresa. Il 40 è da bestia.',
    en: '40 levels: each level is a hall devoted to an unsettling painting (1400s to 1900s): its subjects have become monsters, each with its own powers.|Shoot them with the oil revolver, loaded with the hall’s paint: when they die they fly back into the nearest empty frame. Clear the hall and the painting is restored.|PC: click to lock the mouse, WASD to move, mouse to look and shoot, R to reload the revolver (6 shots), E for turpentine (bomb), Esc to pause. Phone: joystick on the left, drag on the right to look, FIRE and BOMB buttons.|Every 5 levels a huge monster waits and a new starting point unlocks. Reaching level 25 is a feat. Level 40 is hellish.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#0b0807"/><path d="M0 100 L60 52 L100 52 L160 100Z" fill="#1a120c"/><path d="M0 0 L60 40 L100 40 L160 0Z" fill="#060403"/><rect x="60" y="40" width="40" height="12" fill="#2a1c14"/><rect x="66" y="42" width="28" height="8" fill="#c8a040"/><rect x="68" y="43" width="24" height="6" fill="#050303"/><circle cx="76" cy="46" r="1.6" fill="#ff2020"/><circle cx="84" cy="46" r="1.6" fill="#ff2020"/><rect x="18" y="20" width="22" height="30" fill="#c8a040" transform="skewY(18)"/><rect x="21" y="23" width="16" height="24" fill="#6a1a10" transform="skewY(18)"/><rect x="120" y="44" width="22" height="30" fill="#c8a040" transform="skewY(-18)"/><rect x="123" y="47" width="16" height="24" fill="#050303" transform="skewY(-18)"/></svg>`,

  mount(stage, api) {
    const lang = () => (api.lang === 'en' ? 'en' : 'it');
    const L = (o) => o[lang()] ?? o.it;
    const play = stage.closest('.play');
    play?.classList.add('play--museum');
    stage.classList.add('g-stage--museum');
    api.onCleanup(() => play?.classList.remove('play--museum'));

    const canvas = h('canvas', { class: 'mz-canvas' });
    const hpFill = h('i'), hpNum = h('b', {}, '100');
    const bombsEl = h('span', { class: 'mz-bombs' });
    const ammoDots = h('span', { class: 'mz-ammo-dots' });
    const ammoEl = h('button', { class: 'mz-ammo', type: 'button', 'aria-label': 'reload' }, h('small', {}, L({ it: 'colpi', en: 'shots' })), ammoDots, h('em', {}, coarseHint()));
    const fxEl = h('div', { class: 'mz-fx' });
    const hitArcs = h('div', { class: 'mz-arcs' });
    const webEl = h('div', { class: 'mz-webfx', html: webSvg() }), stoneEl = h('div', { class: 'mz-stonefx' });
    const leftEl = h('b', {}, '0');
    const lvlNum = h('b', {}, '1'), lvlSub = h('span', {});
    const titleEl = h('div', { class: 'mz-level' }, h('small', {}, L({ it: 'Livello', en: 'Level' })), h('div', {}, lvlNum, h('i', {}, '/40')), lvlSub);
    const plaqueA = h('b', {}), plaqueB = h('span', {});
    const plaque = h('div', { class: 'mz-plaque' }, plaqueA, plaqueB);
    const banner = h('div', { class: 'mz-banner' });
    const bossFill = h('i');
    const bossEl = h('div', { class: 'mz-boss', hidden: true }, h('small', {}, ''), h('div', { class: 'mz-bar' }, bossFill));
    const whisper = h('div', { class: 'mz-whisper' });
    const hurtEl = h('div', { class: 'mz-hurt' });
    const fireBtn = h('button', { class: 'mz-btn mz-fire', type: 'button', 'aria-label': 'fire' }, L({ it: 'FUOCO', en: 'FIRE' }));
    const bombBtn = h('button', { class: 'mz-btn mz-bomb', type: 'button', 'aria-label': 'bomb' }, L({ it: 'BOMBA', en: 'BOMB' }));
    const pauseBtn = h('button', { class: 'mz-pause-btn', type: 'button', 'aria-label': 'pause', html: '&#10074;&#10074;' });
    const knob = h('i');
    const joy = h('div', { class: 'mz-joy', hidden: true }, knob);
    const hudEl = h('div', { class: 'mz-hud', hidden: true },
      h('div', { class: 'mz-tl' }, titleEl),
      h('div', { class: 'mz-tr' }, h('small', {}, L({ it: 'mostri rimasti', en: 'monsters left' })), leftEl),
      bossEl,
      h('div', { class: 'mz-cross' }),
      whisper, plaque, banner,
      h('div', { class: 'mz-bl' }, h('div', { class: 'mz-hp' }, h('small', {}, L({ it: 'vita', en: 'life' })), h('div', { class: 'mz-bar' }, hpFill), hpNum), bombsEl),
      ammoEl, fxEl, hitArcs,
      joy, fireBtn, bombBtn, pauseBtn);
    const layer = h('div', { class: 'mz-layer' });
    const root = h('div', { class: 'mz' }, canvas, h('div', { class: 'mz-grain' }), webEl, stoneEl, hurtEl, hudEl, layer);
    stage.replaceChildren(root);
    root.addEventListener('scroll', () => { root.scrollTop = 0; root.scrollLeft = 0; });

    const prog = loadProg();
    const run = { start: 0, idx: 0, restored: [], playing: false, over: false };
    let whisperT = 6;
    const coarse = matchMedia('(pointer: coarse)').matches;

    const E = createEngine(canvas, {
      onHud(s) {
        hpFill.style.transform = `scaleX(${s.hp / 100})`;
        hpNum.textContent = s.hp;
        hudEl.classList.toggle('is-low', s.hp < 30);
        bombsEl.textContent = '✚'.repeat(Math.min(6, s.bombs)) || '–';
        if (s.ammo != null) {
          ammoDots.replaceChildren(...Array.from({ length: s.max }, (_, k) => h('i', { class: k < s.ammo && !s.reloading ? 'is-full' : '' })));
          ammoEl.classList.toggle('is-reloading', !!s.reloading);
          ammoEl.classList.toggle('is-empty', !s.reloading && s.ammo === 0);
        }
        showFx(s);
        leftEl.textContent = s.left;
        if (s.boss != null) { bossEl.hidden = false; bossFill.style.transform = `scaleX(${s.boss})`; } else bossEl.hidden = true;
        root.style.setProperty('--gaze', s.gaze.toFixed(2));
      },
      onKill({ boss, child, idx }) {
        const pts = Math.round(40 * (1 + idx * 0.15) * (boss ? 15 : child ? 0.4 : 1));
        api.add(pts);
        if (boss) vibrate([60, 40, 120]);
      },
      onEvent(kind, data) {
        if (kind === 'hurt') { vibrate(30); hurtEl.animate?.([{ opacity: 0.9 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }); if (data?.ang != null) arc(data.ang); }
        if (kind === 'scream') vibrate([80, 30, 80]);
        if (kind === 'wake' && Math.random() < 0.25) say();
      },
      onClear(st) { setTimeout(() => cleared(st), 700); },
      onDeath(st) { run.playing = false; unlock(); setTimeout(() => died(st), 1300); },
    });
    const ro = new ResizeObserver(() => { const r = root.getBoundingClientRect(); if (r.width > 0) { E.resize(r.width, r.height); E.render(); } });
    ro.observe(root);
    const r0 = root.getBoundingClientRect(); E.resize(r0.width || 800, r0.height || 500);
    E.S.touch = coarse;
    root.classList.toggle('is-touch', coarse);

    // Plaque: when you face a frame up close, the label tells you what you are looking at.
    let plaqueKey = '';
    const pTimer = setInterval(() => {
      const S = E.S;
      let key = '';
      if (run.playing && !S.paused && S.lookDist < (S.lookCell >= 4 ? 5 : 3.4)) key = S.lookCell === 2 ? 'art' : S.lookCell === 3 ? 'empty' : S.lookCell >= 4 ? 'master' : '';
      if (key === plaqueKey) return;
      plaqueKey = key;
      const lv = LEVELS[run.idx];
      if (key === 'art') { plaqueA.textContent = L(lv.title); plaqueB.textContent = `${lv.artist} · ${lv.year}`; }
      if (key === 'master') { plaqueA.textContent = L(lv.title); plaqueB.textContent = `${lv.artist} · ${lv.year} · ${L({ it: 'il capolavoro della sala', en: 'the masterpiece of the hall' })}`; }
      if (key === 'empty') { plaqueA.textContent = L({ it: 'Cornice vuota', en: 'Empty frame' }); plaqueB.textContent = L({ it: `qui c’era un ${L(lv.monster.name).toLowerCase()}: uccidilo e torna dentro`, en: `a ${L(lv.monster.name).toLowerCase()} escaped from here: kill it and it goes back in` }); }
      plaque.classList.toggle('is-on', !!key); plaque.classList.toggle('is-master', key === 'master');
      plaque.classList.toggle('is-empty', key === 'empty');
    }, 150);

    function showBanner(kids, ms = 3400) {
      banner.replaceChildren(...kids);
      banner.getAnimations?.().forEach((a) => a.cancel());
      banner.animate?.([{ opacity: 0, transform: 'translate(-50%, -40%) scale(.96)' }, { opacity: 1, transform: 'translate(-50%, -50%)', offset: 0.12 }, { opacity: 1, offset: 0.78 }, { opacity: 0, transform: 'translate(-50%, -56%)' }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    }

    // ---------- maluses: what is hurting you, how much, for how long ----------
    function coarseHint() { return matchMedia('(pointer: coarse)').matches ? L({ it: 'tocca per ricaricare', en: 'tap to reload' }) : L({ it: 'R ricarica', en: 'R reload' }); }
    function webSvg() {
      let p = '';
      for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [100, 0, -1, 1], [0, 100, 1, -1], [100, 100, -1, -1]]) {
        for (let k = 0; k < 7; k++) { const a = (k / 6) * (Math.PI / 2); p += `M${cx} ${cy} L${cx + sx * Math.cos(a) * 42} ${cy + sy * Math.sin(a) * 42} `; }
        for (let r = 8; r <= 40; r += 8) { p += `M${cx + sx * r} ${cy} `; for (let k = 1; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); p += `Q${cx + sx * Math.cos(a - 0.13) * r * 0.86} ${cy + sy * Math.sin(a - 0.13) * r * 0.86} ${cx + sx * Math.cos(a) * r} ${cy + sy * Math.sin(a) * r} `; } }
      }
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${p}" fill="none" stroke="rgba(240,240,232,.75)" stroke-width=".35" vector-effect="non-scaling-stroke"/></svg>`;
    }
    const FX = {
      web: { name: { it: 'Ragnatela', en: 'Web' }, d: { it: 'sei invischiato: ti muovi a metà velocità', en: 'snared: you move at half speed' } },
      gaze: { name: { it: 'Sguardo', en: 'Gaze' }, d: { it: 'ti pietrifica e ti toglie vita: non guardarlo', en: 'turns you to stone and drains you: look away' } },
      scream: { name: { it: 'Urlo', en: 'Scream' }, d: { it: 'stordito: la vista si strappa', en: 'stunned: your sight tears' } },
    };
    const fxChips = {};
    function chip(key, k) {
      let c = fxChips[key];
      if (!c) { const bar = h('i'); c = fxChips[key] = { el: h('div', { class: `mz-chip mz-chip--${key}` }, h('b', {}, L(FX[key].name)), h('span', {}, L(FX[key].d)), h('div', { class: 'mz-chip-bar' }, bar)), bar }; }
      c.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, k))})`;
      return c.el;
    }
    function showFx(s) {
      const list = [];
      if (s.slowT > 0) list.push(chip('web', s.slowT / 2.5));
      if (s.gaze > 0.06) list.push(chip('gaze', s.gaze));
      if (s.screamT > 0) list.push(chip('scream', s.screamT / 1.3));
      fxEl.replaceChildren(...list);
      webEl.style.opacity = s.slowT > 0 ? Math.min(1, 0.35 + s.slowT / 2.5) : 0;
      stoneEl.style.opacity = Math.min(1, s.gaze * 1.3);
    }
    function arc(ang) {
      const a = h('i', { style: { transform: `rotate(${ang * 180 / Math.PI}deg)` } });
      hitArcs.append(a);
      a.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-in' });
      setTimeout(() => a.remove(), 900);
    }

    function say() {
      const list = WHISPERS[lang()];
      whisper.textContent = list[Math.floor(Math.random() * list.length)];
      whisper.animate?.([{ opacity: 0, transform: 'translate(-50%, 6px)' }, { opacity: 0.85, transform: 'translate(-50%, 0)', offset: 0.2 }, { opacity: 0.85, offset: 0.7 }, { opacity: 0, transform: 'translate(-50%, -4px)' }], { duration: 3200, easing: 'ease-in-out' });
    }
    // HUD whispers on a slow clock
    const wTimer = setInterval(() => {
      if (!run.playing || E.S.paused) return;
      whisperT -= 1;
      if (whisperT <= 0) { say(); whisperT = 9 + Math.random() * 10 - Math.min(6, run.idx / 6); }
    }, 1000);

    // ---------- screens ----------
    const card = (cls, ...kids) => { const c = h('div', { class: `mz-card ${cls}` }, ...kids); layer.replaceChildren(h('div', { class: 'mz-veil' }, c)); c.animate?.([{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }); return c; };
    const closeCard = () => layer.replaceChildren();
    const btn = (label, onclick, cls = '') => { const b = h('button', { class: `mz-cta ${cls}`, type: 'button' }, label); b.onclick = onclick; return b; };

    function select() {
      hudEl.hidden = true;
      E.halt(); E.setPaused(true);
      const grid = h('div', { class: 'mz-halls' });
      LEVELS.forEach((lv, i) => {
        const seen = i <= prog.max;
        const startable = seen && i % 5 === 0;
        const thumb = seen ? paintingArt(lv, i, 160, 120) : null;
        if (thumb) thumb.className = 'mz-hall-art';
        const b = h('button', { class: `mz-hall${startable ? ' is-start' : ''}${seen ? '' : ' is-locked'}${prog.restored.includes(i) ? ' is-done' : ''}`, type: 'button', disabled: !startable, 'aria-label': `${L({ it: 'Livello', en: 'Level' })} ${i + 1} ${seen ? L(lv.title) : ''}` },
          thumb || h('span', { class: 'mz-hall-art mz-hall-art--dark' }, '?'),
          h('b', {}, String(i + 1)),
          (i + 1) % 5 === 0 ? h('em', {}, 'boss') : null);
        if (startable) b.onclick = () => begin(i);
        grid.append(b);
      });
      card('mz-card--select',
        h('small', { class: 'mz-kicker' }, L({ it: 'Il Museo Maledetto · 40 livelli', en: 'The Cursed Museum · 40 levels' })),
        h('h2', {}, L({ it: 'Da quale livello parti?', en: 'Which level do you start from?' })),
        h('p', {}, L({ it: 'Ogni livello è una sala del museo dedicata a un quadro. Svuoti la sala, passi al livello dopo, sempre più difficile. Ogni 5 livelli c’è un boss e si sblocca un nuovo punto di partenza. Punteggio e quadri restano su questo dispositivo.', en: 'Each level is a museum hall devoted to one painting. Clear the hall and you move on to the next, harder level. Every 5 levels there is a boss and a new starting point unlocks. Score and paintings stay on this device.' })),
        grid,
        h('p', { class: 'mz-fine' }, L({ it: 'Le opere sono omaggi procedurali ispirati ai dipinti originali, non riproduzioni.', en: 'Artworks are procedural homages inspired by the original paintings, not reproductions.' })));
    }

    function begin(i) { run.start = i; run.idx = i; run.restored = []; run.over = false; intro(i); }

    function intro(i) {
      const lv = LEVELS[i], d = difficulty(i);
      api.hud(L({ it: 'Livello', en: 'Level' }), `${i + 1}/40`);
      E.load(i);
      E.render();
      hudEl.hidden = true;
      const art = paintingArt(lv, i, 480, 360); art.className = 'mz-art';
      const skulls = '☠'.repeat(threat(i)) + '·'.repeat(5 - threat(i));
      card(`mz-card--intro${d.boss ? ' is-boss' : ''}`,
        h('div', { class: 'mz-frame' }, art),
        h('div', { class: 'mz-info' },
          h('div', { class: 'mz-lvl-head' },
            h('span', { class: 'mz-lvl-big' }, h('small', {}, L({ it: 'Livello', en: 'Level' })), h('b', {}, String(i + 1)), h('i', {}, '/40')),
            h('span', { class: 'mz-kicker' }, `${L({ it: 'Sala', en: 'Hall' })} ${ROMAN(i + 1)}${d.boss ? ' · BOSS' : ''}`)),
          track(i),
          h('p', { class: 'mz-artist' }, `${lv.artist} · ${lv.year}`),
          h('h2', {}, L(lv.title)),
          h('p', { class: 'mz-note' }, L(lv.note)),
          h('div', { class: 'mz-mon' }, h('small', {}, L({ it: 'Cosa è uscito dal quadro', en: 'What crawled out' })), h('b', {}, `${d.boss ? (lang() === 'en' ? 'The Great ' : 'Il Grande ') : ''}${L(lv.monster.name)}`), h('span', { class: 'mz-threat', title: 'threat' }, skulls)),
          h('ul', { class: 'mz-abil' }, lv.abilities.map((a) => h('li', {}, h('b', {}, L(ABIL[a])), ' ', L(ABIL[a].d)))),
          h('p', { class: 'mz-goal' }, i === LEVELS.length - 1
            ? L({ it: 'Obiettivo: uccidi tutti i mostri della sala. È l’ultimo livello.', en: 'Goal: kill every monster in the hall. This is the last level.' })
            : L({ it: `Obiettivo: uccidi tutti i mostri della sala per passare al livello ${i + 2}.`, en: `Goal: kill every monster in the hall to reach level ${i + 2}.` })),
          h('div', { class: 'mz-row' },
            btn(L({ it: `Inizia il livello ${i + 1}`, en: `Start level ${i + 1}` }) + ' →', () => enter()),
            i === run.start ? btn(L({ it: 'Cambia livello', en: 'Other level' }), () => select(), 'mz-cta--ghost') : null)));
    }

    // 40 ticks: done, current, still to come
    function track(i) {
      return h('div', { class: 'mz-track', 'aria-hidden': 'true' }, LEVELS.map((_, k) => h('i', { class: `${k < i ? 'is-past' : ''}${k === i ? ' is-now' : ''}${(k + 1) % 5 === 0 ? ' is-boss' : ''}` })));
    }

    function lockPointer() { if (coarse) return; try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch {} }
    function enter() {
      closeCard();
      hudEl.hidden = false;
      const lv = LEVELS[run.idx];
      lvlNum.textContent = String(run.idx + 1);
      root.style.setProperty('--mz-accent', lv.pal.accent);
      lvlSub.textContent = `${lv.artist} · ${L(lv.title)}`;
      showBanner([
        h('small', {}, L({ it: 'Livello', en: 'Level' })),
        h('b', {}, String(run.idx + 1)),
        h('span', {}, L(lv.title)),
        h('em', {}, L({ it: `Uccidi i ${E.S.total} mostri della sala`, en: `Kill the ${E.S.total} monsters in the hall` })),
      ]);
      run.playing = true;
      whisperT = 5;
      E.setPaused(false); E.run();
      lockPointer();
      stopKeys();
    }

    function pause() {
      if (!run.playing || E.S.paused || E.S.done || !E.S.alive) return;
      E.setPaused(true); stopKeys();
      card('mz-card--pause',
        h('h2', {}, L({ it: 'Pausa', en: 'Paused' })),
        h('p', {}, L({ it: 'Il museo aspetta. Non per sempre.', en: 'The museum waits. Not forever.' })),
        h('div', { class: 'mz-row' },
          btn(L({ it: 'Riprendi', en: 'Resume' }), () => { closeCard(); E.setPaused(false); lockPointer(); }),
          btn(L({ it: 'Esci e salva il punteggio', en: 'Quit and save score' }), () => finish(false), 'mz-cta--ghost')));
    }

    function unlock() { prog.max = Math.max(prog.max, run.idx); saveProg(prog); }

    function cleared(st) {
      if (run.over) return;
      run.playing = false;
      try { document.exitPointerLock?.(); } catch {}
      stopKeys();
      const i = run.idx, lv = LEVELS[i];
      const q = Math.min(1, 0.5 * (st.hp / 100) + 0.5 * Math.min(1, st.acc * 1.6));
      api.hit(q, { silent: true });
      const bonus = Math.round(300 * (1 + i * 0.2) + st.hp * 4);
      api.add(bonus);
      run.restored.push(i);
      if (!prog.restored.includes(i)) prog.restored.push(i);
      prog.max = Math.max(prog.max, Math.min(LEVELS.length - 1, i + 1));
      saveProg(prog);
      const last = i === LEVELS.length - 1;
      const art = paintingArt(lv, i, 480, 360); art.className = 'mz-art';
      card('mz-card--clear',
        h('div', { class: 'mz-frame is-restored' }, art),
        h('div', { class: 'mz-info' },
          h('small', { class: 'mz-kicker' }, `${L({ it: 'Livello', en: 'Level' })} ${i + 1} ${L({ it: 'superato', en: 'cleared' })} · ${L({ it: 'quadro restaurato', en: 'painting restored' })}`),
          track(i + 1),
          h('h2', {}, L(lv.title)),
          h('p', { class: 'mz-artist' }, `${lv.artist} · ${lv.year}`),
          h('div', { class: 'mz-stats' },
            h('div', {}, h('small', {}, L({ it: 'anime', en: 'souls' })), h('b', {}, st.kills)),
            h('div', {}, h('small', {}, L({ it: 'mira', en: 'aim' })), h('b', {}, Math.round(st.acc * 100) + '%')),
            h('div', {}, h('small', {}, L({ it: 'vita', en: 'life' })), h('b', {}, Math.round(st.hp))),
            h('div', {}, h('small', {}, L({ it: 'tempo', en: 'time' })), h('b', {}, Math.round(st.time) + 's')),
            h('div', {}, h('small', {}, 'bonus'), h('b', {}, '+' + bonus))),
          h('div', { class: 'mz-row' },
            last ? btn(L({ it: 'Hai liberato il museo', en: 'You freed the museum' }) + ' →', () => finish(true)) : btn(L({ it: `Vai al livello ${i + 2}`, en: `Go to level ${i + 2}` }) + ' →', () => { run.idx = i + 1; intro(run.idx); }),
            btn(L({ it: 'Scarica il quadro', en: 'Download painting' }), () => restoredPainting(i, store.name, lang()).toBlob((b) => download(`occhio-museo-${i + 1}.png`, b), 'image/png'), 'mz-cta--ghost'),
            btn(L({ it: 'Esci', en: 'Quit' }), () => finish(false), 'mz-cta--ghost'))));
    }

    function died(st) {
      if (run.over) return;
      try { document.exitPointerLock?.(); } catch {}
      stopKeys();
      card('mz-card--dead',
        h('small', { class: 'mz-kicker' }, `${L({ it: 'Livello', en: 'Level' })} ${run.idx + 1} / 40`),
        h('h2', {}, L({ it: 'Il museo ti ha incorniciato.', en: 'The museum framed you.' })),
        h('p', {}, L({ it: `Ora sei tu, appeso in ${L(LEVELS[run.idx].title)}.`, en: `Now it is you, hanging in ${L(LEVELS[run.idx].title)}.` })),
        h('div', { class: 'mz-row' }, btn(L({ it: 'Vedi il risultato', en: 'See results' }), () => finish(false))));
    }

    function finish(won) {
      if (run.over) return;
      run.over = true; run.playing = false;
      E.halt(); E.setPaused(true);
      try { document.exitPointerLock?.(); } catch {}
      if (!run.restored.length) api.hit(0, { silent: true, quiet: true });
      closeCard(); hudEl.hidden = true;
      const restored = run.restored.slice();
      const exports = [];
      if (restored.length) exports.push({ label: L({ it: 'La tua galleria (PNG)', en: 'Your gallery (PNG)' }), run: () => gallerySheet(restored, store.name, lang()).toBlob((b) => download('occhio-museo-galleria.png', b), 'image/png') });
      restored.slice(-6).forEach((i) => exports.push({ label: `${ROMAN(i + 1)} · PNG`, run: () => restoredPainting(i, store.name, lang()).toBlob((b) => download(`occhio-museo-${i + 1}.png`, b), 'image/png') }));
      const summary = restored.length
        ? L({ it: `Livelli superati: ${restored.length} (dal ${run.start + 1} al ${restored[restored.length - 1] + 1})${won ? ' · MUSEO LIBERATO' : ''}`, en: `Levels cleared: ${restored.length} (${run.start + 1} to ${restored[restored.length - 1] + 1})${won ? ' · MUSEUM FREED' : ''}` })
        : L({ it: 'Nessuna sala restaurata. Il museo ride.', en: 'No hall restored. The museum laughs.' });
      api.end({ exports, summary });
    }

    // ---------- input ----------
    const keys = new Set();
    function stopKeys() { keys.clear(); Object.assign(E.ctl, { fwd: 0, strafe: 0, turn: 0, fire: false }); }
    const applyKeys = () => {
      if (touchState.joy) return;
      E.ctl.fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      E.ctl.strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      E.ctl.turn = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
      E.ctl.fire = keys.has('Space') || mouseFire || touchState.fire;
    };
    let mouseFire = false;
    const onKey = (e) => {
      if (!run.playing) return;
      const down = e.type === 'keydown';
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) { e.preventDefault(); down ? keys.add(e.code) : keys.delete(e.code); applyKeys(); }
      if (down && (e.code === 'KeyE' || e.code === 'KeyQ') && !e.repeat) { E.ctl.bomb = true; }
      if (down && e.code === 'KeyR' && !e.repeat) E.ctl.reload = true;
      if (down && (e.code === 'Escape' || e.code === 'KeyP')) pause();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const locked = () => document.pointerLockElement === canvas;
    const onMouseMove = (e) => { if (!run.playing || E.S.paused) return; if (locked() || (mouseFire && e.pointerType === 'mouse')) E.ctl.look += (e.movementX || 0) * 0.0024; };
    document.addEventListener('pointermove', onMouseMove);
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || !run.playing) return;
      if (E.S.paused) return;
      if (!locked()) lockPointer();
      mouseFire = true; applyKeys();
    });
    const onUp = (e) => { if (e.pointerType === 'mouse') { mouseFire = false; applyKeys(); } };
    window.addEventListener('pointerup', onUp);
    let hadLock = false;
    const onLock = () => { if (locked()) { hadLock = true; return; } if (hadLock && run.playing && !coarse) pause(); hadLock = false; };
    document.addEventListener('pointerlockchange', onLock);
    const onVis = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis);

    // touch: left joystick, right look, buttons
    const touchState = { joy: null, look: null, fire: false, jx: 0, jy: 0, lx: 0 };
    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !run.playing || E.S.paused) return;
      if (e.target.closest('.mz-btn, .mz-pause-btn, .mz-card, .mz-ammo')) return;
      if (!E.S.touch) { E.S.touch = true; root.classList.add('is-touch'); }
      const r = root.getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.45 && touchState.joy == null) {
        touchState.joy = e.pointerId; touchState.jx = e.clientX; touchState.jy = e.clientY;
        joy.hidden = false; joy.style.left = `${e.clientX - r.left}px`; joy.style.top = `${e.clientY - r.top}px`; knob.style.transform = 'translate(-50%,-50%)';
      } else if (touchState.look == null) { touchState.look = e.pointerId; touchState.lx = e.clientX; }
      try { root.setPointerCapture(e.pointerId); } catch {}
    });
    root.addEventListener('pointermove', (e) => {
      if (e.pointerId === touchState.joy) {
        const R = 46; let dx = e.clientX - touchState.jx, dy = e.clientY - touchState.jy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        E.ctl.fwd = -dy / R; E.ctl.strafe = dx / R;
      } else if (e.pointerId === touchState.look) {
        E.ctl.look += (e.clientX - touchState.lx) * 0.0065; touchState.lx = e.clientX;
      }
    });
    const endTouch = (e) => {
      if (e.pointerId === touchState.joy) { touchState.joy = null; joy.hidden = true; E.ctl.fwd = 0; E.ctl.strafe = 0; }
      if (e.pointerId === touchState.look) touchState.look = null;
    };
    root.addEventListener('pointerup', endTouch);
    root.addEventListener('pointercancel', endTouch);
    const hold = (el, on, off) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); on(); try { el.setPointerCapture(e.pointerId); } catch {} }); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off); };
    hold(fireBtn, () => { touchState.fire = true; E.ctl.fire = true; }, () => { touchState.fire = false; E.ctl.fire = keys.has('Space') || mouseFire; });
    bombBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); E.ctl.bomb = true; vibrate(40); });
    pauseBtn.addEventListener('click', () => pause());
    ammoEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); E.ctl.reload = true; });
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    // test hooks for the double check
    window.__museum = {
      engine: E,
      start(i) { begin(i); enter(); try { document.exitPointerLock?.(); } catch {} },
      killAll: () => E.killAll(),
      step: (n) => E.step(n),
      getState: () => ({ idx: run.idx, playing: run.playing, alive: E.alive(), total: E.S.total, hp: E.S.hp, done: E.S.done, dead: !E.S.alive, frameMs: E.frameMs, size: E.size, mons: E.S.mons.length, over: run.over }),
      next() { run.idx++; intro(run.idx); enter(); },
      hurt: (d) => E.hurt(d),
    };

    select();
    api.onCleanup(() => {
      clearInterval(wTimer); clearInterval(pTimer); ro.disconnect(); E.destroy();
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      document.removeEventListener('pointermove', onMouseMove); window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('visibilitychange', onVis);
      try { document.exitPointerLock?.(); } catch {}
      if (window.__museum?.engine === E) delete window.__museum;
    });
  },
};
