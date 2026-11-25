import Phaser from 'phaser';
import { STAMINA_MAX } from '../systems/movement';
import { T } from '../texts/cs';
import { Tile } from '../world/tiles';
import { pixelFont } from './BootScene';
import { type GameScene, MINIMAP } from './GameScene';

/** HUD přes hru: rámeček minimapy, jméno místa, výdrž, hlášky. */
export class UIScene extends Phaser.Scene {
  private zoneText!: Phaser.GameObjects.Text;
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private toast!: Phaser.GameObjects.Text;
  private lastZone = '';
  private wasExhausted = false;
  private wasInForest = false;

  constructor() {
    super('UI');
  }

  create(): void {
    const { width, height } = this.scale;
    const { x, y, w, h } = MINIMAP;
    this.add.rectangle(x - 2, y - 2, w + 4, h + 4).setOrigin(0).setStrokeStyle(3, 0xf2e9d0);

    this.zoneText = this.add.text(x, y + h + 10, '', pixelFont(18, '#ffd23f')).setStroke('#000', 4);

    this.add.text(x, y + h + 38, T.stamina, pixelFont(14)).setStroke('#000', 4);
    this.add.rectangle(x + 52, y + h + 41, 124, 12, 0x000000, 0.6).setOrigin(0);
    this.staminaBar = this.add.rectangle(x + 54, y + h + 43, 120, 8, 0x6fd16a).setOrigin(0);

    this.add.text(width - 12, height - 12, T.controls, pixelFont(14, '#f2e9d0')).setOrigin(1).setStroke('#000', 4).setAlpha(0.8);
    this.toast = this.add.text(width / 2, height - 60, '', pixelFont(18, '#ffffff')).setOrigin(0.5).setStroke('#000', 4);
  }

  update(): void {
    const game = this.scene.get('Game') as GameScene;
    const p = game.player;
    if (!p) return;

    const zone = (this.registry.get('zone') as string) ?? '';
    if (zone !== this.lastZone) {
      this.lastZone = zone;
      this.zoneText.setText(zone);
    }

    const frac = p.move.stamina / STAMINA_MAX;
    this.staminaBar.width = 120 * frac;
    this.staminaBar.fillColor = p.move.exhausted ? 0xd9534f : 0x6fd16a;

    if (p.move.exhausted && !this.wasExhausted) this.say(T.exhausted);
    this.wasExhausted = p.move.exhausted;

    const inForest = this.registry.get('tile') === Tile.ForestFloor;
    if (inForest && !this.wasInForest) this.say(T.forest);
    this.wasInForest = inForest;
  }

  private say(text: string): void {
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1800, duration: 600 });
  }
}
