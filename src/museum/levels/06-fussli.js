// Livello 6 · Johann Heinrich Füssli, L'incubo (1781).
// A bedroom grown into a maze of red curtains that move by themselves. In the middle, the white
// bed and the sleeper hanging off it. The rule: sleep paralysis. The incubus jumps on your chest:
// you cannot walk, the sight closes in, you can only breathe. Press the action in rhythm to throw
// it off, then shoot it while it is stunned. The mares that peer through the curtains call it back.

const T = (it, en) => ({ it, en });

// 3 x 3 rooms of 5 x 4 cells. Between rooms: static curtains (C) and moving ones (A, B).
// Every gap holds at least one A and one B, so when one set closes the other opens: always a way through.
function bedroomGrid() {
  const W = 19, H = 16, rw = 5, rh = 4;
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '#' : '.')));
  const vx = [6, 12], hy = [5, 10];
  const vPat = [['C', 'A', 'B', 'C'], ['B', 'C', 'C', 'A'], ['A', 'C', 'B', 'C'], ['C', 'B', 'A', 'C'], ['A', 'B', 'C', 'C'], ['C', 'C', 'A', 'B']];
  const hPat = [['C', 'A', 'C', 'B', 'C'], ['B', 'C', 'C', 'C', 'A'], ['C', 'B', 'C', 'A', 'C'], ['A', 'C', 'B', 'C', 'C'], ['C', 'C', 'A', 'C', 'B'], ['C', 'A', 'C', 'C', 'B']];
  let k = 0;
  for (const x of vx) for (let r = 0; r < 3; r++) { const pat = vPat[k++ % vPat.length]; for (let i = 0; i < rh; i++) g[1 + r * (rh + 1) + i][x] = pat[i]; }
  k = 0;
  for (const y of hy) for (let c = 0; c < 3; c++) { const pat = hPat[k++ % hPat.length]; for (let i = 0; i < rw; i++) g[y][1 + c * (rw + 1) + i] = pat[i]; }
  for (const x of vx) for (const y of hy) g[y][x] = 'C';
  // spawns in the corners of the outer rooms, start in the bottom left
  for (const [x, y] of [[1, 1], [17, 1], [17, 14], [9, 1], [1, 7], [17, 7], [9, 14], [4, 3], [14, 12]]) g[y][x] = 'M';
  g[13][2] = 'P';
  // the painting hangs on the north wall of the middle room
  g[0][9] = '#';
  g[5][9] = 'Q';
  return g.map((r) => r.join(''));
}

