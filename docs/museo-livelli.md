# Museo Maledetto · come si scrive un livello

Il museo ha 15 livelli. **Un livello = un file** in `src/museum/levels/`, chiamato `NN-nome.js` (`01-holbein.js`, `07-bocklin.js`…). Il file viene trovato da solo: non serve toccare nessun altro file. Il modello completo da copiare è [`src/museum/levels/_esempio.js`](../src/museum/levels/_esempio.js) (livello di prova, si apre con `#/play/museo-maledetto?esempio`).

La base comune (motore, revolver, filtro marcio, HUD, vite, menu, comandi PC e telefono) sta in `src/museum/core/` e `src/museum/index.js`. Se un livello ha bisogno di qualcosa che la base non fa, si chiede al thread della base invece di modificare `core/` in un branch di livello.

## Regole del progetto (da ninni)

- Un quadro vero e un artista diverso per livello. Si spara sempre.
- Ogni livello ha **mappa sua**, **regola di gameplay sua**, **mostri presi dal quadro** (ritaglio + parti 3D) e **una scoperta finale** che fa venire voglia di cercare l'autore.
- Inquietudine massima (Begotten, Marian Dora), sempre legata all'opera, mai splatter a caso.
- Ritmo: i mostri arrivano **subito** (spawner con `first` ≥ 3). Niente attese all'inizio.
- Difficoltà crescente: la base già scala vita, velocità, danno e ritmo dei mostri con il numero del livello (`ctx.D`). 13-15 sono brutali.
- Vite: 3 per tutta la partita (le gestisce la base). Un livello può regalarne una con `ctx.pickup(pos, { kind: 'life' })`, con parsimonia.

## Il file del livello

```js
export default {
  id: 'holbein',                     // breve, minuscolo
  artist: 'Hans Holbein il Giovane',
  year: '1521–22',
  title: { it: '…', en: '…' },
  museum: { it: 'Kunstmuseum, Basilea', en: '…' },   // facoltativo
  image: '/museo/opere/01-holbein.jpg',              // la riproduzione vera, in public/museo/opere/
  credit: { it: 'Riproduzione: pubblico dominio', en: '…' },
  intro: { it: 'Atmosfera, 1-2 frasi', en: '…' },    // nella schermata d'ingresso
  rule: { it: 'La regola spiegata in 1-2 frasi', en: '…' },
  ruleShort: { it: 'versione da 6 parole', en: '…' }, // banner a inizio livello
  goal: { it: 'Obiettivo in una riga', en: '…' },
  paint: '#6a0806',      // colore della vernice nel revolver
  accent: '#c83020',     // colore d'accento dell'HUD
  fx: { mono: 0.9, … },  // filtro schermo di partenza (vedi "Filtro")
  player: { hp: 100, speed: 5.4 },     // facoltativo
  zones: { ghiaccio: { speed: 1.1, friction: 0.05 } }, // zone di pavimento in più
  discovery: {
    title: { it: '…', en: '…' },
    text: { it: 'La scoperta sull\'artista, 2-4 frasi', en: '…' },
    image: '/museo/opere/01-holbein-dettaglio.jpg',  // facoltativo, sostituisce il quadro nella schermata finale
  },
  deathLine: { it: 'Frase quando muori qui', en: '…' }, // facoltativo

  async setup(ctx) { /* costruisci mappa, luci, mostri, spawner, regola */ },
  update(ctx, dt) { /* ogni frame: la tua regola */ },
  onShot(ctx, shot) { /* ogni colpo; cambia shot.dmg, o return false per annullarlo */ },
  onKill(ctx, monster, shot) {},
  onHurt(ctx, dmg, from) { return dmg; },   // puoi cambiare il danno che subisci
  teardown(ctx) {},
  souvenir(g, { x, y, w, h, stats, lang }) {}, // facoltativo: disegna sul quadro scaricato a fine livello
};
```

Testi sempre in italiano e inglese (`{ it, en }`). **Non importare `three` direttamente** nel file del livello: usa `ctx.THREE` (così Three.js si carica solo quando entri nel museo).

## Vittoria

