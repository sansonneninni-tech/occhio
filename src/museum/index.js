// "Il Museo Maledetto": 15 levels, one real painting and one artist each.
// A run is a descent: few lives for the whole game, every level has its own map and its own rule.
// This file is the shell (menus, HUD, lives, controls). The engine is core/engine.js, levels are in levels/.
import { h } from '../core/dom.js';
import { store } from '../core/store.js';
import { download } from '../core/export.js';
import { vibrate } from '../core/fx.js';
import { LEVELS, PLAN, loadExample } from './levels/index.js';

const KEY = 'occhio:museo2';
const LIVES = 3, MAX_LIVES = 5;
const loadProg = () => { try { return { max: 0, restored: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { max: 0, restored: [] }; } };
const saveProg = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
const ROMAN = (n) => { const v = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [k, r] of v) while (n >= k) { s += r; n -= k; } return s; };

const WHISPERS = {
  it: ['non guardare la cornice', 'ti abbiamo dipinto mentre dormivi', 'la vernice è ancora calda', 'chi ti ha messo qui?', 'resta. resta. resta.', 'anche tu marcirai a olio', 'ascolta la tela che respira', 'non uscirai dal quadro'],
  en: ['do not look at the frame', 'we painted you while you slept', 'the paint is still warm', 'who hung you here?', 'stay. stay. stay.', 'you too will rot in oil', 'listen to the canvas breathe', 'you will not leave the painting'],
};

function souvenir(lv, imgEl, name, lang, st) {
  const iw = imgEl.naturalWidth || imgEl.width, ih = imgEl.naturalHeight || imgEl.height;
  const k = Math.min(1000 / iw, 900 / ih);
  const W = Math.round(iw * k), H = Math.round(ih * k), PL = 170;
  const c = document.createElement('canvas'); c.width = W + 120; c.height = H + 120 + PL;
  const g = c.getContext('2d');
  g.fillStyle = '#080605'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#3a2810'; g.fillRect(24, 24, W + 72, H + 72);
  g.fillStyle = '#8a6a28'; g.fillRect(40, 40, W + 40, H + 40);
  g.drawImage(imgEl, 60, 60, W, H);
  lv.souvenir?.(g, { x: 60, y: 60, w: W, h: H, stats: st, lang });
  g.fillStyle = '#c8a040'; g.fillRect(c.width / 2 - 320, H + 140, 640, 120);
  g.fillStyle = '#14100a'; g.textAlign = 'center';
  const T = (o) => (o?.[lang] ?? o?.it ?? '');
  g.font = 'italic 30px "IM Fell English", serif'; g.fillText(T(lv.title).slice(0, 44), c.width / 2, H + 185);
  g.font = '600 18px "JetBrains Mono", monospace'; g.fillText(`${lv.artist} · ${lv.year}`, c.width / 2, H + 214);
  g.font = '500 14px "JetBrains Mono", monospace';
  g.fillText(`${lang === 'en' ? 'crossed alive by' : 'attraversato vivo da'} ${name || '—'} · ${st?.kills ?? 0} ${lang === 'en' ? 'souls' : 'anime'} · OCCHIO`, c.width / 2, H + 240);
  return c;
}

