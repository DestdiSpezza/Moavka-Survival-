import Phaser from 'phaser';
import { TILE } from '../config';
import { T } from '../texts/cs';
import { generateCombat, generatePedestrian, generatePlayer, generateTileset, generateVehicles } from '../world/tileset';

/**
 * Načítání assetů. Zatím žádné obrázky nemáme, takže dočasnou pixelovou
 * grafiku vyrobíme kódem. Ve fázi 8 ji nahradí ručně kreslený pixel-art.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    const label = this.add.text(width / 2, height / 2, T.loading, pixelFont(16)).setOrigin(0.5);
    this.load.on('complete', () => label.destroy());
  }

  create(): void {
    makeTile(this, 'tile-grass', 0x3f7d3a, 0x4a8c42);
    makeTile(this, 'tile-road', 0x4b4b4f, 0x56565b);
    generateTileset(this, 'tiles');
    generatePlayer(this, 'player');
    generateVehicles(this);
    generatePedestrian(this, 'driver', 0x4a6a8a, 0x5a3a22);
    generateCombat(this);
    this.scene.start('Title');
  }
}

/** Dlaždice s jednoduchým šumem, ať tráva nevypadá jako jedna plocha. */
function makeTile(scene: Phaser.Scene, key: string, base: number, speck: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(base).fillRect(0, 0, TILE, TILE);
  g.fillStyle(speck);
  for (let i = 0; i < 10; i++) {
    g.fillRect(Phaser.Math.Between(0, TILE - 1), Phaser.Math.Between(0, TILE - 1), 1, 1);
  }
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

export function pixelFont(size: number, color = '#f2e9d0'): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: 'monospace', fontSize: `${size}px`, color, fontStyle: 'bold' };
}
