// Runs one game: intro, play loop with score/combo/timer, results with records and downloads.
import { h } from './dom.js';
import { t } from './i18n.js';
import { store } from './store.js';
import { sfx, vibrate, floatText, stamp, animate, confetti, countUp, pulse, shake } from './fx.js';
import { scoreCard, download } from './export.js';
import { CATS } from '../games/index.js';

export function rankOf(acc) {
  if (acc >= 0.9) return 'S';
  if (acc >= 0.78) return 'A';
  if (acc >= 0.62) return 'B';
  if (acc >= 0.45) return 'C';
  return 'D';
}

export function openGame(root, game, { onExit }) {
  const cat = CATS[game.cat];
  const el = h('section', { class: 'play', style: { '--cat': cat.color, '--cat-ink': cat.ink } });
  const roundEl = h('b', {}, '–');
  const roundLabel = h('small', {}, t('round'));
  const scoreEl = h('b', { class: 'hud-score' }, '0');
  const comboEl = h('div', { class: 'hud-combo' }, '×1');
  const timerFill = h('i');
  const timerEl = h('div', { class: 'timer' }, timerFill);
  const stage = h('div', { class: 'g-stage' });
  const top = h('header', { class: 'play-top' },
    h('a', { class: 'icon-btn', href: '#/', 'aria-label': t('back') }, h('span', { html: '&larr;' })),
    h('div', { class: 'play-title' }, h('small', {}, t(cat.label)), h('span', {}, t(game.title))),
    h('div', { class: 'hud' },
      h('div', { class: 'hud-item' }, roundLabel, roundEl),
      h('div', { class: 'hud-item' }, h('small', {}, t('score')), scoreEl),
      comboEl)
  );
  el.append(top, timerEl, stage);
  root.replaceChildren(el);

  let run = null;

  function intro() {
    const best = store.best(game.id);
    const ov = h('div', { class: 'overlay overlay--intro' },
      h('div', { class: 'intro-card' },
        h('div', { class: 'intro-thumb', html: game.thumb ? game.thumb() : '' }),
        h('div', { class: 'intro-body' },
          h('span', { class: 'tag' }, t(cat.label)),
          h('h1', {}, t(game.title)),
          h('p', { class: 'lead' }, t(game.tagline)),
          h('h3', {}, t('howTo')),
          h('ul', { class: 'how' }, t(game.how).split('|').map((l) => h('li', {}, l))),
          h('div', { class: 'intro-foot' },
            best ? h('div', { class: 'best-chip' }, h('small', {}, t('yourBest')), h('b', {}, best.score.toLocaleString()), h('i', {}, best.rank)) : null,
            (() => { const b = h('button', { class: 'btn btn--big', type: 'button' }, t('start'), h('span', { html: '&rarr;' })); b.onclick = () => { ov.remove(); start(); }; setTimeout(() => b.focus(), 50); return b; })()
          )
        )
      )
    );
    el.append(ov);
    animate(ov.firstChild, [{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420 });
  }

  function start() {
    run?.destroy();
    run = createRun();
    sfx.start();
  }

  function createRun() {
    let score = 0, combo = 0, maxCombo = 0, destroyed = false, ended = false;
    const qualities = [];
    const cleanups = [];
    const timeouts = new Set();
    let timerAnim = null, timerStart = 0, timerDur = 0, timerTO = null;
    scoreEl.textContent = '0';
    comboEl.textContent = '×1';
    comboEl.classList.remove('is-hot');
    stage.replaceChildren();
    stage.className = 'g-stage';

    const stopTimer = () => {
      if (!timerDur) return 1;
      const rem = Math.max(0, 1 - (performance.now() - timerStart) / timerDur);
      timerAnim?.pause();
      clearTimeout(timerTO);
      timerDur = 0;
      timerEl.classList.remove('is-urgent');
      return rem;
    };

    const api = {
      t,
      get lang() { return document.documentElement.lang; },
      get destroyed() { return destroyed; },
      onCleanup: (fn) => cleanups.push(fn),
      wait: (ms) => new Promise((res) => {
        const id = setTimeout(() => { timeouts.delete(id); if (!destroyed) res(); }, ms);
        timeouts.add(id);
      }),
      round(i, n) { roundLabel.textContent = t('round'); roundEl.textContent = `${i}/${n}`; pulse(roundEl, 1.2); },
      // Custom HUD slot (lives, wave, time…).
      hud(label, value, doPulse = true) { roundLabel.textContent = label; roundEl.textContent = value; if (doPulse) pulse(roundEl, 1.2); },
      // Add raw points (for continuous games), with optional floating label.
      add(pts, { x, y, color } = {}) {
        score += Math.round(pts);
        scoreEl.textContent = score.toLocaleString();
        if (x != null) floatText(stage, `+${Math.round(pts)}`, x, y, color || 'var(--ink)');
      },
      get score() { return score; },
      get combo() { return combo; },
      timer(sec, onTimeout) {
        stopTimer();
        timerDur = sec * 1000;
        timerStart = performance.now();
        timerAnim?.cancel();
        timerAnim = timerFill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: timerDur, easing: 'linear', fill: 'forwards' });
        const urgentId = setTimeout(() => timerEl.classList.add('is-urgent'), timerDur * 0.7);
        timeouts.add(urgentId);
        timerTO = setTimeout(() => {
          if (destroyed || !timerDur) return;
          timerDur = 0;
          timerEl.classList.remove('is-urgent');
          stamp(stage, t('timeUp'), 'bad');
          sfx.bad(); vibrate(60);
          onTimeout?.();
        }, timerDur);
        return { stop: stopTimer };
      },
      stopTimer,
      // Register a result. q in 0..1, speed in 0..1 (remaining time). Returns points earned.
      hit(q, { x, y, speed = 0, silent = false, quiet = false } = {}) {
        q = Math.max(0, Math.min(1, q));
        qualities.push(q);
        if (q >= 0.8) combo++;
        else if (q < 0.5) combo = 0;
        maxCombo = Math.max(maxCombo, combo);
        const mult = 1 + Math.min(4, Math.floor(combo / 2)) * 0.5;
        const pts = Math.round((q * 100 + (q > 0.35 ? speed * 40 : 0)) * mult);
        score += pts;
        scoreEl.textContent = score.toLocaleString();
        pulse(scoreEl, 1.25);
        comboEl.textContent = `×${mult}`;
        comboEl.classList.toggle('is-hot', mult > 1);
        if (mult > 1 && q >= 0.8) { pulse(comboEl, 1.35); sfx.combo(combo); }
        const r = stage.getBoundingClientRect();
        const px = x ?? r.width / 2, py = y ?? r.height * 0.4;
        if (pts > 0 || !silent) floatText(stage, `+${pts}`, px, py, q >= 0.8 ? 'var(--green-ink)' : q >= 0.5 ? 'var(--ink)' : 'var(--red)');
        if (!silent) {
          const [label, kind] = q >= 0.95 ? ['perfect', 'great'] : q >= 0.8 ? ['great', 'great'] : q >= 0.6 ? ['good', 'good'] : q >= 0.35 ? ['close', 'ok'] : ['miss', 'bad'];
          stamp(stage, t(label), kind);
        }
        if (quiet) {}
        else if (q >= 0.8) { sfx.great(); vibrate(18); }
        else if (q >= 0.5) { sfx.good(); vibrate(10); }
        else { sfx.bad(); vibrate([30, 40, 30]); shake(stage); }
        return pts;
      },
      end({ exports = [], summary } = {}) {
        if (ended || destroyed) return;
        ended = true;
        stopTimer();
        const acc = qualities.length ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
        results({ score, acc, maxCombo, exports, summary });
      },
    };

    Promise.resolve(game.mount(stage, api)).catch((err) => {
      console.error(err);
      stage.replaceChildren(h('p', { class: 'g-hint' }, String(err)));
    });
    setTimeout(() => !destroyed && stamp(stage, t('go'), 'great'), 60);

    return {
      destroy() {
        destroyed = true;
        stopTimer();
        timerAnim?.cancel();
        timeouts.forEach(clearTimeout);
        cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
        el.querySelectorAll('.overlay--results').forEach((n) => n.remove());
      },
    };
  }

  function results({ score, acc, maxCombo, exports, summary }) {
    const rank = rankOf(acc);
    const name = store.name || '—';
    const { isRecord, prevBest, rec } = store.record(game.id, { name, score, rank, acc });
    const board = store.board(game.id).slice(0, 5);
    const scoreBig = h('b', { class: 'res-score' }, '0');
    const allExports = [
      ...exports,
      { label: t('card'), run: async () => download(`occhio-${game.id}-${score}.png`, await scoreCard({ title: t(game.title), score, rank, name, color: cat.color, ink: cat.ink, accuracy: acc })) },
    ];
    const ov = h('div', { class: 'overlay overlay--results' },
      h('div', { class: 'res-card' },
        h('div', { class: 'res-rank' }, h('span', { class: 'res-letter' }, rank), isRecord && prevBest ? h('em', { class: 'res-record' }, t('newRecord')) : null),
        h('div', { class: 'res-body' },
          h('small', { class: 'tag' }, t(game.title)),
          scoreBig,
          h('div', { class: 'res-stats' },
            h('div', {}, h('small', {}, t('accuracy')), h('b', {}, Math.round(acc * 100) + '%')),
            h('div', {}, h('small', {}, t('combo')), h('b', {}, maxCombo)),
            h('div', {}, h('small', {}, t('yourBest')), h('b', {}, Math.max(score, prevBest?.score ?? 0).toLocaleString()))
          ),
          summary ? h('div', { class: 'res-summary' }, summary) : null,
          h('h3', {}, t('leaderboard')),
          h('ol', { class: 'lb' }, board.map((r) => h('li', { class: r.date === rec.date ? 'is-me' : '' }, h('span', {}, r.name), h('i', {}, r.rank), h('b', {}, r.score.toLocaleString())))),
          h('h3', {}, t('downloads')),
          h('div', { class: 'dl' }, allExports.map((x) => { const b = h('button', { class: 'chip', type: 'button' }, x.label); b.onclick = () => x.run(); return b; })),
          h('div', { class: 'res-actions' },
            (() => { const b = h('button', { class: 'btn btn--big', type: 'button' }, t('again'), h('span', { html: '&#8635;' })); b.onclick = () => { ov.remove(); start(); }; setTimeout(() => b.focus(), 60); return b; })(),
            h('a', { class: 'btn btn--ghost', href: '#/' }, t('back'))
          )
        )
      )
    );
    el.append(ov);
    animate(ov.firstChild, [{ transform: 'translateY(40px) scale(.97)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480 });
    const letter = ov.querySelector('.res-letter');
    animate(letter, [{ transform: 'scale(3) rotate(-14deg)', opacity: 0 }, { transform: 'scale(1) rotate(-4deg)', opacity: 1 }], { duration: 560, delay: 200, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    countUp(scoreBig, score, 1000);
    if (isRecord && prevBest) { sfx.record(); confetti(el, 90); } else { sfx.end(); if (rank === 'S' || rank === 'A') confetti(el, 50); }
  }

  intro();
  return () => run?.destroy();
}
