// Everything lives in this browser. Every access is guarded: storage can be blocked.
const KEY = 'occhio:v1';
let mem = { name: '', lang: '', muted: false, scores: {}, plays: 0 };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) mem = { ...mem, ...JSON.parse(raw) };
  } catch {}
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {}
}
load();

export const store = {
  get name() { return mem.name; },
  set name(v) { mem.name = String(v || '').slice(0, 16); save(); },
  get lang() { return mem.lang; },
  set lang(v) { mem.lang = v; save(); },
  get muted() { return mem.muted; },
  set muted(v) { mem.muted = !!v; save(); },
  get plays() { return mem.plays || 0; },

  // Leaderboard of names on this device, per game.
  board(gameId) {
    return (mem.scores[gameId] || []).slice().sort((a, b) => b.score - a.score);
  },
  best(gameId, name = mem.name) {
    const mine = (mem.scores[gameId] || []).filter((r) => r.name === name);
    return mine.length ? mine.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  },
  record(gameId, entry) {
    const list = mem.scores[gameId] || [];
    const prevBest = this.best(gameId, entry.name);
    const rec = { ...entry, date: Date.now() };
    list.push(rec);
    // Keep the 30 best runs per game.
    list.sort((a, b) => b.score - a.score);
    const rank = list.indexOf(rec);
    mem.scores[gameId] = list.slice(0, 30);
    mem.plays = (mem.plays || 0) + 1;
    save();
    return { isRecord: !prevBest || entry.score > prevBest.score, prevBest, rank, rec };
  },
  totals(name = mem.name) {
    let sum = 0, played = 0;
    for (const id of Object.keys(mem.scores)) {
      const b = this.best(id, name);
      if (b) { sum += b.score; played++; }
    }
    return { sum, played };
  },
};
