// LEVEL 13 · Hieronymus Bosch, The Garden of Earthly Delights, the Hell wing.
// Map: the burning city at the top, the frozen lake with the Tree-man in the middle, the orchestra
// of giant instruments at the bottom, with the Prince of Hell on his throne.
// Rule: Bosch's hell is a hell of music. A drum beats all the time: shots fired on the beat do
// triple damage, shots off the beat a third. Monsters lurch forward only on the beat.
// Discovery: the damned with a musical score painted on his buttocks. Play it (8 shots on the
// beat) and the Prince, who feels nothing, starts to feel.

const T = (it, en) => ({ it, en });
const SPR = (n) => `/museo/mostri/13-${n}.png`;

// a melody in D dorian, played one note per beat once the score is "read"
const MELODY = [0, 3, 5, 7, 5, 3, 2, 0, 7, 8, 7, 5, 3, 5, 2, 0];
const ROOT = 146.8;
const note = (i) => ROOT * Math.pow(2, MELODY[i % MELODY.length] / 12);

export default {
  id: 'bosch',
  artist: 'Hieronymus Bosch',
  year: '1490–1510',
  title: T('Il Giardino delle delizie · Inferno', 'The Garden of Earthly Delights · Hell'),
  museum: T('Museo del Prado, Madrid', 'Museo del Prado, Madrid'),
  image: '/museo/opere/13-bosch-inferno.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T('L’ala destra del trittico. Una città brucia, un lago è gelato, e laggiù un’orchestra di strumenti grandi come case suona per i dannati. Non smette mai.', 'The right wing of the triptych. A city burns, a lake is frozen, and down there an orchestra of instruments as big as houses plays for the damned. It never stops.'),
  rule: T('Qui tutto va a tempo. Spara sul colpo di tamburo: il colpo fa il triplo. Fuori tempo fa un terzo. I mostri avanzano solo sul battito.', 'Everything here keeps time. Shoot on the drumbeat: the shot does triple damage. Off the beat it does a third. Monsters lurch forward only on the beat.'),
  ruleShort: T('spara sul colpo di tamburo', 'shoot on the drumbeat'),
  goal: T('Scendi all’orchestra e abbatti il Principe dell’Inferno.', 'Go down to the orchestra and bring down the Prince of Hell.'),
  paint: '#c84a14',
  accent: '#ff7a2a',
  fx: { mono: 0.35, tint: [1.0, 0.82, 0.62], keepRed: 0.9, contrast: 0.7, exposure: 1.15, grain: 0.55, scratches: 0.4, dust: 0.6, flicker: 0.25, vignette: 0.75 },
  discovery: {
    title: T('La canzone scritta su un sedere', 'The song written on a backside'),
    text: T('Sotto il liuto c’è un dannato con una partitura dipinta sulle natiche. Nel 2014 una studentessa americana, Amelia Hamrick, la trascrisse in note moderne e la fece suonare: una melodia di cinquecento anni fa, uscita dall’inferno di Bosch. E l’Uomo-albero che ti guardava dal lago? Molti studiosi pensano che quel volto sia un autoritratto del pittore.', 'Under the lute lies a damned man with a score painted on his buttocks. In 2014 an American student, Amelia Hamrick, transcribed it into modern notes and had it played: a five-hundred-year-old tune out of Bosch’s hell. And the Tree-man watching you from the lake? Many scholars think that face is the painter’s self-portrait.'),
  },
  deathLine: T('Sei andato fuori tempo.', 'You fell out of time.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const img = await Promise.all(['ears', 'hare', 'pignun', 'knightfish', 'prince', 'treeman', 'harp', 'hurdy', 'scoreman'].map((n) => ctx.art.load(SPR(n))));
    const [ears, hare, pignun, knight, prince, treeman, harp, hurdy, scoreman] = img;

    const wall = ctx.art.wall([0.0, 0.06, 1, 0.12], { dark: 0.25 });
    const floor = ctx.art.wall([0.2, 0.83, 0.5, 0.08], { dark: 0.35 });
    const gate = ctx.art.wall([0.3, 0.4, 0.35, 0.12], { dark: 0.15 });

    ctx.map.build({
      grid: [
        '##########################',
        '#P...#....#....M#.....#..#',
        '#.##.#.##.#.##..#.###.#..#',
        '#.#..M.#....#.......#...M#',
        '#.#.####.####.####.##.####',
        '#...#M.....#....M#......M#',
        '##.##.###.##.##.##.####..#',
        '#....#...........#.......#',
        '#.##...##.#####.#..###.#.#',
        '#M...#....#..M#....#..M..#',
        '###.######.###.######.####',
        '#~~~~~~~~~~~~~~~~~~~~~~~~#',
        '#~~~~M~~~~~~~~~~~~~~~M~~~#',
        '#~~~~~~~~~~~~~~~~~~~~~~~~#',
        '#~~~~~~~~~~~~~~~~~~~~~~~~#',
        '#~~M~~~~~~~~~~~~~~~~~~M~~#',
        '#~~~~~~~~~~~W~~~~~~~~~~~~#',
        '#~~~~~~~~~~~~~~~~~~~~~~~~#',
        '#~~~~~~~~~~~~~~~~~~~~~~~~#',
        '#~~M~~~~~~~~~~~~~~~~~~M~~#',
        '#~~~~~~~~~~~~~~~~~~~~~~~~#',
        '#~~~~~~~~~~~~~~~~~~~~~~~~#',
        '##########GGGGG###########',
        '#.....N...........N......#',
        '#..h.......M.........u...#',
        '#........................#',
        '#.M......d........M......#',
        '#..............h.........#',
        '#....u...................#',
        '#..........S.......M.....#',
        '#.M......................#',
        '#...........T............#',
        '############Q#############',
      ],
      legend: {
        '~': { zone: 'ice' },
        W: { zone: 'ice', treeman: true },
        G: { solid: true, tex: 'gate', gate: true },
        h: { harp: true }, u: { hurdy: true }, d: { drum: true },
        S: { score: true }, T: { throne: true }, N: { fire: true },
      },
      textures: { wall, floor, ceil: wall, gate, painting: ctx.art.texture },
      height: 4.2,
      ceiling: false,
    });
    ctx.light({ ambient: 1.1, color: 0xffa070, ground: 0x3a1408, lantern: { angle: 0.65, range: 24, intensity: 60, color: 0xffd8b0 }, fog: { color: 0x2a0c06, density: 0.028 }, sky: 0x1a0804 });

    const C = ctx.CELL;
    const lake = { x0: 1 * C, z0: 11 * C, x1: 25 * C, z1: 22 * C };
    // the frozen lake: a dark, shiny skin of the painting over the ice cells
    const iceTex = ctx.art.tex(ctx.art.crop([0.12, 0.6, 0.6, 0.05], 512), { repeat: true });
    iceTex.repeat.set(4, 2);
    const ice = new THREE.Mesh(new THREE.PlaneGeometry(lake.x1 - lake.x0, lake.z1 - lake.z0), new THREE.MeshStandardMaterial({ map: iceTex, color: 0x8aa0b8, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.92 }));
    ice.rotation.x = -Math.PI / 2; ice.position.set((lake.x0 + lake.x1) / 2, 0.02, (lake.z0 + lake.z1) / 2);
    ctx.add(ice);

    // the burning city of the painting all around, as a far backdrop
    const skyTex = ctx.art.tex(ctx.art.crop([0, 0, 1, 0.2], 1024), { repeat: true });
    skyTex.repeat.set(5, 1);
    const sky = new THREE.Mesh(new THREE.CylinderGeometry(90, 90, 70, 32, 1, true), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
    sky.position.set(26, 22, 33); ctx.add(sky);

    // billboards cut from the painting (they turn around their vertical axis to face you)
    const boards = [];
    const board = (image, pos, h, r, o = {}) => {
      const tex = ctx.art.tex(image);
      const w = h * (image.width / image.height);
      const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(pos.x, h / 2 + (o.lift || 0), pos.z);
      ctx.add(mesh);
      if (r) ctx.collider(pos.x, pos.z, r);
      const b = { mesh, base: mesh.position.y, ...o };
      boards.push(b);
      return b;
    };
    for (const p of ctx.map.find('harp')) board(harp, p, 7.5, 1.4);
    for (const p of ctx.map.find('hurdy')) board(hurdy, p, 7, 1.1);
    const tm = ctx.map.find('treeman')[0];
    const treeB = board(treeman, tm, 8.5, 0, { lift: 0, tree: true });
    ctx.collider(tm.x, tm.z, 2.2);
    // the blue drum, which pulses with every beat
    const drumP = ctx.map.find('drum')[0];
    const drum = new THREE.Group();
    const skin = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.6, 20), [new THREE.MeshStandardMaterial({ color: 0x3a5a9a, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 })]);
    skin.rotation.z = Math.PI / 2; drum.add(skin);
    drum.position.set(drumP.x, 1.3, drumP.z); ctx.add(drum);
    ctx.collider(drumP.x, drumP.z, 1.5);

    // fires: flickering lights in the city and in the orchestra
    const fires = [];
    const firePts = [ctx.map.toWorld(6, 3), ctx.map.toWorld(14, 7), ctx.map.toWorld(22, 5), ctx.map.toWorld(3, 9), ...ctx.map.find('fire')];
    for (const p of firePts) {
      const l = new THREE.PointLight(0xff5a14, 14, 14, 1.6); l.position.set(p.x, 2.2, p.z); ctx.add(l); fires.push(l);
    }
    ctx.particles.emitter({ area: [0, 0, 26 * C, 11 * C], rate: 30, color: 0xff6a1a, fall: -0.9, y: 0.3, wind: [0.4, 0.1], life: 4 });
    ctx.particles.emitter({ area: [0, 23 * C, 26 * C, 32 * C], rate: 12, color: 0xff8a3a, fall: -0.7, y: 0.3, wind: [0.2, 0], life: 4 });

    // ---------- monsters, all cut from the panel ----------
    const D = ctx.data = {
      bpm: 84, phase: 0, beatN: 0, pulse: 0, kick: 0, onBeat: false, notes: 0, unlocked: false, gateOpen: false,
      prince: null, boards, treeB, drum, fires, faceSeen: false, scoreHint: 0, deafHint: 0, streak: 0,
    };
    // monsters lurch on the beat: fast just after the drum, almost still in between
    const onBeat = (base) => (m, c, dt) => {
      const k = (D.pulse < 0.32 ? 2.5 : 0.3) * (m.data.fast > 0 ? 1.6 : 1);
      if (m.data.fast > 0) m.data.fast -= dt;
      base(m, c, dt * k);
    };
    const B = ctx.BEHAVIORS;
    const defs = {};
    defs.ears = {
      name: T('Orecchie col coltello', 'Ears with a knife'),
      sprite: ears, height: 1.5, hp: 2.2, speed: 2.6, dmg: 6, reach: 1.4, radius: 0.6,
      behavior: onBeat(B.charge),
      update(m) { m.view.sprite.rotation.z = m.state.mode === 'dash' ? Math.sin(m.seed + performance.now() / 90) * 0.5 : Math.sin(performance.now() / 400 + m.seed) * 0.08; },
      twitch: 0.6, rot: 0.3, blood: 0x8a1a10,
    };
    defs.hare = {
      name: T('La lepre cacciatrice', 'The hunting hare'),
      sprite: hare, height: 1.7, hp: 1.6, speed: 3.2, dmg: 5, behavior: onBeat(B.crawl),
      // its horn calls the pack: the monsters around it run faster for a while
      update(m, c, dt) {
        m.data.horn = (m.data.horn ?? 3 + Math.random() * 3) - dt;
        if (m.data.horn <= 0) {
          m.data.horn = 6;
          c.audio.tone(330, 0.6, 'sawtooth', 0.05, 220);
          for (const o of c.monsters.list) if (!o.dying && o.pos.distanceTo(m.pos) < 9) o.data.fast = 3;
        }
      },
      parts: [{ type: 'eyes', at: [[0.18, 0.72]], size: 0.04 }],
      twitch: 0.8, blood: 0x6a0a08,
    };
    defs.pig = {
      name: T('Il maiale vestito da suora', 'The pig dressed as a nun'),
      sprite: pignun, height: 2.1, hp: 3.5, speed: 1.9, dmg: 5, reach: 1.5, radius: 0.55,
      behavior: onBeat(B.chase), attackEvery: 1.6,
      // the embrace: it holds you still for a moment
      onAttack(m, c) {
        c.player.frozen = true; c.player.aimShake = 1;
        c.hud.whisper(T('ti abbraccia. firma qui.', 'it hugs you. sign here.'));
        c.after(0.8, () => { c.player.frozen = false; c.player.aimShake = 0; });
      },
      breathe: 1.4, rot: 0.4, blood: 0x9a3a2a,
    };
    defs.knight = {
      name: T('Il cavaliere-pentola', 'The cauldron knight'),
      sprite: knight, height: 1.5, hp: 2.5, speed: 2.2, dmg: 7, radius: 0.55,
      behavior: onBeat(B.chase),
      // armour: only a shot on the beat goes through
      onHit(m, shot, c) {
        if (shot.onBeat) return shot.dmg;
        c.particles.burst(shot.point, 10, 0xffe0a0, 3, 0.3);
        c.audio.tone(1900, 0.08, 'square', 0.05);
        if (D.deafHint++ % 4 === 0) c.hud.whisper(T('corazza. solo a tempo.', 'armour. only on the beat.'));
        return 0;
      },
      twitch: 0.3, rot: 0.2, blood: 0x2a2a2a,
    };
    defs.score = {
      name: T('Il dannato con la partitura', 'The damned with the score'),
      sprite: scoreman, height: 0.75, hp: 9999, speed: 0, dmg: 0, reach: 0, radius: 0.5,
      behavior: 'still', counts: false, fixed: true, twitch: 0.2, rot: 0.1, selfLit: 0.5, glow: 0.5,
      onHit(m, shot, c) {
        if (D.unlocked) return 0;
        if (!shot.onBeat) { c.audio.tone(note(D.notes) * 0.94, 0.25, 'sawtooth', 0.05); c.hud.whisper(T('stonato. a tempo.', 'out of tune. on the beat.')); return 0; }
        c.audio.tone(note(D.notes), 0.6, 'sawtooth', 0.09); c.audio.tone(note(D.notes) * 2, 0.4, 'sine', 0.05);
        D.notes++;
        c.hud.bar('score', { value: D.notes / 8 });
        if (D.notes >= 8) unlock(c);
        return 0;
      },
    };
    defs.prince = {
      name: T('Il Principe dell’Inferno', 'The Prince of Hell'),
      sprite: prince, height: 4.6, hp: 34, speed: 0, dmg: 10, reach: 2.4, radius: 1.3, boss: true, fixed: false,
      behavior: 'still',
      zones: [{ name: 'testa', x: [-0.4, 0.25], y: [0.68, 0.98], mul: 2 }],
      onHit(m, shot, c) {
        if (!D.unlocked) {
          c.particles.burst(shot.point, 8, 0x6a8ac8, 2, 0.4);
          if (D.scoreHint++ % 3 === 0) c.hud.say(T('Non sente niente. Cerca la musica, sotto il liuto.', 'He feels nothing. Find the music, under the lute.'), 2400);
          return 0;
        }
        return shot.dmg;
      },
      parts: [{ type: 'eyes', at: [[-0.08, 0.86]], size: 0.09 }],
      twitch: 0.2, rot: 0.25, breathe: 0.6, selfLit: 0.2, blood: 0x3a5a9a,
    };

    const city = (c) => {
      const pp = c.player.pos;
      const pts = c.map.find('spawn').filter((p) => p.distanceTo(pp) > 7 && p.distanceTo(pp) < 26 && (D.gateOpen || p.cy < 22));
      return pts[Math.floor(Math.random() * pts.length)] || null;
    };
    D.waves = ctx.spawner({ kinds: [{ def: defs.ears, w: 3 }, { def: defs.hare, w: 3 }, { def: defs.knight, w: 2 }, { def: defs.pig, w: 1 }], first: 4, every: 1.5, burst: 2, max: 9, where: city });

    // the score man lies under the lute, near the throne; the Prince waits behind the gate
    const sp = ctx.map.find('score')[0];
    D.scoreMan = ctx.spawn(defs.score, sp, { instant: true });
    const scoreLight = new THREE.PointLight(0xffe0a0, 5, 5, 2); scoreLight.position.set(sp.x, 1, sp.z); ctx.add(scoreLight);
    D.defs = defs;

    ctx.pickup(ctx.map.toWorld(4, 13), { kind: 'heal', amount: 35 });
    ctx.pickup(ctx.map.toWorld(21, 20), { kind: 'heal', amount: 35 });
    ctx.pickup(ctx.map.toWorld(23, 30), { kind: 'heal', amount: 45 });

    ctx.hud.bar('beat', { label: T('tamburo', 'drum'), value: 1, color: '#ff7a2a' });
    ctx.hud.goal(T('dannati prima della porta', 'damned before the gate'), 16);
    ctx.after(1.2, () => ctx.hud.say(T('Senti il tamburo? Spara sul colpo.', 'Hear the drum? Shoot on the beat.'), 3000));
    ctx.audio.muffle(0);

    function unlock(c) {
      D.unlocked = true;
      c.hud.remove('score');
      c.audio.toll(73.4);
      c.hud.say(T('La musica del sedere suona per tutto l’inferno. Il Principe ora sente.', 'The backside music plays through all of hell. The Prince can feel now.'), 3600);
      if (D.scoreMan) { c.particles.burst({ x: D.scoreMan.pos.x, y: 0.6, z: D.scoreMan.pos.z }, 40, 0xffe0a0, 3); }
    }
  },

  update(ctx, dt) {
    const D = ctx.data;
    // the tempo rises as you kill
    D.bpm = Math.min(132, 84 + ctx.kills * 1.4 + (D.unlocked ? 8 : 0));
    const prev = Math.floor(D.phase);
    D.phase += dt * D.bpm / 60;
    D.pulse = D.phase - Math.floor(D.phase);
    if (Math.floor(D.phase) !== prev) beat(ctx, D);
    D.kick = Math.max(0, D.kick - dt * 5);
    ctx.hud.bar('beat', { value: 1 - D.pulse });
    ctx.fx.exposure = 1.1 + D.kick * 0.45;
    ctx.fx.vignette = 0.75 - D.kick * 0.25;
    D.drum.scale.setScalar(1 + D.kick * 0.08);
    for (const [i, l] of D.fires.entries()) l.intensity = 10 + Math.sin(ctx.time * 9 + i * 2) * 3 + Math.random() * 4 + D.kick * 6;

    // billboards turn to face you
    const p = ctx.player.pos;
    for (const b of D.boards) {
      b.mesh.rotation.y = Math.atan2(p.x - b.mesh.position.x, p.z - b.mesh.position.z);
      if (b.tree) b.mesh.position.y = b.base + Math.sin(ctx.time * 0.7) * 0.08;
    }
    // the Tree-man's face looks back at you
    if (!D.faceSeen && D.treeB.mesh.position.distanceTo(ctx.player.head) < 11 && ctx.player.isLookingAt(D.treeB.mesh.position, 0.92)) {
      D.faceSeen = true;
      ctx.hud.whisper(T('quel volto ti segue. è lui che ha dipinto tutto questo.', 'that face follows you. he is the one who painted all this.'));
    }

    // the gate to the orchestra
    if (!D.gateOpen) {
      ctx.hud.goal(T('dannati prima della porta', 'damned before the gate'), Math.max(0, 16 - ctx.kills));
      if (ctx.kills >= 16) openGate(ctx, D);
    } else if (D.prince && !D.prince.dead) {
      ctx.hud.goal(T('il Principe', 'the Prince'), D.unlocked ? T('sente', 'feels') : T('non sente', 'feels nothing'));
    }

    // the Prince swallows the damned near him to heal, and spits them at you on the beat
    const pr = D.prince;
    if (pr && !pr.dead) {
      pr.state.swallow = (pr.state.swallow ?? 5) - dt;
      if (pr.state.swallow <= 0) {
        pr.state.swallow = 6;
        let best = null, bd = 8;
        for (const m of ctx.monsters.list) { if (m === pr || m.dying || !m.counts) continue; const d = m.pos.distanceTo(pr.pos); if (d < bd) { bd = d; best = m; } }
        if (best) {
          ctx.particles.burst({ x: best.pos.x, y: 1, z: best.pos.z }, 24, 0x8a1a10, 3);
          ctx.monsters.remove(best);
          pr.hp = Math.min(pr.maxHp, pr.hp + pr.maxHp * 0.08);
          ctx.audio.growl(0.5, 0.3);
          ctx.hud.whisper(T('il Principe ingoia un dannato e guarisce', 'the Prince swallows a damned and heals'));
        }
      }
    }
  },

  onShot(ctx, shot) {
    const D = ctx.data;
    const sec = 60 / D.bpm;
    const off = Math.min(D.pulse, 1 - D.pulse) * sec; // seconds from the nearest beat
    shot.onBeat = off < 0.13;
    if (shot.onBeat) {
      shot.dmg *= 3;
      D.streak++;
      ctx.audio.tone(note(D.beatN) * 4, 0.12, 'sine', 0.05);
      if (shot.monster && D.streak % 5 === 0) ctx.hud.whisper(T('a tempo', 'on the beat'));
    } else {
      shot.dmg *= 0.34;
      D.streak = 0;
    }
  },

  onKill(ctx, m) {
    if (m === ctx.data.prince) {
      ctx.data.waves.stop();
      ctx.audio.toll(55);
      ctx.hud.say(T('L’orchestra tace.', 'The orchestra falls silent.'), 2400);
      ctx.after(1.6, () => ctx.win());
    }
  },

  onHurt(ctx, dmg) { return dmg; },

  teardown(ctx) { ctx.player.frozen = false; },
};

