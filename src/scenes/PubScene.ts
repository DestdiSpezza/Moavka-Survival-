import { took } from '../input/touch';
import Phaser from 'phaser';
import { TILE, WORLD_ZOOM } from '../config';
import { Player } from '../entities/Player';
import { type Color, hash2, Painter, shade } from '../art/painter';
import { createRng } from '../systems/rng';
import { NPCS, type NpcId, STAMGASTI } from '../story/npcs';
import { fillText } from '../texts/gender';
import { pixelFont } from './BootScene';
import type { Story } from './Story';

const W = 30;
const H = 16;
const TALK_RANGE = 24;

/** Kde kdo v eRku stojí nebo sedí (v dlaždicích). */
const SPOTS: Record<NpcId, { x: number; y: number; face: number }> = {
  // Prchard za barem pod regálem s lahvemi.
  prchard: { x: 21.5, y: 3.2, face: Math.PI / 2 },
  plotkova: { x: 14, y: 8.6, face: 0 },
  // Zjebal sedí u štamgastského stolu (s plakátem).
  zjebal: { x: 23.4, y: 10.5, face: Math.PI / 2 },
  dennySochar: { x: 26.1, y: 8.4, face: 0 },
  vesta: { x: 2.9, y: 11, face: Math.PI / 2 },
  omyx: { x: 13.3, y: 13.1, face: Math.PI },
  metejka: { x: 17, y: 12.9, face: -Math.PI / 2 },
  dennyVysoky: { x: 7.2, y: 7.6, face: Math.PI / 2 },
  // Kibi v salonku u šipek: „nejsem tu“.
  kibi: { x: 2, y: 7.8, face: Math.PI },
  kobyla: { x: 0, y: 0, face: 0 },
  ajina: { x: 0, y: 0, face: 0 },
  // Omladina do eRka nechodí.
  prcka: { x: 0, y: 0, face: 0 },
  awe: { x: 0, y: 0, face: 0 },
  natala: { x: 0, y: 0, face: 0 },
  miniVesta: { x: 0, y: 0, face: 0 },
};

type Box = [number, number, number, number];

/** Zeď salonku (s průchodem) a uzavřená kuchyň s WC. */
const SALONEK_WALL: Box[] = [
  [5, 2, 0.5, 5],
  [5, 9.5, 0.5, 5.5],
];
const KITCHEN: Box = [5.5, 2, 10.5, 5];
/** Za barem (regál, Prchard) a pult do L. */
const BEHIND_BAR: Box[] = [
  [16, 2, 13, 2.6],
  [26.8, 4.6, 2.2, 5.4],
];
const POOL: Box = [14.2, 9.4, 6, 2.6];
const TABLES: Box[] = [
  [1.6, 3.4, 2.6, 1.6], // salonek nahoře
  [1.6, 11.4, 2.6, 1.6], // salonek dole (Vesta)
  [10.2, 9, 2.4, 1.5],
  [10.2, 12.4, 2.4, 1.5], // u dveří (Omyx)
  [20.2, 6.3, 1.6, 1.4], // kulatý u baru
  [22.4, 11, 3, 2], // štamgastský stůl
];
const CRATES: Box = [5.6, 13.4, 1.2, 1.4];
const JUKEBOX: Box = [27.6, 13, 1.4, 1.8];

/** Pevné věci v místnosti (dlaždice). */
const SOLIDS: Box[] = [...SALONEK_WALL, KITCHEN, ...BEHIND_BAR, POOL, ...TABLES, CRATES, JUKEBOX];

const DOOR = { x: 7, y: 15, w: 2 };
const PUB_TEXTURE = 'pub-interior-2';

/** Na Prcharda se mluví přes pult, proto dál. */
const talkRange = (id: NpcId) => (id === 'prchard' ? 36 : TALK_RANGE);

interface Npc {
  id: NpcId;
  sprite: Phaser.Physics.Arcade.Sprite;
  label: Phaser.GameObjects.Text;
}

/**
 * Interiér hospody eRko (ADR-004): vlastní místnost, svět venku mezitím stojí.
 * Uvnitř se nebojuje; s Prchardem, Plotkovou a Štamgasty se mluví klávesou E.
 */
