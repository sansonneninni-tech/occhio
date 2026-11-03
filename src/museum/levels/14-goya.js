// LEVEL 14 · Francisco Goya, Saturn Devouring His Son (1819–23), one of the Black Paintings.
// Map: the Quinta del Sordo, Goya's house outside Madrid: dark rooms, peeling plaster, and the
// dining room where he painted Saturn straight onto the wall.
// Rule: time devours. Saturn is Kronos, time itself: your life drains on its own, always, and only
// killing gives it back. Goya was deaf when he painted these rooms: the level has no sound, only
// the ringing in your ears. Saturn walks the house eating his sons to heal; he cannot die while
// a son is left. Shoot his eyes to stun him.
// Discovery: the dining-room wall is plastered over. Where you shoot, the plaster falls and the
// painting appears underneath.
import { store } from '../../core/store.js';

const T = (it, en) => ({ it, en });
const SONS = 26;

export default {
  id: 'goya',
  artist: 'Francisco Goya',
  year: '1819–23',
  title: T('Saturno che divora un figlio', 'Saturn Devouring His Son'),
  museum: T('Museo del Prado, Madrid', 'Museo del Prado, Madrid'),
  image: '/museo/opere/14-goya-saturno.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T('La Quinta del Sordo, la casa di un vecchio pittore sordo fuori Madrid. Di notte un gigante gira per le stanze. Ha fame dei suoi figli. Qui non si sente niente.', 'The Quinta del Sordo, the house of an old deaf painter outside Madrid. At night a giant walks the rooms. He is hungry for his sons. Here you hear nothing.'),
  rule: T('Il tempo divora: la vita scende da sola e torna solo uccidendo. Saturno mangia i figli per guarire e non muore finché ne resta uno. Sparagli negli occhi per stordirlo.', 'Time devours: your life drains on its own and comes back only by killing. Saturn eats his sons to heal and cannot die while one is left. Shoot his eyes to stun him.'),
  ruleShort: T('il tempo ti divora: uccidi per vivere', 'time devours you: kill to live'),
  goal: T('Rimanda nel quadro tutti i figli, poi Saturno.', 'Send all the sons back into the painting, then Saturn.'),
  paint: '#5a0a06',
  accent: '#c8402a',
  fx: { mono: 0.9, tint: [0.92, 0.84, 0.7], keepRed: 0.95, contrast: 0.6, exposure: 1.45, grain: 0.5, scratches: 0.6, dust: 0.7, flicker: 0.4, weave: 0.4, smear: 0.3, vignette: 0.9 },
  discovery: {
    title: T('Un quadro dipinto sul muro di casa', 'A painting on the wall of his own house'),
    text: T('Goya lo dipinse direttamente sull’intonaco della sua sala da pranzo, a più di settant’anni, sordo da quasi trenta. Non gli diede un titolo e non lo mostrò a nessuno: è una delle quattordici Pitture nere che coprivano i muri della casa. Cinquant’anni dopo furono staccate dai muri e portate su tela. Le altre tredici sono al Prado, accanto a lui.', 'Goya painted it straight onto the plaster of his dining room, past seventy, deaf for almost thirty years. He gave it no title and showed it to no one: it is one of the fourteen Black Paintings that covered the walls of the house. Fifty years later they were peeled off the walls and moved onto canvas. The other thirteen hang at the Prado, next to him.'),
  },
  deathLine: T('Il tempo ti ha mangiato.', 'Time ate you.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const [sonImg, saturnImg] = await Promise.all([ctx.art.load('/museo/mostri/14-son.png'), ctx.art.load('/museo/mostri/14-saturn.png')]);

    const wall = ctx.art.wall([0.0, 0.0, 0.25, 0.25], { dark: 0.15 });
    const wall2 = ctx.art.wall([0.72, 0.02, 0.26, 0.2], { dark: 0.25 });
    const floor = ctx.art.wall([0.05, 0.85, 0.6, 0.12], { dark: 0.4 });

    ctx.map.build({
      grid: [
        '############################',
        '#P.....#..........#........#',
        '#......#....M.....#...M....#',
        '#..........................#',
        '#......#..........#........#',
        '###.######.####.######.#####',
        '#.......%...........%......#',
        '#...M...%...........%...M..#',
        '#...........S..............#',
        '#.......%...........%......#',
        '###.#####.#########.###.####',
        '#......#.............#.....#',
        '#..M...#.............#..M..#',
        '#..........................#',
        '#......#......K......#.....#',
        '############################',
      ],
      legend: { '%': { solid: true, tex: 'wall2' }, S: { saturn: true }, K: { mural: true } },
      textures: { wall, wall2, floor, ceil: wall2 },
      height: 4.4,
    });
    ctx.light({ ambient: 0.5, color: 0xd8c8a8, ground: 0x140c08, lantern: { angle: 0.55, range: 20, intensity: 140, color: 0xffe8c8, penumbra: 0.6 }, fog: { color: 0x020101, near: 1.5, far: 17 }, sky: 0x020101 });

    // the mural: Saturn painted on the dining-room wall, covered by plaster that falls where you shoot
    const C = ctx.CELL, H = 4.4;
    const mk = ctx.map.find('mural')[0];
    const mw = 2.4, mh = mw / (ctx.art.image.width / ctx.art.image.height);
    const mz = 15 * C - 0.04, mx = mk.x, my = Math.min(H - mh / 2 - 0.1, mh / 2 + 0.25);
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshStandardMaterial({ map: ctx.art.texture, roughness: 0.9 }));
    mural.position.set(mx, my, mz); mural.rotation.y = Math.PI; ctx.add(mural);
    const plaster = document.createElement('canvas'); plaster.width = 256; plaster.height = Math.round(256 * mh / mw);
    const pg = plaster.getContext('2d');
    pg.drawImage(ctx.art.crop([0.0, 0.0, 0.25, 0.25], 256), 0, 0, plaster.width, plaster.height);
    pg.fillStyle = 'rgba(176,156,124,0.72)'; pg.fillRect(0, 0, plaster.width, plaster.height);
    const plTex = ctx.art.tex(plaster);
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshStandardMaterial({ map: plTex, transparent: true, roughness: 1 }));
    cover.position.set(mx, my, mz - 0.02); cover.rotation.y = Math.PI; ctx.add(cover);
    const candle = new THREE.PointLight(0xffb060, 4, 7, 1.8); candle.position.set(mx, 1.2, mz - 1.2); ctx.add(candle);

    const D = ctx.data = {
      drain: 1.7, sonsLeft: SONS, eaten: 0, saturn: null, mural: { x: mx, y: my, z: mz, w: mw, h: mh, g: pg, tex: plTex, c: plaster, hits: 0, done: false },
      candle, ring: null, stunHint: 0, lastSeen: 0,
    };

    // ---------- monsters ----------
    const son = {
      name: T('Il figlio', 'The son'),
      sprite: sonImg, height: 1.75, hp: 0.8, speed: 2.5, dmg: 2.5, attackEvery: 1.1, radius: 0.35,
      behavior: 'chase', twitch: 0.7, rot: 0.45, tear: 0.6, blood: 0x8a0808,
      parts: [{ type: 'tendrils', n: 4, len: 0.6, thick: 0.03, at: [0, 1.72, -0.03], color: 0x5a0606 }],
    };
    const crawler = { ...son, name: T('Il figlio che striscia', 'The crawling son'), height: 1.0, lift: 0, hp: 0.6, speed: 2.4, behavior: 'crawl', twitch: 1 };
    const saturn = {
      name: T('Saturno', 'Saturn'),
      sprite: saturnImg, height: 3.6, hp: 16, speed: 2.1, dmg: 7, reach: 2.2, radius: 1.0, boss: true, attackEvery: 1.6,
      // his blow throws you across the room
      onAttack(m, c) { const d = c.player.pos.clone().sub(m.pos).setY(0).normalize(); c.player.push(d.x * 9, d.z * 9); c.view.shake = 0.6; },
      zones: [{ name: 'occhi', x: [-0.4, -0.12], y: [0.82, 0.98], mul: 3 }],
      behavior: saturnBrain,
      onHit(m, shot, c) {
        // the eyes stun him; the body cannot be hurt while a son is still alive
        if (shot.zone === 'occhi') {
          m.state.stun = 2.4; c.particles.burst(shot.point, 16, 0xe8dcc0, 2.5, 0.5);
          c.hud.whisper(T('accecato', 'blinded'));
          if (!vulnerable(c)) return 0;
          return shot.dmg;
        }
        if (!vulnerable(c)) {
          if (D.stunHint++ % 4 === 0) c.hud.say(T('Non muore finché un figlio è vivo. Agli occhi lo fermi.', 'He cannot die while a son lives. The eyes stop him.'), 2400);
          return 0;
        }
        return shot.dmg;
      },
      parts: [{ type: 'strands', n: 24, len: 1.6, at: [-0.5, 3.4, -0.1], spread: 0.5, color: 0x6a6258 }],
      twitch: 0.35, rot: 0.2, breathe: 1.2, selfLit: 0.12, blood: 0x6a0606,
    };
    D.defs = { son, crawler, saturn };

    D.waves = ctx.spawner({ kinds: [{ def: son, w: 3 }, { def: crawler, w: 1 }], first: 3, every: 2.8, burst: 1, max: 5, total: SONS, min: 8 });
    D.saturn = ctx.spawn(saturn, ctx.map.find('saturn')[0]);

    ctx.pickup(ctx.map.toWorld(25, 2), { kind: 'heal', amount: 30 });
    ctx.pickup(ctx.map.toWorld(3, 12), { kind: 'heal', amount: 30 });

    ctx.hud.goal(T('figli da rimandare', 'sons to send back'), SONS);
    ctx.hud.bar('time', { label: T('il tempo ti mangia', 'time is eating you'), value: 1, color: '#c8402a' });
    // deafness: everything muffled, and a ringing that does not go away
    ctx.audio.muffle(0.93);
    D.ring = tinnitus(ctx);
    ctx.after(1.0, () => ctx.hud.say(T('Non senti niente. Guardati alle spalle.', 'You hear nothing. Watch your back.'), 3000));
  },

  update(ctx, dt) {
    const D = ctx.data;
    // time devours: the drain grows slowly the longer you stay
    const k = D.drain * (1 + ctx.time / 140);
    ctx.player.hp -= k * dt;
    if (ctx.player.hp <= 0) { ctx.lose(); return; }
    ctx.hud.bar('time', { value: ctx.player.hp / ctx.player.maxHp });
    ctx.fx.tunnel = Math.max(0, 0.5 - ctx.player.hp / 100) * 1.2;
    D.candle.intensity = 3.5 + Math.random() * 1.2;
    // the ringing gets louder when your life is low
    if (D.ring) D.ring.set(0.006 + Math.max(0, 0.5 - ctx.player.hp / 100) * 0.03);

    const alive = ctx.monsters.list.filter((m) => !m.dying && m !== D.saturn && m.counts).length;
    D.sonsLeft = SONS - (D.waves.spawned - alive);
    if (!vulnerable(ctx)) ctx.hud.goal(T('figli da rimandare', 'sons to send back'), Math.max(0, D.sonsLeft));
    else if (!D.saidLast) { D.saidLast = true; ctx.hud.say(T('Nessun figlio è rimasto. Ora Saturno può morire.', 'No son is left. Now Saturn can die.'), 3200); ctx.hud.goal(T('Saturno', 'Saturn'), '!'); }
  },

  onShot(ctx, shot) {
    const D = ctx.data, M = D.mural;
    if (shot.monster || M.done) return;
    // a shot on the dining-room wall: the plaster comes away and the painting shows
    const p = shot.point;
    if (Math.abs(p.z - M.z) < 0.35 && Math.abs(p.x - M.x) < M.w / 2 && Math.abs(p.y - M.y) < M.h / 2) {
      const u = 1 - ((p.x - M.x) / M.w + 0.5), v = 1 - ((p.y - M.y) / M.h + 0.5);
      const g = M.g;
      g.save(); g.globalCompositeOperation = 'destination-out';
      const r = M.c.width * (0.09 + Math.random() * 0.05);
      g.beginPath();
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr = r * (0.6 + Math.random() * 0.6); g.lineTo(u * M.c.width + Math.cos(a) * rr, v * M.c.height + Math.sin(a) * rr); }
      g.fill(); g.restore();
      M.tex.needsUpdate = true;
      M.hits++;
      ctx.particles.burst(p, 18, 0xb8a888, 2, 0.8);
      if (M.hits === 1) ctx.hud.whisper(T('sotto l’intonaco c’è qualcosa', 'there is something under the plaster'));
      if (M.hits >= 14 && !M.done) {
        M.done = true;
        ctx.hud.say(T('Era qui, sul muro della sala da pranzo. Goya ci mangiava davanti.', 'It was here, on the dining-room wall. Goya ate his meals in front of it.'), 4200);
        ctx.pickup(new ctx.THREE.Vector3(M.x, 0, M.z - 1.4), { kind: 'heal', amount: 40 });
      }
    }
  },

  onKill(ctx, m) {
    const D = ctx.data;
    if (m === D.saturn) {
      ctx.hud.say(T('Il tempo si ferma.', 'Time stops.'), 2400);
      ctx.after(1.4, () => ctx.win());
      return;
    }
    // devouring keeps you alive
    ctx.player.heal(9);
  },

  onHurt(ctx, dmg) { return dmg; },

  teardown(ctx) { ctx.data?.ring?.stop(); ctx.audio.muffle(0); },
};

