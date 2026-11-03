// The "rotten film" look shared by every level: Begotten-style black and white, crushed blacks,
// heavy grain, scratches, dust, flicker, gate weave and smear (each frame drags the previous one).
// Levels tune it through ctx.fx (see docs/museo-livelli.md). All values are 0..1 unless noted.
import * as THREE from 'three';

export const FX_DEFAULTS = {
  mono: 0.85,        // 0 = full colour, 1 = black and white
  tint: [0.92, 0.86, 0.74], // colour multiplied over the mono image (old silver print)
  keepRed: 0.6,      // lets reds (blood, flesh) survive the mono
  contrast: 0.55,    // S-curve strength
  exposure: 1.2,     // multiplier (0.5..2)
  grain: 0.4,
  scratches: 0.45,
  dust: 0.5,
  flicker: 0.35,
  weave: 0.3,        // the frame drifts like old film in the gate
  smear: 0.25,       // ghost of the previous frames
  vignette: 0.5,
  tunnel: 0,         // narrows the sight to a hole
  stone: 0,          // grey stone crust over the view
  blur: 0,           // out of focus
  hurt: 0,           // red pulse (the engine drives it when you are hit)
  wobble: 0,         // the image breathes and melts
  mirror: 0,         // 1 = image flipped left/right (used with ctx.view.mirror)
  invert: 0,         // negative
  pixel: 0,          // 0..1 chunkier pixels
};

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene, tPrev;
uniform vec2 res;
uniform float time, mono, keepRed, contrast, exposure, grain, scratches, dust, flicker, weave, smear, vignette, tunnel, stone, blur, hurt, wobble, mirror, invert, pixel;
uniform vec3 tint;
float h1(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
void main(){
  float fr = floor(time * 18.0);                 // film runs at 18 fps
  vec2 uv = vUv;
  if (mirror > 0.5) uv.x = 1.0 - uv.x;
  // gate weave + occasional frame jump
  uv += weave * vec2(h1(fr) - 0.5, h1(fr + 7.0) - 0.5) * 0.006;
  if (h1(fr * 1.3) > 0.985) uv.y += weave * 0.02;
  // breathing / melting
  uv += wobble * 0.012 * vec2(sin(uv.y * 18.0 + time * 2.1), cos(uv.x * 14.0 + time * 1.7));
  if (pixel > 0.0) { vec2 px = res / (1.0 + pixel * 5.0); uv = (floor(uv * px) + 0.5) / px; }
  vec3 c = texture2D(tScene, uv).rgb;
  if (blur > 0.0) {
    vec2 o = blur * 3.0 / res;
    c = (c + texture2D(tScene, uv + vec2(o.x, 0)).rgb + texture2D(tScene, uv - vec2(o.x, 0)).rgb + texture2D(tScene, uv + vec2(0, o.y)).rgb + texture2D(tScene, uv - vec2(0, o.y)).rgb) / 5.0;
  }
  c *= exposure;
  // red survives the black and white
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float red = clamp((c.r - max(c.g, c.b)) * 3.0, 0.0, 1.0) * keepRed;
  vec3 m = mix(c, vec3(l) * tint, mono * (1.0 - red));
  // contrast: crushed blacks, burnt highlights
  m = clamp(m, 0.0, 1.0);
  m = mix(m, m * m * (3.0 - 2.0 * m), contrast);
  // stone crust
  if (stone > 0.0) { float s = noise(vUv * res / 6.0) * 0.5 + noise(vUv * res / 23.0) * 0.5; vec3 g = vec3(dot(m, vec3(0.33)) * 0.7 + s * 0.25); m = mix(m, g, stone); }
  // flicker
  m *= 1.0 - flicker * 0.18 * h1(fr * 3.1);
  // scratches: thin vertical lines that live a few frames
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float seed = floor(time * 6.0) + fk * 17.0;
    if (h1(seed) < scratches * 0.7) {
      float x = h1(seed + 3.0);
      float w = 0.0008 + h1(seed + 5.0) * 0.0015;
      float line = smoothstep(w, 0.0, abs(vUv.x - x - sin(vUv.y * 9.0 + seed) * 0.002));
      m = mix(m, vec3(h1(seed + 9.0) > 0.5 ? 0.95 : 0.02), line * 0.7);
    }
  }
  // dust and hairs
  float d = h2(floor(vUv * res / 2.0) + fr);
  if (d > 1.0 - dust * 0.0005) m = vec3(h1(fr + d) > 0.4 ? 0.0 : 1.0);
  // grain
  float gr = h2(floor(vUv * res) + vec2(fr * 17.0, fr * 31.0)) - 0.5;
  float lum = dot(m, vec3(0.333));
  m += gr * grain * (0.08 + lum * 0.45);
  // vignette and tunnel vision
  vec2 q = vUv - 0.5; q.x *= res.x / res.y;
  float r = length(q);
  m *= 1.0 - vignette * smoothstep(0.35, 1.0, r);
  if (tunnel > 0.0) m *= 1.0 - smoothstep(0.55 - tunnel * 0.5, 0.62 - tunnel * 0.48, r);
  // hurt: red bleeding from the edges
  m = mix(m, vec3(0.55, 0.0, 0.02), hurt * smoothstep(0.15, 0.9, r) * 0.85);
  if (invert > 0.0) m = mix(m, 1.0 - m, invert);
  // smear with the previous frames
  vec3 prev = texture2D(tPrev, vUv).rgb;
  m = mix(m, max(m, prev * 0.96), smear * 0.75);
  gl_FragColor = vec4(clamp(m, 0.0, 1.0), 1.0);
}`;

export function createPostFX(renderer) {
  const opts = { type: THREE.UnsignedByteType, depthBuffer: true };
  const scene = new THREE.WebGLRenderTarget(4, 4, opts);
  let a = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
  let b = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
  const uniforms = { tScene: { value: scene.texture }, tPrev: { value: b.texture }, res: { value: new THREE.Vector2(4, 4) }, time: { value: 0 }, tint: { value: new THREE.Vector3() } };
  for (const k of Object.keys(FX_DEFAULTS)) if (k !== 'tint') uniforms[k] = { value: FX_DEFAULTS[k] };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const qScene = new THREE.Scene(); qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const copyMat = new THREE.MeshBasicMaterial({ map: a.texture });
  const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat);
  const cScene = new THREE.Scene(); cScene.add(copyQuad);

  return {
    target: scene,
    setSize(w, h) { scene.setSize(w, h); a.setSize(w, h); b.setSize(w, h); uniforms.res.value.set(w, h); },
    render(fx, time) {
      for (const k of Object.keys(FX_DEFAULTS)) {
        if (k === 'tint') { const t = fx.tint || FX_DEFAULTS.tint; uniforms.tint.value.set(t[0], t[1], t[2]); }
        else uniforms[k].value = fx[k] ?? FX_DEFAULTS[k];
      }
      uniforms.time.value = time;
      uniforms.tPrev.value = b.texture;
      renderer.setRenderTarget(a); renderer.render(qScene, qCam);
      copyMat.map = a.texture;
      renderer.setRenderTarget(null); renderer.render(cScene, qCam);
      [a, b] = [b, a];
    },
    dispose() { scene.dispose(); a.dispose(); b.dispose(); mat.dispose(); copyMat.dispose(); },
  };
}