export class PubScene extends Phaser.Scene {
  private story!: Story;
  private player!: Player;
  private npcs: Npc[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private eKey!: Phaser.Input.Keyboard.Key;
  private plotkovaDir = 1;

  constructor() {
    super('Pub');
  }

  init(data: { story: Story }): void {
    this.story = data.story;
    this.npcs = [];
  }

  create(): void {
    if (!this.textures.exists(PUB_TEXTURE)) this.textures.addCanvas(PUB_TEXTURE, paintInterior().toCanvas());
    this.add.image(0, 0, PUB_TEXTURE).setOrigin(0).setDepth(0);
    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM).setBackgroundColor('#0a0806');
    cam.centerOn((W * TILE) / 2, (H * TILE) / 2 + 6);
    this.physics.world.setBounds(TILE, 2 * TILE, (W - 2) * TILE, (H - 2.6) * TILE);

    const solids = this.physics.add.staticGroup();
    for (const [x, y, w, h] of SOLIDS) {
      const r = this.add.rectangle((x + w / 2) * TILE, (y + h / 2) * TILE, w * TILE, h * TILE).setVisible(false);
      solids.add(r);
    }

    this.player = new Player(this, (DOOR.x + 1) * TILE, (DOOR.y - 1.2) * TILE);
    this.player.female = this.story.hero.gender === 'f';
    this.player.updateLook();
    this.player.setRotation(-Math.PI / 2);
    this.physics.add.collider(this.player, solids);

    for (const id of ['prchard', 'plotkova', ...STAMGASTI] as NpcId[]) {
      if (!this.story.inPub(id)) continue;
      const s = SPOTS[id];
      const sprite = this.physics.add.staticSprite(s.x * TILE, s.y * TILE, NPCS[id].sprite, 0).setOrigin(8 / 24, 0.5).setRotation(s.face).setDepth(9);
      (sprite.body as Phaser.Physics.Arcade.StaticBody).setCircle(6, 2, 2);
      sprite.refreshBody();
      const label = this.add.text(sprite.x, sprite.y - 13, '', pixelFont(14, NPCS[id].css)).setOrigin(0.5).setScale(0.5).setStroke('#000', 3).setDepth(20);
      this.npcs.push({ id, sprite, label });
      this.physics.add.collider(this.player, sprite);
    }

    // Cedule na kuchyni a WC (malba je jen pixely).
    const [kx, ky, , kh] = KITCHEN;
    for (const [label, x] of [['KUCHYŇ', kx + 3.2], ['WC', kx + 9.1]] as const) {
      this.add.text(x * TILE, (ky + kh - 0.85) * TILE, label, pixelFont(14, '#f2e9d0')).setOrigin(0.5).setScale(0.4).setStroke('#000', 3).setDepth(5);
    }
    this.prompt = this.add.text((W * TILE) / 2, (H - 0.4) * TILE, '', pixelFont(14, '#ffd23f')).setOrigin(0.5, 1).setScale(0.5).setStroke('#000', 3).setDepth(30);
    this.hud = this.add.text(1.2 * TILE, 0.3 * TILE, '', pixelFont(14, '#f2e9d0')).setScale(0.5).setStroke('#000', 3).setDepth(30);
    this.eKey = this.input.keyboard!.addKey('E');
    this.time.delayedCall(450, () => this.story.onPubOpened());
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.player.tick(dt, 1, this.input.activePointer);
    this.hud.setText(`eRko · ${this.story.hero.name} · ${this.story.money.toLocaleString('cs-CZ')} Kč`);
    this.movePlotkova(dt);

    let nearest: Npc | null = null;
    let best = 0;
    for (const n of this.npcs) {
      // Kdo si vzal misi a odešel (Zjebal čeká venku), v hospodě už není.
      const here = this.story.inPub(n.id);
      if (here !== n.sprite.visible) {
        n.sprite.setVisible(here);
        (n.sprite.body as Phaser.Physics.Arcade.StaticBody).enable = here;
        n.label.setVisible(here);
      }
      if (!here) continue;
      n.label.setText(this.story.knows(n.id) ? NPCS[n.id].name : '???').setPosition(Math.round(n.sprite.x), Math.round(n.sprite.y - 13));
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.sprite.x, n.sprite.y);
      if (d < 60) n.sprite.setRotation(Phaser.Math.Angle.Between(n.sprite.x, n.sprite.y, this.player.x, this.player.y));
      if (d - talkRange(n.id) < best) {
        best = d - talkRange(n.id);
        nearest = n;
      }
    }
    const atDoor = this.player.y > (DOOR.y - 1.6) * TILE && Math.abs(this.player.x - (DOOR.x + 1) * TILE) < 1.6 * TILE;
    if (this.story.dialogOpen) {
      this.prompt.setText('');
      return;
    }
    if (nearest) this.prompt.setText(fillText(`E: promluvit${this.story.knows(nearest.id) ? ` (${NPCS[nearest.id].name})` : ''}`));
    else if (atDoor) this.prompt.setText('E: odejít ven');
    else this.prompt.setText('WASD chůze · E u postavy = promluvit · dveře dole = ven');