export default {
  id: 'fussli',
  artist: 'Johann Heinrich Füssli',
  year: '1781',
  title: T('L’incubo', 'The Nightmare'),
  museum: T('Detroit Institute of Arts', 'Detroit Institute of Arts'),
  image: '/museo/opere/06-fussli.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T(
    'Una camera da letto che non finisce più. Le tende rosse si spostano da sole. Da qualche parte una donna dorme, e qualcosa le siede sul petto.',
    'A bedroom that never ends. The red curtains move by themselves. Somewhere a woman is sleeping, and something is sitting on her chest.'),
  rule: T(
    'L’incubo ti salta sul petto: non puoi camminare e la vista si chiude. Premi l’azione a ritmo per RESPIRARE e buttarlo giù, poi sparagli finché è stordito. Le cavalle che spuntano dalle tende lo richiamano: zittiscile prima che nitriscano.',
    'The incubus jumps on your chest: you cannot walk and your sight closes in. Press the action in rhythm to BREATHE and throw it off, then shoot it while it is stunned. The mares peering through the curtains call it back: silence them before they neigh.'),
  ruleShort: T('se ti salta addosso, premi RESPIRA a ritmo', 'if it jumps on you, tap BREATHE in rhythm'),
  goal: T('Uccidi l’incubo 3 volte.', 'Kill the incubus 3 times.'),
  paint: '#c8c0b0',
  accent: '#d84a3a',
  fx: { mono: 0.1, tint: [1.05, 0.88, 0.78], contrast: 1.25, grain: 0.6, smear: 0.25, weave: 0.35, vignette: 1.0, flicker: 0.2, scratches: 0.3 },
  player: { hp: 100, speed: 5.3 },
  discovery: {
    title: T('La cavalla che non è una cavalla', 'The mare that is not a mare'),
    text: T(
      'In inglese "nightmare" sembra "cavalla della notte", ma "mare" viene da "mara", un demone antico che si siede sul petto di chi dorme e lo soffoca: la testa di cavallo è uno scherzo di Füssli. Il quadro fece scandalo e lo rese famoso. Sul retro della tela c’è il ritratto incompiuto di una giovane donna, forse Anna Landolt, la ragazza che Füssli voleva sposare e che fu data a un altro.',
      'In English "nightmare" sounds like a night horse, but "mare" comes from "mara", an old demon that sits on the chest of sleepers and smothers them: the horse’s head is Füssli’s pun. The painting caused a scandal and made him famous. On the back of the canvas there is an unfinished portrait of a young woman, perhaps Anna Landolt, the girl Füssli wanted to marry and who was given to another man.'),
  },
  deathLine: T('Non ti sei più svegliato.', 'You never woke up.'),

  async setup(ctx) {
    const { THREE } = ctx;
    ctx.data = {};
    const [incImg, mareImg, sleepImg] = await Promise.all([
      ctx.art.load('/museo/opere/06-fussli-incubo.webp'),
      ctx.art.load('/museo/opere/06-fussli-cavalla.webp'),
      ctx.art.load('/museo/opere/06-fussli-dormiente.webp'),
    ]);
    // the sleeper turned upside down: she walks with her hanging head dragging on the floor
    const upright = document.createElement('canvas');
    upright.width = sleepImg.height; upright.height = sleepImg.width;
    { const g = upright.getContext('2d'); g.translate(upright.width / 2, upright.height / 2); g.rotate(Math.PI / 2); g.drawImage(sleepImg, -sleepImg.width / 2, -sleepImg.height / 2); }

    // walls: the dark red drapery of the painting; floor: the shadow under the bed
    // the painting is very dark: its cloth is lifted into the light before it becomes a wall
    const lift = (rect, k, size = 256) => {
      const src = ctx.art.crop(rect, size);
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); g.filter = `brightness(${k}) saturate(1.25) contrast(1.1)`;
      g.drawImage(src, 0, 0, size, size);
      return ctx.art.tex(c, { repeat: true });
    };
    const curtain = lift([0.3, 0.02, 0.26, 0.3], 2.6);
    const drape = lift([0.17, 0.72, 0.32, 0.18], 1.5);
    const floor = lift([0.04, 0.6, 0.2, 0.12], 1.4);
    const ceil = lift([0.3, 0.02, 0.26, 0.3], 0.9);
    ctx.map.build({
      grid: bedroomGrid(),
      legend: {
        C: { solid: true, tex: 'curtain', curtain: true },
        A: { solid: true, tex: 'curtain', curtain: true, setA: true },
        B: { solid: true, tex: 'curtain', curtain: true, setB: true },
      },
      textures: { wall: drape, curtain, floor, ceil, painting: ctx.art.texture },
      height: 4.2,
    });
    ctx.light({ ambient: 0.55, color: 0xe0b0a0, ground: 0x100404, lantern: { angle: 0.52, range: 16, intensity: 44, penumbra: 0.5, color: 0xffd8b0 }, fog: { color: 0x0a0202, near: 3, far: 22 } });

    // a few candles: the only warm light in the dream (few, for the phones)
    for (const [cx, cy] of [[3, 2], [15, 2], [3, 12], [15, 12], [11, 8]]) {
      const w = ctx.map.toWorld(cx, cy);
      const l = new THREE.PointLight(0xffa860, 14, 10, 1.6); l.position.set(w.x, 1.3, w.z); ctx.add(l);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
      flame.position.copy(l.position); ctx.add(flame);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.8 }));
      stick.position.set(w.x, 0.6, w.z); ctx.add(stick); ctx.collider(w.x, w.z, 0.25);
      (ctx.data.candles ||= []).push(l);
    }
    // the bed in the middle room, white and too long, with the sleeper on it
    const mid = ctx.map.toWorld(9, 7);
    mid.z += 1;
    {
      const bed = new THREE.Group();
      const sheet = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.9 });
      const wood = new THREE.MeshStandardMaterial({ color: 0x2a140c, roughness: 0.7 });
      const red = new THREE.MeshStandardMaterial({ color: 0x7a1010, roughness: 0.95 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 1.8), wood); base.position.y = 0.3;
      const mat = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.35, 1.7), sheet); mat.position.y = 0.78;
      const throwCloth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.62, 1.86), red); throwCloth.position.set(0.4, 0.62, 0);
      bed.add(base, mat, throwCloth);
      bed.position.set(mid.x, 0, mid.z);
      ctx.add(bed);
      ctx.collider(mid.x - 1.6, mid.z, 1.0); ctx.collider(mid.x, mid.z, 1.0); ctx.collider(mid.x + 1.6, mid.z, 1.0);
      // the sleeper, cut from the painting, lies across it and turns to follow you
      const tex = ctx.art.tex(sleepImg);
      const w = 5.4, h = w * (sleepImg.height / sleepImg.width);
      const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
      const her = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1, emissive: 0x302824, emissiveMap: tex }));
      her.position.set(mid.x, 0.55, mid.z);
      ctx.add(her);
      Object.assign(ctx.data, { her, bedPos: mid });
    }

    // ---------- monsters from the canvas ----------
    const sleeper = {
      name: T('La dormiente rovesciata', 'The upturned sleeper'),
      sprite: upright, height: 2.4, hp: 3, speed: 2.5, dmg: 9, radius: 0.4,
      behavior: 'crawl', twitch: 1.4, rot: 0.3, tear: 0.5, breathe: 1.6, blood: 0xd8d0c0, selfLit: 0.12,
    };
    const mare = {
      name: T('La cavalla', 'The mare'),
      sprite: mareImg, height: 1.5, lift: 1.1, hp: 2, speed: 0, dmg: 0, radius: 0.5,
      twitch: 0.3, rot: 0.15, tear: 0.1, breathe: 0.6, selfLit: 0.25, blood: 0x2a2a2a,
      // her white, blind eyes
      parts: [{ type: 'eyes', at: [[-0.12, 0.66], [0.06, 0.6]], size: 0.06, color: 0xf0f0e8 }],
      behavior(m, c, dt) {
        m.state.t = (m.state.t ?? 5.5 / Math.max(1, c.D.rate * 0.8)) - dt;
        if (m.state.t < 1.2 && !m.state.warn) { m.state.warn = 1; c.audio.tone(320, 1.1, 'sawtooth', 0.05, 0.6); }
        if (m.state.t <= 0) {
          // the neigh: it calls the incubus and wakes two sleepers
          c.audio.scream(1.8, 0.35);
          c.hud.whisper(T('la cavalla ha nitrito', 'the mare has neighed'));
          c.data.callIncubus = true;
          if (c.monsters.alive < 11) for (let i = 0; i < 2; i++) c.spawn(sleeper, c.map.freeAround(m.pos.x, m.pos.z, 1.5, 4, 1)[0] || m.pos);
          m.state.t = 1e9;
          c.after(0.05, () => c.monsters.remove(m));
        }
      },
    };
    const incubus = {
      name: T('L’incubo', 'The incubus'),
      sprite: incImg, height: 1.55, hp: 9, speed: 3.0, dmg: 0, radius: 0.45, boss: true,
      twitch: 0.7, rot: 0.25, tear: 0.4, breathe: 1.2, selfLit: 0.2, blood: 0x3a2a10,
      parts: [{ type: 'eyes', at: [[-0.2, 0.84], [-0.06, 0.85]], size: 0.04 }],
      behavior: (m, c, dt) => incubusAI(m, c, dt),
      onHit(m, shot, c) { return m.state.mode === 'stunned' ? shot.dmg * 3 : m.state.mode === 'ride' ? 0 : shot.dmg; },
      onDeath(m, c) {
        const d = c.data;
        d.incKills++;
        releasePlayer(c);
        c.hud.goal(T('incubi rimasti', 'nightmares left'), Math.max(0, 3 - d.incKills));
        if (d.incKills >= 3) { c.hud.say(T('Si sveglia.', 'She wakes.'), 2400); c.audio.toll(90); d.wave.stop(); c.after(2, () => c.win()); return; }
        c.hud.say(T('Tornerà. Torna sempre.', 'It will come back. It always does.'), 2200);
        c.after(4.5, () => spawnIncubus(c));
      },
    };
    Object.assign(ctx.data, { defs: { sleeper, mare, incubus }, incKills: 0, breath: 0, riding: null, curtains: 'A', callIncubus: false });

    // the curtains: set B starts open
    for (const p of ctx.map.find('setB')) ctx.map.setSolid(p.cx, p.cy, false);
    ctx.every(8.5, () => swapCurtains(ctx));

    ctx.action({ label: T('RESPIRA', 'BREATHE') });
    ctx.hud.bar('breath', { label: T('respiro', 'breath'), value: 1, color: '#e8dcd0' });
    ctx.hud.goal(T('incubi rimasti', 'nightmares left'), 3);

    // sleepers come at once; mares peer from the curtains
    ctx.data.wave = ctx.spawner({ kinds: [{ def: sleeper, w: 3 }], first: 3, every: 2.4, max: 6 });
    ctx.data.mares = ctx.spawner({ kinds: [{ def: mare, w: 1 }], first: 1, every: 7, max: 2, where: (c) => mareSpot(c) });
    ctx.after(2.5, () => spawnIncubus(ctx));
    ctx.pickup(ctx.map.toWorld(15, 3), { kind: 'heal', amount: 35 });
    ctx.pickup(ctx.map.toWorld(3, 8), { kind: 'heal', amount: 35 });
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player;
    // the sleeper on the bed slowly turns her face towards you
    for (const l of d.candles || []) l.intensity = 11 + Math.random() * 6;
    if (d.her) d.her.rotation.y = Math.atan2(ctx.camera.position.x - d.her.position.x, ctx.camera.position.z - d.her.position.z);

    if (d.riding) {
      // paralysis: you cannot walk, the sight closes, it presses on your chest
      const m = d.riding;
      p.frozen = true;
      p.aimShake = 1.4;
      p.eye += (1.05 - p.eye) * Math.min(1, dt * 3);
      if (ctx.input.altPressed) { d.breath += 0.13; ctx.audio.breath(); }
      d.breath = Math.max(0, d.breath - dt * (0.22 + 0.06 * ctx.D.rate));
      d.rideT += dt;
      ctx.fx.tunnel = Math.min(0.92, 0.5 + d.rideT * 0.08);
      ctx.fx.mono = 0.6;
      if (Math.random() < dt * 1.2) ctx.audio.heart();
      p.hurt(dt * 4.5 * ctx.D.dmg, m);
      m.pos.set(p.pos.x + p.dir.x * 0.6, 0, p.pos.z + p.dir.z * 0.6);
      m.lift = 0.6;
      ctx.hud.bar('breath', { value: Math.min(1, d.breath) });
      if (d.breath >= 1) {
        // thrown off: it lands in front of you, stunned
        d.riding = null;
        releasePlayer(ctx);
        m.state.mode = 'stunned'; m.state.t = 3.2; m.hold = false; m.lift = 0;
        const tgt = { x: p.pos.x + p.dir.x * 2.4, z: p.pos.z + p.dir.z * 2.4 };
        if (ctx.map.cellAt(tgt.x, tgt.z)?.solid) { tgt.x = p.pos.x; tgt.z = p.pos.z; }
        m.pos.set(tgt.x, 0, tgt.z);
        m.view.root.visible = true;
        ctx.audio.growl(0.6, 0.3);
        ctx.hud.say(T('Ora! È stordito.', 'Now! It is stunned.'), 1400);
      }
    } else {
      p.eye += (1.55 - p.eye) * Math.min(1, dt * 2);
      ctx.fx.tunnel = Math.max(0, (ctx.fx.tunnel || 0) - dt * 1.5);
      ctx.fx.mono = Math.max(0.1, (ctx.fx.mono || 0.1) - dt);
      d.breath = Math.min(1, d.breath + dt * 0.4);
      ctx.hud.bar('breath', { value: d.breath });
    }
  },

  teardown(ctx) { ctx.player.frozen = false; },
};

