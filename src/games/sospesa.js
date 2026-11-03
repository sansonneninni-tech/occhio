import { h, rand, clamp, pick } from '../core/dom.js';
import { arcadeLayout, toStage } from '../core/arcade.js';
import { download } from '../core/export.js';
import { stamp, sfx, vibrate, shake } from '../core/fx.js';
import { store } from '../core/store.js';

// A suspended-explosion installation. Something blows up in a white room with one bare bulb:
// tap the pieces mid-air to hang them on wires before they hit the floor. Their shadows fill the walls.
const ROOM = { x: 5, y: 6, z: 5 };
const ROUNDS = [
  { id: 'shed', name: { it: 'Capanno', en: 'Shed' } },
  { id: 'piano', name: { it: 'Pianoforte', en: 'Piano' } },
  { id: 'silver', name: { it: 'Argenteria', en: 'Silverware' } },
  { id: 'chairs', name: { it: 'Sei sedie', en: 'Six chairs' } },
  { id: 'shed2', name: { it: 'Capanno grande', en: 'Big shed' } },
];

export default {
  id: 'sospesa',
  cat: 'folle',
  title: { it: 'Materia Sospesa', en: 'Suspended Matter' },
  tagline: { it: 'Un capanno esplode in una stanza bianca. Ferma i pezzi in aria: l’installazione e le sue ombre sono tue.', en: 'A shed blows up in a white room. Freeze the pieces mid-air: the installation and its shadows are yours.' },
  how: {
    it: 'Ogni round un oggetto esplode al rallentatore.|Tocca i pezzi in volo per appenderli a un filo prima che cadano a terra. Più pezzi di fila = combo.|Cinque esplosioni. Alla fine scarichi la foto della tua installazione con le ombre sulle pareti.',
    en: 'Each round an object explodes in slow motion.|Tap the flying pieces to hang them on a wire before they hit the floor. Several in a row = combo.|Five explosions. At the end you download the photo of your installation with its shadows on the walls.',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#EDEAE4"/><path d="M0 100 L40 70 L120 70 L160 100Z" fill="#D8D3CA"/><g fill="#9A958C" opacity=".6"><rect x="10" y="18" width="14" height="5" transform="rotate(20 17 20)"/><rect x="132" y="24" width="18" height="5" transform="rotate(-30 141 26)"/><rect x="20" y="50" width="10" height="4"/><rect x="128" y="52" width="16" height="4" transform="rotate(40 136 54)"/></g><g stroke="#0E0E10" stroke-width=".6">${[[60, 30], [74, 22], [92, 34], [100, 48], [66, 50], [84, 56], [52, 42]].map(([x, y]) => `<line x1="${x}" y1="0" x2="${x}" y2="${y}"/>`).join('')}</g><g fill="#241A14">${[[60, 30, 20], [74, 22, -30], [92, 34, 60], [100, 48, 10], [66, 50, -50], [84, 56, 30], [52, 42, 80]].map(([x, y, r]) => `<rect x="${x - 6}" y="${y}" width="12" height="3" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g><circle cx="80" cy="42" r="4" fill="#FFE600"/><line x1="80" y1="0" x2="80" y2="38" stroke="#0E0E10"/></svg>`,

  async mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const box = h('div', { class: 'arena', style: { background: '#EDEAE4' } }, h('p', { class: 'g-hint', style: { paddingTop: '30%' } }, api.t('loading')));
    board.append(box);
    const roundLabel = h('b', { style: { fontSize: '15px' } }, '');
    controls.append(roundLabel, h('span', { class: 'keys-hint' }, api.t({ it: 'Tocca i pezzi in volo', en: 'Tap the flying pieces' })));

    const THREE = await import('three');
    if (api.destroyed) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const overlay = h('canvas', { style: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' } });
    box.replaceChildren(renderer.domElement, overlay);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' });
    const og = overlay.getContext('2d');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EDEAE4');
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
    const target = new THREE.Vector3(0, 2.3, 0);

    // room
    const wallMat = new THREE.MeshStandardMaterial({ color: '#F2EFE9', roughness: 1 });
    const floorMat = new THREE.MeshStandardMaterial({ color: '#CFC9BE', roughness: 0.95 });
    const room = new THREE.Group();
    const wall = (w, hh, pos, rot, mat = wallMat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), mat); m.position.copy(pos); m.rotation.set(...rot); m.receiveShadow = true; room.add(m); };
    // floor, ceiling and side walls run past the camera so no view angle sees outside the room
    const D = ROOM.z * 2 + 16;
    wall(ROOM.x * 2, D, new THREE.Vector3(0, 0, 8), [-Math.PI / 2, 0, 0], floorMat);
    wall(ROOM.x * 2, D, new THREE.Vector3(0, ROOM.y, 8), [Math.PI / 2, 0, 0]);
    wall(ROOM.x * 2, ROOM.y, new THREE.Vector3(0, ROOM.y / 2, -ROOM.z), [0, 0, 0]);
    wall(D, ROOM.y, new THREE.Vector3(-ROOM.x, ROOM.y / 2, 8), [0, Math.PI / 2, 0]);
    wall(D, ROOM.y, new THREE.Vector3(ROOM.x, ROOM.y / 2, 8), [0, -Math.PI / 2, 0]);
    scene.add(room);
    scene.add(new THREE.HemisphereLight('#ffffff', '#8a8378', 0.35));
    const bulb = new THREE.PointLight('#FFF2D6', 46, 0, 1.6);
    bulb.position.set(0, 3.4, 0);
    bulb.castShadow = true;
    bulb.shadow.mapSize.set(1024, 1024);
    bulb.shadow.bias = -0.004;
    bulb.shadow.radius = 3;
    scene.add(bulb);
    const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFF6C8' }));
    bulbMesh.position.copy(bulb.position); scene.add(bulbMesh);
    const cordGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, ROOM.y, 0), new THREE.Vector3(0, 3.48, 0)]);
    scene.add(new THREE.Line(cordGeo, new THREE.LineBasicMaterial({ color: '#111' })));

    // wires
    const wireMat = new THREE.LineBasicMaterial({ color: '#1a1a1a', transparent: true, opacity: 0.7 });
    let wires = null;
    const rebuildWires = () => {
      const pts = [];
      for (const f of frags) if (f.state === 'hang') { pts.push(f.mesh.position.clone().add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(f.mesh.position.x, ROOM.y, f.mesh.position.z)); }
      if (wires) { scene.remove(wires); wires.geometry.dispose(); }
      wires = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wireMat);
      scene.add(wires);
    };

    // materials
    const M = {
      char: new THREE.MeshStandardMaterial({ color: '#2A1E16', roughness: 0.95 }),
      charLight: new THREE.MeshStandardMaterial({ color: '#4A3626', roughness: 0.9 }),
      ember: new THREE.MeshStandardMaterial({ color: '#2A1E16', roughness: 0.9, emissive: '#FF4A10', emissiveIntensity: 0.55 }),
      lacquer: new THREE.MeshStandardMaterial({ color: '#0C0C0E', roughness: 0.18, metalness: 0.1 }),
      ivory: new THREE.MeshStandardMaterial({ color: '#F3EEE0', roughness: 0.4 }),
      silver: new THREE.MeshStandardMaterial({ color: '#D8DCE0', roughness: 0.28, metalness: 0.55 }),
      red: new THREE.MeshStandardMaterial({ color: '#E8202A', roughness: 0.55 }),
      floorDead: new THREE.MeshStandardMaterial({ color: '#7d776d', roughness: 1 }),
    };

    // ---- object builders: each returns [{ size:[x,y,z], pos:[x,y,z], rot:[x,y,z], mat, shape? }] ----
    function shed(scale = 1) {
      const out = [], W = 1.9 * scale, D = 1.5 * scale, H = 1.6 * scale, pw = 0.24 * scale;
      const mat = () => (Math.random() < 0.18 ? M.ember : Math.random() < 0.3 ? M.charLight : M.char);
      for (let x = -W / 2 + pw / 2; x < W / 2; x += pw) for (const z of [-D / 2, D / 2]) out.push({ size: [pw * 0.92, H, 0.06], pos: [x, H / 2, z], rot: [0, 0, 0], mat: mat() });
      for (let z = -D / 2 + pw / 2; z < D / 2; z += pw) for (const x of [-W / 2, W / 2]) out.push({ size: [0.06, H, pw * 0.92], pos: [x, H / 2, z], rot: [0, 0, 0], mat: mat() });
      for (let x = -W / 2; x < W / 2; x += pw * 1.6) for (const s of [-1, 1]) out.push({ size: [pw * 1.5, 0.05, D * 0.62], pos: [x + pw * 0.8, H + 0.3 * scale, s * D * 0.27], rot: [s * 0.45, 0, 0], mat: mat() });
      return out;
    }
    function piano() {
      const out = [];
      out.push({ size: [1.9, 0.08, 1.0], pos: [0, 1.0, 0], rot: [0, 0, 0], mat: M.lacquer });
      out.push({ size: [1.9, 0.06, 1.0], pos: [0, 1.5, -0.3], rot: [-0.6, 0, 0], mat: M.lacquer });
      for (const x of [-0.95, 0.95]) out.push({ size: [0.06, 0.4, 1.0], pos: [x, 0.8, 0], rot: [0, 0, 0], mat: M.lacquer });
      out.push({ size: [1.9, 0.4, 0.06], pos: [0, 0.8, -0.5], rot: [0, 0, 0], mat: M.lacquer });
      for (const x of [-0.8, 0.8]) for (const z of [-0.35, 0.35]) out.push({ size: [0.09, 0.62, 0.09], pos: [x, 0.31, z], rot: [0, 0, 0], mat: M.lacquer });
      for (let k = 0; k < 26; k++) out.push({ size: [0.065, 0.04, 0.32], pos: [-0.85 + k * 0.068, 1.06, 0.58], rot: [0, 0, 0], mat: M.ivory });
      for (let k = 0; k < 18; k++) out.push({ size: [0.04, 0.05, 0.2], pos: [-0.82 + k * 0.095, 1.1, 0.52], rot: [0, 0, 0], mat: M.lacquer });
      return out;
    }
    function silver() {
      const out = [];
      for (let k = 0; k < 44; k++) {
        const kind = pick(['disc', 'disc', 'spoon', 'cup']);
        const r = rand(0.12, 0.26);
        if (kind === 'disc') out.push({ shape: 'disc', size: [r, 0.025, r], pos: [rand(-0.6, 0.6), rand(0.2, 1.2), rand(-0.5, 0.5)], rot: [rand(0, 3), rand(0, 3), 0], mat: M.silver });
        else if (kind === 'spoon') out.push({ size: [0.05, 0.02, r * 2.4], pos: [rand(-0.6, 0.6), rand(0.2, 1.2), rand(-0.5, 0.5)], rot: [rand(0, 3), rand(0, 3), 0], mat: M.silver });
        else out.push({ shape: 'cup', size: [r * 0.8, r * 1.2, r * 0.8], pos: [rand(-0.6, 0.6), rand(0.2, 1.2), rand(-0.5, 0.5)], rot: [rand(0, 3), 0, rand(0, 3)], mat: M.silver });
      }
      return out;
    }
    function chairs() {
      const out = [];
      for (let c = 0; c < 6; c++) {
        const a = (c / 6) * Math.PI * 2, cx = Math.cos(a) * 0.9, cz = Math.sin(a) * 0.9;
        out.push({ size: [0.45, 0.05, 0.45], pos: [cx, 0.48, cz], rot: [0, a, 0], mat: M.red });
        for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) out.push({ size: [0.04, 0.46, 0.04], pos: [cx + lx, 0.23, cz + lz], rot: [0, 0, 0], mat: M.red });
        out.push({ size: [0.45, 0.4, 0.04], pos: [cx, 0.75, cz - 0.21], rot: [0, a, 0], mat: M.red });
      }
      return out;
    }

    const frags = [];
    const geoOf = (p) => (p.shape === 'disc' ? new THREE.CylinderGeometry(p.size[0], p.size[0] * 0.96, p.size[1], 18) : p.shape === 'cup' ? new THREE.CylinderGeometry(p.size[0], p.size[0] * 0.55, p.size[1], 16, 1, true) : new THREE.BoxGeometry(...p.size));
    let roundFrags = [];
    function build(id) {
      const parts = id === 'shed' ? shed(1) : id === 'piano' ? piano() : id === 'silver' ? silver() : id === 'chairs' ? chairs() : shed(1.25);
      roundFrags = parts.map((p) => {
        const mesh = new THREE.Mesh(geoOf(p), p.mat);
        mesh.position.set(...p.pos); mesh.rotation.set(...p.rot);
        mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh);
        const f = { mesh, size: p.shape === 'disc' ? [p.size[0] * 2, p.size[1], p.size[0] * 2] : p.size, v: new THREE.Vector3(), w: new THREE.Vector3(), state: 'rest', sway: rand(0, 6) };
        frags.push(f);
        return f;
      });
    }
    function explode(strength) {
      const c = new THREE.Vector3(0, 0.6, 0);
      for (const f of roundFrags) {
        const d = f.mesh.position.clone().sub(c); d.y = Math.max(0.2, d.y); d.normalize();
        f.v.copy(d.multiplyScalar(rand(3.2, 6.2) * strength)); f.v.y += rand(3.5, 6.5);
        f.w.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
        f.state = 'fly';
      }
    }

    // ---- view ----
    let vw = 1, vh = 1, orbit = 0;
    const resize = () => {
      const r = box.getBoundingClientRect();
      vw = Math.max(10, r.width); vh = Math.max(10, r.height);
      renderer.setSize(vw, vh, false);
      overlay.width = vw * devicePixelRatio; overlay.height = vh * devicePixelRatio;
      og.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      cam.aspect = vw / vh;
      cam.fov = vw / vh < 1 ? 72 : 52;
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(box); resize();
    const placeCam = (tt) => {
      const a = Math.sin(tt * 0.12) * 0.12 + orbit, dist = cam.aspect < 1 ? 9.2 : 8.6;
      cam.position.set(Math.sin(a) * dist, 2.7, Math.cos(a) * dist);
      cam.lookAt(target);
    };

    // ---- sound ----
    let actx = null;
    const boom = () => {
      if (store.muted) return;
      try {
        actx ||= new (window.AudioContext || window.webkitAudioContext)();
        const len = actx.sampleRate * 1.2, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
        const s = actx.createBufferSource(); s.buffer = b; s.playbackRate.value = 0.5;
        const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        const g = actx.createGain(); g.gain.value = 0.5;
        s.connect(f).connect(g).connect(actx.destination); s.start();
      } catch {}
    };

    // ---- input: nearest flying piece on screen ----
    const v3 = new THREE.Vector3();
    let combo = 0, lastCatch = -9, caught = 0, totalCaught = 0, totalPieces = 0, popups = [];
    const onDown = (e) => {
      e.preventDefault();
      if (state !== 'fly') return;
      const r = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = Math.max(46, Math.min(vw, vh) * 0.075);
      for (const f of roundFrags) {
        if (f.state !== 'fly') continue;
        v3.copy(f.mesh.position).project(cam);
        const sx = (v3.x * 0.5 + 0.5) * vw, sy = (-v3.y * 0.5 + 0.5) * vh;
        const d = Math.hypot(sx - x, sy - y);
        if (d < bd) { bd = d; best = { f, sx, sy }; }
      }
      if (!best) { popups.push({ x, y, txt: '·', life: 0.4, miss: true }); return; }
      const { f, sx, sy } = best;
      f.state = 'hang'; f.v.set(0, 0, 0); f.w.multiplyScalar(0.05);
      f.hangY = f.mesh.position.y;
      caught++; totalCaught++;
      combo = t - lastCatch < 0.8 ? combo + 1 : 1; lastCatch = t;
      const heightBonus = clamp(f.mesh.position.y / 4);
      const nearBulb = clamp(1 - f.mesh.position.distanceTo(bulb.position) / 4);
      const pts = Math.round((40 + heightBonus * 40 + nearBulb * 60) * (1 + Math.min(5, combo - 1) * 0.5));
      const sp = toStage(stage, box, sx, sy);
      api.add(pts, { x: sp.x, y: sp.y, color: combo > 2 ? '#E8202A' : '#0E0E10' });
      if (combo >= 3) { sfx.combo(Math.min(9, combo)); if (combo % 3 === 0) stamp(stage, `COMBO ×${combo}`, 'great'); } else sfx.tap();
      vibrate(12);
      popups.push({ x: sx, y: sy, life: 0.5 });
      rebuildWires();
    };
    renderer.domElement.addEventListener('pointerdown', onDown);

    // ---- rounds ----
    let state = 'show', st = 0, round = -1, t = 0, over = false, flash = 0, ts = 0.4;
    const sweep = () => {
      for (const f of frags) if (f.state === 'floor') { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.state = 'gone'; }
    };
    const nextRound = () => {
      sweep();
      round++;
      if (round >= ROUNDS.length) return finale();
      build(ROUNDS[round].id);
      totalPieces += roundFrags.length;
      caught = 0; state = 'show'; st = 0;
      ts = 0.38 + round * 0.035;
      api.round(round + 1, ROUNDS.length);
      roundLabel.textContent = api.t(ROUNDS[round].name);
    };
    const tally = () => {
      const ratio = caught / roundFrags.length;
      api.hit(clamp(ratio / 0.55), { silent: true, quiet: true });
      stamp(stage, `${Math.round(ratio * 100)}% ${api.t({ it: 'SOSPESO', en: 'SUSPENDED' })}`, ratio > 0.5 ? 'great' : ratio > 0.25 ? 'good' : 'bad');
      if (ratio > 0.5) sfx.great(); else sfx.good();
      state = 'tally'; st = 0;
    };
    const finale = () => {
      sweep();
      state = 'finale'; st = 0;
      roundLabel.textContent = api.t({ it: 'L’installazione', en: 'The installation' });
    };
    const finish = () => {
      if (over) return; over = true;
      api.end({
        summary: `${totalCaught}/${totalPieces} ${api.t({ it: 'pezzi sospesi', en: 'pieces suspended' })}`,
        exports: [{ label: api.t({ it: 'Foto dell’installazione (PNG)', en: 'Installation photo (PNG)' }), run: () => photo() }],
      });
    };
    function photo() {
      const old = renderer.getPixelRatio();
      const r = box.getBoundingClientRect();
      const scale = Math.max(2, 2400 / Math.max(r.width, r.height));
      renderer.setPixelRatio(scale); renderer.setSize(r.width, r.height, false);
      renderer.render(scene, cam);
      const src = renderer.domElement;
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height + Math.round(60 * scale);
      const g = c.getContext('2d');
      g.fillStyle = '#F3EFE6'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(src, 0, 0);
      g.fillStyle = '#0E0E10'; g.font = `600 ${Math.min(14 * scale, c.width / 95)}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
      g.fillText(`${(store.name || '—').toUpperCase()} — ${api.t({ it: 'Materia Sospesa', en: 'Suspended Matter' })}, ${new Date().getFullYear()}. ${totalCaught} ${api.t({ it: 'frammenti, fili, una lampadina', en: 'fragments, wire, one light bulb' })}.`, 20 * scale, src.height + 30 * scale);
      renderer.setPixelRatio(old); resize();
      c.toBlob((b) => download('occhio-materia-sospesa.png', b), 'image/png');
    }

    const clock = new THREE.Clock();
    let raf = 0, alive = true;
    const step = () => {
      if (!alive) return;
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, clock.getDelta());
      t += dt; st += dt;
      if (state === 'show') {
        if (st > 1.6) { explode(1 + round * 0.08); state = 'fly'; st = 0; flash = 1; boom(); shake(box); vibrate([40, 30, 80]); }
      } else if (state === 'fly') {
        const pdt = dt * ts;
        let flying = 0;
        for (const f of roundFrags) {
          if (f.state !== 'fly') continue;
          flying++;
          f.v.y -= 9.8 * pdt;
          f.mesh.position.addScaledVector(f.v, pdt);
          f.mesh.rotation.x += f.w.x * pdt; f.mesh.rotation.y += f.w.y * pdt; f.mesh.rotation.z += f.w.z * pdt;
          const p = f.mesh.position;
          for (const [k, lim] of [['x', ROOM.x - 0.15], ['z', ROOM.z - 0.15]]) if (Math.abs(p[k]) > lim) { p[k] = Math.sign(p[k]) * lim; f.v[k] *= -0.4; }
          if (p.y > ROOM.y - 0.15) { p.y = ROOM.y - 0.15; f.v.y *= -0.3; }
          if (p.y < 0.04) {
            // lie flat on the thinnest side
            const [sx, sy, sz] = f.size, mn = Math.min(sx, sy, sz);
            f.mesh.rotation.set(mn === sz ? Math.PI / 2 : 0, f.mesh.rotation.y, mn === sx ? Math.PI / 2 : 0);
            p.y = mn / 2 + 0.005; f.state = 'floor';
            if (f.mesh.material === M.ember || f.mesh.material === M.char || f.mesh.material === M.charLight) f.mesh.material = M.floorDead;
          }
        }
        if (!flying || st > 9) tally();
      } else if (state === 'tally') {
        if (st > 1.4) nextRound();
      } else if (state === 'finale') {
        orbit = Math.sin(st * 0.9) * 0.55;
        if (st > 3.2) { state = 'done'; finish(); }
      } else if (state === 'done') orbit = Math.sin(st * 0.3) * 0.4;
      // the hung pieces turn slowly on their wires
      for (const f of frags) if (f.state === 'hang') { f.mesh.rotation.y += Math.sin(t * 0.7 + f.sway) * 0.002; f.w.multiplyScalar(0.96); f.mesh.rotation.x += f.w.x * dt * 0.1; }
      bulb.intensity = 46 * (1 + (flash > 0 ? flash * 3 : 0)) * (0.97 + Math.random() * 0.03);
      flash = Math.max(0, flash - dt * 2.5);
      placeCam(t);
      renderer.render(scene, cam);
      drawOverlay();
    };

    function drawOverlay() {
      og.clearRect(0, 0, vw, vh);
      if (state === 'show') {
        const n = Math.ceil(1.6 - st);
        og.fillStyle = '#0E0E10'; og.font = `900 ${Math.min(vw, vh) * 0.2}px Archivo, sans-serif`; og.textAlign = 'center'; og.textBaseline = 'middle';
        og.globalAlpha = 0.85; og.fillText(n > 0 ? String(n) : '', vw / 2, vh * 0.25); og.globalAlpha = 1;
        og.font = `700 ${Math.min(22, vw / 18)}px "JetBrains Mono", monospace`;
        og.fillText(api.t(ROUNDS[round].name).toUpperCase(), vw / 2, vh * 0.25 + Math.min(vw, vh) * 0.13);
      }
      if (flash > 0) { og.fillStyle = `rgba(255,246,210,${flash * 0.8})`; og.fillRect(0, 0, vw, vh); }
      og.textAlign = 'center';
      for (const p of popups) {
        p.life -= 1 / 60;
        og.strokeStyle = p.miss ? 'rgba(0,0,0,.3)' : '#E8202A'; og.lineWidth = 3;
        og.beginPath(); og.arc(p.x, p.y, (p.miss ? 14 : 22) + (0.5 - p.life) * 60, 0, Math.PI * 2); og.stroke();
      }
      popups = popups.filter((p) => p.life > 0);
      if (state === 'fly') {
        const left = roundFrags.filter((f) => f.state === 'fly').length;
        og.fillStyle = '#0E0E10'; og.font = `700 13px "JetBrains Mono", monospace`; og.textAlign = 'left'; og.textBaseline = 'top';
        og.fillText(`${api.t({ it: 'in volo', en: 'flying' })} ${left} · ${api.t({ it: 'sospesi', en: 'hung' })} ${caught}`, 12, 12);
      }
    }

    nextRound();
    step();
    api.onCleanup(() => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      scene.traverse((o) => { o.geometry?.dispose?.(); });
      Object.values(M).forEach((m) => m.dispose());
      renderer.dispose();
      try { actx?.close(); } catch {}
    });
  },
};
