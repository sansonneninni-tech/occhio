// Livello 5 · Caravaggio, Medusa (1597–98).
// You walk on the shield itself: the painting lies on the floor of a round, pitch-dark room lit by
// one high window, like Caravaggio's studio. In the middle floats the screaming head.
// The rule: never look at her. Her stare turns you to stone. Hold the action to raise the mirror
// shield: the view turns round and flips, like Perseus, and only then do your shots reach her.

const T = (it, en) => ({ it, en });
const R = 6.4; // radius of the room in cells

function circleGrid() {
  const N = 15, c = 7;
  const rows = [];
  for (let y = 0; y < N; y++) {
    let s = '';
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= R) {
        // spawn holes along the rim, every 30 degrees or so
        const a = Math.atan2(y - c, x - c);
        const rim = d > R - 1.1 && Math.abs(Math.sin(a * 6)) < 0.25 && y < 12;
        s += x === c && y === 13 ? 'P' : rim ? 'M' : '.';
      } else s += d <= R + 1.6 ? '#' : ' ';
    }
    rows.push(s);
  }
  return rows;
}

export default {
  id: 'caravaggio',
  artist: 'Caravaggio',
  year: '1597–98',
  title: T('Medusa', 'Medusa'),
  museum: T('Galleria degli Uffizi, Firenze', 'Uffizi Gallery, Florence'),
  image: '/museo/opere/05-caravaggio.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T(
    'Sei dentro lo scudo. Il quadro è il pavimento e al centro, sospesa nel buio, la testa appena tagliata urla ancora.',
    'You are inside the shield. The painting is the floor, and in the middle, hanging in the dark, the freshly cut head is still screaming.'),
  rule: T(
    'Non guardarla: il suo sguardo ti trasforma in pietra. Tieni premuta l’azione per alzare lo SPECCHIO: vedi alle tue spalle, al contrario, come Perseo. Solo nello specchio i colpi la feriscono.',
    'Do not look at her: her stare turns you to stone. Hold the action to raise the MIRROR: you see behind you, reversed, like Perseus. Only in the mirror do your shots wound her.'),
  ruleShort: T('tieni premuto SPECCHIO e spara al riflesso', 'hold MIRROR and shoot the reflection'),
  goal: T('Uccidi Medusa colpendola nello specchio.', 'Kill Medusa by shooting her in the mirror.'),
  paint: '#3a5a1a',
  accent: '#9ab040',
  fx: { mono: 0.15, tint: [1.0, 0.94, 0.8], contrast: 1.35, grain: 0.55, scratches: 0.25, dust: 0.4, vignette: 0.9, flicker: 0.15 },
  player: { hp: 100, speed: 5.2 },
  discovery: {
    title: T('Lo specchio di Caravaggio', 'Caravaggio’s mirror'),
    text: T(
      'Si dice che quella faccia sia la sua: Caravaggio avrebbe dipinto Medusa guardandosi allo specchio, lo stesso trucco con cui l’hai vinta. La dipinse su uno scudo di legno convesso, un regalo per i Medici. Pochi anni dopo uccise un uomo a Roma e passò il resto della vita in fuga, con una taglia sulla testa.',
      'They say that face is his own: Caravaggio is thought to have painted Medusa looking at himself in a mirror, the very trick you beat her with. He painted it on a convex wooden shield, a gift for the Medici. A few years later he killed a man in Rome and spent the rest of his life on the run, with a price on his head.'),
  },
  deathLine: T('Ora sei anche tu una statua nello scudo.', 'Now you too are a statue on the shield.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const C = ctx.CELL ?? 2;
    const [headImg, snakeImg, stoneImg] = await Promise.all([
      ctx.art.load('/museo/opere/05-caravaggio-testa.webp'),
      ctx.art.load('/museo/opere/05-caravaggio-serpente.webp'),
      ctx.art.load('/museo/opere/05-caravaggio-pietra.webp'),
    ]);

    // walls: the gilded grotesque border of the shield; ceiling: the green ground, almost black
    const lift = (rect, k, size = 256) => {
      const src = ctx.art.crop(rect, size);
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); g.filter = `brightness(${k}) contrast(1.1)`;
      g.drawImage(src, 0, 0, size, size);
      return ctx.art.tex(c, { repeat: true });
    };
    const wall = lift([0.36, 0.93, 0.2, 0.045], 1.6);
    const ceil = ctx.art.wall([0.12, 0.42, 0.1, 0.1], { dark: 0.85 });
    ctx.map.build({
      grid: circleGrid(),
      textures: { wall, floor: ceil, ceil, painting: ctx.art.texture },
      height: 5,
    });
    const mid = ctx.map.toWorld(7, 7);
    const RADIUS = (R + 0.4) * C;

    // the painting lies on the floor: you walk on the shield
    {
      const geo = new THREE.CircleGeometry(RADIUS, 96);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + (uv.getX(i) - 0.5) * 0.985, 0.508 + (uv.getY(i) - 0.5) * 0.962);
      const mat = new THREE.MeshStandardMaterial({ map: ctx.art.texture, roughness: 0.7, metalness: 0.05, color: 0xc0b498 });
      const disc = new THREE.Mesh(geo, mat);
      disc.rotation.x = -Math.PI / 2; disc.position.set(mid.x, 0.015, mid.z);
      ctx.add(disc);
    }
    // Caravaggio's light: one high window on the upper left, a hard blade through the dark
    {
      const beam = new THREE.SpotLight(0xffe8c0, 110, 46, 0.36, 0.45, 1.1);
      beam.position.set(mid.x - 11, 15, mid.z - 9);
      beam.target.position.set(mid.x + 1, 0, mid.z + 1);
      ctx.add(beam); ctx.add(beam.target);
      ctx.data = { beam };
    }
    ctx.light({ ambient: 0.24, color: 0xd0c0a0, ground: 0x0a0804, lantern: { angle: 0.5, range: 16, intensity: 48, penumbra: 0.5 }, fog: { color: 0x020201, near: 4, far: 30 } });
    ctx.collider(mid.x, mid.z, 2.2);
    // you come in with your back to her: turning round is your first choice
    { const st = ctx.map.find('start')[0]; ctx.player.place(st.x, st.z, Math.PI / 2); }

    // ---------- monsters, all cut from the canvas ----------
    const snake = {
      name: T('Serpe dei capelli', 'Hair serpent'),
      sprite: snakeImg, height: 1.15, hp: 1, speed: 3.1, dmg: 6, reach: 1.1, radius: 0.3,
      behavior: 'crawl', twitch: 0.9, rot: 0.25, tear: 0.2, breathe: 0.4, blood: 0x2a3018, selfLit: 0.18,
    };
    const stoneHead = {
      name: T('Il pietrificato', 'The petrified'),
      sprite: stoneImg, height: 0.95, lift: 1.1, hp: 4, speed: 1.9, dmg: 14, radius: 0.45,
      behavior: 'statue', twitch: 0.15, rot: 0.6, tear: 0, breathe: 0.2, blood: 0x6a6a66, selfLit: 0.12,
      parts: [{ type: 'eyes', at: [[-0.17, 0.6], [0.2, 0.58]], size: 0.035, color: 0x101010 }],
    };
    const medusa = {
      name: T('Medusa', 'Medusa'),
      sprite: headImg, height: 4.4, lift: 0.9, hp: 48, speed: 0, dmg: 20, reach: 3.2, radius: 1.8,
      boss: true, fixed: false, twitch: 0.25, rot: 0.08, tear: 0.3, breathe: 1.4, selfLit: 0.95, glow: 0, blood: 0x7a0606,
      // the open mouth and the eyes are where it hurts
      zones: [{ name: 'bocca', x: [-0.12, 0.06], y: [0.38, 0.5], mul: 2.5 }, { name: 'occhi', x: [-0.2, 0.18], y: [0.58, 0.66], mul: 2 }],
      behavior(m, c, dt) {
        const s = m.state;
        s.cd = (s.cd ?? 2.5) - dt * c.D.rate;
        if (s.cd <= 0 && !c.data.dead) {
          s.cd = 2.6 - (s.phase || 0) * 0.5;
          // she spits the blood of her neck at you
          c.shoot(m, { speed: 8.5, dmg: 10, color: 0x900a08, size: 0.2 });
          if ((s.phase || 0) >= 2) c.after(0.25, () => !m.dead && c.shoot(m, { speed: 9, dmg: 8, color: 0x900a08, size: 0.16 }));
        }
        c.monsters.melee(m, dt);
      },
      onHit(m, shot, c) {
        if (!c.view.mirror) {
          // stone does not bleed: without the mirror the bullet just cracks off her
          c.data.stone = Math.min(1, c.data.stone + 0.08);
          if (c.time - (c.data.warned || -9) > 2.5) { c.data.warned = c.time; c.hud.whisper(T('non così. nello specchio.', 'not like this. in the mirror.')); }
          return 0;
        }
        return shot.dmg;
      },
      onDeath(m, c) {
        c.data.dead = true;
        c.data.wave?.stop();
        for (const x of c.monsters.list.slice()) if (x !== m) c.monsters.kill(x);
        c.audio.scream(0.5, 0.5);
        c.after(1.6, () => c.win());
      },
    };
    ctx.data.defs = { snake, stoneHead };
    ctx.data.boss = ctx.spawn(medusa, mid, { instant: true });
    ctx.data.stone = 0;
    ctx.data.eyes = { next: 7, open: 0, warn: 0 };
    ctx.data.dead = false;

    // the hair keeps falling: snakes crawl out of the rim from the first second
    ctx.data.wave = ctx.spawner({ kinds: [{ def: snake, w: 5 }, { def: stoneHead, w: 1 }], first: 4, every: 1.5, burst: 1, max: 8 });

    // blood keeps dripping from the cut neck onto the shield
    ctx.map.setZone(7, 8, 'blood'); ctx.map.setZone(6, 8, 'blood'); ctx.map.setZone(8, 8, 'blood');
    ctx.particles.emitter({ area: [mid.x - 0.5, mid.z + 0.2, mid.x + 0.5, mid.z + 0.6], rate: 26, color: 0x7a0606, fall: 3.5, life: 1.2, y: 2.1 });

    ctx.action({ label: T('SPECCHIO', 'MIRROR') });
    ctx.hud.bar('stone', { label: T('pietra', 'stone'), value: 0, color: '#b8b4a8' });
    ctx.hud.goal(T('vita di Medusa', 'Medusa’s life'), '100%');
    ctx.pickup(ctx.map.toWorld(2, 7), { kind: 'heal', amount: 35 });
    ctx.pickup(ctx.map.toWorld(12, 7), { kind: 'heal', amount: 35 });
    ctx.after(1.2, () => ctx.hud.say(T('Non guardarla. Usa lo specchio.', 'Do not look at her. Use the mirror.'), 2600));
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player, boss = d.boss;
    if (!boss || d.dead) { ctx.view.mirror = false; ctx.fx.stone = Math.max(0, (ctx.fx.stone || 0) - dt); return; }

    // the mirror shield
    const mirror = !!ctx.input.alt;
    if (mirror !== ctx.view.mirror) { ctx.view.mirror = mirror; ctx.audio.tone(mirror ? 880 : 660, 0.12, 'sine', 0.05, mirror ? 1.5 : 0.7); }

    // phases: as she weakens her eyes open more often and the hair falls faster
    const k = boss.hp / boss.maxHp;
    const phase = k < 0.33 ? 2 : k < 0.66 ? 1 : 0;
    if (phase !== (boss.state.phase || 0)) {
      boss.state.phase = phase;
      ctx.audio.scream(0.45, 0.45);
      ctx.hud.say(phase === 1 ? T('Le cadono i capelli.', 'Her hair is falling.') : T('Ti ha visto.', 'She has seen you.'), 2200);
      const mid = boss.pos;
      for (let i = 0; i < 4 + phase * 2; i++) { const a = (i / (4 + phase * 2)) * Math.PI * 2; ctx.spawn(d.defs.snake, { x: mid.x + Math.cos(a) * 3, z: mid.z + Math.sin(a) * 3 }); }
      d.wave.cfg.every = 1.5 - phase * 0.35; d.wave.cfg.max = 8 + phase * 3;
      // the window light swings round, the shadows move with it
      const a = phase * 2.2;
      d.beam.position.set(mid.x - 11 * Math.cos(a), 15, mid.z - 9 * Math.sin(a) - 2);
    }

    // her eyes: every few seconds she opens them wide. Looking then is instant stone.
    const e = d.eyes;
    e.next -= dt;
    if (e.next <= 1 && !e.warn) { e.warn = 1; ctx.audio.burst(0.9, 140, 3, 0.25, 'lowpass', 60); ctx.hud.whisper(T('apre gli occhi…', 'her eyes open…')); }
    if (e.next <= 0 && e.open <= 0) { e.open = 1.6; e.warn = 0; e.next = [7, 5, 3.6][phase] + Math.random() * 1.5; ctx.audio.scream(0.7, 0.3); }
    e.open = Math.max(0, e.open - dt);
    boss.def.glow = e.open > 0 ? 0.6 : 0;
    boss.def.twitch = e.open > 0 ? 1 : 0.25;

    // the stare: only if you look straight at her, without the mirror
    const head = { x: boss.pos.x, y: boss.lift + boss.view.height * 0.58 - 1, z: boss.pos.z };
    const looking = !mirror && p.isLookingAt(head, e.open > 0 ? 0.8 : 0.9) && p.sees(boss.pos);
    const rate = e.open > 0 ? 2.6 : 0.42;
    d.stone = Math.max(0, Math.min(1, d.stone + (looking ? rate * dt : -0.28 * dt)));
    if (d.stone >= 1) {
      p.hurt(40, boss);
      d.stone = 0.55;
      ctx.audio.burst(0.6, 400, 1, 0.35, 'lowpass', 90);
      ctx.hud.say(T('Pietra.', 'Stone.'), 1400);
    }
    ctx.fx.stone = d.stone;
    ctx.fx.mono = 0.15 + d.stone * 0.8;
    p.speedMul = (1 - d.stone * 0.7) * (mirror ? 0.7 : 1);
    p.lookMul = 1 - d.stone * 0.55;
    ctx.hud.bar('stone', { value: d.stone });
    ctx.hud.goal(T('vita di Medusa', 'Medusa’s life'), `${Math.ceil(k * 100)}%`);
    if (looking && Math.random() < dt * 0.6) ctx.audio.heart();
  },

  onHurt(ctx, dmg) { return dmg; },

  teardown(ctx) { ctx.view.mirror = false; },
};
