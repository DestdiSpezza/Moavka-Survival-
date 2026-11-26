import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { touch } from '../input/touch';
import { pixelFont } from './BootScene';

/** Záběr prologu: kam se kamera dívá (souřadnice v obrázku), jak blízko a co se píše. */
interface Shot {
  x: number;
  y: number;
  zoom: number;
  text: string;
}

const SHOTS: Shot[] = [
  { x: 688, y: 300, zoom: 1.7, text: 'Morávka. 450 metrů nad mořem, 600 metrů nad rozumem.' },
  { x: 190, y: 330, zoom: 1.6, text: 'Hospoda eRko. Plotková dnes nahoře. Pivo dole. Prchard všude.' },
  { x: 640, y: 590, zoom: 1.7, text: 'Omladina. Po maturitě, před rozumem. Pivo, skejt, selfie.' },
  { x: 1150, y: 470, zoom: 1.6, text: 'Hasiči Morávka. Menší požáry, větší párty.' },
  { x: 900, y: 200, zoom: 1.8, text: 'Přehrada. Kdo spadne, koupe se. Kdo skočí, je z Raškovic.' },
  { x: 688, y: 384, zoom: 1, text: 'A pak na Instagramu vyskočila akce: SUPER FESTIVAL V ERKU.' },
];
const SHOT_MS = 3400;

/**
 * Prolog nové hry (ADR-028): kamera jezdí po malbě Morávky (cedule, eRko, Omladina,
 * Hasiči, přehrada) s titulky ve stylu hry, pak volba hrdiny. Přeskočit jde kdykoli.
 */
export class PrologScene extends Phaser.Scene {
  private done = false;
  private caption!: Phaser.GameObjects.Text;
  private index = -1;

  constructor() {
    super('Prolog');
  }

  create(): void {
    this.done = false;
    this.index = -1;
    const { width, height } = this.scale;
    const art = this.add.image(0, 0, 'keyart').setOrigin(0);
    const cam = this.cameras.main;
    cam.setBackgroundColor('#000000');
    cam.setBounds(0, 0, art.width, art.height);
    // Při zoomu 1 má být vidět celý obrázek (je jen o kousek širší než obrazovka).
    const fit = Math.max(width / art.width, height / art.height);
    cam.setZoom(SHOTS[0].zoom * fit).centerOn(SHOTS[0].x, SHOTS[0].y);
    cam.fadeIn(700);
    // Pruhy a titulky jsou v samostatné vrstvě, která se nepřibližuje.
    const ui = this.add.container(0, 0).setScrollFactor(0);
    const bar = 58;
    ui.add(this.add.rectangle(0, 0, width, bar, 0x000000).setOrigin(0).setScrollFactor(0));
    ui.add(this.add.rectangle(0, height - bar, width, bar, 0x000000).setOrigin(0).setScrollFactor(0));
    this.caption = this.add.text(width / 2, height - bar / 2, '', { ...pixelFont(22, '#f2e9d0'), align: 'center', wordWrap: { width: width - 80 } }).setOrigin(0.5).setScrollFactor(0).setStroke('#000', 4);
    const skip = this.add.text(width - 14, 14, touch.enabled ? 'Ťukni = přeskočit' : 'Mezerník / Enter = přeskočit', pixelFont(14, '#8a8478')).setOrigin(1, 0).setScrollFactor(0);
    ui.add([this.caption, skip]);
    // Kontejner s pruhy se nesmí zvětšovat se zoomem kamery: druhá kamera bez zoomu.
    const uiCam = this.cameras.add(0, 0, width, height);
    uiCam.ignore(art);
    cam.ignore(ui);
    this.fit = fit;
    this.nextShot();
    this.input.on('pointerdown', () => this.finish());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') this.finish();
    });
  }

  private fit = 1;

  private nextShot(): void {
    if (this.done) return;
    this.index++;
    const shot = SHOTS[this.index];
    if (!shot) {
      this.finish();
      return;
    }
    const cam = this.cameras.main;
    if (this.index > 0) {
      cam.pan(shot.x, shot.y, 1400, 'Sine.easeInOut');
      cam.zoomTo(shot.zoom * this.fit, 1400, 'Sine.easeInOut');
    }
    // Titulek se vypisuje po písmenech.
    this.caption.setText('');
    let n = 0;
    this.time.addEvent({
      delay: 28,
      repeat: shot.text.length - 1,
      callback: () => {
        n++;
        this.caption.setText(shot.text.slice(0, n));
        if (n % 3 === 0) Sound.blip();
      },
    });
    this.time.delayedCall(this.index === SHOTS.length - 1 ? SHOT_MS + 800 : SHOT_MS, () => this.nextShot());
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    const cam = this.cameras.main;
    cam.fadeOut(500, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => this.scene.start('Hero'));
  }
}
