import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { type Gender, newProgress } from '../systems/save';
import { pixelFont } from './BootScene';

const MAX_NAME = 14;
const DEFAULT_NAME: Record<Gender, string> = { m: 'Punkáč', f: 'Punkačka' };

/**
 * Nová hra: hrdina, nebo hrdinka (ADR-012), jméno napíše hráč sám.
 * Pak telefon s příspěvkem jako z Instagramu: v eRku je super festival. Proto se jede.
 */
export class HeroScene extends Phaser.Scene {
  private gender: Gender = 'm';
  private name = '';
  private step: 'hero' | 'post' = 'hero';
  private frames: Phaser.GameObjects.Rectangle[] = [];
  private nameText!: Phaser.GameObjects.Text;
  private layer!: Phaser.GameObjects.Container;

  constructor() {
    super('Hero');
  }

  create(): void {
    this.gender = 'm';
    this.name = '';
    this.step = 'hero';
    this.frames = [];
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0e0c10).setOrigin(0);
    this.layer = this.add.container(0, 0);
    const title = this.add.text(width / 2, 60, 'Kdo jede na festival do Morávky?', pixelFont(30, '#ffd23f')).setOrigin(0.5).setStroke('#2a1d12', 6);
    this.layer.add(title);
    (['m', 'f'] as Gender[]).forEach((g, i) => {
      const x = width / 2 + (i ? 130 : -130);
      const frame = this.add.rectangle(x, 200, 170, 170, 0x1e1a14).setStrokeStyle(3, 0x6a5a44).setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => this.pick(g));
      const sprite = this.add.sprite(x, 195, g === 'f' ? 'player-f' : 'player').setScale(6).setOrigin(0.5).setRotation(Math.PI / 2);
      const label = this.add.text(x, 305, g === 'f' ? 'Hrdinka' : 'Hrdina', pixelFont(22)).setOrigin(0.5).setStroke('#000', 4);
      this.frames.push(frame);
      this.layer.add([frame, sprite, label]);
    });
    const nameLabel = this.add.text(width / 2, 360, 'Jméno:', pixelFont(18, '#c8c0a8')).setOrigin(0.5);
    this.nameText = this.add.text(width / 2, 392, '', pixelFont(26)).setOrigin(0.5).setStroke('#000', 4);
    // Na mobilu není klávesnice: ťuknutí na jméno otevře klávesnici telefonu.
    const nameBox = this.add.rectangle(width / 2, 392, 320, 44, 0xffffff, 0.04).setStrokeStyle(2, 0x6a5a44).setInteractive({ useHandCursor: true });
    nameBox.on('pointerdown', () => this.askName());
    const go = this.add.text(width / 2, 450, '[ POKRAČOVAT ▶ ]', pixelFont(22, '#ffd23f')).setOrigin(0.5).setStroke('#000', 4).setInteractive({ useHandCursor: true });
    go.on('pointerdown', () => this.showPost());
    const hint = this.add.text(width / 2, height - 40, '←/→ nebo ťukni: hrdina / hrdinka · piš jméno (nebo ťukni na něj) · Enter = pokračovat', pixelFont(15, '#c8c0a8')).setOrigin(0.5);
    this.layer.add([nameBox, nameLabel, this.nameText, go, hint]);
    this.pick('m');
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.renderName() });

    // Přímo z prohlížeče: Phaser při rychlém psaní (víc kláves v jednom snímku) pošle
    // „keydown“ některé klávesy víckrát a jméno by se zdvojovalo.
    const onKey = (e: KeyboardEvent) => this.onKey(e);
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', onKey));
  }

  private pick(g: Gender): void {
    this.gender = g;
    this.frames.forEach((f, i) => f.setStrokeStyle(3, (i ? 'f' : 'm') === g ? 0xffd23f : 0x6a5a44));
    this.renderName();
  }

  private renderName(): void {
    const cursor = Math.floor(this.time.now / 450) % 2 ? '_' : ' ';
    this.nameText.setText(this.name ? `${this.name}${cursor}` : `${DEFAULT_NAME[this.gender]}?${cursor}`).setColor(this.name ? '#f2e9d0' : '#7a7468');
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat && e.key !== 'Backspace') return;
    if (this.step === 'post') {
      if (e.key === 'Enter' || e.key === ' ') this.begin();
      return;
    }
    if (e.key === 'ArrowLeft') this.pick('m');
    else if (e.key === 'ArrowRight') this.pick('f');
    else if (e.key === 'Backspace') this.name = this.name.slice(0, -1);
    else if (e.key === 'Enter') this.showPost();
    else if (e.key.length === 1 && /[\p{L}\p{N} .'-]/u.test(e.key) && this.name.length < MAX_NAME) {
      if (!(e.key === ' ' && (!this.name || this.name.endsWith(' ')))) this.name += e.key;
    }
    this.renderName();
  }

  /** Jméno přes klávesnici telefonu (obyčejný dotaz prohlížeče). */
  private askName(): void {
    if (this.step !== 'hero') return;
    const typed = window.prompt('Jméno hrdiny / hrdinky (max. 14 znaků):', this.name || DEFAULT_NAME[this.gender]);
    if (typed !== null) this.name = typed.replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, MAX_NAME);
    this.renderName();
  }

  private get heroName(): string {
    return this.name.trim() || DEFAULT_NAME[this.gender];
  }

  /** Telefon: příspěvek eRka o festivalu. */
  private showPost(): void {
    if (this.step !== 'hero') return;
    this.step = 'post';
    this.layer.setVisible(false);
    const { width, height } = this.scale;
    const x = width / 2;
    const top = 40;
    this.add.rectangle(x, height / 2, 300, 460, 0x1a1a1e).setStrokeStyle(4, 0x3a3a40);
    this.add.rectangle(x, height / 2, 276, 420, 0xf4f2ee);
    this.add.circle(x - 112, top + 40, 12, 0xd83a3a);
    this.add.text(x - 94, top + 32, 'erko_moravka', pixelFont(15, '#1a1a1e'));
    this.add.text(x - 94, top + 48, 'Morávka, Beskydy', pixelFont(12, '#6a6a70'));
    // „Fotka“: hospoda, světla, kapela.
    this.add.rectangle(x, top + 160, 256, 180, 0x2a1a10);
    this.add.rectangle(x, top + 200, 200, 70, 0x7a5236);
    this.add.rectangle(x, top + 150, 220, 40, 0xa8432e);
    for (let i = 0; i < 7; i++) this.add.circle(x - 96 + i * 32, top + 90, 4, [0xffd23f, 0xd83a3a, 0x3fbf4a][i % 3]);
    this.add.text(x, top + 150, 'SUPER FESTIVAL', pixelFont(24, '#ffd23f')).setOrigin(0.5).setStroke('#000', 4);
    this.add.text(x, top + 200, 'v eRku', pixelFont(18, '#f2e9d0')).setOrigin(0.5).setStroke('#000', 3);
    this.add.text(x - 120, top + 260, '♥ 47   💬 12', pixelFont(14, '#1a1a1e'));
    this.add
      .text(x - 120, top + 282, 'SUPER FESTIVAL V ERKU! 🎸🍺 Dneska od 16:00, Morávka. Kapela, pivo, Metějka s kytarou. Kdo nepřijde, je Raškovák. #morávka #festival #erko', {
        ...pixelFont(13, '#1a1a1e'),
        wordWrap: { width: 244 },
      });
    this.add.text(x, height - 46, `Na Instagramu vyskočila akce. ${this.heroName} jede na Morávku.`, pixelFont(18, '#ffd23f')).setOrigin(0.5).setStroke('#000', 4);
    this.add.text(x, height - 20, 'Enter nebo ťukni = jedeme', pixelFont(14, '#c8c0a8')).setOrigin(0.5);
    this.time.delayedCall(300, () => this.input.once('pointerdown', () => this.begin()));
  }

  private begin(): void {
    if (!this.scene.isActive()) return;
    Sound.unlock();
    this.registry.set('progress', newProgress({ gender: this.gender, name: this.heroName }));
    this.registry.set('arrival', null);
    this.scene.start('Game');
  }
}
