// LEVEL 15 · Francis Bacon, Study after Velázquez's Portrait of Pope Innocent X (1953). The finale.
// Map: the cage. An arena closed by curtains of vertical brushstrokes, like the background of the
// painting; inside, the yellow frame that shuts the Pope in. The cage shrinks while you fight.
// Rule: look at the scream. The Pope screams at intervals. While he screams, looking at him smears
// your sight and burns your life; behind a curtain you are safe. But he can be hurt only in the
// mouth, and only while he screams. To win you must look into the scream.
// Three phases: seated on the throne, standing, then only the mouth.
// Discovery: an empty gilded frame behind the last curtain, the real Velázquez he never went to see.

const T = (it, en) => ({ it, en });

export default {
  id: 'bacon',
  artist: 'Francis Bacon',
  year: '1953',
  title: T('Studio dal ritratto di Innocenzo X di Velázquez', 'Study after Velázquez’s Portrait of Pope Innocent X'),
  museum: T('Des Moines Art Center, Iowa', 'Des Moines Art Center, Iowa'),
  image: '/museo/opere/15-bacon-innocenzo-x.jpg',
  credit: T('Immagine fornita per il gioco', 'Image provided for the game'),
  intro: T('L’ultima sala. Un Papa chiuso in una gabbia di linee gialle, dietro tende di pennellate che colano. Urla da settant’anni e nessuno ha mai sentito cosa.', 'The last hall. A Pope shut in a cage of yellow lines, behind curtains of dripping brushstrokes. He has been screaming for seventy years and no one has ever heard what.'),
  rule: T('Il Papa si ferisce solo nella bocca, e solo mentre urla. Ma se guardi l’urlo la vista ti si sbava e la vita brucia: dietro le tende sei al sicuro. La gabbia si stringe.', 'The Pope can be hurt only in the mouth, and only while he screams. But if you look at the scream your sight smears and your life burns: behind the curtains you are safe. The cage closes in.'),
  ruleShort: T('colpisci la bocca mentre urla', 'hit the mouth while he screams'),
  goal: T('Fai tacere il Papa. È l’ultimo quadro.', 'Silence the Pope. It is the last painting.'),
  paint: '#7a3aa8',
  accent: '#f0c020',
  fx: { mono: 0.15, tint: [1.0, 0.95, 0.88], keepRed: 0.5, contrast: 0.6, exposure: 1.2, grain: 0.4, scratches: 0.25, dust: 0.3, flicker: 0.2, weave: 0.2, smear: 0.45, vignette: 0.7 },
  discovery: {
    title: T('Il quadro che non volle vedere', 'The painting he would not see'),
    text: T('Bacon dipinse più di quaranta papi partendo dal ritratto di Innocenzo X di Velázquez, ma lo conosceva solo dalle fotografie. Nel 1954 fu a Roma, a pochi passi dalla Galleria Doria Pamphilj dove è appeso, e non entrò mai a vederlo. L’urlo invece lo prese da un film: la balia colpita all’occhio, con gli occhiali rotti, nella Corazzata Potëmkin di Ėjzenštejn.', 'Bacon painted more than forty popes from Velázquez’s portrait of Innocent X, but he knew it only from photographs. In 1954 he was in Rome, a short walk from the Galleria Doria Pamphilj where it hangs, and he never went in to see it. The scream he took from a film instead: the nurse shot in the eye, her glasses broken, in Eisenstein’s Battleship Potemkin.'),
  },
  deathLine: T('Hai guardato troppo a lungo.', 'You looked for too long.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const popeImg = await ctx.art.load('/museo/mostri/15-pope.png');

    const curtain = ctx.art.wall([0.72, 0.0, 0.26, 0.45], { dark: 0.05 });
    const curtain2 = ctx.art.wall([0.02, 0.05, 0.2, 0.4], { dark: 0.1 });
    const floor = ctx.art.wall([0.25, 0.84, 0.5, 0.16], { dark: 0.3 });

    ctx.map.build({
      grid: [
        '########################',
        '#..........C...........#',
        '#..C............C....F.#',
        '#.......C..............#',
        '#.C..........C.....C...#',
        '#......................#',
        '#.....C.........C......#',
        '#..........C...........#',
        '#..C...............C...#',
        '#.......C.....C........#',
        '#......................#',
        '#.C.........T.......C..#',
        '#......................#',
        '#.......C.....C........#',
        '#..C...............C...#',
        '#..........C...........#',
        '#.....C.........C......#',
        '#......................#',
        '#.C..........C.....C...#',
        '#.......C..............#',
        '#..C............C......#',
        '#..........P...........#',
        '#......................#',
        '########################',
      ],
      legend: { C: { solid: true, tex: 'curtain2', curtain: true }, T: { throne: true }, F: { frame: true } },
      textures: { wall: curtain, curtain2, floor, ceil: curtain },
      height: 6,
    });
    ctx.light({ ambient: 0.85, color: 0xf0e0c0, ground: 0x2a1a30, lantern: { angle: 0.7, range: 26, intensity: 70, color: 0xfff0d8 }, fog: { color: 0x0a0608, density: 0.035 }, sky: 0x0a0608 });

    const center = ctx.map.find('throne')[0];
    // the yellow cage: an outline of bars, scaled each frame as it closes in
    const yellow = new THREE.MeshBasicMaterial({ color: 0xf0c020, transparent: true, opacity: 0.85 });
    const cage = new THREE.Group();
    const bar = (x, y, z, sx, sy, sz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), yellow); b.position.set(x, y, z); cage.add(b); };
    // unit cube outline (half size 1), bars thin
    const t = 0.03;
    for (const y of [0.02, 5.2]) { bar(0, y, -1, 2, t * 4, t); bar(0, y, 1, 2, t * 4, t); bar(-1, y, 0, t, t * 4, 2); bar(1, y, 0, t, t * 4, 2); }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bar(x, 2.6, z, t, 5.2, t);
    // the floor lines that run towards the throne, as in the painting
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(t, 0.02, 1), yellow); b.position.set(Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.5); b.rotation.y = -a + Math.PI / 2; cage.add(b); }
    cage.position.set(center.x, 0, center.z);
    ctx.add(cage);
    // the throne cage, fixed, small, around the Pope
    const inner = cage.clone(); inner.scale.set(1.8, 0.75, 1.8); ctx.add(inner);

    // the empty gilded frame of the real Velázquez, hidden in a corner
    const fp = ctx.map.find('frame')[0];
    const gold = new THREE.MeshStandardMaterial({ color: 0xb08a30, roughness: 0.35, metalness: 0.8 });
    const frame = new THREE.Group();
    for (const [x, y, w, h] of [[0, 2.9, 1.9, 0.2], [0, 0.6, 1.9, 0.2], [-0.85, 1.75, 0.2, 2.5], [0.85, 1.75, 0.2, 2.5]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), gold); m.position.set(x, y, 0); frame.add(m); }
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshBasicMaterial({ color: 0x050304 })); hole.position.set(0, 1.75, -0.03); frame.add(hole);
    frame.position.set(fp.x, 0, fp.z); frame.rotation.y = Math.atan2(center.x - fp.x, center.z - fp.z);
    ctx.add(frame);

    // ---------- monsters ----------
    const smearSprite = ctx.art.cutout({ rect: [0.12, 0.28, 0.55, 0.3], rot: 0.5, feather: 6, seed: 3 });
    const robeSprite = ctx.art.cutout({ rect: [0.28, 0.5, 0.45, 0.4], key: { dark: 0.28 }, rot: 0.4, seed: 7 });
    const mouthSprite = ctx.art.cutout({ rect: [0.3, 0.11, 0.17, 0.22], rot: 0.2, feather: 4, seed: 11 });
    const glasses = pinceNez();

    const D = ctx.data = {
      center, cage, R: 17, Rmin: 6.5, phase: 1, pope: null, scream: 0, windup: 0, nextScream: 4, looked: 0,
      defs: {}, frameP: fp, frameSeen: false, end: 0, curtHint: 0,
    };
    const smear = {
      name: T('La sbavatura', 'The smear'),
      sprite: smearSprite, height: 2.1, hp: 1, speed: 2.6, dmg: 3, attackEvery: 1.1,
      // you see it clearly only when it stops
      behavior(m, c, dt) {
        m.state.t = (m.state.t ?? Math.random()) + dt;
        const go = (m.state.t % 1.6) < 0.9;
        if (go) c.BEHAVIORS.chase(m, c, dt * 1.6); else c.monsters.melee(m, dt);
        const u = m.view.mat.uniforms; if (u?.dissolve) u.dissolve.value += ((go ? 0.7 : 0) - u.dissolve.value) * Math.min(1, dt * 8);
      },
      twitch: 1, rot: 0.6, tear: 0.8, blood: 0x6a2a8a,
    };
    const robe = {
      name: T('Il drappo bianco', 'The white robe'),
      sprite: robeSprite, height: 2.3, hp: 1.5, speed: 1.8, dmg: 4, attackEvery: 1.2, behavior: 'charge',
      twitch: 0.5, rot: 0.4, breathe: 1, blood: 0xe8e0d0,
    };
    const lenses = {
      name: T('Gli occhiali rotti', 'The broken glasses'),
      sprite: glasses, height: 0.55, lift: 1.2, hp: 0.6, speed: 3.4, dmg: 2.5, attackEvery: 0.9, behavior: 'fly', radius: 0.25,
      twitch: 0.2, rot: 0, selfLit: 0.6, glow: 0.3, blood: 0xd0e0f0,
    };
    const popeDef = {
      name: T('Innocenzo X', 'Innocent X'),
      sprite: popeImg, height: 3.8, hp: 30, speed: 1.1, dmg: 8, reach: 2.4, radius: 1.1, boss: true, fixed: true, attackEvery: 1.4,
      zones: [{ name: 'bocca', x: [-0.14, 0.06], y: [0.74, 0.9], mul: 1.6 }],
      behavior(m, c, dt) { if (m.state.walk) c.BEHAVIORS.chase(m, c, dt); else c.monsters.melee(m, dt); },
      onHit: mouthOnly,
      parts: [{ type: 'teeth', at: [-0.04, 0.82], r: 0.07, n: 10 }],
      twitch: 0.25, rot: 0.15, breathe: 0.5, selfLit: 0.25,
    };
    const mouthDef = {
      name: T('La bocca', 'The mouth'),
      sprite: mouthSprite, height: 2.2, lift: 1.4, hp: 10, speed: 1.6, dmg: 6, reach: 1.8, radius: 0.8, boss: true, fixed: true,
      zones: [{ name: 'bocca', x: [-0.25, 0.25], y: [0.15, 0.65], mul: 1.6 }],
      behavior: 'fly', onHit: mouthOnly,
      parts: [{ type: 'teeth', at: [0, 0.42], r: 0.16, n: 16 }, { type: 'strands', n: 10, len: 1.4, at: [0, 0.4, 0], color: 0x3a1a4a }],
      twitch: 0.6, rot: 0.3, selfLit: 0.4, blood: 0x6a0a2a,
    };
    D.defs = { smear, robe, lenses, popeDef, mouthDef };
    D.pope = ctx.spawn(popeDef, center);

    const inCage = (c) => {
      const a = Math.random() * Math.PI * 2, r = Math.max(4, D.R - 1.5 - Math.random() * 3);
      const x = D.center.x + Math.cos(a) * r, z = D.center.z + Math.sin(a) * r;
      const cell = c.map.cellAt(x, z);
      if (cell?.solid || c.player.pos.distanceTo(new THREE.Vector3(x, 0, z)) < 6) return null;
      return new THREE.Vector3(x, 0, z);
    };
    D.waves = ctx.spawner({ kinds: [{ def: smear, w: 3 }, { def: lenses, w: 2 }, { def: robe, w: 1 }], first: 3, every: 3.2, burst: 1, max: 4, where: inCage });

    ctx.pickup(ctx.map.toWorld(3, 20), { kind: 'heal', amount: 30 });
    ctx.pickup(ctx.map.toWorld(20, 3), { kind: 'heal', amount: 30 });

    ctx.hud.bar('cage', { label: T('la gabbia', 'the cage'), value: 1, color: '#f0c020' });
    ctx.after(1.0, () => ctx.hud.say(T('Aspetta che urli. Poi guardalo in bocca.', 'Wait for him to scream. Then look him in the mouth.'), 3200));

    function mouthOnly(m, shot, c) {
      if (D.scream > 0 && shot.zone === 'bocca') return shot.dmg;
      c.particles.burst(shot.point, 6, 0x7a3aa8, 1.5, 0.4);
      if (D.curtHint++ % 5 === 0) c.hud.whisper(D.scream > 0 ? T('nella bocca', 'in the mouth') : T('il colore gli scivola addosso. aspetta l’urlo.', 'the paint slides off him. wait for the scream.'));
      return 0;
    }
  },

  update(ctx, dt) {
    const D = ctx.data;
    if (D.end) { D.end += dt; ctx.fx.exposure = Math.max(0, 1.2 - D.end * 0.6); ctx.fx.smear = 0.95; return; }
    const boss = D.pope && !D.pope.dead ? D.pope : null;
    const pp = ctx.player.pos;

    // the cage closes in
    D.R = Math.max(D.Rmin, D.R - dt * 0.07 * (D.phase === 3 ? 1.6 : 1));
    D.cage.scale.set(D.R, 1, D.R);
    ctx.hud.bar('cage', { value: (D.R - D.Rmin) / (17 - D.Rmin) });
    const dx = pp.x - D.center.x, dz = pp.z - D.center.z;
    // the cage is square: outside it the yellow lines burn
    if (Math.max(Math.abs(dx), Math.abs(dz)) > D.R) {
      ctx.player.hurt(14 * dt, null);
      ctx.fx.wobble = 0.5;
      if (!D.outHint) { D.outHint = true; ctx.hud.whisper(T('fuori dalla gabbia si brucia', 'outside the cage you burn')); }
    } else D.outHint = false;

    // the scream: wind-up, then two seconds that tear the sight of anyone who looks
    if (boss) {
      const every = D.phase === 1 ? 6.5 : D.phase === 2 ? 5 : 3.6;
      if (D.scream > 0) {
        D.scream -= dt;
        const looking = ctx.player.sees(boss.pos) && ctx.player.isLookingAt(new ctx.THREE.Vector3(boss.pos.x, boss.lift + boss.view.height * 0.6 - 1, boss.pos.z), 0.88);
        const inSight = ctx.player.sees(boss.pos);
        if (looking) { ctx.player.hurt(7 * dt, boss); D.looked = Math.min(1, D.looked + dt * 1.2); }
        else if (inSight) ctx.player.hurt(2 * dt, boss);
        boss.anger = 1;
        if (D.scream <= 0) { D.nextScream = every; boss.anger = 0; }
      } else if (D.windup > 0) {
        D.windup -= dt;
        ctx.view.shake = Math.max(ctx.view.shake || 0, 0.08);
        if (D.windup <= 0) {
          D.scream = D.phase === 3 ? 1.6 : 2.1;
          ctx.audio.scream(0.55, 0.4); ctx.audio.scream(0.9, 0.25);
          ctx.view.shake = 0.5;
        }
      } else {
        D.nextScream -= dt;
        if (D.nextScream <= 0) { D.windup = 1.1; ctx.audio.breath(0.3); ctx.hud.whisper(T('apre la bocca', 'he opens his mouth')); }
      }
    }
    D.looked = Math.max(0, D.looked - dt * 0.5);
    ctx.fx.smear = 0.45 + D.looked * 0.5;
    ctx.fx.wobble = Math.max(ctx.fx.wobble * 0.9, D.looked * 0.6 + (D.scream > 0 ? 0.15 : 0));
    ctx.fx.tint = D.scream > 0 ? [1.1, 0.85, 1.05] : [1.0, 0.95, 0.88];

    // phases
    if (boss && D.phase === 1 && boss.hp < boss.maxHp * 0.66) {
      D.phase = 2; boss.state.walk = true;
      ctx.hud.say(T('Si alza dal trono.', 'He rises from the throne.'), 2600);
      ctx.audio.toll(65);
      ctx.pickup(ctx.map.toWorld(3, 3), { kind: 'heal', amount: 35 });
      D.waves.cfg.every = 2.6;
    }
    if (boss && D.phase === 2 && boss.hp < boss.maxHp * 0.33) {
      // he falls apart: only the mouth is left, and it flies
      D.phase = 3;
      const at = boss.pos.clone();
      ctx.particles.burst({ x: at.x, y: 2, z: at.z }, 60, 0x7a3aa8, 4, 1.4);
      ctx.monsters.remove(boss);
      D.pope = ctx.spawn(D.defs.mouthDef, at);
      ctx.hud.say(T('Resta solo l’urlo.', 'Only the scream is left.'), 2600);
      ctx.pickup(ctx.map.toWorld(20, 20), { kind: 'heal', amount: 35 });
      D.nextScream = 2;
    }

    // the empty frame
    if (!D.frameSeen && pp.distanceTo(D.frameP) < 5 && ctx.player.isLookingAt(D.frameP, 0.85)) {
      D.frameSeen = true;
      ctx.hud.whisper(T('una cornice vuota. il ritratto vero è a Roma. lui non andò mai a vederlo.', 'an empty frame. the real portrait is in Rome. he never went to see it.'));
    }
  },

  onKill(ctx, m) {
    const D = ctx.data;
    if (D.phase === 3 && m === D.pope) {
      D.waves.stop();
      for (const o of ctx.monsters.list.slice()) if (o !== m) ctx.monsters.kill(o);
      D.end = 0.001;
      ctx.audio.toll(41);
      ctx.hud.say(T('Il Papa torna nella tela. Il museo si spegne.', 'The Pope goes back into the canvas. The museum goes dark.'), 3600);
      ctx.after(2.8, () => ctx.win());
    }
  },

  onHurt(ctx, dmg) { return dmg; },
};

// the pince-nez of the nurse in Battleship Potemkin: two cracked lenses on a thin bridge
function pinceNez() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  for (const x of [70, 186]) {
    const gr = g.createRadialGradient(x - 10, 54, 4, x, 64, 50);
    gr.addColorStop(0, 'rgba(230,240,255,0.55)'); gr.addColorStop(1, 'rgba(120,140,170,0.25)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, 64, 48, 44, 0, 0, 7); g.fill();
    g.strokeStyle = '#e8d8b0'; g.lineWidth = 6; g.stroke();
    // cracks
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const a = Math.random() * 7; g.beginPath(); g.moveTo(x - 6, 60); g.lineTo(x + Math.cos(a) * 46, 64 + Math.sin(a) * 42); g.stroke(); }
  }
  // one lens is bloody, as in the film
  g.fillStyle = 'rgba(140,10,10,0.75)'; g.beginPath(); g.ellipse(186, 70, 20, 26, 0.3, 0, 7); g.fill();
  g.strokeStyle = '#e8d8b0'; g.lineWidth = 5; g.beginPath(); g.moveTo(116, 58); g.quadraticCurveTo(128, 44, 140, 58); g.stroke();
  return c;
}
