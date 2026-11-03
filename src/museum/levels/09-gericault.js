// Level 9 · Théodore Géricault, The Raft of the Medusa (1818-19).
// Rule: balance and hunger. The raft tilts towards the weight: where the castaways crowd, you
// slide towards the sea. Your life drains on its own; only what the dead leave behind feeds you.
// The raft breaks apart plank by plank. Survive until the Argus shows on the horizon, then signal.
import { mirrorWater } from './_acqua.js';

const T = (it, en) => ({ it, en });
const OP = '/museo/opere/09/';
const W = 22, H = 20;
const RAFT = { x0: 7, y0: 6, x1: 14, y1: 12 }; // cells of the raft

function seaGrid() {
  const g = Array.from({ length: H }, () => Array(W).fill('~'));
  for (let y = RAFT.y0; y <= RAFT.y1; y++) for (let x = RAFT.x0; x <= RAFT.x1; x++) g[y][x] = '.';
  // the raft is not a rectangle: a broken corner and a bow
  g[RAFT.y0][RAFT.x0] = '~'; g[RAFT.y1][RAFT.x1] = '~'; g[RAFT.y0][RAFT.x1] = '~';
  g[9][RAFT.x1 + 1] = '.'; g[10][RAFT.x1 + 1] = '.';
  g[10][10] = 'P';
  return g.map((r) => r.join(''));
}

