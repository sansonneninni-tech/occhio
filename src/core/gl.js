// Tiny full-screen fragment shader runner for the shader games, plus hi-res export.
import { h } from './dom.js';

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

function build(gl, frag) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  // fwidth() needs an extension in WebGL 1; the directive must come before any other line.
  const deriv = /fwidth|dFd[xy]/.test(frag) && gl.getExtension('OES_standard_derivatives');
  const head = (deriv ? '#extension GL_OES_standard_derivatives : enable\n' : '') + 'precision highp float;\n';
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, head + frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const locs = {};
  const apply = (uniforms) => {
    for (const [name, v] of Object.entries(uniforms)) {
      if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
      const l = locs[name];
      if (!l) continue;
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.vec === 3) gl.uniform3fv(l, v.data);
      else if (v.vec === 4) gl.uniform4fv(l, v.data);
      else if (v.length === 2) gl.uniform2fv(l, v);
      else if (v.length === 3) gl.uniform3fv(l, v);
      else if (v.length === 4) gl.uniform4fv(l, v);
      else gl.uniform1fv(l, v);
    }
  };
  return { prog, apply };
}

// A canvas in an .arena box that renders `frag` with the given uniforms.
// The shader gets u_res (pixels) automatically.
export function shaderStage(parent, frag, { scale = 1, maxDpr = 2 } = {}) {
  const canvas = h('canvas', { style: { display: 'block', width: '100%', height: '100%', touchAction: 'none' } });
  const box = h('div', { class: 'arena' }, canvas);
  parent.append(box);
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true, alpha: false });
  if (!gl) throw new Error('WebGL non disponibile / WebGL not available');
  const { apply } = build(gl, frag);
  const st = { canvas, box, gl, w: 0, h: 0, uniforms: {}, scale };
  const resize = () => {
    const r = box.getBoundingClientRect();
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1) * st.scale;
    st.w = Math.max(10, Math.round(r.width)); st.h = Math.max(10, Math.round(r.height));
    const W = Math.round(st.w * dpr), H = Math.round(st.h * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(box);
  resize();
  st.draw = (uniforms = st.uniforms) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    apply({ u_res: [canvas.width, canvas.height], ...uniforms });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  // Lower or raise the internal resolution (for slow phones).
  st.setScale = (s) => { st.scale = s; resize(); };
  st.destroy = () => { ro.disconnect(); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  return st;
}

// Render the same shader once at any size on a throwaway canvas and return a PNG blob.
export function renderShaderPNG(frag, W, H, uniforms) {
  return new Promise((resolve, reject) => {
    try {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const gl = c.getContext('webgl', { preserveDrawingBuffer: true, alpha: false });
      const { apply } = build(gl, frag);
      gl.viewport(0, 0, W, H);
      apply({ ...uniforms, u_res: [W, H] });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      c.toBlob((b) => { gl.getExtension('WEBGL_lose_context')?.loseContext(); resolve(b); }, 'image/png');
    } catch (e) { reject(e); }
  });
}
