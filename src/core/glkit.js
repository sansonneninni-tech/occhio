// Small WebGL helpers for the shader games: context, programs, fullscreen quad, render targets.
// Shaders are GLSL ES 1.00 so they run on both WebGL 1 and 2.

export function glContext(canvas, { float = false } = {}) {
  const attrs = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, premultipliedAlpha: false };
  let gl = canvas.getContext('webgl2', attrs);
  const gl2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
  if (!gl) return null;
  const ctx = { gl, gl2, floatTarget: null };
  if (float) ctx.floatTarget = pickFloatFormat(gl, gl2);
  return ctx;
}

// Finds a renderable half/full float texture format, or null.
function pickFloatFormat(gl, gl2) {
  const tries = [];
  if (gl2) {
    if (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')) {
      tries.push({ internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT });
      tries.push({ internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT });
    }
  } else {
    const hf = gl.getExtension('OES_texture_half_float');
    gl.getExtension('EXT_color_buffer_half_float');
    gl.getExtension('OES_texture_half_float_linear');
    if (hf) tries.push({ internal: gl.RGBA, format: gl.RGBA, type: hf.HALF_FLOAT_OES });
    if (gl.getExtension('OES_texture_float')) { gl.getExtension('WEBGL_color_buffer_float'); tries.push({ internal: gl.RGBA, format: gl.RGBA, type: gl.FLOAT }); }
  }
  for (const f of tries) {
    const t = target(gl, 4, 4, f);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    t.dispose();
    if (ok) return f;
  }
  return null;
}

const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

export function program(gl, fs, vs = VS) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  const locs = {};
  const u = (name) => (name in locs ? locs[name] : (locs[name] = gl.getUniformLocation(p, name)));
  return {
    use() { gl.useProgram(p); return this; },
    f(name, ...v) { const l = u(name); if (l) gl[`uniform${v.length}f`](l, ...v); return this; },
    fv(name, arr, size = 4) { const l = u(name); if (l) gl[`uniform${size}fv`](l, arr); return this; },
    i(name, v) { const l = u(name); if (l) gl.uniform1i(l, v); return this; },
    tex(name, unit, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return this.i(name, unit); },
    dispose() { gl.deleteProgram(p); },
  };
}

// Fullscreen triangle strip bound to attribute 0.
export function quad(gl) {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  return {
    draw(fb = null, w, h) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() { gl.deleteBuffer(b); },
  };
}

// Texture + framebuffer. fmt defaults to RGBA8.
export function target(gl, w, h, fmt = null, filter = null) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const f = filter ?? (fmt && fmt.type !== gl.UNSIGNED_BYTE ? gl.NEAREST : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (fmt) gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, fmt.format, fmt.type, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb, w, h, dispose() { gl.deleteTexture(tex); gl.deleteFramebuffer(fb); } };
}

// Plain texture you upload a 2D canvas into each frame.
export function canvasTexture(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return {
    tex,
    upload(src) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    },
    dispose() { gl.deleteTexture(tex); },
  };
}

// A GL canvas layered under a 2D overlay canvas, both filling an arena box.
export function glStage(box) {
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  box.prepend(canvas);
  return canvas;
}
