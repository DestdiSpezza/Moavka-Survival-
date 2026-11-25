import Phaser from 'phaser';
import { TILE } from '../config';
import { T } from '../texts/cs';
import { pixelFont } from './BootScene';
import { AREAS } from '../world/areas';
import { newProgress, readSave } from '../systems/save';

/** Úvodní obrazovka. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, 'tile-grass').setOrigin(0).setTileScale(2);
    this.add.tileSprite(0, height / 2 - TILE * 2, width, TILE * 4, 'tile-road').setOrigin(0).setTileScale(2);

    this.add.text(width / 2, height / 2 - 100, T.title, pixelFont(48, '#ffd23f')).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 56, T.subtitle, pixelFont(16)).setOrigin(0.5);
    this.add.text(width / 2, height - 32, T.controls, pixelFont(16, '#c8c0a8')).setOrigin(0.5);

    const start = this.add.text(width / 2, height / 2 + 80, `${T.pressStart}: nová hra`, pixelFont(16)).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    const save = readSave();
    if (save) {
      const info = `C: pokračovat (${AREAS[save.area].name}, ${save.money.toLocaleString('cs-CZ')} Kč, skóre ${save.score.toLocaleString('cs-CZ')})`;
      this.add.text(width / 2, height / 2 + 110, info, pixelFont(16, '#9fffa0')).setOrigin(0.5).setStroke('#000', 4);
      this.input.keyboard?.once('keydown-C', () => this.begin(save));
    }
    this.input.keyboard?.once('keydown-SPACE', () => this.begin(newProgress()));
  }

  private begin(progress: ReturnType<typeof newProgress>): void {
    this.registry.set('progress', progress);
    this.registry.set('arrival', null);
    this.scene.start('Game');
  }
}
