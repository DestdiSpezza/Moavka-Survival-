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
  prchard: { x: 7, y: 3.6, face: Math.PI / 2 },
  plotkova: { x: 14, y: 8.5, face: Math.PI / 2 },
  zjebal: { x: 9.5, y: 6.8, face: -Math.PI / 2 },
  dennySochar: { x: 13.4, y: 5.4, face: Math.PI },
  vesta: { x: 8.6, y: 10.4, face: Math.PI },
  omyx: { x: 20.4, y: 11.6, face: Math.PI },
  metejka: { x: 16.2, y: 4.2, face: 0 },
  dennyVysoky: { x: 23.6, y: 2.8, face: Math.PI },
  kibi: { x: 26.4, y: 3.6, face: -Math.PI / 2 },
  kobyla: { x: 0, y: 0, face: 0 },
};

/** Pevné věci v místnosti (dlaždice): bar, kulečník, stoly. */
const SOLIDS: Array<[number, number, number, number]> = [
  [1, 5, 12, 1], // bar
  [12, 2, 1, 3], // konec baru
  [17, 3, 6, 3], // kulečník
  [5, 9, 3, 2], // stůl u okna
  [17, 11, 3, 2], // stůl u dveří
  [24, 9, 3, 2], // stůl s plakátem
];

const DOOR = { x: 14, y: 15, w: 2 };

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
    if (!this.textures.exists('pub-interior')) this.textures.addCanvas('pub-interior', paintInterior().toCanvas());
    this.add.image(0, 0, 'pub-interior').setOrigin(0).setDepth(0);
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
    let best = TALK_RANGE;
    for (const n of this.npcs) {
      n.label.setText(this.story.knows(n.id) ? NPCS[n.id].name : '???').setPosition(Math.round(n.sprite.x), Math.round(n.sprite.y - 13));
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.sprite.x, n.sprite.y);
      if (d < 60) n.sprite.setRotation(Phaser.Math.Angle.Between(n.sprite.x, n.sprite.y, this.player.x, this.player.y));
      if (d < best) {
        best = d;
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

    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (nearest) this.talkTo(nearest.id);
      else if (atDoor) this.story.exitPub();
    }
  }

  private talkTo(id: NpcId): void {
    if (id === 'prchard' && !this.story.has('pubEntryDone')) this.story.onPubOpened();
    else this.story.talk(id, 'Pub');
  }

  /** Plotková chodí s tácem mezi barem a stoly; u hráče se zastaví. */
  private movePlotkova(dt: number): void {
    const n = this.npcs.find((x) => x.id === 'plotkova');
    if (!n) return;
    const s = n.sprite;
    if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 40) return;
    const minX = 13 * TILE;
    const maxX = 22 * TILE;
    s.x += this.plotkovaDir * 22 * dt;
    if (s.x > maxX) this.plotkovaDir = -1;
    if (s.x < minX) this.plotkovaDir = 1;
    s.setRotation(this.plotkovaDir > 0 ? 0 : Math.PI);
    (s.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }
}

// ---------- Malba interiéru ----------

