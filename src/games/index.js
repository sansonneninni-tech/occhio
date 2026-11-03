export const CATS = {
  colore: { label: 'colore', color: '#FF4D1F', ink: '#0E0E10' },
  design: { label: 'design', color: '#2D3BFF', ink: '#F3EFE6' },
  '3d': { label: '3d', color: '#12C97A', ink: '#0E0E10' },
  arte: { label: 'arte', color: '#FFD400', ink: '#0E0E10' },
  museo: { label: 'museo', color: '#B3001B', ink: '#F3EFE6' },
};

import raffica from './raffica.js';
import paletteWars from './palette-wars.js';
import risoPress from './riso-press.js';
import glitch from './glitch.js';
import neon from './neon.js';
import patternDj from './pattern-dj.js';
import typeStorm from './type-storm.js';
import bauhausTower from './bauhaus-tower.js';
import prismRunner from './prism-runner.js';
import lightPainting from './light-painting.js';
import lathe from './lathe.js';
import collage from './collage.js';
import graffiti from './graffiti.js';
import kaleido from './kaleido.js';
import inkScroll from './ink-scroll.js';
import museum from '../museum/index.js';

export const GAMES = [
  raffica, paletteWars, risoPress, glitch,
  neon, patternDj, typeStorm, bauhausTower,
  prismRunner, lightPainting, lathe,
  collage, graffiti, kaleido, inkScroll,
];

// The big one: shown as a hero above the grid, not counted among the mini games.
export const MUSEUM = museum;
export const ALL = [museum, ...GAMES];
