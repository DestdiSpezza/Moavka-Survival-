import type Phaser from 'phaser';
import { WORLD_ZOOM } from '../config';
import { pixelFont } from './BootScene';
import type { GameScene } from './GameScene';

/** Kdo mluví: postava nebo hráč (cokoli s polohou). */
interface Speaker {
  x: number;
  y: number;
  active: boolean;
}

interface Bubble {
  who: Speaker;
  box: Phaser.GameObjects.Container;
  until: number;
  ms: number;
}

/**
 * Bubliny s řečí nad hlavami (komiksově): sledují mluvčího, po chvíli zmizí.
 * Kreslí se jen tam, kam hráč vidí.
 */
export class Speech {
  private bubbles: Bubble[] = [];

  constructor(private game: GameScene) {}

  private get now(): number {
    return this.game.time.now;
  }

  /** Bublina nad mluvčím; `frame` = barva rámečku (barva skupiny). */
  say(who: Speaker, text: string, frame = 0x2a2a2e, ms = 2800): void {
    const g = this.game;
    if (!g.inView(who.x, who.y)) return;
    // Jeden mluvčí, jedna bublina.
    for (const b of this.bubbles) if (b.who === who) b.until = 0;
    const scale = 1 / WORLD_ZOOM;
    const label = g.add
      .text(0, 0, text, { ...pixelFont(13, '#1a1a1e'), wordWrap: { width: 190 }, align: 'center' })
      .setOrigin(0.5, 1)
      .setScale(scale);
    const w = label.displayWidth + 6;
    const h = label.displayHeight + 3;
    const bg = g.add.graphics();
    bg.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 1, -h - 3, w, h, 3);
    bg.fillStyle(0xfffbea, 0.96).fillRoundedRect(-w / 2, -h - 4, w, h, 3);
    bg.lineStyle(1, frame, 1).strokeRoundedRect(-w / 2, -h - 4, w, h, 3);
    // Ocásek směrem k hlavě.
    bg.fillStyle(0xfffbea, 0.96).fillTriangle(-3, -4.5, 3, -4.5, 0, 0);
    bg.lineStyle(1, frame, 1).lineBetween(-3, -4, 0, 0).lineBetween(3, -4, 0, 0);
    label.setPosition(0, -5.5);
    const box = g.add.container(who.x, who.y - 10, [bg, label]).setDepth(46);
    g.cameras.getCamera('minimap')?.ignore(box);
    this.bubbles.push({ who, box, until: this.now + ms, ms });
  }

  update(): void {
    const now = this.now;
    for (const b of this.bubbles) {
      if (now > b.until || !b.who.active) {
        b.box.destroy();
        continue;
      }
      b.box.setPosition(Math.round(b.who.x), Math.round(b.who.y - 10));
      const left = b.until - now;
      b.box.setAlpha(left < 300 ? left / 300 : 1);
    }
    this.bubbles = this.bubbles.filter((b) => b.box.active);
  }

  clear(): void {
    for (const b of this.bubbles) b.box.destroy();
    this.bubbles = [];
  }
}
