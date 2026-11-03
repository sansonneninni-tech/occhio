// LIVELLO DI PROVA: the model to copy. It is not one of the 15 (Goya's real level is 14-goya.js).
// It shows every part of the interface: map with doors and zones, two kinds of monsters cut from
// the painting with 3D parts, a spawner, a custom rule with the action button, an HUD bar, the
// screen filter, a pickup, the discovery. Read docs/museo-livelli.md next to this file.

const T = (it, en) => ({ it, en });

export default {
  id: 'esempio',
  artist: 'Francisco Goya',
  year: '1819–23',
  title: T('Saturno (livello di prova)', 'Saturn (test level)'),
  museum: T('Museo del Prado, Madrid', 'Museo del Prado, Madrid'),
  image: '/museo/opere/_esempio.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T('La casa di un vecchio sordo, fuori Madrid. Ha dipinto i muri da solo, di notte, per nessuno.', 'The house of an old deaf man outside Madrid. He painted the walls himself, at night, for no one.'),
  rule: T('Il buio ti mangia. Tieni premuta l’azione per accendere il lampo: i mostri si fermano accecati, ma il lampo si consuma.', 'Darkness eats you. Hold the action to light the flash: monsters freeze, blinded, but the flash burns out.'),
  ruleShort: T('tieni premuta l’azione: il lampo li acceca', 'hold the action: the flash blinds them'),
  goal: T('Rimanda nel quadro 16 figli divorati.', 'Send 16 devoured sons back into the painting.'),
  paint: '#6a0806',
  accent: '#c83020',
  fx: { mono: 0.92, tint: [0.95, 0.85, 0.7], keepRed: 0.8, grain: 0.6, smear: 0.3, scratches: 0.5 },
  discovery: {
    title: T('Le Pitture Nere', 'The Black Paintings'),
    text: T('Goya non l’ha mai mostrato a nessuno. Lo dipinse direttamente sul muro della sala da pranzo della sua casa, la Quinta del Sordo, insieme ad altre tredici scene nere. Mezzo secolo dopo i muri furono staccati e portati su tela: per questo il quadro è pieno di crepe.', 'Goya never showed it to anyone. He painted it straight onto the dining-room wall of his house, the Quinta del Sordo, with thirteen other dark scenes. Half a century later the walls were peeled off and moved onto canvas: that is why it is full of cracks.'),
  },

  async setup(ctx) {
    const { THREE } = ctx;
    // textures from the painting itself
    const wall = ctx.art.wall([0.55, 0.45, 0.4, 0.25], { dark: 0.1 });
    const floor = ctx.art.wall([0.05, 0.62, 0.5, 0.2], { dark: 0.2 });
    // map: # wall, . floor, P start, M spawn, D door (opens later), Q the painting, ~ blood (slows)
    ctx.map.build({
      grid: [
        '###########################',
        '#P....#.......#.....M.....#',
        '#.....#.......D...........#',
        '#.....D...M...#.....~~~...#',
        '#.....#.......#.....~~~..M#',
        '###D###########.....~~~...#',
        '#.........M...#...........#',
        '#.............######Q######',
        '#..M......~~..............#',
        '#.........~~.......M......#',
        '#####Q#####################',
      ],
      legend: {
        D: { solid: true, tex: 'door', door: true },
        '~': { zone: 'blood' },
      },
      textures: { wall, floor, ceil: wall, door: new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 }), painting: ctx.art.texture },
      height: 3.2,
    });
    ctx.light({ ambient: 0.18, lantern: { angle: 0.55, range: 20, intensity: 45 }, fog: { color: 0x030201, near: 2, far: 20 } });

    // monsters: real cut-outs + 3D flesh
    const son = {
      name: T('Il figlio divorato', 'The devoured son'),
      // the son's body, cut along its outline (points are 0..1 inside rect)
      sprite: ctx.art.cutout({
        rect: [0.38, 0.26, 0.36, 0.46],
        poly: [[0.08, 0], [0.22, 0], [0.32, 0.07], [0.62, 0.07], [0.74, 0.14], [0.75, 0.24], [0.8, 0.27], [0.72, 0.33], [0.68, 0.4], [0.71, 0.5], [0.66, 0.58], [0.66, 0.72], [0.62, 0.85], [0.6, 0.95], [0.5, 0.96], [0.47, 0.85], [0.42, 0.7], [0.36, 0.6], [0.3, 0.55], [0.27, 0.44], [0.3, 0.38], [0.22, 0.34], [0.2, 0.25], [0.28, 0.2], [0.25, 0.1], [0.12, 0.05]],
        rot: 0.35,
      }),
      height: 1.9, hp: 2, speed: 2.8, dmg: 8, behavior: 'chase',
      parts: [{ type: 'tendrils', n: 3, len: 0.7, thick: 0.03, at: [0, 1.75, -0.04], color: 0x3a0606 }],
      blood: 0x8a0808,
    };
    const father = {
      name: T('Saturno', 'Saturn'),
      sprite: ctx.art.cutout({ rect: [0.17, 0.12, 0.53, 0.27], key: { dark: 0.09 }, rot: 0.25 }),
      height: 1.6, lift: 0.7, hp: 6, speed: 2.4, dmg: 18, behavior: 'statue',
      // shooting the open mouth hurts three times more
      zones: [{ name: 'mouth', x: [-0.05, 0.15], y: [0.2, 0.6], mul: 3 }],
      parts: [{ type: 'eyes', at: [[-0.06, 0.62], [0.07, 0.64]], size: 0.06 }, { type: 'strands', n: 18, len: 1.2, at: [0, 1.5, -0.1], color: 0x8a8070 }],
      selfLit: 0.15,
    };
    ctx.goalKills(16);
    ctx.spawner({ kinds: [{ def: son, w: 4 }, { def: father, w: 1 }], first: 3, every: 1.6, max: 7 });

    // rule: the flash, a battery that burns while you hold the action
    ctx.action({ label: T('LAMPO', 'FLASH') });
    ctx.hud.bar('flash', { label: T('lampo', 'flash'), value: 1, color: '#f0e0b0' });
    ctx.data = { flash: 1, opened: 0 };

    // a heal on the floor
    ctx.pickup(ctx.map.toWorld(12, 8), { kind: 'heal', amount: 40 });
  },

  update(ctx, dt) {
    const d = ctx.data;
    const on = ctx.input.alt && d.flash > 0;
    d.flash = Math.max(0, Math.min(1, d.flash + (on ? -dt * 0.45 : dt * 0.08)));
    ctx.hud.bar('flash', { value: d.flash });
    ctx.light({ ambient: on ? 1.4 : 0.18 });
    ctx.fx.exposure = on ? 1.6 : 1;
    // m.hold stops a monster's behaviour (the engine skips it) without killing it
    for (const m of ctx.monsters.list) m.hold = on;
    // the doors open as you kill
    const doors = ctx.map.find('door');
    const k = Math.floor(ctx.kills / 4);
    while (d.opened < Math.min(k, doors.length)) {
      const p = doors[d.opened++];
      ctx.map.setSolid(p.cx, p.cy, false);
      ctx.audio.toll(60);
      ctx.hud.say(T('Una porta si apre, da qualche parte.', 'A door opens, somewhere.'), 2200);
    }
  },

  // every shot passes here first: you can read or change shot.dmg, or return false to cancel it
  onShot(ctx, shot) {
    if (shot.zone === 'mouth') ctx.hud.whisper(T('nella bocca', 'in the mouth'));
  },
};
