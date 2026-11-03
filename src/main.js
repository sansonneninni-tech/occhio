import './style.css';
import './museum-hero.css';
import { h } from './core/dom.js';
import { t, getLang, setLang, onLang, UI } from './core/i18n.js';
import { store } from './core/store.js';
import { sfx, animate } from './core/fx.js';
import { GAMES, CATS, MUSEUM, ALL } from './games/index.js';
import { openGame } from './core/shell.js';

const app = document.getElementById('app');
let closeCurrent = null;
let filter = 'all';
try { filter = sessionStorage.getItem('occhio:filter') || 'all'; } catch {}

function topbar() {
  const langBtn = h('button', { class: 'pill', type: 'button', 'aria-label': 'Lingua / Language' }, getLang() === 'it' ? 'IT · en' : 'it · EN');
  langBtn.onclick = () => { setLang(getLang() === 'it' ? 'en' : 'it'); render(); };
  const mute = h('button', { class: 'pill', type: 'button', 'aria-pressed': String(!store.muted) }, `${t('sound')} ${store.muted ? 'OFF' : 'ON'}`);
  mute.onclick = () => { store.muted = !store.muted; mute.textContent = `${t('sound')} ${store.muted ? 'OFF' : 'ON'}`; if (!store.muted) sfx.tap(); };
  return h('header', { class: 'top' },
    h('a', { class: 'logo', href: '#/', 'aria-label': 'Occhio' }, logoMark(), h('span', {}, 'OCCHIO')),
    h('div', { class: 'top-right' }, mute, langBtn)
  );
}

