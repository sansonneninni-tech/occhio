// LEVEL 12 · Edvard Munch, "Skrik" (1893).
// The Ekeberg bridge, endless, over the fjord, under the red sky. At intervals the sky screams: cover
// your ears (action) or be torn apart, but with your hands on your head you cannot shoot. While you
// cover your ears the two men in hats come closer. At the end of the bridge waits the figure.
// Secret: the pencil line Munch wrote in the sky ("Can only have been painted by a madman"). Shoot it.

const T = (it, en) => ({ it, en });

// the winding bridge: centre-line turns, three cells wide
const PATH = [['E', 20], ['N', 10], ['E', 14], ['N', 12], ['W', 10], ['N', 8], ['E', 22]];
const START = [3, 40], GW = 62, GH = 44;

function buildGrid() {
  const g = Array.from({ length: GH }, () => Array(GW).fill(' '));
  const line = [];
  let [x, y] = START;
  line.push([x, y]);
  const D = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
  for (const [d, n] of PATH) for (let i = 0; i < n; i++) { x += D[d][0]; y += D[d][1]; line.push([x, y]); }
  for (const [cx, cy] of line) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) g[cy + j][cx + i] = '.';
  // the painting closes the start of the bridge, behind you
  const [sx, sy] = START;
  for (let j = -1; j <= 1; j++) g[sy + j][sx - 2] = '#';
  g[sy][sx - 2] = 'Q';
  g[sy][sx] = 'P';
  const [ex, ey] = line[line.length - 1];
  g[ey][ex] = 'X';
  for (let j = -1; j <= 1; j++) g[ey + j][ex + 2] = '#';
  return { grid: g.map((r) => r.join('')), line };
}

// the sky dome: Munch's red, yellow and blue bands, wrapped around and slowly flowing
function skyCanvas(ctx) {
  const src = ctx.art.crop([0.02, 0, 0.86, 0.32], 1024);
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512;
  const g = c.getContext('2d');
  // mirrored twice so the band closes on itself
  g.drawImage(src, 0, 0, 1024, 420); g.save(); g.translate(2048, 0); g.scale(-1, 1); g.drawImage(src, 0, 0, 1024, 420); g.restore();
  const fade = g.createLinearGradient(0, 380, 0, 512); fade.addColorStop(0, 'rgba(20,16,40,0)'); fade.addColorStop(1, 'rgba(18,22,48,1)');
  g.fillStyle = fade; g.fillRect(0, 380, 2048, 132);
  return c;
}

