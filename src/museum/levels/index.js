// The 15 levels. Each level is its own file in this folder, named NN-name.js (01-holbein.js …):
// it is picked up automatically, so no thread ever needs to edit this file.
// PLAN lists the painting of every slot, so the menu can show the levels still being restored.

export const PLAN = [
  { n: 1, artist: 'Hans Holbein il Giovane', title: { it: 'Il corpo di Cristo morto nella tomba', en: 'The Body of the Dead Christ in the Tomb' }, year: '1521–22' },
  { n: 2, artist: 'Hans Baldung Grien', title: { it: 'La Morte e la fanciulla', en: 'Death and the Maiden' }, year: '1517' },
  { n: 3, artist: 'Pieter Bruegel il Vecchio', title: { it: 'Il Trionfo della Morte', en: 'The Triumph of Death' }, year: '1562' },
  { n: 4, artist: 'Matthias Grünewald', title: { it: 'La Tentazione di Sant’Antonio', en: 'The Temptation of St Anthony' }, year: '1512–16' },
  { n: 5, artist: 'Caravaggio', title: { it: 'Medusa', en: 'Medusa' }, year: '1597–98' },
  { n: 6, artist: 'Johann Heinrich Füssli', title: { it: 'L’incubo', en: 'The Nightmare' }, year: '1781' },
  { n: 7, artist: 'Arnold Böcklin', title: { it: 'L’isola dei morti', en: 'Isle of the Dead' }, year: '1880' },
  { n: 8, artist: 'Gustave Doré', title: { it: 'Inferno', en: 'Inferno' }, year: '1861' },
  { n: 9, artist: 'Théodore Géricault', title: { it: 'La zattera della Medusa', en: 'The Raft of the Medusa' }, year: '1818–19' },
  { n: 10, artist: 'Odilon Redon', title: { it: 'Il ragno che ride', en: 'The Smiling Spider' }, year: '1881' },
  { n: 11, artist: 'James Ensor', title: { it: 'Scheletri che si contendono un’aringa', en: 'Skeletons Fighting over a Pickled Herring' }, year: '1891' },
  { n: 12, artist: 'Edvard Munch', title: { it: 'L’urlo', en: 'The Scream' }, year: '1893' },
  { n: 13, artist: 'Hieronymus Bosch', title: { it: 'Il Giardino delle delizie · Inferno', en: 'The Garden of Earthly Delights · Hell' }, year: '1490–1510' },
  { n: 14, artist: 'Francisco Goya', title: { it: 'Saturno che divora un figlio', en: 'Saturn Devouring His Son' }, year: '1819–23' },
  { n: 15, artist: 'Francis Bacon', title: { it: 'Studio dal ritratto di Innocenzo X di Velázquez', en: 'Study after Velázquez’s Portrait of Pope Innocent X' }, year: '1953' },
];

const found = import.meta.glob('./[0-9][0-9]-*.js', { eager: true });

// LEVELS[i] is the module of level i + 1, or null while it is still being made
export const LEVELS = PLAN.map((p) => {
  const key = Object.keys(found).find((k) => k.startsWith(`./${String(p.n).padStart(2, '0')}-`));
  const mod = key ? found[key].default : null;
  return mod ? { ...p, ...mod, n: p.n, ready: true } : { ...p, ready: false };
});

// the demo level, reachable with #/play/museo-maledetto?esempio (not part of the 15)
export const loadExample = () => import('./_esempio.js').then((m) => ({ ...m.default, n: 1, ready: true }));
