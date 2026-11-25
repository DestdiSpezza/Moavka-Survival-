import Phaser from 'phaser';
import { TILE } from '../config';
import { createRng } from '../systems/rng';
import { Tile, TILE_COUNT } from './tiles';

/**
 * Dočasný pixel-art tileset kreslený kódem (jeden řádek dlaždic 16×16).
 * Ve fázi 8 ho nahradí ručně kreslený obrázek se stejným pořadím dlaždic.
 */
export function generateTileset(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const rnd = createRng(7);
  const speck = (ox: number, color: number, count: number, size = 1) => {
    g.fillStyle(color);
    for (let i = 0; i < count; i++) {
      g.fillRect(ox + Math.floor(rnd() * (TILE - size + 1)), Math.floor(rnd() * (TILE - size + 1)), size, size);
    }
  };
  const base = (ox: number, color: number) => g.fillStyle(color).fillRect(ox, 0, TILE, TILE);

  for (let i = 0; i < TILE_COUNT; i++) {
    const ox = i * TILE;
    switch (i) {
      case Tile.Grass:
        base(ox, 0x4a8a3f);
        speck(ox, 0x5a9c4a, 14);
        speck(ox, 0x3d7534, 8);
        break;
      case Tile.Road:
        base(ox, 0x505056);
        speck(ox, 0x5c5c63, 10);
        speck(ox, 0x45454a, 6);
        break;
      case Tile.Water:
        base(ox, 0x2f6fa8);
        g.fillStyle(0x4a8fc8).fillRect(ox + 2, 4, 5, 1).fillRect(ox + 9, 10, 5, 1);
        break;
      case Tile.Dam:
        base(ox, 0x9a968c);
        g.fillStyle(0x86827a).fillRect(ox, 7, TILE, 1).fillRect(ox + 7, 0, 1, 7).fillRect(ox + 3, 8, 1, 8);
        break;
      case Tile.ForestFloor:
        base(ox, 0x2f5a2c);
        speck(ox, 0x6b4f2e, 6);
        speck(ox, 0x3b6d36, 10);
        break;
      case Tile.Tree:
        base(ox, 0x2f5a2c);
        g.fillStyle(0x1a3a1c).fillCircle(ox + 8, 9, 7);
        g.fillStyle(0x24502a).fillCircle(ox + 7, 7, 6);
        g.fillStyle(0x34683a).fillCircle(ox + 6, 5, 3);
        break;
      case Tile.Rock:
        base(ox, 0x6f6c66);
        speck(ox, 0x85827b, 12, 2);
        speck(ox, 0x56534e, 10);
        break;
      case Tile.Wall:
        base(ox, 0x8a7a66);
        break;
      case Tile.Bridge:
        base(ox, 0x7a5a3a);
        g.fillStyle(0x5e4329);
        for (let y = 1; y < TILE; y += 3) g.fillRect(ox, y, TILE, 1);
        g.fillStyle(0x3a2a1a).fillRect(ox, 0, TILE, 1).fillRect(ox, TILE - 1, TILE, 1);
        break;
      case Tile.Dirt:
        base(ox, 0x8a6a44);
        speck(ox, 0x9c7c52, 10);
        speck(ox, 0x75583a, 8);
        break;
      case Tile.RoofRed:
        roof(g, ox, 0xa8402e, 0x8a3324);
        break;
      case Tile.RoofGray:
        roof(g, ox, 0x6c6f78, 0x585a62);
        break;
      case Tile.RoofBrown:
        roof(g, ox, 0x7a5236, 0x62412a);
        break;
      case Tile.Logs:
        base(ox, 0x8a6a44);
        for (let y = 2; y < TILE; y += 5) {
          g.fillStyle(0x6b4a2a).fillRect(ox, y, TILE, 4);
          g.fillStyle(0xc49a62).fillCircle(ox + 2, y + 2, 2);
        }
        break;
    }
  }
  g.generateTexture(key, TILE * TILE_COUNT, TILE);
  g.destroy();
}

function roof(g: Phaser.GameObjects.Graphics, ox: number, light: number, dark: number): void {
  g.fillStyle(light).fillRect(ox, 0, TILE, TILE);
  g.fillStyle(dark);
  for (let y = 3; y < TILE; y += 4) g.fillRect(ox, y, TILE, 1);
}

/** Hráč shora: bunda, hlava a ruka ukazující směr pohledu (doprava = úhel 0). */
export function generatePlayer(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x000000, 0.35).fillEllipse(8, 9, 12, 11); // stín
  g.fillStyle(0x1c1c1f).fillEllipse(7, 8, 9, 12); // ramena v kožené bundě
  g.fillStyle(0xd93f6a).fillRect(4, 3, 2, 2).fillRect(4, 11, 2, 2); // punkové nášivky
  g.fillStyle(0xe0b48a).fillRect(10, 6, 4, 2); // ruka dopředu
  g.fillStyle(0xe8c39a).fillCircle(8, 8, 3); // hlava
  g.fillStyle(0x3fbf4a).fillRect(6, 7, 4, 2); // zelené čírko
  g.generateTexture(key, 16, 16);
  g.destroy();
}