function logoMark() {
  return h('span', { class: 'logo-mark', 'aria-hidden': 'true', html: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0E0E10"/><circle cx="20" cy="20" r="11" fill="#F3EFE6"/><circle class="pupil" cx="20" cy="20" r="6" fill="#FF4D1F"/></svg>' });
}

function entry() {
  const input = h('input', { class: 'name-input', maxlength: 16, placeholder: t('namePh'), value: store.name || '', autocomplete: 'nickname', 'aria-label': t('namePh'), enterkeyhint: 'go' });
  const go = h('button', { class: 'btn btn--big btn--ink', type: 'submit' }, t('play'), h('span', { html: '&rarr;' }));
  const form = h('form', { class: 'entry-form' }, input, go);
  form.onsubmit = (e) => {
    e.preventDefault();
    const n = input.value.trim();
    if (!n) { input.focus(); animate(form, [{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 260, fill: 'none' }); return; }
    store.name = n;
    sfx.start();
    if (location.hash === '#/games') navigate(); else location.hash = '#/games';
  };
  const blobs = h('div', { class: 'blobs', 'aria-hidden': 'true' }, ...['red', 'blue', 'yellow', 'pink', 'green'].map((c) => h('i', { class: `blob blob--${c}` })));
  const view = h('main', { class: 'entry' },
    blobs,
    topbar(),
    h('div', { class: 'entry-center' },
      h('h1', { class: 'mega' }, ...'OCCHIO'.split('').map((c, i) => h('span', { style: { '--i': i } }, c))),
      h('p', { class: 'entry-title' }, t('enterTitle')),
      h('p', { class: 'entry-sub' }, t('enterSub')),
      form
    ),
    marquee()
  );
  app.replaceChildren(view);
  setTimeout(() => input.focus({ preventScroll: true }), 300);
}

function marquee() {
  const txt = t('marquee').repeat(4);
  return h('div', { class: 'marquee', 'aria-hidden': 'true' }, h('div', { class: 'marquee-track' }, h('span', {}, txt), h('span', {}, txt)));
}

function dashboard() {
  const { sum, played } = store.totals();
  const cats = ['all', 'colore', 'design', '3d', 'arte'];
  const grid = h('div', { class: 'grid' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, cats.map((c) => {
    const n = c === 'all' ? GAMES.length : GAMES.filter((g) => g.cat === c).length;
    const b = h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(filter === c), style: c !== 'all' ? { '--cat': CATS[c].color, '--cat-ink': CATS[c].ink } : {} }, t(c), h('sup', {}, n));
    b.onclick = () => {
      filter = c;
      try { sessionStorage.setItem('occhio:filter', c); } catch {}
      tabs.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      fill();
    };
    return b;
  }));

  function fill() {
    const list = GAMES.filter((g) => filter === 'all' || g.cat === filter);
    grid.replaceChildren(...list.map((g, i) => card(g, GAMES.indexOf(g))));
    [...grid.children].forEach((c, i) => animate(c, [{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: Math.min(i, 12) * 35 }));
  }

  const view = h('main', { class: 'dash' },
    topbar(),
    h('section', { class: 'dash-hero' },
      h('div', { class: 'dash-hello' },
        h('h1', {}, t('hello', { name: store.name })),
        h('a', { href: '#/', class: 'link', onclick: (e) => { e.preventDefault(); store.name = ''; location.hash = '#/'; render(); } }, t('change'))
      ),
      h('div', { class: 'dash-stats' },
        h('div', { class: 'stat stat--red' }, h('small', {}, t('totalScore')), h('b', {}, sum.toLocaleString())),
        h('div', { class: 'stat stat--blue' }, h('small', {}, t('played')), h('b', {}, `${played}/${ALL.length}`))
      )
    ),
    museumHero(),
    marquee(),
    h('div', { class: 'dash-body' }, tabs, grid),
    h('footer', { class: 'foot' }, h('span', {}, 'OCCHIO © ' + new Date().getFullYear()), h('a', { class: 'link', href: 'https://github.com/sansonneninni-tech/occhio/blob/main/docs/game-design.md', target: '_blank', rel: 'noopener' }, t('rules')))
  );
  app.replaceChildren(view);
  fill();
}

function museumHero() {
  const g = MUSEUM;
  const best = store.best(g.id);
  let prog = { max: 0, restored: [] };
  try { prog = { ...prog, ...JSON.parse(localStorage.getItem('occhio:museo2') || '{}') }; } catch {}
  const done = prog.restored.length;
  // cornice di lampadine attorno all'insegna: 4 lati
  const bulbs = (n, side) => h('div', { class: `mh-bulbs mh-bulbs--${side}`, 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('i', { style: { '--k': i % 3 } })));
  // 15 lampadine = 15 quadri: accese quelle già attraversate
  const track = h('div', { class: 'mh-progress', role: 'img', 'aria-label': `${done}/15 ${t('mzHalls')}` },
    Array.from({ length: 15 }, (_, i) => h('i', { class: prog.restored.includes(i + 1) ? 'on' : '' })));
  return h('a', { class: 'mh', href: `#/play/${g.id}` },
    h('div', { class: 'mh-awning', 'aria-hidden': 'true' }),
    h('div', { class: 'mh-inner' },
      h('div', { class: 'mh-front' },
        h('div', { class: 'mh-sign' },
          bulbs(16, 'top'), bulbs(16, 'bottom'), bulbs(4, 'left'), bulbs(4, 'right'),
          h('span', { class: 'mh-plaque' }, t('mzKicker')),
          h('h2', { class: 'mh-title' }, ...titleLines(t(g.title)))),
        h('p', { class: 'mh-tag' }, t(g.tagline)),
        h('div', { class: 'mh-foot' },
          h('span', { class: 'mh-ticket' },
            h('small', {}, t('mzAdmit')),
            h('b', {}, t('mzEnter')),
            h('em', {}, t('mzRide'))),
          h('div', { class: 'mh-score' },
            track,
            h('p', {}, h('b', {}, `${done}/15`), ' ', t('mzHalls'), best ? [h('span', { class: 'mh-sep' }), h('b', {}, best.score.toLocaleString()), ' ', t('best')] : null))),
        h('p', { class: 'mh-warn' }, t('mzWarn'))),
      h('div', { class: 'mh-door', 'aria-hidden': 'true' },
        h('div', { class: 'mh-frame' }, h('img', { src: '/home/saturno.webp', alt: '', width: 640, height: 754, decoding: 'async' })),
        h('div', { class: 'mh-rails', html: railsSvg() }))));
}

// "Il Museo Maledetto" -> riga piccola + parola grande, come le insegne da baraccone
function titleLines(title) {
  const words = title.split(' ');
  const last = words.pop();
  return [h('span', { class: 'mh-title-s' }, words.join(' ')), h('span', { class: 'mh-title-l' }, last)];
}

function railsSvg() {
  const ties = Array.from({ length: 7 }, (_, i) => {
    const y = 6 + i * i * 2.1 + i * 4;
    const w = 52 + y * 1.3;
    return `<rect x="${150 - w / 2}" y="${y}" width="${w}" height="${3 + i * 0.9}" fill="#5a3a26"/>`;
  }).join('');
  return `<svg viewBox="0 0 300 150" preserveAspectRatio="none"><g>${ties}</g><path d="M122 0 L28 150 M178 0 L272 150" stroke="#cfc4ae" stroke-width="3.5" fill="none"/><path d="M122 0 L28 150 M178 0 L272 150" stroke="#000" stroke-width="1" fill="none" transform="translate(2 0)" opacity=".5"/></svg>`;
}

function card(g, idx) {
  const cat = CATS[g.cat];
  const best = store.best(g.id);
  return h('a', { class: 'card', href: `#/play/${g.id}`, style: { '--cat': cat.color, '--cat-ink': cat.ink } },
    h('div', { class: 'card-thumb', html: g.thumb ? g.thumb() : '' }),
    h('div', { class: 'card-body' },
      h('div', { class: 'card-meta' }, h('span', {}, String(idx + 1).padStart(2, '0')), h('span', {}, t(cat.label))),
      h('h2', {}, t(g.title)),
      h('p', {}, t(g.tagline)),
      h('div', { class: 'card-best' }, best ? [h('small', {}, t('best')), h('b', {}, best.score.toLocaleString()), h('i', {}, best.rank)] : h('small', {}, t('notPlayed')))
    )
  );
}

function play(id) {
  const g = ALL.find((x) => x.id === id);
  if (!g) { location.hash = '#/games'; return; }
  closeCurrent = openGame(app, g, {});
  document.title = `${t(g.title)} · Occhio`;
}

function render() {
  closeCurrent?.();
  closeCurrent = null;
  document.title = 'Occhio · mini giochi per l’occhio';
  const hash = location.hash.replace(/^#/, '') || '/';
  window.scrollTo(0, 0);
  if (!store.name) return entry();
  const m = hash.match(/^\/play\/([\w-]+)/);
  if (m) return play(m[1]);
  return dashboard();
}

function navigate() {
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(() => render());
  } else render();
}

window.addEventListener('hashchange', navigate);
render();
