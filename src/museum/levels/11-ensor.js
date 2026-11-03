// LEVEL 11 · James Ensor, "Squelettes se disputant un hareng-saur" (1891).
// You are the herring. Two gangs of skeletons, the Reds and the Greens, both want to bite you and hate
// each other. Kill too many of one gang and the other grows stronger: keep the scale balanced.
// If a Red and a Green bite you at the same moment they pull you apart, like the herring.
// Lure them together: when a Red meets a Green they fight and bite each other.

const T = (it, en) => ({ it, en });
const NEED = 12; // per gang

// the uniform under the skull: a coat, two hanging sleeves with bony hands, a spine for a neck
function coat(THREE, { lift, color, trim, w = 0.42, fur = false, map = null }) {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, map, roughness: 0.95, side: THREE.DoubleSide });
  const edge = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.9 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.7 });
  // shoulders, chest and the skirt of the coat, turned on a lathe
  const prof = [[0.12, 0.06], [w * 0.9, -0.04], [w * 1.12, -0.16], [w * 1.0, -lift * 0.45], [w * 0.86, -lift * 0.75], [w * 0.95, -lift * 0.98]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), cloth);
  body.scale.z = 0.7; g.add(body);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(w * 0.5, 0.04, 5, 10), edge);
  collar.rotation.x = Math.PI / 2; collar.position.y = -lift * 0.05; g.add(collar);
  for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), bone); v.position.set(0, -k * 0.06 + 0.12, -0.05); g.add(v); }
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * w * 1.08, -lift * 0.14, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, lift * 0.62, 6), cloth); sleeve.position.y = -lift * 0.31;
    const hand = new THREE.Group(); hand.position.y = -lift * 0.62;
    for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.16, 3), bone); fg.position.set((f - 1.5) * 0.025, -0.08, 0); fg.rotation.z = (f - 1.5) * 0.15; hand.add(fg); }
    sh.add(sleeve, hand); g.add(sh); arms.push({ sh, side });
  }
  if (fur) { const ep = new THREE.Mesh(new THREE.BoxGeometry(w * 1.4, 0.05, 0.16), edge); ep.position.y = -lift * 0.1; g.add(ep); }
  g.userData.tick = (t, m) => {
    const k = 0.4 + m.moving * 0.8 + m.anger * 0.6;
    for (const a of arms) { a.sh.rotation.x = Math.sin(t * 6 + a.side) * 0.45 * k - (m.state.fight ? 1.2 : 0); a.sh.rotation.z = a.side * (0.15 + m.anger * 0.3); }
    body.rotation.y = Math.sin(t * 3) * 0.08;
  };
  return g;
}

// thick oil cloth in Ensor's strokes: the base colour dragged with lighter and darker paint
function cloth(base, strokes) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = strokes[i % strokes.length]; g.globalAlpha = 0.25 + Math.random() * 0.5; g.lineWidth = 2 + Math.random() * 6;
    const x = Math.random() * 128, y = Math.random() * 256, a = (Math.random() - 0.5) * 1.2 + Math.PI / 2, l = 10 + Math.random() * 30;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

function chatter(ctx, vol = 1, pitch = 1) {
  for (let i = 0; i < 5; i++) ctx.after(i * 0.055, (c) => { c.audio.tone((1500 + Math.random() * 500) * pitch, 0.022, 'square', 0.035 * vol); c.audio.burst(0.02, 3400 * pitch, 3, 0.06 * vol, 'bandpass'); });
}

