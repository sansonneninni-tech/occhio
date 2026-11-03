// Grid maps written by hand as ASCII. One character = one cell of CELL metres.
// Walls can open and close while you play (doors, curtains, altar wings), floors can carry zones (ice, mud, blood).
import * as THREE from 'three';

export const CELL = 2;

// Built-in legend. A level can add or override characters with map.build({ legend }).
//   solid: blocks movement and sight · tex: name of a wall texture · zone: floor zone name
//   painting: the wall shows the level's painting · start/spawn/exit: markers you get back with map.find()
const BASE_LEGEND = {
  '#': { solid: true, tex: 'wall' },
  ' ': { solid: true, hidden: true },
  '.': {},
  'P': { start: true },
  'M': { spawn: true },
  'X': { exit: true },
  'Q': { solid: true, tex: 'wall', painting: true },
};

export function createMap(scene) {
  let W = 0, H = 0, cells = [], legend = { ...BASE_LEGEND }, opts = {};
  const group = new THREE.Group(); scene.add(group);
  let instances = []; // { mesh, index, cx, cy }
  const byCell = new Map();
  let flow = null, flowFrom = -1;

  const idx = (cx, cy) => cy * W + cx;
  const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < W && cy < H;
  const toCell = (x, z) => [Math.floor(x / CELL), Math.floor(z / CELL)];
  const toWorld = (cx, cy) => new THREE.Vector3((cx + 0.5) * CELL, 0, (cy + 0.5) * CELL);

  function clear() {
    for (const o of group.children.slice()) { group.remove(o); o.geometry?.dispose(); }
    instances = []; byCell.clear(); flow = null; flowFrom = -1;
  }

  // grid: array of strings (rows, north at the top). textures: { wall, floor, ceil, <name>: THREE.Texture | THREE.Material }
  function build({ grid, legend: extra = {}, textures = {}, height = 3, ceiling = true, floorRepeat = 1, wallRepeat = 1 }) {
    clear();
    opts = { height, ceiling };
    legend = { ...BASE_LEGEND, ...extra };
    H = grid.length; W = Math.max(...grid.map((r) => r.length));
    cells = new Array(W * H);
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const ch = grid[cy][cx] ?? ' ';
      const def = legend[ch] || {};
      cells[idx(cx, cy)] = { ch, def, solid: !!def.solid, zone: def.zone || null, cx, cy };
    }
    const mat = (name, fallback) => {
      const t = textures[name] ?? textures[fallback];
      if (t?.isMaterial) return t;
      return new THREE.MeshStandardMaterial({ map: t || null, color: t ? 0xffffff : 0x3a3028, roughness: 0.95, metalness: 0 });
    };
    // walls: one instanced box per texture name
    const groups = new Map();
    for (const c of cells) if (c.solid && !c.def.hidden) {
      const k = c.def.tex || 'wall';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
    const box = new THREE.BoxGeometry(CELL, height, CELL);
    if (wallRepeat !== 1) { const uv = box.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * wallRepeat, uv.getY(i) * wallRepeat); }
    const m4 = new THREE.Matrix4();
    for (const [k, list] of groups) {
      const mesh = new THREE.InstancedMesh(box, mat(k, 'wall'), list.length);
      list.forEach((c, i) => {
        m4.makeTranslation((c.cx + 0.5) * CELL, height / 2, (c.cy + 0.5) * CELL);
        mesh.setMatrixAt(i, m4);
        const inst = { mesh, index: i, c };
        instances.push(inst); byCell.set(idx(c.cx, c.cy), inst);
      });
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }
    // floor and ceiling
    const fw = W * CELL, fh = H * CELL;
    const plane = (name, y, flip) => {
      const g = new THREE.PlaneGeometry(fw, fh);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W * floorRepeat / 2, uv.getY(i) * H * floorRepeat / 2);
      const m = mat(name, name === 'ceil' ? 'wall' : 'floor');
      if (m.map) { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; }
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = flip ? Math.PI / 2 : -Math.PI / 2;
      mesh.position.set(fw / 2, y, fh / 2);
      group.add(mesh);
      return mesh;
    };
    plane('floor', 0, false);
    if (ceiling) plane('ceil', height, true);
    // the painting itself, hung on every 'Q' wall face that looks onto a floor
    if (textures.painting) for (const c of cells) if (c.def.painting) {
      for (const [dx, dy, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) {
        if (!inside(c.cx + dx, c.cy + dy) || cells[idx(c.cx + dx, c.cy + dy)].solid) continue;
        const img = textures.painting.image; const ar = (img?.width || 4) / (img?.height || 3);
        const ph = Math.min(height * 0.7, CELL * 0.9 / ar), pw = ph * ar;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.16, ph + 0.16, 0.06), new THREE.MeshStandardMaterial({ color: 0x6a4a18, roughness: 0.5, metalness: 0.6 }));
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: textures.painting, roughness: 0.8 }));
        pic.position.z = 0.035;
        const g = new THREE.Group(); g.add(frame, pic);
        g.position.set((c.cx + 0.5 + dx * 0.53) * CELL, height * 0.52, (c.cy + 0.5 + dy * 0.53) * CELL);
        g.rotation.y = ry;
        group.add(g);
      }
    }
    return api;
  }

  // open/close a wall cell during play (doors, curtains...). The mesh hides or comes back.
  function setSolid(cx, cy, on) {
    if (!inside(cx, cy)) return;
    const c = cells[idx(cx, cy)]; if (c.solid === on) return;
    c.solid = on;
    const inst = byCell.get(idx(cx, cy));
    if (inst) {
      const m4 = new THREE.Matrix4();
      if (on) m4.makeTranslation((cx + 0.5) * CELL, opts.height / 2, (cy + 0.5) * CELL); else m4.makeScale(0, 0, 0);
      inst.mesh.setMatrixAt(inst.index, m4); inst.mesh.instanceMatrix.needsUpdate = true;
    }
    flowFrom = -1;
  }

  const solidCell = (cx, cy) => !inside(cx, cy) || cells[idx(cx, cy)].solid;
  const solid = (x, z) => { const [cx, cy] = toCell(x, z); return solidCell(cx, cy); };

  // circle vs grid: pushes a body out of walls. Returns the corrected [x, z].
  function collide(x, z, r) {
    const [cx, cy] = toCell(x, z);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const X = cx + i, Y = cy + j;
      if (!solidCell(X, Y)) continue;
      const nx = Math.max(X * CELL, Math.min(x, (X + 1) * CELL)), nz = Math.max(Y * CELL, Math.min(z, (Y + 1) * CELL));
      const dx = x - nx, dz = z - nz, d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-5) { x = nx + (dx / d) * r; z = nz + (dz / d) * r; }
        else { x += (i === 0 ? 0 : -i) * r; z += (j === 0 ? 0 : -j) * r; }
      }
    }
    return [x, z];
  }

  // grid ray march from a to b: true if nothing solid in between
  function los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (CELL * 0.25));
    for (let k = 1; k < n; k++) { const t = k / n; if (solid(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  // distance to the first wall along a direction (DDA)
  function rayWall(ox, oz, dx, dz, max = 80) {
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    let cx = Math.floor(ox / CELL), cy = Math.floor(oz / CELL);
    const sx = Math.sign(dx), sy = Math.sign(dz);
    const tdx = Math.abs(CELL / (dx || 1e-9)), tdy = Math.abs(CELL / (dz || 1e-9));
    let tx = ((sx > 0 ? (cx + 1) * CELL - ox : ox - cx * CELL)) / Math.abs(dx || 1e-9);
    let ty = ((sy > 0 ? (cy + 1) * CELL - oz : oz - cy * CELL)) / Math.abs(dz || 1e-9);
    let t = 0;
    for (let k = 0; k < 400 && t < max; k++) {
      if (tx < ty) { t = tx; tx += tdx; cx += sx; } else { t = ty; ty += tdy; cy += sy; }
      if (solidCell(cx, cy)) return t;
    }
    return max;
  }

  // flow field towards a target cell: monsters follow it around walls
  function updateFlow(x, z) {
    const [tcx, tcy] = toCell(x, z);
    const key = idx(tcx, tcy);
    if (key === flowFrom && flow) return;
    flowFrom = key;
    flow = new Int16Array(W * H).fill(-1);
    if (!inside(tcx, tcy)) return;
    const q = new Int32Array(W * H); let h = 0, t = 0;
    flow[key] = 0; q[t++] = key;
    while (h < t) {
      const c = q[h++], cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = cx + dx, Y = cy + dy; if (!inside(X, Y)) continue;
        const n = idx(X, Y); if (cells[n].solid || flow[n] >= 0) continue;
        flow[n] = flow[c] + 1; q[t++] = n;
      }
    }
  }
  // direction to walk from (x, z) to reach the flow target. Returns [dx, dz] normalised, or null.
  function dirTo(x, z) {
    if (!flow) return null;
    const [cx, cy] = toCell(x, z);
    if (!inside(cx, cy)) return null;
    let best = flow[idx(cx, cy)], bx = 0, by = 0;
    if (best < 0) return null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const X = cx + dx, Y = cy + dy; if (!inside(X, Y)) continue;
      const v = flow[idx(X, Y)];
      if (v < 0) continue;
      if (dx && dy && (solidCell(cx + dx, cy) || solidCell(cx, cy + dy))) continue;
      if (v < best) { best = v; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    const tx = (cx + bx + 0.5) * CELL - x, tz = (cy + by + 0.5) * CELL - z, l = Math.hypot(tx, tz) || 1;
    return [tx / l, tz / l];
  }

  const api = {
    group, build, setSolid, solid, solidCell, collide, los, rayWall, updateFlow, dirTo, toCell, toWorld, clear,
    get width() { return W; }, get height() { return H; }, get wallHeight() { return opts.height; },
    cell(cx, cy) { return inside(cx, cy) ? cells[idx(cx, cy)] : null; },
    cellAt(x, z) { const [cx, cy] = toCell(x, z); return api.cell(cx, cy); },
    zoneAt(x, z) { return api.cellAt(x, z)?.zone || null; },
    setZone(cx, cy, zone) { const c = api.cell(cx, cy); if (c) c.zone = zone; },
    // every cell with this character (or whose legend has this flag), as world positions with .cx .cy
    find(chOrFlag) {
      const out = [];
      for (const c of cells) if (c.ch === chOrFlag || c.def[chOrFlag]) { const p = toWorld(c.cx, c.cy); p.cx = c.cx; p.cy = c.cy; out.push(p); }
      return out;
    },
    // random free floor positions at distance [min, max] from (x, z)
    freeAround(x, z, min = 6, max = 16, n = 1, rnd = Math.random) {
      const out = [];
      for (let k = 0; k < 300 && out.length < n; k++) {
        const a = rnd() * Math.PI * 2, d = min + rnd() * (max - min);
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        const c = api.cellAt(px, pz); if (!c || c.solid) continue;
        const [qx, qz] = collide(px, pz, 0.5);
        if (Math.hypot(qx - px, qz - pz) > 0.01) continue;
        out.push(new THREE.Vector3(px, 0, pz));
      }
      return out;
    },
  };
  return api;
}
