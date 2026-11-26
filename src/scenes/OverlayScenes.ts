import { touch } from '../input/touch';
import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { stepVolume } from '../systems/settings';
import { pixelFont } from './BootScene';
import type { GameScene } from './GameScene';
import { createMenu, dim } from './menu';

/** Návrat z překryvného menu do scény, která ho otevřela. */
function back(scene: Phaser.Scene, from: string): void {
  scene.scene.stop();
  scene.scene.resume(from);
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** Nastavení: hlasitosti a tutoriál (uloží se do prohlížeče). */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(data: { from: string }): void {
    const { width } = this.scale;
    dim(this, 0.85);
    this.add.text(width / 2, 90, 'NASTAVENÍ', pixelFont(36, '#ffd23f')).setOrigin(0.5).setStroke('#000', 6);
    const s = Sound.settings;
    const vol = (key: 'master' | 'music' | 'sfx') => (dir: 1 | -1) => {
      s[key] = stepVolume(s[key], dir);
      Sound.applyVolumes();
      Sound.blip();
    };
    createMenu(this, width / 2, 190, [
      { label: () => `Celková hlasitost  ◂ ${pct(s.master)} ▸`, adjust: vol('master') },
      { label: () => `Hudba (rádio)  ◂ ${pct(s.music)} ▸`, adjust: vol('music') },
      { label: () => `Efekty  ◂ ${pct(s.sfx)} ▸`, adjust: vol('sfx') },
      {
        label: () => `Tutoriál: ${s.tutorial ? 'zapnutý' : 'vypnutý'}`,
        action: () => {
          s.tutorial = !s.tutorial;
          Sound.applyVolumes();
        },
        adjust: () => {
          s.tutorial = !s.tutorial;
          Sound.applyVolumes();
        },
      },
      { label: () => 'Zpět', action: () => back(this, data.from) },
    ], 44);
    this.add.text(width / 2, 450, touch.enabled ? 'Ťukni vlevo/vpravo na hodnotu = ubrat/přidat' : 'A/D mění hodnotu · Esc zpět', pixelFont(14, '#c8c0a8')).setOrigin(0.5);
    this.input.keyboard!.once('keydown-ESC', () => back(this, data.from));
  }
}

/** Ovládání prstem (mobil, ADR-024). */
const TOUCH_CONTROLS = [
  ['Pěšky', 'joystick vlevo: jdeš, kam ukazuje; málo vychýlit = pomalu · SPRINT'],
  ['Útok', 'ÚTOK míří sám na nejbližšího, kdo jde po tobě · ZBRAŇ přepne'],
  ['Auto', 'vlevo volant ◀ ▶ (jde po něm přejet prstem)'],
  ['', 'vpravo PLYN, BRZDA (i couvání), RUČKA = drift · E vystoupit'],
  ['Akce', 'E: promluvit, vejít do eRka, nastoupit'],
  ['Rozhovor', 'ťukni na volbu · obchod: tlačítka 1–5'],
  ['Hra', 'II pauza · telefon drž na šířku'],
];

const CONTROLS = [
  ['Pěšky', 'WASD / šipky chůze · SHIFT sprint · myš míření · levé tlačítko útok'],
  ['Zbraně', '1–5 výběr · 6 beskydský čaj · Q nebo kolečko další'],
  ['Auto', 'E nastoupit / ukrást / vystoupit · W/S plyn a brzda · A/D zatáčení'],
  ['', 'MEZERNÍK ruční brzda (drift) · R rádio · levé tlačítko střelba z okna'],
  ['Rozhovor', 'E u postavy · 1–3 nebo myš volba · E u dveří eRka vejít'],
  ['Místa', 'Vesta a chata: dojdi a vyber 1–5 · garáž: přijeď k Vysokému Dennymu'],
  ['Nápovědy', 'H skryje tutoriál'],
  ['Hra', 'Esc pauza · uložení v chatě a automaticky po misi a přejezdu'],
];

/** Přehled ovládání. */
export class ControlsScene extends Phaser.Scene {
  constructor() {
    super('Controls');
  }

  create(data: { from: string }): void {
    const { width, height } = this.scale;
    dim(this, 0.88);
    this.add.text(width / 2, 70, 'OVLÁDÁNÍ', pixelFont(36, '#ffd23f')).setOrigin(0.5).setStroke('#000', 6);
    (touch.enabled ? TOUCH_CONTROLS : CONTROLS).forEach(([head, text], i) => {
      this.add.text(150, 140 + i * 34, head, pixelFont(17, '#ffd23f')).setStroke('#000', 4);
      this.add.text(270, 140 + i * 34, text, pixelFont(16)).setStroke('#000', 4);
    });
    this.add.text(width / 2, height - 50, touch.enabled ? 'Ťukni = zpět' : 'Esc / Enter zpět', pixelFont(16, '#c8c0a8')).setOrigin(0.5);
    const close = () => back(this, data.from);
    this.input.keyboard!.once('keydown-ESC', close);
    this.input.keyboard!.once('keydown-ENTER', close);
    this.input.once('pointerdown', close);
  }
}

/** Pauza ve hře (Esc). */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const { width } = this.scale;
    dim(this, 0.7);
    this.add.text(width / 2, 120, 'PAUZA', pixelFont(48, '#ffd23f')).setOrigin(0.5).setStroke('#000', 6);
    const game = this.scene.get('Game') as GameScene;
    const resume = () => {
      this.scene.stop();
      game.resumeFromPause();
    };
    createMenu(this, width / 2, 220, [
      { label: () => 'Pokračovat', action: resume },
      { label: () => 'Nastavení', action: () => this.overlay('Settings') },
      { label: () => 'Ovládání', action: () => this.overlay('Controls') },
      {
        label: () => 'Hlavní menu (neuložený postup se ztratí)',
        action: () => {
          Sound.silence();
          this.scene.stop('UI');
          this.scene.stop('Game');
          this.scene.start('Title');
        },
      },
    ], 44);
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.scene.isActive()) resume();
    });
  }

  private overlay(key: string): void {
    this.scene.pause();
    this.scene.launch(key, { from: 'Pause' });
  }
}
