// LIVELLO 2 · Hans Baldung Grien, Le tre età della donna e la Morte (c. 1510).
// In the painting the young woman looks at herself in a mirror and never sees Death behind her,
// holding the hourglass over her head. Here Death follows you through the wood and lives only in
// mirrors: you see it in the rear-view glass, you can shoot it only by turning to the mirror.
// Rule: the hourglass runs. Every soul sent back adds sand. Shooting a maiden steals it.

const T = (it, en) => ({ it, en });
const SAND_TIME = 75;   // seconds of sand when full, if you never kill
const SAND_KILL = 0.075;
const SAND_MAIDEN = 0.18;

export default {
  id: 'baldung',
  artist: 'Hans Baldung Grien',
  year: 'c. 1510',
  title: T('Le tre età della donna e la Morte', 'The Three Ages of Woman and Death'),
  museum: T('Kunsthistorisches Museum, Vienna', 'Kunsthistorisches Museum, Vienna'),
  image: '/museo/opere/02-baldung.jpg',
  credit: T('Riproduzione: pubblico dominio (Kunsthistorisches Museum)', 'Reproduction: public domain (Kunsthistorisches Museum)'),
  intro: T(
    'Un bosco nero. Una ragazza si guarda allo specchio e si sistema i capelli. Dietro di lei la Morte, gialla e spellata, le tiene una clessidra sopra la testa. Lei non se ne accorge.',
    'A black wood. A girl looks at herself in a mirror and fixes her hair. Behind her Death, yellow and flayed, holds an hourglass over her head. She does not notice.'),
  rule: T(
    'La Morte ti segue e si vede solo nello specchietto in alto. Tieni premuta l’azione per voltarti nello specchio: solo così puoi colpirla. La clessidra si svuota: ogni anima rimandata ti ridà sabbia. Non sparare alle fanciulle.',
    'Death follows you and shows only in the mirror at the top. Hold the action to turn to the mirror: only then can you hit it. The hourglass empties: every soul sent back gives you sand. Do not shoot the maidens.'),
  ruleShort: T('la Morte è solo nello specchio', 'Death lives only in the mirror'),
  goal: T('Spezza la clessidra della Morte.', 'Break Death’s hourglass.'),
  paint: '#2e5a20',
  accent: '#c8a040',
  fx: { exposure: 1.35, mono: 0.78, tint: [0.84, 0.92, 0.7], keepRed: 0.7, contrast: 0.6, grain: 0.5, scratches: 0.4, dust: 0.45, flicker: 0.3, smear: 0.3, vignette: 0.65 },
  discovery: {
    title: T('Il ricciolo di Dürer', 'Dürer’s lock of hair'),
    text: T(
      'Baldung era l’allievo preferito di Dürer, che lo chiamava «Grünhans» perché vestiva sempre di verde: da lì viene Grien. Quando Dürer morì, nel 1528, a Baldung fu mandata una ciocca dei suoi capelli. La teneva come una reliquia, e oggi è ancora conservata all’Accademia di Belle Arti di Vienna. Per tutta la vita dipinse la Morte che spia le ragazze, e fu il primo a fare delle streghe un soggetto da quadro.',
      'Baldung was Dürer’s favourite pupil, who called him “Grünhans” because he always wore green: that is where Grien comes from. When Dürer died in 1528, Baldung was sent a lock of his hair. He kept it like a relic, and it is still preserved at the Academy of Fine Arts in Vienna. All his life he painted Death spying on young women, and he was the first to make witches a subject for painting.'),
  },
  deathLine: T('La sabbia è finita. Lei era dietro di te da sempre.', 'The sand ran out. She was behind you all along.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const rnd = ctx.rand;
    // the wood: open ground, no ceiling, trees placed by hand-seeded chance
    const N = 30;
    const grid = [];
    for (let y = 0; y < N; y++) {
      let row = '';
      for (let x = 0; x < N; x++) row += x === 0 || y === 0 || x === N - 1 || y === N - 1 ? ' ' : '.';
      grid.push(row);
    }
    grid[15] = grid[15].slice(0, 15) + 'P' + grid[15].slice(16);
    const ground = ctx.art.wall([0.25, 0.86, 0.45, 0.13], { dark: 0.1 });
    const barkTex = ctx.art.wall([0.84, 0.15, 0.13, 0.55], { dark: 0 });
    const glowMat = (map, k) => new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, roughness: 0.95 });
    ctx.map.build({ grid, textures: { floor: glowMat(ground, 0.12) }, height: 8, ceiling: false, floorRepeat: 0.35 });

    // trees: thin dark trunks like the ones behind Death, more crowded at the edges
    const W = N * ctx.CELL;
    const trunks = [];
    const centre = ctx.map.toWorld(15, 15);
    for (let i = 0; i < 400 && trunks.length < 95; i++) {
      const x = 3 + rnd() * (W - 6), z = 3 + rnd() * (W - 6);
      const dc = Math.hypot(x - centre.x, z - centre.z);
      if (dc < 5) continue;
      if (rnd() > 0.35 + dc / 40) continue;
      if (trunks.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
      trunks.push({ x, z, r: 0.22 + rnd() * 0.4, lean: (rnd() - 0.5) * 0.12 });
    }
    const barkMat = glowMat(barkTex, 0.22);
    const geo = new THREE.CylinderGeometry(0.7, 1, 14, 7, 1, true);
    const inst = new THREE.InstancedMesh(geo, barkMat, trunks.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    trunks.forEach((t, i) => {
      q.setFromEuler(e.set(t.lean, rnd() * 6, t.lean * 0.7));
      m4.compose(new THREE.Vector3(t.x, 6, t.z), q, new THREE.Vector3(t.r, 1, t.r));
      inst.setMatrixAt(i, m4);
      ctx.collider(t.x, t.z, t.r + 0.1);
    });
    ctx.add(inst);
    // undergrowth: low ferns from the bottom of the painting, as cut-out cards
    const fern = ctx.art.tex(ctx.art.cutout({ rect: [0.5, 0.88, 0.3, 0.12], oval: true, rot: 0.5 }));
    const fernMat = new THREE.MeshBasicMaterial({ map: fern, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x9aa080, fog: true });
    for (let i = 0; i < 70; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), fernMat);
      p.position.set(3 + rnd() * (W - 6), 0.33, 3 + rnd() * (W - 6)); p.rotation.y = rnd() * 3;
      ctx.add(p);
    }
    ctx.light({ ambient: 0.55, color: 0xa8b890, ground: 0x0a1006, lantern: { angle: 0.6, range: 24, intensity: 42, color: 0xf0e8c8 }, fog: { color: 0x040703, density: 0.06 }, sky: 0x030502 });

    // ---- figures from the painting ----
    const death = {
      name: T('La Morte', 'Death'),
      sprite: await ctx.art.load('/museo/opere/02-baldung-morte.webp'),
      height: 2.5, hp: 16, speed: 1.6, dmg: 26, reach: 1.5, radius: 0.4, fixed: true,
      boss: true, onlyInMirror: true, ghost: true, counts: false,
      twitch: 0.4, rot: 0.2, tear: 0.5, breathe: 0.6, selfLit: 0.35,
      // the raised hand with the hourglass, top left of the figure: three times the damage
      zones: [{ name: 'clessidra', x: [-0.5, -0.25], y: [0.86, 1], mul: 3 }, { name: 'cranio', x: [-0.05, 0.25], y: [0.78, 0.92], mul: 2 }],
      parts: [{ type: 'strands', n: 12, len: 0.7, color: 0x6a5a30, at: [0.1, 2.28, -0.05], spread: 0.25 }],
      behavior: stalk,
      onAttack: (m, c) => { c.audio.scream(0.4, 0.25); m.state.back = 1.2; },
      onHit: (m, shot, c) => { m.state.back = 0.6; c.audio.toll(70); return shot.dmg; },
      onDeath: (m, c) => c.after(0.5, () => c.win()),
      blood: 0xb09050,
    };
    const crone = {
      name: T('La vecchia', 'The old woman'),
      sprite: await ctx.art.load('/museo/opere/02-baldung-vecchia.webp'),
      height: 2.0, hp: 2, speed: 2.5, dmg: 8, reach: 1.3, behavior: 'chase',
      twitch: 0.6, rot: 0.45, tear: 0.6,
      zones: [{ name: 'specchio', x: [-0.5, 0.1], y: [0.55, 0.78], mul: 2 }],
      parts: [{ type: 'strands', n: 18, len: 1.3, color: 0x6a5a40, at: [0, 1.85, -0.06], spread: 0.3 }],
      blood: 0x5a2010,
    };
    const child = {
      name: T('Il putto sotto il velo', 'The child under the veil'),
      sprite: await ctx.art.load('/museo/opere/02-baldung-putto.webp'),
      height: 0.9, hp: 1, speed: 3.0, dmg: 5, reach: 1.0, radius: 0.3, behavior: 'crawl',
      twitch: 0.9, rot: 0.3, tear: 0.8,
      blood: 0x6a2018,
    };
    const maiden = {
      name: T('La fanciulla', 'The maiden'),
      sprite: await ctx.art.load('/museo/opere/02-baldung-fanciulla.webp'),
      height: 1.85, hp: 1, speed: 0.6, dmg: 0, reach: 0, fake: true, counts: false,
      twitch: 0.15, rot: 0.1, tear: 0.4, breathe: 1.2, selfLit: 0.5,
      behavior: wander,
    };
    ctx.data = { sand: 1, defs: { death, crone, child, maiden }, mirror: false, lowWarn: false };

    ctx.data.death = ctx.spawn(death, ctx.map.toWorld(15, 20), { instant: true });
    ctx.hud.boss(ctx.data.death, T('La Morte (solo nello specchio)', 'Death (only in the mirror)'));
    ctx.spawner({ kinds: [{ def: crone, w: 3 }, { def: child, w: 2 }], first: 3, every: 1.7, max: 6, where: 'around', min: 8, maxDist: 16 });
    for (let i = 0; i < 3; i++) { const p = ctx.map.freeAround(centre.x, centre.z, 6, 18, 1)[0]; if (p) ctx.spawn(maiden, p, { fake: true, instant: true }); }
    ctx.every(9, (c) => { if (c.monsters.list.filter((m) => m.def === maiden && !m.dying).length < 4) { const p = c.map.freeAround(c.player.pos.x, c.player.pos.z, 6, 14, 1)[0]; if (p) c.spawn(maiden, p, { fake: true }); } });

    ctx.view.rear = true;
    ctx.action({ label: T('SPECCHIO', 'MIRROR') });
    ctx.hud.bar('sand', { label: T('clessidra', 'hourglass'), value: 1, color: '#d8c080' });
    ctx.hud.goal(T('nello specchio', 'in the mirror'), '◐');
  },

  update(ctx, dt) {
    const d = ctx.data;
    const on = !!ctx.input.alt;
    if (on !== d.mirror) {
      d.mirror = on; ctx.view.mirror = on;
      ctx.audio.burst(0.3, on ? 2600 : 1800, 3, 0.12, 'bandpass', on ? 900 : 3000);
    }
    // looking into the mirror costs time: the sand falls twice as fast
    d.sand -= dt / SAND_TIME * (on ? 2 : 1);
    ctx.hud.bar('sand', { value: Math.max(0, d.sand) });
    ctx.fx.mono = on ? 0.55 : 0.78;
    ctx.fx.blur = on ? 0.15 : 0;
    ctx.fx.vignette = 0.65 + (1 - Math.max(0, d.sand)) * 0.3;
    if (d.sand < 0.2 && !d.lowWarn) { d.lowWarn = true; ctx.hud.say(T('La sabbia sta finendo.', 'The sand is running out.'), 2000); ctx.audio.heart(); }
    if (d.sand > 0.3) d.lowWarn = false;
    if (d.sand <= 0) {
      // she does not walk anymore: she is just there
      const m = d.death; if (m && !m.dying) { const b = ctx.player.dir; m.pos.set(ctx.player.pos.x - b.x * 0.8, 0, ctx.player.pos.z - b.z * 0.8); }
      ctx.audio.scream(0.35, 0.3);
      ctx.lose();
    }
  },

  onShot(ctx, shot) {
    const m = shot.monster;
    if (m && m.def === ctx.data.defs.maiden) {
      ctx.data.sand = Math.max(0.01, ctx.data.sand - SAND_MAIDEN);
      ctx.hud.whisper(T('hai sparato alla giovinezza', 'you shot youth itself'));
      ctx.audio.burst(0.8, 600, 0.5, 0.3, 'lowpass', 120);
    }
  },

  onKill(ctx, m) {
    if (!m.counts) return;
    ctx.data.sand = Math.min(1, ctx.data.sand + SAND_KILL);
    if (Math.random() < 0.3) ctx.hud.whisper(T('un granello torna su', 'a grain falls back up'));
  },

  souvenir(g, { x, y, w, h }) {
    // a cracked mirror over the painting
    g.save(); g.strokeStyle = 'rgba(230,230,210,0.55)'; g.lineWidth = 2;
    const cx = x + w * 0.1, cy = y + h * 0.25;
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w * 0.4, cy + Math.sin(a) * h * 0.4); g.stroke(); }
    g.restore();
  },
};

