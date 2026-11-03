import { h, clamp } from '../core/dom.js';
import { hsl } from '../core/color.js';
import { arcadeLayout, input, loop, toStage } from '../core/arcade.js';
import { button } from '../core/ui.js';
import { download } from '../core/export.js';
import { stamp } from '../core/fx.js';

const N = 40;
const ORDERS = 4;
const NAMES = [
  { it: 'Anfora', en: 'Amphora' }, { it: 'Ciotola', en: 'Bowl' }, { it: 'Bottiglia', en: 'Bottle' },
  { it: 'Vaso a goccia', en: 'Teardrop vase' }, { it: 'Calice', en: 'Chalice' }, { it: 'Urna', en: 'Urn' },
];

function targetProfile() {
  const a = Math.random() * 0.35, b = Math.random() * 0.25, ph = Math.random() * 6, f = 1 + Math.random() * 2.2;
  const base = 0.3 + Math.random() * 0.25;
  return Array.from({ length: N }, (_, i) => {
    const y = i / (N - 1);
    return clamp(base + a * Math.sin(y * Math.PI * f + ph) + b * Math.sin(y * Math.PI * 2.7 + ph * 1.7) - (y > 0.9 ? (y - 0.9) * 0.8 : 0), 0.1, 0.92);
  });
}

