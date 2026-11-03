// Mixed monsters: a figure cut from the real painting (a paper puppet that breathes, twitches and rots)
// plus 3D flesh parts (tendrils, spikes, eyes, legs, teeth, a sack of meat). Behaviours are reusable.
import * as THREE from 'three';
import { texture } from './art.js';

const TAU = Math.PI * 2;

// ---------- the paper puppet shader ----------
const SPRITE_VERT = `
uniform float time, seed, twitch, breathe, tear, dissolve, frames, frame;
varying vec2 vUv; varying float vDepth;
float h(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  vUv = uv;
  vec3 p = position;
  float y = uv.y;
  // breathing: the paper swells from the middle
  p.x *= 1.0 + breathe * 0.06 * sin(time * 2.3 + seed) * (1.0 - abs(y - 0.5) * 2.0);
  // torn strips that sway on their own
  float strip = floor(uv.x * 6.0);
  p.z += tear * 0.08 * sin(time * 3.0 + strip * 1.7 + seed) * y;
  p.y += tear * 0.04 * sin(time * 4.0 + strip * 2.3) * (1.0 - y);
  // twitch: sudden jerks, 18 a second, like a skipped film frame
  float fr = floor(time * 18.0 + seed);
  float j = step(1.0 - twitch * 0.12, h(fr));
  p.x += j * (h(fr + 1.0) - 0.5) * 0.25;
  p.y += j * (h(fr + 2.0) - 0.5) * 0.12 * y;
  // dying: it crumples and sinks
  p.y -= dissolve * 0.6 * (1.0 - y * 0.3);
  p.x *= 1.0 - dissolve * 0.5 * y;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const SPRITE_FRAG = `