    if (Phaser.Input.Keyboard.JustDown(this.eKey) || took('action')) {
      if (nearest) this.talkTo(nearest.id);
      else if (atDoor) this.story.exitPub();
    }
  }

  private talkTo(id: NpcId): void {
    if (id === 'prchard' && !this.story.has('pubEntryDone')) this.story.onPubOpened();
    else this.story.talkNpc(id, 'Pub');
  }

  /** Plotková chodí s tácem mezi barem a stoly; u hráče se zastaví. */
  private movePlotkova(dt: number): void {
    const n = this.npcs.find((x) => x.id === 'plotkova');
    if (!n) return;
    const s = n.sprite;
    if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 40) return;
    const minX = 13 * TILE;
    const maxX = 24.5 * TILE;
    s.x += this.plotkovaDir * 22 * dt;
    if (s.x > maxX) this.plotkovaDir = -1;
    if (s.x < minX) this.plotkovaDir = 1;
    s.setRotation(this.plotkovaDir > 0 ? 0 : Math.PI);
    (s.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }
}

// ---------- Malba interiéru ----------

const WOOD_WALL: Color = 0x3a2618;

/** Zeď shora: tmavé dřevo, světlejší horní hrana, stín dole. */
function wall(p: Painter, [x, y, w, h]: Box): void {
  const T = TILE;
  p.rect(x * T, y * T, w * T, h * T, WOOD_WALL);
  p.rect(x * T, y * T, w * T, 2, 0x5a3e28);
  p.rect(x * T, (y + h) * T - 2, w * T, 2, 0x241810);
  p.rect(x * T + 2, (y + h) * T, w * T, 3, 0x000000, 0.25);
}

/** Stůl se stínem, židlemi nahoře a dole a pivy. */
function table(p: Painter, [x, y, w, h]: Box, i: number): void {
  const T = TILE;
  const round = w < 2;
  if (round) {
    p.ellipse((x + w / 2) * T + 2, (y + h / 2) * T + 3, (w / 2) * T, (h / 2) * T, 0x000000, 0.3);
    p.ellipse((x + w / 2) * T, (y + h / 2) * T, (w / 2) * T, (h / 2) * T, 0x7a5232);
    for (const cx of [x - 0.35, x + w + 0.35]) p.ellipse(cx * T, (y + h / 2) * T, 4, 4, 0x3a2414);
  } else {
    p.rect(x * T + 2, y * T + 3, w * T, h * T, 0x000000, 0.3);
    p.rect(x * T, y * T, w * T, h * T, 0x7a5232);
    p.frame(x * T, y * T, w * T, h * T, 0x4a3020);
    for (let k = 0; k + 0.5 < w; k++) {
      p.rect((x + k) * T + 4, (y - 0.7) * T, 8, 6, 0x3a2414);
      p.rect((x + k) * T + 4, (y + h) * T + 5, 8, 6, 0x3a2414);
      p.rect((x + k) * T + 4, (y - 0.7) * T, 8, 2, 0x5a3a22);
    }
    // Ubrus na štamgastském stole, karty u salonku.
    if (w >= 3) p.rect(x * T + 6, y * T + 4, w * T - 12, h * T - 8, 0xc8d8c0, 0.5);
  }
  p.rect((x + 0.5) * T, (y + 0.4) * T, 4, 6, 0xe8c040);
  p.rect((x + 0.5) * T, (y + 0.4) * T, 4, 1, 0xfff2d0);
  if (w > 1.8) p.rect((x + w - 0.9) * T, (y + 0.6) * T, 4, 6, 0xe8c040);
  if (i % 2 === 0) p.ellipse((x + w * 0.55) * T, (y + h * 0.6) * T, 3, 3, 0xd8d0b8);
}

