// The museum engine (Three.js). It runs one level at a time and hands the level a `ctx` object:
// everything a level may touch is on ctx, documented in docs/museo-livelli.md.
import * as THREE from 'three';
import { createPostFX, FX_DEFAULTS } from './postfx.js';
import { createMap, CELL } from './map.js';
import { buildMonster, BEHAVIORS, PARTS } from './monsters.js';
import { createWeapon } from './weapon.js';
import { makeAudio } from './audio.js';
import { loadImage, crop, cutout, texture, wallFrom } from './art.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const MIRROR_LAYER = 2;

export const ZONES_DEFAULT = {
  ice: { speed: 1.1, friction: 0.06 },
  mud: { speed: 0.5, friction: 1 },
  water: { speed: 0.45, friction: 0.5 },
  blood: { speed: 0.8, friction: 0.5 },
};

// difficulty for level n (1..15): gentle start, brutal from 13
export function difficulty(n) {
  const d = clamp((n - 1) / 14, 0, 1);
  const k = d < 0.8 ? d : 0.8 + (d - 0.8) * 2; // the last three levels jump
  return { diff: d, D: { hp: 1 + k * 1.6, speed: 1 + k * 0.55, dmg: 1 + k * 1.3, rate: 1 + k * 1.4, count: 1 + k * 1.2 } };
}

