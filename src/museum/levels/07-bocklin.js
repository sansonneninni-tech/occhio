// Level 7 · Arnold Böcklin, Isle of the Dead (third version, 1883).
// Rule: the mirror. On the island the dead are invisible: you only see them reflected in the
// still water and in the wet stone, upside down. Shoot the reflection (or where the body must be).
import { store } from '../../core/store.js';
import { mirrorWater } from './_acqua.js';

const T = (it, en) => ({ it, en });
const OP = '/museo/opere/07/';

// ---------- the island, drawn by rectangles (26 x 34 cells, north at the top) ----------
//  ~ lake (slow, reflects)   , wet stone (reflects faintly)   o puddle   : flooded grove floor
//  # cliff   T tomb wall   g gate of the grove   M spawn   P start   B the coffin
function islandGrid() {
  const W = 26, H = 34;
  const g = Array.from({ length: H }, () => Array(W).fill('~'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  fill(3, 1, 22, 16, '#');            // the rock
  fill(9, 3, 16, 10, ':');            // the grove of cypresses, flooded
  fill(11, 11, 14, 12, ',');          // the steps up to the grove
  fill(11, 11, 14, 11, 'g');          // its gate, closed at first
  fill(5, 13, 20, 16, ',');           // the terrace
  fill(4, 5, 7, 9, ',');              // left tomb chamber
  fill(6, 10, 7, 12, ',');
  fill(18, 5, 21, 9, ',');            // right tomb chamber
  fill(18, 10, 19, 12, ',');
  fill(4, 4, 7, 4, 'T'); fill(18, 4, 21, 4, 'T'); fill(9, 2, 16, 2, 'T');
  for (const [x, y] of [[7, 14], [12, 15], [17, 13], [9, 16], [15, 16], [5, 7], [20, 8], [6, 11], [19, 11]]) g[y][x] = 'o';
  for (const [x, y] of [[5, 5], [20, 5], [10, 3], [15, 3], [4, 9], [21, 9]]) g[y][x] = 'M';
  for (const [x, y] of [[2, 22], [23, 22], [6, 30], [19, 30], [12, 32], [1, 12], [24, 12], [2, 18], [23, 18]]) g[y][x] = 'M';
  g[6][12] = 'B'; g[6][13] = 'B';
  g[26][12] = 'P';
  return g.map((r) => r.join(''));
}

export default {
  id: 'bocklin',
  artist: 'Arnold Böcklin',
  year: '1883',
  title: T('L’isola dei morti (terza versione)', 'Isle of the Dead (third version)'),
  museum: T('Alte Nationalgalerie, Berlino', 'Alte Nationalgalerie, Berlin'),
  image: '/museo/opere/07-bocklin.jpg',
  credit: T('Riproduzione: pubblico dominio (Wikimedia Commons)', 'Reproduction: public domain (Wikimedia Commons)'),
  intro: T('Acqua ferma, senza vento. Una barca porta una bara bianca verso un’isola di roccia e cipressi. In piedi, davanti alla bara, una figura velata.',
    'Still water, no wind. A boat carries a white coffin towards an island of rock and cypresses. Standing before the coffin, a veiled figure.'),
  rule: T('Sull’isola i morti sono invisibili. Li vedi solo riflessi, capovolti, nell’acqua e nella pietra bagnata. Spara al riflesso: il colpo rimbalza sull’acqua e li prende. I cipressi si muovono solo quando non li guardi.',
    'On the island the dead are invisible. You only see them reflected, upside down, in the water and the wet stone. Shoot the reflection: the shot bounces off the water and hits them. The cypresses move only when you are not looking.'),
  ruleShort: T('i velati si vedono solo nell’acqua: spara al riflesso', 'the veiled show only in the water: shoot the reflection'),
  goal: T('Abbatti 12 morti per aprire il cancello, altri 12 per aprire la bara, poi raggiungila.', 'Kill 12 dead to open the gate, 12 more to open the coffin, then reach it.'),
  paint: '#d8d4c8',
  accent: '#9fb2c8',
  fx: { mono: 0.35, tint: [0.86, 0.9, 1.0], keepRed: 0.2, contrast: 0.6, exposure: 1.15, grain: 0.55, scratches: 0.3, dust: 0.4, flicker: 0.2, weave: 0.2, smear: 0.35, vignette: 0.65 },
  player: { hp: 100, speed: 5.2 },
  zones: { lago: { speed: 0.72, friction: 0.45 }, pozza: { speed: 0.9, friction: 0.7 } },
  discovery: {
    title: T('La bara porta il tuo nome', 'The coffin bears your name'),
    text: T('Böcklin dipinse l’isola cinque volte, tra il 1880 e il 1886. La prima la chiese una vedova, Marie Berna, che volle aggiungere la bara e la figura velata: da allora tutti si chiedono chi sia. Rachmaninov compose un poema sinfonico dopo averne visto una riproduzione in bianco e nero, e una copia era appesa nelle case di Freud, Lenin e Clemenceau. Böcklin non spiegò mai niente: la chiamò soltanto “un quadro per sognare”.',
      'Böcklin painted the island five times, between 1880 and 1886. The first was asked for by a widow, Marie Berna, who wanted the coffin and the veiled figure added: ever since, everyone has wondered who it is. Rachmaninoff wrote a symphonic poem after seeing a black-and-white print, and a copy hung in the homes of Freud, Lenin and Clemenceau. Böcklin never explained anything: he only called it “a picture for dreaming”.'),
  },
  deathLine: T('Sei rimasto sull’isola. Nessuno rema indietro.', 'You stayed on the island. No one rows back.'),

  async setup(ctx) {
    const { THREE, CELL } = ctx;
    const isCoarse = matchMedia('(pointer: coarse)').matches;
    const water = mirrorWater(ctx, { scale: isCoarse ? 0.4 : 0.5 });

    // textures, all from the painting
    // straight crops of the canvas, mirrored so they tile without seams
    const paint = (rect, rx = 1, ry = 1) => { const t = ctx.art.tex(ctx.art.crop(rect, 512)); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(rx, ry); return t; };
    const cliff = paint([0.12, 0.14, 0.16, 0.5], 1, 1);
    const tomb = paint([0.232, 0.405, 0.12, 0.1], 1, 1);
    const gate = paint([0.38, 0.735, 0.24, 0.09], 0.5, 1);
    const stone = ctx.art.wall([0.63, 0.66, 0.1, 0.13], { dark: 0.25 });
    const lakeTex = ctx.art.wall([0.36, 0.84, 0.28, 0.12], { dark: 0.3 });
    const lakeMat = water.material({ base: lakeTex, strength: 0.82, baseScale: 0.08, baseBright: 0.5, ripple: 1, tint: [0.82, 0.88, 1.0], deep: [0.01, 0.015, 0.03] });
    // the rock is lit by the painting itself, not by our lamps: a matte painting you can walk into
    const matte = (map, color) => new THREE.MeshBasicMaterial({ map, color });
    const grid = islandGrid();
    const m4 = new THREE.Matrix4();
    ctx.map.build({
      grid,
      legend: {
        '~': { zone: 'lago' }, ',': { land: true }, o: { zone: 'pozza' }, ':': { zone: 'pozza', grove: true },
        T: { solid: true, tex: 'tomb' }, g: { solid: true, tex: 'gate', gate: true },
        M: { spawn: true }, B: { coffin: true, grove: true, zone: 'pozza' }, P: { start: true, zone: 'lago' },
      },
      textures: { wall: matte(cliff, 0xc8c8cc), tomb: matte(tomb, 0xd0d0d0), gate: matte(gate, 0xb8b8b8), floor: lakeMat },
      height: 7, ceiling: false,
    });
    ctx.map.group.traverse((o) => { if (o.isMesh && o.material === lakeMat) water.attach(o); });
    // the cliffs rise far above the walls, ragged like the painting's rock
    const rockGeo = new THREE.BoxGeometry(1, 1, 1, 2, 4, 2);
    { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const n = Math.sin(i * 7.1) * 0.5 + 0.5; p.setX(i, p.getX(i) * (1 - (y + 0.5) * 0.25 * n)); p.setZ(i, p.getZ(i) * (1 - (y + 0.5) * 0.3 * (1 - n))); } rockGeo.computeVertexNormals(); }
    const rockCells = [];
    for (let cy = 0; cy < grid.length; cy++) for (let cx2 = 0; cx2 < grid[0].length; cx2++) if (grid[cy][cx2] === '#' && !(cx2 >= 8 && cx2 <= 17 && cy <= 11)) rockCells.push([cx2, cy]);
    const rocks = new THREE.InstancedMesh(rockGeo, matte(paint([0.12, 0.1, 0.18, 0.7], 1, 2), 0xbcbcc4), rockCells.length);
    { const q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), e = new THREE.Euler();
      rockCells.forEach(([x, y], i) => {
        const r = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1, rr = Math.abs(r);
        const mid = 1 - Math.min(1, Math.abs(x - 12.5) / 10);
        const hgt = 7 + rr * 5 + (x < 9 || x > 16 ? 8 * mid : 2) + (y < 4 ? 4 : 0);
        e.set(0, rr * 0.4, (rr - 0.5) * 0.06); q.setFromEuler(e);
        ps.set((x + 0.5) * CELL, hgt / 2, (y + 0.5) * CELL); sc.set(CELL * 1.08, hgt, CELL * 1.08);
        m4.compose(ps, q, sc); rocks.setMatrixAt(i, m4);
      }); }
    ctx.add(rocks);
    // the land: wet stone slabs, a hand above the water, reflecting faintly
    const land = ctx.map.find('land').concat(ctx.map.find('M').filter((p) => grid[p.cy][p.cx - 1] !== '~' && grid[p.cy][p.cx + 1] !== '~' && grid[p.cy - 1]?.[p.cx] !== '~'));
    const landMat = water.material({ base: stone, strength: 0.5, baseScale: 0.35, baseBright: 0.7, ripple: 0.25, tint: [0.8, 0.84, 0.92], side: 0.45 });
    const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 0.45, CELL), landMat, land.length);
    land.forEach((p, i) => { m4.makeTranslation(p.x, -0.215, p.z); slabs.setMatrixAt(i, m4); });
    ctx.add(water.attach(slabs));

    // sky: a dome painted with the painting's own sky, so the water always has something to reflect
    const band = ctx.art.crop([0, 0, 1, 0.3], 1024);
    const sc = document.createElement('canvas'); sc.width = 2048; sc.height = 1024;
    const sg = sc.getContext('2d');
    const top = sg.createLinearGradient(0, 0, 0, 340); top.addColorStop(0, '#3c4050'); top.addColorStop(1, '#6a6a78');
    sg.fillStyle = top; sg.fillRect(0, 0, 2048, 520);
    const bandC = document.createElement('canvas'); bandC.width = 512; bandC.height = 260;
    const bg2 = bandC.getContext('2d'); bg2.drawImage(band, 0, 0, 512, 260);
    const fade = bg2.createLinearGradient(0, 0, 0, 90); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    bg2.globalCompositeOperation = 'destination-out'; bg2.fillStyle = fade; bg2.fillRect(0, 0, 512, 90);
    for (let i = 0; i < 4; i++) { sg.save(); sg.translate(i * 512 + (i % 2 ? 512 : 0), 260); sg.scale(i % 2 ? -1 : 1, 1); sg.drawImage(bandC, 0, 0, 512, 260); sg.restore(); }
    sg.fillStyle = '#4a5264'; sg.fillRect(0, 518, 2048, 506);
    const skyTex = ctx.art.tex(sc);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, color: 0x9098a8 }));
    const cx = (grid[0].length * CELL) / 2, cz = (grid.length * CELL) / 2;
    sky.position.set(cx, -6, cz);
    ctx.add(sky);
    ctx.light({ ambient: 1.25, color: 0xb4bccc, ground: 0x2a3038, lantern: { angle: 0.5, range: 16, intensity: 22, color: 0xe8e4d8 }, fog: { color: 0x4a5264, near: 8, far: 62 }, sky: 0x4a5264 });

    // the cypresses: tall dark flames, the bark is the painting's own green
    const cyTex = ctx.art.wall([0.42, 0.12, 0.16, 0.6], { dark: 0.2 });
    cyTex.repeat.set(2, 3);
    const cyMat = new THREE.MeshBasicMaterial({ map: cyTex, color: 0x56604f });
    const cyImg = await ctx.art.load(OP + 'cipresso.webp');
    const cardMat = new THREE.MeshBasicMaterial({ map: ctx.art.tex(cyImg), alphaTest: 0.45, side: THREE.DoubleSide, color: 0xe0e8dc });
    const card = new THREE.PlaneGeometry(1, 1); card.translate(0, 0.5, 0);
    const cone = new THREE.ConeGeometry(1, 1, 9, 6);
    { const p = cone.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 + Math.sin(i * 12.9898) * 0.12; p.setX(i, p.getX(i) * k * (0.6 + 0.4 * Math.cos((y + 0.5) * 2.2))); p.setZ(i, p.getZ(i) * k * (0.6 + 0.4 * Math.cos((y + 0.5) * 2.2))); } cone.computeVertexNormals(); }
    const trees = [];
    const tree = (x, z, h, r, solid = true) => {
      const m = new THREE.Mesh(cone, cyMat); m.scale.set(r * 0.6, h * 0.92, r * 0.6); m.position.set(x, h * 0.46 - 0.2, z); ctx.add(m);
      // two crossed cut-outs of the painted cypress give it the brushwork
      for (let k = 0; k < 2; k++) { const c2 = new THREE.Mesh(card, cardMat); c2.scale.set(r * 2.6, h, 1); c2.position.set(x, -0.3, z); c2.rotation.y = k * Math.PI / 2 + x; ctx.add(c2); }
      if (solid) ctx.collider(x, z, r * 0.55);
      trees.push(m);
    };
    const rnd = ctx.rand;
    for (let cy = 3; cy <= 10; cy++) for (let cx2 = 9; cx2 <= 16; cx2++) {
      if ((cx2 === 12 || cx2 === 13) && cy >= 5) continue; // the path to the coffin
      if (rnd() < 0.3) { const p = ctx.map.toWorld(cx2, cy); tree(p.x + (rnd() - 0.5) * 0.8, p.z + (rnd() - 0.5) * 0.8, 11 + rnd() * 7, 0.8 + rnd() * 0.5); }
    }
    // a wall of cypresses standing behind the rock, the silhouette of the painting
    for (let i = 0; i < 14; i++) { const p = ctx.map.toWorld(8 + i * 0.75, 1 + (i % 3) * 0.6); tree(p.x, p.z, 16 + rnd() * 9, 1.3 + rnd() * 0.6, false); }

    // the coffin in the grove, the boat on the lake
    const draped = ctx.art.tex(ctx.art.crop([0.37, 0.81, 0.04, 0.05], 256));
    const coffin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 2.3), new THREE.MeshBasicMaterial({ map: draped, color: 0xe8e4dc }));
    const bc = ctx.map.find('coffin');
    const cpos = new THREE.Vector3((bc[0].x + bc[1].x) / 2, 0, (bc[0].z + bc[1].z) / 2);
    coffin.position.set(cpos.x, 0.45, cpos.z); coffin.rotation.y = Math.PI / 2;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 2.8), new THREE.MeshBasicMaterial({ map: stone, color: 0xa0a0a0 }));
    plinth.position.set(cpos.x, 0.06, cpos.z); plinth.rotation.y = Math.PI / 2;
    ctx.add(coffin); ctx.add(plinth);
    ctx.collider(cpos.x - 0.6, cpos.z, 0.5); ctx.collider(cpos.x + 0.6, cpos.z, 0.5);

    const start = ctx.map.find('start')[0];
    const boatImg = await ctx.art.load(OP + 'barca.webp');
    const boat = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2 * (boatImg.height / boatImg.width)), new THREE.MeshBasicMaterial({ map: ctx.art.tex(boatImg), transparent: true, alphaTest: 0.4, color: 0x8a8f9a, side: THREE.DoubleSide }));
    boat.position.set(start.x + 1.6, (4.2 * (boatImg.height / boatImg.width)) / 2 - 0.25, start.z + 2.6);
    ctx.add(boat);
    ctx.player.place(start.x, start.z, 0);

    // ---------- the dead ----------
    const veiled = await ctx.art.load(OP + 'velato.webp');
    const dark = ctx.art.cutout({ rect: [0.236, 0.42, 0.11, 0.075], oval: true, rot: 0.6, feather: 4 });
    const door = ctx.art.cutout({ rect: [0.681, 0.444, 0.03, 0.068], oval: true, rot: 0.4 });
    const cypress = cyImg;

    const VEILED = {
      name: T('Il Velato', 'The Veiled One'),
      sprite: veiled, height: 2.1, hp: 3, speed: 2.2, dmg: 14, reach: 1.25, radius: 0.35,
      behavior: 'chase', onlyInMirror: true, hitWhenHidden: true,
      parts: [{ type: 'strands', n: 16, len: 0.9, color: 0xb8b4aa, at: [0, 1.1, 0.02], spread: 0.25 }],
      twitch: 0.25, rot: 0.25, tear: 0.4, breathe: 0.6, selfLit: 0.55, blood: 0xd8d4c8,
      attackEvery: 1.1,
      onAttack(m, c) { c.audio.breath(); c.hud.whisper(T('qualcosa ti tocca', 'something touches you')); },
    };
    const TOMB = {
      name: T('La finestra della tomba', 'The tomb window'),
      sprite: dark, height: 1.5, lift: 0.8, hp: 2, speed: 3.1, dmg: 9, reach: 1.3, radius: 0.35,
      behavior: 'fly', parts: [{ type: 'eyes', at: [[-0.12, 0.55], [0.1, 0.52]], size: 0.05, glow: 1, color: 0xe8e0c8 }, { type: 'teeth', at: [0, 0.32], r: 0.1, n: 10 }],
      twitch: 0.7, rot: 0.6, tear: 0.8, selfLit: 0.25, blood: 0x14161a,
    };
    const DOOR = {
      ...TOMB, name: T('La porta bianca', 'The white door'), sprite: door, height: 1.9, lift: 0.4, hp: 4, speed: 1.5, behavior: 'ranged', fireEvery: 2.6,
      projectile: { speed: 6, dmg: 9, color: 0xd8d0c0, size: 0.16 }, parts: [{ type: 'eyes', at: [[0, 0.5]], size: 0.09, glow: 1, color: 0xf0f0e0 }],
    };
    const CYPRESS = {
      name: T('Il cipresso', 'The cypress'),
      sprite: cypress, height: 6.5, hp: 9, speed: 1.6, dmg: 26, reach: 1.8, radius: 0.6,
      behavior: 'statue', rot: 0.2, tear: 0.9, twitch: 0.2, breathe: 1.4, selfLit: 0.1, blood: 0x0c140c,
      parts: [{ type: 'eyes', at: [[-0.12, 0.62], [0.12, 0.6], [0, 0.7]], size: 0.07, color: 0xe8e0d0 }, { type: 'tendrils', n: 5, len: 1.4, thick: 0.05, at: [0, 0.3, 0], color: 0x10180e }],
      score: 3,
      onAttack(m, c) { c.audio.growl(0.4, 0.3); },
    };

    const lakeSpawns = ctx.map.find('M').filter((p) => grid[p.cy][p.cx] === 'M' && p.cy > 16 || p.cx < 3 || p.cx > 22);
    const tombSpawns = ctx.map.find('M').filter((p) => !lakeSpawns.includes(p));
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const near = (list, min) => { const pp = ctx.player.pos; const ok = list.filter((p) => p.distanceTo(pp) > min); return pick(ok.length ? ok : list); };

    ctx.data = { phase: 0, gate: ctx.map.find('gate'), cpos, coffin, trees, sky, water, end: 0, hint: 0, KEYS: { VEILED, TOMB, DOOR, CYPRESS }, near, lakeSpawns, tombSpawns };
    // the veiled come out of the water, right away
    ctx.data.veil = ctx.spawner({ kinds: [{ def: VEILED, w: 1 }], first: 3, every: 2.4, max: 4, where: () => near(lakeSpawns.concat(tombSpawns), 9) });
    ctx.data.tombs = ctx.spawner({ kinds: [{ def: TOMB, w: 3 }, { def: DOOR, w: 1 }], first: 1, every: 3.2, max: 3, where: () => near(tombSpawns, 7) });
    ctx.data.cyp = null;
    ctx.hud.goal(T('morti da abbattere (cancello)', 'dead to kill (gate)'), 12);
    ctx.pickup(ctx.map.toWorld(12, 14), { kind: 'heal', amount: 35 });
    ctx.pickup(ctx.map.toWorld(5, 6), { kind: 'heal', amount: 25 });
    ctx.after(1.2, (c) => c.hud.say(T('Guarda in basso. L’acqua li vede.', 'Look down. The water sees them.'), 3200));
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player;
    // somewhere near you, something invisible: the screen knows before you do
    let close = 99;
    for (const m of ctx.monsters.list) if (!m.dying && m.onlyInMirror) close = Math.min(close, m.pos.distanceTo(p.pos));
    const k = Math.max(0, 1 - close / 5);
    ctx.fx.tunnel = k * 0.12;
    ctx.fx.smear = 0.35 + k * 0.4;
    ctx.fx.blur = k * 0.25;
    if (k > 0.5 && ctx.time - d.hint > 4) { d.hint = ctx.time; ctx.audio.breath(); }
    // the sky darkens as you climb
    const climb = Math.max(0, Math.min(1, (26 * ctx.CELL - p.pos.z) / (20 * ctx.CELL)));
    d.sky.material.color.setRGB(0.56 - climb * 0.2, 0.6 - climb * 0.22, 0.66 - climb * 0.2);

    if (d.phase === 0) {
      ctx.hud.goal(T('morti da abbattere (cancello)', 'dead to kill (gate)'), Math.max(0, 12 - ctx.kills));
      if (ctx.kills >= 12) {
        d.phase = 1;
        for (const g of d.gate) ctx.map.setSolid(g.cx, g.cy, false);
        ctx.audio.toll(46); ctx.audio.toll(69);
        ctx.hud.say(T('Il cancello dei cipressi è aperto. I cipressi si sono accorti di te.', 'The gate of the cypresses is open. The cypresses have noticed you.'), 3600);
        const grove = ctx.map.find('grove').filter((q) => q.cy <= 6);
        d.cyp = ctx.spawner({ kinds: [{ def: d.KEYS.CYPRESS, w: 1 }], first: 2, every: 6, max: 3, where: () => d.near(grove, 6) });
        d.veil.cfg.every = 1.8; d.veil.cfg.max = 7;
      }
    } else if (d.phase === 1) {
      ctx.hud.goal(T('morti da abbattere (bara)', 'dead to kill (coffin)'), Math.max(0, 24 - ctx.kills));
      if (ctx.kills >= 24) {
        d.phase = 2;
        ctx.hud.say(T('La bara si è aperta. Va’ a vedere di chi è.', 'The coffin has opened. Go and see whose it is.'), 3400);
        ctx.audio.toll(40);
        d.coffin.rotation.z = 0.0;
      }
    } else if (d.phase === 2) {
      ctx.hud.goal(T('raggiungi la bara', 'reach the coffin'), Math.round(p.pos.distanceTo(d.cpos)) + ' m');
      d.coffin.position.y = 0.45 + Math.sin(ctx.time * 5) * 0.02;
      if (p.pos.distanceTo(d.cpos) < 2.4) {
        d.phase = 3;
        const name = (store.name || '').trim() || ctx.t(T('il tuo nome', 'your name'));
        ctx.hud.say(T(`Sulla bara c’è scritto: ${name.toUpperCase()}`, `Written on the coffin: ${name.toUpperCase()}`), 4200);
        ctx.audio.toll(38);
        for (const sp of [d.veil, d.tombs, d.cyp]) sp?.stop();
        for (const m of ctx.monsters.list.slice()) if (!m.dying) ctx.monsters.kill(m);
        p.frozen = true;
        d.end = ctx.time;
      }
    } else if (d.phase === 3) {
      // you become the veiled figure: the world goes white and still
      const t = ctx.time - d.end;
      ctx.fx.mono = 0.35 + t * 0.3; ctx.fx.exposure = 1.15 + t * 0.5; ctx.fx.blur = t * 0.4;
      if (t > 2.6 && d.phase === 3) { d.phase = 4; ctx.win(); }
    }
  },

  // the shot that hits the water bounces and takes what the water reflects
  onShot(ctx, shot) {
    if (shot.monster) return;
    const hit = ctx.data.water.reflectShot(shot);
    if (!hit) {
      if (shot.point?.y < 0.06) ctx.particles.burst(shot.point, 10, 0x9aa8b8, 1.6, 0.7);
      return;
    }
    shot.monster = hit.m; shot.point = hit.point; shot.dmg = ctx.gun.dmg; shot.zone = null;
    ctx.particles.burst({ x: shot.point.x, y: 0.05, z: shot.point.z }, 8, 0xc8d0dc, 1.4, 0.6);
  },

  teardown(ctx) { ctx.data?.water?.dispose(); },

  souvenir(g, { x, y, w, h, lang }) {
    // the name on the coffin, as on a tombstone
    const name = (store.name || '').trim().toUpperCase();
    if (!name) return;
    g.save();
    g.font = `${Math.round(h * 0.022)}px Georgia, serif`; g.textAlign = 'center';
    g.fillStyle = 'rgba(40,36,30,0.85)';
    g.fillText(name, x + w * 0.385, y + h * 0.855);
    g.restore();
  },
};
