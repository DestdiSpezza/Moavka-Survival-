import Phaser from 'phaser';
import { STAMINA_MAX } from '../systems/movement';
import { T } from '../texts/cs';
import { Tile } from '../world/tiles';
import { pixelFont } from './BootScene';
import { type GameScene, MINIMAP, type VehicleHud } from './GameScene';

const HP_COLORS: Record<string, number> = { ok: 0x6fd16a, smoke: 0xe0b23a, fire: 0xe0442a };

/** HUD přes hru: minimapa, místo, dech, vozidlo (rychlost, stav), nápovědy a hlášky. */
export class UIScene extends Phaser.Scene {
  private zoneText!: Phaser.GameObjects.Text;
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private toastText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private carPanel!: Phaser.GameObjects.Container;
  private carName!: Phaser.GameObjects.Text;
  private carSpeed!: Phaser.GameObjects.Text;
  private carHp!: Phaser.GameObjects.Rectangle;
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

    // Panel vozidla vpravo dole.
    const px = width - 220;
    const py = height - 110;
    this.carName = this.add.text(0, 0, '', pixelFont(16, '#ffd23f')).setStroke('#000', 4);
    this.carSpeed = this.add.text(0, 22, '', pixelFont(28)).setStroke('#000', 5);
    const hpBack = this.add.rectangle(0, 62, 204, 12, 0x000000, 0.6).setOrigin(0);
    this.carHp = this.add.rectangle(2, 64, 200, 8, 0x6fd16a).setOrigin(0);
    this.carPanel = this.add.container(px, py, [this.carName, this.carSpeed, hpBack, this.carHp]).setVisible(false);

    this.controlsText = this.add.text(width - 12, height - 12, T.controls, pixelFont(14, '#f2e9d0')).setOrigin(1).setStroke('#000', 4).setAlpha(0.8);
    this.promptText = this.add.text(width / 2, height / 2 + 40, '', pixelFont(16, '#ffffff')).setOrigin(0.5).setStroke('#000', 4);
    this.toastText = this.add.text(width / 2, height - 60, '', pixelFont(18, '#ffffff')).setOrigin(0.5).setStroke('#000', 4);

    const game = this.scene.get('Game');
    game.events.on('toast', (text: string) => this.say(text));
    this.events.once('shutdown', () => game.events.off('toast'));
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

    this.staminaBar.width = 120 * (p.move.stamina / STAMINA_MAX);
    this.staminaBar.fillColor = p.move.exhausted ? 0xd9534f : 0x6fd16a;
    if (p.move.exhausted && !this.wasExhausted) this.say(T.exhausted);
    this.wasExhausted = p.move.exhausted;

    const inForest = this.registry.get('tile') === Tile.ForestFloor;
    if (inForest && !this.wasInForest) this.say(T.forest);
    this.wasInForest = inForest;

    const car = this.registry.get('vehicle') as VehicleHud | null;
    this.carPanel.setVisible(!!car);
    this.controlsText.setText(car ? T.controlsCar : T.controls);
    if (car) {
      this.carName.setText(car.name);
      this.carSpeed.setText(`${car.kmh} ${T.kmh}`);
      this.carHp.width = 200 * car.hp;
      this.carHp.fillColor = HP_COLORS[car.state] ?? 0x6fd16a;
    }
    this.promptText.setText((this.registry.get('prompt') as string) ?? '');
  }

  private say(text: string): void {
    this.toastText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2200, duration: 600 });
  }
}
