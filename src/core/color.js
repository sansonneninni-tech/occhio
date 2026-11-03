// Color math: conversions, perceptual distance (OKLab), contrast, color-blindness simulation.
import { clamp } from './dom.js';

export function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// h 0..360, s,l 0..1 -> [r,g,b] 0..255
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
export const hsl = (h, s, l) => rgbToHex(hslToRgb(h, s, l));

const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklab([r, g, b]) {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
export function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
// Perceptual difference, scaled so ~2 is "just noticeable".
export function deltaE(a, b) {
  const A = rgbToOklab(typeof a === 'string' ? hexToRgb(a) : a);
  const B = rgbToOklab(typeof b === 'string' ? hexToRgb(b) : b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) * 100;
}
export const lightness = (c) => rgbToOklab(typeof c === 'string' ? hexToRgb(c) : c)[0];

export function luminance(c) {
  const [r, g, b] = (typeof c === 'string' ? hexToRgb(c) : c).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export function mix(a, b, t) {
  const A = rgbToOklab(hexToRgb(a)), B = rgbToOklab(hexToRgb(b));
  return rgbToHex(oklabToRgb(A.map((v, i) => v + (B[i] - v) * t)));
}

// Machado et al. 2009, severity 1.0, applied in linear RGB.
const CVD = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};
export function simulateCVD(hex, type) {
  const m = CVD[type];
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return rgbToHex([
    toSrgb(clamp(m[0] * r + m[1] * g + m[2] * b)),
    toSrgb(clamp(m[3] * r + m[4] * g + m[5] * b)),
    toSrgb(clamp(m[6] * r + m[7] * g + m[8] * b)),
  ]);
}

export const randomHex = (sMin = 0.35, sMax = 0.95, lMin = 0.25, lMax = 0.8) =>
  hsl(Math.random() * 360, sMin + Math.random() * (sMax - sMin), lMin + Math.random() * (lMax - lMin));
