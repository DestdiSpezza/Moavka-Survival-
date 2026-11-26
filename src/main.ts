import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { DialogScene } from './scenes/DialogScene';
import { HeroScene } from './scenes/HeroScene';
import { PubScene } from './scenes/PubScene';
import { TouchScene } from './scenes/TouchScene';
import { detectTouch, touch } from './input/touch';
import { ControlsScene, PauseScene, SettingsScene } from './scenes/OverlayScenes';

touch.enabled = detectTouch();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  pixelArt: true,
  backgroundColor: '#111111',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, TitleScene, HeroScene, GameScene, UIScene, PubScene, DialogScene, PauseScene, SettingsScene, ControlsScene, TouchScene],
  input: { activePointers: 4 },
});

// Přístup ke hře z konzole prohlížeče a z automatických testů.
(window as unknown as { __game: Phaser.Game; __touch: typeof touch }).__game = game;
(window as unknown as { __touch: typeof touch }).__touch = touch;