function paintInterior(): Painter {
  const p = new Painter(W * TILE, H * TILE, createRng(41));
  const T = TILE;
  // Podlaha: prkna s tmavšími spárami a skvrnami od piva; v salonku koberec.
  for (let y = 2 * T; y < (H - 1) * T; y++) {
    for (let x = T; x < (W - 1) * T; x++) {
      const plank = Math.floor(y / 6);
      const off = (plank * 37) % 48;
      const h = hash2(x >> 2, y >> 1, 5);
      let c: Color = [0x6a4a30, 0x725036, 0x664628][plank % 3];
      if (h < 0.2) c = shade(c, 0.92);
      if (y % 6 === 5 || (x + off) % 48 === 0) c = 0x3e2a1a;
      p.px(x, y, c);
    }
  }
  p.rect(1.3 * T, 6.2 * T, 3.4 * T, 4.4 * T, 0x7a2a22);
  p.frame(1.3 * T, 6.2 * T, 3.4 * T, 4.4 * T, 0xd8b030);
  p.frame(1.3 * T + 3, 6.2 * T + 3, 3.4 * T - 6, 4.4 * T - 6, 0x5a1a14);
  for (const [sx, sy] of [[8, 12], [22, 8.5], [12, 11], [24, 14], [17.5, 8]]) p.ellipse(sx * T, sy * T, 7, 4, 0x4a3420, 0.5);

  // Obvodové zdi, nahoře okna, plakát a cedule.
  p.rect(0, 0, W * T, 2 * T, WOOD_WALL);
  p.rect(0, 2 * T - 3, W * T, 3, 0x241810);
  for (let x = 0; x < W * T; x += 8) p.rect(x, 0, 1, 2 * T - 3, 0x2e1e12);
  p.rect(0, 0, T, H * T, WOOD_WALL);
  p.rect((W - 1) * T, 0, T, H * T, WOOD_WALL);
  p.rect(0, (H - 1) * T, W * T, T, WOOD_WALL);
  for (const wx of [1.8, 17]) {
    p.rect(wx * T, 4, 2 * T, 18, 0x2a4a6a);
    p.frame(wx * T, 4, 2 * T, 18, 0x6a5a44);
    p.rect(wx * T + T - 1, 4, 2, 18, 0x6a5a44);
  }
  // Plakát festivalu nad kuchyní a cedule eRko.
  p.rect(6.5 * T, 3, 5 * T, 20, 0xd8b030);
  p.rect(6.5 * T + 2, 5, 5 * T - 4, 16, 0xe84a3a);
  for (let i = 0; i < 9; i++) p.rect(6.5 * T + 6 + i * 8, 9, 5, 2, 0xfff2b0);
  p.rect(6.5 * T + 6, 14, 64, 2, 0xfff2b0);
  p.rect(12.5 * T, 6, 2 * T, 14, 0x2a1a10);
  p.rect(12.5 * T + 4, 9, 6, 8, 0xd83a3a);
  p.rect(12.5 * T + 12, 11, 14, 6, 0xf2e9d0);
  // Paroží v salonku a terč na šipky na levé zdi.
  p.line(3.2 * T, 0.6 * T, 2.6 * T, 0.2 * T, 0xe8dcc0);
  p.line(3.8 * T, 0.6 * T, 4.4 * T, 0.2 * T, 0xe8dcc0);
  p.ellipse(3.5 * T, 0.9 * T, 4, 3, 0x6a4a30);
  p.ellipse(0.5 * T, 7.8 * T, 7, 7, 0x1a1a1a);
  p.ellipse(0.5 * T, 7.8 * T, 5, 5, 0xd83a3a);
  p.ellipse(0.5 * T, 7.8 * T, 3, 3, 0xf2e9d0);
  p.ellipse(0.5 * T, 7.8 * T, 1, 1, 0x2a8a3a);
  // Plakát u štamgastského stolu na pravé zdi.
  p.rect((W - 1) * T + 2, 10.5 * T, 12, 2.4 * T, 0xf2e9d0);
  p.rect((W - 1) * T + 4, 10.8 * T, 8, 10, 0x2a5aa8);
  p.rect((W - 1) * T + 4, 12 * T, 8, 2, 0xd83a3a);

  // Salonek: zeď s průchodem.
  for (const b of SALONEK_WALL) wall(p, b);
  // Kuchyň a WC: uzavřený blok, dveře dole, okénko do baru.
  wall(p, KITCHEN);
  {
    const [kx, ky, kw, kh] = KITCHEN;
    p.rect((kx + 7.6) * T, ky * T, 3, kh * T, 0x241810);
    // Dveře do kuchyně (s okénkem) a na WC.
    p.rect((kx + 2.4) * T, (ky + kh) * T - 5, 1.6 * T, 5, 0x8a6a3a);
    p.rect((kx + 3) * T, (ky + kh) * T - 4, 6, 3, 0x9ab8c8);
    p.rect((kx + 8.4) * T, (ky + kh) * T - 5, 1.4 * T, 5, 0xd8d0b8);
    // Cedule.
    p.rect((kx + 2) * T, (ky + kh - 1.1) * T, 2.4 * T, 8, 0x2a1a10);
    p.rect((kx + 8.6) * T, (ky + kh - 1.1) * T, T, 8, 0x2a5aa8);
    // Sporák a hrnce (střechou kuchyně „prosvítá“ pára).
    for (const [hx, hy] of [[1.4, 1.6], [4.6, 2.2]]) {
      p.ellipse((kx + hx) * T, (ky + hy) * T, 5, 5, 0x8a8a90);
      p.ellipse((kx + hx) * T, (ky + hy) * T, 3, 3, 0x5a5a60);
    }
    p.ellipse((kx + 3) * T, (ky + 1.2) * T, 7, 3, 0xd8d8d0, 0.25);
    // Okénko z kuchyně za bar.
    p.rect((kx + kw) * T - 3, 2.6 * T, 3, 1.4 * T, 0xd8b030);
  }

  // Bar: regál s lahvemi na zdi, prostor pro Prcharda a pult do L.
  p.rect(16 * T, 2 * T, 13 * T, 2.6 * T, 0x5a4028);
  p.rect(16 * T, 2 * T, 13 * T, 0.8 * T, 0x4a3220);
  for (let i = 0; i < 38; i++) {
    const bx = 16 * T + 4 + i * 5.3;
    const col = [0x3a8a3a, 0x8a3a2a, 0xd8b030, 0x6a8aa8, 0xe8e0c8][i % 5];
    p.rect(bx, 2 * T + 2, 3, 8, col);
    p.px(bx + 1, 2 * T + 1, 0x2a2a2a);
  }
  p.rect(27.6 * T, 4.6 * T, 1.4 * T, 5.4 * T, 0x5a4028);
  // Sudy za pultem.
  for (const by of [5.6, 7.2, 8.8]) {
    p.ellipse(28.3 * T, by * T, 7, 7, 0x8a6040);
    p.ellipse(28.3 * T, by * T, 5, 5, 0x6a4a30);
    p.ellipse(28.3 * T, by * T, 1, 1, 0xc8c8c0);
  }
  // Pult: vodorovně pod regálem a svisle dolů.
  p.rect(16 * T, 3.8 * T, 11.6 * T, 0.8 * T, 0x5a3a22);
  p.rect(16 * T, 3.8 * T, 11.6 * T, 3, 0x8a6040);
  p.rect(16 * T, 4.6 * T - 2, 11.6 * T, 2, 0x2a1a10);
  p.rect(26.8 * T, 3.8 * T, 0.8 * T, 6.2 * T, 0x5a3a22);
  p.rect(26.8 * T, 3.8 * T, 3, 6.2 * T, 0x8a6040);
  p.rect(26.8 * T, 10 * T - 2, 2.2 * T, 2, 0x2a1a10);
  p.rect(27.6 * T, 9.6 * T, 1.4 * T, 0.4 * T, 0x8a6040);
  for (const tx of [19.4, 20.4, 21.4]) {
    p.rect(tx * T, 3.8 * T + 2, 4, 8, 0xc8c8c0);
    p.rect(tx * T + 1, 3.8 * T, 2, 3, 0xd8b030);
  }
  for (const gx of [17.2, 23.6, 25.2]) p.rect(gx * T, 3.8 * T + 4, 4, 6, 0xe8c040);
  p.rect(27 * T, 6 * T, 4, 6, 0xe8c040);
  // Barové židle.
  for (const sx of [17, 19, 21, 23, 25]) p.ellipse(sx * T, 5.3 * T, 4, 4, 0x2a1a10);
  for (const sy of [5.6, 7]) p.ellipse(26.1 * T, sy * T, 4, 4, 0x2a1a10);

  // Kulečník: zelené sukno, mantinely, kapsy, koule, tágo a lampa.
  {
    const [x, y, w, h] = POOL;
    p.rect(x * T + 2, y * T + 3, w * T, h * T, 0x000000, 0.3);
    p.rect(x * T, y * T, w * T, h * T, 0x5a3a22);
    p.rect(x * T + 4, y * T + 4, w * T - 8, h * T - 8, 0x2a7a3a);
    for (const kx of [0, w / 2, w]) for (const ky of [0, h]) p.ellipse((x + kx) * T + (kx === 0 ? 4 : kx === w ? -4 : 0), (y + ky) * T + (ky === 0 ? 4 : -4), 2, 2, 0x0a0a0a);
    for (const [bx, by, c] of [[x + 1.8, y + 1.2, 0xf2f2ee], [x + 4, y + 1.3, 0xd83a3a], [x + 4.4, y + 1, 0xd8b030], [x + 4.3, y + 1.7, 0x2a5aa8]] as const) p.ellipse(bx * T, by * T, 2, 2, c);
    p.line((x + 1.6) * T, (y + h + 0.9) * T, (x + 1.8) * T, (y + 1.3) * T, 0xc8a070);
    p.ellipse((x + w / 2) * T, (y + h / 2) * T, 2.2 * T, 0.9 * T, 0xfff2b0, 0.08);
  }

  TABLES.forEach((b, i) => table(p, b, i));

  // Bedny od piva u dveří a hrací automat v rohu.
  {
    const [x, y, w] = CRATES;
    for (const [dx, dy] of [[0, 0], [0, 0.7]]) {
      p.rect((x + dx) * T, (y + dy) * T, w * T, 0.7 * T - 1, 0xd8b030);
      p.frame((x + dx) * T, (y + dy) * T, w * T, 0.7 * T - 1, 0x8a6a20);
      for (let i = 0; i < 4; i++) p.ellipse((x + dx + 0.2 + i * 0.27) * T, (y + dy + 0.35) * T, 1.5, 1.5, 0x3a6a2a);
    }
  }
  {
    const [x, y, w, h] = JUKEBOX;
    p.rect(x * T + 2, y * T + 3, w * T, h * T, 0x000000, 0.3);
    p.rect(x * T, y * T, w * T, h * T, 0x8a2a4a);
    p.ellipse((x + w / 2) * T, (y + 0.6) * T, 7, 5, 0xffd23f);
    for (let i = 0; i < 4; i++) p.rect(x * T + 3 + i * 5, (y + 1.2) * T, 3, 3, [0x3ad8d8, 0xd83a3a, 0x3ad83a, 0xd8b030][i]);
  }
  // Věšák u dveří a kytka (umělá, jiná by tu nepřežila).
  p.ellipse(10 * T, 14.4 * T, 4, 4, 0x2a1a10);
  p.ellipse(10 * T - 2, 14.2 * T, 3, 2, 0x2a5a3a);
  p.ellipse(25.8 * T, 14.3 * T, 5, 5, 0x6a3a2a);
  p.ellipse(25.8 * T, 14.3 * T, 4, 4, 0x3a8a3a);

  // Dveře ven dole.
  p.rect(DOOR.x * T, (H - 1) * T, DOOR.w * T, T, 0x6a4a2a);
  p.rect(DOOR.x * T + 2, (H - 1) * T + 2, DOOR.w * T - 4, T - 2, 0x8a6a3a);
  p.rect(DOOR.x * T + DOOR.w * T - 6, (H - 0.5) * T, 2, 2, 0xd8b030);
  p.rect(DOOR.x * T, (H - 1) * T - 1, DOOR.w * T, 1, 0xffd23f);
  return p;
}