uniform sampler2D map;
uniform float time, seed, rot, flash, dissolve, frames, frame, light, glow;
uniform vec3 fogColor; uniform float fogNear, fogFar, fogDensity;
uniform vec3 lampDir; uniform float lampCos, lampRange, ambient;
varying vec2 vUv; varying float vDepth;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 uv = vUv;
  uv.x = (uv.x + frame) / frames;
  vec4 c = texture2D(map, uv);
  // rot eats the paper: holes that grow and crawl
  float rn = n2(vUv * 9.0 + seed + time * 0.05) * 0.7 + n2(vUv * 31.0 - time * 0.1) * 0.3;
  float eaten = smoothstep(1.0 - rot * 0.25 - dissolve * 1.2, 1.02 - rot * 0.25 - dissolve * 1.2, rn);
  c.a *= 1.0 - eaten;
  // burnt edge around the holes
  float edge = smoothstep(0.92 - rot * 0.25 - dissolve * 1.2, 1.0 - rot * 0.25 - dissolve * 1.2, rn) - eaten;
  c.rgb = mix(c.rgb, vec3(0.05, 0.0, 0.0), clamp(edge * 2.0, 0.0, 1.0));
  if (c.a < 0.35) discard;
  // only the player's lamp and the room light reach it
  float lit = ambient + light;
  c.rgb *= lit;
  c.rgb += glow * c.rgb;
  c.rgb = mix(c.rgb, vec3(1.0, 0.9, 0.85), flash);
  float fogF = fogDensity > 0.0 ? 1.0 - exp(-fogDensity * fogDensity * vDepth * vDepth) : smoothstep(fogNear, fogFar, vDepth);
  c.rgb = mix(c.rgb, fogColor, fogF);
  gl_FragColor = vec4(c.rgb, 1.0);
}`;

function spriteMaterial(tex, frames) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex }, time: { value: 0 }, seed: { value: Math.random() * 100 }, twitch: { value: 0.5 }, breathe: { value: 1 }, tear: { value: 0.6 },
      rot: { value: 0.5 }, flash: { value: 0 }, dissolve: { value: 0 }, frames: { value: frames }, frame: { value: 0 }, light: { value: 0 }, glow: { value: 0 }, ambient: { value: 1 },
      fogColor: { value: new THREE.Color(0) }, fogNear: { value: 1 }, fogFar: { value: 1000 }, fogDensity: { value: 0 },
      lampDir: { value: new THREE.Vector3() }, lampCos: { value: 0 }, lampRange: { value: 0 },
    },
    vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG, side: THREE.DoubleSide, transparent: false,
  });
}

// ---------- 3D parts ----------
const flesh = (color = 0x4a1410, emissive = 0x000000) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.0, emissive, emissiveIntensity: 0.6 });

export const PARTS = {
  // writhing tubes, like nerves or guts hanging from the figure
  tendrils({ n = 5, len = 1.2, thick = 0.04, color = 0x5a1410, at = [0, 0.3, -0.05], spread = 0.5 } = {}) {
    const g = new THREE.Group(); g.position.set(...at);
    const mat = flesh(color);
    const list = [];
    for (let i = 0; i < n; i++) {
      const pivot = new THREE.Group();
      const a = (i / n - 0.5) * spread * 2;
      pivot.position.set(Math.sin(a) * 0.2, 0, 0);
      const pts = []; for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(Math.sin(k * 0.9 + i) * 0.08, -k * len / 6, Math.cos(k + i) * 0.06));
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, thick * (1 - i * 0.05), 5), mat);
      pivot.add(m); pivot.rotation.z = a; g.add(pivot); list.push(pivot);
    }
    g.userData.tick = (t, m) => list.forEach((p, i) => { p.rotation.x = Math.sin(t * 2 + i) * 0.4 * (1 + m.anger); p.rotation.z += Math.sin(t * 3 + i * 2) * 0.01; });
    return g;
  },
  // bone spikes through the paper
  spikes({ n = 6, len = 0.35, color = 0xd8ccb0, at = [0, 0.6, 0.02], spread = 0.4 } = {}) {
    const g = new THREE.Group(); g.position.set(...at);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.03 + Math.random() * 0.03, len * (0.6 + Math.random() * 0.8), 5), mat);
      const a = Math.random() * TAU;
      c.position.set(Math.cos(a) * spread * Math.random(), (Math.random() - 0.5) * spread, 0);
      c.rotation.set(Math.PI / 2 + (Math.random() - 0.5), 0, (Math.random() - 0.5) * 2);
      g.add(c);
    }
    return g;
  },
  // wet eyes that follow you. at: positions in sprite space (x -0.5..0.5, y 0..1 of the height)
  eyes({ at = [[-0.08, 0.82], [0.08, 0.82]], size = 0.05, color = 0xffffff, pupil = 0x000000, glow = 0 } = {}) {
    const g = new THREE.Group(); g.userData.spriteSpace = true;
    const list = [];
    for (const [x, y] of at) {
      const e = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), glow ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.15 }));
      const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 8, 6), new THREE.MeshBasicMaterial({ color: pupil }));
      p.position.z = size * 0.7; e.add(ball, p); e.userData.at = [x, y];
      g.add(e); list.push(e);
    }
    g.userData.tick = (t, m, cam) => list.forEach((e) => { e.lookAt(cam.position); if (Math.random() < 0.004) e.scale.y = 0.1; else e.scale.y += (1 - e.scale.y) * 0.3; });
    return g;
  },
  // a pulsing sack of meat behind the figure
  sack({ size = 0.45, color = 0x7a2a20, at = [0, 0.45, -0.25] } = {}) {
    const geo = new THREE.IcosahedronGeometry(size, 3);
    const base = geo.attributes.position.array.slice();
    const m = new THREE.Mesh(geo, flesh(color));
    m.position.set(...at);
    m.userData.tick = (t, mon) => {
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const k = 1 + 0.12 * Math.sin(t * 3 + base[i] * 9 + base[i + 1] * 7) + 0.05 * Math.sin(t * 7 + base[i + 2] * 13) * (1 + mon.anger);
        p[i] = base[i] * k; p[i + 1] = base[i + 1] * k; p[i + 2] = base[i + 2] * k;
      }
      geo.attributes.position.needsUpdate = true;
    };
    return m;
  },
  // spider legs that walk when the monster moves
  legs({ n = 6, len = 0.9, color = 0x2a1a14, at = [0, 0.35, 0] } = {}) {
    const g = new THREE.Group(); g.position.set(...at);
    const mat = flesh(color);
    const list = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      const hip = new THREE.Group(); hip.position.set(side * 0.15, 0, (k - (n / 4)) * 0.12);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, len * 0.55, 4), mat); up.position.y = len * 0.27;
      const knee = new THREE.Group(); knee.position.y = len * 0.55;
      const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, len * 0.7, 4), mat); lo.position.y = -len * 0.35;
      knee.add(lo); knee.rotation.z = side * 2.2; up.add(knee);
      const holder = new THREE.Group(); holder.add(up); holder.rotation.z = -side * 0.9; hip.add(holder);
      g.add(hip); list.push({ holder, side, k });
    }
    g.userData.tick = (t, m) => list.forEach((l) => { l.holder.rotation.x = Math.sin(t * 9 * (0.3 + m.moving) + l.k * 2 + (l.side > 0 ? Math.PI : 0)) * 0.5 * (0.2 + m.moving); });
    return g;
  },
  // a ring of teeth around the mouth
  teeth({ at = [0, 0.7], r = 0.12, n = 12, color = 0xe8dcc0 } = {}) {
    const g = new THREE.Group(); g.userData.spriteSpace = true;
    const e = new THREE.Group(); e.userData.at = at;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 4), mat);
      c.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.03); c.rotation.z = a + Math.PI / 2;
      e.add(c);
    }
    g.add(e);
    g.userData.tick = (t, m) => { e.scale.setScalar(1 + Math.sin(t * 8) * 0.1 * (1 + m.anger)); e.rotation.z = Math.sin(t * 2) * 0.2; };
    return g;
  },
  // hair, strings or veins: loose lines hanging down
  strands({ n = 14, len = 1, color = 0x1a0a08, at = [0, 0.95, 0], spread = 0.3 } = {}) {
    const g = new THREE.Group(); g.position.set(...at);
    const mat = new THREE.LineBasicMaterial({ color });
    const list = [];
    for (let i = 0; i < n; i++) {
      const pts = []; for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector3((i / n - 0.5) * spread * 2, -k * len / 8, 0));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const l = new THREE.Line(geo, mat); g.add(l); list.push({ geo, i });
    }
    g.userData.tick = (t) => list.forEach(({ geo, i }) => { const p = geo.attributes.position.array; for (let k = 0; k <= 8; k++) p[k * 3 + 2] = Math.sin(t * 2 + i + k * 0.6) * 0.05 * k; geo.attributes.position.needsUpdate = true; });
    return g;
  },
};

// ---------- behaviours ----------
// Each one moves the monster m (m.pos is a Vector3 on the floor) and decides when it attacks.
// They use only the ctx API, so levels can write their own the same way.
export const BEHAVIORS = {
  // walks to you around the walls, hits when close
  chase(m, ctx, dt) { ctx.monsters.walkTo(m, ctx.player.pos, m.speed, dt); ctx.monsters.melee(m, dt); },
  // floats, weaving, at head height
  fly(m, ctx, dt) {
    const t = ctx.time + m.seed;
    const side = new THREE.Vector3(-(ctx.player.pos.z - m.pos.z), 0, ctx.player.pos.x - m.pos.x).normalize().multiplyScalar(Math.sin(t * 2.2) * 1.5);
    ctx.monsters.walkTo(m, ctx.player.pos.clone().add(side), m.speed, dt, true);
    m.lift = 0.6 + Math.sin(t * 1.7) * 0.4;
    ctx.monsters.melee(m, dt);
  },
  // freezes, shakes, then lunges in a straight line
  charge(m, ctx, dt) {
    const s = m.state;
    const d = m.pos.distanceTo(ctx.player.pos);
    s.cd = (s.cd ?? 1) - dt;
    if (s.mode === 'wind') { s.t -= dt; m.anger = 1; if (s.t <= 0) { s.mode = 'dash'; s.t = 0.9; s.dir = ctx.player.pos.clone().sub(m.pos).setY(0).normalize(); ctx.audio.scream(m.pitch * 1.3, 0.12); } return; }
    if (s.mode === 'dash') { s.t -= dt; ctx.monsters.move(m, s.dir.x * m.speed * 3.6 * dt, s.dir.z * m.speed * 3.6 * dt); ctx.monsters.melee(m, dt, 1.4); if (s.t <= 0) { s.mode = null; s.cd = 1.6; m.anger = 0; } return; }
    if (d < 9 && s.cd <= 0 && ctx.monsters.sees(m)) { s.mode = 'wind'; s.t = 0.7; return; }
    ctx.monsters.walkTo(m, ctx.player.pos, m.speed * 0.7, dt); ctx.monsters.melee(m, dt);
  },
  // keeps its distance and spits
  ranged(m, ctx, dt) {
    const d = m.pos.distanceTo(ctx.player.pos), s = m.state;
    if (d > 8 || !ctx.monsters.sees(m)) ctx.monsters.walkTo(m, ctx.player.pos, m.speed, dt);
    else if (d < 5) { const away = m.pos.clone().sub(ctx.player.pos).setY(0).normalize(); ctx.monsters.move(m, away.x * m.speed * dt, away.z * m.speed * dt); }
    s.cd = (s.cd ?? 1 + Math.random()) - dt;
    if (s.cd <= 0 && ctx.monsters.sees(m)) { s.cd = (m.def.fireEvery ?? 2.2) / ctx.D.rate; ctx.shoot(m, m.def.projectile); }
  },
  // moves only when you are not looking at it
  statue(m, ctx, dt) {
    if (ctx.player.isLookingAt(m.pos, 0.82) && ctx.monsters.sees(m)) { m.frozen = true; return; }
    m.frozen = false; ctx.monsters.walkTo(m, ctx.player.pos, m.speed * 2.2, dt); ctx.monsters.melee(m, dt);
  },
  // waits still in the dark until you come close or shoot it, then runs at you
  lurk(m, ctx, dt) {
    if (!m.state.awake && (m.pos.distanceTo(ctx.player.pos) < 6 || m.hp < m.maxHp)) { m.state.awake = true; ctx.audio.growl(m.pitch, 0.2); }
    if (m.state.awake) BEHAVIORS.chase(m, ctx, dt * 1.35);
  },
  // low and fast, zig-zagging
  crawl(m, ctx, dt) {
    const t = ctx.time * 5 + m.seed;
    const side = new THREE.Vector3(-(ctx.player.pos.z - m.pos.z), 0, ctx.player.pos.x - m.pos.x).normalize().multiplyScalar(Math.sin(t) * 2);
    ctx.monsters.walkTo(m, ctx.player.pos.clone().add(side), m.speed * 1.4, dt);
    ctx.monsters.melee(m, dt);
  },
  // never moves; hits you if you get too close (bosses, turrets)
  still(m, ctx, dt) { ctx.monsters.melee(m, dt); },
};

// ---------- factory ----------
// def: see docs/museo-livelli.md ("Mostri"). sprite is a canvas (from cutout()) or an image with `frames` side by side.
export function buildMonster(def, cam) {
  const src = def.sprite;
  const frames = def.frames || 1;
  const tex = src.isTexture ? src : texture(src);
  const sw = (src.image?.width || src.width) / frames, sh = src.image?.height || src.height;
  const height = def.height ?? 1.9;
  const width = height * (sw / sh);
  const mat = spriteMaterial(tex, frames);
  Object.assign(mat.uniforms.twitch, { value: def.twitch ?? 0.5 });
  mat.uniforms.rot.value = def.rot ?? 0.5;
  mat.uniforms.tear.value = def.tear ?? 0.6;
  mat.uniforms.breathe.value = def.breathe ?? 1;
  const geo = new THREE.PlaneGeometry(width, height, 6, 10); geo.translate(0, height / 2, 0);
  const sprite = new THREE.Mesh(geo, mat);
  const root = new THREE.Group();
  const facing = new THREE.Group(); // turns to the camera on Y
  facing.add(sprite); root.add(facing);
  const ticks = [];
  for (const p of def.parts || []) {
    const part = typeof p === 'function' ? p() : p.isObject3D ? p : PARTS[p.type]?.(p);
    if (!part) continue;
    // parts in sprite space use [x, y] fractions of the sprite
    part.traverse((o) => { if (o.userData.at) o.position.set(o.userData.at[0] * width, o.userData.at[1] * height, 0.04); });
    facing.add(part);
    part.traverse((o) => { if (o.userData.tick) ticks.push(o.userData.tick); });
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  // alpha mask for precise hits (64x64)
  let mask = null;
  try {
    const c = document.createElement('canvas'); c.width = 64 * frames; c.height = 64;
    const g = c.getContext('2d'); g.drawImage(src.image || src, 0, 0, c.width, 64);
    const d = g.getImageData(0, 0, 64, 64).data; mask = new Uint8Array(64 * 64);
    for (let i = 0; i < 64 * 64; i++) mask[i] = d[i * 4 + 3] > 90 ? 1 : 0;
  } catch {}
  return { root, facing, sprite, mat, ticks, width, height, mask, tick(t, m) { for (const f of ticks) f(t, m, cam); } };
}