- `ctx.goalKills(n)`: vinci quando hai ucciso n mostri (l'HUD mostra quanti ne mancano).
- Oppure vittoria tua: chiama `ctx.win()` quando vuoi (uscita raggiunta, campane abbattute, sopravvissuto T secondi…). `ctx.hud.goal(label, valore)` mostra il tuo contatore in alto a destra.
- `ctx.lose()` uccide il giocatore.

## La mappa

```js
ctx.map.build({
  grid: [
    '#########',
    '#P..M..Q#',
    '#..~~...#',
    '###D#####',
  ],
  legend: { D: { solid: true, tex: 'door', door: true }, '~': { zone: 'ice' } },
  textures: { wall, floor, ceil, door, painting: ctx.art.texture },
  height: 3,          // altezza muri (m)
  ceiling: true,      // false = cielo aperto (usa ctx.light({ sky }))
});
```

- Una cella = `ctx.CELL` metri (2). Riga 0 = nord. `P` partenza, `M` punti di comparsa, `X` uscita, `Q` muro con il quadro appeso, `#` muro, `.` pavimento, spazio = vuoto pieno.
- Legenda tua: `solid`, `tex` (nome della texture in `textures`, oppure un `Material`), `zone` (nome zona), `painting`, e qualunque flag (`door: true`) che poi ritrovi con `ctx.map.find('door')`.
- Durante il gioco: `ctx.map.setSolid(cx, cy, false)` apre una cella (porte, sportelli, tende), `true` la richiude.
- Utili: `ctx.map.find(ch o flag)` → posizioni mondo con `.cx .cy`; `ctx.map.toWorld(cx, cy)`; `ctx.map.cellAt(x, z)`; `ctx.map.zoneAt(x, z)`; `ctx.map.setZone(cx, cy, 'water')`; `ctx.map.los(ax, az, bx, bz)`; `ctx.map.freeAround(x, z, min, max, n)`.
- Geometria libera: `ctx.add(mesh)` aggiunge qualunque oggetto Three.js (zattera, isola, pontile, scale). Gli ostacoli rotondi si aggiungono con `ctx.collider(x, z, r)`. Per uno spazio aperto usa una griglia di `.` circondata da spazi (vuoto pieno) e `ceiling: false`.
- Zone già pronte: `ice`, `mud`, `water`, `blood` (`speed` moltiplica la velocità, `friction` 0..1 inerzia: bassa = scivola, `dps` danno al secondo). Le tue in `zones` del livello.

## Texture dal quadro

- `ctx.art.image` è la riproduzione caricata, `ctx.art.texture` la sua texture.
- `ctx.art.wall([x, y, w, h], { dark })` → texture ripetibile da un pezzo del quadro (rettangolo in 0..1).
- `ctx.art.crop(rect)` → canvas; `ctx.art.tex(canvas, { repeat, pixel })` → texture.
- `ctx.art.load(src)` carica un'altra immagine (dettagli, PNG con trasparenza).

## Mostri

Un mostro è un oggetto di definizione:

```js
const figlio = {
  name: { it: 'Il figlio divorato', en: '…' },
  sprite: ctx.art.cutout({ rect: [0.38, 0.26, 0.36, 0.46], poly: [[0.1, 0], …] }),
  height: 1.9, lift: 0,           // altezza in metri; lift = sollevato da terra
  hp: 2, speed: 2.8, dmg: 8, reach: 1.3, radius: 0.4,
  behavior: 'chase',              // oppure una funzione (m, ctx, dt) => {}
  parts: [{ type: 'tendrils', n: 3 }, { type: 'eyes', at: [[-0.06, 0.62]] }],
  zones: [{ name: 'bocca', x: [-0.05, 0.15], y: [0.2, 0.6], mul: 3 }],  // punti deboli (mul 0 = invulnerabile lì)
  boss: false, counts: true, fake: false, onlyInMirror: false, ghost: false,
  twitch: 0.5, rot: 0.5, tear: 0.6, breathe: 1, selfLit: 0, glow: 0, blood: 0x7a0608, score: 1,
  frames: 1, fps: 8,               // sprite a più frame affiancati in orizzontale
  onSpawn(m, ctx) {}, update(m, ctx, dt) {}, onHit(m, shot, ctx) { return shot.dmg; }, onDeath(m, ctx, shot) {}, onAttack(m, ctx) {},
  projectile: { speed: 7, dmg: 8, color: 0xb02010, size: 0.14 }, fireEvery: 2.2, // per behavior 'ranged'
  attackEvery: 0.9, fixed: false,  // fixed: true = non scala con la difficoltà
};
```

- **Ritaglio dal quadro**: `ctx.art.cutout({ rect, poly, key, oval, feather, rot })`. `rect` in 0..1 del quadro; `poly` = contorno (punti 0..1 dentro il rect), il modo migliore; senza `poly` il ritaglio sfuma in un ovale. `key: { dark: 0.1 }` toglie lo sfondo più scuro di quel valore (`light` il contrario). `rot` mangia i bordi a buchi.
- **PNG già scontornato**: `sprite: await ctx.art.load('/museo/opere/xx-mostro.png')`, con `frames` per un'animazione a striscia.
- **Parti 3D pronte** (`ctx.PARTS`): `tendrils`, `spikes`, `eyes` (ti seguono con lo sguardo), `sack` (sacco di carne che pulsa), `legs` (zampe di ragno che camminano), `teeth`, `strands` (capelli, nervi). Coordinate `at`: per `eyes` e `teeth` frazioni dello sprite `[x -0.5..0.5, y 0..1]`, per le altre metri `[x, y, z]`. Puoi passare anche un tuo `Object3D` o una funzione che lo crea.
- **Comportamenti pronti** (`ctx.BEHAVIORS`): `chase` (ti insegue aggirando i muri), `fly` (vola ondeggiando), `charge` (si ferma, trema, si lancia), `ranged` (sputa da lontano), `statue` (si muove solo se non lo guardi), `lurk` (aspetta al buio), `crawl` (basso, a zig zag), `still` (fermo). Si possono chiamare dentro un comportamento tuo.
- Aiuti per comportamenti tuoi: `ctx.monsters.walkTo(m, target, speed, dt)`, `ctx.monsters.move(m, dx, dz)`, `ctx.monsters.melee(m, dt, mul)`, `ctx.monsters.sees(m)`, `ctx.shoot(m, { speed, dmg, color, size, dir })`.
- Stato del mostro `m`: `m.pos` (Vector3 a terra), `m.hp`, `m.maxHp`, `m.state` (libero, per fasi del boss), `m.data`, `m.hold = true` lo blocca, `m.frozen`, `m.anger`, `m.lift`, `m.view.root` (l'oggetto 3D), `m.view.mat.uniforms` (shader dello sprite).
- Creare: `ctx.spawn(def, pos, { fake, onlyInMirror, hpMul, speedMul, instant, data })`. Lista: `ctx.monsters.list`, vivi: `ctx.monsters.alive`, uccisi: `ctx.kills`. `ctx.monsters.kill(m)`, `ctx.monsters.remove(m)`.
- **Mostri finti** (`fake: true`): non contano, al colpo si sbriciolano.
- **Solo nello specchio** (`onlyInMirror: true`): si vedono solo nello specchietto (`ctx.view.rear`) o con la vista specchiata (`ctx.view.mirror`); si colpiscono solo con la vista specchiata (o con `hitWhenHidden: true`).
- **Boss**: `boss: true` mostra la barra in alto. `ctx.hud.boss(m, nome)` la collega a mano.

## Spawner (ondate)

```js
const onda = ctx.spawner({
  kinds: [{ def: figlio, w: 4 }, { def: padre, w: 1 }],
  first: 3,        // quanti subito
  every: 1.6,      // ogni quanti secondi (diviso per ctx.D.rate)
  burst: 1,        // quanti per volta
  max: 7,          // massimo vivi insieme (cresce con la difficoltà)
  total: 30,       // facoltativo: poi si ferma (onda.done)
  where: 'spawns', // 'spawns' = celle M (predefinito se ci sono), 'around' = attorno al giocatore, o funzione (ctx, def) => Vector3
  min: 7, maxDist: 16, delay: 0, opts: {},
});
onda.stop(); onda.start();
```

Per un muro che avanza (Bruegel) usa `where` con una funzione che restituisce posizioni sulla linea del fronte.

## Il giocatore

`ctx.player`: `pos`, `vel`, `yaw`, `pitch`, `hp`, `maxHp`, `eye` (altezza degli occhi, abbassala per schiacciare la vista), `speed`, `speedMul`, `lookMul`, `frozen` (non si muove, ma gira e spara), `aimShake` (mira che trema), `zone`, `dir`, `head`. Metodi: `place(x, z, yaw)`, `push(vx, vz)` (spinta, es. zattera inclinata), `heal(n)`, `hurt(n, da)`, `isLookingAt(pos, cos)`, `sees(pos)`.

Input (`ctx.input`): `fwd`, `strafe`, `fire`, `alt` (tasto azione tenuto), `altPressed` (premuto in questo frame).

**Tasto azione del livello**: `ctx.action({ label: { it: 'SCUDO', en: 'SHIELD' } })`. PC: tasto destro, Spazio o F. Telefono: un bottone con quella scritta.

Revolver (`ctx.gun`): `dmg` (moltiplicatore), `chambers`, `reloadDur`, `gap`, `spread`, `auto`. `ctx.weapon.setHand('#2a1a10')` (mani annerite), `setPaint(hex)`, `setVisible(false)`.

## Vista, luce, filtro

- `ctx.view.mirror = true`: la camera si gira di 180° e l'immagine si capovolge (Perseo). `ctx.view.rear = true`: specchietto retrovisore in alto. `ctx.view.fov`.
- `ctx.light({ ambient, color, ground, lantern: { angle, range, intensity, color } | false, fog: { color, near, far } | { color, density } | false, sky: colore | texture })`. Lanterna = cono di luce dagli occhi; con `ambient` bassa fuori dal cono è buio pesto.
- `ctx.camera`, `ctx.scene`, `ctx.renderer`, `ctx.THREE` per tutto il resto (riflessi, seconda camera…).
- **Filtro** `ctx.fx` (si cambia anche ogni frame): `mono`, `tint [r,g,b]`, `keepRed`, `contrast`, `exposure`, `grain`, `scratches`, `dust`, `flicker`, `weave`, `smear` (scia dei frame precedenti, Bacon), `vignette`, `tunnel` (vista stretta), `stone` (pietrificazione), `blur`, `wobble` (ondulazione, Munch), `invert`, `pixel`. `hurt` lo guida la base.

## HUD e suono

- `ctx.hud.say(testo, ms)` banner al centro; `ctx.hud.whisper(testo)` sussurro; `ctx.hud.bar(id, { label, value 0..1, color })` barra in più (aggiorni solo `value`); `ctx.hud.remove(id)`; `ctx.hud.goal(label, valore)`.
- `ctx.audio`: `shot()`, `splat()`, `flesh()`, `growl(pitch)`, `scream(pitch)`, `breath()`, `heart()`, `toll(freq)`, `tone(freq, durata, tipo, volume, slide)`, `burst(durata, freq, q, vol, tipo, slide)`, `muffle(0..1)` (sordità), `ctx.audio.ctx` (AudioContext) e `ctx.audio.out` per suoni tuoi.
- Tempo: `ctx.time` (secondi del livello), `ctx.every(sec, fn)`, `ctx.after(sec, fn)`. Caso: `ctx.rand()` (sempre uguale per lo stesso livello) o `Math.random()`.
- Particelle: `ctx.particles.burst(pos, n, colore, velocità)`, `ctx.particles.emitter({ area: [x0, z0, x1, z1], rate, color, fall, wind: [x, z], life, dmg })` per pioggia di fuoco, cenere, neve.
- Oggetti da raccogliere: `ctx.pickup(pos, { kind: 'heal' | 'ammo' | 'life', amount, onTake(ctx), mesh, color })`.
- Dati tuoi del livello: mettili in `ctx.data = { … }`.

## Riproduzioni

- Solo opere in pubblico dominio (Bacon: quadro fornito da ninni). File in `public/museo/opere/NN-nome.jpg`, lato lungo 1600-2000 px, JPEG qualità ~82, sotto 1 MB.
- Wikimedia è bloccato dalla rete delle sessioni; funziona `raw.githubusercontent.com`.

## Provare

`npm run dev`, poi `#/play/museo-maledetto`. Dalla console: `__museum.start(i)` entra nel livello i (0 = il primo pronto), `__museum.step(n)` avanza n frame, `__museum.killAll()`, `__museum.win()`, `__museum.getState()`. `__museum.engine.ctx` è il `ctx` del livello in corso.

Prima di unire: il livello si vince e si perde, gira a 60 fps su PC e sopra 30 su telefono, i mostri compaiono entro 2 secondi, la regola si capisce dalla schermata d'ingresso, la scoperta incuriosisce.
