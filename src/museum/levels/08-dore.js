// Level 8 · Gustave Doré, wood engravings for Dante's Inferno (1861).
// Rule: the descent. Three plates, three circles, three laws, and no way back.
//   I.   Acheron (canto III): the crowd of souls never ends. Cut through it and bring down Charon.
//   II.  The burning sand (canto XV): fire rains. Stand still and you burn; only the rocks shelter you.
//   III. Cocytus (canto XXXII): ice. You slide. The heads of the traitors bite from below.
//        Shots on the ice crack it: the water drowns the heads, and you too.

const T = (it, en) => ({ it, en });
const OP = '/museo/opere/08/';

// 22 x 48 cells, north at the top. One circle below the other.
//   . shore   ~ Acheron (deep, slow)   s sand   r rock (solid)   h shelter under the rock
//   = ice     D E gates of the descent   M a/b/c spawns of each circle   P start
function descentGrid() {
  const W = 22, H = 48;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  // I. the shore of the Acheron
  fill(1, 1, 20, 13, '.'); fill(11, 1, 20, 11, '~'); fill(9, 4, 10, 11, '~');
  fill(16, 12, 20, 13, '.');
  fill(17, 14, 19, 14, 'D');
  // II. the burning sand
  fill(1, 15, 20, 30, 's');
  for (const [x, y, w, h] of [[4, 18, 2, 2], [12, 17, 3, 2], [17, 21, 2, 3], [7, 23, 3, 2], [2, 27, 2, 2], [13, 26, 2, 2], [18, 28, 2, 1]]) {
    fill(x - 1, y - 1, x + w, y + h, 'h'); fill(x, y, x + w - 1, y + h - 1, 'r');
  }
  fill(2, 31, 4, 31, 'E');
  // III. Cocytus
  fill(1, 32, 20, 46, '=');
  for (const [x, y] of [[3, 2], [6, 1], [2, 8], [6, 12], [12, 12], [8, 2]]) g[y][x] = 'a';
  for (const [x, y] of [[2, 16], [19, 16], [10, 21], [3, 25], [19, 25], [10, 29], [15, 19]]) g[y][x] = 'b';
  for (const [x, y] of [[4, 36], [12, 35], [18, 37], [6, 41], [15, 42], [10, 45], [2, 44], [19, 44]]) g[y][x] = 'c';
  g[2][3] = 'P';
  // each circle has its own rock
  for (let y = 15; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '#') g[y][x] = y >= 32 ? 'k' : 'j';
  return g.map((r) => r.join(''));
}

