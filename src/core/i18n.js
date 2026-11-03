import { store } from './store.js';

const detect = () => (navigator.language || 'it').toLowerCase().startsWith('it') ? 'it' : 'en';
let lang = store.lang || detect();
const listeners = new Set();

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  store.lang = l;
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn(l));
}
export const onLang = (fn) => (listeners.add(fn), () => listeners.delete(fn));

// t({it, en}) or t('key') from UI strings.
export function t(o, vars) {
  let str = typeof o === 'string' ? (UI[o]?.[lang] ?? UI[o]?.it ?? o) : (o?.[lang] ?? o?.it ?? '');
  if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v);
  return str;
}

document.documentElement.lang = lang;

export const UI = {
  enterTitle: { it: 'Allena l’occhio.', en: 'Train your eye.' },
  enterSub: { it: '15 giochi d’azione che ti lasciano un’opera, più un museo maledetto da 15 quadri. Scrivi un nome e sfida i record.', en: '15 action games that leave you an artwork, plus a cursed museum of 15 paintings. Pick a name and chase the records.' },
  namePh: { it: 'Il tuo nome', en: 'Your name' },
  play: { it: 'Gioca', en: 'Play' },
  hello: { it: 'Ciao, {name}', en: 'Hi, {name}' },
  change: { it: 'cambia nome', en: 'change name' },
  all: { it: 'Tutti', en: 'All' },
  colore: { it: 'Colore', en: 'Color' },
  design: { it: 'Design', en: 'Design' },
  '3d': { it: '3D', en: '3D' },
  arte: { it: 'Arte', en: 'Art' },
  folle: { it: 'Folli', en: 'Wild' },
  museo: { it: 'Museo', en: 'Museum' },
  mzKicker: { it: 'Il gioco grande · 15 quadri, 15 incubi', en: 'The big game · 15 paintings, 15 nightmares' },
  mzEnter: { it: 'Entra nel museo', en: 'Enter the museum' },
  mzHalls: { it: 'quadri attraversati', en: 'paintings crossed' },
  mzWarn: { it: 'Contiene immagini molto disturbanti. Vietato ai minori di 16 anni. Cuffie consigliate.', en: 'Contains deeply disturbing imagery. Not for under 16s. Headphones recommended.' },
  games: { it: 'giochi', en: 'games' },
  best: { it: 'Record', en: 'Best' },
  notPlayed: { it: 'Mai giocato', en: 'Not played' },
  totalScore: { it: 'Punti totali', en: 'Total points' },
  played: { it: 'Giochi provati', en: 'Games tried' },
  start: { it: 'Inizia', en: 'Start' },
  howTo: { it: 'Come si gioca', en: 'How to play' },
  round: { it: 'Round', en: 'Round' },
  score: { it: 'Punti', en: 'Score' },
  combo: { it: 'Combo', en: 'Combo' },
  again: { it: 'Rigioca', en: 'Play again' },
  back: { it: 'Tutti i giochi', en: 'All games' },
  newRecord: { it: 'Nuovo record!', en: 'New record!' },
  yourBest: { it: 'Il tuo record', en: 'Your best' },
  leaderboard: { it: 'Classifica su questo dispositivo', en: 'Leaderboard on this device' },
  downloads: { it: 'Portati a casa', en: 'Take it home' },
  card: { it: 'Card del punteggio (PNG)', en: 'Score card (PNG)' },
  accuracy: { it: 'Precisione', en: 'Accuracy' },
  confirm: { it: 'Conferma', en: 'Confirm' },
  perfect: { it: 'PERFETTO', en: 'PERFECT' },
  great: { it: 'OTTIMO', en: 'GREAT' },
  good: { it: 'BENE', en: 'GOOD' },
  close: { it: 'QUASI', en: 'CLOSE' },
  miss: { it: 'MANCATO', en: 'MISS' },
  timeUp: { it: 'TEMPO!', en: 'TIME!' },
  go: { it: 'VIA!', en: 'GO!' },
  sound: { it: 'Suono', en: 'Sound' },
  marquee: { it: 'GIOCA ✦ DIPINGI ✦ STAMPA ✦ SCOLPISCI ✦ SCARICA L’OPERA ✦ BATTI IL RECORD ✦ ', en: 'PLAY ✦ PAINT ✦ PRINT ✦ SCULPT ✦ TAKE THE ARTWORK ✦ BEAT THE RECORD ✦ ' },
  rules: { it: 'Regole di design del gioco', en: 'Game design rules' },
  loading: { it: 'Carico…', en: 'Loading…' },
};