export default {
  id: 'tornio',
  cat: '3d',
  title: { it: 'Tornio Furioso', en: 'Wild Wheel' },
  tagline: { it: 'Modella l’argilla che gira. I clienti aspettano. Ti porti a casa i vasi in 3D.', en: 'Shape spinning clay. Customers are waiting. Take your vases home in 3D.' },
  how: {
    it: 'L’argilla gira sul tornio: trascina sopra per spingerla dentro o tirarla fuori.|Segui la sagoma tratteggiata ordinata dal cliente.|Consegna prima che il tempo finisca. Ogni vaso si scarica come modello 3D (.obj).',
    en: 'Clay spins on the wheel: drag over it to push it in or pull it out.|Follow the dashed outline the customer ordered.|Deliver before time is up. Every vase downloads as a 3D model (.obj).',
  },
  thumb: () => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#12C97A"/><ellipse cx="80" cy="88" rx="46" ry="8" fill="#0E0E10"/><path d="M64 84 C46 64 58 46 70 38 C74 30 70 20 66 14 H94 C90 20 86 30 90 38 C102 46 114 64 96 84Z" fill="#C8623A" stroke="#0E0E10" stroke-width="3"/><path d="M60 84 C40 62 56 44 68 36" fill="none" stroke="#F3EFE6" stroke-width="2" stroke-dasharray="4 4"/></svg>`,

  async mount(stage, api) {
    const { board, controls } = arcadeLayout(stage);
    const box = h('div', { class: 'arena', style: { background: '#E9E3D6' } }, h('p', { class: 'g-hint', style: { paddingTop: '30%' } }, api.t('loading')));
    board.append(box);
    let resolve = null;
    const order = h('b', { style: { fontSize: '18px' } });
    const done = button(api.t({ it: 'Consegna', en: 'Deliver' }), () => resolve?.());
    controls.append(order, done);

    const THREE = await import('three');
    if (api.destroyed) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    const overlay = h('canvas', { style: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' } });
    box.replaceChildren(renderer.domElement, overlay);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'ew-resize' });
    const og = overlay.getContext('2d');
    const inp = input(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    cam.position.set(0, 0.6, 10); cam.lookAt(0, 0.5, 0);
    scene.add(new THREE.HemisphereLight('#fff6e8', '#5a4a3a', 1.6));
    const key = new THREE.DirectionalLight('#fff', 2.4); key.position.set(-3, 4, 5); scene.add(key);
    const mat = new THREE.MeshStandardMaterial({ color: '#C8623A', roughness: 0.85, metalness: 0 });
    let mesh = null;
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6 }));
    wheel.position.y = -0.06; scene.add(wheel);
    let prof = Array(N).fill(0.5), target = targetProfile();
    const H = 1.6;
    const rebuild = () => {
      const pts = [new THREE.Vector2(0, 0), ...prof.map((r, i) => new THREE.Vector2(r, (i / (N - 1)) * H)), new THREE.Vector2(0.001, H)];
      const geo = new THREE.LatheGeometry(pts, 64);
      geo.computeVertexNormals();
      if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; } else { mesh = new THREE.Mesh(geo, mat); scene.add(mesh); }
    };
    rebuild();
    let view = { w: 1, h: 1, half: 1 };
    const resize = () => {
      const r = box.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      overlay.width = r.width * devicePixelRatio; overlay.height = r.height * devicePixelRatio;
      og.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const aspect = r.width / r.height;
      const half = 1.15;
      cam.left = -half * aspect; cam.right = half * aspect; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
      view = { w: r.width, h: r.height, half, aspect };
    };
    const ro = new ResizeObserver(resize); ro.observe(box); resize();
    // world -> screen with ortho camera centered at (0, 0.5)
    const toScreen = (x, y) => ({ x: view.w / 2 + (x / (view.half * view.aspect)) * (view.w / 2), y: view.h / 2 - ((y - 0.5) / view.half) * (view.h / 2) });
    const toWorld = (sx, sy) => ({ x: ((sx - view.w / 2) / (view.w / 2)) * view.half * view.aspect, y: 0.5 - ((sy - view.h / 2) / (view.h / 2)) * view.half });
    let spin = 0, active = false;
    const stopLoop = loop((dt) => {
      spin += dt * 5;
      if (mesh) mesh.rotation.y = spin;
      wheel.rotation.y = spin;
      if (active && inp.down) {
        const w = toWorld(inp.x, inp.y);
        const idx = (w.y / H) * (N - 1);
        const want = clamp(Math.abs(w.x), 0.08, 0.95);
        let changed = false;
        for (let i = 0; i < N; i++) {
          const k = Math.exp(-((i - idx) ** 2) / 6);
          if (k < 0.02) continue;
          prof[i] += (want - prof[i]) * Math.min(1, k * dt * 10); changed = true;
        }
        if (changed) rebuild();
      }
      renderer.render(scene, cam);
      // overlay target
      og.clearRect(0, 0, view.w, view.h);
      og.setLineDash([8, 7]); og.lineWidth = 3; og.strokeStyle = '#0E0E10';
      for (const side of [-1, 1]) { og.beginPath(); target.forEach((r, i) => { const p = toScreen(side * r, (i / (N - 1)) * H); i ? og.lineTo(p.x, p.y) : og.moveTo(p.x, p.y); }); og.stroke(); }
      og.setLineDash([]);
      inp.frame();
    });
    api.onCleanup(() => { stopLoop(); ro.disconnect(); inp.destroy(); renderer.dispose(); });

    const vases = [];
    const toOBJ = (p, name) => {
      const pts = [new THREE.Vector2(0, 0), ...p.map((r, i) => new THREE.Vector2(r, (i / (N - 1)) * H)), new THREE.Vector2(0.001, H)];
      const geo = new THREE.LatheGeometry(pts, 48).toNonIndexed();
      const pos = geo.attributes.position;
      let s = `# Occhio — ${name}\no ${name}\n`;
      for (let i = 0; i < pos.count; i++) s += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
      for (let i = 0; i < pos.count; i += 3) s += `f ${i + 1} ${i + 2} ${i + 3}\n`;
      geo.dispose();
      return s;
    };

    for (let r = 1; r <= ORDERS; r++) {
      api.hud(api.t({ it: 'Ordine', en: 'Order' }), `${r}/${ORDERS}`);
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      target = targetProfile();
      prof = Array(N).fill(0.5); rebuild();
      mat.color.set('#C8623A');
      order.textContent = api.t({ it: `Il cliente vuole: ${name.it}`, en: `Customer wants: ${name.en}` });
      active = true; done.disabled = false;
      const p = new Promise((res) => (resolve = res));
      const timer = api.timer(Math.max(14, 24 - r * 2), () => resolve());
      await p;
      resolve = null; active = false; done.disabled = true;
      const speed = timer.stop();
      const err = prof.reduce((a, v, i) => a + Math.abs(v - target[i]), 0) / N;
      const q = clamp(1 - (err - 0.015) / 0.16);
      const glaze = hsl(Math.random() * 360, 0.55, 0.5);
      mat.color.set(glaze);
      const png = await new Promise((res) => renderer.domElement.toBlob(res, 'image/png'));
      vases.push({ name: api.t(name), obj: toOBJ(prof, api.t(name).replace(/\s+/g, '_')), png });
      const sp = toStage(stage, box, view.w / 2, view.h * 0.3);
      api.hit(q, { speed, x: sp.x, y: sp.y });
      await api.wait(1400);
    }
    stamp(stage, api.t({ it: 'BOTTEGA CHIUSA', en: 'SHOP CLOSED' }), 'great');
    await api.wait(700);
    api.end({
      exports: vases.flatMap((v, i) => [
        { label: `${v.name} (.obj)`, run: () => download(`occhio-vaso-${i + 1}.obj`, v.obj, 'model/obj') },
        { label: `${v.name} (PNG)`, run: () => download(`occhio-vaso-${i + 1}.png`, v.png) },
      ]),
    });
  },
};