// ---------- helpers ----------
function releasePlayer(ctx) {
  const p = ctx.player;
  p.frozen = false; p.aimShake = 0;
  ctx.data.riding = null;
  ctx.data.breath = 0.4;
}

function spawnIncubus(ctx) {
  const d = ctx.data;
  if (d.incKills >= 3 || d.incubus?.dead === false) return;
  const spots = ctx.map.find('spawn').filter((s) => s.distanceTo(ctx.player.pos) > 9);
  const at = spots[Math.floor(Math.random() * spots.length)] || ctx.map.find('spawn')[0];
  d.incubus = ctx.spawn(d.defs.incubus, at, { hpMul: 1 + d.incKills * 0.35, speedMul: 1 + d.incKills * 0.15 });
  d.incubus.state.cd = 2;
  ctx.audio.growl(0.5, 0.25);
  ctx.hud.whisper(T('è sveglio. ti cerca.', 'it is awake. it is looking for you.'));
}

function incubusAI(m, ctx, dt) {
  const s = m.state, d = ctx.data, p = ctx.player;
  s.cd = (s.cd ?? 2) - dt;
  if (s.mode === 'ride') return;
  if (s.mode === 'stunned') {
    s.t -= dt; m.frozen = true; m.anger = 0;
    if (s.t <= 0) { s.mode = null; s.cd = 4; m.frozen = false; }
    return;
  }
  const dist = m.pos.distanceTo(p.pos);
  // a neigh makes it run to you
  const sp = m.speed * (d.callIncubus ? 1.8 : 1);
  if (d.callIncubus && dist < 2) d.callIncubus = false;
  ctx.monsters.walkTo(m, p.pos, sp, dt);
  if (dist < 1.5 && s.cd <= 0 && !d.riding) {
    // it jumps on your chest
    s.mode = 'ride';
    d.riding = m; d.breath = 0; d.rideT = 0;
    m.view.root.visible = false;
    ctx.audio.scream(0.4, 0.3);
    ctx.audio.muffle?.(0.6);
    ctx.after(0.2, () => ctx.audio.muffle?.(0));
    ctx.hud.say(T('Respira! Premi a ritmo.', 'Breathe! Press in rhythm.'), 1600);
  }
}