function paintInterior(): Painter {
  const p = new Painter(W * TILE, H * TILE, createRng(41));
  const T = TILE;
  // Podlaha: prkna s tmavšími spárami a skvrnami od piva.
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
  for (const [sx, sy] of [[8, 12], [20, 8], [11, 9], [24, 13]]) p.ellipse(sx * T, sy * T, 7, 4, 0x4a3420, 0.5);
  // Zdi: tmavé dřevo s obložením, okna a plakáty nahoře.
  p.rect(0, 0, W * T, 2 * T, 0x3a2618);
  p.rect(0, 2 * T - 3, W * T, 3, 0x241810);
  for (let x = 0; x < W * T; x += 8) p.rect(x, 0, 1, 2 * T - 3, 0x2e1e12);
  p.rect(0, 0, T, H * T, 0x3a2618);
  p.rect((W - 1) * T, 0, T, H * T, 0x3a2618);
  p.rect(0, (H - 1) * T, W * T, T, 0x3a2618);
  // Okna (noc nebo den: modré tabulky s rámem).
  for (const wx of [3, 22]) {
    p.rect(wx * T, 4, 2 * T, 18, 0x2a4a6a);
    p.frame(wx * T, 4, 2 * T, 18, 0x6a5a44);
    p.rect(wx * T + T - 1, 4, 2, 18, 0x6a5a44);
  }
  // Plakát festivalu nad barem a cedule eRko.
  p.rect(8 * T, 3, 5 * T, 20, 0xd8b030);
  p.rect(8 * T + 2, 5, 5 * T - 4, 16, 0xe84a3a);
  for (let i = 0; i < 9; i++) p.rect(8 * T + 6 + i * 8, 9, 5, 2, 0xfff2b0);
  p.rect(8 * T + 6, 14, 64, 2, 0xfff2b0);
  p.rect(14 * T, 6, 2 * T, 14, 0x2a1a10);
  p.rect(14 * T + 4, 9, 6, 8, 0xd83a3a);
  p.rect(14 * T + 12, 11, 14, 6, 0xf2e9d0);
  // Terč na šipky.
  p.ellipse(26.5 * T, 1.1 * T, 8, 8, 0x1a1a1a);
  p.ellipse(26.5 * T, 1.1 * T, 6, 6, 0xd83a3a);
  p.ellipse(26.5 * T, 1.1 * T, 4, 4, 0xf2e9d0);
  p.ellipse(26.5 * T, 1.1 * T, 2, 2, 0x2a8a3a);
  // Dveře na WC vpravo.
  p.rect((W - 1) * T, 3 * T, 4, 2 * T, 0x5a4028);
  p.rect((W - 1) * T + 1, 3.5 * T, 2, 6, 0xd8d0b8);
  // Bar: pult, police s lahvemi za ním, pípa.
  p.rect(T, 2 * T, 11 * T, 3 * T, 0x4a3220);
  for (let i = 0; i < 20; i++) {
    const bx = T + 6 + i * 8;
    const col = [0x3a8a3a, 0x8a3a2a, 0xd8b030, 0x6a8aa8][i % 4];
    p.rect(bx, 2 * T + 2, 3, 7, col);
    p.px(bx + 1, 2 * T + 1, 0x2a2a2a);
  }
  p.rect(T, 5 * T, 12 * T, T, 0x5a3a22);
  p.rect(T, 5 * T, 12 * T, 3, 0x8a6040);
  p.rect(T, 6 * T - 2, 12 * T, 2, 0x2a1a10);
  p.rect(12 * T, 2 * T, T, 3 * T, 0x5a3a22);
  p.rect(12 * T, 2 * T, 3, 3 * T, 0x8a6040);
  for (const tx of [5.6, 6.6, 7.6]) {
    p.rect(tx * T, 5 * T + 4, 4, 8, 0xc8c8c0);
    p.rect(tx * T + 1, 5 * T + 2, 2, 3, 0xd8b030);
  }
  for (const gx of [3, 9, 10.5]) p.rect(gx * T, 5 * T + 6, 4, 6, 0xe8c040);
  // Barové židle.
  for (const sx of [3, 5, 7, 9.5, 11]) p.ellipse(sx * T, 6.7 * T, 4, 4, 0x2a1a10);
  // Kulečník: zelené sukno, mantinely, kapsy, koule.
  p.rect(17 * T, 3 * T, 6 * T, 3 * T, 0x5a3a22);
  p.rect(17 * T + 4, 3 * T + 4, 6 * T - 8, 3 * T - 8, 0x2a7a3a);
  for (const [kx, ky] of [[17, 3], [20, 3], [23, 3], [17, 6], [20, 6], [23, 6]]) p.ellipse(kx * T + (kx === 17 ? 4 : kx === 23 ? -4 : 0), ky * T + (ky === 3 ? 4 : -4), 2, 2, 0x0a0a0a);
  for (const [bx, by, c] of [[19, 4.2, 0xf2f2ee], [21, 4.5, 0xd83a3a], [21.4, 4.2, 0xd8b030], [21.2, 4.9, 0x2a5aa8]] as const) p.ellipse(bx * T, by * T, 2, 2, c);
  p.line(15.6 * T, 4.4 * T, 19 * T, 4.2 * T, 0xc8a070);
  // Stoly a židle.
  for (const [x, y, w, h] of SOLIDS.slice(3)) {
    p.rect(x * T + 2, y * T + 3, w * T, h * T, 0x000000, 0.3);
    p.rect(x * T, y * T, w * T, h * T, 0x7a5232);
    p.frame(x * T, y * T, w * T, h * T, 0x4a3020);
    for (let i = 0; i < w; i++) {
      p.ellipse((x + i + 0.5) * T, (y - 0.4) * T, 4, 3, 0x3a2414);
      p.ellipse((x + i + 0.5) * T, (y + h + 0.4) * T, 4, 3, 0x3a2414);
    }
    p.rect((x + 0.6) * T, (y + 0.5) * T, 4, 6, 0xe8c040);
    p.rect((x + w - 1) * T, (y + 0.7) * T, 4, 6, 0xe8c040);
  }
  // Dveře ven dole.
  p.rect(DOOR.x * T, (H - 1) * T, DOOR.w * T, T, 0x6a4a2a);
  p.rect(DOOR.x * T + 2, (H - 1) * T + 2, DOOR.w * T - 4, T - 2, 0x8a6a3a);
  p.rect(DOOR.x * T + DOOR.w * T - 6, (H - 0.5) * T, 2, 2, 0xd8b030);
  p.rect(DOOR.x * T, (H - 1) * T - 1, DOOR.w * T, 1, 0xffd23f);
  return p;
}
