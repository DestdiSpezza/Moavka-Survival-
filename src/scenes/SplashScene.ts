import Phaser from 'phaser';
import { pixelFont } from './BootScene';

/**
 * Logo studia při spuštění hry (ADR-028): na černé se rozsvítí znak Grand Morávka
 * Game Studios, pod ním „uvádí“, pak titulní obrazovka. Ťuknutí nebo klávesa přeskočí.
 */
export class SplashScene extends Phaser.Scene {
  private done = false;

  constructor() {
    super('Splash');
  }

  create(): void {
    this.done = false;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');
    const logo = this.add.image(width / 2, height / 2 - 20, 'logo').setScale(0.78).setAlpha(0);
    const sub = this.add.text(width / 2, height - 52, 'uvádí', pixelFont(22, '#c8c0a8')).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, scale: 0.82, duration: 1200, ease: 'Sine.out' });
    this.tweens.add({ targets: sub, alpha: 1, delay: 900, duration: 700 });
    this.time.delayedCall(3600, () => this.next());
    this.input.once('pointerdown', () => this.next());
    this.input.keyboard?.once('keydown', () => this.next());
  }

  private next(): void {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
  }
}
