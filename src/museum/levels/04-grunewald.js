// Livello 4 · Matthias Grünewald, La Tentazione di Sant'Antonio (Altare di Isenheim, 1512–16).
// The altar was painted for the hospital of the Antonite monks at Isenheim, where they nursed people
// with "St Anthony's fire": ergotism, a poisoning from mouldy rye bread that gave visions, burning,
// limbs that turned black. The level is that hospital ward. The rule: the contagion. It rises with
// every touch of pus, and the sicker you are the more demons you see that are not there. You heal
// only in the niches of the Tau cross, but drinking the saint's wine holds you still.

const T = (it, en) => ({ it, en });

// map: the ward (beds b), the choir with the altar (Q), two side chapels behind the altar wings
// D (first opening) and E (second opening), niches of the Tau cross (T)
const GRID = [
  '#####################',
  '#.....#...QQQ...#...#',
  '#..T..#.........#.T.#',
  '#.....D....M....E...#',
  '#.M...#.........#.M.#',
  '#.....#.........#...#',
  '###D#######.#######E#',
  '#...b..b.......b..b.#',
  '#.M...............M.#',
  '#...b..b.......b..b.#',
  '#...................#',
  '#...b..b...T...b..b.#',
  '#.M...............M.#',
  '#...b..b.......b..b.#',
  '#...................#',
  '#...b..b.......b..b.#',
  '#.........P.........#',
  '#####################',
];

// where the figures are in the panel (0..1 of the painting). Kept together so they are easy to retouch.
const CUT = {
  sick: { rect: [0.0, 0.775, 0.29, 0.225] },                                     // the sick man with the swollen belly, bottom left
  bird: { rect: [0.7, 0.5, 0.3, 0.34], poly: [[0.25, 0.25], [0.45, 0.1], [0.75, 0.13], [0.97, 0.35], [1, 0.72], [0.85, 1], [0.45, 1], [0.28, 0.7]] }, // the bird demon, right
  beast: { rect: [0.52, 0.42, 0.42, 0.25] },                                     // the orange demon raising its club
  bat: { rect: [0.0, 0.4, 0.27, 0.2] },                                          // the horned demon, left
  toad: { rect: [0.4, 0.85, 0.25, 0.15] },                                       // the scaly dragon-toad at the saint's feet
  wall: [0.0, 0.26, 0.3, 0.14], floor: [0.62, 0.88, 0.3, 0.1],
};

