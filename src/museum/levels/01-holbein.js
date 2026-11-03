// LIVELLO 1 · Hans Holbein il Giovane, Il corpo di Cristo morto nella tomba (1521–22).
// The painting is 30 cm high and 2 m long: a body in a box. The level is that box.
// Rule: the lid comes down. Every soul you send back lifts it a little; the shrouds that close the
// tomb tear only after enough kills. Run to the feet before the lid shuts.

const T = (it, en) => ({ it, en });
const LID_TOP = 3.0;      // m, the open tomb
const LID_DEATH = 0.55;   // m, closed on you
const FALL = 0.06;        // m per second (about 40 s from open to closed if you never kill)
const LIFT = 0.09;        // m per kill
const KILLS_PER_SHROUD = 4;

export default {
  id: 'holbein',
  artist: 'Hans Holbein il Giovane',
  year: '1521–22',
  title: T('Il corpo di Cristo morto nella tomba', 'The Body of the Dead Christ in the Tomb'),
  museum: T('Kunstmuseum, Basilea', 'Kunstmuseum, Basel'),
  image: '/museo/opere/01-holbein.jpg',
  credit: T('Riproduzione: pubblico dominio (Kunstmuseum Basel)', 'Reproduction: public domain (Kunstmuseum Basel)'),
  intro: T(
    'Un quadro alto trenta centimetri e lungo due metri. Dentro c’è un corpo a grandezza naturale, già verde alle mani e ai piedi. Non c’è nessun angelo. C’è solo il coperchio.',
    'A painting thirty centimetres high and two metres long. Inside lies a life-size body, already green at the hands and feet. There is no angel. There is only the lid.'),
  rule: T(
    'Il coperchio della tomba scende. Ogni anima che rimandi nel quadro lo solleva di un palmo. I sudari si squarciano solo dopo 4 anime: corri fino ai piedi prima che si chiuda.',
    'The lid of the tomb is coming down. Every soul you send back lifts it a hand’s breadth. The shrouds tear only after 4 souls: run to the feet before it shuts.'),
  ruleShort: T('uccidi per alzare il coperchio, vai a est', 'kill to lift the lid, head east'),
  goal: T('Squarcia i 3 sudari (4 anime ciascuno) e arriva ai piedi del Cristo.', 'Tear the 3 shrouds (4 souls each) and reach the feet of Christ.'),
  paint: '#5a6a40',
  accent: '#9a3a28',
  fx: { exposure: 1.45, mono: 0.9, tint: [0.86, 0.9, 0.74], keepRed: 0.95, contrast: 0.62, grain: 0.55, scratches: 0.5, dust: 0.6, flicker: 0.3, smear: 0.2, vignette: 0.6 },
  discovery: {
    title: T('Il quadro che fa perdere la fede', 'The painting that takes your faith'),
    text: T(
      'Nel 1867 Dostoevskij si fermò a Basilea solo per vederlo. Salì su una sedia per guardarlo da vicino e la moglie temette un attacco di epilessia. Lo mise nell’Idiota: «Davanti a quel quadro uno può perdere la fede». Si racconta che Holbein usò come modello un annegato ripescato dal Reno. Cerca la firma: in alto a destra, sopra i piedi, c’è scritto MDXXI.',
      'In 1867 Dostoevsky stopped in Basel only to see it. He climbed on a chair to look closer and his wife feared an epileptic fit. He put it in The Idiot: “A man could lose his faith looking at that picture.” The story goes that Holbein used a man drowned in the Rhine as his model. Look for the date: top right, above the feet, it says MDXXI.'),
    image: '/museo/opere/01-holbein-autoritratto.jpg',
  },
  deathLine: T('Il coperchio si è chiuso. Ora sei tu il quadro.', 'The lid has shut. Now you are the painting.'),

  async setup(ctx) {
    const { THREE } = ctx;
    // textures cut from the painting: the olive dark of the niche, the shroud, the black behind the feet
    const wall = ctx.art.wall([0.3, 0.02, 0.4, 0.16], { dark: 0 });
    const floor = ctx.art.wall([0.25, 0.84, 0.3, 0.12], { dark: 0.15 });
    const lidTex = ctx.art.wall([0.82, 0.0, 0.12, 0.3], { dark: 0 });
    // the stone glows faintly, like the greenish light in the niche of the painting
    const glowMat = (map, k) => new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, roughness: 0.9 });
    const shroud = new THREE.MeshStandardMaterial({ map: ctx.art.wall([0.42, 0.78, 0.2, 0.16], { dark: 0.05 }), color: 0xe8e0d0, roughness: 1, transparent: true, opacity: 0.92 });

    // The tomb: a corridor two cells wide and forty long, closed by shrouds (S).
    // Niches (M) along the walls are the loculi where the dead wait.
    // Head at the west, feet at the east (X), the real painting on the far wall (Q).
    const grid = [
      '############################################',
      '##M#M####M#M####M#M#M###M#M####M#M###M#M####',
      '#P.........S.........S.........S.........X##',
      '#..........S.........S.........S.........X##',
      '###M#M###M###M#M###M##M#M##M####M#M###M#####',
      '############################################',
    ];
    ctx.map.build({
      grid,
      legend: { S: { solid: true, tex: 'shroud', shroud: true }, M: { spawn: true } },
      textures: { wall: glowMat(wall, 0.35), floor: glowMat(floor, 0.18), shroud },
      height: LID_TOP,
      ceiling: false,
    });
    ctx.player.place(ctx.map.toWorld(1, 2).x + 0.6, ctx.map.toWorld(1, 2).z + 1, Math.PI / 2);

    // the lid: a slab of the painting's black, sliding down inside the walls
    const W = ctx.map.width * ctx.CELL, D = ctx.map.height * ctx.CELL;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), new THREE.MeshStandardMaterial({ map: lidTex, color: 0x6a6450, roughness: 1 }));
    lidTex.repeat.set(W / 3, D / 3);
    lid.position.set(W / 2, LID_TOP + 0.15, D / 2);
    ctx.add(lid);
    // the painting itself on the wall at the feet, twice life size, low: you see it as you crawl in
    const art = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 3.9 / 6.69), new THREE.MeshBasicMaterial({ map: ctx.art.texture, color: 0xb8b0a0 }));
    art.position.set(42 * ctx.CELL - 0.02, 0.75, 3 * ctx.CELL);
    art.rotation.y = -Math.PI / 2;
    ctx.add(art);

    ctx.light({ ambient: 0.75, color: 0xb8c0a0, ground: 0x10140a, lantern: { angle: 0.5, range: 22, intensity: 48, color: 0xf0e8c8 }, fog: { color: 0x050604, near: 3, far: 26 } });

    // ---- the dead, cut from the painting ----
    const hand = {
      name: T('La mano trafitta', 'The pierced hand'),
      sprite: await ctx.art.load('/museo/opere/01-holbein-mano.webp'),
      height: 0.8, hp: 1, speed: 3.0, dmg: 4, attackEvery: 1.1, reach: 1.0, radius: 0.3,
      behavior: 'chase', twitch: 0.9, rot: 0.35, tear: 0.2, breathe: 0.3,
      parts: [{ type: 'strands', n: 7, len: 0.45, color: 0x3a0a06, at: [-0.15, 0.2, -0.03], spread: 0.15 }],
      blood: 0x4a0604,
    };
    const face = {
      name: T('Il volto', 'The face'),
      sprite: await ctx.art.load('/museo/opere/01-holbein-volto.webp'),
      height: 0.85, lift: 1.1, hp: 2, speed: 2.5, dmg: 7, reach: 1.2, radius: 0.35,
      behavior: 'fly', twitch: 0.6, rot: 0.4, tear: 0.3,
      // the open mouth is the weak point
      zones: [{ name: 'bocca', x: [-0.2, 0.08], y: [0.62, 0.98], mul: 3 }],
      parts: [{ type: 'strands', n: 16, len: 0.9, color: 0x1a120a, at: [-0.3, 0.3, -0.05], spread: 0.25 }],
      onAttack: (m, c) => c.audio.scream(0.5, 0.12),
      blood: 0x3a0806,
    };
    const risen = {
      name: T('Il giacente', 'The one who lies'),
      sprite: await ctx.art.load('/museo/opere/01-holbein-ritto.webp'),
      height: 2.35, hp: 4, speed: 1.5, dmg: 11, reach: 1.3, radius: 0.35,
      // like the body in the painting: it looks dead while you look at it
      behavior: 'statue', twitch: 0.25, rot: 0.3, tear: 0.1, breathe: 0.2,
      zones: [{ name: 'costato', x: [-0.5, 0.5], y: [0.62, 0.78], mul: 2 }],
      parts: [{ type: 'eyes', at: [[0.05, 0.955]], size: 0.035, color: 0xd8d0b0 }],
      onSpawn: (m, c) => c.audio.breath(),
      blood: 0x2a0604,
    };
    const lying = { ...risen, name: T('Un corpo', 'A body'), sprite: await ctx.art.load('/museo/opere/01-holbein-corpo.webp'), height: 0.42, behavior: 'still', fake: true, dmg: 0, reach: 0, zones: [], parts: [], onSpawn: null };
    ctx.data = { lid: LID_TOP, opened: 0, kSince: 0, lidMesh: lid, defs: { hand, face, risen }, warned: false };

    // dead bodies lying in the corridor: they are only paint, they crumble if you shoot them
    for (const cx of [6, 15, 26, 36]) ctx.spawn(lying, ctx.map.toWorld(cx, cx % 2 ? 2 : 3), { fake: true, instant: true });

    // loculi in the section you are in, never behind a shroud still closed
    const where = (c, def) => {
      const pcx = c.map.toCell(c.player.pos.x, c.player.pos.z)[0];
      const lo = c.data.opened * 10 + 1, hi = Math.min(41, lo + 9 + (c.data.opened >= 3 ? 1 : 0));
      const pts = c.map.find('spawn').filter((p) => p.cx >= lo && p.cx <= hi && Math.abs(p.cx - pcx) >= 2);
      const p = pts[Math.floor(Math.random() * pts.length)];
      if (!p) return null;
      // step out of the niche into the corridor
      return new THREE.Vector3(p.x, 0, p.cy === 1 ? p.z + 1.6 : p.z - 1.6);
    };
    ctx.data.spawner = ctx.spawner({ kinds: [{ def: hand, w: 5 }, { def: face, w: 2 }, { def: risen, w: 1 }], first: 3, every: 1.6, burst: 1, max: 4, where });

    ctx.hud.bar('lid', { label: T('coperchio', 'lid'), value: 1, color: '#c8c0a0' });
    ctx.hud.goal(T('anime al prossimo sudario', 'souls to the next shroud'), KILLS_PER_SHROUD);
    ctx.audio.toll(48);
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player;
    // the lid falls a little faster the further you go: the body gets heavier towards the feet
    d.lid -= FALL * (1 + d.opened * 0.15) * dt;
    d.lid = Math.min(LID_TOP, d.lid);
    d.lidMesh.position.y = d.lid + 0.15;
    const k = (d.lid - LID_DEATH) / (LID_TOP - LID_DEATH);
    ctx.hud.bar('lid', { value: Math.max(0, k) });
    // the player bends, then crawls
    p.eye = Math.min(1.55, d.lid - 0.3);
    p.speedMul = d.lid > 1.9 ? 1 : 0.55 + 0.45 * Math.max(0, (d.lid - LID_DEATH) / (1.9 - LID_DEATH));
    ctx.fx.tunnel = Math.max(0, 0.55 - k) * 0.9;
    ctx.fx.vignette = 0.6 + (1 - k) * 0.35;
    ctx.audio.muffle(Math.max(0, 0.6 - k));
    if (k < 0.35 && !d.warned) { d.warned = true; ctx.hud.say(T('Il coperchio ti tocca la nuca.', 'The lid touches the back of your neck.'), 2400); ctx.audio.heart(); }
    if (k > 0.45) d.warned = false;
    if (d.lid <= LID_DEATH) { ctx.audio.toll(40); ctx.lose(); return; }
    // the monsters are pressed down by the lid too
    for (const m of ctx.monsters.list) if (m.view.height + m.lift > d.lid) m.lift = Math.max(0, d.lid - m.view.height - 0.05);
    // reaching the feet
    const cell = ctx.map.cellAt(p.pos.x, p.pos.z);
    if (cell?.def.exit) { ctx.hud.say(T('I piedi. Sono verdi.', 'The feet. They are green.'), 2000); ctx.win(); }
  },

  onKill(ctx, m) {
    const d = ctx.data;
    if (m.fake) return;
    d.lid = Math.min(LID_TOP, d.lid + LIFT);
    d.kSince++;
    if (d.kSince >= KILLS_PER_SHROUD && d.opened < 3) {
      d.kSince = 0;
      const shrouds = ctx.map.find('shroud').filter((p) => p.cx === 11 + d.opened * 10);
      for (const s of shrouds) ctx.map.setSolid(s.cx, s.cy, false);
      d.opened++;
      ctx.audio.burst(0.9, 900, 0.6, 0.35, 'bandpass', 200);
      ctx.hud.say(d.opened < 3 ? T('Il sudario si squarcia.', 'The shroud tears.') : T('L’ultimo sudario. I piedi sono là.', 'The last shroud. The feet are there.'), 2000);
      ctx.hud.goal(T('anime al prossimo sudario', 'souls to the next shroud'), KILLS_PER_SHROUD);
      if (d.opened === 3) ctx.hud.goal(T('raggiungi i piedi, a est', 'reach the feet, east'), '→');
    } else {
      if (d.opened < 3) ctx.hud.goal(T('anime al prossimo sudario', 'souls to the next shroud'), KILLS_PER_SHROUD - d.kSince);
      ctx.hud.whisper(T('il coperchio si alza di un palmo', 'the lid rises a hand’s breadth'));
    }
  },

  souvenir(g, { x, y, w, h }) {
    // the lid's shadow across the painting
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.35, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  },
};