function beat(ctx, D) {
  D.beatN++;
  D.kick = 1;
  const strong = D.beatN % 4 === 0;
  // the drum, and a hurdy-gurdy drone note every bar (the whole tune once the score is read)
  ctx.audio.tone(strong ? 58 : 64, 0.22, 'sine', strong ? 0.5 : 0.35, 38);
  ctx.audio.burst(0.08, 900, 1, 0.12, 'lowpass', 200);
  if (D.unlocked) ctx.audio.tone(note(D.beatN), 0.5, 'sawtooth', 0.045);
  else if (strong) ctx.audio.tone(ROOT / 2, 1.6, 'sawtooth', 0.035);
  ctx.view.shake = Math.max(ctx.view.shake || 0, strong ? 0.12 : 0.05);
  // the Prince spits a damned at you on every other beat
  const pr = D.prince;
  if (pr && !pr.dead && D.beatN % 2 === 0 && ctx.monsters.sees(pr) && pr.pos.distanceTo(ctx.player.pos) < 22) {
    ctx.shoot(pr, { speed: 8, dmg: 7, color: 0xd8b8a0, size: 0.28 });
  }
}

function openGate(ctx, D) {
  D.gateOpen = true;
  for (const g of ctx.map.find('gate')) ctx.map.setSolid(g.cx, g.cy, false);
  ctx.audio.toll(49);
  ctx.hud.say(T('La porta dell’orchestra si apre. Il Principe ti aspetta sul trono.', 'The orchestra gate opens. The Prince waits on his throne.'), 3200);
  const t = ctx.map.find('throne')[0];
  D.prince = ctx.spawn(D.defs.prince, t);
  D.waves.cfg.kinds = [{ def: D.defs.ears, w: 2 }, { def: D.defs.hare, w: 2 }, { def: D.defs.knight, w: 2 }, { def: D.defs.pig, w: 2 }];
  ctx.hud.bar('score', { label: T('partitura', 'score'), value: 0, color: '#ffe0a0' });
}
