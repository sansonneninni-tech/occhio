// LIVELLO 3 · Pieter Bruegel il Vecchio, Il Trionfo della Morte (c. 1562).
// An open plain under a burning sky. The army of the dead advances behind its coffin lids, and from
// the dead trees the bells call more of them. Rule: silence the three bells before the front reaches
// you. Behind the front nothing lives. Every silenced bell pushes the army back.

const T = (it, en) => ({ it, en });
const W = 42, H = 22;           // cells
const FRONT_SPEED = 0.42;        // m/s
const FRONT_PUSH = 9;            // m per silenced bell

export default {
  id: 'bruegel',
  artist: 'Pieter Bruegel il Vecchio',
  year: 'c. 1562',
  title: T('Il Trionfo della Morte', 'The Triumph of Death'),
  museum: T('Museo del Prado, Madrid', 'Museo del Prado, Madrid'),
  image: '/museo/opere/03-bruegel.jpg',
  credit: T('Riproduzione: pubblico dominio (Museo del Prado)', 'Reproduction: public domain (Museo del Prado)'),
  intro: T(
    'Nessuno si salva: né il re con la sua botte d’oro, né il cardinale, né i giocatori a carte. Gli scheletri avanzano in file, dietro scudi fatti con i coperchi delle bare. Sugli alberi morti suonano le campane.',
    'Nobody is spared: not the king with his barrel of gold, not the cardinal, not the card players. The skeletons march in ranks behind shields made of coffin lids. On the dead trees the bells are ringing.'),
  rule: T(
    'L’esercito dei morti avanza da est: dietro il fronte si muore. Abbatti le tre campane sugli alberi, che chiamano altri scheletri: ogni campana che tace respinge l’esercito. I coperchi delle bare parano i colpi: mira allo scheletro.',
    'The army of the dead advances from the east: behind the front you die. Bring down the three bells on the trees, which call more skeletons: every bell that falls silent pushes the army back. The coffin lids stop your shots: aim at the skeleton.'),
  ruleShort: T('fai tacere le tre campane', 'silence the three bells'),
  goal: T('Fai tacere le tre campane.', 'Silence the three bells.'),
  paint: '#8a2a10',
  accent: '#e07030',
  fx: { exposure: 1.3, mono: 0.55, tint: [1.0, 0.82, 0.6], keepRed: 0.9, contrast: 0.6, grain: 0.45, scratches: 0.45, dust: 0.7, flicker: 0.35, smear: 0.25, vignette: 0.55 },
  discovery: {
    title: T('Gli amanti che non sentono', 'The lovers who do not hear'),
    text: T(
      'Guarda l’angolo in basso a destra: due amanti suonano e cantano, non si accorgono di niente, e dietro di loro uno scheletro li accompagna con la viella. Sono gli unici che la Morte non ha ancora toccato. Bruegel lo chiamavano «Pier il Buffone» e lo credevano un pittore di contadini, ma era un uomo coltissimo: sul letto di morte chiese alla moglie di bruciare certi suoi disegni, perché erano troppo feroci.',
      'Look at the bottom right corner: two lovers play and sing, they notice nothing, and behind them a skeleton accompanies them on the hurdy-gurdy. They are the only ones Death has not touched yet. People called Bruegel “Pier the Droll” and took him for a painter of peasants, but he was a deeply learned man: on his deathbed he asked his wife to burn some of his drawings, because they were too savage.'),
  },
  deathLine: T('Il fronte è passato. Ora marci con loro.', 'The front has passed. Now you march with them.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const C = ctx.CELL;
    // the plain: open sky, a few ruins, the great coffin-trap in the middle (B)
    const rows = [];
    for (let y = 0; y < H; y++) {
      let r = '';
      for (let x = 0; x < W; x++) r += x === 0 || y === 0 || x === W - 1 || y === H - 1 ? ' ' : '.';
      rows.push(r.split(''));
    }
    const put = (x, y, ch) => { rows[y][x] = ch; };
    // the trap: a long red box with a cross, where the crowd is herded
    for (let x = 18; x <= 23; x++) for (let y = 9; y <= 12; y++) put(x, y, 'B');
    // ruins and the tower at the left of the painting
    for (const [x, y] of [[8, 4], [9, 4], [8, 5], [30, 16], [31, 16], [31, 17], [12, 16], [27, 5], [35, 9], [35, 10], [6, 13]]) put(x, y, '#');
    put(2, 11, 'P');
    const grid = rows.map((r) => r.join(''));
    const ground = ctx.art.wall([0.32, 0.25, 0.3, 0.15], { dark: 0 });
    const trapTex = ctx.art.wall([0.72, 0.44, 0.12, 0.12], { dark: 0 });
    const ruin = ctx.art.wall([0.0, 0.42, 0.12, 0.14], { dark: 0 });
    const glowMat = (map, k) => new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, roughness: 0.95 });
    ctx.map.build({
      grid,
      legend: { B: { solid: true, tex: 'trap' } },
      textures: { floor: glowMat(ground, 0.2), wall: glowMat(ruin, 0.25), trap: glowMat(trapTex, 0.25) },
      height: 3.4, ceiling: false, floorRepeat: 0.3,
    });
    // the burning sky of the painting as the horizon
    const skyTex = ctx.art.tex(ctx.art.crop([0, 0, 1, 0.22], 1600));
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    ctx.light({ ambient: 0.85, color: 0xffc890, ground: 0x2a1408, lantern: false, fog: { color: 0x3a1a0c, near: 10, far: 62 }, sky: skyTex });
    ctx.player.place(2.5 * C, 11.5 * C, Math.PI / 2);

    // ash falling over the whole plain
    ctx.particles.emitter({ area: [0, 0, W * C, H * C], rate: 30, color: 0x9a8a78, fall: 0.8, wind: [-0.6, 0.2], life: 6, y: 9 });

    // ---- the army front: a wall of skulls cut from the painting, moving west ----
    const skulls = ctx.art.tex(ctx.art.cutout({ rect: [0.86, 0.54, 0.14, 0.1], oval: false, rot: 0.6, key: { dark: 0.08 } }));
    const frontMat = new THREE.MeshBasicMaterial({ map: skulls, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: 0xc8b8a0, fog: true });
    const front = new THREE.Group();
    for (let k = 0; k < 3; k++) for (let i = 0; i < 16; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), frontMat);
      p.position.set(k * 1.6, 1.2 + (k % 2) * 0.2, i * (H * C / 16) + (k ? 1 : 0));
      p.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      front.add(p);
    }
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(H * C, 8), new THREE.MeshBasicMaterial({ color: 0x0a0604, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: true }));
    dark.rotation.y = Math.PI / 2; dark.position.set(4, 4, H * C / 2);
    front.add(dark);
    ctx.add(front);

    // ---- the dead, cut from the painting ----
    const shield = {
      name: T('Lo scudo-bara', 'The coffin shield'),
      sprite: await ctx.art.load('/museo/opere/03-bruegel-scudo.webp'),
      height: 2.1, hp: 2.5, speed: 1.5, dmg: 5, reach: 1.3, attackEvery: 1.2, behavior: 'chase',
      twitch: 0.4, rot: 0.3, tear: 0.2,
      // the lid stops most of the shot; the bones behind it break
      zones: [{ name: 'coperchio', x: [-0.05, 0.5], y: [0, 1], mul: 0.4 }, { name: 'ossa', x: [-0.5, -0.05], y: [0, 1], mul: 1.6 }],
      parts: [{ type: 'eyes', at: [[-0.3, 0.86]], size: 0.03, color: 0xe8d8a0, glow: 1 }],
      blood: 0x6a5a40,
    };
    const skeleton = {
      name: T('Lo scheletro col lume', 'The skeleton with the lantern'),
      sprite: await ctx.art.load('/museo/opere/03-bruegel-scheletro.webp'),
      height: 1.9, hp: 2, speed: 2.8, dmg: 5, reach: 1.2, behavior: 'charge', attackEvery: 1.1,
      twitch: 0.8, rot: 0.4, tear: 0.4,
      parts: [{ type: 'eyes', at: [[-0.07, 0.93], [0.03, 0.93]], size: 0.025, color: 0x200000, pupil: 0x000000 }],
      onAttack: (m, c) => c.audio.growl(1.4, 0.15),
      blood: 0x8a7a60,
    };
    const horse = {
      name: T('Il cavallo rosso', 'The red horse'),
      sprite: await ctx.art.load('/museo/opere/03-bruegel-cavallo.webp'),
      height: 2.2, hp: 10, speed: 2.4, dmg: 13, reach: 1.8, attackEvery: 1.4, radius: 0.8, behavior: 'charge', boss: true,
      twitch: 0.5, rot: 0.3, tear: 0.5,
      zones: [{ name: 'costole', x: [-0.15, 0.25], y: [0.25, 0.6], mul: 2 }],
      parts: [{ type: 'strands', n: 10, len: 0.8, color: 0x2a1a10, at: [0.7, 1.4, -0.05], spread: 0.2 }],
      onDeath: (m, c) => { c.hud.say(T('Il cavallo crolla. La falce resta in piedi.', 'The horse falls. The scythe stays upright.'), 2200); c.pickup(m.pos, { kind: 'heal', amount: 50 }); },
      blood: 0x6a1a0a,
    };
    const bellDef = {
      name: T('La campana', 'The bell'),
      sprite: await ctx.art.load('/museo/opere/03-bruegel-campane.webp'),
      height: 6.5, hp: 12, fixed: true, counts: false, dmg: 0, reach: 0, radius: 0.9,
      behavior: toll, twitch: 0.1, rot: 0.2, tear: 0.15, breathe: 0.1, selfLit: 0.3,
      // the bells hang in the upper part of the tree: hit them there
      zones: [{ name: 'campana', x: [-0.5, 0.5], y: [0.62, 0.9], mul: 2 }, { name: 'tronco', x: [-0.5, 0.5], y: [0, 0.55], mul: 0.4 }],
      onDeath: bellDown,
      blood: 0x3a2a1a,
    };
    ctx.data = { front, frontX: (W - 3) * C, silenced: 0, defs: { shield, skeleton, horse }, hurtT: 0, horse: null };

    // the three bell trees, further and further east
    const bellCells = [[13, 4], [26, 16], [33, 6]];
    ctx.data.bells = bellCells.map(([cx, cy]) => ctx.spawn(bellDef, ctx.map.toWorld(cx, cy), { instant: true }));
    ctx.data.bells.forEach((b) => ctx.collider(b.pos.x, b.pos.z, 0.6));

    // the army comes out of the front line
    const where = (c) => {
      const x = Math.max(c.player.pos.x + 9, c.data.frontX - 1.5);
      for (let k = 0; k < 8; k++) {
        const z = 2 + Math.random() * (H * C - 4);
        if (!c.map.solid(x, z)) return new THREE.Vector3(Math.min(x, (W - 2) * C), 0, z);
      }
      return null;
    };
    ctx.data.army = ctx.spawner({ kinds: [{ def: shield, w: 3 }, { def: skeleton, w: 2 }], first: 3, every: 2, max: 4, where });
    // after the first bell, skeletons run across the plain from everywhere
    ctx.data.runners = ctx.spawner({ kinds: [{ def: skeleton, w: 1 }], first: 0, every: 5, max: 2, where: 'around', min: 12, maxDist: 20 });
    ctx.data.runners.stop();

    for (const [cx, cy] of [[10, 17], [24, 3], [29, 12]]) ctx.pickup(ctx.map.toWorld(cx, cy), { kind: 'heal', amount: 35 });
    ctx.hud.goal(T('campane', 'bells'), 3);
    ctx.hud.bar('front', { label: T('fronte dei morti', 'front of the dead'), value: 0, color: '#e07030' });
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player, C = ctx.CELL;
    d.frontX = Math.max(C * 1.2, d.frontX - FRONT_SPEED * (1 + d.silenced * 0.15) * dt);
    d.front.position.x += (d.frontX - d.front.position.x) * Math.min(1, dt * 2);
    const gap = d.frontX - p.pos.x;
    ctx.hud.bar('front', { value: Math.max(0, Math.min(1, 1 - gap / 40)) });
    ctx.fx.smear = 0.25 + Math.max(0, 1 - gap / 12) * 0.4;
    ctx.fx.keepRed = 0.9;
    // behind the front: the dead take you
    if (gap < 0.6) {
      d.burnT = (d.burnT ?? 0) - dt;
      if (d.burnT <= 0) { d.burnT = 0.45; p.hurt(13 * ctx.D.dmg, null); }
      d.hurtT -= dt;
      if (d.hurtT <= 0) { d.hurtT = 1.2; ctx.hud.whisper(T('sei dietro il fronte', 'you are behind the front')); ctx.audio.scream(0.5, 0.1); }
    }
    // the dead do not walk back past their own front
    for (const m of ctx.monsters.list) if (m.counts && m.pos.x > d.frontX + 2) m.pos.x = d.frontX + 2;
  },

  // the bell trees are thin: any shot that passes through the crown of a tree counts
  onShot(ctx, shot) {
    if (shot.monster && shot.monster.def.name.it === 'La campana') return;
    const o = ctx.camera.position, dir = shot.point.clone().sub(o); const len = dir.length(); dir.divideScalar(len || 1);
    for (const b of ctx.data.bells) {
      if (b.dying) continue;
      const hl = Math.hypot(dir.x, dir.z) || 1e-6, hx = dir.x / hl, hz = dir.z / hl;
      const t = (b.pos.x - o.x) * hx + (b.pos.z - o.z) * hz;
      if (t <= 0 || t > 45 || !ctx.map.los(o.x, o.z, b.pos.x - hx * 1.2, b.pos.z - hz * 1.2)) continue;
      const px = o.x + hx * t, pz = o.z + hz * t, py = o.y + (dir.y / hl) * t;
      if (Math.hypot(px - b.pos.x, pz - b.pos.z) < 1.3 && py > 0.3 && py < 6.2) {
        const dmg = py > 3.6 ? 2 : 1;
        b.hp -= dmg; b.flash = 1;
        ctx.particles.burst({ x: px, y: py, z: pz }, 10, 0x6a5030, 2);
        ctx.audio.toll(90 + Math.random() * 30);
        if (b.hp <= 0) ctx.monsters.kill(b);
        return false;
      }
    }
  },

  souvenir(g, { x, y, w, h, stats }) {
    // three crossed-out bells in the corner
    g.save(); g.fillStyle = 'rgba(20,8,4,0.7)'; g.fillRect(x + w - 170, y + 20, 150, 50);
    g.font = '28px serif'; g.fillStyle = '#e8c890'; g.fillText('🔔̸ 🔔̸ 🔔̸', x + w - 160, y + 56);
    g.restore();
  },
};

