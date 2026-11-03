// LEVEL 10 · Odilon Redon, "L'Araignée souriante" (1881, charcoal).
// The world is a charcoal drawing that keeps darkening. Shots are erasers: where they land the paper
// comes back white for a while, and only there you see the spiders. The crying twin follows you:
// kill it and the others go mad.

const T = (it, en) => ({ it, en });
const CEIL = 4.2;

// eight long thin legs, jointed high like in the drawing, that walk on the floor under a floating body
function spiderLegs(THREE, { h, span = 1.1, thick = 0.018, color = 0x0b0908 }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, fog: true });
  const geo = new THREE.CylinderGeometry(thick * 0.6, thick, 1, 4); geo.translate(0, 0.5, 0);
  const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
  const seg = () => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
  const set = (m, p, q) => { dir.subVectors(q, p); const l = dir.length() || 1e-3; m.position.copy(p); m.quaternion.setFromUnitVectors(up, dir.divideScalar(l)); m.scale.set(1, l, 1); };
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, k = i >> 1; // k 0..3 front to back
    legs.push({ side, k, s1: seg(), s2: seg(), ph: k * 1.7 + (side > 0 ? Math.PI : 0) });
  }
  const hip = new THREE.Vector3(), knee = new THREE.Vector3(), foot = new THREE.Vector3();
  g.userData.tick = (t, m) => {
    const lift = m.lift ?? 0;
    const walk = 0.25 + (m.moving || 0) * (m.state.mad ? 1.6 : 1);
    for (const l of legs) {
      const z = (l.k - 1.5) * 0.18;
      hip.set(l.side * 0.12, h * 0.42, z * 0.5);
      const sw = Math.sin(t * 7 * walk + l.ph);
      foot.set(l.side * (span * (0.75 + l.k * 0.12)), -lift + Math.max(0, sw) * 0.12 * walk, z * 2.4 + sw * 0.22 * walk);
      knee.set(l.side * span * 0.55, h * 0.95 + 0.25 + (l.k === 0 ? 0.25 : 0), z * 1.4);
      // dangling while it drops from the ceiling
      if (lift > 1.4) { foot.y = h * 0.1 - 0.4 + Math.sin(t * 9 + l.ph) * 0.15; foot.x *= 0.6; }
      set(l.s1, hip, knee); set(l.s2, knee, foot);
    }
  };
  return g;
}

// the thread it drops on
function dropThread(THREE, h) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xbfb6a0 }));
  line.position.y = h * 0.8;
  line.userData.tick = (t, m) => { const v = m.state.drop > 0; line.visible = v; if (v) line.scale.y = Math.max(0.01, CEIL - m.lift - h * 0.8); };
  return line;
}