function vulnerable(ctx) {
  const D = ctx.data;
  if (!D.waves.done && D.waves.spawned < SONS) return false;
  return !ctx.monsters.list.some((m) => !m.dying && m !== D.saturn && m.counts);
}

// Saturn: walks the house towards the nearest son and eats it (healing and growing); if he sees you
// close he comes for you; stunned, he stands still with his hands on his face.
function saturnBrain(m, ctx, dt) {
  const s = m.state, D = ctx.data;
  if (s.stun > 0) { s.stun -= dt; m.anger = 0; return; }
  s.grow = s.grow ?? 1;
  const pl = ctx.player.pos;
  const dp = m.pos.distanceTo(pl);
  const seen = dp < 13 && ctx.monsters.sees(m);
  let prey = null, bd = 10;
  for (const o of ctx.monsters.list) {
    if (o === m || o.dying || !o.counts) continue;
    const d = o.pos.distanceTo(m.pos); if (d < bd) { bd = d; prey = o; }
  }
  if (seen || !prey) {
    m.anger = seen ? 1 : 0.3;
    ctx.monsters.walkTo(m, pl, m.speed * (seen ? 1.35 : 0.9), dt);
    ctx.monsters.melee(m, dt);
    if (seen && !s.roared) { s.roared = true; ctx.hud.whisper(T('ti ha visto', 'he has seen you')); ctx.view.shake = 0.3; }
    if (!seen) s.roared = false;
    return;
  }
  if (s.chew > 0) { s.chew -= dt; m.anger = 0.6; return; }
  ctx.monsters.walkTo(m, prey.pos, m.speed, dt);
  if (bd < 1.8) {
    // he eats the son: blood, and he grows
    ctx.particles.burst({ x: prey.pos.x, y: 2.4, z: prey.pos.z }, 40, 0x8a0606, 3.2, 1.2);
    ctx.monsters.remove(prey);
    D.eaten++;
    // he heals a little and chews for a moment, still: your chance
    s.base = s.base ?? m.maxHp;
    m.hp = Math.min(s.base * 1.6, m.hp + s.base * 0.08);
    m.maxHp = Math.max(m.maxHp, m.hp);
    s.chew = 1.8;
    s.grow = Math.min(1.45, s.grow + 0.06);
    m.view.root.scale.setScalar(s.grow);
    m.reach = 2.2 * s.grow;
    ctx.audio.flesh();
    if (ctx.player.isLookingAt(m.pos, 0.7)) ctx.hud.whisper(T('lo ha mangiato. è più grande.', 'he ate him. he is bigger.'));
    else ctx.hud.whisper(T('da qualche parte, Saturno mangia', 'somewhere, Saturn is eating'));
  }
}

// a thin, high ringing in the ears (bypasses the muffle, as tinnitus would)
function tinnitus(ctx) {
  const ac = ctx.audio.ctx;
  if (!ac || store.muted) return null;
  try {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 6900; o2.type = 'sine'; o2.frequency.value = 6912;
    g.gain.value = 0.0001; o.connect(g); o2.connect(g); g.connect(ac.destination);
    o.start(); o2.start();
    g.gain.setTargetAtTime(0.008, ac.currentTime, 2);
    return {
      set(v) { if (!store.muted) g.gain.setTargetAtTime(v, ac.currentTime, 0.5); else g.gain.value = 0; },
      stop() { try { o.stop(); o2.stop(); g.disconnect(); } catch {} },
    };
  } catch { return null; }
}