export default {
  id: 'dore',
  artist: 'Gustave Doré',
  year: '1861',
  title: T('Inferno di Dante: canti III, XV, XXXII', 'Dante’s Inferno: cantos III, XV, XXXII'),
  museum: T('Xilografie per l’edizione Hachette', 'Wood engravings for the Hachette edition'),
  image: '/museo/opere/08-dore.jpg',
  credit: T('Riproduzioni: pubblico dominio (Wikimedia Commons)', 'Reproductions: public domain (Wikimedia Commons)'),
  intro: T('“Per me si va ne la città dolente.” Tre tavole incise, una sotto l’altra. Scendi dentro il bianco e nero di Doré: nessuna porta si riapre alle tue spalle.',
    '“Through me the way into the suffering city.” Three engraved plates, one below the other. You descend into Doré’s black and white: no gate opens again behind you.'),
  rule: T('Tre gironi, tre leggi. All’Acheronte le anime non finiscono: aprile un varco e abbatti Caronte. Nel sabbione piove fuoco: se ti fermi bruci, ripàrati sotto le rocce. Nel Cocito si scivola e le teste mordono da sotto il ghiaccio: sparare a terra lo spacca e le affoga, ma l’acqua gelida uccide anche te.',
    'Three circles, three laws. At the Acheron the souls never end: cut through them and bring down Charon. On the sand fire rains: stand still and you burn, shelter under the rocks. On Cocytus you slide and heads bite from under the ice: shooting the ice cracks it and drowns them, but the freezing water kills you too.'),
  ruleShort: T('scendi: ogni girone ha la sua legge', 'descend: every circle has its law'),
  goal: T('Attraversa i tre gironi fino al fondo del Cocito.', 'Cross the three circles to the bottom of Cocytus.'),
  paint: '#e8e4dc',
  accent: '#e8e0d0',
  fx: { mono: 1, tint: [0.96, 0.95, 0.92], keepRed: 0, contrast: 0.85, exposure: 1.2, grain: 0.35, scratches: 0.25, dust: 0.3, flicker: 0.2, weave: 0.15, smear: 0.2, vignette: 0.7 },
  player: { hp: 110, speed: 5.4 },
  zones: { acheronte: { speed: 0.55, friction: 0.6 }, sabbia: { speed: 1 }, riparo: { speed: 1 }, gelo: { speed: 1.15, friction: 0.04 }, crepa: { speed: 0.35, friction: 0.5, dps: 34 } },
  discovery: {
    title: T('Il libro che nessuno voleva stampare', 'The book no one wanted to print'),
    text: T('Doré aveva ventitré anni quando decise di illustrare tutta la Commedia. Nessun editore volle rischiare un libro così grande e costoso: la prima edizione dell’Inferno, nel 1861, la pagò lui. Disegnava direttamente sui blocchi di legno e una squadra di incisori li scavava; il nome in basso a destra della tavola del Cocito, PISAN, è quello di Héliodore Pisan, uno di loro. Le sue 135 tavole sono ancora oggi il modo in cui il mondo immagina l’Inferno.',
      'Doré was twenty-three when he decided to illustrate the whole Comedy. No publisher wanted to risk such a large, expensive book: he paid for the first edition of the Inferno, in 1861, himself. He drew straight onto the wood blocks and a team of engravers cut them; the name at the bottom right of the Cocytus plate, PISAN, is Héliodore Pisan, one of them. His 135 plates are still how the world imagines Hell.'),
    image: '/museo/opere/08/canto-xxxii.jpg',
  },
  deathLine: T('Lasciate ogne speranza.', 'Abandon all hope.'),

  async setup(ctx) {
    const { THREE, CELL } = ctx;
    const grid = descentGrid();
    const [xv, xxxii] = await Promise.all([ctx.art.load(OP + 'canto-xv.jpg'), ctx.art.load(OP + 'canto-xxxii.jpg')]);
    const iii = ctx.art.image;
    const plate = (img, rect, rx = 1, ry = 1) => {
      const c = document.createElement('canvas'); const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
      const [x, y, w, h] = rect; const k = Math.min(1, 768 / Math.max(W * w, H * h));
      c.width = Math.round(W * w * k); c.height = Math.round(H * h * k);
      c.getContext('2d').drawImage(img, W * x, H * y, W * w, H * h, 0, 0, c.width, c.height);
      const t = ctx.art.tex(c); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(rx, ry); return t;
    };
    const matte = (map, color = 0xffffff) => new THREE.MeshBasicMaterial({ map, color });
    const tex = {
      wall: matte(plate(iii, [0.0, 0.05, 0.42, 0.4]), 0xd8d8d8),
      door: matte(plate(iii, [0.46, 0.0, 0.3, 0.3]), 0x909090),
      rock: matte(plate(xv, [0.5, 0.62, 0.3, 0.25]), 0xe0e0e0),
      floor: matte(plate(iii, [0.25, 0.74, 0.25, 0.16], 1, 1), 0xd0d0d0),
      ice: matte(plate(xxxii, [0.02, 0.05, 0.3, 0.45]), 0xc8ccd4),
    };
    ctx.map.build({
      grid,
      legend: {
        '~': { zone: 'acheronte' }, s: { zone: 'sabbia', circle: 2 }, h: { zone: 'riparo', circle: 2 }, r: { solid: true, tex: 'rock' }, '=': { zone: 'gelo', circle: 3, ice: true },
        j: { solid: true, tex: 'rock' }, k: { solid: true, tex: 'ice' },
        D: { solid: true, tex: 'door', gate1: true }, E: { solid: true, tex: 'door', gate2: true },
        a: { spawn1: true }, b: { spawn2: true, zone: 'sabbia' }, c: { spawn3: true, zone: 'gelo', ice: true },
        P: { start: true },
      },
      textures: tex, height: 6, ceiling: false,
    });
    // each circle has its own floor: plates laid on the ground
    const W = grid[0].length * CELL;
    const floorPlane = (z0, z1, map, color, y = 0.004) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W, (z1 - z0) * CELL), new THREE.MeshBasicMaterial({ map, color }));
      m.rotation.x = -Math.PI / 2; m.position.set(W / 2, y, ((z0 + z1) / 2) * CELL);
      m.material.map.repeat.set(W / 8, ((z1 - z0) * CELL) / 8);
      return ctx.add(m);
    };
    const riverT = plate(iii, [0.42, 0.78, 0.5, 0.2]);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(12 * CELL, 11 * CELL), new THREE.MeshBasicMaterial({ map: riverT, color: 0xb8b8b8 }));
    river.rotation.x = -Math.PI / 2; river.position.set(15 * CELL, 0.006, 6.5 * CELL); riverT.repeat.set(3, 3);
    ctx.add(river);
    floorPlane(15, 31, plate(xv, [0.45, 0.66, 0.3, 0.2]), 0xe8e8e8);
    floorPlane(32, 47, plate(xxxii, [0.05, 0.62, 0.9, 0.3]), 0xc8ccd0);
    // the sky of each plate, hung above the walls
    // a plate's sky with its edges dissolved, so it hangs in the dark without a frame
    const soft = (img, rect) => {
      const c = document.createElement('canvas'); const IW = img.naturalWidth || img.width, IH = img.naturalHeight || img.height;
      const [x, y, w, h] = rect; c.width = 768; c.height = Math.round(768 * (IH * h) / (IW * w));
      const g = c.getContext('2d'); g.drawImage(img, IW * x, IH * y, IW * w, IH * h, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in';
      const gx = g.createLinearGradient(0, 0, c.width, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.18, '#000'); gx.addColorStop(0.82, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gx; g.fillRect(0, 0, c.width, c.height);
      const gy = g.createLinearGradient(0, 0, 0, c.height); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.25, '#000'); gy.addColorStop(0.75, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gy; g.fillRect(0, 0, c.width, c.height);
      return ctx.art.tex(c);
    };
    const backdrop = (img, rect, x, z, rot = 0, w = W * 1.6, h = 26) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: soft(img, rect), fog: false, color: 0x9a9a9a, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
      m.position.set(x, h / 2 + 2, z); m.rotation.y = rot; return ctx.add(m);
    };
    backdrop(iii, [0.42, 0.0, 0.58, 0.4], W / 2, -18);
    backdrop(xv, [0.55, 0.0, 0.45, 0.35], W + 20, 23 * CELL, -Math.PI / 2, 40, 30);
    backdrop(xv, [0.0, 0.0, 0.45, 0.35], -20, 23 * CELL, Math.PI / 2, 40, 30);
    backdrop(xxxii, [0.0, 0.0, 1, 0.42], W / 2, 48 * CELL + 18, Math.PI);
    ctx.light({ ambient: 1, lantern: { angle: 0.55, range: 18, intensity: 30, color: 0xffffff }, fog: { color: 0x141414, near: 6, far: 38 }, sky: 0x1c1c1c });

    // Charon's boat at the gate of the descent
    const gates1 = ctx.map.find('gate1'), gates2 = ctx.map.find('gate2');
    const boatPos = ctx.map.toWorld(18, 12);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, 6.5, 10, 1, false, 0, Math.PI), new THREE.MeshBasicMaterial({ map: plate(iii, [0.6, 0.66, 0.25, 0.1]), color: 0x6a6a6a, side: THREE.DoubleSide }));
    hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2; hull.position.set(boatPos.x, 0.5, boatPos.z - 3.2);
    ctx.add(hull);

    // ---------- the damned, cut from the plates ----------
    const S = async (n) => ctx.art.load(OP + n + '.webp');
    const [piegata, braccia, capelli, implora, strisciano, caronte, steso, steso2, rannicchiato, braccio, brunetto, poeti, ...teste] = await Promise.all(
      ['piegata', 'braccia', 'capelli', 'implora', 'strisciano', 'caronte', 'steso', 'steso2', 'rannicchiato', 'braccio', 'brunetto', 'poeti', 'testa1', 'testa2', 'testa3', 'testa4', 'testa5', 'testa6'].map(S));
    const ink = 0x141414;
    const soul = (name, sprite, o = {}) => ({ name, sprite, height: 1.85, hp: 1.4, speed: 3.4, dmg: 6, reach: 1.15, radius: 0.32, behavior: 'chase', twitch: 0.8, rot: 0.25, tear: 0.6, selfLit: 0.4, blood: ink, attackEvery: 0.7, ...o });
    const SOULS = [
      soul(T('L’anima piegata', 'The bent soul'), piegata),
      soul(T('L’anima che urla', 'The screaming soul'), braccia, { height: 2.0, speed: 3.0 }),
      soul(T('La dannata', 'The damned woman'), capelli, { height: 1.9, parts: [{ type: 'strands', n: 14, len: 1.1, color: 0x101010, at: [0, 1.7, 0.03], spread: 0.18 }] }),
      soul(T('Chi implora', 'The one who begs'), implora, { height: 1.4, behavior: 'crawl', speed: 2.6 }),
      soul(T('Quelli che strisciano', 'Those who crawl'), strisciano, { height: 1.2, behavior: 'crawl', speed: 2.2, hp: 2.6, radius: 0.6 }),
    ];
    const CHARON = {
      name: T('Caronte, dimonio con occhi di bragia', 'Charon, demon with eyes of embers'),
      sprite: caronte, height: 3.6, hp: 34, speed: 1.4, dmg: 22, reach: 3.0, radius: 0.7, boss: true, score: 10,
      parts: [{ type: 'eyes', at: [[0.08, 0.83], [0.12, 0.83]], size: 0.045, glow: 1, color: 0xff7030 }],
      twitch: 0.3, rot: 0.15, tear: 0.4, selfLit: 0.5, blood: ink,
      behavior(m, c, dt) {
        const s = m.state, p = c.player.pos;
        const d = m.pos.distanceTo(p);
        s.cd = (s.cd ?? 1.2) - dt;
        if (s.swing != null) {
          s.swing -= dt; m.anger = 1;
          if (s.swing <= 0) {
            s.swing = null; s.cd = 1.6 / Math.sqrt(c.D.rate); m.lunge = 1;
            c.audio.burst(0.3, 300, 1, 0.3, 'lowpass', 90);
            if (d < m.reach + 0.6) {
              c.player.hurt(m.dmg, m);
              const away = p.clone().sub(m.pos).setY(0).normalize();
              c.player.push(away.x * 14, away.z * 14);
              c.hud.whisper(T('il remo', 'the oar'));
            }
          }
          return;
        }
        if (d < m.reach + 1.2 && s.cd <= 0) { s.swing = 0.75; c.audio.growl(0.35, 0.3); return; }
        // he never leaves his boat for long
        const home = m.data.home;
        if (m.pos.distanceTo(home) > 7) c.monsters.walkTo(m, home, m.speed, dt);
        else c.monsters.walkTo(m, p, m.speed, dt);
      },
      onDeath(m, c) { c.data.charonDead = true; },
    };
    const lying = (name, sprite, o = {}) => ({ name, sprite, height: 0.9, hp: 2.6, speed: 3.6, dmg: 10, reach: 1.2, radius: 0.55, behavior: 'lurk', twitch: 0.4, rot: 0.3, selfLit: 0.5, blood: ink, ...o });
    const SAND = [
      lying(T('Il disteso', 'The one lying down'), steso, { height: 0.85 }),
      lying(T('Il supino', 'The one face up'), steso2, { height: 1.1 }),
      lying(T('Il rannicchiato', 'The curled one'), rannicchiato, { height: 1.3, behavior: 'charge', speed: 2.6 }),
      lying(T('Il braccio levato', 'The raised arm'), braccio, { height: 2.0, behavior: 'chase', speed: 2.8 }),
    ];
    const BRUNETTO = {
      name: T('Brunetto Latini, il maestro', 'Brunetto Latini, the teacher'),
      sprite: brunetto, height: 2.6, hp: 14, speed: 2.4, dmg: 12, reach: 1.4, radius: 0.5, behavior: 'charge', score: 4,
      twitch: 0.4, rot: 0.2, selfLit: 0.5, blood: ink,
      onAttack(m, c) { c.data.grab = 1.6; c.hud.whisper(T('“Qual maraviglia!” ti tiene per il lembo', '“What a marvel!” he holds you by the hem')); },
    };
    const HEAD = (sprite) => ({
      name: T('La testa nel ghiaccio', 'The head in the ice'),
      sprite, height: 0.75, hp: 2.4, speed: 2.4, dmg: 11, reach: 1.25, radius: 0.35, twitch: 0.9, rot: 0.2, tear: 0.2, breathe: 0.5, selfLit: 0.55, blood: 0x202428,
      parts: [{ type: 'teeth', at: [0, 0.28], r: 0.07, n: 9 }],
      behavior(m, c, dt) {
        const s = m.state, p = c.player.pos;
        s.t = (s.t ?? 1 + Math.random() * 2) - dt;
        if (s.up) {
          m.lift = Math.min(0, m.lift + dt * 2.5);
          c.monsters.melee(m, dt);
          if (s.t <= 0) { s.up = false; s.t = 1.5 + Math.random() * 2; }
        } else {
          m.lift = Math.max(-0.9, m.lift - dt * 2.5);
          // it glides under the ice towards you
          c.monsters.walkTo(m, p, m.speed, dt);
          if (s.t <= 0 && m.pos.distanceTo(p) < 4.5) { s.up = true; s.t = 2.6 + Math.random(); c.audio.burst(0.25, 2400, 3, 0.15, 'highpass', 900); c.particles.burst({ x: m.pos.x, y: 0.1, z: m.pos.z }, 10, 0xd8dce0, 1.8, 0.6); }
        }
      },
      onHit(m, shot) { return m.lift < -0.4 ? 0 : shot.dmg; },
    });
    const HEADS = teste.map(HEAD);
    const POETS = { name: T('Dante e Virgilio', 'Dante and Virgil'), sprite: poeti, height: 3.4, hp: 999, behavior: 'still', dmg: 0, reach: 0, counts: false, hittable: false, fixed: true, selfLit: 0.8, twitch: 0, rot: 0.05, tear: 0.1, breathe: 0.2 };

    const at = (flag) => ctx.map.find(flag);
    const pick = (list, min = 6) => { const pp = ctx.player.pos; const ok = list.filter((q) => q.distanceTo(pp) > min); const l = ok.length ? ok : list; return l[Math.floor(Math.random() * l.length)]; };
    // the crowd pours from behind and from the water
    const behind = () => { const pp = ctx.player.pos; const opts2 = at('spawn1').concat(ctx.map.freeAround(pp.x, pp.z, 7, 13, 4)); return pick(opts2, 6); };
    const charon = ctx.spawn(CHARON, ctx.map.toWorld(18, 11), { instant: true, data: {} });
    charon.data.home = charon.pos.clone();

    ctx.data = {
      circle: 1, charonDead: false, gates1, gates2, burn: 0, grab: 0, crackMap: new Map(), cracks: [], heads: 0, poets: null, end: 0, still: 0,
      SOULS, SAND, BRUNETTO, HEADS, POETS, pick, at, charon,
    };
    ctx.data.sp1 = ctx.spawner({ kinds: SOULS.map((d, i) => ({ def: d, w: i === 4 ? 1 : 3 })), first: 6, every: 0.9, burst: 2, max: 9, where: behind });
    ctx.hud.goal(T('abbatti Caronte', 'bring down Charon'), '☠');
    ctx.after(0.8, (c) => c.hud.say(T('Canto III · L’Acheronte. Caronte aspetta alla barca.', 'Canto III · The Acheron. Charon waits by the boat.'), 3000));
    ctx.pickup(ctx.map.toWorld(4, 10), { kind: 'heal', amount: 30 });
    // the fire of canto XV: long white flakes, as Doré cut them, falling slanted around you
    const NF = matchMedia('(pointer: coarse)').matches ? 140 : 260;
    const flake = new THREE.PlaneGeometry(0.07, 1.1); flake.rotateZ(0.35);
    const flakes = new THREE.InstancedMesh(flake, new THREE.MeshBasicMaterial({ color: 0xfff6e8, fog: true, side: THREE.DoubleSide }), NF);
    flakes.frustumCulled = false; flakes.visible = false;
    const fl = Array.from({ length: NF }, () => ({ x: Math.random() * 24 - 12, y: Math.random() * 10, z: Math.random() * 24 - 12, v: 6 + Math.random() * 4 }));
    ctx.add(flakes);
    ctx.data.rain = { flakes, fl, on: false, stop() { this.on = false; flakes.visible = false; } };
    // cracks in the ice, drawn once
    const cc = document.createElement('canvas'); cc.width = cc.height = 256;
    { const g = cc.getContext('2d'); g.strokeStyle = 'rgba(10,12,14,0.95)'; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) { g.lineWidth = 1 + Math.random() * 3; g.beginPath(); let x = 128, y = 128; g.moveTo(x, y); const a = Math.random() * Math.PI * 2; for (let k = 0; k < 7; k++) { x += Math.cos(a + (Math.random() - 0.5)) * 22; y += Math.sin(a + (Math.random() - 0.5)) * 22; g.lineTo(x, y); } g.stroke(); } }
    ctx.data.crackTex = ctx.art.tex(cc);
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player, CELL = ctx.CELL;
    const row = Math.floor(p.pos.z / CELL);
    // ---------- I. Acheron ----------
    if (d.circle === 1) {
      if (d.charonDead && !d.open1) {
        d.open1 = true;
        for (const g of d.gates1) ctx.map.setSolid(g.cx, g.cy, false);
        ctx.audio.toll(44);
        ctx.hud.say(T('Caronte è caduto. La riva si apre verso il basso.', 'Charon has fallen. The shore opens downwards.'), 3000);
        ctx.hud.goal(T('scendi', 'go down'), '↓');
      }
      if (row >= 15) {
        d.circle = 2;
        for (const g of d.gates1) ctx.map.setSolid(g.cx, g.cy, true);
        d.sp1.stop();
        for (const m of ctx.monsters.list.slice()) if (!m.dying && m.pos.z < 15 * CELL) ctx.monsters.remove(m);
        ctx.audio.toll(38);
        ctx.hud.say(T('Canto XV · Il sabbione. Non fermarti.', 'Canto XV · The burning sand. Do not stop.'), 3000);
        d.rain.on = true; d.rain.flakes.visible = true;
        d.kill2 = ctx.kills;
        d.sp2 = ctx.spawner({ kinds: d.SAND.map((x, i) => ({ def: x, w: i === 3 ? 2 : 3 })).concat([{ def: d.BRUNETTO, w: 0.6 }]), first: 5, every: 1.5, max: 8, where: () => d.pick(d.at('spawn2').concat(ctx.map.freeAround(p.pos.x, p.pos.z, 6, 12, 3).filter((q) => ctx.map.zoneAt(q.x, q.z) === 'sabbia')), 5) });
        ctx.pickup(ctx.map.toWorld(11, 22), { kind: 'heal', amount: 30 });
      }
    }
    // ---------- II. the burning sand ----------
    if (d.rain.on) {
      const m4 = d.m4 || (d.m4 = new ctx.THREE.Matrix4());
      d.rain.fl.forEach((f, i) => {
        f.y -= f.v * dt; f.x -= f.v * dt * 0.36;
        if (f.y < 0) { f.y = 8 + Math.random() * 3; f.x = Math.random() * 24 - 12; f.z = Math.random() * 24 - 12; if (Math.random() < 0.3) ctx.particles.burst({ x: p.pos.x + f.x, y: 0.05, z: p.pos.z + f.z }, 2, 0xfff0d0, 0.8, 0.3); }
        const wx = p.pos.x + f.x, wz = p.pos.z + f.z, under = ctx.map.zoneAt(wx, wz) === 'riparo';
        m4.makeRotationY(p.yaw); m4.setPosition(wx, under ? -5 : f.y, wz);
        d.rain.flakes.setMatrixAt(i, m4);
      });
      d.rain.flakes.instanceMatrix.needsUpdate = true;
    }
    if (d.circle === 2) {
      const left = Math.max(0, 16 - (ctx.kills - d.kill2));
      ctx.hud.goal(T('dannati del sabbione', 'damned of the sand'), left);
      const z = ctx.map.zoneAt(p.pos.x, p.pos.z);
      const speed = Math.hypot(p.vel.x, p.vel.z);
      const exposed = z === 'sabbia' || z === 'b';
      if (exposed) {
        // the flakes catch on you when you stop
        d.burn = Math.min(1.4, d.burn + dt * (speed < 1.6 ? 0.9 : -0.35));
        if (d.burn > 0.5) ctx.player.hurt((d.burn - 0.5) * 24 * dt);
        if (Math.random() < dt * 30) ctx.particles.burst({ x: p.pos.x + (Math.random() - 0.5) * 3, y: 0.05, z: p.pos.z + (Math.random() - 0.5) * 3 }, 2, 0xfff0d0, 1, 0.4);
      } else d.burn = Math.max(0, d.burn - dt * 1.2);
      if (z === 'riparo' && d.burn <= 0) ctx.player.heal(dt * 2.5);
      ctx.hud.bar('fuoco', { label: T('fuoco addosso', 'fire on you'), value: Math.min(1, d.burn), color: '#f4ead8' });
      ctx.fx.exposure = 1.2 + d.burn * 0.35;
      ctx.fx.wobble = d.burn * 0.25;
      if (d.grab > 0) { d.grab -= dt; p.speedMul = 0.35; } else p.speedMul = 1;
      if (left <= 0 && !d.open2) {
        d.open2 = true;
        for (const g of d.gates2) ctx.map.setSolid(g.cx, g.cy, false);
        ctx.audio.toll(36);
        ctx.hud.say(T('Il sabbione tace. Sotto, il freddo.', 'The sand falls silent. Below, the cold.'), 3000);
      }
      if (d.open2 && row >= 32) {
        d.circle = 3; p.speedMul = 1;
        for (const g of d.gates2) ctx.map.setSolid(g.cx, g.cy, true);
        d.sp2.stop(); d.rain.stop();
        for (const m of ctx.monsters.list.slice()) if (!m.dying && m.pos.z < 32 * CELL) ctx.monsters.remove(m);
        ctx.hud.remove('fuoco'); ctx.fx.exposure = 1.25; ctx.fx.wobble = 0;
        ctx.hud.say(T('Canto XXXII · Il Cocito. Il ghiaccio non regge i colpi.', 'Canto XXXII · Cocytus. The ice does not bear the shots.'), 3200);
        d.kill3 = ctx.kills;
        d.sp3 = ctx.spawner({ kinds: d.HEADS.map((x) => ({ def: x, w: 1 })), first: 5, every: 1.3, max: 8, where: () => d.pick(d.at('spawn3').concat(ctx.map.freeAround(p.pos.x, p.pos.z, 5, 11, 3).filter((q) => ctx.map.zoneAt(q.x, q.z) === 'gelo')), 4), opts: { instant: true } });
        ctx.fx.tint = [0.9, 0.94, 1.0];
        ctx.light({ fog: { color: 0x202428, near: 5, far: 34 } });
      }
    }
    // ---------- III. Cocytus ----------
    if (d.circle === 3) {
      // cracks freeze over again
      for (const c of d.cracks) {
        if (!c.open) continue;
        c.t -= dt;
        c.mesh.material.opacity = Math.min(1, c.t);
        if (c.t <= 0) { c.open = false; c.n = 0; ctx.map.setZone(c.cx, c.cy, 'gelo'); ctx.remove(c.mesh); if (c.decal) { ctx.remove(c.decal); c.decal = null; } }
      }
      const left = Math.max(0, 18 - (ctx.kills - d.kill3));
      if (left > 0) ctx.hud.goal(T('traditori nel ghiaccio', 'traitors in the ice'), left);
      else if (!d.poets) {
        d.sp3.stop();
        for (const m of ctx.monsters.list.slice()) if (!m.dying && m.counts) ctx.monsters.kill(m);
        const pos = ctx.map.toWorld(10, 45);
        d.poets = ctx.spawn(d.POETS, pos, {});
        ctx.audio.toll(30);
        ctx.hud.say(T('In fondo al lago, due figure in piedi ti guardano.', 'At the bottom of the lake, two standing figures watch you.'), 3200);
      } else if (!d.end) {
        ctx.hud.goal(T('raggiungi le due figure', 'reach the two figures'), Math.round(p.pos.distanceTo(d.poets.pos)) + ' m');
        if (p.pos.distanceTo(d.poets.pos) < 3) {
          d.end = ctx.time; p.frozen = true;
          ctx.hud.say(T('Sono Dante e Virgilio. Ti guardano dall’alto, come si guarda un dannato. Sei tu, la testa nel ghiaccio.', 'It is Dante and Virgil. They look down at you, the way one looks at the damned. You are the head in the ice.'), 4600);
        }
      } else {
        const t = ctx.time - d.end;
        p.eye = Math.max(0.35, 1.55 - t * 0.6);
        ctx.fx.blur = t * 0.2;
        if (t > 3.2 && !d.won) { d.won = true; ctx.win(); }
      }
    }
  },

  // on the ice every shot that misses cracks it; three cracks open the freezing water
  onShot(ctx, shot) {
    const d = ctx.data;
    if (d.circle !== 3 || shot.monster || !shot.point || shot.point.y > 0.06) return;
    const { THREE, CELL } = ctx;
    const cell = ctx.map.cellAt(shot.point.x, shot.point.z);
    if (!cell || !cell.def.ice) return;
    const key = cell.cx + ',' + cell.cy;
    let c = d.crackMap.get(key);
    if (!c) { c = { cx: cell.cx, cy: cell.cy, n: 0, open: false, t: 0, mesh: null }; d.crackMap.set(key, c); d.cracks.push(c); }
    if (c.open) return;
    c.n++;
    if (!c.decal) {
      const w0 = ctx.map.toWorld(c.cx, c.cy);
      c.decal = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.95, CELL * 0.95), new THREE.MeshBasicMaterial({ map: d.crackTex, transparent: true, opacity: 0.4, depthWrite: false }));
      c.decal.rotation.x = -Math.PI / 2; c.decal.rotation.z = Math.random() * 6; c.decal.position.set(w0.x, 0.01, w0.z);
      ctx.add(c.decal);
    }
    c.decal.material.opacity = Math.min(1, 0.35 + c.n * 0.3);
    ctx.particles.burst(shot.point, 12, 0xe8eef2, 2, 0.5);
    ctx.audio.burst(0.12, 3800, 2, 0.12, 'highpass', 1600);
    if (c.n >= 3) {
      c.open = true; c.t = 6;
      ctx.map.setZone(c.cx, c.cy, 'crepa');
      const w = ctx.map.toWorld(c.cx, c.cy);
      c.mesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), new THREE.MeshBasicMaterial({ color: 0x030405, transparent: true }));
      c.mesh.rotation.x = -Math.PI / 2; c.mesh.position.set(w.x, 0.012, w.z);
      ctx.add(c.mesh);
      ctx.audio.burst(0.6, 600, 1, 0.3, 'lowpass', 120);
      // the water takes whatever is in it
      for (const m of ctx.monsters.list) if (!m.dying && Math.abs(m.pos.x - w.x) < CELL * 0.75 && Math.abs(m.pos.z - w.z) < CELL * 0.75) ctx.monsters.kill(m);
    }
  },

  teardown(ctx) { ctx.player.speedMul = 1; },
};
