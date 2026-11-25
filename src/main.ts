import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  pixelArt: true,
  backgroundColor: '#111111',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, TitleScene, GameScene, UIScene],
});

// Přístup ke hře z konzole prohlížeče a z automatických testů.
(window as unknown as { __game: Phaser.Game }).__game = game;
