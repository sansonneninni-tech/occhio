// Museum sound: a drone that never resolves, the revolver, wet bodies, breath. WebAudio only, no files.
import { store } from '../../core/store.js';

export function makeAudio() {
  let ctx = null, master = null, muf = null, droneGain = null, noise = null, nodes = [];
  const ok = () => !store.muted && ctx;
  return {
    start() {
      if (store.muted) return;
      try {
        ctx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        if (master) return;
        master = ctx.createGain(); master.gain.value = 0.9; muf = ctx.createBiquadFilter(); muf.type = 'lowpass'; muf.frequency.value = 20000; master.connect(muf).connect(ctx.destination);
        const len = ctx.sampleRate;
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        droneGain = ctx.createGain(); droneGain.gain.value = 0.0001; droneGain.connect(master);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 6; lp.connect(droneGain);
        for (const f of [41.2, 41.9, 61.7, 87.3]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = f > 80 ? 0.12 : 0.3; o.connect(g).connect(lp); o.start(); nodes.push(o); }
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 140; lfo.connect(lg).connect(lp.frequency); lfo.start(); nodes.push(lfo);
        const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6; const ng = ctx.createGain(); ng.gain.value = 0.05; n.connect(bp).connect(ng).connect(droneGain); n.start(); nodes.push(n);
        droneGain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 3);
      } catch { ctx = null; }
    },
    setMuted(m) { if (master) master.gain.value = m ? 0 : 0.9; },
    stop() { try { nodes.forEach((n) => n.stop()); ctx?.close(); } catch {} ctx = null; master = null; muf = null; nodes = []; },
    burst(dur, freq, q = 1, vol = 0.2, type = 'bandpass', slideTo = 0) {
      if (!ok()) return;
      const t0 = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
      if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f).connect(g).connect(master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
    },
    // a black-powder shot: click, crack, low punch, a room tail
    shot() {
      if (!ok()) return;
      const p = 0.92 + Math.random() * 0.16;
      this.burst(0.025, 5200 * p, 0.7, 0.35, 'highpass');
      this.burst(0.14, 1100 * p, 0.9, 0.55, 'bandpass', 380);
      this.tone(160 * p, 0.18, 'sine', 0.55, 42);
      this.tone(90 * p, 0.12, 'triangle', 0.25, 40);
      this.burst(0.55, 900, 0.5, 0.12, 'lowpass', 140);
    },
    click(hi = 1) { if (!ok()) return; this.tone(2600 * hi, 0.025, 'square', 0.05); this.burst(0.02, 3800 * hi, 3, 0.08, 'bandpass'); },
    glass(k = 0) { if (!ok()) return; this.tone(2100 + k * 260, 0.18, 'sine', 0.05); this.tone(3150 + k * 390, 0.12, 'sine', 0.03); },
    splat() { if (!ok()) return; this.burst(0.16, 1400, 1.2, 0.3, 'lowpass', 220); this.tone(110, 0.1, 'sine', 0.18, 55); },
    thud() { if (!ok()) return; this.burst(0.1, 700, 1, 0.15, 'lowpass', 200); },
    heart() { if (!ok()) return; this.tone(62, 0.13, 'sine', 0.3, 44); setTimeout(() => this.tone(55, 0.16, 'sine', 0.22, 40), 170); },
    // wet, low, close: a body that should not be breathing
    growl(pitch = 1, vol = 0.18) { if (!ok()) return; this.tone(70 * pitch, 0.5, 'sawtooth', vol * 0.6, 48 * pitch); this.burst(0.45, 380 * pitch, 4, vol, 'bandpass', 160 * pitch); },
    // a scream torn in noise
    scream(pitch = 1, vol = 0.22) { if (!ok()) return; this.burst(0.9, 1800 * pitch, 6, vol, 'bandpass', 600 * pitch); this.tone(620 * pitch, 0.8, 'sawtooth', vol * 0.25, 240 * pitch); },
    // meat hit by a ball of paint
    flesh() { if (!ok()) return; this.burst(0.12, 600, 1.5, 0.35, 'lowpass', 140); this.burst(0.05, 2400, 2, 0.12, 'bandpass'); },
    breath(vol = 0.1) { if (!ok()) return; this.burst(1.1, 700, 0.8, vol, 'bandpass', 300); },
    // a single bell-like stroke for discoveries and level starts
    toll(f = 110) { if (!ok()) return; this.tone(f, 3.2, 'sine', 0.22, f * 0.98); this.tone(f * 2.76, 2.2, 'sine', 0.07); this.tone(f * 5.4, 1.2, 'sine', 0.03); },
    drone(v = 0.09) { if (droneGain && ctx) droneGain.gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, 0.6); },
    get ctx() { return ctx; },
    get out() { return master; },
    // 0 = clear, 1 = deaf (everything under water)
    muffle(k = 0) { if (muf && ctx) muf.frequency.setTargetAtTime(20000 * (1 - k) + 260 * k, ctx.currentTime, 0.15); },
    tone(freq, dur, type = 'sine', vol = 0.15, slideTo = 0) {
      if (!ok()) return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
    },
  };
}