export default {
  id: 'gericault',
  artist: 'Théodore Géricault',
  year: '1818–19',
  title: T('La zattera della Medusa', 'The Raft of the Medusa'),
  museum: T('Musée du Louvre, Parigi', 'Musée du Louvre, Paris'),
  image: '/museo/opere/09-gericault.jpg',
  credit: T('Riproduzione: pubblico dominio (Wikimedia Commons)', 'Reproduction: public domain (Wikimedia Commons)'),
  intro: T('Luglio 1816. La fregata Médusa si arena al largo dell’Africa. Centoquarantasette persone su una zattera di travi legate, senza acqua, per tredici giorni.',
    'July 1816. The frigate Méduse runs aground off Africa. One hundred and forty-seven people on a raft of lashed beams, without water, for thirteen days.'),
  rule: T('La zattera si inclina verso il peso: dove si ammassano i naufraghi, scivoli verso il mare. La vita scende da sola per fame e sete; ti nutre solo quello che lasciano i morti. Le travi si staccano. Resisti finché all’orizzonte compare l’Argus, poi fai il segnale con l’azione.',
    'The raft tilts towards the weight: where the castaways crowd, you slide towards the sea. Your life drains on its own from hunger and thirst; only what the dead leave behind feeds you. The beams come loose. Hold on until the Argus appears on the horizon, then signal with the action.'),
  ruleShort: T('stai al centro della zattera · raccogli i resti per non morire di fame', 'stay in the middle of the raft · pick up the remains or starve'),
  goal: T('Abbatti 22 naufraghi finché appare l’Argus, poi tieni premuto SEGNALE.', 'Kill 22 castaways until the Argus appears, then hold SIGNAL.'),
  paint: '#8a5a2a',
  accent: '#e0a060',
  fx: { mono: 0.45, tint: [1.0, 0.86, 0.66], keepRed: 0.5, contrast: 0.75, exposure: 1.05, grain: 0.5, scratches: 0.35, dust: 0.45, flicker: 0.25, weave: 0.35, smear: 0.3, vignette: 0.8 },
  player: { hp: 100, speed: 5.0 },
  zones: { mare: { speed: 0.42, friction: 0.35, dps: 16 } },
  discovery: {
    title: T('Quindici su centoquarantasette', 'Fifteen out of one hundred and forty-seven'),
    text: T('Dalla zattera tornarono vivi in quindici. Géricault aveva ventisette anni: intervistò due superstiti, il medico Savigny e l’ingegnere Corréard, fece costruire un modello della zattera e si chiuse nello studio con la testa rasata. Per dipingere il colore della morte si faceva portare dall’ospedale arti e teste di cadaveri. Il quadro scandalizzò il Salon del 1819, e oggi al Louvre si sta scurendo: il bitume che usò per le ombre non asciuga mai.',
      'Fifteen came back alive from the raft. Géricault was twenty-seven: he interviewed two survivors, the surgeon Savigny and the engineer Corréard, had a model of the raft built and shut himself in his studio with his head shaved. To paint the colour of death he had limbs and heads of corpses brought from the hospital. The picture scandalised the 1819 Salon, and today at the Louvre it is darkening: the bitumen he used for the shadows never dries.'),
  },
  deathLine: T('Il mare ti ha preso. Sulla zattera nessuno se ne accorge.', 'The sea took you. On the raft no one notices.'),

  async setup(ctx) {
    const { THREE, CELL } = ctx;
    const grid = seaGrid();
    const water = mirrorWater(ctx, { scale: 0.45 });
    const paint = (rect, rx = 1, ry = 1) => { const t = ctx.art.tex(ctx.art.crop(rect, 512)); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(rx, ry); return t; };
    const seaTex = paint([0.6, 0.38, 0.38, 0.2]);
    const seaMat = water.material({ base: seaTex, strength: 0.55, baseScale: 0.06, baseBright: 0.75, ripple: 4.5, tint: [0.75, 0.7, 0.62], deep: [0.01, 0.015, 0.012] });
    ctx.map.build({ grid, legend: { '~': { zone: 'mare', sea: true }, '.': { raft: true }, P: { start: true, raft: true } }, textures: { floor: seaMat }, height: 3, ceiling: false });
    ctx.map.group.traverse((o) => { if (o.isMesh && o.material === seaMat) water.attach(o); });

    // the storm: the painting's own sky, bruised and lit from behind
    const sc = document.createElement('canvas'); sc.width = 2048; sc.height = 1024;
    const sg = sc.getContext('2d');
    sg.fillStyle = '#2a2420'; sg.fillRect(0, 0, 2048, 1024);
    const band = ctx.art.crop([0.8, 0.0, 0.2, 0.37], 1024);
    for (let i = 0; i < 8; i++) { sg.save(); sg.translate(i * 256 + (i % 2 ? 256 : 0), 170); sg.scale(i % 2 ? -1 : 1, 1); sg.drawImage(band, 0, 0, 256, 350); sg.restore(); }
    const fade = sg.createLinearGradient(0, 120, 0, 260); fade.addColorStop(0, '#2a2420'); fade.addColorStop(1, 'rgba(42,36,32,0)');
    sg.fillStyle = fade; sg.fillRect(0, 120, 2048, 140);
    sg.fillStyle = '#3a3a34'; sg.fillRect(0, 516, 2048, 508);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ map: ctx.art.tex(sc), side: THREE.BackSide, fog: false, color: 0xa89888 }));
    const center = ctx.map.toWorld((RAFT.x0 + RAFT.x1) / 2, (RAFT.y0 + RAFT.y1) / 2);
    sky.position.set(center.x, -8, center.z);
    ctx.add(sky);
    ctx.light({ ambient: 1.2, color: 0xd8b890, ground: 0x302418, lantern: false, fog: { color: 0x3a342c, near: 10, far: 70 }, sky: 0x3a342c });

    // the raft: beams lashed together, the painting's own wood
    const raftG = new THREE.Group(); raftG.position.set(center.x, 0, center.z); ctx.add(raftG);
    const woodMat = new THREE.MeshBasicMaterial({ map: paint([0.42, 0.76, 0.26, 0.14]), color: 0xb09078 });
    const beam = new THREE.BoxGeometry(CELL, 0.22, CELL * 0.23);
    const cells = ctx.map.find('raft');
    const beams = new THREE.InstancedMesh(beam, woodMat, cells.length * 4);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc3 = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
    const plank = new Map();
    cells.forEach((c, i) => {
      for (let k = 0; k < 4; k++) {
        e.set((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.03); q.setFromEuler(e);
        ps.set(c.x - center.x + (Math.random() - 0.5) * 0.1, -0.08 + Math.random() * 0.04, c.z - center.z - CELL * 0.37 + k * CELL * 0.25);
        m4.compose(ps, q, sc3); beams.setMatrixAt(i * 4 + k, m4);
      }
      plank.set(c.cx + ',' + c.cy, i);
    });
    raftG.add(beams);
    // the mast and the torn sail
    const mastPos = ctx.map.toWorld(9, 8);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 8, 6), woodMat);
    mast.position.set(mastPos.x - center.x, 4, mastPos.z - center.z); mast.rotation.z = 0.12;
    raftG.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.2), new THREE.MeshBasicMaterial({ map: ctx.art.tex(ctx.art.cutout({ rect: [0.12, 0.05, 0.36, 0.42], poly: [[0.02, 0.08], [0.34, 0.02], [0.94, 0.34], [0.86, 0.73], [0.56, 0.87], [0.07, 0.97], [0.01, 0.73]], rot: 0.5, feather: 4 })), alphaTest: 0.35, side: THREE.DoubleSide, color: 0xd0b898 }));
    sail.position.set(mastPos.x - center.x + 1.4, 4.6, mastPos.z - center.z - 0.3); sail.rotation.y = 0.5;
    raftG.add(sail);
    ctx.collider(mastPos.x, mastPos.z, 0.3);
    // the barrel the man stands on to wave
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 10), woodMat);
    const bp = ctx.map.toWorld(13, 7);
    barrel.position.set(bp.x - center.x, 0.45, bp.z - center.z); raftG.add(barrel); ctx.collider(bp.x, bp.z, 0.5);

    // the Argus: a speck on the horizon, as in the painting
    const argus = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ color: 0x5a4a3a, transparent: true, opacity: 0, fog: false }));
    argus.position.set(center.x + 85, 3.6, center.z - 70); argus.lookAt(center.x, 3.6, center.z);
    ctx.add(argus);

    // ---------- the castaways, cut from the canvas ----------
    const [padre, cadavere, braccia, annegato, segnale] = await Promise.all(['padre', 'cadavere', 'braccia', 'annegato', 'segnale'].map((n) => ctx.art.load(OP + n + '.webp')));
    const flesh = 0x5a1a0e;
    const CASTAWAY = {
      name: T('Il naufrago', 'The castaway'), sprite: braccia, height: 1.9, hp: 2.2, speed: 2.5, dmg: 7, reach: 1.2, radius: 0.4,
      behavior: 'chase', twitch: 0.5, rot: 0.3, tear: 0.5, selfLit: 0.25, blood: flesh, weight: 1,
    };
    const CORPSE = {
      name: T('Il morto che striscia', 'The crawling dead'), sprite: cadavere, height: 1.0, hp: 1.6, speed: 2.4, dmg: 7, reach: 1.1, radius: 0.45,
      behavior: 'crawl', twitch: 0.7, rot: 0.4, tear: 0.3, selfLit: 0.2, blood: flesh, weight: 1,
      parts: [{ type: 'tendrils', n: 3, len: 0.6, thick: 0.03, at: [0, 0.4, 0], color: 0x3a1408 }],
    };
    const DROWNED = {
      name: T('L’annegato aggrappato', 'The drowned one, clinging'), sprite: annegato, height: 1.3, hp: 3.2, speed: 1.3, dmg: 10, reach: 1.3, radius: 0.6,
      behavior(m, c, dt) {
        // it climbs out of the sea and drags its side of the raft down
        const onRaft = c.map.cellAt(m.pos.x, m.pos.z)?.def.raft && !c.data.broken.has(c.map.cellAt(m.pos.x, m.pos.z).cx + ',' + c.map.cellAt(m.pos.x, m.pos.z).cy);
        m.data.weight = onRaft ? 1.5 : 3;
        c.monsters.walkTo(m, c.player.pos, m.speed * (onRaft ? 1.6 : 1), dt);
        c.monsters.melee(m, dt);
      },
      ghost: true, twitch: 0.4, rot: 0.3, selfLit: 0.2, blood: 0x2a3028, weight: 3,
    };
    const WAVER = {
      name: T('Chi sventola il panno', 'The one waving the cloth'), sprite: segnale, height: 2.6, hp: 5, speed: 1.8, dmg: 12, reach: 1.3, radius: 0.45,
      behavior: 'ranged', fireEvery: 2.4, projectile: { speed: 6.5, dmg: 9, color: 0x8a3a20, size: 0.16 }, twitch: 0.3, rot: 0.2, selfLit: 0.3, blood: flesh, weight: 1.4, score: 2,
    };
    const FATHER = {
      name: T('Il padre con il figlio morto', 'The father with his dead son'), sprite: padre, height: 2.1, hp: 12, speed: 0.6, dmg: 6, reach: 1.1, radius: 0.8, score: 4,
      behavior(m, c, dt) { c.monsters.walkTo(m, c.player.pos, m.speed, dt); c.monsters.melee(m, dt); },
      twitch: 0.1, rot: 0.15, tear: 0.2, breathe: 0.4, selfLit: 0.35, blood: flesh, weight: 4,
    };
    const raftCells = () => ctx.map.find('raft').filter((c) => !ctx.data.broken.has(c.cx + ',' + c.cy));
    const edgeSea = () => {
      const out = [];
      for (let y = RAFT.y0 - 1; y <= RAFT.y1 + 1; y++) for (let x = RAFT.x0 - 1; x <= RAFT.x1 + 2; x++) {
        const c = ctx.map.cell(x, y); if (!c || c.zone !== 'mare') continue;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ctx.map.cell(x + dx, y + dy)?.zone !== 'mare');
        if (near) out.push(ctx.map.toWorld(x, y));
      }
      return out;
    };
    const far = (list, min) => { const pp = ctx.player.pos; const ok = list.filter((p) => p.distanceTo(pp) > min); const l = ok.length ? ok : list; return l[Math.floor(Math.random() * l.length)]; };
    ctx.data = {
      water, raftG, beams, plank, broken: new Set(), tilt: new THREE.Vector2(), sky, argus, center, hunger: 0, father: null, mad: 0,
      phase: 0, signal: 0, breakT: 18, flareT: 0, KEYS: { CASTAWAY, CORPSE, DROWNED, WAVER, FATHER }, raftCells, edgeSea, far,
    };
    ctx.data.sp = ctx.spawner({ kinds: [{ def: CASTAWAY, w: 3 }, { def: CORPSE, w: 3 }, { def: WAVER, w: 1 }], first: 3, every: 2.3, max: 5, where: () => far(raftCells(), 5) });
    ctx.data.sea = ctx.spawner({ kinds: [{ def: DROWNED, w: 1 }], first: 1, every: 3.6, max: 3, where: () => far(edgeSea(), 4) });
    ctx.data.father = ctx.spawn(FATHER, ctx.map.toWorld(8, 7), { instant: true });
    ctx.action({ label: T('SEGNALE', 'SIGNAL') });
    ctx.hud.goal(T('naufraghi da abbattere', 'castaways to kill'), 22);
    ctx.after(1, (c) => c.hud.say(T('La zattera pende dove pesano i corpi. Non scivolare in mare.', 'The raft leans where the bodies weigh. Do not slide into the sea.'), 3400));
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.player, { THREE } = ctx;
    // ---------- balance ----------
    let wx = 0, wz = 0, wt = 6;
    const cx = d.center.x, cz = d.center.z;
    for (const m of ctx.monsters.list) {
      if (m.dying) continue;
      const w = m.data.weight ?? m.def.weight ?? 1;
      wx += (m.pos.x - cx) * w; wz += (m.pos.z - cz) * w; wt += w;
    }
    // the sea rocks it anyway
    const sw = Math.sin(ctx.time * 0.7) * 1.4, sw2 = Math.cos(ctx.time * 0.53) * 1.1;
    d.tilt.lerp(new THREE.Vector2(wx / wt + sw, wz / wt + sw2), Math.min(1, dt * 2));
    const tl = d.tilt.length();
    // you slide downhill, harder the more it leans
    const k = Math.max(0, tl - 0.6) * 1.9;
    if (p.zone !== 'mare') p.push(d.tilt.x / (tl || 1) * k * dt * 6, d.tilt.y / (tl || 1) * k * dt * 6);
    for (const m of ctx.monsters.list) if (!m.dying && !m.def.ghost) ctx.monsters.move(m, d.tilt.x / (tl || 1) * k * dt * 0.5, d.tilt.y / (tl || 1) * k * dt * 0.5);
    // the raft and the horizon lean with it
    d.raftG.rotation.set(d.tilt.y * 0.025, 0, -d.tilt.x * 0.025);
    d.sky.rotation.set(-d.tilt.y * 0.02, 0, d.tilt.x * 0.02);
    ctx.hud.bar('tilt', { label: T('inclinazione', 'tilt'), value: Math.min(1, tl / 4), color: tl > 2.6 ? '#e05030' : '#e0c090' });
    // ---------- hunger ----------
    d.hunger += dt;
    if (d.phase < 2) { p.hp -= dt * (0.7 + ctx.D.dmg * 0.2); if (p.hp <= 0) ctx.lose(); }
    // ---------- the father with his dead son: near him you lose your mind ----------
    const f = d.father;
    const fd = f && !f.dying ? f.pos.distanceTo(p.pos) : 99;
    d.mad = Math.max(0, Math.min(1, d.mad + dt * (fd < 4 ? 0.8 : -0.5)));
    ctx.fx.mirror = d.mad > 0.6 ? 1 : 0;
    ctx.fx.wobble = d.mad * 0.5;
    ctx.fx.smear = 0.3 + d.mad * 0.4;
    if (d.mad > 0.6 && Math.random() < dt) ctx.hud.whisper(T('“mio figlio”', '“my son”'));
    // ---------- the raft breaks apart ----------
    d.breakT -= dt;
    if (d.breakT <= 0) {
      d.breakT = 14 / Math.sqrt(ctx.D.rate);
      const edge = d.raftCells().filter((c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = ctx.map.cell(c.cx + dx, c.cy + dy); return !n || n.zone === 'mare'; }));
      const pc = ctx.map.cellAt(p.pos.x, p.pos.z);
      const choice = edge.filter((c) => !(pc && c.cx === pc.cx && c.cy === pc.cy));
      if (choice.length && d.raftCells().length > 14) {
        const c = choice[Math.floor(Math.random() * choice.length)];
        d.broken.add(c.cx + ',' + c.cy);
        ctx.map.setZone(c.cx, c.cy, 'mare');
        const i = d.plank.get(c.cx + ',' + c.cy), z0 = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let k2 = 0; k2 < 4; k2++) d.beams.setMatrixAt(i * 4 + k2, z0);
        d.beams.instanceMatrix.needsUpdate = true;
        ctx.audio.burst(0.5, 400, 1, 0.3, 'lowpass', 120);
        ctx.hud.whisper(T('una trave si stacca', 'a beam comes loose'));
        ctx.particles.burst({ x: c.x, y: 0.2, z: c.z }, 16, 0x6a4a2a, 2, 0.8);
      }
    }
    // ---------- the Argus ----------
    if (d.phase === 0) {
      const need = 22;
      if (ctx.kills < need) ctx.hud.goal(T('naufraghi da abbattere', 'castaways to kill'), need - ctx.kills);
      else ctx.hud.goal(T('resisti: l’Argus arriva', 'hold on: the Argus is coming'), Math.ceil(45 - ctx.time) + ' s');
      if (ctx.kills >= need && ctx.time > 45) {
        d.phase = 1;
        ctx.audio.toll(52);
        ctx.hud.say(T('Laggiù, sull’orizzonte: una vela. L’Argus! Fai il segnale (azione).', 'Out there on the horizon: a sail. The Argus! Signal it (action).'), 4200);
        d.sp.cfg.every = 1.4; d.sp.cfg.max = 7;
        d.seen = ctx.time;
      }
    } else if (d.phase === 1) {
      d.argus.material.opacity = Math.min(1, d.argus.material.opacity + dt * 0.3);
      ctx.hud.goal(T('tieni premuto SEGNALE', 'hold SIGNAL'), Math.round(d.signal * 100) + '%');
      // you have to hold it in the open: every hit throws your arm down
      if (ctx.input.alt) {
        d.signal = Math.min(1, d.signal + dt / 3.2);
        if (Math.random() < dt * 20) ctx.particles.burst({ x: p.pos.x, y: 2.4, z: p.pos.z }, 3, 0xf0d0a0, 1.2, 0.8);
      } else d.signal = Math.max(0, d.signal - dt * 0.15);
      ctx.hud.bar('signal', { label: T('segnale', 'signal'), value: d.signal, color: '#f0e0b0' });
      if (d.signal >= 1) {
        d.phase = 2; d.flareT = ctx.time;
        for (const sp of [d.sp, d.sea]) sp.stop();
        ctx.particles.burst({ x: p.pos.x, y: 3, z: p.pos.z }, 60, 0xff9040, 6, 2.2);
        ctx.audio.toll(60); ctx.audio.toll(90);
        ctx.hud.say(T('L’Argus vira verso di voi. Quindici tornano a casa.', 'The Argus turns towards you. Fifteen will go home.'), 3800);
        for (const m of ctx.monsters.list.slice()) if (!m.dying) ctx.monsters.kill(m);
      }
    } else if (d.phase === 2) {
      const t = ctx.time - d.flareT;
      ctx.fx.exposure = 1.05 + t * 0.3;
      if (t > 3 && !d.won) { d.won = true; ctx.win(); }
    }
  },

  // hit while signalling: you drop the cloth
  onHurt(ctx, dmg, from) {
    if (from && ctx.data.phase === 1) ctx.data.signal = Math.max(0, ctx.data.signal - 0.2);
    return dmg;
  },

  // only what the dead leave behind feeds you
  onKill(ctx, m) {
    if (m === ctx.data.father) ctx.data.father = null;
    if (Math.random() < 0.45 || m.def.score > 1) {
      const pos = m.pos.clone();
      const cell = ctx.map.cellAt(pos.x, pos.z);
      if (cell?.zone === 'mare') return;
      ctx.pickup(pos, { kind: 'heal', amount: m.def.score > 1 ? 22 : 11, color: 0x7a2a14,
        onTake(c) { c.hud.whisper(T('mangi, e non guardi cosa', 'you eat, and do not look at what')); c.audio.flesh(); } });
    }
  },

  teardown(ctx) { ctx.data?.water?.dispose(); },
};