function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function createEngine(canvas, hooks = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
  const post = createPostFX(renderer);
  const weapon = createWeapon();
  const audio = makeAudio();
  const coarse = matchMedia('(pointer: coarse)').matches;

  let scene, camera, rearCam, map, lantern, ambient, ctx = null, level = null;
  let cssW = 800, cssH = 500;
  const H = (k, ...a) => hooks[k]?.(...a);

  // ---------- input (filled by index.js) ----------
  const input = { fwd: 0, strafe: 0, lookX: 0, lookY: 0, fire: false, alt: false, altPressed: false, reload: false };

  // ---------- state ----------
  const S = { running: false, paused: true, done: false, dead: false, time: 0, levelTime: 0, kills: 0, shots: 0, hits: 0, frameMs: 16 };
  const gun = { ammo: 6, chambers: 6, reloadT: 0, reloadDur: 1.0, cd: 0, gap: 0.2, dmg: 1, spread: 0.004, auto: true };

  function resize(w, h) {
    cssW = Math.max(1, w); cssH = Math.max(1, h);
    const target = coarse ? 400 : 540;
    const k = Math.min(1, target / cssH);
    const rw = Math.round(cssW * k), rh = Math.round(cssH * k);
    renderer.setSize(rw, rh, false);
    post.setSize(rw, rh);
    if (camera) { camera.aspect = cssW / cssH; camera.updateProjectionMatrix(); }
    if (rearCam) { rearCam.aspect = 3; rearCam.updateProjectionMatrix(); }
    weapon.resize(cssW / cssH);
  }

  // ---------- level loading ----------
  // loads run one after the other: a second load waits for the first to finish, then replaces it,
  // so two quick clicks never mix two levels in the same scene
  let loading = Promise.resolve();
  function load(mod, n, opts = {}) {
    const p = loading.then(() => doLoad(mod, n, opts));
    loading = p.catch((e) => console.error(e));
    return p;
  }
  async function doLoad(mod, n, opts) {
    unload();
    level = mod;
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050302, 2, 26);
    scene.background = new THREE.Color(0x050302);
    camera = new THREE.PerspectiveCamera(72, cssW / cssH, 0.05, 200);
    camera.layers.enable(0);
    rearCam = new THREE.PerspectiveCamera(60, 3, 0.05, 200); rearCam.layers.enable(MIRROR_LAYER);
    ambient = new THREE.HemisphereLight(0xc8b8a0, 0x201008, 0.35); scene.add(ambient);
    lantern = new THREE.SpotLight(0xffe2b8, 40, 18, 0.6, 0.55, 1.3);
    scene.add(lantern, lantern.target);
    map = createMap(scene);
    Object.assign(S, { done: false, dead: false, levelTime: 0, kills: 0, shots: 0, hits: 0, paused: true });
    Object.assign(gun, { ammo: 6, chambers: 6, reloadT: 0, reloadDur: 1.0, cd: 0, gap: 0.2, dmg: 1, spread: 0.004, auto: true });
    weapon.setVisible(true); weapon.setHand(0x8a6a58); weapon.setPaint(mod.paint || '#8a0a08');
    ctx = makeCtx(mod, n, opts);
    const img = await loadImage(mod.image);
    ctx.art.image = img;
    ctx.art.texture = texture(img);
    await mod.setup?.(ctx);
    if (!map.width) map.build({ grid: ['#######', '#.....#', '#..P..#', '#.....#', '#######'] });
    const start = map.find('start')[0] || map.toWorld(1, 1);
    if (!ctx.player._placed) {
      ctx.player.pos.set(start.x, 0, start.z);
      // face the longest open direction, never a wall
      let best = 0;
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const d = map.rayWall(start.x, start.z, Math.sin(yaw), -Math.cos(yaw)); if (d > best) { best = d; ctx.player.yaw = yaw; } }
    }
    S.time = S.time || 0;
    hud();
    renderFrame(0);
  }

  function unload() {
    if (ctx) { try { level?.teardown?.(ctx); } catch (e) { console.error(e); } }
    if (scene) scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
    ctx = null; level = null; scene = null;
  }

  // ---------- the ctx given to levels ----------
  function makeCtx(mod, n, opts) {
    const { diff, D } = difficulty(n);
    const lang = opts.lang || 'it';
    const timers = [];
    const spawners = [];
    const colliders = [];
    const monsters = [];
    const projectiles = [];
    const pickups = [];
    const emitters = [];
    const bars = {};

    // particles: one shared cloud
    const PMAX = 900;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, sizeAttenuation: true, fog: true }));
    pts.frustumCulled = false; scene.add(pts);
    const parts = [];

    const player = {
      pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0,
      hp: mod.player?.hp ?? 100, maxHp: mod.player?.hp ?? 100,
      eye: 1.55, radius: 0.32, speed: mod.player?.speed ?? 5.4,
      speedMul: 1, lookMul: 1, frozen: false, aimShake: 0, invuln: 0, moving: 0, zone: null, _placed: false,
      get dir() { return new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw)); },
      get head() { return new THREE.Vector3(player.pos.x, player.eye, player.pos.z); },
      place(x, z, yaw = player.yaw) { player.pos.set(x, 0, z); player.vel.set(0, 0, 0); player.yaw = yaw; player._placed = true; },
      push(vx, vz) { player.vel.x += vx; player.vel.z += vz; },
      heal(v) { player.hp = Math.min(player.maxHp, player.hp + v); hud(); },
      hurt(v, from) { hurtPlayer(v, from); },
      // true if `pos` is inside the cone of sight (cos of the half angle, 0.9 ≈ 25°)
      isLookingAt(pos, cos = 0.9) {
        const f = camera.getWorldDirection(new THREE.Vector3());
        const d = new THREE.Vector3(pos.x, (pos.y || 0) + 1, pos.z).sub(camera.position).normalize();
        return f.dot(d) > cos;
      },
      sees(pos) { return map.los(player.pos.x, player.pos.z, pos.x, pos.z); },
    };

    const fx = { ...FX_DEFAULTS, ...(mod.fx || {}) };
    const view = { mirror: false, rear: false, fov: 72, shake: 0 };

    const monstersApi = {
      list: monsters,
      get alive() { return monsters.filter((m) => !m.dying && m.counts).length; },
      get kills() { return S.kills; },
      spawn: (def, pos, o) => spawnMonster(def, pos, o),
      kill: (m) => killMonster(m, null),
      remove: (m) => removeMonster(m),
      clear() { monsters.slice().forEach(removeMonster); },
      // walk towards a target around the walls (flow field to the player, straight line if visible)
      walkTo(m, target, speed, dt, flying = false) {
        let dx = target.x - m.pos.x, dz = target.z - m.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) { m.moving = 0; return; }
        const toPlayer = target === player.pos || target.distanceTo(player.pos) < 3;
        if (!map.los(m.pos.x, m.pos.z, target.x, target.z) && toPlayer) {
          const f = map.dirTo(m.pos.x, m.pos.z); if (f) { dx = f[0]; dz = f[1]; } else { dx /= d; dz /= d; }
        } else { dx /= d; dz /= d; }
        // keep apart from each other
        for (const o of monsters) { if (o === m || o.dying) continue; const ox = m.pos.x - o.pos.x, oz = m.pos.z - o.pos.z, l = ox * ox + oz * oz; if (l < 1 && l > 1e-4) { dx += ox / l * 0.3; dz += oz / l * 0.3; } }
        const step = Math.min(d - (toPlayer ? m.reach * 0.7 : 0), speed * dt);
        if (step <= 0) { m.moving = 0; return; }
        const l = Math.hypot(dx, dz) || 1;
        monstersApi.move(m, (dx / l) * step, (dz / l) * step);
        m.moving = 1;
      },
      move(m, dx, dz) {
        let x = m.pos.x + dx, z = m.pos.z + dz;
        if (!m.def.ghost) [x, z] = collideAll(x, z, m.r);
        m.pos.x = x; m.pos.z = z;
      },
      melee(m, dt, mul = 1) {
        m.atk = (m.atk ?? 0) - dt;
        const d = Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
        if (d < m.reach && m.atk <= 0) {
          m.atk = m.def.attackEvery ?? 0.9; m.lunge = 1;
          hurtPlayer(m.dmg * mul, m);
          m.def.onAttack?.(m, ctx);
        }
      },
      sees: (m) => map.los(m.pos.x, m.pos.z, player.pos.x, player.pos.z),
      behaviors: BEHAVIORS,
    };

    const c = {
      THREE, renderer, get scene() { return scene; }, get camera() { return camera; }, map, audio, weapon, gun, CELL,
      n, diff, D, lang, level: mod,
      t: (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.it),
      rand: seeded(n * 7919 + 13), get time() { return S.levelTime; }, get kills() { return S.kills; },
      fx, view, player, input, zones: { ...ZONES_DEFAULT, ...(mod.zones || {}) },
      monsters: monstersApi, PARTS, BEHAVIORS,
      art: {
        image: null, texture: null, load: loadImage,
        crop: (rect, max) => crop(c.art.image, rect, max),
        cutout: (spec) => cutout(c.art.image, spec),
        wall: (rect, o) => texture(wallFrom(c.art.image, rect, o), { repeat: true }),
        tex: (canvas, o) => texture(canvas, o),
      },
      spawn: (def, pos, o) => spawnMonster(def, pos, o),
      // automatic waves. Returns a handle with stop(), start(), spawned, done
      spawner(cfg) {
        const sp = { cfg, t: cfg.delay ?? 0, spawned: 0, on: true, done: false, stop() { sp.on = false; }, start() { sp.on = true; } };
        const first = cfg.first ?? 3;
        for (let i = 0; i < first; i++) spawnFrom(sp);
        spawners.push(sp);
        return sp;
      },
      shoot(from, o = {}) { return fireProjectile(from, o); },
      pickup(pos, o = {}) { return addPickup(pos, o); },
      particles: {
        burst: (pos, n2 = 12, color = 0x8a0a08, speed = 2.5, life = 0.9) => burst(pos, n2, color, speed, life),
        // continuous rain / embers: { area: [x0, z0, x1, z1], rate per second, color, fall (m/s), wind, life }
        emitter(o) { const e = { ...o, acc: 0, on: true, stop() { e.on = false; } }; emitters.push(e); return e; },
      },
      light({ ambient: a, color, ground, lantern: l, fog, sky } = {}) {
        if (a != null) ambient.intensity = a;
        if (color != null) ambient.color.set(color);
        if (ground != null) ambient.groundColor.set(ground);
        if (l === false) lantern.visible = false;
        else if (l) { lantern.visible = true; if (l.angle) lantern.angle = l.angle; if (l.range) lantern.distance = l.range; if (l.intensity != null) lantern.intensity = l.intensity; if (l.color) lantern.color.set(l.color); if (l.penumbra != null) lantern.penumbra = l.penumbra; }
        if (fog === false) scene.fog = null;
        else if (fog) scene.fog = fog.density ? new THREE.FogExp2(fog.color ?? 0x050302, fog.density) : new THREE.Fog(fog.color ?? 0x050302, fog.near ?? 2, fog.far ?? 26);
        if (sky != null) scene.background = sky.isTexture ? sky : new THREE.Color(sky);
      },
      action(cfg) { c._action = cfg; H('onEvent', 'action', cfg); },
      hud: {
        say: (text, ms = 2600) => H('onEvent', 'say', { text: c.t(text), ms }),
        whisper: (text) => H('onEvent', 'whisper', { text: c.t(text) }),
        bar(id, o) { bars[id] = { ...(bars[id] || {}), ...o, label: c.t(o.label ?? bars[id]?.label) }; },
        goal(label, value) { c._goal = { label: c.t(label), value }; },
        remove(id) { delete bars[id]; },
        boss: (m, name) => { c._boss = m ? { m, name: c.t(name ?? m.def.name) } : null; },
      },
      every(sec, fn) { const t = { every: sec, t: sec, fn }; timers.push(t); return { stop() { t.dead = true; } }; },
      after(sec, fn) { const t = { t: sec, fn, once: true }; timers.push(t); return { stop() { t.dead = true; } }; },
      add(obj) { scene.add(obj); return obj; },
      remove(obj) { scene.remove(obj); },
      // circular obstacle for player and monsters; returns a handle you can move or remove
      collider(x, z, r) { const o = { x, z, r, on: true, remove() { o.on = false; } }; colliders.push(o); return o; },
      goalKills(k) { c._goalKills = Math.round(k); },
      win() { if (!S.done && !S.dead) { S.done = true; H('onWin', stats()); } },
      lose() { if (!S.dead) { player.hp = 0; die(); } },
      _timers: timers, _spawners: spawners, _colliders: colliders, _monsters: monsters, _projectiles: projectiles, _pickups: pickups, _emitters: emitters, _bars: bars, _parts: parts, _pGeo: pGeo, _pPos: pPos, _pCol: pCol,
    };
    return c;
  }

  // ---------- helpers ----------
  function collideAll(x, z, r) {
    [x, z] = map.collide(x, z, r);
    for (const o of ctx._colliders) {
      if (!o.on) continue;
      const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), m = o.r + r;
      if (d < m && d > 1e-5) { x = o.x + dx / d * m; z = o.z + dz / d * m; }
    }
    return [x, z];
  }
  function burst(pos, n, color, speed = 2.5, life = 0.9) {
    const col = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      if (ctx._parts.length >= 900) ctx._parts.shift();
      const a = Math.random() * TAU, s = Math.random() * speed;
      ctx._parts.push({ x: pos.x, y: pos.y ?? 1, z: pos.z, vx: Math.cos(a) * s, vy: Math.random() * speed, vz: Math.sin(a) * s, life: life * (0.5 + Math.random() * 0.7), r: col.r, g: col.g, b: col.b, grav: 6 });
    }
  }
  function stats() { return { kills: S.kills, shots: S.shots, hits: S.hits, acc: S.shots ? S.hits / S.shots : 0, hp: Math.max(0, Math.round(ctx.player.hp)), maxHp: ctx.player.maxHp, time: S.levelTime }; }

  function hud() {
    if (!ctx) return;
    const p = ctx.player, b = ctx._boss;
    H('onHud', {
      hp: Math.max(0, Math.round(p.hp)), maxHp: p.maxHp, ammo: gun.ammo, max: gun.chambers, reloading: gun.reloadT > 0,
      alive: ctx.monsters.alive, kills: S.kills,
      goal: ctx._goal || (ctx._goalKills ? { label: ctx.t({ it: 'anime da rimandare', en: 'souls to send back' }), value: Math.max(0, ctx._goalKills - S.kills) } : null),
      boss: b && b.m && !b.m.dead ? { name: b.name, v: clamp(b.m.hp / b.m.maxHp, 0, 1) } : null,
      bars: Object.entries(ctx._bars).map(([id, v]) => ({ id, ...v })),
      rear: !!ctx.view.rear,
    });
  }

  // ---------- monsters ----------
  function spawnMonster(def, pos, o = {}) {
    const D = ctx.D, scale = def.fixed ? 1 : 1;
    const v = buildMonster(def, camera);
    const m = {
      def, view: v, pos: new THREE.Vector3(pos.x, 0, pos.z),
      hp: (def.hp ?? 3) * (def.fixed ? 1 : D.hp) * (o.hpMul ?? 1), speed: (def.speed ?? 2.2) * (def.fixed ? 1 : D.speed) * (o.speedMul ?? 1),
      dmg: (def.dmg ?? 10) * (def.fixed ? 1 : D.dmg), reach: def.reach ?? 1.3, r: def.radius ?? 0.4,
      lift: def.lift ?? 0, seed: Math.random() * 100, state: {}, anger: 0, moving: 0, lunge: 0, flash: 0, birth: o.instant ? 1 : 0,
      counts: o.fake ? false : def.counts !== false, fake: !!o.fake || def.fake === true, dying: 0, dead: false, frozen: false,
      pitch: def.pitch ?? 0.8 + Math.random() * 0.4, boss: !!def.boss, data: o.data || {},
      onlyInMirror: !!(o.onlyInMirror ?? def.onlyInMirror),
    };
    m.maxHp = m.hp; m.scale = scale;
    v.root.position.copy(m.pos);
    if (m.onlyInMirror) v.root.traverse((x) => x.layers.set(MIRROR_LAYER));
    scene.add(v.root);
    ctx._monsters.push(m);
    if (!o.instant) { burst({ x: m.pos.x, y: 0.2, z: m.pos.z }, 10, 0x2a1a10, 1.4); if (Math.random() < 0.5) audio.growl(m.pitch, 0.08); }
    def.onSpawn?.(m, ctx);
    if (m.boss) ctx.hud.boss(m);
    return m;
  }
  function removeMonster(m) {
    const i = ctx._monsters.indexOf(m); if (i >= 0) ctx._monsters.splice(i, 1);
    scene.remove(m.view.root);
    m.view.root.traverse((o) => { o.geometry?.dispose?.(); });
    m.view.mat.dispose();
  }
  function killMonster(m, shot) {
    if (m.dying) return;
    m.dying = 0.001; m.dead = true;
    const color = m.def.blood ?? 0x7a0608;
    burst({ x: m.pos.x, y: m.view.height * 0.6 + m.lift, z: m.pos.z }, 26, color, 3.2, 1.2);
    audio.splat(); if (Math.random() < 0.6) audio.scream(m.pitch * 0.7, 0.1);
    if (m.counts) S.kills++;
    m.def.onDeath?.(m, ctx, shot);
    level?.onKill?.(ctx, m, shot);
    if (m.counts) H('onKill', { boss: m.boss, def: m.def, n: ctx.n, score: m.def.score ?? 1 });
    if (ctx._goalKills && S.kills >= ctx._goalKills) ctx.after(0.6, () => ctx.win());
    hud();
  }
  function damage(m, dmg, shot) {
    if (m.dying || dmg <= 0) return;
    m.hp -= dmg; m.flash = 1; m.anger = Math.min(1, m.anger + 0.5);
    const back = new THREE.Vector3(m.pos.x - ctx.player.pos.x, 0, m.pos.z - ctx.player.pos.z).normalize().multiplyScalar(m.boss ? 0.04 : 0.22);
    if (!m.def.ghost) ctx.monsters.move(m, back.x, back.z);
    audio.flesh();
    if (m.hp <= 0) killMonster(m, shot);
  }

  function spawnFrom(sp) {
    const cfg = sp.cfg;
    if (cfg.total != null && sp.spawned >= Math.round(cfg.total)) { sp.done = true; return; }
    const alive = ctx._monsters.filter((m) => !m.dying && m._sp === sp).length;
    if (alive >= Math.round((cfg.max ?? 12) * (cfg.fixed ? 1 : Math.min(1.6, ctx.D.count)))) return;
    const kinds = cfg.kinds || [cfg.kind];
    const tot = kinds.reduce((a, k) => a + (k.w ?? 1), 0);
    let r = Math.random() * tot, pick = kinds[0];
    for (const k of kinds) { r -= k.w ?? 1; if (r <= 0) { pick = k; break; } }
    const def = pick.def || pick;
    let pos = null;
    const pp = ctx.player.pos;
    if (typeof cfg.where === 'function') pos = cfg.where(ctx, def);
    else if (cfg.where === 'around' || !map.find('spawn').length) pos = map.freeAround(pp.x, pp.z, cfg.min ?? 7, cfg.maxDist ?? 16, 1)[0];
    else {
      const pts = map.find('spawn').filter((p) => p.distanceTo(pp) > (cfg.min ?? 5));
      pos = pts[Math.floor(Math.random() * pts.length)];
    }
    if (!pos) return;
    const m = spawnMonster(def, pos, cfg.opts || {});
    m._sp = sp; sp.spawned++;
  }

  // ---------- projectiles & pickups ----------
  function fireProjectile(from, o) {
    const p0 = from.pos ? new THREE.Vector3(from.pos.x, (from.view?.height ?? 1.6) * 0.65 + (from.lift || 0), from.pos.z) : from.clone();
    const target = ctx.player.head.add(new THREE.Vector3(0, -0.2, 0));
    const dir = (o.dir || target.sub(p0)).normalize();
    const speed = (o.speed ?? 7) * (o.fixed ? 1 : Math.sqrt(ctx.D.speed));
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.size ?? 0.14, 8, 6), new THREE.MeshBasicMaterial({ color: o.color ?? 0xb02010, fog: true }));
    mesh.position.copy(p0); scene.add(mesh);
    const pr = { mesh, vel: dir.multiplyScalar(speed), dmg: (o.dmg ?? 8) * (o.fixed ? 1 : ctx.D.dmg), life: o.life ?? 4, from, onHit: o.onHit, trail: o.trail ?? o.color ?? 0x5a0a06 };
    ctx._projectiles.push(pr);
    audio.burst(0.18, 500, 2, 0.12, 'bandpass', 200);
    return pr;
  }
  function addPickup(pos, o) {
    const color = o.color ?? (o.kind === 'life' ? 0xffd070 : o.kind === 'ammo' ? 0xc8a040 : 0xd02020);
    const mesh = o.mesh || new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 }));
    mesh.position.set(pos.x, 0.8, pos.z); scene.add(mesh);
    const p = { mesh, pos: mesh.position, o, taken: false };
    ctx._pickups.push(p);
    return p;
  }

  // ---------- player ----------
  // Danno continuo (zone dps): ignora e non rinnova l'invulnerabilità, tonfo al massimo ogni 0.5 s.
  let dotT = 0, dotAcc = 0;
  function hurtDot(v) {
    const p = ctx.player;
    if (S.dead || S.done) return;
    let dmg = v;
    if (level?.onHurt) { const r = level.onHurt(ctx, dmg, null); if (typeof r === 'number') dmg = r; }
    if (dmg <= 0) return;
    p.hp -= dmg; dotAcc += dmg;
    ctx.fx.hurt = Math.min(1, Math.max(ctx.fx.hurt || 0, 0.25));
    if (S.time - dotT > 0.5 || S.time < dotT) {
      dotT = S.time;
      H('onEvent', 'hurt', { dmg: dotAcc, ang: null, dot: true });
      audio.thud(); if (p.hp < 35) audio.heart();
      dotAcc = 0; hud();
    }
    if (p.hp <= 0) die();
  }
  function hurtPlayer(v, from) {
    const p = ctx.player;
    if (S.dead || S.done || p.invuln > 0) return;
    let dmg = v;
    if (level?.onHurt) { const r = level.onHurt(ctx, dmg, from); if (typeof r === 'number') dmg = r; }
    if (dmg <= 0) return;
    p.hp -= dmg; p.invuln = 0.18;
    ctx.fx.hurt = Math.min(1, (ctx.fx.hurt || 0) + 0.5 + dmg / 40);
    view.shake = Math.min(1, view.shake + dmg / 30);
    let ang = null;
    if (from?.pos) { const a = Math.atan2(from.pos.x - p.pos.x, -(from.pos.z - p.pos.z)); ang = a - p.yaw; }
    H('onEvent', 'hurt', { dmg, ang });
    audio.thud(); if (p.hp < 35) audio.heart();
    if (p.hp <= 0) die();
    hud();
  }
  const view = { shake: 0 };
  function die() {
    if (S.dead || S.done) return;
    S.dead = true; ctx.player.hp = 0;
    audio.scream(0.6, 0.3);
    hud();
    H('onDeath', stats());
  }

  function reload() {
    if (gun.reloadT > 0 || gun.ammo >= gun.chambers) return;
    gun.reloadT = gun.reloadDur; weapon.reload(gun.reloadDur);
    audio.click(0.8);
    setTimeout(() => audio.click(1.3), gun.reloadDur * 900);
    hud();
  }
  const ray = new THREE.Ray();
  function fire() {
    if (gun.reloadT > 0 || gun.cd > 0) return;
    if (gun.ammo <= 0) { audio.click(0.6); reload(); return; }
    gun.ammo--; gun.cd = gun.gap; S.shots++;
    weapon.fire(); audio.shot();
    view.shake = Math.min(1, view.shake + 0.15);
    const p = ctx.player;
    placeCamera(false);
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const sp = gun.spread + p.aimShake * 0.05;
    dir.x += (Math.random() - 0.5) * sp; dir.y += (Math.random() - 0.5) * sp; dir.z += (Math.random() - 0.5) * sp; dir.normalize();
    ray.set(camera.position.clone(), dir);
    // nearest wall along the ray
    const hl = Math.hypot(dir.x, dir.z) || 1e-6;
    let wallT = map.rayWall(ray.origin.x, ray.origin.z, dir.x, dir.z, 80) / hl;
    if (dir.y < 0) wallT = Math.min(wallT, -ray.origin.y / dir.y);
    if (dir.y > 0 && map.wallHeight && map.hasCeiling) wallT = Math.min(wallT, (map.wallHeight - ray.origin.y) / dir.y);
    let best = null;
    for (const m of ctx._monsters) {
      if (m.dying || m.def.hittable === false) continue;
      if (m.onlyInMirror && !ctx.view.mirror && !m.def.hitWhenHidden) continue;
      const n = new THREE.Vector3(camera.position.x - m.pos.x, 0, camera.position.z - m.pos.z).normalize();
      const denom = n.dot(dir); if (Math.abs(denom) < 1e-4) continue;
      const base = new THREE.Vector3(m.pos.x, m.view.root.position.y, m.pos.z);
      const t = base.clone().sub(ray.origin).dot(n) / denom;
      if (t <= 0 || t > wallT || (best && t > best.dist)) continue;
      const hit = ray.origin.clone().addScaledVector(dir, t);
      const right = new THREE.Vector3(n.z, 0, -n.x);
      const lx = hit.clone().sub(base).dot(right) / m.view.width, ly = (hit.y - base.y) / m.view.height;
      const sx = m.view.facing.scale.x || 1;
      const u = lx / sx + 0.5, v = ly;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      if (m.view.mask && m.def.hitbox !== 'rect') { const frames = m.def.frames || 1; if (frames === 1 && !m.view.mask[(63 - Math.floor(v * 63)) * 64 + Math.floor(u * 63)]) continue; }
      let zone = null;
      for (const z of m.def.zones || []) if (u - 0.5 >= z.x[0] && u - 0.5 <= z.x[1] && v >= z.y[0] && v <= z.y[1]) { zone = z; break; }
      best = { monster: m, zone: zone?.name ?? null, point: hit, dist: t, u, v, dmg: gun.dmg * (zone?.mul ?? 1) };
    }
    const shot = best || { monster: null, zone: null, point: ray.origin.clone().addScaledVector(dir, Math.min(wallT, 60)), dist: wallT, dmg: 0 };
    if (level?.onShot) { const r = level.onShot(ctx, shot); if (r === false) { hud(); return; } }
    if (shot.monster) {
      const m = shot.monster;
      if (m.def.onHit) { const r = m.def.onHit(m, shot, ctx); if (typeof r === 'number') shot.dmg = r; }
      S.hits++;
      burst(shot.point, 8, m.def.blood ?? 0x7a0608, 2);
      if (m.fake) { burst(shot.point, 14, 0x202020, 2.5); audio.burst(0.4, 3000, 1, 0.1, 'highpass', 800); removeMonster(m); }
      else damage(m, shot.dmg, shot);
    } else {
      burst(shot.point, 6, 0x3a3028, 1.5, 0.6);
    }
    hud();
  }

  // ---------- update ----------
  function update(dt) {
    if (!ctx) return;
    const p = ctx.player, c = ctx;
    S.time += dt; S.levelTime += dt;
    // look
    p.yaw += input.lookX * p.lookMul; p.pitch = clamp(p.pitch - input.lookY * p.lookMul, -1.0, 1.0);
    input.lookX = 0; input.lookY = 0;
    // move with inertia and floor zones
    const zoneName = map.zoneAt(p.pos.x, p.pos.z);
    const zone = zoneName ? c.zones[zoneName] || {} : {};
    p.zone = zoneName;
    const f = p.frozen ? 0 : input.fwd, s = p.frozen ? 0 : input.strafe;
    const l = Math.hypot(f, s) > 1 ? Math.hypot(f, s) : 1;
    const sp = p.speed * p.speedMul * (zone.speed ?? 1);
    const fx_ = Math.sin(p.yaw), fz_ = -Math.cos(p.yaw);
    const wantX = (fx_ * f - fz_ * s) / l * sp, wantZ = (fz_ * f + fx_ * s) / l * sp;
    const fr = 1 - Math.exp(-14 * (zone.friction ?? 1) * dt);
    p.vel.x += (wantX - p.vel.x) * fr; p.vel.z += (wantZ - p.vel.z) * fr;
    const [nx, nz] = collideAll(p.pos.x + p.vel.x * dt, p.pos.z + p.vel.z * dt, p.radius);
    if (Math.abs(nx - (p.pos.x + p.vel.x * dt)) > 1e-4) p.vel.x *= 0.2;
    if (Math.abs(nz - (p.pos.z + p.vel.z * dt)) > 1e-4) p.vel.z *= 0.2;
    p.pos.x = nx; p.pos.z = nz;
    p.moving = clamp(Math.hypot(p.vel.x, p.vel.z) / Math.max(1, p.speed), 0, 1);
    if (zone.dps) hurtDot(zone.dps * dt);
    p.invuln = Math.max(0, p.invuln - dt);
    // gun
    gun.cd = Math.max(0, gun.cd - dt);
    if (gun.reloadT > 0) { gun.reloadT -= dt; if (gun.reloadT <= 0) { gun.reloadT = 0; gun.ammo = gun.chambers; hud(); } }
    if (input.reload) { input.reload = false; reload(); }
    if (input.fire) { fire(); if (!gun.auto) input.fire = false; }
    // flow field
    map.updateFlow(p.pos.x, p.pos.z);
    // level hook
    level?.update?.(c, dt);
    input.altPressed = false;
    // timers
    for (const t of c._timers) { if (t.dead) continue; t.t -= dt; if (t.t <= 0) { t.fn(c); if (t.once) t.dead = true; else t.t += t.every; } }
    for (let i = c._timers.length - 1; i >= 0; i--) if (c._timers[i].dead) c._timers.splice(i, 1);
    // spawners
    for (const sp2 of c._spawners) {
      if (!sp2.on || sp2.done) continue;
      sp2.t -= dt * (sp2.cfg.fixed ? 1 : c.D.rate);
      if (sp2.t <= 0) { sp2.t += sp2.cfg.every ?? 2; for (let k = 0; k < (sp2.cfg.burst ?? 1); k++) spawnFrom(sp2); }
    }
    // monsters
    for (const m of c._monsters.slice()) {
      if (m.dying) { m.dying += dt; if (m.dying > 0.9) removeMonster(m); continue; }
      m.birth = Math.min(1, m.birth + dt * 1.8);
      m.flash = Math.max(0, m.flash - dt * 6); m.lunge = Math.max(0, m.lunge - dt * 4); m.anger = Math.max(0, m.anger - dt * 0.4);
      if (m.birth < 1 || m.hold) continue;
      const beh = typeof m.def.behavior === 'function' ? m.def.behavior : BEHAVIORS[m.def.behavior || 'chase'];
      beh?.(m, c, dt);
      m.def.update?.(m, c, dt);
    }
    // projectiles
    for (const pr of c._projectiles.slice()) {
      pr.life -= dt;
      pr.mesh.position.addScaledVector(pr.vel, dt);
      const q = pr.mesh.position;
      if (Math.random() < 0.5) c._parts.push({ x: q.x, y: q.y, z: q.z, vx: 0, vy: 0, vz: 0, life: 0.35, ...rgb(pr.trail), grav: 0 });
      const hitP = Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 0.5 && q.y < p.eye + 0.3;
      if (hitP) { hurtPlayer(pr.dmg, pr.from); pr.onHit?.(c); }
      if (hitP || pr.life <= 0 || map.solid(q.x, q.z) || q.y < 0) { scene.remove(pr.mesh); pr.mesh.geometry.dispose(); burst(q, 6, pr.trail, 1.2, 0.5); c._projectiles.splice(c._projectiles.indexOf(pr), 1); }
    }
    // pickups
    for (const pk of c._pickups) {
      if (pk.taken) continue;
      pk.mesh.rotation.y += dt * 2; pk.mesh.position.y = 0.8 + Math.sin(S.time * 3) * 0.1;
      if (Math.hypot(pk.pos.x - p.pos.x, pk.pos.z - p.pos.z) < 0.8) {
        pk.taken = true; scene.remove(pk.mesh);
        const k = pk.o.kind;
        if (k === 'heal') p.heal(pk.o.amount ?? 30);
        if (k === 'ammo') { gun.ammo = gun.chambers; }
        if (k === 'life') H('onEvent', 'life', { n: 1 });
        pk.o.onTake?.(c, pk);
        audio.glass(2); hud();
      }
    }
    // emitters & particles
    for (const e of c._emitters) {
      if (!e.on) continue;
      e.acc += (e.rate ?? 40) * dt;
      const [x0, z0, x1, z1] = e.area || [p.pos.x - 10, p.pos.z - 10, p.pos.x + 10, p.pos.z + 10];
      const col = rgb(e.color ?? 0xff6020);
      while (e.acc >= 1) { e.acc--; if (c._parts.length > 880) c._parts.shift(); c._parts.push({ x: x0 + Math.random() * (x1 - x0), y: e.y ?? (map.wallHeight || 6), z: z0 + Math.random() * (z1 - z0), vx: e.wind?.[0] ?? 0, vy: -(e.fall ?? 3), vz: e.wind?.[1] ?? 0, life: e.life ?? 3, ...col, grav: 0, hurt: e.dmg }); }
    }
    const P = c._parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i];
      q.life -= dt; q.vy -= q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.02) { q.y = 0.02; q.vx *= 0.5; q.vz *= 0.5; q.vy = 0; }
      if (q.hurt && Math.abs(q.x - p.pos.x) < 0.35 && Math.abs(q.z - p.pos.z) < 0.35 && q.y < p.eye) { hurtPlayer(q.hurt, null); q.life = 0; }
      if (q.life <= 0) P.splice(i, 1);
    }
    // fx decay
    c.fx.hurt = Math.max(0, (c.fx.hurt || 0) - dt * 1.6);
    view.shake = Math.max(0, view.shake - dt * 3);
    // drone grows with danger
    audio.drone(0.06 + Math.min(0.12, c.monsters.alive * 0.008));
    if (S.levelTime % 0.25 < dt) hud();
  }
  const rgb = (hex) => { const cc = new THREE.Color(hex); return { r: cc.r, g: cc.g, b: cc.b }; };

  // ---------- render ----------
  const tmp = new THREE.Vector3();
  function placeCamera(shake) {
    const p = ctx.player;
    const yaw = p.yaw + (ctx.view.mirror ? Math.PI : 0);
    const sh = shake ? view.shake * 0.04 : 0;
    camera.position.set(p.pos.x + (Math.random() - 0.5) * sh, p.eye + (shake ? Math.sin(S.time * 9) * 0.03 * p.moving : 0) + (Math.random() - 0.5) * sh, p.pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(p.pitch + (shake ? (Math.random() - 0.5) * p.aimShake * 0.02 : 0), -yaw, 0);
    camera.updateMatrixWorld();
  }
  function renderFrame(dt) {
    if (!ctx || !scene) return;
    const p = ctx.player, c = ctx;
    placeCamera(true);
    if (camera.fov !== c.view.fov) { camera.fov = c.view.fov; camera.updateProjectionMatrix(); }
    camera.layers.set(0); if (c.view.mirror) camera.layers.enable(MIRROR_LAYER);
    // lantern follows the eyes
    lantern.position.copy(camera.position);
    camera.getWorldDirection(tmp);
    lantern.target.position.copy(camera.position).addScaledVector(tmp, 5);
    const cosO = Math.cos(lantern.angle), cosI = Math.cos(lantern.angle * (1 - lantern.penumbra));
    // monsters: face the camera, light, fog, animation
    const fog = scene.fog;
    for (const m of c._monsters) {
      const v = m.view, u = v.mat.uniforms;
      v.root.position.set(m.pos.x, m.lift - (1 - m.birth) * v.height, m.pos.z);
      v.facing.rotation.y = Math.atan2(camera.position.x - m.pos.x, camera.position.z - m.pos.z);
      v.facing.scale.setScalar(1 + m.lunge * 0.12);
      u.time.value = S.time; u.flash.value = m.flash; u.dissolve.value = m.dying ? Math.min(1, m.dying * 1.4) : 0;
      u.twitch.value = m.frozen || m.hold ? 0 : (m.def.twitch ?? 0.5) + m.anger * 0.5;
      if (m.def.frames > 1) u.frame.value = Math.floor(S.time * (m.def.fps ?? 8) + m.seed) % m.def.frames;
      tmp.set(m.pos.x - camera.position.x, v.height * 0.6 + m.lift - camera.position.y, m.pos.z - camera.position.z);
      const d = tmp.length(); tmp.divideScalar(d || 1);
      const f = camera.getWorldDirection(new THREE.Vector3());
      const cone = lantern.visible ? clamp((tmp.dot(f) - cosO) / Math.max(1e-3, cosI - cosO), 0, 1) * clamp(1 - d / lantern.distance, 0, 1) * Math.min(2, lantern.intensity / 25) : 0;
      u.light.value = cone; u.ambient.value = (m.def.selfLit ?? 0) + ambient.intensity * 0.9;
      u.glow.value = m.def.glow ?? 0;
      if (fog) { u.fogColor.value.copy(fog.color); if (fog.isFogExp2) { u.fogDensity.value = fog.density; } else { u.fogDensity.value = 0; u.fogNear.value = fog.near; u.fogFar.value = fog.far; } } else { u.fogDensity.value = 0; u.fogNear.value = 1e5; u.fogFar.value = 1e6; }
      v.tick(S.time, m);
    }
    // particles
    const P = c._parts, pos = c._pPos, col = c._pCol;
    const n = Math.min(P.length, 900);
    for (let i = 0; i < n; i++) { const q = P[i]; pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z; col[i * 3] = q.r; col[i * 3 + 1] = q.g; col[i * 3 + 2] = q.b; }
    c._pGeo.setDrawRange(0, n); c._pGeo.attributes.position.needsUpdate = true; c._pGeo.attributes.color.needsUpdate = true;
    // weapon
    weapon.update(dt, { moving: p.moving, ammo: gun.ammo, aimShake: p.aimShake, time: S.time });
    // draw
    renderer.setRenderTarget(post.target);
    renderer.setClearColor(0x000000, 1); renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(weapon.scene, weapon.cam);
    const fxv = { ...c.fx, mirror: c.view.mirror ? 1 : c.fx.mirror };
    post.render(fxv, S.time);
    // rear-view mirror: a strip at the top that sees what is behind you (and what lives only in mirrors)
    if (c.view.rear) {
      const rw = renderer.domElement.width, rh = renderer.domElement.height;
      const w = Math.round(rw * 0.34), h = Math.round(w / 3), x = Math.round((rw - w) / 2), y = rh - h - Math.round(rh * 0.03);
      rearCam.position.copy(camera.position); rearCam.rotation.set(0, 0, 0); rearCam.rotation.order = 'YXZ'; rearCam.rotation.y = -(p.yaw + Math.PI);
      renderer.setScissorTest(true); renderer.setScissor(x, y, w, h); renderer.setViewport(x, y, w, h);
      renderer.setClearColor(0x000000, 1); renderer.clear();
      // flip left/right like a real mirror
      rearCam.projectionMatrix.elements[0] *= -1;
      renderer.render(scene, rearCam);
      rearCam.updateProjectionMatrix();
      renderer.setScissorTest(false); renderer.setViewport(0, 0, rw, rh);
    }
  }

  // ---------- loop ----------
  let raf = 0, last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    S.frameMs = S.frameMs * 0.95 + dt * 1000 * 0.05;
    if (!S.paused && !S.done && !S.dead) update(dt);
    else if (S.dead || S.done) { S.time += dt; }
    renderFrame(dt);
  }

  return {
    S, input, gun, audio,
    get ctx() { return ctx; },
    resize, load, unload,
    run() { if (S.running) return; S.running = true; last = 0; raf = requestAnimationFrame(frame); },
    halt() { S.running = false; cancelAnimationFrame(raf); },
    setPaused(v) { S.paused = v; if (!v) audio.start(); },
    render: () => renderFrame(0),
    // test hooks
    step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); renderFrame(dt); },
    killAll() { for (const m of ctx._monsters.slice()) if (!m.dying && m.counts) { S.shots++; S.hits++; killMonster(m, null); } },
    destroy() { cancelAnimationFrame(raf); S.running = false; unload(); post.dispose(); renderer.dispose(); audio.stop(); },
  };
}
