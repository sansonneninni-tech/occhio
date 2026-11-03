// The oil revolver, seen in the right hand: walnut grip, blackened brass, a cylinder of six glass
// chambers full of paint. Lives in its own little scene drawn over the world.
import * as THREE from 'three';

export function createWeapon() {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.PointLight(0xffe0b0, 5, 4, 1.2); key.position.set(0.3, 0.4, 0.2); scene.add(key);
  const flash = new THREE.PointLight(0xffb060, 0, 2, 2); flash.position.set(0.05, 0.05, -0.75); scene.add(flash);

  const brass = new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 0.45, metalness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.5, metalness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a1c0e, roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a6a58, roughness: 0.8 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x8a0a08, roughness: 0.15, emissive: 0x220000, transparent: true, opacity: 0.9 });

  const gun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.42, 8), iron); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.035, -0.32);
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.4), brass); rib.position.set(0, 0.07, -0.31);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.2), brass); frame.position.set(0, 0, -0.05);
  const drum = new THREE.Group(); drum.position.set(0, 0.03, -0.07);
  const drumBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12), iron); drumBody.rotation.x = Math.PI / 2; drum.add(drumBody);
  const vials = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.104, 6), paint.clone()); v.rotation.x = Math.PI / 2; v.position.set(Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0);
    drum.add(v); vials.push(v);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.2, 0.075), wood); grip.position.set(0, -0.11, 0.06); grip.rotation.x = -0.35;
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.03), iron); hammer.position.set(0, 0.07, 0.05);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 4, 10, Math.PI), brass); guard.position.set(0, -0.06, -0.02); guard.rotation.set(0, Math.PI / 2, Math.PI);
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.12), skin); palm.position.set(0.01, -0.12, 0.07); palm.rotation.x = -0.35;
  const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.09, 6), skin); thumb.position.set(-0.045, -0.04, 0.0); thumb.rotation.set(1.3, 0, 0.3);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.95 })); sleeve.position.set(0.02, -0.22, 0.32); sleeve.rotation.x = -1.1;
  hand.add(palm, thumb, sleeve);
  gun.add(barrel, rib, frame, drum, grip, hammer, guard, hand);
  const flare = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd090, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  flare.position.set(0, 0.035, -0.58); gun.add(flare);
  const rest = new THREE.Vector3(0.24, -0.25, -0.7);
  gun.scale.setScalar(0.85);
  gun.position.copy(rest);
  gun.rotation.y = 0.06;
  scene.add(gun);

  const st = { recoil: 0, reload: 0, reloadDur: 1, bob: 0, flash: 0, spin: 0, shake: 0 };
  return {
    scene, cam, skin, hand,
    resize(aspect) { cam.aspect = aspect; cam.updateProjectionMatrix(); },
    setPaint(hex) { for (const v of vials) v.material.color.set(hex); },
    setHand(hex) { skin.color.set(hex); },
    setVisible(v) { gun.visible = v; },
    fire() { st.recoil = 1; st.flash = 1; st.spin += 1; },
    reload(dur) { st.reload = dur; st.reloadDur = dur; },
    update(dt, { moving = 0, ammo = 6, aimShake = 0, time = 0 }) {
      st.bob += dt * (4 + moving * 6);
      st.recoil = Math.max(0, st.recoil - dt * 6);
      st.flash = Math.max(0, st.flash - dt * 14);
      st.reload = Math.max(0, st.reload - dt);
      const r = st.reload > 0 ? Math.sin((1 - st.reload / st.reloadDur) * Math.PI) : 0;
      gun.position.set(
        rest.x + Math.sin(st.bob) * 0.012 * moving + (Math.random() - 0.5) * aimShake * 0.02,
        rest.y + Math.abs(Math.cos(st.bob)) * 0.01 * moving - r * 0.12 + st.recoil * 0.03 + (Math.random() - 0.5) * aimShake * 0.02,
        rest.z + st.recoil * 0.09);
      gun.rotation.x = st.recoil * 0.45 + r * 0.6;
      gun.rotation.z = r * 0.9;
      drum.rotation.z += ((st.spin * Math.PI / 3) - drum.rotation.z) * Math.min(1, dt * 18) + (st.reload > 0 ? dt * 20 : 0);
      vials.forEach((v, i) => { v.material.opacity = i < ammo || st.reload > 0 ? 0.92 : 0.12; });
      flash.intensity = st.flash * 6;
      flare.material.opacity = st.flash;
      flare.rotation.z = time * 7;
    },
  };
}
