import Phaser from 'phaser';
import { TILE } from '../config';
import { T } from '../texts/cs';
import { generateEffectSprites, generateHumanSprites, generateVehicleSprites } from '../art/sprites';
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
    // Pixel-art sprity přepíšou jednodušší verze výše (stejné klíče).
    generateVehicleSprites(this);
    generateHumanSprites(this);
    generateEffectSprites(this);
    // Pixelové písmo z Google Fonts; když nepřijde včas (offline), jede se s náhradním.
    const fontReady = document.fonts
      ? document.fonts.load('20px "Jersey 10"', 'ěščřžýáíéůúĚŠČŘŽ0123456789').catch(() => [])
      : Promise.resolve([]);
    const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
    void Promise.race([fontReady, timeout]).then(() => this.scene.start('Title'));
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
  // Jersey 10: úzké pixelové písmo s čitelnými číslicemi a českou diakritikou.
  // Je opticky menší, proto se velikost násobí (rozložení HUDu počítá s původní velikostí).
  return { fontFamily: '"Jersey 10", monospace', fontSize: `${Math.round(size * 1.35)}px`, color };
}
