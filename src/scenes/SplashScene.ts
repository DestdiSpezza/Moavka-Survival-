import Phaser from 'phaser';
import { pixelFont } from './BootScene';

/** Obrazovky po logu (ADR-036): klasické upozornění, pak pointa. */
const DISCLAIMERS: Array<{ lines: Array<[string, number, string]>; ms: number; finger?: boolean }> = [
  { lines: [['Všechny postavy jsou smyšlené.', 30, '#f2e9d0']], ms: 2800 },
  {
    lines: [
      ['Všechny hlasy jsou imitace.', 30, '#f2e9d0'],
      ['Všechna podobnost se skutečnými osobami,', 24, '#c8c0a8'],
      ['živými či zesnulými, je čistě náhodná.', 24, '#c8c0a8'],
    ],
    ms: 4200,
  },
  { lines: [['Takže se neposerte.', 48, '#ffd23f'], ['Bude to sranda.', 24, '#f2e9d0']], ms: 3200, finger: true },
];

/**
 * Úvod při spuštění hry: logo Grand Morávka Game Studios (ADR-028), pak tři obrazovky
 * s upozorněním (ADR-036), pak titulní obrazovka. Ťuknutí nebo klávesa = další obrazovka.
 */
export class SplashScene extends Phaser.Scene {
  private step = 0;
  private busy = false;
  private layer?: Phaser.GameObjects.Container;
  private timer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Splash');
  }

  create(): void {
    this.step = 0;
    this.busy = false;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');
    const logo = this.add.image(width / 2, height / 2 - 20, 'logo').setScale(0.78).setAlpha(0);
    const sub = this.add.text(width / 2, height - 52, 'uvádí', pixelFont(22, '#c8c0a8')).setOrigin(0.5).setAlpha(0);
    this.layer = this.add.container(0, 0, [logo, sub]);
    this.tweens.add({ targets: logo, alpha: 1, scale: 0.82, duration: 1200, ease: 'Sine.out' });
    this.tweens.add({ targets: sub, alpha: 1, delay: 900, duration: 700 });
    this.timer = this.time.delayedCall(3600, () => this.next());
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard?.on('keydown', () => this.next());
  }

  /** Další obrazovka (po poslední titulní). */
  private next(): void {
    if (this.busy) return;
    this.busy = true;
    this.timer?.remove();
    const old = this.layer;
    this.tweens.add({
      targets: old,
      alpha: 0,
      duration: 350,
      onComplete: () => {
        old?.destroy();
        const d = DISCLAIMERS[this.step++];
        if (!d) {
          this.scene.start('Title');
          return;
        }
        this.layer = this.disclaimer(d);
        this.layer.setAlpha(0);
        this.tweens.add({ targets: this.layer, alpha: 1, duration: 450, onComplete: () => (this.busy = false) });
        this.timer = this.time.delayedCall(d.ms, () => this.next());
      },
    });
  }

  private disclaimer(d: (typeof DISCLAIMERS)[number]): Phaser.GameObjects.Container {
    const { width, height } = this.scale;
    const c = this.add.container(0, 0);
    if (d.finger) c.add(drawFinger(this, width / 2, height / 2 - 10));
    const total = d.lines.reduce((s, [, size]) => s + size * 1.5, 0);
    // S fakáčem jde text dolů, ať je ruka vidět.
    let y = (d.finger ? height * 0.8 : height / 2) - total / 2;
    for (const [text, size, color] of d.lines) {
      c.add(this.add.text(width / 2, y + (size * 1.5) / 2, text, pixelFont(size, color)).setOrigin(0.5).setStroke('#000', 6));
      y += size * 1.5;
    }
    return c;
  }
}

/** Fakáč v pozadí: pixelová pěst se vztyčeným prostředníčkem (obrys, klouby, palec). */
function drawFinger(scene: Phaser.Scene, cx: number, cy: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const u = 12;
  const ox = cx - 8 * u;
  const oy = cy - 13 * u;
  const skin = 0xd89a6a;
  const dark = 0x6a3a22;
  const shade = 0xa86a42;
  const box = (x: number, y: number, w: number, h: number, c: number) => g.fillStyle(c, 1).fillRect(ox + x * u, oy + y * u, w * u, h * u);
  // Obrys (o jednu buňku větší), pak výplň.
  const shape: Array<[number, number, number, number]> = [
    [6, 0.5, 3, 0.5], [5.5, 1, 4, 10], // prostředníček se zaobleným koncem
    [2.5, 6.5, 2, 0.5], [2, 7, 3, 9], // ukazováček (zahnutý)
    [9.5, 6.5, 2, 0.5], [9, 7, 3, 9], // prsteníček
    [12.5, 7.5, 1.5, 0.5], [12, 8, 2.5, 8], // malíček
    [5, 8, 4.5, 8], // dlaň pod prostředníčkem
    [3, 16, 10, 6], // zápěstí
  ];
  for (const [x, y, w, h] of shape) box(x - 0.5, y - 0.5, w + 1, h + 1, dark);
  for (const [x, y, w, h] of shape) box(x, y, w, h, skin);
  // Nehet a stín na prstu.
  box(6.3, 1.4, 2.4, 2.2, 0xf2d0b0);
  box(8.6, 1, 0.9, 10, shade);
  // Klouby zahnutých prstů (svislé spáry a světlé hrbolky nahoře).
  for (const x of [5, 9, 12]) box(x - 0.25, 7.2, 0.5, 8, dark);
  for (const x of [2.5, 9.5, 12.3]) box(x, 7.3, 1.4, 0.8, 0xf2c8a0);
  // Palec přes zahnuté prsty.
  box(2.5, 12, 7.5, 2.6, 0xe8aa78);
  box(2.5, 14.6, 7.5, 0.5, dark);
  box(9.6, 12, 0.5, 2.6, dark);
  // Rukáv.
  box(2.5, 19, 11, 3, 0x3a5a8a);
  box(2.5, 19, 11, 0.5, 0x2a3a5a);
  g.setAlpha(0.42);
  return g;
}