// a bell tree: it tolls, and every toll calls skeletons around it
function toll(m, ctx, dt) {
  const s = m.state;
  s.t = (s.t ?? 2 + Math.random() * 3) - dt;
  if (s.t <= 0) {
    s.t = 6.5 / Math.sqrt(ctx.D.rate);
    ctx.audio.toll(m.data.f ?? 55 + Math.random() * 20);
    m.anger = 1;
    ctx.fx.flicker = 0.8; ctx.after(0.3, (c) => { c.fx.flicker = 0.35; });
    const d = ctx.data;
    const near = m.pos.distanceTo(ctx.player.pos) < 30;
    for (let i = 0; i < (near ? 1 : 0); i++) {
      const a = Math.random() * 6.28, r = 2.5 + Math.random() * 1.5;
      const pos = new ctx.THREE.Vector3(m.pos.x + Math.cos(a) * r, 0, m.pos.z + Math.sin(a) * r);
      if (!ctx.map.solid(pos.x, pos.z) && ctx.monsters.alive < 7) ctx.spawn(i ? d.defs.skeleton : d.defs.shield, pos);
    }
    if (m.pos.distanceTo(ctx.player.pos) < 18) ctx.hud.whisper({ it: 'la campana chiama', en: 'the bell is calling' });
  }
}