export default {
  id: 'munch',
  artist: 'Edvard Munch',
  year: '1893',
  title: T('L’urlo', 'The Scream'),
  museum: T('Galleria Nazionale, Oslo', 'National Gallery, Oslo'),
  image: '/museo/opere/12-munch.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T('Il ponte di Ekeberg, sopra il fiordo di Oslo, al tramonto. Il cielo è diventato rosso sangue. Il ponte continua, continua, continua.', 'The Ekeberg bridge above the Oslo fjord, at sunset. The sky has turned blood red. The bridge goes on, and on, and on.'),
  rule: T('A ondate il cielo urla. Quando diventa rosso copriti le orecchie (tieni premuta l’azione), o l’urlo ti fa a pezzi. L’urlo ferma anche i mostri, ma con le mani sulle orecchie non puoi sparare, e i due uomini col cappello, gli unici calmi, si avvicinano. Arriva in fondo al ponte.', 'At intervals the sky screams. When it turns red, cover your ears (hold the action), or the scream tears you apart. The scream stops the monsters too, but with your hands on your ears you cannot shoot, and the two men in hats, the only calm ones, come closer. Reach the end of the bridge.'),
  ruleShort: T('cielo rosso: tieni premuto ORECCHIE', 'red sky: hold EARS'),
  goal: T('Attraversa il ponte e uccidi la figura che urla in fondo.', 'Cross the bridge and kill the screaming figure at the end.'),
  paint: '#d84a10',
  accent: '#e8701c',
  fx: { mono: 0.12, tint: [1, 0.95, 0.9], keepRed: 1, contrast: 0.42, exposure: 1.05, grain: 0.45, scratches: 0.2, dust: 0.3, flicker: 0.15, weave: 0.35, smear: 0.35, vignette: 0.55, wobble: 0.3 },
  discovery: {
    title: T('La figura non urla', 'The figure is not screaming'),
    text: T('Munch scrisse nel diario: «Mi fermai, stanco morto. Sentii un grande urlo infinito attraversare la natura». La figura non urla: si tappa le orecchie, come hai fatto tu. Nel cielo del quadro c’è una scritta a matita quasi invisibile: «Può essere stato dipinto solo da un pazzo». Per un secolo si è pensato a un vandalo; nel 2021 il museo di Oslo ha scoperto che è la calligrafia di Munch.', 'Munch wrote in his diary: “I stopped, dead tired. I felt a great, infinite scream pass through nature.” The figure is not screaming: it is covering its ears, like you did. In the sky of the painting there is a faint pencil line: “Can only have been painted by a madman.” For a century people blamed a vandal; in 2021 the Oslo museum found it is Munch’s own handwriting.'),
  },
  deathLine: T('L’urlo ti è passato attraverso.', 'The scream went right through you.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const { grid, line } = buildGrid();
    const wood = ctx.art.wall([0.02, 0.62, 0.3, 0.3], { dark: 0.15 });
    ctx.map.build({
      grid,
      textures: { wall: wood, floor: new THREE.MeshBasicMaterial({ visible: false }), painting: ctx.art.texture },
      height: 3.2, ceiling: false,
    });
    ctx.light({ ambient: 1.0, color: 0xffb080, ground: 0x203050, lantern: false, fog: { color: 0x6a2a18, near: 14, far: 70 }, sky: 0x2a1020 });
    const C = ctx.CELL;

    // the planks of the bridge, one slab per cell, and the railing wherever the bridge meets the void
    const planks = ctx.art.tex(ctx.art.crop([0.05, 0.7, 0.3, 0.28], 256), { repeat: true });
    const cells = [];
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) { const ch = grid[cy][cx]; if (ch !== ' ' && ch !== '#' && ch !== 'Q') cells.push([cx, cy]); }
    const slab = new THREE.InstancedMesh(new THREE.BoxGeometry(C, 0.3, C), new THREE.MeshStandardMaterial({ map: planks, roughness: 1 }), cells.length);
    const m4 = new THREE.Matrix4();
    cells.forEach(([cx, cy], i) => { m4.makeTranslation((cx + 0.5) * C, -0.15, (cy + 0.5) * C); slab.setMatrixAt(i, m4); });
    ctx.add(slab);
    const rails = [];
    const open = (cx, cy) => grid[cy]?.[cx] === ' ' || grid[cy]?.[cx] == null;
    for (const [cx, cy] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(cx + dx, cy + dy)) rails.push([cx, cy, dx, dy]);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xc8501c, roughness: 0.9 });
    const bar = new THREE.InstancedMesh(new THREE.BoxGeometry(C, 0.09, 0.09), railMat, rails.length * 2);
    const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a2410, roughness: 1 }), rails.length);
    const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    rails.forEach(([cx, cy, dx, dy], i) => {
      const x = (cx + 0.5 + dx * 0.48) * C, z = (cy + 0.5 + dy * 0.48) * C;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx ? Math.PI / 2 : 0);
      m4.compose(v.set(x, 1.1, z), q, sc); bar.setMatrixAt(i * 2, m4);
      m4.compose(v.set(x, 0.6, z), q, sc); bar.setMatrixAt(i * 2 + 1, m4);
      m4.makeTranslation(x + (dy ? -C / 2 : 0), 0.57, z + (dx ? -C / 2 : 0)); post.setMatrixAt(i, m4);
    });
    ctx.add(bar); ctx.add(post);

    // the fjord far below, its blue swirls flowing
    const fj = ctx.art.tex(ctx.art.crop([0.1, 0.32, 0.6, 0.18], 512), { repeat: true });
    fj.repeat.set(5, 4);
    const fjord = new THREE.Mesh(new THREE.PlaneGeometry(GW * C * 3, GH * C * 3), new THREE.MeshBasicMaterial({ map: fj, fog: true, color: 0xb0b8d0 }));
    fjord.rotation.x = -Math.PI / 2; fjord.position.set(GW * C / 2, -9, GH * C / 2); ctx.add(fjord);
    // the sky
    const skyTex = ctx.art.tex(skyCanvas(ctx)); skyTex.wrapS = THREE.RepeatWrapping;
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, color: 0xffffff });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), skyMat);
    sky.position.set(GW * C / 2, -20, GH * C / 2); ctx.add(sky);

    // the pencil line in the sky, almost invisible
    const pc = document.createElement('canvas'); pc.width = 1024; pc.height = 96;
    { const g = pc.getContext('2d'); g.font = 'italic 44px Georgia, serif'; g.fillStyle = 'rgba(40,30,30,0.75)'; g.fillText('Kan kun være malet af en gal Mand!', 20, 60); }
    const pencil = new THREE.Mesh(new THREE.PlaneGeometry(26, 2.4), new THREE.MeshBasicMaterial({ map: ctx.art.tex(pc), transparent: true, opacity: 0.4, fog: false, depthWrite: false }));
    const mid = line[Math.floor(line.length * 0.42)];
    pencil.position.set((mid[0] + 0.5) * C - 40, 34, (mid[1] + 0.5) * C - 70);
    pencil.lookAt((mid[0] + 0.5) * C, 1.5, (mid[1] + 0.5) * C);
    ctx.add(pencil);

    const screamer = await ctx.art.load('/museo/opere/12-munch-urlatore.png');
    const man1 = await ctx.art.load('/museo/opere/12-munch-uomo1.png');
    const man2 = await ctx.art.load('/museo/opere/12-munch-uomo2.png');

    const d = ctx.data = {
      line, idx: 0, phase: 'calm', t: 7, waves: 0, covered: false, tick: 0, secret: false, men: [], figure: null, skyMat, sky, fj, pencil, hint: false,
    };

    const howl = (m, c, dt) => {
      const s = m.state;
      s.cd = (s.cd ?? 3 + Math.random() * 4) - dt;
      if (s.mode === 'wind') {
        s.t -= dt; m.anger = 1; m.frozen = true;
        if (s.t <= 0) {
          s.mode = null; s.cd = 5 + Math.random() * 3; m.frozen = false;
          c.audio.scream(0.9 * m.pitch, 0.25);
          if (m.pos.distanceTo(c.player.pos) < 10 && c.monsters.sees(m)) {
            if (!d.covered) { c.player.hurt(9 * c.D.dmg * 0.6, m); c.fx.wobble = Math.max(c.fx.wobble, 1.2); }
            else c.audio.muffle(1);
          }
        }
        return;
      }
      if (s.cd <= 0 && m.pos.distanceTo(c.player.pos) < 10) { s.mode = 'wind'; s.t = 0.9; return; }
      c.monsters.walkTo(m, c.player.pos, m.speed * (d.covered ? 1.4 : 1), dt);
      c.monsters.melee(m, dt);
    };
    const urlatore = {
      name: T('L’urlatore', 'The screamer'),
      sprite: screamer, height: 1.85, hp: 1.0, speed: 2.6, dmg: 6, reach: 1.3, radius: 0.4,
      twitch: 0.5, rot: 0.25, tear: 1.2, breathe: 1.8, blood: 0x1a2a5a,
      parts: [{ type: 'tendrils', n: 4, len: 0.9, thick: 0.05, at: [0, 0.35, -0.08], color: 0x1a1a30, spread: 0.7 }],
      zones: [{ name: 'testa', x: [-0.25, 0.25], y: [0.72, 1], mul: 2 }],
      behavior: howl,
    };
    // the two men: they cannot die. A shot only pushes them back. They come when your hands are on your ears.
    const stalk = (m, c, dt) => {
      const dd = m.pos.distanceTo(c.player.pos);
      m.state.stun = Math.max(0, (m.state.stun ?? 0) - dt);
      if (m.state.stun) { m.moving = 0; return; }
      const fast = d.covered || d.phase === 'scream';
      if (fast) c.monsters.walkTo(m, c.player.pos, 5.2, dt);
      else if (dd > 11) c.monsters.walkTo(m, c.player.pos, 4.6, dt);
      else m.moving = 0;
      c.monsters.melee(m, dt);
    };
    const manDef = (img, n) => ({
      name: T('L’uomo col cappello', 'The man in the hat'),
      sprite: img, height: 2.15, hitbox: 'rect', hp: 999, speed: 4, dmg: 22, reach: 1.2, radius: 0.35, fixed: true, counts: false,
      twitch: 0.15, rot: 0.1, tear: 0.4, breathe: 0.3, blood: 0x0a0a12, attackEvery: 1.4,
      behavior: stalk,
      onHit(m, shot, c) { m.state.stun = 1.4; const b = m.pos.clone().sub(c.player.pos).setY(0).normalize(); c.monsters.move(m, b.x * 1.5, b.z * 1.5); c.audio.growl(0.5, 0.15); return 0; },
      onAttack(m, c) { c.hud.whisper(T('ti ha raggiunto', 'it caught you')); },
      pitch: 0.5 + n * 0.1,
    });
    d.defs = { urlatore, man1: manDef(man1, 0), man2: manDef(man2, 1) };

    // the figure at the end: it only feels your shots once you are close
    const [ex, ey] = line[line.length - 1];
    const figure = {
      name: T('La figura', 'The figure'), boss: true,
      sprite: screamer, height: 5.2, hp: 34, speed: 0, dmg: 25, reach: 2.2, radius: 1.1,
      twitch: 0.3, rot: 0.2, tear: 1.4, breathe: 2.5, blood: 0x1a2a5a, selfLit: 0.15,
      parts: [{ type: 'tendrils', n: 7, len: 2.6, thick: 0.09, at: [0, 1.0, -0.2], color: 0x161a34, spread: 0.9 }],
      zones: [{ name: 'bocca', x: [-0.08, 0.08], y: [0.74, 0.86], mul: 2.5 }],
      behavior(m, c, dt) {
        const dd = m.pos.distanceTo(c.player.pos);
        m.state.cd = (m.state.cd ?? 4) - dt;
        if (dd < 26 && m.state.cd <= 0) { m.state.cd = 4.2; if (d.phase === 'calm') { d.phase = 'warn'; d.t = 1.0; } }
        c.monsters.melee(m, dt);
      },
      onHit(m, shot, c) { if (m.pos.distanceTo(c.player.pos) > 24) { c.hud.whisper(T('troppo lontana', 'too far away')); return 0; } return shot.dmg; },
      onDeath(m, c) { c.audio.muffle(0); c.after(1.2, (cc) => cc.win()); },
    };
    d.defs.figure = figure;
    d.figure = ctx.spawn(figure, ctx.map.toWorld(ex - 1, ey), { instant: true });

    ctx.spawner({ kinds: [{ def: urlatore }], first: 3, every: 3.5, max: 4, where: (c) => ahead(c, 7, 13) });
    ctx.action({ label: T('ORECCHIE', 'EARS') });
    ctx.hud.bar('urlo', { label: T('l’urlo', 'the scream'), value: 0, color: '#e8701c' });
    ctx.after(26, (c) => { if (!d.secret) c.hud.whisper(T('qualcuno ha scritto qualcosa nel cielo, a matita', 'someone wrote something in the sky, in pencil')); });
    ctx.pickup(ctx.map.toWorld(...line[Math.floor(line.length * 0.33)]), { kind: 'heal', amount: 40, color: 0xe8701c });
    ctx.pickup(ctx.map.toWorld(...line[Math.floor(line.length * 0.52)]), { kind: 'heal', amount: 30, color: 0xe8701c });
    ctx.pickup(ctx.map.toWorld(...line[Math.floor(line.length * 0.7)]), { kind: 'heal', amount: 40, color: 0xe8701c });
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player;
    // where am I on the bridge
    let best = d.idx, bd = 1e9;
    for (let i = Math.max(0, d.idx - 12); i < Math.min(d.line.length, d.idx + 12); i++) {
      const w = ctx.map.toWorld(...d.line[i]); const dd = Math.hypot(w.x - p.pos.x, w.z - p.pos.z);
      if (dd < bd) { bd = dd; best = i; }
    }
    d.idx = best;
    const prog = d.idx / (d.line.length - 1);
    ctx.hud.goal(T('metri alla figura', 'metres to the figure'), Math.max(0, Math.round((d.line.length - 1 - d.idx) * ctx.CELL)));

    // hands on the ears: no shooting, muffled world, narrowed sight
    const cover = ctx.input.alt;
    d.covered = cover;
    if (cover) ctx.gun.cd = Math.max(ctx.gun.cd, 0.2);
    ctx.weapon.setVisible(!cover);
    p.speedMul = cover ? 0.55 : 1;

    // the scream cycle: calm → the sky reddens → the scream
    d.t -= dt;
    const every = Math.max(5.5, 12 - prog * 7 - d.waves * 0.25);
    if (d.phase === 'calm' && d.t <= 0) { d.phase = 'warn'; d.t = 1.6; ctx.hud.say(T('Il cielo diventa rosso. Copriti le orecchie!', 'The sky turns red. Cover your ears!'), 1400); ctx.audio.tone(38, 1.6, 'sawtooth', 0.25, 110); }
    else if (d.phase === 'warn' && d.t <= 0) { d.phase = 'scream'; d.t = 2.1; d.tick = 0; d.waves++; ctx.audio.scream(0.42, 0.45); ctx.audio.burst(2.1, 1400, 0.7, 0.3, 'bandpass', 380); ctx.audio.tone(310, 2.0, 'sawtooth', 0.12, 120); }
    else if (d.phase === 'scream') {
      d.tick -= dt;
      if (!cover && d.tick <= 0) { d.tick = 0.38; p.hurt(6.5 * ctx.D.dmg * 0.7, null); ctx.view.shake = Math.min(1, ctx.view.shake + 0.4); }
      if (d.t <= 0) { d.phase = 'calm'; d.t = every; }
    }
    const red = d.phase === 'warn' ? 1 - d.t / 1.6 : d.phase === 'scream' ? 1 : 0;
    ctx.hud.bar('urlo', { value: d.phase === 'calm' ? 1 - d.t / every : 1, color: d.phase === 'calm' ? '#e8701c' : '#ff2a10' });
    d.skyMat.color.setRGB(1 + red * 0.6, 1 - red * 0.45, 1 - red * 0.6);
    ctx.fx.wobble += ((0.3 + red * (cover ? 0.5 : 1.6)) - ctx.fx.wobble) * Math.min(1, dt * 4);
    ctx.fx.tint = [1, 0.95 - red * 0.15, 0.9 - red * 0.25];
    ctx.fx.tunnel = cover ? 0.25 : 0;
    ctx.audio.muffle(cover ? 0.88 : 0);
    // the world flows: sky and fjord
    d.sky.rotation.y += dt * 0.01 * (1 + red * 6);
    d.fj.offset.x += dt * 0.01; d.fj.offset.y += dt * 0.006 * (1 + red * 4);
    // the scream goes through everyone on the bridge: the screamers clutch their heads and stop.
    // Only the two men in hats, calm as in the painting, keep walking.
    for (const m of ctx.monsters.list) if (m.def === d.defs.urlatore) m.hold = d.phase === 'scream';
    // the two men appear behind you once you have walked onto the bridge, then keep pace
    if (!d.men.length && d.idx >= 10) {
      d.men.push(ctx.spawn(d.defs.man1, behind(ctx, 9)), ctx.spawn(d.defs.man2, behind(ctx, 10)));
      ctx.hud.whisper(T('due uomini col cappello, dietro di te', 'two men in hats, behind you'));
    }
    for (const m of d.men) if (m && !m.dying && m.pos.distanceTo(p.pos) > 30 && d.idx > 10) { const b = behind(ctx, 9); if (b) m.pos.set(b.x, 0, b.z); }
  },

  onShot(ctx, shot) {
    const d = ctx.data;
    if (d.secret) return;
    const cam = ctx.camera.position;
    const dir = shot.point.clone().sub(cam).normalize();
    const to = d.pencil.position.clone().sub(cam).normalize();
    if (dir.dot(to) > 0.996) {
      d.secret = true;
      d.pencil.material.opacity = 1;
      ctx.audio.toll(98);
      ctx.player.heal(50);
      ctx.hud.say(T('«Può essere stato dipinto solo da un pazzo». È la calligrafia di Munch.', '“Can only have been painted by a madman.” It is Munch’s own handwriting.'), 4200);
    }
  },
};

// a free spot on the bridge some cells ahead of / behind the player
function ahead(ctx, a, b) {
  const d = ctx.data, i = Math.min(d.line.length - 3, d.idx + a + Math.floor(Math.random() * (b - a)));
  const w = ctx.map.toWorld(...d.line[i]);
  w.x += (Math.random() - 0.5) * 2.4; w.z += (Math.random() - 0.5) * 2.4;
  return Math.random() < 0.2 && d.idx > 10 ? behind(ctx, 6) : w;
}
function behind(ctx, n) {
  const d = ctx.data, i = Math.max(0, d.idx - n);
  return ctx.map.toWorld(...d.line[i]);
}