export default {
  id: 'ensor',
  artist: 'James Ensor',
  year: '1891',
  title: T('Scheletri che si contendono un’aringa', 'Skeletons Fighting over a Pickled Herring'),
  museum: T('Musées royaux des Beaux-Arts, Bruxelles', 'Royal Museums of Fine Arts of Belgium, Brussels'),
  image: '/museo/opere/11-ensor.jpg',
  credit: T('Riproduzione: pubblico dominio', 'Reproduction: public domain'),
  intro: T('Un salone di carnevale a Ostenda, col cielo rosa dipinto sui muri. Due bande di morti in uniforme si contendono un’aringa affumicata. L’aringa sei tu.', 'A carnival hall in Ostend, with a pink sky painted on the walls. Two gangs of dead men in uniform fight over a smoked herring. You are the herring.'),
  rule: T('Gli scheletri Rossi e i Verdi ti vogliono mordere e si odiano. Se uccidi troppi di una banda, l’altra diventa più forte: alterna i colpi. Se un Rosso e un Verde ti mordono insieme ti strappano come l’aringa. Falli incontrare: si azzuffano tra loro.', 'The Red and the Green skeletons want to bite you and hate each other. Kill too many of one gang and the other grows stronger: alternate your shots. If a Red and a Green bite you together they tear you apart like the herring. Make them meet: they brawl with each other.'),
  ruleShort: T('alterna i colpi tra Rossi e Verdi', 'alternate shots between Reds and Greens'),
  goal: T(`Uccidi ${NEED} scheletri Rossi e ${NEED} Verdi.`, `Kill ${NEED} Red and ${NEED} Green skeletons.`),
  paint: '#c03018',
  accent: '#1f9a58',
  fx: { mono: 0.3, tint: [1, 0.93, 0.9], keepRed: 1, contrast: 0.5, exposure: 1.1, grain: 0.55, scratches: 0.3, dust: 0.4, flicker: 0.25, smear: 0.2, vignette: 0.6, wobble: 0.05 },
  discovery: {
    title: T('L’aringa è Ensor', 'The herring is Ensor'),
    text: T('In francese «hareng saur», aringa affumicata, si pronuncia quasi come «art Ensor». L’aringa è il pittore, e i due scheletri sono i critici che lo facevano a pezzi. Ensor visse quasi tutta la vita a Ostenda, sopra il negozio di souvenir della madre, pieno di maschere di carnevale e conchiglie: le maschere diventarono la sua ossessione.', 'In French “hareng saur”, smoked herring, sounds almost like “art Ensor”. The herring is the painter, and the two skeletons are the critics tearing him apart. Ensor lived almost all his life in Ostend, above his mother’s souvenir shop, full of carnival masks and seashells: the masks became his obsession.'),
  },
  deathLine: T('Ti hanno diviso a metà. Una metà ai Rossi, una ai Verdi.', 'They split you in half. One half to the Reds, one to the Greens.'),

  async setup(ctx) {
    const { THREE } = ctx;
    const sky = ctx.art.wall([0.02, 0.02, 0.4, 0.3], { dark: 0.18 });
    const wall = ctx.art.wall([0.5, 0.05, 0.12, 0.3], { dark: 0.3 });
    const floor = ctx.art.wall([0.55, 0.72, 0.2, 0.2], { dark: 0.45 });
    ctx.map.build({
      grid: [
        '############################',
        '#RR..#..................#VV#',
        '#R...#..................#.V#',
        '#....#...##........##...#..#',
        '#.........##......##.......#',
        '##..#....................#.#',
        '#R..#.......#....#.......#V#',
        '#...........#....#.........#',
        '#...........#..P.#.........#',
        '#R..#.......#....#.......#V#',
        '##..#....................#.#',
        '#.........##......##.......#',
        '#....#...##........##...#..#',
        '#R...#..................#.V#',
        '#RR..#..................#VV#',
        '######Q###############Q#####',
      ],
      legend: { R: { rossi: true }, V: { verdi: true } },
      textures: { wall, floor, ceil: sky, painting: ctx.art.texture },
      height: 4.2,
    });
    ctx.light({ ambient: 1.1, color: 0xffe0dc, ground: 0x4a2a20, lantern: { angle: 0.7, range: 18, intensity: 30, color: 0xffe8d8 }, fog: { color: 0x3a2028, near: 8, far: 40 } });

    // the two halves of the hall wear the two coats, painted from the picture
    const W = ctx.map.width * ctx.CELL, Hh = ctx.map.height * ctx.CELL;
    const redTex = ctx.art.tex(ctx.art.crop([0.02, 0.82, 0.2, 0.16]), { repeat: true });
    const greenTex = ctx.art.tex(ctx.art.crop([0.72, 0.8, 0.16, 0.16]), { repeat: true });
    const coatRed = ctx.art.tex(cloth('#c8381c', ['#e2502a', '#8a1c0c', '#f07040'])), coatGreen = ctx.art.tex(cloth('#14864a', ['#2cb466', '#0a4a26', '#5ad08a', '#a02010']));
    for (const [tex, x] of [[redTex, W * 0.25], [greenTex, W * 0.75]]) {
      tex.repeat.set(6, 8);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(W / 2, Hh), new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 }));
      pl.rotation.x = -Math.PI / 2; pl.position.set(x, 0.012, Hh / 2); ctx.add(pl);
    }

    const calvo = await ctx.art.load('/museo/opere/11-ensor-calvo.png');
    const colbacco = await ctx.art.load('/museo/opere/11-ensor-colbacco.png');
    // the jaw of the bald skull, cut from the same picture: it flies off when the skull falls
    const jawC = document.createElement('canvas');
    { const w = calvo.width, h = calvo.height; jawC.width = Math.round(w * 0.6); jawC.height = Math.round(h * 0.36); const g = jawC.getContext('2d'); g.drawImage(calvo, w * 0.38, h * 0.62, w * 0.6, h * 0.36, 0, 0, jawC.width, jawC.height); }

    const d = ctx.data = { k: { r: 0, g: 0 }, bite: { r: -9, g: -9 }, tugCd: 0, chatT: 2, warned: 0 };
    d.strength = (f) => { const bal = d.k.r - d.k.g; return 1 + Math.min(5, Math.max(0, f === 'g' ? bal : -bal)) * 0.22; };

    const faction = (m, c, dt) => {
      const s = m.state, str = d.strength(m.def.faction);
      m.anger = Math.max(m.anger, (str - 1) * 0.9);
      if (s.fight) {
        const o = s.fight;
        if (o.dying || !c.monsters.list.includes(o)) s.fight = null;
        else {
          m.moving = 0; s.ft -= dt; s.bt = (s.bt ?? 0.2) - dt;
          if (s.bt <= 0) {
            s.bt = 0.5; o.hp -= 0.55 * str * c.D.hp; o.flash = 1;
            c.particles.burst({ x: (o.pos.x + m.pos.x) / 2, y: 1.5, z: (o.pos.z + m.pos.z) / 2 }, 8, 0xe8dcc0, 2);
            if (Math.random() < 0.5) chatter(c, 0.6);
            if (o.hp <= 0) c.monsters.kill(o);
          }
          if (s.ft <= 0) { s.fight = null; s.cool = 2.5; }
          return;
        }
      }
      s.cool = Math.max(0, (s.cool ?? 0) - dt);
      if (!s.cool) for (const o of c.monsters.list) {
        if (o.dying || !o.def.faction || o.def.faction === m.def.faction || o.state.fight || o.state.cool) continue;
        if (Math.hypot(o.pos.x - m.pos.x, o.pos.z - m.pos.z) < 1.4) {
          s.fight = o; o.state.fight = m; s.ft = o.state.ft = 3.2;
          c.hud.whisper(T('si mordono tra loro', 'they bite each other'));
          chatter(c, 1.2, 0.8);
          return;
        }
      }
      c.monsters.walkTo(m, c.player.pos, m.speed * (0.75 + 0.25 * str), dt);
      c.monsters.melee(m, dt, str);
    };
    // two bites from two gangs in the same moment: you are pulled apart
    const onAttack = (m, c) => {
      const f = m.def.faction, o = f === 'r' ? 'g' : 'r';
      d.bite[f] = c.time;
      chatter(c, 1);
      if (c.time - d.bite[o] < 0.8 && d.tugCd <= 0) {
        d.tugCd = 2;
        c.after(0.22, (cc) => {
          cc.player.hurt(12 * cc.D.dmg, m);
          const a = Math.random() * Math.PI * 2; cc.player.push(Math.cos(a) * 9, Math.sin(a) * 9);
          cc.view.shake = 1; cc.audio.scream(0.5, 0.3);
          cc.hud.say(T('Ti tirano come l’aringa!', 'They pull you like the herring!'), 1800);
        });
      }
    };
    const red = {
      name: T('Lo scheletro calvo', 'The bald skeleton'), faction: 'r',
      sprite: calvo, height: 1.1, lift: 1.1, hp: 1.0, speed: 3.0, dmg: 5, reach: 1.35, radius: 0.42, attackEvery: 0.9,
      twitch: 0.9, rot: 0.25, tear: 0.15, breathe: 0.6, blood: 0xd8c8a0,
      parts: [() => coat(THREE, { lift: 1.1, color: 0xc8381c, trim: 0x6a1408, map: coatRed })],
      zones: [{ name: 'cranio', x: [-0.5, 0.1], y: [0.45, 1], mul: 1.6 }],
      behavior: faction, onAttack,
      onDeath(m, c) { if (Math.random() < 0.5) c.after(0.3, () => c.spawn(jaw, { x: m.pos.x, z: m.pos.z }, { instant: true })); },
    };
    const green = {
      name: T('Lo scheletro col colbacco', 'The skeleton in the bearskin'), faction: 'g',
      sprite: colbacco, height: 1.6, lift: 0.95, hp: 1.6, speed: 2.4, dmg: 8, reach: 1.4, radius: 0.48, attackEvery: 1.15,
      twitch: 0.5, rot: 0.2, tear: 0.35, breathe: 2.2, blood: 0xd8c8a0,
      parts: [() => coat(THREE, { lift: 0.95, color: 0x158a48, trim: 0xa02010, w: 0.46, fur: true, map: coatGreen })],
      behavior: faction, onAttack,
    };
    const jaw = {
      name: T('La mascella', 'The jaw'), sprite: jawC, height: 0.38, lift: 1.0, hp: 0.6, speed: 4.4, dmg: 5, reach: 1.1, radius: 0.25,
      twitch: 1, rot: 0.1, breathe: 0, tear: 0, counts: false, blood: 0xd8c8a0, behavior: 'fly', attackEvery: 0.6,
      onAttack(m, c) { chatter(c, 1.3, 1.3); },
    };
    d.defs = { red, green, jaw };

    const from = (flag) => (c) => {
      const pts = c.map.find(flag).filter((p) => p.distanceTo(c.player.pos) > 7);
      return pts[Math.floor(Math.random() * pts.length)] || null;
    };
    ctx.spawner({ kinds: [{ def: red }], first: 3, every: 5.2, max: 3, where: from('rossi') });
    ctx.spawner({ kinds: [{ def: green }], first: 3, every: 5.6, max: 3, where: from('verdi') });

    ctx.hud.bar('r', { label: T('furia dei Rossi', 'fury of the Reds'), value: 0, color: '#d0401c' });
    ctx.hud.bar('g', { label: T('furia dei Verdi', 'fury of the Greens'), value: 0, color: '#22a060' });
    ctx.hud.goal(T('uccisi Rossi · Verdi', 'killed Reds · Greens'), `0/${NEED} · 0/${NEED}`);
    ctx.pickup(ctx.map.toWorld(14, 2), { kind: 'heal', amount: 35, color: 0xc8a040 });
    ctx.pickup(ctx.map.toWorld(14, 13), { kind: 'heal', amount: 35, color: 0xc8a040 });
  },

  update(ctx, dt) {
    const d = ctx.data;
    d.tugCd = Math.max(0, d.tugCd - dt);
    const sr = d.strength('r'), sg = d.strength('g');
    ctx.hud.bar('r', { value: (sr - 1) / 1.1 });
    ctx.hud.bar('g', { value: (sg - 1) / 1.1 });
    const bal = d.k.r - d.k.g;
    const lvl = Math.abs(bal) >= 4 ? 2 : Math.abs(bal) >= 2 ? 1 : 0;
    if (lvl > d.warned) {
      ctx.hud.say(bal > 0 ? T('I Verdi si sentono più forti.', 'The Greens feel stronger.') : T('I Rossi si sentono più forti.', 'The Reds feel stronger.'), 2000);
      ctx.audio.growl(0.6, 0.25);
    }
    d.warned = lvl;
    // the stronger gang pushes the colour of the hall
    ctx.fx.tint = bal > 1 ? [0.9, 1, 0.92] : bal < -1 ? [1.05, 0.88, 0.85] : [1, 0.93, 0.9];
    // teeth never stop
    d.chatT -= dt;
    if (d.chatT <= 0) {
      d.chatT = 1.2 + Math.random() * 1.8;
      let near = 1e9; for (const m of ctx.monsters.list) if (!m.dying) near = Math.min(near, m.pos.distanceTo(ctx.player.pos));
      if (near < 12) chatter(ctx, Math.max(0.2, 1 - near / 12));
    }
  },

  onKill(ctx, m) {
    const d = ctx.data, f = m.def.faction;
    if (!f) return;
    d.k[f]++;
    ctx.hud.goal(T('uccisi Rossi · Verdi', 'killed Reds · Greens'), `${Math.min(NEED, d.k.r)}/${NEED} · ${Math.min(NEED, d.k.g)}/${NEED}`);
    if (d.k.r >= NEED && d.k.g >= NEED) ctx.after(0.6, (c) => c.win());
  },
};
