// Downloads: palettes (HEX, CSS, ASE, JSON), SVG, PNG and the score card.
import { hexToRgb } from './color.js';

export function download(filename, data, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const paletteText = (cols) => cols.join('\n');
export const paletteCSS = (cols, prefix = 'occhio') =>
  `:root {\n${cols.map((c, i) => `  --${prefix}-${i + 1}: ${c};`).join('\n')}\n}\n`;
export const paletteJSON = (cols, name) => JSON.stringify({ name, colors: cols }, null, 2);

// Adobe Swatch Exchange (ASE) file.
export function paletteASE(cols, name = 'Occhio') {
  const blocks = cols.map((hex, i) => {
    const label = `${name} ${i + 1}`;
    const nameLen = label.length + 1;
    const len = 2 + nameLen * 2 + 4 + 12 + 2;
    const buf = new DataView(new ArrayBuffer(6 + len));
    let o = 0;
    buf.setUint16(o, 0x0001); o += 2;
    buf.setUint32(o, len); o += 4;
    buf.setUint16(o, nameLen); o += 2;
    for (const ch of label) { buf.setUint16(o, ch.charCodeAt(0)); o += 2; }
    buf.setUint16(o, 0); o += 2;
    'RGB '.split('').forEach((c) => { buf.setUint8(o, c.charCodeAt(0)); o += 1; });
    hexToRgb(hex).forEach((v) => { buf.setFloat32(o, v / 255); o += 4; });
    buf.setUint16(o, 2);
    return buf.buffer;
  });
  const head = new DataView(new ArrayBuffer(12));
  'ASEF'.split('').forEach((c, i) => head.setUint8(i, c.charCodeAt(0)));
  head.setUint16(4, 1); head.setUint16(6, 0); head.setUint32(8, blocks.length);
  return new Blob([head.buffer, ...blocks], { type: 'application/octet-stream' });
}

// Standard set of palette downloads.
export function paletteExports(cols, base) {
  return [
    { label: 'HEX (.txt)', run: () => download(`${base}.txt`, paletteText(cols)) },
    { label: 'CSS', run: () => download(`${base}.css`, paletteCSS(cols), 'text/css') },
    { label: 'Adobe (.ase)', run: () => download(`${base}.ase`, paletteASE(cols, base)) },
    { label: 'JSON', run: () => download(`${base}.json`, paletteJSON(cols, base), 'application/json') },
    { label: 'PNG', run: () => palettePNG(cols, base) },
  ];
}

export function palettePNG(cols, base) {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 600;
  const g = c.getContext('2d');
  const w = c.width / cols.length;
  cols.forEach((col, i) => {
    g.fillStyle = col; g.fillRect(i * w, 0, w + 1, 480);
    g.fillStyle = '#F3EFE6'; g.fillRect(i * w, 480, w + 1, 120);
    g.fillStyle = '#0E0E10'; g.font = '600 26px "JetBrains Mono", monospace';
    g.fillText(col, i * w + 20, 552);
  });
  c.toBlob((b) => download(`${base}.png`, b), 'image/png');
}

export function svgExport(svgString, base) {
  return { label: 'SVG', run: () => download(`${base}.svg`, svgString, 'image/svg+xml') };
}

export function canvasExport(canvas, base, label = 'PNG') {
  return { label, run: () => canvas.toBlob((b) => download(`${base}.png`, b), 'image/png') };
}

// Shareable score card, 1080x1350.
export async function scoreCard({ title, score, rank, name, color, ink = '#0E0E10', accuracy }) {
  try { await document.fonts.ready; } catch {}
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  g.fillStyle = '#F3EFE6'; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = color; g.fillRect(48, 48, 984, 900);
  g.fillStyle = ink;
  g.font = '900 620px Archivo, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(rank, 540, 800);
  g.textAlign = 'left';
  g.font = '800 64px Archivo, sans-serif';
  wrap(g, title.toUpperCase(), 96, 160, 880, 70);
  g.fillStyle = '#0E0E10';
  g.font = '900 150px Archivo, sans-serif';
  g.fillText(score.toLocaleString(), 48, 1120);
  g.font = '600 34px "JetBrains Mono", monospace';
  g.fillText(`${name || '—'}${accuracy != null ? `  ·  ${Math.round(accuracy * 100)}%` : ''}`, 52, 1190);
  g.font = '900 44px Archivo, sans-serif';
  g.fillText('OCCHIO', 52, 1290);
  g.textAlign = 'right';
  g.font = '600 28px "JetBrains Mono", monospace';
  g.fillText(new Date().toLocaleDateString(), 1028, 1290);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; }
    else line = test;
  }
  g.fillText(line, x, y);
}
