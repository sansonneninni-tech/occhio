// The haunted museum: a small software raycaster (walls, floor, ceiling, billboards)
// plus monster AI for every ability listed in levels.js. Pure canvas, no WebGL.
import { LEVELS, difficulty } from './levels.js';
import { rng, monsterSprites, wallTextures, floorTexture } from './art.js';
import { store } from '../core/store.js';

const MW = 32, MH = 32, T = 64, SPR = 96;
const TAU = Math.PI * 2;
const PLAYER_R = 0.24, PLAYER_SPEED = 3.5, FIRE_RATE = 7, BOMB_R = 3.4;
const MAX_MONSTERS = 70;

const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- map generation (seeded: the same level is the same museum for everyone) ----------
function buildMap(idx, monsterBudget) {
  const r = rng(idx * 7777 + 1);
  const map = new Uint8Array(MW * MH).fill(1);
  const rooms = [];
  const want = 7 + Math.min(5, Math.floor(idx / 7));
  for (let tries = 0; tries < 300 && rooms.length < want; tries++) {
    const w = 4 + Math.floor(r() * 5), hh = 4 + Math.floor(r() * 5);
    const x = 1 + Math.floor(r() * (MW - w - 2)), y = 1 + Math.floor(r() * (MH - hh - 2));
    if (rooms.some((o) => x < o.x + o.w + 1 && x + w + 1 > o.x && y < o.y + o.h + 1 && y + hh + 1 > o.y)) continue;
    rooms.push({ x, y, w, h: hh, cx: x + (w >> 1), cy: y + (hh >> 1) });
  }
  for (const o of rooms) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) map[y * MW + x] = 0;
  const carve = (x, y) => { if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1) map[y * MW + x] = 0; };
  const corridor = (a, b, wide) => {
    let x = a.cx, y = a.cy;
    const horizFirst = r() < 0.5;
    const stepX = () => { while (x !== b.cx) { carve(x, y); if (wide) carve(x, y + 1); x += Math.sign(b.cx - x); } };
    const stepY = () => { while (y !== b.cy) { carve(x, y); if (wide) carve(x + 1, y); y += Math.sign(b.cy - y); } };
    if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    carve(x, y);
  };
  rooms.sort((a, b) => a.cx + a.cy * 0.3 - (b.cx + b.cy * 0.3));
  for (let i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i], r() < 0.4);
  for (let k = 0; k < 2 && rooms.length > 3; k++) corridor(rooms[Math.floor(r() * rooms.length)], rooms[Math.floor(r() * rooms.length)], false);
  // pillars inside large rooms
  for (const o of rooms) if (o.w >= 6 && o.h >= 6 && r() < 0.7) {
    const px = o.x + 2, py = o.y + 2;
    map[py * MW + px] = 1; map[py * MW + o.x + o.w - 3] = 1;
    map[(o.y + o.h - 3) * MW + px] = 1; map[(o.y + o.h - 3) * MW + o.x + o.w - 3] = 1;
  }
  // walls that face a floor cell can carry a frame
  const faces = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (!map[y * MW + x]) continue;
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < MW && Y < MH && !map[Y * MW + X]; });
    if (open) faces.push({ x, y, fx: x + 0.5 + open[0] * 0.75, fy: y + 0.5 + open[1] * 0.75 });
  }
  // shuffle and pick empty frames spread across the museum
  for (let i = faces.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [faces[i], faces[j]] = [faces[j], faces[i]]; }
  const frames = [];
  for (const f of faces) {
    if (frames.length >= monsterBudget) break;
    if (frames.some((o) => Math.abs(o.x - f.x) + Math.abs(o.y - f.y) < 3)) continue;
    frames.push(f); map[f.y * MW + f.x] = 3;
  }
  for (const f of faces) {
    if (frames.length >= monsterBudget) break;
    if (map[f.y * MW + f.x] !== 1) continue;
    frames.push(f); map[f.y * MW + f.x] = 3;
  }
  for (const f of faces) if (map[f.y * MW + f.x] === 1 && r() < 0.1) map[f.y * MW + f.x] = 2;
  return { map, rooms, frames, rnd: r };
}

function bfs(map, sx, sy) {
  const d = new Int16Array(MW * MH).fill(-1);
  const q = new Int16Array(MW * MH);
  let h = 0, t = 0;
  const s = sy * MW + sx;
  if (map[s]) return d;
  d[s] = 0; q[t++] = s;
  while (h < t) {
    const c = q[h++], cx = c % MW, cy = (c / MW) | 0;
    const nb = [c - 1, c + 1, c - MW, c + MW];
    for (let k = 0; k < 4; k++) {
      const n = nb[k];
      if ((k === 0 && cx === 0) || (k === 1 && cx === MW - 1) || n < 0 || n >= MW * MH) continue;
      if (map[n] || d[n] >= 0) continue;
      d[n] = d[c] + 1; q[t++] = n;
    }
  }
  return d;
}

// ---------- audio: a drone that never resolves, plus the sounds of the halls ----------
function makeAudio() {
  let ctx = null, master = null, droneGain = null, noise = null, nodes = [];
  const ok = () => !store.muted && ctx;
  return {
    start() {
      if (store.muted) return;
      try {
        ctx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        if (master) return;
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        const len = ctx.sampleRate;
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        droneGain = ctx.createGain(); droneGain.gain.value = 0.0001; droneGain.connect(master);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 6; lp.connect(droneGain);
        for (const f of [41.2, 41.9, 61.7, 87.3]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = f > 80 ? 0.12 : 0.3; o.connect(g).connect(lp); o.start(); nodes.push(o); }
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 140; lfo.connect(lg).connect(lp.frequency); lfo.start(); nodes.push(lfo);
        const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6; const ng = ctx.createGain(); ng.gain.value = 0.05; n.connect(bp).connect(ng).connect(droneGain); n.start(); nodes.push(n);
        droneGain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 3);
      } catch { ctx = null; }
    },
    setMuted(m) { if (master) master.gain.value = m ? 0 : 0.9; },
    stop() { try { nodes.forEach((n) => n.stop()); ctx?.close(); } catch {} ctx = null; master = null; nodes = []; },
    burst(dur, freq, q = 1, vol = 0.2, type = 'bandpass', slideTo = 0) {
      if (!ok()) return;
      const t0 = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
      if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f).connect(g).connect(master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
    },
    tone(freq, dur, type = 'sine', vol = 0.15, slideTo = 0) {
      if (!ok()) return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
    },
  };
}

