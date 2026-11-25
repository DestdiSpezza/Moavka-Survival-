import Phaser from 'phaser';
import { TILE } from '../config';
import { T } from '../texts/cs';
import { pixelFont } from './BootScene';

/** Úvodní obrazovka. Pozadí je tráva se silnicí, aby bylo vidět, že dlaždice fungují. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, 'tile-grass').setOrigin(0);
    this.add.tileSprite(0, height / 2 - TILE, width, TILE * 2, 'tile-road').setOrigin(0);

    this.add.text(width / 2, height / 2 - 50, T.title, pixelFont(24, '#ffd23f')).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 28, T.subtitle, pixelFont(8)).setOrigin(0.5);

    const start = this.add.text(width / 2, height / 2 + 40, T.pressStart, pixelFont(8)).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown-SPACE', () => {
      start.setText(T.phase0);
      this.tweens.killTweensOf(start);
      start.setAlpha(1);
    });
  }
}
