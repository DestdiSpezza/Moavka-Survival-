import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { TILE } from '../config';
import { newProgress, type Progress, readSave } from '../systems/save';
import { T } from '../texts/cs';
import { AREAS } from '../world/areas';
import { pixelFont } from './BootScene';
import { createMenu, type MenuItem } from './menu';

/** Hlavní menu: nová hra, pokračovat, nastavení, ovládání. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, 'tile-grass').setOrigin(0).setTileScale(2);
    this.add.tileSprite(0, 150 - TILE * 2, width, TILE * 4, 'tile-road').setOrigin(0).setTileScale(2);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.35).setOrigin(0);

    const title = this.add.text(width / 2, 110, T.title, pixelFont(56, '#ffd23f')).setOrigin(0.5).setStroke('#2a1d12', 8);
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(width / 2, 160, T.subtitle, pixelFont(18)).setOrigin(0.5).setStroke('#000', 4);

    const save = readSave();
    const items: MenuItem[] = [{ label: () => 'Nová hra', action: () => this.begin(newProgress()) }];
    if (save) {
      items.push({
        label: () => `Pokračovat (${AREAS[save.area].name}, ${save.money.toLocaleString('cs-CZ')} Kč)`,
        action: () => this.begin(save),
      });
    }
    items.push(
      { label: () => 'Nastavení', action: () => this.overlay('Settings') },
      { label: () => 'Ovládání', action: () => this.overlay('Controls') },
    );
    createMenu(this, width / 2, 250, items, 40);
    this.add.text(width / 2, height - 28, 'W/S vybrat · Enter potvrdit · Morávka, Beskydy, 2026', pixelFont(14, '#c8c0a8')).setOrigin(0.5).setStroke('#000', 4);
  }

  private overlay(key: string): void {
    this.scene.pause();
    this.scene.launch(key, { from: 'Title' });
  }

  private begin(progress: Progress): void {
    Sound.unlock();
    this.registry.set('progress', progress);
    this.registry.set('arrival', null);
    this.scene.start('Game');
  }
}