// ---------- the engine ----------
export function createEngine(canvas, opts = {}) {
  const g = canvas.getContext('2d', { alpha: false });
  const audio = makeAudio();
  let RW = 320, RH = 200, img = null, buf = null, zbuf = null, proj = 200, planeLen = 0.66;

  const S = {
    idx: 0, level: null, diff: null, map: null, frames: [], rooms: [],
    px: 2, py: 2, pa: 0, hp: 100, bombs: 2, alive: true,
    mons: [], projs: [], parts: [], souls: [], pickups: [],
    tex: null, floorT: null, ceilT: null, sprites: null, pickupSpr: null,
    t: 0, fireT: 0, shots: 0, hits: 0, kills: 0, total: 0, levelTime: 0,
    slowT: 0, gazeK: 0, screamT: 0, hurtT: 0, flashT: 0, recoil: 0, bob: 0, flicker: 0,
    flow: null, flowCell: -1, boss: null, done: false, paused: true, touch: false,
    fogRGB: [0, 0, 0], ceilRGB: [0, 0, 0], accent: [255, 80, 20], fogK: 0.05,
  };
  const ctl = { fwd: 0, strafe: 0, turn: 0, fire: false, bomb: false, look: 0 };
  const cb = { onKill: opts.onKill || (() => {}), onClear: opts.onClear || (() => {}), onDeath: opts.onDeath || (() => {}), onHud: opts.onHud || (() => {}), onEvent: opts.onEvent || (() => {}) };

  function resize(w, h) {
    const aspect = clamp(w / Math.max(1, h), 0.4, 2.6);
    RH = Math.round(clamp(Math.sqrt(66000 / aspect), 150, 380));
    RW = Math.round(RH * aspect);
    canvas.width = RW; canvas.height = RH;
    img = g.createImageData(RW, RH);
    buf = new Uint32Array(img.data.buffer);
    zbuf = new Float32Array(RW);
    planeLen = clamp(0.66 * aspect / 1.4, 0.42, 0.95);
    proj = (RW / 2) / planeLen;
  }

  // -------- level loading --------
  function load(idx) {
    const level = LEVELS[idx];
    const diff = difficulty(idx);
    const extraSpawns = (level.abilities.includes('split') ? diff.count : 0) + (level.abilities.includes('summon') ? 10 : 0);
    const gen = buildMap(idx, Math.min(60, diff.count + extraSpawns + (diff.boss ? 1 : 0)));
    Object.assign(S, {
      idx, level, diff, map: gen.map, frames: gen.frames.map((f) => ({ ...f, filled: false })), rooms: gen.rooms,
      hp: 100, bombs: 2, alive: true, mons: [], projs: [], parts: [], souls: [], pickups: [],
      t: 0, fireT: 0, shots: 0, hits: 0, kills: 0, total: 0, levelTime: 0,
      slowT: 0, gazeK: 0, screamT: 0, hurtT: 0, flashT: 0, recoil: 0, flicker: 0,
      flowCell: -1, boss: null, done: false,
    });
    const x = idx / (LEVELS.length - 1);
    S.fogRGB = rgbOf(level.pal.fog); S.ceilRGB = rgbOf(level.pal.ceil); S.accent = rgbOf(level.pal.accent);
    S.fogK = 0.03 + x * 0.04;
    const gain = (arr, k) => arr.map((p) => 0xff000000 | (Math.min(255, (((p >> 16) & 255) * k) | 0) << 16) | (Math.min(255, (((p >> 8) & 255) * k) | 0) << 8) | Math.min(255, ((p & 255) * k) | 0));
    S.tex = wallTextures(level, idx).map((t) => gain(t, 1.9));
    S.floorT = gain(floorTexture(level, idx), 1.8);
    S.ceilT = S.floorT.map((p) => { const k = 0.55; const r = (((p & 255) * k + S.ceilRGB[0]) / 2) | 0, gg = ((((p >> 8) & 255) * k + S.ceilRGB[1]) / 2) | 0, b = ((((p >> 16) & 255) * k + S.ceilRGB[2]) / 2) | 0; return 0xff000000 | (b << 16) | (gg << 8) | r; });
    S.sprites = monsterSprites(level.monster, idx);
    S.pickupSpr = pickupSprite();
    // player in the first room
    const start = gen.rooms[0];
    S.px = start.cx + 0.5; S.py = start.cy + 0.5;
    const tgt = gen.rooms[1] || start;
    S.pa = Math.atan2(tgt.cy - start.cy, tgt.cx - start.cx);
    const dist = bfs(S.map, start.cx, start.cy);
    const r = gen.rnd;
    const cells = [];
    for (let i = 0; i < MW * MH; i++) if (dist[i] >= 7) cells.push(i);
    if (!cells.length) for (let i = 0; i < MW * MH; i++) if (dist[i] >= 3) cells.push(i);
    const swarm = level.abilities.includes('swarm');
    const count = Math.round(diff.count * (swarm ? 1.5 : 1));
    for (let k = 0; k < count; k++) {
      const c = cells[Math.floor(r() * cells.length)];
      spawn((c % MW) + 0.3 + r() * 0.4, ((c / MW) | 0) + 0.3 + r() * 0.4, { small: swarm });
    }
    if (diff.boss) {
      let far = cells[0];
      for (const c of cells) if (dist[c] > dist[far]) far = c;
      const b = spawn((far % MW) + 0.5, ((far / MW) | 0) + 0.5, { boss: true });
      S.boss = b;
    }
    S.paused = true;
    hud();
  }

  function pickupSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const q = c.getContext('2d');
    q.fillStyle = '#3a2a1a'; q.fillRect(12, 6, 8, 5);
    q.fillStyle = '#e8dcc0'; q.beginPath(); q.moveTo(10, 11); q.lineTo(22, 11); q.lineTo(26, 30); q.lineTo(6, 30); q.closePath(); q.fill();
    q.fillStyle = '#c81010'; q.fillRect(8, 18, 16, 12);
    q.fillStyle = '#ff5a4a'; q.fillRect(10, 19, 4, 9);
    return { w: 32, h: 32, data: new Uint32Array(q.getImageData(0, 0, 32, 32).data.buffer) };
  }

  function spawn(x, y, { small = false, boss = false, child = false, gen = 0, size } = {}) {
    if (S.mons.length >= MAX_MONSTERS) return null;
    const d = S.diff, ab = S.level.abilities;
    const abilities = new Set(ab);
    if (boss) { abilities.add('shoot'); if (S.idx >= 19) abilities.add('summon'); if (S.idx >= 29) abilities.add('scream'); }
    if (child) { abilities.clear(); abilities.add('melee'); }
    let hp = d.hp * (small ? 0.55 : 1);
    let sz = size ?? (small ? 0.72 : 1);
    if (boss) { hp = d.hp * 14 + 12; sz = 1.75; }
    if (child) { hp = Math.max(1, d.hp * 0.35); sz = size ?? 0.55; }
    const m = {
      x, y, hp, maxHp: hp, size: sz, boss, child, gen, small,
      ab: abilities, speed: 1.45 * d.speed * (small ? 1.2 : 1) * (child ? 1.35 : 1) * (boss ? 0.8 : 1),
      dmg: d.dmg * (boss ? 1.4 : 1) * (child ? 0.5 : 1), atkCd: 0.5, cd: { shoot: 1 + Math.random() * 2, heal: 2.5, teleport: 3 + Math.random() * 3, summon: 3 + Math.random() * 3, scream: 4 + Math.random() * 4, charge: 1.5 + Math.random() * 2, web: 2 + Math.random() * 2 },
      awake: boss && S.idx >= 30, los: false, losT: Math.random() * 0.2, dist: 99, anim: Math.random() * 10, atkAnim: 0, hitT: 0,
      charge: 0, chargeDir: [0, 0], phase: Math.random() * TAU, dying: 0, summoned: 0, z: 0, id: Math.random(),
    };
    S.mons.push(m); S.total++;
    return m;
  }

  // -------- helpers --------
  const solid = (x, y) => { const X = x | 0, Y = y | 0; return X < 0 || Y < 0 || X >= MW || Y >= MH || S.map[Y * MW + X] !== 0; };
  function moveBody(o, dx, dy, r) {
    const nx = o.x + dx;
    if (!solid(nx + Math.sign(dx) * r, o.y - r) && !solid(nx + Math.sign(dx) * r, o.y + r)) o.x = nx;
    const ny = o.y + dy;
    if (!solid(o.x - r, ny + Math.sign(dy) * r) && !solid(o.x + r, ny + Math.sign(dy) * r)) o.y = ny;
  }
  function lineOfSight(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
    const n = Math.ceil(d / 0.2);
    for (let i = 1; i < n; i++) if (solid(ax + (dx * i) / n, ay + (dy * i) / n)) return false;
    return true;
  }
  function castRay(ox, oy, rdx, rdy) {
    let mx = ox | 0, my = oy | 0;
    const ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
    const sx = rdx < 0 ? -1 : 1, sy = rdy < 0 ? -1 : 1;
    let sdx = rdx < 0 ? (ox - mx) * ddx : (mx + 1 - ox) * ddx;
    let sdy = rdy < 0 ? (oy - my) * ddy : (my + 1 - oy) * ddy;
    let side = 0, cell = 1;
    for (let k = 0; k < 64; k++) {
      if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
      if (mx < 0 || my < 0 || mx >= MW || my >= MH) { cell = 1; break; }
      cell = S.map[my * MW + mx];
      if (cell) break;
    }
    const dist = side === 0 ? sdx - ddx : sdy - ddy;
    let wx = side === 0 ? oy + dist * rdy : ox + dist * rdx;
    wx -= Math.floor(wx);
    return { dist: Math.max(0.0001, dist), side, cell, mx, my, wx, rdx, rdy };
  }
  function part(x, y, z, vx, vy, vz, life, col, size = 0.05, grav = 3) { if (S.parts.length < 400) S.parts.push({ x, y, z, vx, vy, vz, life, max: life, col, size, grav }); }
  function burst(x, y, z, n, col, spd = 2, size = 0.05) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = Math.random() * spd; part(x, y, z, Math.cos(a) * s, Math.sin(a) * s, Math.random() * spd, 0.4 + Math.random() * 0.6, col, size); } }
  function hurt(dmg, kind = 'hit') {
    if (!S.alive || S.done) return;
    S.hp -= dmg;
    if (kind !== 'gaze') {
      S.hurtT = Math.min(1, S.hurtT + 0.35 + dmg / 60);
      audio.burst(0.25, 120, 1, 0.35, 'lowpass');
      cb.onEvent('hurt', { dmg, kind });
    }
    if (S.hp <= 0) { S.hp = 0; S.alive = false; audio.tone(180, 1.6, 'sawtooth', 0.25, 30); hud(); cb.onDeath(stats()); return; }
    if (kind !== 'gaze') hud();
  }
  function stats() { return { idx: S.idx, hp: Math.max(0, S.hp), kills: S.kills, total: S.total, shots: S.shots, hits: S.hits, acc: S.shots ? S.hits / S.shots : 0, time: S.levelTime }; }
  function alive() { let n = 0; for (const m of S.mons) if (!m.dying) n++; return n; }
  function hud() { cb.onHud({ hp: Math.max(0, Math.round(S.hp)), bombs: S.bombs, left: alive(), total: S.total, boss: S.boss && !S.boss.dying && S.boss.hp > 0 ? S.boss.hp / S.boss.maxHp : S.boss ? 0 : null, gaze: S.gazeK, slow: S.slowT > 0 }); }

  function killMonster(m) {
    if (m.dying) return;
    m.dying = 0.0001; m.hp = 0; S.kills++;
    S.hp = Math.min(100, S.hp + (m.boss ? 25 : 3)); // the paint you return gives a little life back
    const col = `rgb(${S.accent.join(',')})`;
    burst(m.x, m.y, 0.4 * m.size, 14, col, 2.5, 0.06);
    audio.tone(320 + Math.random() * 60, 0.6, 'sawtooth', 0.12, 50);
    audio.burst(0.5, 2400, 2, 0.08, 'bandpass', 300);
    // fly back into the nearest empty frame
    let best = null, bd = 1e9;
    for (const f of S.frames) if (!f.filled && !f.claimed) { const d = (f.fx - m.x) ** 2 + (f.fy - m.y) ** 2; if (d < bd) { bd = d; best = f; } }
    if (best) best.claimed = true;
    S.souls.push({ x: m.x, y: m.y, z: 0.5 * m.size, sx: m.x, sy: m.y, f: best, t: 0, dur: best ? 0.5 + Math.min(1.5, Math.sqrt(bd) * 0.06) : 1 });
    // split into two lesser selves
    if (m.ab.has('split') && m.gen < 1 && !m.child) for (let k = 0; k < 2; k++) { const c = spawn(m.x + (k ? 0.2 : -0.2), m.y, { gen: 1, size: m.size * 0.62, small: true }); if (c) { c.hp = c.maxHp = Math.max(1, m.maxHp * 0.4); c.awake = true; c.ab.delete('split'); } }
    if (m.boss || Math.random() < (S.idx > 25 ? 0.14 : 0.2)) S.pickups.push({ x: m.x, y: m.y, kind: 'hp', t: 0 });
    if (m.boss) { S.pickups.push({ x: m.x + 0.3, y: m.y, kind: 'hp', t: 0 }, { x: m.x - 0.3, y: m.y, kind: 'bomb', t: 0 }); cb.onEvent('boss', {}); }
    cb.onKill({ boss: m.boss, child: m.child || m.gen > 0, idx: S.idx });
    hud();
  }
  function damage(m, dmg) {
    m.hp -= dmg; m.hitT = 0.12; m.awake = true;
    if (m.hp <= 0) killMonster(m);
  }

  // -------- player actions --------
  function fire() {
    S.shots++; S.fireT = 1 / FIRE_RATE; S.recoil = 1; S.flashT = 0.06;
    audio.burst(0.09, 1800, 0.8, 0.12, 'highpass');
    const dx = Math.cos(S.pa), dy = Math.sin(S.pa), lx = -dy, ly = dx;
    const wall = castRay(S.px, S.py, dx, dy).dist;
    let best = null, bd = wall;
    for (const m of S.mons) {
      if (m.dying) continue;
      const rx = m.x - S.px, ry = m.y - S.py;
      const depth = rx * dx + ry * dy;
      if (depth <= 0.15 || depth >= bd) continue;
      const lat = Math.abs(rx * lx + ry * ly);
      const rad = 0.3 * m.size * (S.touch ? 1.7 : 1.1) + 0.02 * depth;
      if (lat < rad) { best = m; bd = depth; }
    }
    if (best) {
      S.hits++;
      damage(best, 1);
      burst(best.x - dx * 0.2, best.y - dy * 0.2, 0.45 * best.size + best.z, 5, `rgb(${S.accent.join(',')})`, 1.6, 0.04);
      if (!best.dying) audio.tone(140, 0.08, 'square', 0.06, 90);
    } else {
      const hx = S.px + dx * (wall - 0.05), hy = S.py + dy * (wall - 0.05);
      burst(hx, hy, 0.5, 4, `rgb(${S.accent.join(',')})`, 0.8, 0.03);
    }
  }
  function bomb() {
    if (S.bombs <= 0) return;
    S.bombs--; S.flashT = 0.25;
    audio.burst(0.9, 300, 0.5, 0.5, 'lowpass', 60);
    for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; part(S.px, S.py, 0.3, Math.cos(a) * 6, Math.sin(a) * 6, 1, 0.6, '#d8f0c0', 0.08, 0); }
    for (const m of S.mons) if (!m.dying && Math.hypot(m.x - S.px, m.y - S.py) < BOMB_R) damage(m, 6 + S.diff.hp * 1.5);
    for (const p of S.projs) if (Math.hypot(p.x - S.px, p.y - S.py) < BOMB_R) p.dead = true;
    cb.onEvent('bomb', {});
    hud();
  }

  // -------- update --------
  function update(dt) {
    if (S.paused || S.done) return;
    S.t += dt; S.levelTime += dt;
    if (!S.alive) { S.hurtT = Math.max(0.6, S.hurtT); return; }
    // flow field toward the player
    const pc = (S.py | 0) * MW + (S.px | 0);
    if (pc !== S.flowCell) { S.flow = bfs(S.map, S.px | 0, S.py | 0); S.flowCell = pc; }
    // movement
    S.slowT -= dt;
    const slow = (S.slowT > 0 ? 0.45 : 1) * (1 - S.gazeK * 0.45);
    S.pa += ctl.turn * dt * 2.6 + ctl.look; ctl.look = 0;
    const dx = Math.cos(S.pa), dy = Math.sin(S.pa);
    let mvx = dx * ctl.fwd - dy * ctl.strafe, mvy = dy * ctl.fwd + dx * ctl.strafe;
    const ml = Math.hypot(mvx, mvy);
    if (ml > 1) { mvx /= ml; mvy /= ml; }
    const sp = PLAYER_SPEED * slow * dt;
    const pl = { x: S.px, y: S.py };
    moveBody(pl, mvx * sp, mvy * sp, PLAYER_R);
    S.px = pl.x; S.py = pl.y;
    S.bob += ml * dt * 9;
    // aim assist on touch screens
    if (S.touch) {
      let bestA = 0.14, tgt = null;
      for (const m of S.mons) { if (m.dying || !m.los || m.dist > 9) continue; let a = Math.atan2(m.y - S.py, m.x - S.px) - S.pa; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < bestA) { bestA = Math.abs(a); tgt = a; } }
      if (tgt != null) S.pa += tgt * Math.min(1, dt * 5);
    }
    // weapons
    S.fireT -= dt; S.recoil = Math.max(0, S.recoil - dt * 8); S.flashT -= dt;
    if (ctl.fire && S.fireT <= 0) fire();
    if (ctl.bomb) { ctl.bomb = false; bomb(); }
    S.hurtT = Math.max(0, S.hurtT - dt * 1.2);
    S.screamT = Math.max(0, S.screamT - dt);
    // creeping darkness: the lantern falters in the late halls
    if (S.idx >= 14 && Math.random() < dt * (0.05 + S.idx * 0.004)) S.flicker = 0.12 + Math.random() * 0.25;
    S.flicker = Math.max(0, S.flicker - dt);
    // monsters
    let gaze = 0;
    const awakeRange = 6.5 + (S.idx / 39) * 6;
    for (const m of S.mons) {
      if (m.dying) { m.dying += dt; continue; }
      m.anim += dt * (m.charge > 0 ? 14 : 6) * (m.awake ? 1 : 0.3);
      m.hitT -= dt; m.atkAnim -= dt; m.atkCd -= dt;
      for (const k in m.cd) m.cd[k] -= dt;
      const rx = S.px - m.x, ry = S.py - m.y;
      m.dist = Math.hypot(rx, ry);
      m.losT -= dt;
      if (m.losT <= 0) { m.los = m.dist < 14 && lineOfSight(m.x, m.y, S.px, S.py); m.losT = 0.15 + Math.random() * 0.1; }
      if (!m.awake && ((m.los && m.dist < awakeRange) || m.dist < 2.2)) { m.awake = true; if (Math.random() < 0.6) audio.tone(70 + Math.random() * 30, 0.7, 'sawtooth', 0.08, 40); cb.onEvent('wake', {}); }
      const fly = m.ab.has('flight');
      m.z = fly ? 0.3 + Math.sin(S.t * 2.3 + m.phase) * 0.12 : 0;
      if (!m.awake) continue;
      const ux = rx / (m.dist || 1), uy = ry / (m.dist || 1);
      // --- abilities ---
      if (m.ab.has('gaze') && m.los && m.dist < 9) {
        let a = Math.atan2(-ry, -rx) - S.pa; a = Math.atan2(Math.sin(a), Math.cos(a));
        const k = 1 - Math.min(1, m.dist / 9);
        gaze = Math.max(gaze, k * (Math.abs(a) < 0.6 ? 1 : 0.55));
        hurt(m.dmg * 0.08 * dt * k, 'gaze');
      }
      if (m.ab.has('heal') && m.cd.heal <= 0) {
        m.cd.heal = 2.6;
        for (const o of S.mons) if (!o.dying && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 4 && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.3); burst(o.x, o.y, 0.6, 6, '#7dff9a', 0.8, 0.04); }
      }
      if (m.ab.has('teleport') && m.cd.teleport <= 0 && (m.los ? m.dist > 2.5 : m.dist > 5)) {
        m.cd.teleport = 4.5 - (S.idx / 39) * 1.5;
        for (let tries = 0; tries < 12; tries++) {
          const a = Math.random() * TAU, d = 2.4 + Math.random() * 2;
          const tx = S.px + Math.cos(a) * d, ty = S.py + Math.sin(a) * d;
          if (!solid(tx, ty) && !solid(tx + 0.3, ty) && !solid(tx - 0.3, ty) && !solid(tx, ty + 0.3) && !solid(tx, ty - 0.3) && lineOfSight(tx, ty, S.px, S.py)) {
            burst(m.x, m.y, 0.5, 10, '#b070ff', 1.5, 0.05);
            m.x = tx; m.y = ty; m.los = true;
            burst(m.x, m.y, 0.5, 10, '#b070ff', 1.5, 0.05);
            audio.burst(0.35, 3000, 6, 0.08, 'bandpass', 600);
            break;
          }
        }
      }
      if (m.ab.has('summon') && m.cd.summon <= 0 && m.summoned < (m.boss ? 8 : 3) && m.dist < 12) {
        m.cd.summon = 5.5 - (S.idx / 39) * 2;
        const c = spawn(m.x + (Math.random() - 0.5) * 0.4, m.y + (Math.random() - 0.5) * 0.4, { child: true });
        if (c) { c.awake = true; m.summoned++; burst(c.x, c.y, 0.3, 8, '#ff3030', 1, 0.04); }
      }
      if (m.ab.has('scream') && m.cd.scream <= 0 && m.los && m.dist < 8) {
        m.cd.scream = 7 - (S.idx / 39) * 2; m.atkAnim = 0.8;
        S.screamT = 1.3;
        hurt(m.dmg * 0.45, 'scream');
        const pk = 0.8 / (m.dist || 1);
        const pp = { x: S.px, y: S.py }; moveBody(pp, rx * pk, ry * pk, PLAYER_R); S.px = pp.x; S.py = pp.y;
        audio.burst(1.1, 700, 3, 0.3, 'bandpass', 2600); audio.tone(520, 1, 'sawtooth', 0.08, 900);
        cb.onEvent('scream', {});
        for (const o of S.mons) if (Math.hypot(o.x - m.x, o.y - m.y) < 8) o.awake = true;
      }
      const shooter = m.ab.has('shoot'), webber = m.ab.has('web');
      if ((shooter && m.cd.shoot <= 0) || (webber && m.cd.web <= 0)) {
        if (m.los && m.dist < 11 && m.dist > 1.2) {
          const web = webber && (!shooter || Math.random() < 0.5);
          if (web) m.cd.web = 3.2 / S.diff.rate; else m.cd.shoot = (2.6 / S.diff.rate) * (m.boss ? 0.5 : 1);
          const spd = web ? 3.3 : 4.6 + S.diff.speed;
          m.atkAnim = 0.3;
          S.projs.push({ x: m.x + ux * 0.3, y: m.y + uy * 0.3, z: 0.45 * m.size + m.z, vx: ux * spd, vy: uy * spd, web, dmg: web ? m.dmg * 0.25 : m.dmg * 0.6, life: 4, col: web ? '#e8e8e0' : `rgb(${S.accent.join(',')})` });
          audio.tone(web ? 300 : 200, 0.18, 'triangle', 0.06, web ? 600 : 90);
        }
      }
      // --- movement ---
      let spd = m.speed;
      if (m.ab.has('charge')) {
        if (m.charge > 0) {
          m.charge -= dt;
          if (m.charge > 0.7) spd = 0; // winding up
          else { spd = m.speed * 3.4; moveBody(m, m.chargeDir[0] * spd * dt, m.chargeDir[1] * spd * dt, 0.22 * m.size); if (m.dist < 0.7 + 0.25 * m.size && m.atkCd <= 0) { m.atkCd = 0.8; m.atkAnim = 0.3; hurt(m.dmg * 1.3, 'charge'); m.charge = 0; } continue; }
        } else if (m.cd.charge <= 0 && m.los && m.dist < 7 && m.dist > 2) {
          m.cd.charge = 3.5 - (S.idx / 39) * 1.2; m.charge = 1.2; m.chargeDir = [ux, uy]; m.atkAnim = 0.5;
          audio.tone(90, 0.5, 'sawtooth', 0.12, 220);
        }
      }
      if (m.dist > 0.55 + 0.22 * m.size && spd > 0) {
        let mx, my;
        if (m.los || fly) { mx = ux; my = uy; }
        else {
          const cx = m.x | 0, cy = m.y | 0, here = S.flow[cy * MW + cx];
          let best = here < 0 ? 999 : here, bx = 0, by = 0;
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = S.flow[(cy + ay) * MW + cx + ax]; if (v >= 0 && v < best) { best = v; bx = ax; by = ay; } }
          const tx = cx + bx + 0.5, ty = cy + by + 0.5;
          const l = Math.hypot(tx - m.x, ty - m.y) || 1; mx = (tx - m.x) / l; my = (ty - m.y) / l;
        }
        if (fly) { const w = Math.sin(S.t * 3 + m.phase) * 0.9; const ox = -my * w, oy = mx * w; mx += ox; my += oy; }
        moveBody(m, mx * spd * dt, my * spd * dt, 0.2 * Math.min(1.2, m.size));
      } else if (m.ab.has('melee') || m.child) {
        if (m.atkCd <= 0) {
          m.atkCd = 1.15 / S.diff.rate; m.atkAnim = 0.28;
          hurt(m.dmg, 'melee');
          if (m.ab.has('devour')) { m.hp = Math.min(m.maxHp * 1.5, m.hp + m.maxHp * 0.3); m.maxHp = Math.max(m.maxHp, m.hp); m.size = Math.min(m.boss ? 2.2 : 1.6, m.size * 1.07); audio.burst(0.3, 200, 2, 0.15, 'lowpass'); }
        }
      }
    }
    S.gazeK += (gaze - S.gazeK) * Math.min(1, dt * 4);
    // separation
    const ms = S.mons;
    for (let i = 0; i < ms.length; i++) { const a = ms[i]; if (a.dying) continue; for (let j = i + 1; j < ms.length; j++) { const b = ms[j]; if (b.dying) continue; const ddx = b.x - a.x, ddy = b.y - a.y, d = Math.hypot(ddx, ddy), min = 0.2 * (a.size + b.size); if (d < min && d > 0.0001) { const push = (min - d) * 0.5 / d; moveBody(a, -ddx * push, -ddy * push, 0.18); moveBody(b, ddx * push, ddy * push, 0.18); } } }
    // projectiles
    for (const p of S.projs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; burst(p.x - p.vx * dt, p.y - p.vy * dt, p.z, 4, p.col, 0.8, 0.03); continue; }
      if (Math.hypot(p.x - S.px, p.y - S.py) < 0.32) {
        p.dead = true; hurt(p.dmg, p.web ? 'web' : 'shot');
        if (p.web) S.slowT = 2.5;
      }
    }
    S.projs = S.projs.filter((p) => !p.dead);
    // particles
    for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt; p.vx *= 0.96; p.vy *= 0.96; if (p.z < 0) { p.z = 0; p.vz *= -0.3; } p.life -= dt; }
    S.parts = S.parts.filter((p) => p.life > 0);
    // souls flying home
    for (const s of S.souls) {
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      if (s.f) { const e = k * k * (3 - 2 * k); s.x = s.sx + (s.f.fx - s.sx) * e; s.y = s.sy + (s.f.fy - s.sy) * e; s.z = 0.5 + Math.sin(k * Math.PI) * 0.4; }
      else { s.z += dt * 0.8; }
      if (Math.random() < 0.6) part(s.x, s.y, s.z, 0, 0, 0.2, 0.4, `rgb(${S.accent.join(',')})`, 0.035, 0);
      if (k >= 1 && !s.done) {
        s.done = true;
        if (s.f) { s.f.filled = true; S.map[s.f.y * MW + s.f.x] = 2; audio.tone(660, 0.4, 'sine', 0.06, 990); }
      }
    }
    S.souls = S.souls.filter((s) => !s.done);
    S.mons = S.mons.filter((m) => !(m.dying && m.dying > 0.4));
    // pickups
    for (const p of S.pickups) {
      p.t += dt;
      if (Math.hypot(p.x - S.px, p.y - S.py) < 0.55) {
        if (p.kind === 'hp' && S.hp < 100) { S.hp = Math.min(100, S.hp + 22); p.got = true; audio.tone(440, 0.25, 'triangle', 0.1, 660); cb.onEvent('pickup', { kind: 'hp' }); }
        if (p.kind === 'bomb') { S.bombs++; p.got = true; audio.tone(330, 0.25, 'triangle', 0.1, 880); cb.onEvent('pickup', { kind: 'bomb' }); }
        if (p.got) hud();
      }
    }
    S.pickups = S.pickups.filter((p) => !p.got);
    if (Math.floor(S.t * 4) !== Math.floor((S.t - dt) * 4)) hud();
    // the level is restored when every monster is back in a painting
    if (!S.done && alive() === 0 && !S.souls.length) { S.done = true; audio.tone(220, 1.5, 'sine', 0.12, 440); cb.onClear(stats()); }
  }

  // -------- render --------
  function render() {
    if (!buf || !S.level) return;
    const W = RW, H = RH, half = H >> 1;
    const dx = Math.cos(S.pa), dy = Math.sin(S.pa);
    const plx = -dy * planeLen, ply = dx * planeLen;
    const [fr, fg, fb] = S.fogRGB;
    const lantern = (1 + Math.sin(S.t * 13) * Math.sin(S.t * 7.3) * 0.05 + (S.flashT > 0 ? 0.35 : 0)) * (S.flicker > 0 ? 0.25 : 1);
    const fogK = S.fogK;
    const fogAt = (d) => clamp(lantern / (1 + d * d * fogK), 0, 1);
    const horizon = half;
    // floor + ceiling
    const fT = S.floorT, cT = S.ceilT;
    const rdx0 = dx - plx, rdy0 = dy - ply, rdx1 = dx + plx, rdy1 = dy + ply;
    for (let y = horizon + 1; y < H; y++) {
      const p = y - horizon;
      const rowD = proj * 0.5 / p;
      const f = (fogAt(rowD) * 256) | 0, nf = 256 - f;
      const frr = fr * nf, fgg = fg * nf, fbb = fb * nf;
      const stX = (rowD * (rdx1 - rdx0)) / W, stY = (rowD * (rdy1 - rdy0)) / W;
      let wx = S.px + rowD * rdx0, wy = S.py + rowD * rdy0;
      const yo = y * W, yc = (2 * horizon - y) * W;
      for (let x = 0; x < W; x++) {
        const tx = ((wx * T) | 0) & (T - 1), ty = ((wy * T) | 0) & (T - 1);
        wx += stX; wy += stY;
        let c = fT[ty * T + tx];
        buf[yo + x] = 0xff000000 | ((((c >> 16) & 255) * f + fbb) >> 8 << 16) | ((((c >> 8) & 255) * f + fgg) >> 8 << 8) | (((c & 255) * f + frr) >> 8);
        if (yc >= 0) { c = cT[ty * T + tx]; buf[yc + x] = 0xff000000 | ((((c >> 16) & 255) * f + fbb) >> 8 << 16) | ((((c >> 8) & 255) * f + fgg) >> 8 << 8) | (((c & 255) * f + frr) >> 8); }
      }
    }
    // horizon row
    for (let x = 0; x < W; x++) buf[horizon * W + x] = 0xff000000 | (fb << 16) | (fg << 8) | fr;
    // walls
    for (let x = 0; x < W; x++) {
      const cam = (2 * x) / W - 1;
      const hit = castRay(S.px, S.py, dx + plx * cam, dy + ply * cam);
      const d = hit.dist;
      zbuf[x] = d;
      const lh = proj / d;
      let y0 = Math.floor(horizon - lh / 2), y1 = Math.floor(horizon + lh / 2);
      const tex = S.tex[clamp(hit.cell - 1, 0, 2)];
      let tx = (hit.wx * T) | 0;
      if ((hit.side === 0 && hit.rdx > 0) || (hit.side === 1 && hit.rdy < 0)) tx = T - tx - 1;
      const shadeK = hit.side ? 0.72 : 1;
      const f = (fogAt(d) * shadeK * 256) | 0, nf = 256 - (fogAt(d) * 256 | 0);
      const frr = fr * nf, fgg = fg * nf, fbb = fb * nf;
      const step = T / lh;
      let tp = (Math.max(0, y0) - (horizon - lh / 2)) * step;
      const ys = Math.max(0, y0), ye = Math.min(H - 1, y1);
      for (let y = ys; y <= ye; y++) {
        const c = tex[((tp | 0) & (T - 1)) * T + tx]; tp += step;
        buf[y * W + x] = 0xff000000 | ((((c >> 16) & 255) * f + fbb) >> 8 << 16) | ((((c >> 8) & 255) * f + fgg) >> 8 << 8) | (((c & 255) * f + frr) >> 8);
      }
    }
    // billboards, far to near
    const items = [];
    const view = (x, y) => { const rx = x - S.px, ry = y - S.py; return [rx * dx + ry * dy, rx * -dy + ry * dx]; };
    for (const m of S.mons) { const [dp, lat] = view(m.x, m.y); if (dp > 0.1) items.push({ k: 0, o: m, dp, lat }); }
    for (const p of S.pickups) { const [dp, lat] = view(p.x, p.y); if (dp > 0.1) items.push({ k: 1, o: p, dp, lat }); }
    for (const p of S.projs) { const [dp, lat] = view(p.x, p.y); if (dp > 0.1) items.push({ k: 2, o: p, dp, lat }); }
    for (const p of S.parts) { const [dp, lat] = view(p.x, p.y); if (dp > 0.1) items.push({ k: 3, o: p, dp, lat }); }
    for (const p of S.souls) { const [dp, lat] = view(p.x, p.y); if (dp > 0.1) items.push({ k: 4, o: p, dp, lat }); }
    items.sort((a, b) => b.dp - a.dp);
    for (const it of items) {
      const sxc = W / 2 + (proj * it.lat) / it.dp;
      const fl = (fogAt(it.dp) * 256) | 0;
      if (it.k === 0) {
        const m = it.o;
        const fr0 = m.atkAnim > 0 || m.charge > 0.7 ? 2 : (Math.floor(m.anim) & 1);
        const spr = S.sprites[fr0];
        const sz = m.size * (m.dying ? 1 - m.dying * 2 : 1);
        if (sz <= 0.02) continue;
        const sh = (proj * sz) / it.dp;
        const bottom = horizon + proj * (0.5 - m.z) / it.dp;
        const top = bottom - sh;
        const ghost = m.ab.has('invisible') && m.dist > 2.6 && m.hitT <= 0 ? 1 : 0;
        const flash = m.hitT > 0 || m.dying;
        drawSprite(spr, sxc, top, sh, it.dp, fl, flash, ghost, m.charge > 0.7);
      } else if (it.k === 1) {
        const sh = (proj * 0.28) / it.dp;
        const bottom = horizon + proj * (0.5 - 0.05 * Math.sin(it.o.t * 4) - 0.05) / it.dp;
        drawSprite(it.o.kind === 'bomb' ? S.pickupSpr : S.pickupSpr, sxc, bottom - sh, sh, it.dp, Math.min(256, fl + 80), false, 0, it.o.kind === 'bomb');
      } else {
        const p = it.o;
        const r = (proj * (it.k === 2 ? 0.09 : it.k === 4 ? 0.12 : p.size)) / it.dp;
        const cy = horizon + proj * (0.5 - p.z) / it.dp;
        const col = it.k === 4 ? `rgb(${S.accent.join(',')})` : p.col;
        dot(sxc, cy, Math.max(0.6, r), col, it.dp, it.k === 3 ? clamp(p.life / p.max, 0, 1) : 1, it.k !== 3);
      }
    }
    // scream: rows tear sideways
    if (S.screamT > 0) {
      const amp = S.screamT * 10;
      for (let y = 0; y < H; y++) {
        const off = Math.round(Math.sin(y * 0.12 + S.t * 30) * amp * Math.sin(y * 0.031 + S.t * 3));
        if (!off) continue;
        const row = buf.subarray(y * W, y * W + W);
        if (off > 0) row.copyWithin(off, 0, W - off); else row.copyWithin(0, -off, W);
      }
    }
    g.putImageData(img, 0, 0);
    // dots and souls are drawn by 2D after the pixel pass
    for (const dd of dotQueue) { g.globalAlpha = dd.a; g.fillStyle = dd.c; g.beginPath(); g.arc(dd.x, dd.y, dd.r, 0, TAU); g.fill(); if (dd.glow) { g.globalAlpha = dd.a * 0.25; g.beginPath(); g.arc(dd.x, dd.y, dd.r * 2.2, 0, TAU); g.fill(); } }
    g.globalAlpha = 1; dotQueue.length = 0;
    drawWeapon();
  }
  const dotQueue = [];
  function dot(x, y, r, c, dp, a, glow) {
    const xi = Math.round(x);
    if (xi < 0 || xi >= RW || zbuf[xi] < dp) return;
    dotQueue.push({ x, y, r, c, a, glow });
  }
  function drawSprite(spr, cx, top, sh, dp, fl, flash, ghost, glowEyes) {
    const W = RW, H = RH;
    const x0 = Math.round(cx - sh / 2), x1 = Math.round(cx + sh / 2);
    const y0 = Math.round(top), y1 = Math.round(top + sh);
    const step = spr.w / sh;
    const [fr, fg, fb] = S.fogRGB;
    const nf = 256 - fl;
    const frr = fr * nf, fgg = fg * nf, fbb = fb * nf;
    const data = spr.data, sw = spr.w;
    const ph = (S.t * 20) | 0;
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      if (zbuf[x] < dp) continue;
      const tx = ((x - (cx - sh / 2)) * step) | 0;
      if (tx < 0 || tx >= sw) continue;
      for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
        if (ghost && ((x + y + ph) % 4)) continue;
        const ty = ((y - top) * step) | 0;
        if (ty < 0 || ty >= spr.h) continue;
        const c = data[ty * sw + tx];
        if ((c >>> 24) < 120) continue;
        if (flash) { buf[y * W + x] = 0xfff0f0ff; continue; }
        let r = c & 255, gg = (c >> 8) & 255, b = (c >> 16) & 255;
        if (glowEyes && r > 150 && gg < 60) { buf[y * W + x] = 0xff2020ff; continue; }
        buf[y * W + x] = 0xff000000 | (((b * fl + fbb) >> 8) << 16) | (((gg * fl + fgg) >> 8) << 8) | ((r * fl + frr) >> 8);
      }
    }
  }
  function drawWeapon() {
    const W = RW, H = RH;
    const u = Math.min(W * 1.1, H) / 165;
    const bx = W / 2 + Math.sin(S.bob) * 6 * u + W * 0.12, by = H + Math.abs(Math.cos(S.bob)) * 5 * u + S.recoil * 10 * u;
    g.save(); g.translate(bx, by); g.scale(u, u);
    // arm and paint gun: a brass brush-cannon
    g.fillStyle = '#2a1a14'; g.fillRect(14, -40, 30, 40);
    g.fillStyle = '#4a2c1a'; g.beginPath(); g.moveTo(-6, -62); g.lineTo(26, -62); g.lineTo(34, 0); g.lineTo(-14, 0); g.closePath(); g.fill();
    g.fillStyle = '#b08a3a'; g.fillRect(-2, -78, 22, 18);
    g.fillStyle = '#d8b050'; g.fillRect(0, -78, 6, 18);
    g.fillStyle = '#1a1010'; g.fillRect(2, -96, 16, 20);
    const ac = `rgb(${S.accent.join(',')})`;
    g.fillStyle = ac; g.fillRect(3, -100, 14, 8);
    g.fillRect(6, -92, 3, 6 + Math.sin(S.t * 3) * 2);
    if (S.flashT > 0) { g.globalAlpha = 0.85; g.fillStyle = ac; g.beginPath(); g.arc(10, -108, 12 + Math.random() * 6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(10, -108, 5, 0, TAU); g.fill(); g.globalAlpha = 1; }
    g.restore();
  }

  // -------- loop --------
  let raf = 0, last = 0, frameMs = 16, running = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    const t0 = performance.now();
    update(dt);
    render();
    frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
  }
  function run() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function halt() { running = false; cancelAnimationFrame(raf); }

  return {
    S, ctl, audio, resize, load, run, halt, render,
    get frameMs() { return frameMs; },
    get size() { return { w: RW, h: RH }; },
    alive,
    setPaused(p) { S.paused = p; if (!p) audio.start(); },
    step(n = 1, dt = 1 / 60) { const p = S.paused; S.paused = false; for (let i = 0; i < n; i++) update(dt); S.paused = p; },
    killAll() { for (const m of S.mons.slice()) if (!m.dying) { S.shots++; S.hits++; killMonster(m); } },
    hurt,
    destroy() { halt(); audio.stop(); },
  };
}
