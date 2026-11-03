// Load extra Google Fonts only for the games that need them.
const loaded = new Set();

export function useFonts(families) {
  const missing = families.filter((f) => !loaded.has(f));
  if (missing.length) {
    missing.forEach((f) => loaded.add(f));
    const q = missing.map((f) => 'family=' + f.replace(/ /g, '+')).join('&');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${q}&display=swap`;
    document.head.append(link);
  }
  // Resolve when the fonts are ready, or after a short wait if the network is slow.
  const names = families.map((f) => f.split(':')[0]);
  const ready = Promise.all(names.map((n) => document.fonts?.load?.(`40px "${n}"`, 'AaБ') ?? Promise.resolve()));
  return Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
}
