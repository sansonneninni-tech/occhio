import { h, rand, pick } from '../core/dom.js';
import { arcadeLayout, loop, toStage } from '../core/arcade.js';
import { download } from '../core/export.js';
import { store } from '../core/store.js';
import { shake, vibrate, stamp, sfx } from '../core/fx.js';

const TIME = 60;
const PW = 1500, PH = 2000; // poster size
const COLS = ['#0000FF', '#FF0000', '#FFFF00', '#00FF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000'];
const FONTS = ['"Times New Roman", Times, serif', '"Courier New", Courier, monospace', '"Arial Black", "Archivo", Arial, sans-serif', 'Impact, "Arial Narrow", sans-serif'];
const ink = (c) => (['#0000FF', '#FF0000', '#000000', '#FF00FF'].includes(c) ? '#FFFFFF' : '#000000');

const CSS = `
.pb-desk{position:absolute;inset:0;z-index:0;isolation:isolate;overflow:hidden;background:#C0C0C0;font-family:"Times New Roman",Times,serif;color:#000;
  background-image:linear-gradient(#0000 calc(100% - 1px),#0003 0),linear-gradient(90deg,#0000 calc(100% - 1px),#0003 0);background-size:40px 40px}
.pb-mega{position:absolute;left:-2%;top:2%;font:900 clamp(60px,17vw,260px)/.8 "Arial Black","Archivo",Impact,sans-serif;letter-spacing:-.06em;color:#0000FF;mix-blend-mode:multiply;pointer-events:none;white-space:nowrap}
.pb-mega2{position:absolute;right:-1%;bottom:12%;font:italic 400 clamp(40px,10vw,150px)/.9 "Times New Roman",serif;color:#FF0000;pointer-events:none;white-space:nowrap}
.pb-links{position:absolute;left:12px;bottom:56px;font:16px/1.4 "Times New Roman",serif;pointer-events:none}
.pb-links a{color:#0000EE;text-decoration:underline;display:block}
.pb-marq{position:absolute;left:0;right:0;bottom:0;height:34px;background:#000;color:#00FF00;font:700 15px/34px "Courier New",monospace;white-space:nowrap;overflow:hidden;pointer-events:none}
.pb-marq span{display:inline-block;animation:pbm 9s linear infinite;padding-left:100%}
@keyframes pbm{to{transform:translateX(-100%)}}
.pb-ram{position:absolute;right:10px;top:10px;width:min(46%,260px);height:30px;border:3px solid #000;background:#fff;font:700 13px/24px "Courier New",monospace;z-index:9000;pointer-events:none}
.pb-ram i{position:absolute;inset:0;width:0;background:#00FF00;transition:width .2s}
.pb-ram b{position:relative;padding-left:6px}
.pb-ram.is-hot i{background:#FF0000}
.pb-trash{position:absolute;right:10px;bottom:44px;width:78px;height:86px;border:3px dashed #000;background:#FFFF00;display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 11px "Courier New",monospace;z-index:8000;pointer-events:none}
.pb-trash svg{width:40px;height:44px}
.pb-trash.is-over{background:#00FF00;transform:scale(1.12)}
.pb-win{position:absolute;border:3px solid #000;box-shadow:8px 8px 0 #000;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;touch-action:none;animation:pbin .14s steps(3) both}
@keyframes pbin{from{transform:scale(.2) rotate(-6deg);opacity:0}}
.pb-bar{display:flex;align-items:center;gap:6px;height:34px;padding:0 0 0 8px;border-bottom:3px solid #000;font:700 14px/1 "Courier New",monospace;text-transform:uppercase;white-space:nowrap;overflow:hidden}
.pb-bar span{flex:1;overflow:hidden;text-overflow:ellipsis}
.pb-x{flex:none;width:44px;height:34px;border:0;border-left:3px solid #000;background:#FF0000;color:#fff;font:900 22px/1 Arial,sans-serif;cursor:pointer;padding:0}
.pb-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px;text-align:center;line-height:.95}
.pb-body p{margin:0}
.pb-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.pb-btn{min-width:72px;min-height:44px;padding:0 12px;border:3px solid #000;background:#fff;color:#000;font:700 15px "Courier New",monospace;cursor:pointer;box-shadow:4px 4px 0 #000}
.pb-btn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 #000}
.pb-win.is-drag{cursor:grabbing;opacity:.85;box-shadow:16px 16px 0 #000}
.pb-win.k-trash{cursor:grab}
.pb-win.k-virus{animation:pbin .14s steps(3) both,pbv .18s steps(2) infinite}
@keyframes pbv{50%{filter:invert(1)}}
.pb-count{font:900 46px/1 "Arial Black",Impact,sans-serif}
.pb-bsod{position:absolute;inset:0;z-index:9999;background:#0000AA;color:#fff;font:700 18px/1.4 "Courier New",monospace;padding:8%;display:flex;flex-direction:column;justify-content:center}
.pb-bsod b{background:#fff;color:#0000AA;padding:0 6px;align-self:flex-start;margin-bottom:16px}
`;