export default {
  id: 'grunewald',
  artist: 'Matthias Grünewald',
  year: '1512–16',
  title: T('La Tentazione di Sant’Antonio', 'The Temptation of St Anthony'),
  museum: T('Musée Unterlinden, Colmar (Altare di Isenheim)', 'Musée Unterlinden, Colmar (Isenheim Altarpiece)'),
  image: '/museo/opere/04-grunewald.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T(
    'L’ospedale di Isenheim. Sui letti di paglia i malati del fuoco di Sant’Antonio guardano l’altare in fondo alla corsia, l’unica cosa che resta loro.',
    'The hospital of Isenheim. On straw beds the sick of St Anthony’s fire stare at the altar at the end of the ward, the only thing they have left.'),
  rule: T(
    'Il contagio sale con il pus e vicino ai malati. Più sei malato, più vedi demoni finti: non sanguinano e ti fanno sprecare colpi. Guarisci solo nelle nicchie con la croce a T, ma bevendo resti fermo. Gli sportelli dell’altare si aprono a ogni ondata.',
    'The contagion rises with pus and near the sick. The sicker you are, the more false demons you see: they do not bleed and they waste your shots. You heal only in the niches of the T cross, but while you drink you cannot move. The altar wings open with every wave.'),
  ruleShort: T('il contagio ti fa vedere demoni finti', 'the contagion shows you false demons'),
  goal: T('Sopravvivi alle tre aperture dell’altare.', 'Survive the three openings of the altar.'),
  paint: '#6a7a20',
  accent: '#a8c040',
  fx: { mono: 0.35, tint: [0.92, 1.0, 0.78], contrast: 1.2, grain: 0.7, scratches: 0.45, dust: 0.5, flicker: 0.25, weave: 0.2, vignette: 0.9 },
  player: { hp: 100, speed: 5.3 },
  discovery: {
    title: T('Il pittore senza nome', 'The painter with no name'),
    text: T(
      'Nessuno sa come si chiamasse davvero: "Grünewald" è un nome sbagliato, inventato da uno scrittore più di cento anni dopo la sua morte. Forse si chiamava Mathis Gothart Nithart. Il suo altare stava nell’ospedale degli Antoniti: i malati lo guardavano mentre morivano. In un angolo del quadro, su un foglietto, è scritto: "Dov’eri, buon Gesù? Perché non sei venuto a guarire le mie ferite?"',
      'Nobody knows his real name: "Grünewald" is a mistake, made up by a writer more than a century after his death. He may have been called Mathis Gothart Nithart. His altar stood in the Antonite hospital: the sick looked at it while they died. In a corner of the painting, on a scrap of paper, it says: "Where were you, good Jesus? Why did you not come to heal my wounds?"'),
  },
  deathLine: T('Ora sei uno di loro, su un letto di paglia.', 'Now you are one of them, on a straw bed.'),

  async setup(ctx) {
    const { THREE } = ctx;
    ctx.data = { infection: 0, opened: 0, niche: null, nicheT: 0, fakes: 0, wave: 0 };
    const lift = (rect, k, size = 256) => {
      const src = ctx.art.crop(rect, size);
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); g.filter = `brightness(${k}) saturate(0.8) contrast(1.1)`;
      g.drawImage(src, 0, 0, size, size);
      return ctx.art.tex(c, { repeat: true });
    };
    const stone = new THREE.MeshStandardMaterial({ color: 0x5a5a48, roughness: 1 });
    ctx.map.build({
      grid: GRID,
      legend: {
        D: { solid: true, tex: 'wing', wing: 1 },
        E: { solid: true, tex: 'wing', wing: 2 },
        T: { tau: true },
        b: { bed: true },
      },
      textures: { wall: lift(CUT.wall, 1.5), floor: lift(CUT.floor, 1.2), ceil: stone, wing: lift([0.0, 0.0, 1, 1], 1.0, 512), painting: ctx.art.texture },
      height: 5,
    });
    ctx.light({ ambient: 0.7, color: 0xb8c8a0, ground: 0x101008, lantern: { angle: 0.5, range: 16, intensity: 42, penumbra: 0.5, color: 0xf0f0c8 }, fog: { color: 0x080a04, near: 3, far: 24 } });

    // straw beds with the sick lying on them (a lump under the sheet that breathes)
    const straw = new THREE.MeshStandardMaterial({ color: 0x6a5a30, roughness: 1 });
    const sheet = new THREE.MeshStandardMaterial({ color: 0x8a8a70, roughness: 1 });
    ctx.data.bodies = [];
    for (const p of ctx.map.find('bed')) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 2.1), straw); bed.position.set(p.x, 0.22, p.z);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 4, 8), sheet); body.rotation.x = Math.PI / 2; body.position.set(p.x, 0.6, p.z);
      ctx.add(bed); ctx.add(body); ctx.collider(p.x, p.z - 0.5, 0.55); ctx.collider(p.x, p.z + 0.5, 0.55);
      ctx.data.bodies.push(body);
    }
    // the niches of the Tau cross: a green glow and a T of light on the floor
    ctx.data.niches = ctx.map.find('tau').map((p) => {
      const g = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ color: 0xc8e070, transparent: true, opacity: 0.8 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.12), m); bar.position.y = 1.9;
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), m); stem.position.y = 1.3;
      const l = new THREE.PointLight(0xc8e070, 10, 6, 1.5); l.position.y = 1.8;
      g.add(bar, stem, l); g.position.set(p.x, 0, p.z); ctx.add(g);
      return { p, g, l, m, cool: 0 };
    });

    // ---------- monsters cut from the panel ----------
    // the figures, cut along their outline from the panel (files made from the same reproduction)
    const imgs = {};
    await Promise.all(['sick', 'bird', 'beast', 'bat', 'toad'].map(async (k) => { imgs[k] = await ctx.art.load(`/museo/opere/04-grunewald-${k}.webp`); }));
    const C = (k) => (imgs[k].isPlaceholder ? ctx.art.cutout({ ...CUT[k], rot: 0.3 }) : imgs[k]);
    const sick = {
      name: T('Il malato', 'The sick man'),
      sprite: C('sick'), height: 1.7, hp: 3, speed: 1.6, dmg: 8, radius: 0.45,
      behavior: 'chase', twitch: 0.4, rot: 0.25, tear: 0.4, breathe: 1.8, blood: 0x8a9a30, selfLit: 0.1,
      parts: [{ type: 'sack', at: [0, 0.8, 0.2], size: 0.35, color: 0x6a5a30 }],
      // it bursts in a cloud of pus
      onDeath(m, c) {
        c.particles.burst({ x: m.pos.x, y: 1, z: m.pos.z }, 40, 0x9aaa30, 3);
        if (m.pos.distanceTo(c.player.pos) < 3.2) infect(c, 0.22);
      },
    };
    const bird = {
      name: T('Il demone becco', 'The beaked demon'),
      sprite: C('bird'), height: 1.5, hp: 2, speed: 3.2, dmg: 7, radius: 0.4,
      behavior: 'fly', twitch: 0.9, rot: 0.15, tear: 0.6, blood: 0x4a3020, selfLit: 0.08,
    };
    const beast = {
      name: T('La bestia col bastone', 'The beast with the club'),
      sprite: C('beast'), height: 2.1, hp: 5, speed: 2.4, dmg: 16, radius: 0.5,
      behavior: 'charge', twitch: 0.6, rot: 0.15, tear: 0.5, blood: 0x5a2010, selfLit: 0.08,
      parts: [{ type: 'spikes', n: 7, at: [0, 1.7, -0.1], color: 0x2a2010 }],
    };
    const bat = {
      name: T('Il demone cornuto', 'The horned demon'),
      sprite: C('bat'), height: 1.6, lift: 0.8, hp: 3, speed: 2.4, dmg: 6, radius: 0.45,
      behavior: 'ranged', fireEvery: 2.4, projectile: { speed: 7, dmg: 7, color: 0x9aaa30, size: 0.16 },
      twitch: 0.7, rot: 0.15, tear: 0.6, blood: 0x6a7a20, selfLit: 0.08,
    };
    const toad = {
      name: T('Il drago rospo', 'The toad dragon'),
      sprite: C('toad'), height: 0.9, hp: 2, speed: 3.4, dmg: 6, radius: 0.4,
      behavior: 'crawl', twitch: 0.8, rot: 0.15, tear: 0.2, breathe: 1.2, blood: 0x4a4a20, selfLit: 0.1,
      parts: [{ type: 'legs', n: 6, len: 0.5, at: [0, 0.25, 0], color: 0x3a3018 }],
    };
    ctx.data.defs = { sick, bird, beast, bat, toad };
    const W = [
      [{ def: sick, w: 3 }, { def: bird, w: 2 }, { def: toad, w: 2 }],
      [{ def: sick, w: 3 }, { def: bird, w: 2 }, { def: beast, w: 1 }, { def: bat, w: 1 }],
      [{ def: sick, w: 2 }, { def: bird, w: 2 }, { def: beast, w: 2 }, { def: bat, w: 2 }, { def: toad, w: 2 }],
    ];
    ctx.data.waves = W;
    ctx.data.thresholds = [10, 24];
    ctx.goalKills(42);
    ctx.data.sp = ctx.spawner({ kinds: W[0], first: 4, every: 1.7, max: 7 });

    ctx.action({ label: T('BEVI', 'DRINK') });
    ctx.hud.bar('inf', { label: T('contagio', 'contagion'), value: 0, color: '#a8c040' });
    ctx.after(1, () => ctx.hud.say(T('L’altare è chiuso. Resisti.', 'The altar is closed. Hold on.'), 2200));
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player;
    // the sick under the sheets breathe
    d.bodies.forEach((b, i) => { b.scale.y = 1 + Math.sin(ctx.time * 1.7 + i) * 0.06; });

    // contagion: near the living sick it creeps up
    for (const m of ctx.monsters.list) if (m.def === d.defs.sick && !m.dying && m.pos.distanceTo(p.pos) < 2.6) d.infection = Math.min(1, d.infection + dt * 0.07);
    const inf = d.infection;
    ctx.hud.bar('inf', { value: inf });
    ctx.fx.wobble = inf > 0.6 ? (inf - 0.6) * 0.8 : 0;
    ctx.fx.tint = [0.92 - inf * 0.1, 1.0, 0.78 - inf * 0.25];
    p.aimShake = inf > 0.6 ? (inf - 0.6) * 2.4 : 0;
    if (inf > 0.6 !== d.black) { d.black = inf > 0.6; ctx.weapon.setHand(d.black ? '#2a1a10' : '#8a6a58'); if (d.black) ctx.hud.whisper(T('le tue mani anneriscono', 'your hands are turning black')); }
    if (inf > 0.9) p.hurt(dt * 3, null);

    // visions: the sicker you are, the more false demons
    d.fakeT = (d.fakeT ?? 2) - dt * (inf > 0.3 ? 1 + inf * 2 : 0);
    if (d.fakeT <= 0) {
      d.fakeT = 2.2;
      const alive = ctx.monsters.list.filter((m) => m.fake && !m.dying).length;
      if (alive < Math.round(inf * 8)) {
        const kinds = [d.defs.bird, d.defs.beast, d.defs.sick, d.defs.bat, d.defs.toad];
        const pos = ctx.map.freeAround(p.pos.x, p.pos.z, 5, 12, 1)[0];
        if (pos) ctx.spawn(kinds[Math.floor(Math.random() * kinds.length)], pos, { fake: true });
      }
    }

    // the niches of the Tau cross: stand in one and drink to heal, frozen while you drink
    for (const n of d.niches) { n.cool = Math.max(0, n.cool - dt); n.m.opacity = n.cool > 0 ? 0.15 : 0.6 + Math.sin(ctx.time * 3) * 0.2; n.l.intensity = n.cool > 0 ? 1 : 10; }
    const here = d.niches.find((n) => n.cool <= 0 && Math.hypot(n.p.x - p.pos.x, n.p.z - p.pos.z) < 1.3);
    if (d.niche) {
      d.nicheT += dt;
      p.frozen = true;
      if (d.nicheT >= 2.4) {
        d.infection = 0; p.heal(20); d.niche.cool = 22; d.niche = null; p.frozen = false;
        ctx.audio.toll(220); ctx.hud.say(T('Il vino di Sant’Antonio.', 'St Anthony’s wine.'), 1400);
        for (const m of ctx.monsters.list) if (m.fake) ctx.monsters.remove(m);
      }
    } else if (here && ctx.input.altPressed) {
      d.niche = here; d.nicheT = 0; ctx.audio.tone(330, 2.4, 'sine', 0.05, 1.2);
    } else if (here && !d.hint) { d.hint = true; ctx.hud.whisper(T('premi l’azione per bere', 'press the action to drink')); }

    // the altar wings open wave by wave
    while (d.opened < d.thresholds.length && ctx.kills >= d.thresholds[d.opened]) {
      d.opened++;
      for (const c of ctx.map.find('wing')) if (ctx.map.cell(c.cx, c.cy).def.wing === d.opened) ctx.map.setSolid(c.cx, c.cy, false);
      d.sp.cfg.kinds = d.waves[d.opened];
      d.sp.cfg.every = 1.7 - d.opened * 0.3; d.sp.cfg.max = 7 + d.opened * 2;
      for (let i = 0; i < 3 + d.opened * 2; i++) d.sp.cfg.kinds && ctx.spawn(d.waves[d.opened][i % d.waves[d.opened].length].def, ctx.map.freeAround(p.pos.x, p.pos.z, 7, 15, 1)[0] || p.pos);
      ctx.audio.toll(70);
      ctx.hud.say(d.opened === 1 ? T('Prima apertura: gli sportelli si aprono.', 'First opening: the wings swing open.') : T('Seconda apertura: Sant’Antonio.', 'Second opening: St Anthony.'), 2600);
    }
  },

  onHurt(ctx, dmg) { infect(ctx, dmg * 0.006); return dmg; },
  teardown(ctx) { ctx.player.frozen = false; },
};

function infect(ctx, v) { ctx.data.infection = Math.min(1, ctx.data.infection + v); }
