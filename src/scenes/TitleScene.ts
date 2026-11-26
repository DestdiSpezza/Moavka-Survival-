import { touch } from '../input/touch';
import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
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
    // Pozadí: malba Morávky (eRko, Omladina, Hasiči, přehrada), pomalu pluje sem a tam.
    const art = this.add.image(width / 2, height / 2, 'keyart');
    const cover = Math.max(width / art.width, height / art.height) * 1.12;
    art.setScale(cover);
    const drift = (art.displayWidth - width) / 2;
    this.tweens.add({ targets: art, x: { from: width / 2 + drift, to: width / 2 - drift }, duration: 40000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(54, height - 54, 'logo').setScale(0.16).setAlpha(0.9);
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
    // Tmavý panel pod menu, ať se nepere s cedulí na malbě.
    this.add.rectangle(width / 2, 250 - 24, Math.min(width - 40, 640), items.length * 40 + 8, 0x0a0a10, 0.72).setOrigin(0.5, 0).setStrokeStyle(2, 0xffd23f, 0.35);
    createMenu(this, width / 2, 250, items, 40);
    this.add.text(width / 2, height - 28, touch.enabled ? 'Ťukni na položku · Morávka, Beskydy, 2026' : 'W/S vybrat · Enter potvrdit · Morávka, Beskydy, 2026', pixelFont(14, '#c8c0a8')).setOrigin(0.5).setStroke('#000', 4);
  }

  private overlay(key: string): void {
    this.scene.pause();
    this.scene.launch(key, { from: 'Title' });
  }

  /** Nová hra: nejdřív hrdina, nebo hrdinka, a jméno. */
  private newGame(): void {
    Sound.unlock();
    this.scene.start('Prolog');
  }

  private begin(progress: Progress): void {
    Sound.unlock();
    this.registry.set('progress', progress);
    this.registry.set('arrival', null);
    this.scene.start('Game');
  }
}