function bellDown(m, ctx) {
  const d = ctx.data;
  d.silenced++;
  d.frontX = Math.min((W - 3) * ctx.CELL, d.frontX + FRONT_PUSH);
  ctx.audio.burst(1.4, 300, 0.5, 0.5, 'lowpass', 60);
  ctx.audio.toll(38);
  ctx.hud.goal({ it: 'campane', en: 'bells' }, 3 - d.silenced);
  d.runners?.start();
  ctx.pickup(m.pos.clone().add(new ctx.THREE.Vector3(-1.5, 0, 0)), { kind: 'heal', amount: 45 });
  if (d.silenced >= 3) { ctx.hud.say({ it: 'Silenzio. Per ora.', en: 'Silence. For now.' }, 2200); ctx.after(1.2, (c) => c.win()); return; }
  ctx.hud.say(d.silenced === 1 ? { it: 'Una campana tace. L’esercito arretra.', en: 'A bell falls silent. The army falls back.' } : { it: 'Due campane. Ora arriva il cavallo.', en: 'Two bells. Now the horse comes.' }, 2400);
  if (d.silenced === 2 && !d.horse) {
    const pos = new ctx.THREE.Vector3(Math.min(d.frontX - 3, ctx.player.pos.x + 22), 0, ctx.player.pos.z);
    if (!ctx.map.solid(pos.x, pos.z)) d.horse = ctx.spawn(d.defs.horse, pos);
  }
}