// a soft white smudge of eraser on charcoal, used for every patch of light
function smudgeTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(250,244,226,0.95)'); gr.addColorStop(0.45, 'rgba(236,228,206,0.55)'); gr.addColorStop(1, 'rgba(230,220,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  // charcoal grain left in the rubbed paper
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(20,16,12,${Math.random() * 0.25})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1); }
  // eraser strokes
  g.strokeStyle = 'rgba(255,250,235,0.35)'; g.lineWidth = 5;
  for (let i = 0; i < 5; i++) { g.beginPath(); const y = 40 + i * 12; g.moveTo(24, y + Math.random() * 6); g.lineTo(104, y - 8 + Math.random() * 6); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default {
  id: 'redon',
  artist: 'Odilon Redon',
  year: '1881',
  title: T('Il ragno che ride', 'The Smiling Spider'),
  museum: T('Musée d’Orsay, Parigi · carboncino su carta', 'Musée d’Orsay, Paris · charcoal on paper'),
  image: '/museo/opere/10-redon.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T('Un foglio di carta ingiallita, ripassato a carboncino finché non resta che il nero. Da qualche parte, nel nero, qualcosa ride.', 'A sheet of yellowed paper, gone over with charcoal until only black is left. Somewhere in the black, something is laughing.'),
  rule: T('Il disegno si annerisce da solo. I tuoi colpi sono gomma: dove colpiscono la carta torna bianca per qualche secondo, e solo lì vedi i ragni. Ogni colpo serve due volte: per fare luce e per uccidere. Non uccidere il ragno che piange.', 'The drawing darkens by itself. Your shots are erasers: where they land the paper turns white for a few seconds, and only there you can see the spiders. Every shot counts twice: to make light and to kill. Do not kill the crying spider.'),
  ruleShort: T('spara per cancellare il nero', 'shoot to erase the black'),
  goal: T('Rimanda nel disegno 22 ragni che ridono.', 'Send 22 smiling spiders back into the drawing.'),
  paint: '#efe8d4',
  accent: '#d8cfb4',
  fx: { mono: 1, tint: [0.94, 0.9, 0.8], keepRed: 0, contrast: 0.72, exposure: 1.15, grain: 0.85, scratches: 0.25, dust: 0.8, flicker: 0.3, weave: 0.25, smear: 0.35, vignette: 0.8 },
  player: { hp: 100, speed: 5.4 },
  discovery: {
    title: T('Il gemello che piange', 'The twin who weeps'),
    text: T('Lo stesso anno Redon disegnò il gemello: «Il ragno che piange», con una faccia d’uomo stanco. Fino a cinquant’anni lavorò quasi solo in nero e chiamava questi fogli «i miei neri»: ragni, occhi che volano come mongolfiere, teste senza corpo. Poi, all’improvviso, scoprì il colore e dipinse fiori.', 'The same year Redon drew the twin: “The Crying Spider”, with the face of a tired man. Until he was fifty he worked almost only in black and called these sheets “my blacks”: spiders, eyes floating like balloons, heads without bodies. Then, all of a sudden, he discovered colour and painted flowers.'),
    image: '/museo/opere/10-redon-piange.jpg',
  },
  deathLine: T('Il ragno ride ancora. Ride di te.', 'The spider is still laughing. At you.'),

  async setup(ctx) {
    const { THREE } = ctx;
    // charcoal paper from the drawing itself: the smudged background and the tiled floor
    const wall = ctx.art.wall([0.0, 0.02, 0.28, 0.22], { dark: 0.35 });
    const floor = ctx.art.wall([0.12, 0.8, 0.7, 0.19], { dark: 0.25 });
    const ceil = new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 1 });
    // w = a web across the passage
    ctx.map.build({
      grid: [
        '##############################',
        '#P...#......#######.....M....#',
        '#....w......#.....#..........#',
        '#....#..M...w..M..#####w######',
        '###w###.....#.....#......#...#',
        '#.....#######.....#..M...w.M.#',
        '#..M..#.....#.....#......#...#',
        '#.....w.....w.....w......#####',
        '#.....#.....#.....#......#...#',
        '###w###..M..#.....##w#####.M.#',
        '#.....#.....#.....#......w...#',
        '#..M..#######..M..#..M...#####',
        '#.....w.....w.....w.........M#',
        '#.....#.....#.....#......#...#',
        '###Q###############Q##########',
      ],
      legend: { w: { web: true } },
      textures: { wall, floor, ceil, painting: ctx.art.texture },
      height: CEIL,
    });
    ctx.light({ ambient: 0.035, color: 0xd8d0c0, ground: 0x080605, lantern: { angle: 0.32, range: 5.5, intensity: 16, color: 0xf4ecd8, penumbra: 0.7 }, fog: { color: 0x020201, near: 1.5, far: 13 } });

    const spiderImg = await ctx.art.load('/museo/opere/10-redon-ragno.png');
    const weepImg = await ctx.art.load('/museo/opere/10-redon-piange.png');

    const smudge = smudgeTexture(THREE);
    const d = ctx.data = { patches: [], lights: [], webs: [], mad: false, weeper: null, weepDead: false, laughT: 1.5, slowT: 0, warned: false };
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xf6eedc, 0, 7, 1.1); ctx.add(l); d.lights.push(l); }

    // every patch of light: a smudge sprite, plus one of the four lamps when it is among the brightest
    d.addPatch = (pos, life = 1, r = 4.2, follow = null, bare = false) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smudge, transparent: true, depthWrite: false, fog: false, opacity: life }));
      s.visible = !bare;
      s.position.copy(pos); s.scale.setScalar(1.6 + r * 0.25);
      ctx.add(s);
      const p = { pos: s.position, life, r, s, follow };
      d.patches.push(p);
      if (d.patches.length > 26) { const o = d.patches.find((q) => !q.follow); if (o) { ctx.remove(o.s); d.patches.splice(d.patches.indexOf(o), 1); } }
      return p;
    };

    const spider = {
      name: T('Il ragno che ride', 'The smiling spider'),
      sprite: spiderImg, height: 1.05, lift: 0.95,
      hp: 1.0, speed: 2.9, dmg: 5, reach: 1.5, radius: 0.55, attackEvery: 1.0,
      twitch: 0.7, rot: 0.35, tear: 0.2, breathe: 1.6, selfLit: 0, blood: 0x0a0806, pitch: 1.1,
      // its one pale eye is the only thing you see in the black, and only up close
      parts: [() => spiderLegs(THREE, { h: 1.05 }), () => dropThread(THREE, 1.05), { type: 'eyes', at: [[0.15, 0.6]], size: 0.035, color: 0x9a9284, pupil: 0x0a0806, glow: 1 }],
      onSpawn(m) {
        m.def = Object.create(m.def); // own copy: its light changes on its own
        m.state.mad = d.mad;
        if (m.data.drop) { m.state.drop = 1; m.lift = CEIL - 1.2; }
      },
      behavior(m, c, dt) {
        if (m.state.drop > 0) {
          m.lift = Math.max(0.95, m.lift - dt * 2.6);
          if (m.lift <= 0.95) { m.state.drop = 0; c.audio.burst(0.2, 300, 1, 0.2, 'lowpass', 90); }
          return;
        }
        const k = d.mad ? 1.5 : 1;
        // in the light it hesitates, in the dark it rushes
        const lit = m.def.selfLit;
        c.monsters.walkTo(m, c.player.pos, m.speed * k * (lit > 0.4 ? 0.65 : 1.15), dt);
        c.monsters.melee(m, dt, k);
      },
      onAttack(m, c) { laugh(c, m, 1.3); },
    };
    const little = {
      name: T('Ragnetto', 'Spiderling'),
      sprite: spiderImg, height: 0.42, lift: 0.3, hp: 0.5, speed: 2.4, dmg: 3, reach: 0.8, radius: 0.25, attackEvery: 1.1,
      twitch: 1, rot: 0.2, breathe: 2, counts: false, blood: 0x0a0806, behavior: 'crawl',
      parts: [() => spiderLegs(THREE, { h: 0.42, span: 0.45, thick: 0.01 })],
      onSpawn(m) { m.def = Object.create(m.def); },
    };
    const weeper = {
      name: T('Il ragno che piange', 'The crying spider'),
      sprite: weepImg, height: 1.0, lift: 0.9, hp: 5, speed: 3.4, dmg: 0, reach: 0, radius: 0.5,
      twitch: 0.2, rot: 0.15, tear: 0.1, breathe: 0.6, selfLit: 0.55, counts: false, blood: 0x1a1612, fixed: true,
      parts: [() => spiderLegs(THREE, { h: 1.0, span: 1.0 }), { type: 'eyes', at: [[-0.12, 0.6], [0.1, 0.6]], size: 0.03, color: 0xd8d0c0, pupil: 0x0a0806 }],
      // it never attacks: it keeps close to you and weeps; its tears erase the black around you
      behavior(m, c, dt) {
        const dd = m.pos.distanceTo(c.player.pos);
        if (dd > 3.2) c.monsters.walkTo(m, c.player.pos, m.speed * (dd > 8 ? 1.6 : 1), dt); else m.moving = 0;
        m.state.sob = (m.state.sob ?? 2) - dt;
        if (m.state.sob <= 0) { m.state.sob = 3 + Math.random() * 3; c.audio.tone(420, 0.9, 'sine', 0.04, 300); c.audio.breath(0.05); }
      },
      onDeath(m, c) {
        d.mad = true; d.weepDead = true;
        if (d.weeper?.light) d.weeper.light.follow = null;
        for (const o of c.monsters.list) o.state.mad = true;
        c.hud.say(T('Hai ucciso il ragno che piange. Gli altri ridono più forte.', 'You killed the crying spider. The others laugh louder.'), 3200);
        c.fx.flicker = 0.7; c.audio.scream(0.5, 0.3);
        for (let i = 0; i < 4; i++) c.after(0.3 + i * 0.25, () => laugh(c, null, 1.6));
      },
    };
    d.defs = { spider, little, weeper };

    ctx.goalKills(22);
    // spiders drop from the black ceiling around you, others crawl out of the side halls
    ctx.spawner({ kinds: [{ def: spider }], first: 3, every: 3.8, max: 3 });
    ctx.spawner({ kinds: [{ def: spider }], first: 0, every: 7, max: 2, where: 'around', min: 3.5, maxDist: 8, opts: { instant: true, data: { drop: true } } });

    // the webs: threads across the passages that snare you and hatch spiderlings
    const webMat = new THREE.LineBasicMaterial({ color: 0xcfc6b0, transparent: true, opacity: 0.55 });
    for (const p of ctx.map.find('web')) {
      const n = ctx.map.cell(p.cx - 1, p.cy)?.solid && ctx.map.cell(p.cx + 1, p.cy)?.solid; // walls left/right: passage runs north-south
      const g = new THREE.Group();
      const pts = [];
      const cx = 0, cy = 1.6;
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; pts.push(new THREE.Vector3(cx, cy, 0), new THREE.Vector3(Math.cos(a) * 1.0, cy + Math.sin(a) * 1.4, 0)); }
      for (let r = 1; r <= 3; r++) for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2, b = ((k + 1) / 9) * Math.PI * 2, s = r / 3.2;
        pts.push(new THREE.Vector3(Math.cos(a) * s, cy + Math.sin(a) * 1.4 * s, 0), new THREE.Vector3(Math.cos(b) * s, cy + Math.sin(b) * 1.4 * s, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      g.add(new THREE.LineSegments(geo, webMat));
      g.position.set(p.x, 0, p.z);
      if (!n) g.rotation.y = Math.PI / 2;
      ctx.add(g);
      d.webs.push({ p, g, torn: false });
    }

    // two pieces of clean paper on the floor, far apart
    ctx.pickup(ctx.map.toWorld(15, 6), { kind: 'heal', amount: 35, color: 0xefe8d4 });
    ctx.pickup(ctx.map.toWorld(28, 10), { kind: 'heal', amount: 35, color: 0xefe8d4 });

    ctx.after(14, (c) => {
      const pos = c.map.freeAround(c.player.pos.x, c.player.pos.z, 4, 7, 1)[0];
      if (!pos) return;
      const m = c.spawn(weeper, pos);
      d.weeper = { m, light: d.addPatch(new THREE.Vector3(pos.x, 1.4, pos.z), 0.9, 5.5, m, true) };
      c.hud.say(T('Un ragno piange. Non ti fa niente. Lascialo vivere.', 'A spider is weeping. It will not hurt you. Let it live.'), 3000);
    });
    ctx.after(3, (c) => c.hud.whisper(T('spara ai muri: la gomma fa luce', 'shoot the walls: the eraser makes light')));
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player;
    // the light patches fade back into charcoal
    for (let i = d.patches.length - 1; i >= 0; i--) {
      const q = d.patches[i];
      if (q.follow) { if (q.follow.dead) { q.follow = null; } else q.pos.set(q.follow.pos.x, 1.3, q.follow.pos.z); }
      else q.life -= dt * (d.mad ? 0.16 : 0.1);
      q.s.material.opacity = Math.max(0, q.life) * 0.85;
      if (q.life <= 0) { ctx.remove(q.s); q.s.material.dispose(); d.patches.splice(i, 1); }
    }
    // the four brightest patches near you light the walls
    const near = d.patches.slice();
    near.sort((a, b) => (b.life - b.pos.distanceTo(p.pos) * 0.05) - (a.life - a.pos.distanceTo(p.pos) * 0.05));
    d.lights.forEach((l, i) => { const q = near[i]; if (q) { l.position.copy(q.pos); l.intensity = 34 * q.life; l.distance = q.r * 1.8; } else l.intensity = 0; });
    // a spider is visible only inside the light
    for (const m of ctx.monsters.list) {
      if (m.def === d.defs.weeper || Object.getPrototypeOf(m.def) === d.defs.weeper) continue;
      let lit = 0;
      for (const q of d.patches) { const dd = Math.hypot(m.pos.x - q.pos.x, m.pos.z - q.pos.z); lit = Math.max(lit, (1 - dd / q.r) * q.life); }
      m.def.selfLit = Math.max(0, lit) * 1.15;
    }
    // the laugh comes from the black
    d.laughT -= dt;
    if (d.laughT <= 0) {
      d.laughT = (d.mad ? 1.2 : 2.4) + Math.random() * 2;
      let best = null, bd = 1e9;
      for (const m of ctx.monsters.list) { if (m.dying || m.def.counts === false) continue; const dd = m.pos.distanceTo(p.pos); if (dd < bd) { bd = dd; best = m; } }
      if (best && bd < 14) laugh(ctx, best, Math.max(0.15, 1 - bd / 14) * (d.mad ? 1.5 : 1));
    }
    // webs
    p.speedMul = d.slowT > 0 ? 0.35 : 1;
    d.slowT = Math.max(0, d.slowT - dt);
    for (const w of d.webs) {
      if (w.torn || Math.hypot(p.pos.x - w.p.x, p.pos.z - w.p.z) > 0.9) continue;
      w.torn = true; ctx.remove(w.g); d.slowT = 1.3;
      ctx.audio.burst(0.5, 3000, 2, 0.12, 'highpass', 1200);
      ctx.hud.whisper(T('la ragnatela si muove', 'the web is moving'));
      const n = 2;
      for (let i = 0; i < n; i++) ctx.after(0.25 + i * 0.2, (c) => { const pos = c.map.freeAround(w.p.x, w.p.z, 1.5, 4, 1)[0]; if (pos) c.spawn(d.defs.little, pos); });
    }
    // the drawing breathes darker the more of them are alive
    ctx.fx.exposure = 1.15 - Math.min(0.3, ctx.monsters.alive * 0.03) + (d.mad ? Math.sin(ctx.time * 31) * 0.08 : 0);
  },

  // every shot rubs the charcoal away where it lands
  onShot(ctx, shot) {
    const { THREE } = ctx;
    const cam = ctx.camera.position;
    const pt = shot.point.clone().lerp(cam, Math.min(0.6, 0.7 / Math.max(0.5, shot.dist)));
    pt.y = Math.max(0.25, Math.min(CEIL - 0.3, pt.y));
    // on a spider the light is bare (no smudge in front of it)
    if (shot.monster) ctx.data.addPatch(new THREE.Vector3(shot.monster.pos.x, 1.4, shot.monster.pos.z), 0.9, 3.4, null, true);
    else ctx.data.addPatch(new THREE.Vector3(pt.x, pt.y, pt.z), 1, 4.4);
  },

  onKill(ctx, m) {
    if (m.def.counts !== false && Math.random() < 0.35) laugh(ctx, null, 0.6);
  },

  souvenir(g, { x, y, w, h, lang }) {
    g.fillStyle = 'rgba(240,232,212,0.85)'; g.font = `500 ${Math.round(h * 0.03)}px "JetBrains Mono", monospace`;
    g.fillText(lang === 'en' ? '“my blacks” · O. Redon' : '«i miei neri» · O. Redon', x + w * 0.04, y + h * 0.95);
  },
};

// "ha-ha-ha": short breathy bursts, lower and slower the bigger it is
function laugh(ctx, m, vol = 1) {
  const n = 3 + Math.floor(Math.random() * 3), pitch = (m?.pitch ?? 1) * (0.9 + Math.random() * 0.2);
  for (let i = 0; i < n; i++) ctx.after(i * 0.13, (c) => {
    c.audio.burst(0.09, 950 * pitch, 5, 0.16 * vol, 'bandpass', 600 * pitch);
    c.audio.tone(260 * pitch - i * 12, 0.09, 'sawtooth', 0.05 * vol, 180 * pitch);
  });
}
