import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { paintGround } from '../art/ground';
import { paintWater } from '../art/water';
import { buildWorld } from '../world/world';
import { type Progress, readSave } from '../systems/save';
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
    // Pozadí: skutečná malba Morávky, kamera pomalu pluje nad vesnicí.
    const area = AREAS.moravka;
    if (!this.textures.exists('ground-moravka')) {
      const art = paintGround(buildWorld(area.id), area.seed);
      this.textures.addCanvas('ground-moravka', art.ground);
      this.textures.addCanvas('lights-moravka', art.lights);
      this.registry.set('chimneys-moravka', art.chimneys);
    }
    if (!this.textures.exists('water')) this.textures.addCanvas('water', paintWater());
    const bg = this.add.container(0, 0);
    const ground = this.textures.get('ground-moravka').getSourceImage() as HTMLCanvasElement;
    const water = this.add.tileSprite(0, 0, ground.width, ground.height, 'water').setOrigin(0);
    bg.add([water, this.add.image(0, 0, 'ground-moravka').setOrigin(0)]);
    bg.setScale(2);
    const path = { t: 0 };
    this.tweens.add({
      targets: path, t: 1, duration: 60000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        bg.setPosition(-(600 + path.t * 900) * 2 + width / 2, -(380 + path.t * 300) * 2 + height / 2);
        water.tilePositionY += 0.1;
      },
    });
    // Ztmavení s vinětou, ať je menu čitelné.
    this.add.rectangle(0, 0, width, height, 0x0a0a10, 0.45).setOrigin(0);
    this.add.rectangle(0, 0, width, 210, 0x0a0a10, 0.35).setOrigin(0);

    this.add.text(width / 2 + 5, 115, T.title, pixelFont(64, '#000000')).setOrigin(0.5).setAlpha(0.6);
    const title = this.add.text(width / 2, 110, T.title, pixelFont(64, '#ffd23f')).setOrigin(0.5).setStroke('#2a1d12', 8);
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(width / 2, 160, T.subtitle, pixelFont(18)).setOrigin(0.5).setStroke('#000', 4);

    const save = readSave();
    const items: MenuItem[] = [{ label: () => 'Nová hra', action: () => this.newGame() }];
    if (save) {
      items.push({
        label: () => `Pokračovat (${save.hero.name}, Akt ${save.story.act}, ${AREAS[save.area].name}, ${save.money.toLocaleString('cs-CZ')} Kč)`,
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

  /** Nová hra: nejdřív hrdina, nebo hrdinka, a jméno. */
  private newGame(): void {
    Sound.unlock();
    this.scene.start('Hero');
  }

  private begin(progress: Progress): void {
    Sound.unlock();
    this.registry.set('progress', progress);
    this.registry.set('arrival', null);
    this.scene.start('Game');
  }
}