// Death keeps behind you, coming closer the longer you ignore her. Hit, she steps back into the wood.
function stalk(m, ctx, dt) {
  const p = ctx.player, s = m.state;
  s.close = Math.min(1, (s.close ?? 0) + dt / 25);
  if (s.back > 0) {
    s.back -= dt;
    const away = m.pos.clone().sub(p.pos).setY(0).normalize();
    ctx.monsters.move(m, away.x * 7 * dt, away.z * 7 * dt);
    s.close = Math.max(0, s.close - dt * 0.6);
    return;
  }
  const want = 9 - s.close * 9;
  const dir = p.dir;
  const target = p.pos.clone().addScaledVector(dir, -want);
  const sp = m.speed * (0.7 + s.close * 1.5) * (ctx.view.mirror ? 0.6 : 1);
  ctx.monsters.walkTo(m, target, sp, dt);
  if (m.pos.distanceTo(p.pos) < 4.5) { ctx.monsters.walkTo(m, p.pos, sp, dt); ctx.monsters.melee(m, dt); }
  // her breath when she is close
  s.br = (s.br ?? 0) - dt;
  if (s.br <= 0 && m.pos.distanceTo(p.pos) < 6) { s.br = 2.5; ctx.audio.breath(); ctx.hud.whisper({ it: 'è dietro di te', en: 'she is behind you' }); }
}

// the maidens walk slowly and look at themselves; they never attack
function wander(m, ctx, dt) {
  const s = m.state;
  s.t = (s.t ?? 0) - dt;
  if (s.t <= 0 || !s.to) { s.t = 3 + Math.random() * 4; s.to = m.pos.clone().add(new ctx.THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8)); }
  ctx.monsters.walkTo(m, s.to, m.speed, dt);
}