const T = {
  close: [{ it: 'CHIUDIMI', en: 'CLOSE ME' }, { it: 'SONO INUTILE', en: 'I AM USELESS' }, { it: 'HAI VINTO UN IPHONE', en: 'YOU WON AN IPHONE' }, { it: 'AGGIORNA ORA', en: 'UPDATE NOW' }, { it: 'ISCRIVITI ALLA NEWSLETTER', en: 'JOIN THE NEWSLETTER' }],
  trash: [{ it: 'TRASCINAMI NEL CESTINO', en: 'DRAG ME TO THE BIN' }, { it: 'BUTTAMI VIA', en: 'THROW ME AWAY' }],
  dont: [{ it: 'NON TOCCARMI', en: 'DON’T TOUCH ME' }],
  virus: [{ it: 'VIRUS.EXE · CLICCA 3 VOLTE', en: 'VIRUS.EXE · CLICK 3 TIMES' }],
};

export default {
  id: 'popup-brutale',
  cat: 'folle',
  title: { it: 'Pop-up Brutale', en: 'Brutal Pop-up' },
  tagline: { it: 'Internet anni 90 ti esplode in faccia. Chiudi le finestre prima che la RAM scoppi: ogni finestra chiusa si stampa sul tuo poster brutalista.', en: 'The 90s web blows up in your face. Close the windows before the RAM bursts: each closed window prints on your brutalist poster.' },
  how: {
    it: 'Ogni finestra ti dà un ordine: premi la X, scegli il bottone giusto, trascinala nel cestino giallo o clicca tre volte il virus.|NON TOCCARE le finestre "Non toccarmi": spariscono da sole e ti danno un bonus. Sbagliare apre altre finestre.|Se la barra della RAM arriva al 100% il computer crasha. Più sei veloce, più punti.',
    en: 'Every window gives an order: hit the X, pick the right button, drag it into the yellow bin or click the virus three times.|DON’T TOUCH the "Don’t touch me" windows: they vanish on their own and pay a bonus. Mistakes open more windows.|If the RAM bar hits 100% the computer crashes. Faster means more points.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#C0C0C0"/><text x="-4" y="60" font-family="Arial Black,Impact" font-size="64" fill="#0000FF" letter-spacing="-5">404</text>${[[18, 14, '#FFFF00'], [58, 30, '#FF00FF'], [96, 10, '#00FF00'], [74, 56, '#FFFFFF']].map(([x, y, c]) => `<g transform="translate(${x} ${y})"><rect x="4" y="4" width="52" height="34" fill="#000"/><rect width="52" height="34" fill="${c}" stroke="#000" stroke-width="2"/><rect width="52" height="9" fill="#000"/><rect x="42" y="0" width="10" height="9" fill="#FF0000"/></g>`).join('')}</svg>`,

  mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    if (!document.getElementById('pb-css')) document.head.append(h('style', { id: 'pb-css' }, CSS));
    const ramFill = h('i'), ramText = h('b', {}, 'RAM 0%');
    const ram = h('div', { class: 'pb-ram' }, ramFill, ramText);
    const trash = h('div', { class: 'pb-trash', html: '<svg viewBox="0 0 40 44"><rect x="6" y="10" width="28" height="32" fill="#fff" stroke="#000" stroke-width="3"/><rect x="2" y="5" width="36" height="6" fill="#000"/><rect x="14" y="0" width="12" height="6" fill="#000"/><path d="M14 16v20M20 16v20M26 16v20" stroke="#000" stroke-width="3"/></svg>' }, api.t({ it: 'CESTINO', en: 'BIN' }));
    const desk = h('div', { class: 'pb-desk' },
      h('div', { class: 'pb-mega' }, 'OCCHIO.EXE'),
      h('div', { class: 'pb-mega2' }, api.t({ it: 'non rispondere', en: 'not responding' })),
      h('div', { class: 'pb-links' }, ...['www.occhio.it/~ninni', 'GUESTBOOK!!!', 'Webring ← →', api.t({ it: 'Sei il visitatore n. 000013', en: 'You are visitor no. 000013' })].map((x) => h('a', {}, x))),
      h('div', { class: 'pb-marq' }, h('span', {}, api.t({ it: '!!! ATTENZIONE !!! IL TUO COMPUTER È PIENO DI FINESTRE !!! CHIUDILE TUTTE !!! NON TOCCARE QUELLE CHE DICONO NON TOCCARMI !!!', en: '!!! WARNING !!! YOUR COMPUTER IS FULL OF WINDOWS !!! CLOSE THEM ALL !!! DON’T TOUCH THE ONES THAT SAY DON’T TOUCH ME !!!' }))),
      ram, trash);
    const box = h('div', { class: 'arena', style: { background: '#C0C0C0' } }, desk);
    board.append(box);
    const closedLabel = h('b', { class: 'keys-hint', style: { display: 'inline' } }, '');
    controls.append(closedLabel);

    // Poster that collects every closed window.
    const poster = document.createElement('canvas');
    poster.width = PW; poster.height = PH;
    const pg = poster.getContext('2d');
    pg.fillStyle = '#EDEDED'; pg.fillRect(0, 0, PW, PH);
    pg.strokeStyle = '#0002'; pg.lineWidth = 2;
    for (let x = 0; x <= PW; x += 75) { pg.beginPath(); pg.moveTo(x, 0); pg.lineTo(x, PH); pg.stroke(); }
    for (let y = 0; y <= PH; y += 75) { pg.beginPath(); pg.moveTo(0, y); pg.lineTo(PW, y); pg.stroke(); }
    pg.save(); pg.translate(PW * 0.5, PH * 0.6); pg.rotate(-Math.PI / 2);
    pg.font = '900 900px "Arial Black", Impact, sans-serif'; pg.textAlign = 'center'; pg.textBaseline = 'middle';
    pg.lineWidth = 8; pg.strokeStyle = '#0000FF'; pg.strokeText('404', 0, 0);
    pg.restore();

    let wins = [], over = false, t = 0, spawnT = 0.4, closed = 0, z = 10, ramV = 0;
    const W = () => box.clientWidth, H = () => box.clientHeight;

    const imprint = (w) => {
      const sx = PW / W(), sy = (PH - 360) / H();
      const x = w.x * sx, y = 320 + w.y * sy, ww = w.w * sx, hh = w.h * sy;
      const off = rand(-14, 14);
      pg.save();
      pg.globalCompositeOperation = 'multiply';
      pg.fillStyle = w.c; pg.fillRect(x + off, y - off, ww, hh);
      pg.globalCompositeOperation = 'source-over';
      pg.lineWidth = 6; pg.strokeStyle = '#000'; pg.strokeRect(x, y, ww, hh);
      pg.fillStyle = '#000'; pg.fillRect(x, y, ww, 40);
      pg.fillStyle = w.c === '#000000' ? '#FFFF00' : w.c;
      pg.font = `700 26px "Courier New", monospace`; pg.textBaseline = 'middle';
      pg.fillText(w.title.slice(0, 40), x + 10, y + 21, ww - 20);
      pg.fillStyle = '#000';
      pg.font = `900 ${Math.round(Math.min(hh * 0.5, 110))}px ${w.font}`;
      pg.globalAlpha = 0.85;
      pg.fillText(w.big, x + 14, y + hh * 0.62, ww * 1.6);
      // A loose glyph somewhere, like a misprint.
      pg.globalAlpha = 1; pg.globalCompositeOperation = 'difference';
      pg.fillStyle = pick(COLS.slice(0, 6));
      pg.translate(x + ww * rand(0, 1), y + hh * rand(0, 1)); pg.rotate(pick([0, Math.PI / 2, -Math.PI / 2]));
      pg.font = `900 ${Math.round(rand(80, 220))}px ${pick(FONTS)}`;
      pg.fillText(pick(['×', '!', 'OK', '?', '404', '★', 'ERR', 'WWW']), 0, 0);
      pg.restore();
    };

    const finishPoster = () => {
      const g = pg;
      g.save();
      g.fillStyle = '#000'; g.fillRect(0, 0, PW, 300);
      g.fillStyle = '#FFFF00'; g.font = '900 150px "Arial Black", Impact, sans-serif'; g.textBaseline = 'alphabetic';
      g.fillText('POP-UP', 30, 160, PW - 60);
      g.fillStyle = '#FF00FF'; g.fillText('BRUTALE', 30, 285, PW - 60);
      g.fillStyle = '#000'; g.fillRect(0, PH - 90, PW, 90);
      g.fillStyle = '#00FF00'; g.font = '700 38px "Courier New", monospace'; g.textBaseline = 'middle';
      g.fillText(`${(store.name || 'anonimo').toUpperCase()} · ${closed} ${api.t({ it: 'FINESTRE CHIUSE', en: 'WINDOWS CLOSED' })} · ${api.score.toLocaleString()} PT`, 30, PH - 45, PW - 60);
      g.restore();
    };

    const setRam = () => {
      ramV = wins.reduce((a, w) => a + w.ram, 0);
      ramFill.style.width = Math.min(100, ramV) + '%';
      ramText.textContent = `RAM ${Math.round(Math.min(100, ramV))}%`;
      ram.classList.toggle('is-hot', ramV > 70);
    };

    const remove = (w) => { w.dead = true; w.el.remove(); wins = wins.filter((x) => x !== w); setRam(); };
    const at = (w) => toStage(stage, box, w.x + w.w / 2, w.y + w.h / 2);
    const good = (w) => {
      if (w.dead) return;
      const q = Math.max(0.45, Math.min(1, 1.15 - w.age / w.life));
      const p = at(w);
      api.hit(q, { x: p.x, y: p.y, silent: q < 0.95, speed: q });
      closed++; closedLabel.textContent = api.t({ it: `${closed} finestre chiuse`, en: `${closed} windows closed` });
      imprint(w); remove(w);
      if (closed % 15 === 0) stamp(stage, api.t({ it: 'SISTEMA PULITO', en: 'SYSTEM CLEAN' }), 'great');
    };
    const bad = (w, n = 2) => {
      const p = w ? at(w) : { x: W() / 2, y: H() / 2 };
      api.hit(0, { x: p.x, y: p.y, silent: true });
      shake(box); vibrate([40, 30, 40]);
      stamp(stage, api.t({ it: 'ERRORE', en: 'ERROR' }), 'bad');
      if (w) remove(w);
      for (let i = 0; i < n; i++) spawn('close');
    };

    const spawn = (forced) => {
      if (over) return;
      const lvl = Math.min(1, t / TIME);
      const kind = forced || pick(['close', 'close', 'ok', 'ok', 'trash', 'dont', ...(lvl > 0.25 ? ['virus', 'trash'] : []), ...(lvl > 0.5 ? ['dont', 'cookie'] : [])]);
      const bw = W(), bh = H();
      const w = Math.round(Math.min(bw * 0.86, Math.max(210, bw * rand(0.17, 0.3)))), hh = Math.round(Math.min(bh * 0.42, Math.max(150, bh * rand(0.2, 0.32))));
      const x = Math.round(rand(4, Math.max(5, bw - w - 4))), y = Math.round(rand(44, Math.max(45, bh - hh - 40)));
      const c = pick(COLS), font = pick(FONTS);
      const win = { kind, x, y, w, h: hh, c, font, age: 0, life: kind === 'dont' ? 3 : 4.5 - lvl * 1.5, ram: kind === 'virus' ? 14 : kind === 'dont' ? 6 : 10, hp: 3 };
      const barEl = h('div', { class: 'pb-bar', style: { background: c === '#000000' ? '#FFFF00' : '#000', color: c === '#000000' ? '#000' : c } });
      const body = h('div', { class: 'pb-body', style: { fontFamily: font, color: ink(c) } });
      const el = h('div', { class: `pb-win k-${kind}`, style: { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px', background: c, zIndex: ++z } }, barEl, body);
      win.el = el;
      const big = (txt, size = 30) => h('p', { style: { fontSize: size + 'px', fontWeight: 900 } }, txt);
      const xBtn = () => { const b = h('button', { class: 'pb-x', type: 'button', 'aria-label': 'X' }, '×'); return b; };
      if (kind === 'close') {
        const txt = api.t(pick(T.close));
        win.title = 'alert.exe'; win.big = txt;
        const xb = xBtn();
        xb.onpointerdown = (e) => { e.stopPropagation(); sfx.tap(); good(win); };
        barEl.append(h('span', {}, win.title), xb);
        body.append(big(txt, txt.length > 14 ? 22 : 32), h('p', { style: { fontSize: '13px' } }, api.t({ it: 'premi la X', en: 'hit the X' })));
        el.onpointerdown = () => { shake(el); sfx.bad(); };
      } else if (kind === 'ok' || kind === 'cookie') {
        let labels, right;
        if (kind === 'cookie') { labels = [api.t({ it: 'ACCETTA', en: 'ACCEPT' }), api.t({ it: 'RIFIUTA', en: 'REJECT' })]; right = 1; win.title = 'cookies.htm'; win.big = '🍪'; body.append(big(api.t({ it: 'Accetti i cookie? (rifiuta!)', en: 'Accept cookies? (reject!)' }), 20)); }
        else { labels = ['OK', api.t({ it: 'ANNULLA', en: 'CANCEL' })]; right = Math.random() < 0.5 ? 0 : 1; win.title = 'confirm.exe'; win.big = labels[right]; body.append(big(api.t({ it: `PREMI ${labels[right]}`, en: `PRESS ${labels[right]}` }), 30)); }
        if (Math.random() < 0.5) { labels = labels.slice().reverse(); right = 1 - right; }
        barEl.append(h('span', {}, win.title));
        body.append(h('div', { class: 'pb-btns' }, labels.map((l, i) => { const b = h('button', { class: 'pb-btn', type: 'button' }, l); b.onpointerdown = (e) => { e.stopPropagation(); sfx.tap(); i === right ? good(win) : bad(win); }; return b; })));
      } else if (kind === 'trash') {
        const txt = api.t(pick(T.trash));
        win.title = 'junk.zip'; win.big = 'ZIP';
        win.life += 1.5;
        barEl.append(h('span', {}, win.title));
        body.append(big(txt, 24), h('p', { style: { fontSize: '30px' } }, '↘'));
        let dx = 0, dy = 0, dragging = false;
        el.onpointerdown = (e) => { dragging = true; dx = e.clientX - win.x; dy = e.clientY - win.y; el.setPointerCapture?.(e.pointerId); el.classList.add('is-drag'); el.style.zIndex = ++z; e.preventDefault(); };
        el.onpointermove = (e) => {
          if (!dragging) return;
          win.x = e.clientX - dx; win.y = e.clientY - dy;
          el.style.left = win.x + 'px'; el.style.top = win.y + 'px';
          trash.classList.toggle('is-over', overTrash(e));
        };
        el.onpointerup = el.onpointercancel = (e) => {
          if (!dragging) return; dragging = false; el.classList.remove('is-drag'); trash.classList.remove('is-over');
          if (overTrash(e)) { sfx.good(); good(win); }
        };
      } else if (kind === 'dont') {
        win.title = 'NON_TOCCARE.txt'; win.big = api.t({ it: 'NO', en: 'NO' });
        const cnt = h('div', { class: 'pb-count' }, '3');
        win.cnt = cnt;
        barEl.append(h('span', {}, win.title));
        body.append(big(api.t(T.dont[0]), 26), cnt);
        el.onpointerdown = () => bad(win, 3);
      } else if (kind === 'virus') {
        win.title = 'VIRUS.EXE'; win.big = 'VIRUS';
        win.life = 4.2 - lvl;
        const hp = h('p', { style: { fontSize: '40px', fontWeight: 900 } }, '■■■');
        barEl.append(h('span', {}, win.title));
        body.append(big(api.t(T.virus[0]), 18), hp);
        el.onpointerdown = (e) => {
          e.preventDefault(); win.hp--; hp.textContent = '■'.repeat(win.hp) + '□'.repeat(3 - win.hp); sfx.tick(); vibrate(8);
          win.x += rand(-30, 30); win.y += rand(-20, 20); clampWin(win);
          if (win.hp <= 0) good(win);
        };
      }
      wins.push(win);
      box.querySelector('.pb-desk').append(el);
      sfx.tick();
      setRam();
    };
    const clampWin = (w) => {
      w.x = Math.max(0, Math.min(W() - w.w, w.x)); w.y = Math.max(0, Math.min(H() - w.h, w.y));
      w.el.style.left = w.x + 'px'; w.el.style.top = w.y + 'px';
    };
    const overTrash = (e) => {
      const r = trash.getBoundingClientRect();
      return e.clientX > r.left - 20 && e.clientX < r.right + 20 && e.clientY > r.top - 20 && e.clientY < r.bottom + 20;
    };

    const finish = (crashed) => {
      if (over) return; over = true; stopLoop();
      if (crashed) {
        desk.append(h('div', { class: 'pb-bsod' }, h('b', {}, ' OCCHIO.EXE '), api.t({ it: 'Si è verificato un errore irreversibile. RAM al 100%. Il tuo poster però è salvo.', en: 'A fatal exception has occurred. RAM at 100%. Your poster is safe though.' })));
        sfx.bad();
      }
      finishPoster();
      api.end({
        exports: [{ label: api.t({ it: 'Poster brutalista (PNG)', en: 'Brutalist poster (PNG)' }), run: () => poster.toBlob((b) => download('occhio-popup-brutale.png', b), 'image/png') }],
        summary: api.t({ it: `${closed} finestre chiuse${crashed ? ', poi il crash.' : '.'}`, en: `${closed} windows closed${crashed ? ', then the crash.' : '.'}` }),
      });
    };
    api.timer(TIME, () => finish(false));
    api.hud('RAM', '0%', false);

    const stopLoop = loop((dt) => {
      if (over) return;
      t += dt;
      const lvl = Math.min(1, t / TIME);
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.45, 1.5 - lvl * 1.05) * rand(0.7, 1.2); }
      for (const w of [...wins]) {
        w.age += dt;
        if (w.kind === 'dont') {
          const left = Math.ceil(w.life - w.age);
          if (w.cnt.textContent !== String(left)) w.cnt.textContent = String(Math.max(0, left));
          if (w.age >= w.life) { const p = at(w); api.add(60, { x: p.x, y: p.y, color: 'var(--green-ink)' }); remove(w); }
        } else if (w.kind === 'virus' && w.age > w.life) {
          w.age = 0; spawn('virus'); spawn('close');
          stamp(stage, api.t({ it: 'SI MOLTIPLICA', en: 'IT MULTIPLIES' }), 'bad');
        }
      }
      api.hud('RAM', Math.round(Math.min(100, ramV)) + '%', false);
      if (ramV >= 100) finish(true);
    });

    api.onCleanup(() => stopLoop());
  },
};