export default {
  id: 'museo-maledetto',
  cat: 'museo',
  featured: true,
  title: { it: 'Il Museo Maledetto', en: 'The Cursed Museum' },
  tagline: { it: 'Quindici quadri veri, quindici artisti, quindici incubi. Attraversali tutti con tre vite.', en: 'Fifteen real paintings, fifteen artists, fifteen nightmares. Cross them all with three lives.' },
  how: {
    it: 'Ogni livello è dentro un quadro vero, con la sua mappa, i suoi mostri ritagliati dalla tela e una regola tutta sua, spiegata prima di entrare.|Hai tre vite per tutta la discesa. Se muori riparti dallo stesso livello con una vita in meno. Finite le vite, si ricomincia dal primo quadro.|PC: clicca per bloccare il mouse, WASD per muoverti, mouse per guardare, clic sinistro per sparare, R per ricaricare il revolver (6 colpi), tasto destro o Spazio per l’azione del livello, Esc pausa. Telefono: joystick a sinistra, trascina a destra per guardare, tasti FUOCO e azione.|Alla fine di ogni livello scopri qualcosa sull’artista e ti porti a casa il quadro attraversato.',
    en: 'Every level takes place inside a real painting, with its own map, monsters cut out of the canvas and a rule of its own, explained before you go in.|You have three lives for the whole descent. If you die you restart the same level with one life less. Out of lives, you start again from the first painting.|PC: click to lock the mouse, WASD to move, mouse to look, left click to shoot, R to reload the revolver (6 shots), right click or Space for the level action, Esc to pause. Phone: joystick on the left, drag on the right to look, FIRE and action buttons.|At the end of each level you discover something about the artist and take home the painting you crossed.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><defs><filter id="mzg"><feTurbulence baseFrequency=".9" numOctaves="2"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .06  0 0 0 .5 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs><rect width="160" height="100" fill="#0b0807"/><rect x="48" y="14" width="64" height="72" fill="#6a4a18"/><rect x="53" y="19" width="54" height="62" fill="#1a0e0a"/><ellipse cx="80" cy="44" rx="13" ry="17" fill="#cfc2a8"/><ellipse cx="74" cy="41" rx="3" ry="4" fill="#050303"/><ellipse cx="86" cy="41" rx="3" ry="4" fill="#050303"/><ellipse cx="80" cy="54" rx="5" ry="7" fill="#050303"/><path d="M60 81 C66 64 94 64 100 81Z" fill="#4a1a5a"/><rect width="160" height="100" filter="url(#mzg)"/></svg>`,

  async mount(stage, api) {
    const lang = () => (api.lang === 'en' ? 'en' : 'it');
    const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang()] ?? o.it);
    const play = stage.closest('.play');
    play?.classList.add('play--museum');
    stage.classList.add('g-stage--museum');
    api.onCleanup(() => play?.classList.remove('play--museum'));
    // three.js and the engine load only when you enter the museum
    const [{ createEngine }, { loadImage }] = await Promise.all([import('./core/engine.js'), import('./core/art.js')]);
    const exampleMode = /esempio/.test(location.hash) || /esempio/.test(location.search);

    // ---------- DOM ----------
    const canvas = h('canvas', { class: 'mz-canvas' });
    const hpFill = h('i'), hpNum = h('b', {}, '100');
    const ammoDots = h('span', { class: 'mz-ammo-dots' });
    const isCoarse = matchMedia('(pointer: coarse)').matches;
    const ammoEl = h('button', { class: 'mz-ammo', type: 'button', 'aria-label': 'reload' }, h('small', {}, L({ it: 'colpi', en: 'shots' })), ammoDots, h('em', {}, isCoarse ? L({ it: 'tocca per ricaricare', en: 'tap to reload' }) : L({ it: 'R ricarica', en: 'R reload' })));
    const livesEl = h('div', { class: 'mz-lives', 'aria-label': 'lives' });
    const goalLabel = h('small', {}), goalNum = h('b', {}, '');
    const objGoal = h('p', {}), objRule = h('p', {});
    const objEl = h('button', { class: 'mz-obj', type: 'button', 'aria-label': 'objective' },
      h('small', {}, L({ it: 'Obiettivo', en: 'Goal' })), objGoal,
      h('small', { class: 'mz-obj-r' }, L({ it: 'Regola', en: 'Rule' })), objRule);
    const goalCount = h('div', { class: 'mz-count' }, goalLabel, goalNum);
    const goalEl = h('div', { class: 'mz-tr' }, goalCount, objEl);
    const lvlNum = h('b', {}, '1'), lvlSub = h('span', {});
    const titleEl = h('div', { class: 'mz-level' }, h('small', {}, L({ it: 'Livello', en: 'Level' })), h('div', {}, lvlNum, h('i', {}, '/15')), lvlSub);
    const bossName = h('small', {}), bossFill = h('i');
    const bossEl = h('div', { class: 'mz-boss', hidden: true }, bossName, h('div', { class: 'mz-bar' }, bossFill));
    const barsEl = h('div', { class: 'mz-bars' });
    const banner = h('div', { class: 'mz-banner' });
    const whisper = h('div', { class: 'mz-whisper' });
    const arcs = h('div', { class: 'mz-arcs' });
    const fireBtn = h('button', { class: 'mz-btn mz-fire', type: 'button', 'aria-label': 'fire' }, L({ it: 'FUOCO', en: 'FIRE' }));
    const actBtn = h('button', { class: 'mz-btn mz-act', type: 'button', hidden: true }, '');
    const pauseBtn = h('button', { class: 'mz-pause-btn', type: 'button', 'aria-label': 'pause', html: '&#10074;&#10074;' });
    const knob = h('i');
    const joy = h('div', { class: 'mz-joy', hidden: true }, knob);
    const actHint = h('div', { class: 'mz-act-hint', hidden: true });
    const hudEl = h('div', { class: 'mz-hud', hidden: true },
      h('div', { class: 'mz-tl' }, titleEl, livesEl), goalEl, bossEl, barsEl,
      h('div', { class: 'mz-cross' }), whisper, banner, arcs, actHint,
      h('div', { class: 'mz-bl' }, h('div', { class: 'mz-hp' }, h('small', {}, L({ it: 'vita', en: 'life' })), h('div', { class: 'mz-bar' }, hpFill), hpNum)),
      ammoEl, joy, fireBtn, actBtn, pauseBtn);
    const layer = h('div', { class: 'mz-layer' });
    const root = h('div', { class: 'mz' }, canvas, hudEl, layer);
    stage.replaceChildren(root);
    root.addEventListener('scroll', () => { root.scrollTop = 0; root.scrollLeft = 0; });

    const prog = loadProg();
    const run = { lives: LIVES, idx: 0, crossed: [], stats: {}, playing: false, over: false, levels: [], level: null };
    let whisperT = 8;

    // ---------- engine ----------
    const E = createEngine(canvas, {
      onHud(s) {
        hpFill.style.transform = `scaleX(${s.hp / s.maxHp})`;
        hpNum.textContent = s.hp;
        hudEl.classList.toggle('is-low', s.hp < s.maxHp * 0.3);
        ammoDots.replaceChildren(...Array.from({ length: s.max }, (_, k) => h('i', { class: k < s.ammo && !s.reloading ? 'is-full' : '' })));
        ammoEl.classList.toggle('is-reloading', !!s.reloading);
        ammoEl.classList.toggle('is-empty', !s.reloading && s.ammo === 0);
        if (s.goal) { goalCount.hidden = false; goalLabel.textContent = s.goal.label; goalNum.textContent = s.goal.value; } else goalCount.hidden = true;
        if (s.boss) { bossEl.hidden = false; bossName.textContent = s.boss.name; bossFill.style.transform = `scaleX(${s.boss.v})`; } else bossEl.hidden = true;
        // the rear-view mirror takes the top centre strip: push boss and level bars below it
        const rr = root.getBoundingClientRect();
        hudEl.style.setProperty('--rear-off', s.rear ? `${Math.round(rr.height * 0.03 + rr.width * 0.34 / 3 + 6)}px` : '0px');
        barsEl.replaceChildren(...s.bars.map((b) => h('div', { class: 'mz-xbar', style: { '--c': b.color || '#e8dcc0' } }, h('small', {}, b.label || b.id), h('div', { class: 'mz-bar' }, h('i', { style: { transform: `scaleX(${Math.max(0, Math.min(1, b.value ?? 0))})` } })))));
      },
      onKill({ boss, n, score }) {
        api.add(Math.round(60 * (1 + (n - 1) * 0.25) * (boss ? 12 : 1) * score));
        if (boss) vibrate([60, 40, 120]); else vibrate(12);
      },
      onEvent(kind, d) {
        if (kind === 'hurt') { vibrate(30); if (d?.ang != null) arc(d.ang); }
        if (kind === 'say') showBanner([h('span', {}, d.text)], d.ms);
        if (kind === 'whisper') say(d.text);
        if (kind === 'life') { run.lives = Math.min(MAX_LIVES, run.lives + 1); drawLives(true); }
        if (kind === 'action') setAction(d);
      },
      onWin(st) { setTimeout(() => cleared(st), 900); },
      onDeath(st) { run.playing = false; unlockPointer(); setTimeout(() => died(st), 1400); },
    });
    const ro = new ResizeObserver(() => { const r = root.getBoundingClientRect(); if (r.width > 0) { E.resize(r.width, r.height); E.render(); } });
    ro.observe(root);
    const r0 = root.getBoundingClientRect(); E.resize(r0.width || 800, r0.height || 500);
    root.classList.toggle('is-touch', isCoarse);
    E.run();

    function drawLives(pulse) {
      livesEl.replaceChildren(...Array.from({ length: Math.max(run.lives, LIVES) }, (_, k) => h('i', { class: k < run.lives ? 'is-on' : '' })));
      if (pulse) livesEl.animate?.([{ transform: 'scale(1.4)' }, { transform: 'none' }], { duration: 500 });
    }
    function setAction(cfg) {
      const label = L(cfg?.label);
      actBtn.hidden = !cfg || !isCoarse; actBtn.textContent = label;
      actHint.hidden = !cfg || isCoarse;
      actHint.textContent = cfg ? `${L({ it: 'tasto destro / Spazio', en: 'right click / Space' })}: ${label}` : '';
    }
    function showBanner(kids, ms = 3200) {
      banner.replaceChildren(...kids);
      banner.getAnimations?.().forEach((a) => a.cancel());
      banner.animate?.([{ opacity: 0, transform: 'translate(-50%, -40%) scale(.96)' }, { opacity: 1, transform: 'translate(-50%, -50%)', offset: 0.12 }, { opacity: 1, offset: 0.8 }, { opacity: 0, transform: 'translate(-50%, -56%)' }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    }
    // big reminder of what to do: at the start, on Tab / tap on the objective panel
    function showGoal(ms = 4200, withLevel = false) {
      const lv = run.level; if (!lv) return;
      showBanner([
        withLevel ? h('small', {}, L({ it: 'Livello', en: 'Level' })) : null,
        withLevel ? h('b', {}, String(lv.n)) : null,
        withLevel ? h('span', {}, L(lv.title)) : null,
        lv.goal ? h('strong', { class: 'mz-banner-goal' }, h('small', {}, L({ it: 'Obiettivo', en: 'Goal' })), L(lv.goal)) : null,
        lv.rule ? h('em', {}, L(lv.ruleShort || lv.rule)) : null,
      ], ms);
      objEl.animate?.([{ boxShadow: '0 0 0 2px var(--mz-accent, #ff5a4a)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1400 });
    }
    objEl.addEventListener('click', () => showGoal());
    function say(text) {
      const list = WHISPERS[lang()];
      whisper.textContent = text || list[Math.floor(Math.random() * list.length)];
      whisper.animate?.([{ opacity: 0, transform: 'translate(-50%, 6px)' }, { opacity: 0.85, transform: 'translate(-50%, 0)', offset: 0.2 }, { opacity: 0.85, offset: 0.7 }, { opacity: 0, transform: 'translate(-50%, -4px)' }], { duration: 3400, easing: 'ease-in-out' });
    }
    function arc(ang) {
      const a = h('i', { style: { transform: `rotate(${ang * 180 / Math.PI}deg)` } });
      arcs.append(a);
      a.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-in' });
      setTimeout(() => a.remove(), 900);
    }
    const wTimer = setInterval(() => {
      if (!run.playing || E.S.paused) return;
      if (--whisperT <= 0) { say(); whisperT = 12 + Math.random() * 12; }
    }, 1000);

    // ---------- screens ----------
    const card = (cls, ...kids) => { const c = h('div', { class: `mz-card ${cls}` }, ...kids); layer.replaceChildren(h('div', { class: 'mz-veil' }, c)); c.animate?.([{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }); return c; };
    const closeCard = () => layer.replaceChildren();
    const btn = (label, onclick, cls = '') => { const b = h('button', { class: `mz-cta ${cls}`, type: 'button' }, label); b.onclick = onclick; return b; };
    const artImg = (lv, cls = 'mz-art') => (lv.image ? h('img', { class: cls, src: lv.image, alt: `${L(lv.title)}, ${lv.artist}`, decoding: 'async' }) : h('div', { class: `${cls} mz-art--empty` }, '?'));

    function track(i) {
      return h('div', { class: 'mz-track', 'aria-hidden': 'true' }, PLAN.map((_, k) => h('i', { class: `${k < i ? 'is-past' : ''}${k === i ? ' is-now' : ''}${k >= 12 ? ' is-hard' : ''}` })));
    }

    function select() {
      hudEl.hidden = true; E.setPaused(true);
      const ready = LEVELS.filter((l) => l.ready);
      const grid = h('div', { class: 'mz-halls' }, LEVELS.map((lv, i) => h('div', { class: `mz-hall${lv.ready ? '' : ' is-locked'}${prog.restored.includes(lv.n) ? ' is-done' : ''}`, title: `${lv.n}. ${lv.artist} · ${L(lv.title)}` },
        lv.ready && lv.image && i <= prog.max ? h('img', { class: 'mz-hall-art', src: lv.image, alt: '', loading: 'lazy' }) : h('span', { class: 'mz-hall-art mz-hall-art--dark' }, lv.ready ? ROMAN(lv.n) : '…'),
        h('b', {}, String(lv.n)))));
      card('mz-card--select',
        h('small', { class: 'mz-kicker' }, L({ it: 'Il Museo Maledetto · 15 quadri', en: 'The Cursed Museum · 15 paintings' })),
        h('h2', {}, L({ it: 'Scendi nei quadri.', en: 'Descend into the paintings.' })),
        h('p', {}, L({ it: `Quindici opere vere, dalla più antica alla più feroce. In ognuna una mappa, dei mostri e una regola diversa. Hai ${LIVES} vite per tutta la discesa: finite quelle, si ricomincia dal primo quadro.`, en: `Fifteen real works, from the oldest to the most ferocious. Each one has its own map, monsters and rule. You have ${LIVES} lives for the whole descent: when they are gone, you start again from the first painting.` })),
        grid,
        ready.length < 15 ? h('p', { class: 'mz-fine' }, L({ it: `${15 - ready.length} quadri sono ancora in restauro: la discesa per ora attraversa quelli pronti.`, en: `${15 - ready.length} paintings are still being restored: for now the descent crosses the ready ones.` })) : null,
        h('div', { class: 'mz-row' },
          ready.length ? btn(L({ it: 'Inizia la discesa', en: 'Begin the descent' }) + ' →', () => begin()) : null,
          exampleMode || !ready.length ? btn(L({ it: 'Livello di prova', en: 'Test level' }), () => beginExample(), 'mz-cta--ghost') : null),
        h('p', { class: 'mz-fine' }, L({ it: 'Riproduzioni di opere in pubblico dominio, salvo dove indicato. Immagini disturbanti.', en: 'Reproductions of public-domain works unless stated. Disturbing imagery.' })));
    }

    function begin(i = 0) {
      run.levels = LEVELS.filter((l) => l.ready);
      Object.assign(run, { lives: LIVES, idx: i, crossed: [], over: false });
      return intro();
    }
    async function beginExample() {
      const ex = await loadExample();
      run.levels = [ex];
      Object.assign(run, { lives: LIVES, idx: 0, crossed: [], over: false });
      return intro();
    }

    async function intro(retry = false) {
      const lv = run.levels[run.idx];
      run.level = lv;
      hudEl.hidden = true;
      api.hud(L({ it: 'Livello', en: 'Level' }), `${lv.n}/15`);
      const loading = card('mz-card--loading', h('p', { class: 'mz-kicker' }, L({ it: 'Il quadro si apre…', en: 'The painting opens…' })));
      await loadImage(lv.image);
      if (run.over) return;
      await E.load(lv, lv.n, { lang: lang() });
      setAction(E.ctx._action || null);
      if (layer.firstChild?.firstChild !== loading) return;
      const skulls = Math.min(5, 1 + Math.floor((lv.n - 1) / 3));
      card(`mz-card--intro${lv.n >= 13 ? ' is-boss' : ''}`,
        h('div', { class: 'mz-frame' }, artImg(lv), lv.credit ? h('small', { class: 'mz-credit' }, L(lv.credit)) : null),
        h('div', { class: 'mz-info' },
          h('div', { class: 'mz-lvl-head' },
            h('span', { class: 'mz-lvl-big' }, h('small', {}, L({ it: 'Livello', en: 'Level' })), h('b', {}, String(lv.n)), h('i', {}, '/15')),
            h('span', { class: 'mz-threat', title: 'threat' }, '☠'.repeat(skulls) + '·'.repeat(5 - skulls))),
          track(lv.n - 1),
          h('p', { class: 'mz-artist' }, `${lv.artist} · ${lv.year}${lv.museum ? ' · ' + L(lv.museum) : ''}`),
          h('h2', {}, L(lv.title)),
          h('div', { class: 'mz-todo' },
            lv.goal ? h('div', { class: 'mz-todo-goal' }, h('small', {}, L({ it: 'Per vincere', en: 'To win' })), h('p', {}, L(lv.goal))) : null,
            lv.rule ? h('div', { class: 'mz-rule' }, h('small', {}, L({ it: 'La regola di questo quadro', en: 'The rule of this painting' })), h('p', {}, L(lv.rule))) : null,
            h('p', { class: 'mz-keys' }, controlsLine(E.ctx._action))),
          lv.intro ? h('p', { class: 'mz-note' }, L(lv.intro)) : null,
          h('div', { class: 'mz-lives-row' }, h('small', {}, retry ? L({ it: 'Ti restano', en: 'Lives left' }) : L({ it: 'Vite', en: 'Lives' })), livesEl.cloneNode(true)),
          h('div', { class: 'mz-row' },
            btn(retry ? L({ it: 'Rientra nel quadro', en: 'Enter the painting again' }) + ' →' : L({ it: `Entra nel livello ${lv.n}`, en: `Enter level ${lv.n}` }) + ' →', () => enter()))));
      drawLives();
      layer.querySelector('.mz-lives-row .mz-lives')?.replaceWith(livesEl.cloneNode(true));
    }

    function controlsLine(act) {
      const a = act ? L(act.label) : null;
      if (isCoarse) return L({ it: `Joystick a sinistra per muoverti, trascina a destra per guardare, FUOCO per sparare${a ? `, pulsante ${a} per l’azione` : ''}. Tocca l’obiettivo in alto per rileggerlo.`, en: `Left joystick to move, drag right to look, FIRE to shoot${a ? `, ${a} button for the action` : ''}. Tap the goal at the top to read it again.` });
      return L({ it: `WASD muoversi · mouse guardare · clic sinistro sparare · R ricaricare${a ? ` · tasto destro o Spazio: ${a}` : ''} · Tab rilegge l’obiettivo`, en: `WASD move · mouse look · left click shoot · R reload${a ? ` · right click or Space: ${a}` : ''} · Tab shows the goal again` });
    }
    function lockPointer() { if (isCoarse) return; try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch {} }
    function unlockPointer() { try { document.exitPointerLock?.(); } catch {} }

    function enter() {
      closeCard();
      const lv = run.level;
      hudEl.hidden = false;
      lvlNum.textContent = String(lv.n);
      lvlSub.textContent = `${lv.artist} · ${L(lv.title)}`;
      root.style.setProperty('--mz-accent', lv.accent || '#ff5a4a');
      drawLives();
      objGoal.textContent = lv.goal ? L(lv.goal) : '';
      objRule.textContent = lv.ruleShort || lv.rule ? L(lv.ruleShort || lv.rule) : '';
      objEl.querySelector('.mz-obj-r').hidden = objRule.hidden = !objRule.textContent;
      objEl.hidden = !objGoal.textContent && !objRule.textContent;
      showGoal(6500, true);
      E.audio.start(); E.audio.toll(98 - lv.n * 2);
      run.playing = true; whisperT = 10;
      E.setPaused(false);
      lockPointer(); stopKeys();
    }

    function pause() {
      if (!run.playing || E.S.paused || E.S.done || E.S.dead) return;
      E.setPaused(true); stopKeys();
      card('mz-card--pause',
        h('h2', {}, L({ it: 'Pausa', en: 'Paused' })),
        h('p', {}, L({ it: 'Il quadro aspetta. Non per sempre.', en: 'The painting waits. Not forever.' })),
        h('div', { class: 'mz-row' },
          btn(L({ it: 'Riprendi', en: 'Resume' }), () => { closeCard(); E.setPaused(false); lockPointer(); }),
          btn(L({ it: 'Esci e salva il punteggio', en: 'Quit and save score' }), () => finish(false), 'mz-cta--ghost')));
    }

    function cleared(st) {
      if (run.over) return;
      run.playing = false; unlockPointer(); stopKeys();
      const lv = run.level;
      api.hit(Math.min(1, 0.5 * (st.hp / st.maxHp) + 0.5 * Math.min(1, st.acc * 1.5)), { silent: true });
      const bonus = Math.round(400 * (1 + (lv.n - 1) * 0.3) + st.hp * 5);
      api.add(bonus);
      run.crossed.push(lv); run.stats[lv.n] = st;
      if (!prog.restored.includes(lv.n)) prog.restored.push(lv.n);
      prog.max = Math.max(prog.max, LEVELS.indexOf(lv) + 1);
      saveProg(prog);
      const last = run.idx >= run.levels.length - 1;
      const disc = lv.discovery || {};
      E.audio.toll(73);
      card('mz-card--clear',
        h('div', { class: 'mz-frame is-restored' }, disc.image ? h('img', { class: 'mz-art', src: disc.image, alt: '' }) : artImg(lv)),
        h('div', { class: 'mz-info' },
          h('small', { class: 'mz-kicker' }, `${L({ it: 'Livello', en: 'Level' })} ${lv.n} ${L({ it: 'attraversato', en: 'crossed' })}`),
          track(lv.n),
          h('p', { class: 'mz-artist' }, `${lv.artist} · ${lv.year}`),
          h('h2', {}, L(disc.title) || L(lv.title)),
          disc.text ? h('div', { class: 'mz-discovery' }, h('small', {}, L({ it: 'La scoperta', en: 'The discovery' })), h('p', {}, L(disc.text))) : null,
          disc.more ? h('p', { class: 'mz-fine' }, L(disc.more)) : null,
          h('div', { class: 'mz-stats' },
            h('div', {}, h('small', {}, L({ it: 'anime', en: 'souls' })), h('b', {}, st.kills)),
            h('div', {}, h('small', {}, L({ it: 'mira', en: 'aim' })), h('b', {}, Math.round(st.acc * 100) + '%')),
            h('div', {}, h('small', {}, L({ it: 'vita', en: 'life' })), h('b', {}, st.hp)),
            h('div', {}, h('small', {}, L({ it: 'tempo', en: 'time' })), h('b', {}, Math.round(st.time) + 's')),
            h('div', {}, h('small', {}, 'bonus'), h('b', {}, '+' + bonus))),
          h('div', { class: 'mz-row' },
            last ? btn(L({ it: 'Esci dal museo', en: 'Leave the museum' }) + ' →', () => finish(true)) : btn(L({ it: `Scendi al livello ${run.levels[run.idx + 1].n}`, en: `Go down to level ${run.levels[run.idx + 1].n}` }) + ' →', () => { run.idx++; intro(); }),
            btn(L({ it: 'Scarica il quadro', en: 'Download painting' }), () => saveSouvenir(lv), 'mz-cta--ghost'),
            btn(L({ it: 'Esci', en: 'Quit' }), () => finish(false), 'mz-cta--ghost'))));
    }
    async function saveSouvenir(lv) {
      const img = await loadImage(lv.image);
      souvenir(lv, img, store.name, lang(), run.stats[lv.n]).toBlob((b) => download(`occhio-museo-${lv.n}-${(lv.id || 'quadro')}.png`, b), 'image/png');
    }

    function died() {
      if (run.over) return;
      unlockPointer(); stopKeys();
      run.lives--;
      drawLives(true);
      const lv = run.level;
      if (run.lives > 0) {
        card('mz-card--dead',
          h('small', { class: 'mz-kicker' }, `${L({ it: 'Livello', en: 'Level' })} ${lv.n} / 15`),
          h('h2', {}, L(lv.deathLine) || L({ it: 'Il quadro ti ha preso.', en: 'The painting took you.' })),
          h('div', { class: 'mz-lives-row' }, h('small', {}, L({ it: 'Ti restano', en: 'Lives left' })), livesEl.cloneNode(true)),
          h('div', { class: 'mz-row' }, btn(L({ it: 'Riprova questo livello', en: 'Retry this level' }) + ' →', () => intro(true)), btn(L({ it: 'Arrenditi', en: 'Give up' }), () => finish(false), 'mz-cta--ghost')));
      } else {
        card('mz-card--dead is-final',
          h('small', { class: 'mz-kicker' }, L({ it: 'Nessuna vita', en: 'No lives left' })),
          h('h2', {}, L({ it: 'Il museo ti ha incorniciato.', en: 'The museum framed you.' })),
          h('p', {}, L({ it: `Ora sei appeso anche tu, dentro ${L(lv.title)}. La prossima discesa riparte dal primo quadro.`, en: `Now you hang there too, inside ${L(lv.title)}. The next descent starts from the first painting.` })),
          h('div', { class: 'mz-row' }, btn(L({ it: 'Vedi il risultato', en: 'See results' }), () => finish(false))));
      }
    }

    function finish(won) {
      if (run.over) return;
      run.over = true; run.playing = false;
      E.setPaused(true); unlockPointer();
      if (!run.crossed.length) api.hit(0, { silent: true, quiet: true });
      closeCard(); hudEl.hidden = true;
      const exports = run.crossed.slice(-8).map((lv) => ({ label: `${lv.n} · ${lv.artist.split(' ').pop()} · PNG`, run: () => saveSouvenir(lv) }));
      const summary = run.crossed.length
        ? L({ it: `Quadri attraversati: ${run.crossed.length}${won ? ' · SEI USCITO DAL MUSEO' : ''}`, en: `Paintings crossed: ${run.crossed.length}${won ? ' · YOU LEFT THE MUSEUM' : ''}` })
        : L({ it: 'Nessun quadro attraversato. Il museo ride.', en: 'No painting crossed. The museum laughs.' });
      api.end({ exports, summary });
    }

    // ---------- input ----------
    const I = E.input;
    const keys = new Set();
    let mouseFire = false;
    function stopKeys() { keys.clear(); mouseFire = false; Object.assign(I, { fwd: 0, strafe: 0, fire: false, alt: false }); }
    const applyKeys = () => {
      if (touch.joy != null) return;
      I.fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      I.strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      I.fire = mouseFire || touch.fire || keys.has('Enter');
    };
    const setAlt = (v) => { if (v && !I.alt) I.altPressed = true; I.alt = v; };
    const onKey = (e) => {
      if (!run.playing) return;
      const down = e.type === 'keydown';
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) { e.preventDefault(); down ? keys.add(e.code) : keys.delete(e.code); applyKeys(); }
      if (e.code === 'Space' || e.code === 'KeyF') { e.preventDefault(); if (!e.repeat) setAlt(down); }
      if (down && e.code === 'KeyR' && !e.repeat) I.reload = true;
      if (down && (e.code === 'Escape' || e.code === 'KeyP')) pause();
      if (down && (e.code === 'Tab' || e.code === 'KeyH') && !e.repeat) { e.preventDefault(); if (run.playing) showGoal(); }
    };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    const locked = () => document.pointerLockElement === canvas;
    const onMouseMove = (e) => {
      if (!run.playing || E.S.paused || e.pointerType !== 'mouse') return;
      if (locked()) { I.lookX += (e.movementX || 0) * 0.0024; I.lookY += (e.movementY || 0) * 0.0024; }
    };
    document.addEventListener('pointermove', onMouseMove);
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || !run.playing || E.S.paused) return;
      if (!locked()) lockPointer();
      if (e.button === 2) setAlt(true); else { mouseFire = true; applyKeys(); }
    });
    const onUp = (e) => { if (e.pointerType !== 'mouse') return; if (e.button === 2) setAlt(false); else { mouseFire = false; applyKeys(); } };
    window.addEventListener('pointerup', onUp);
    let hadLock = false;
    const onLock = () => { if (locked()) { hadLock = true; return; } if (hadLock && run.playing && !isCoarse) pause(); hadLock = false; };
    document.addEventListener('pointerlockchange', onLock);
    const onVis = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis);

    const touch = { joy: null, look: null, fire: false, jx: 0, jy: 0, lx: 0, ly: 0 };
    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !run.playing || E.S.paused) return;
      if (e.target.closest('.mz-btn, .mz-pause-btn, .mz-card, .mz-ammo')) return;
      const r = root.getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.45 && touch.joy == null) {
        touch.joy = e.pointerId; touch.jx = e.clientX; touch.jy = e.clientY;
        joy.hidden = false; joy.style.left = `${e.clientX - r.left}px`; joy.style.top = `${e.clientY - r.top}px`; knob.style.transform = 'translate(-50%,-50%)';
      } else if (touch.look == null) { touch.look = e.pointerId; touch.lx = e.clientX; touch.ly = e.clientY; }
      try { root.setPointerCapture(e.pointerId); } catch {}
    });
    root.addEventListener('pointermove', (e) => {
      if (e.pointerId === touch.joy) {
        const R = 46; let dx = e.clientX - touch.jx, dy = e.clientY - touch.jy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        I.fwd = -dy / R; I.strafe = dx / R;
      } else if (e.pointerId === touch.look) {
        I.lookX += (e.clientX - touch.lx) * 0.0068; I.lookY += (e.clientY - touch.ly) * 0.005; touch.lx = e.clientX; touch.ly = e.clientY;
      }
    });
    const endTouch = (e) => {
      if (e.pointerId === touch.joy) { touch.joy = null; joy.hidden = true; I.fwd = 0; I.strafe = 0; }
      if (e.pointerId === touch.look) touch.look = null;
    };
    root.addEventListener('pointerup', endTouch); root.addEventListener('pointercancel', endTouch);
    const hold = (el, on, off) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); on(); try { el.setPointerCapture(e.pointerId); } catch {} }); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off); };
    hold(fireBtn, () => { touch.fire = true; I.fire = true; }, () => { touch.fire = false; I.fire = mouseFire; });
    hold(actBtn, () => { setAlt(true); vibrate(20); }, () => setAlt(false));
    pauseBtn.addEventListener('click', () => pause());
    ammoEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); I.reload = true; });
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    // test hooks
    window.__museum = {
      engine: E, run,
      async start(i = 0, example = false) { if (example) await beginExample(i); else await begin(i); enter(); unlockPointer(); },
      killAll: () => E.killAll(), step: (n) => E.step(n), win: () => E.ctx?.win(),
      getState: () => ({ n: run.level?.n, lives: run.lives, playing: run.playing, hp: E.ctx?.player.hp, alive: E.ctx?.monsters.alive, kills: E.S.kills, done: E.S.done, dead: E.S.dead, frameMs: E.S.frameMs, over: run.over }),
    };

    drawLives();
    select();
    api.onCleanup(() => {
      clearInterval(wTimer); ro.disconnect(); E.destroy();
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      document.removeEventListener('pointermove', onMouseMove); window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('visibilitychange', onVis);
      unlockPointer();
      if (window.__museum?.engine === E) delete window.__museum;
    });
  },
};
