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

type G = Phaser.GameObjects.Graphics;

/** Barvy osobáků v provozu. */
export const CAR_COLORS = [0xb8352a, 0x2f5fa8, 0xd8d4c8, 0x8fae3a, 0x7a4a2a];

/**
 * Vozidla shora, čelem doprava. Každé má i ohořelou verzi (vrak).
 * Policejní auto má dvě verze majáku, které se střídají.
 */
export function generateVehicles(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: G) => void) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  const wheels = (g: G, w: number, h: number, inset = 3, size = 4) => {
    g.fillStyle(0x151515);
    g.fillRect(inset, 0, size, 1).fillRect(inset, h - 1, size, 1).fillRect(w - inset - size, 0, size, 1).fillRect(w - inset - size, h - 1, size, 1);
  };
  const car = (g: G, body: number, wreck: boolean) => {
    const c = wreck ? 0x2a2420 : body;
    wheels(g, 20, 10);
    g.fillStyle(c).fillRoundedRect(1, 1, 18, 8, 2);
    g.fillStyle(wreck ? 0x1a1614 : 0x9fc4d8).fillRect(12, 2, 3, 6); // čelní sklo
    g.fillStyle(wreck ? 0x1a1614 : 0x7fa4b8).fillRect(3, 2, 2, 6); // zadní sklo
    g.fillStyle(wreck ? 0x332c27 : shade(c, 0.85)).fillRect(5, 2, 7, 6); // střecha
    if (!wreck) {
      g.fillStyle(0xfff2a0).fillRect(18, 1, 1, 2).fillRect(18, 7, 1, 2);
      g.fillStyle(0xd02020).fillRect(1, 1, 1, 2).fillRect(1, 7, 1, 2);
    }
  };
  CAR_COLORS.forEach((color, i) => {
    make(`osobak-${i}`, 20, 10, (g) => car(g, color, false));
  });
  make('osobak-wreck', 20, 10, (g) => car(g, 0, true));

  const van = (g: G, wreck: boolean) => {
    wheels(g, 24, 12, 3, 4);
    g.fillStyle(wreck ? 0x2a2420 : 0xe8e4da).fillRect(1, 1, 22, 10);
    g.fillStyle(wreck ? 0x1a1614 : 0x9fc4d8).fillRect(18, 2, 2, 8);
    g.fillStyle(wreck ? 0x332c27 : 0xcfcabe).fillRect(2, 2, 15, 8);
    if (!wreck) g.fillStyle(0x3f7d3a).fillRect(5, 5, 9, 2); // nápis „ŘEZNICTVÍ“ by se nevešel
  };
  make('dodavka-0', 24, 12, (g) => van(g, false));
  make('dodavka-wreck', 24, 12, (g) => van(g, true));

  const offroad = (g: G, wreck: boolean) => {
    wheels(g, 22, 12, 3, 5);
    g.fillStyle(wreck ? 0x2a2420 : 0x4f5a2a).fillRect(2, 1, 19, 10);
    g.fillStyle(wreck ? 0x1a1614 : 0x9fc4d8).fillRect(14, 2, 2, 8);
    g.fillStyle(wreck ? 0x332c27 : 0x3e4720).fillRect(4, 2, 10, 8);
    g.fillStyle(0x151515).fillRect(0, 4, 2, 4); // rezerva vzadu
    if (!wreck) g.fillStyle(0x222222).fillRect(5, 3, 8, 1).fillRect(5, 8, 8, 1); // střešní nosič
  };
  make('terenak-0', 22, 12, (g) => offroad(g, false));
  make('terenak-wreck', 22, 12, (g) => offroad(g, true));

  const tractor = (g: G, wreck: boolean) => {
    g.fillStyle(0x151515).fillRect(1, 0, 6, 3).fillRect(1, 9, 6, 3).fillRect(13, 1, 3, 2).fillRect(13, 9, 3, 2);
    g.fillStyle(wreck ? 0x2a2420 : 0x2f7d3a).fillRect(8, 3, 9, 6); // kapota
    g.fillStyle(wreck ? 0x332c27 : 0xc8c8c0).fillRect(2, 3, 6, 6); // kabina
    g.fillStyle(0x1a1a1a).fillRect(11, 4, 1, 1); // výfuk
  };
  make('traktor-0', 18, 12, (g) => tractor(g, false));
  make('traktor-wreck', 18, 12, (g) => tractor(g, true));

  const police = (g: G, wreck: boolean, flip: boolean) => {
    car(g, 0xf2f2f2, wreck);
    if (wreck) return;
    g.fillStyle(0x2a5fd0).fillRect(1, 4, 18, 2);
    g.fillStyle(flip ? 0xff3030 : 0x3050ff).fillRect(8, 2, 2, 3);
    g.fillStyle(flip ? 0x3050ff : 0xff3030).fillRect(8, 5, 2, 3);
  };
  make('policie-0', 20, 10, (g) => police(g, false, false));
  make('policie-1', 20, 10, (g) => police(g, false, true));
  make('policie-wreck', 20, 10, (g) => police(g, true, false));

  // Částice: kouř, oheň, jiskry.
  make('puff', 6, 6, (g) => g.fillStyle(0xffffff).fillCircle(3, 3, 3));
  make('spark', 2, 2, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 2, 2));
}

/** Chodec (vyhozený řidič): stejný tvar jako hráč, jiné barvy. */
export function generatePedestrian(scene: Phaser.Scene, key: string, jacket: number, hair: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x000000, 0.35).fillEllipse(8, 9, 12, 11);
  g.fillStyle(jacket).fillEllipse(7, 8, 9, 12);
  g.fillStyle(0xe0b48a).fillRect(10, 6, 3, 2);
  g.fillStyle(0xe8c39a).fillCircle(8, 8, 3);
  g.fillStyle(hair).fillRect(6, 6, 3, 4);
  g.generateTexture(key, 16, 16);
  g.destroy();
}

function shade(color: number, f: number): number {
  const r = Math.round(((color >> 16) & 0xff) * f);
  const gg = Math.round(((color >> 8) & 0xff) * f);
  const b = Math.round((color & 0xff) * f);
  return (r << 16) | (gg << 8) | b;
}
