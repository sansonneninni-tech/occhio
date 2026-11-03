// Still water that reflects the room, and what lives only in mirrors (used by Böcklin and Géricault).
// One mirror camera, one render target; any number of materials read from it with their own
// strength, base texture and ripples. Everything goes through ctx.THREE (no three import here).

const MIRROR_LAYER = 2; // the base engine draws `onlyInMirror` monsters on this layer

const VERT = `
uniform mat4 texMat;
varying vec4 vP; varying vec3 vW; varying float vDepth; varying float vUp;
void main(){
  vec4 w = vec4(position, 1.0);
  vec4 n = vec4(normal, 0.0);
  #ifdef USE_INSTANCING
  w = instanceMatrix * w; n = instanceMatrix * n;
  #endif
  w = modelMatrix * w; n = modelMatrix * n;
  vW = w.xyz;
  vP = texMat * w;
  vUp = normalize(n.xyz).y;
  vec4 mv = viewMatrix * w;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform sampler2D refl, base;
uniform float time, strength, ripple, baseScale, baseBright, side;
uniform vec3 tint, deep;
uniform vec3 fogColor; uniform float fogNear, fogFar, fogDensity;
varying vec4 vP; varying vec3 vW; varying float vDepth; varying float vUp;
void main(){
  vec3 b = texture2D(base, vW.xz * baseScale).rgb * baseBright;
  if (vUp < 0.5) { b *= side; gl_FragColor = vec4(mix(b, fogColor, smoothstep(fogNear, fogFar, vDepth)), 1.0); return; }
  vec2 d = vec2(sin(vW.x * 1.7 + time * 0.6) + sin(vW.z * 2.3 - time * 0.4), cos(vW.z * 1.3 + time * 0.5) + sin(vW.x * 2.9 + time * 0.7));
  vec4 pc = vP; pc.xy += d * 0.006 * ripple * pc.w;
  vec3 r = texture2DProj(refl, pc).rgb * tint;
  vec3 c = mix(b + deep, r, strength);
  float fogF = fogDensity > 0.0 ? 1.0 - exp(-fogDensity * fogDensity * vDepth * vDepth) : smoothstep(fogNear, fogFar, vDepth);
  gl_FragColor = vec4(mix(c, fogColor, fogF), 1.0);
}`;

export function mirrorWater(ctx, { scale = 0.5 } = {}) {
  const { THREE } = ctx;
  const size = new THREE.Vector2();
  ctx.renderer.getSize(size);
  const k = matchMedia('(pointer: coarse)').matches ? 0.35 : 0.5;
  const rt = new THREE.WebGLRenderTarget(Math.max(64, Math.round(size.x * k * scale * 2)), Math.max(64, Math.round(size.y * k * scale * 2)));
  const cam = new THREE.PerspectiveCamera();
  cam.layers.enable(0); cam.layers.enable(MIRROR_LAYER);
  const texMat = new THREE.Matrix4();
  const mats = [];
  const hide = []; // meshes lying on the mirror plane: hidden while the mirror is drawn
  const v = new THREE.Vector3(), t = new THREE.Vector3();
  let busy = false, lastFrame = -1;

  function material({ base, strength = 0.85, ripple = 1, baseScale = 0.25, baseBright = 1, tint = [0.9, 0.95, 1.05], deep = [0, 0, 0], side = 0.6 } = {}) {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        refl: { value: rt.texture }, base: { value: base || null }, texMat: { value: texMat }, time: { value: 0 },
        strength: { value: strength }, ripple: { value: ripple }, baseScale: { value: baseScale }, baseBright: { value: baseBright }, side: { value: side },
        tint: { value: new THREE.Vector3(...tint) }, deep: { value: new THREE.Vector3(...deep) },
        fogColor: { value: new THREE.Color(0) }, fogNear: { value: 1 }, fogFar: { value: 1000 }, fogDensity: { value: 0 },
      },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    mats.push(m);
    return m;
  }

  // draws the mirror once per frame, from the camera that is drawing the scene right now
  function draw(renderer, scene, camera) {
    if (busy || camera !== ctx.camera) return;
    const f = renderer.info.render.frame;
    if (f === lastFrame) return;
    lastFrame = f; busy = true;
    camera.getWorldDirection(v);
    t.copy(camera.position).add(v);
    cam.position.set(camera.position.x, -camera.position.y, camera.position.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(t.x, -t.y, t.z);
    cam.projectionMatrix.copy(camera.projectionMatrix);
    cam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    cam.updateMatrixWorld();
    texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    texMat.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    const fog = scene.fog;
    for (const m of mats) {
      const u = m.uniforms;
      u.time.value = ctx.time;
      if (fog) { u.fogColor.value.copy(fog.color); if (fog.isFogExp2) { u.fogDensity.value = fog.density; } else { u.fogDensity.value = 0; u.fogNear.value = fog.near; u.fogFar.value = fog.far; } }
      else { u.fogDensity.value = 0; u.fogNear.value = 1e5; u.fogFar.value = 1e6; }
    }
    const was = hide.map((o) => o.visible);
    hide.forEach((o) => { o.visible = false; });
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(fog ? fog.color : 0x000000, 1);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.setRenderTarget(prev);
    lastFrame = renderer.info.render.frame;
    hide.forEach((o, i) => { o.visible = was[i]; });
    busy = false;
  }

  // the mirror is drawn from the first visible mirror mesh, just before it is drawn itself
  function attach(mesh) {
    hide.push(mesh);
    mesh.onBeforeRender = (renderer, scene, camera) => draw(renderer, scene, camera);
    return mesh;
  }

  // finds the reflected path of a shot that hit the water: returns the nearest monster on it
  function reflectShot(shot, { reach = 40, widthMul = 0.42 } = {}) {
    if (shot.monster || !shot.point || shot.point.y > 0.06) return null;
    const o = ctx.camera.position;
    const d = new THREE.Vector3().subVectors(shot.point, o).normalize();
    if (d.y >= 0) return null;
    const p = shot.point.clone(); p.y = 0;
    d.y = -d.y;
    let best = null;
    for (const m of ctx.monsters.list) {
      if (m.dying || m.def.hittable === false) continue;
      const hx = m.pos.x - p.x, hz = m.pos.z - p.z;
      const hl = Math.hypot(d.x, d.z) || 1e-6;
      const tt = (hx * d.x + hz * d.z) / (hl * hl);
      if (tt <= 0 || tt > reach) continue;
      const qx = p.x + d.x * tt, qz = p.z + d.z * tt, qy = d.y * tt;
      const off = Math.hypot(qx - m.pos.x, qz - m.pos.z);
      if (off > m.view.width * widthMul) continue;
      if (qy < m.lift || qy > m.lift + m.view.height) continue;
      if (!ctx.map.los(p.x, p.z, m.pos.x, m.pos.z)) continue;
      if (!best || tt < best.t) best = { m, t: tt, point: new THREE.Vector3(qx, qy, qz) };
    }
    return best;
  }

  return { rt, cam, material, attach, hide, reflectShot, dispose() { rt.dispose(); mats.forEach((m) => m.dispose()); } };
}