// mares peer from a floor cell next to a curtain, out of reach of your hand
function mareSpot(ctx) {
  const p = ctx.player.pos;
  const out = [];
  for (const c of ctx.map.find('curtain')) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cell = ctx.map.cell(c.cx + dx, c.cy + dy);
      if (!cell || cell.solid) continue;
      const w = ctx.map.toWorld(c.cx + dx, c.cy + dy);
      w.x -= dx * 0.55; w.z -= dy * 0.55;
      const dist = w.distanceTo(p);
      if (dist > 5 && dist < 14) out.push(w);
    }
  }
  return out[Math.floor(Math.random() * out.length)] || ctx.map.freeAround(p.x, p.z, 6, 14, 1)[0];
}

function swapCurtains(ctx) {
  const d = ctx.data;
  const closing = d.curtains === 'A' ? 'setB' : 'setA', opening = d.curtains === 'A' ? 'setA' : 'setB';
  const busy = (cx, cy) => {
    const pc = ctx.map.toCell(ctx.player.pos.x, ctx.player.pos.z);
    if (pc[0] === cx && pc[1] === cy) return true;
    return ctx.monsters.list.some((m) => { const c = ctx.map.toCell(m.pos.x, m.pos.z); return c[0] === cx && c[1] === cy; });
  };
  for (const p of ctx.map.find(opening)) ctx.map.setSolid(p.cx, p.cy, false);
  for (const p of ctx.map.find(closing)) if (!busy(p.cx, p.cy)) ctx.map.setSolid(p.cx, p.cy, true);
  d.curtains = d.curtains === 'A' ? 'B' : 'A';
  ctx.audio.burst(0.8, 900, 0.7, 0.12, 'bandpass', 300);
}
