import Phaser from 'phaser';
import { TILE, WORLD_ZOOM } from '../config';
import { Player } from '../entities/Player';
import { buildMoravka, type WorldMap, zoneAt } from '../world/moravka';
import { isSolid, speedFactor, TILE_COUNT } from '../world/tiles';
import { pixelFont } from './BootScene';

export const MINIMAP = { x: 16, y: 16, w: 200, h: 150, zoom: 0.1 };

/** Hlavní herní scéna: mapa Morávky, hráč, kamera a minimapa. */
export class GameScene extends Phaser.Scene {
  world!: WorldMap;
  player!: Player;

  constructor() {
    super('Game');
  }

  create(): void {
    this.world = buildMoravka();
    const map = this.make.tilemap({ data: this.world.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    const solid = Array.from({ length: TILE_COUNT }, (_, i) => i).filter(isSolid);
    layer.setCollision(solid);

    const wPx = this.world.width * TILE;
    const hPx = this.world.height * TILE;
    this.physics.world.setBounds(0, 0, wPx, hPx);

    // Popisky důležitých budov přímo na střechách.
    const labels = this.world.buildings
      .filter((b) => b.name !== 'Dům')
      .map((b) =>
        this.add
          .text((b.x + b.w / 2) * TILE, (b.y + b.h / 2) * TILE, b.name.toUpperCase(), pixelFont(14, '#fff4d6'))
          .setOrigin(0.5)
          .setScale(1 / WORLD_ZOOM)
          .setStroke('#2a1d12', 4)
          .setDepth(5),
      );

    const { x, y } = this.world.spawn;
    this.player = new Player(this, (x + 0.5) * TILE, (y + 0.5) * TILE);
    this.physics.add.collider(this.player, layer);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, wPx, hPx);
    cam.setZoom(WORLD_ZOOM);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);

    // Minimapa: druhá kamera nad celým světem, popisky na ní nejsou vidět.
    const mini = this.cameras
      .add(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h)
      .setZoom(MINIMAP.zoom)
      .setBounds(0, 0, wPx, hPx)
      .setBackgroundColor(0x000000)
      .startFollow(this.player);
    mini.setName('minimap');
    mini.ignore(labels);
    const dot = this.add.circle(0, 0, 40, 0xffd23f).setDepth(20);
    cam.ignore(dot);
    this.events.on('postupdate', () => dot.setPosition(this.player.x, this.player.y));

    this.scene.launch('UI');
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    const tile = this.world.tiles[ty]?.[tx] ?? 0;
    this.player.tick(dt, speedFactor(tile), this.input.activePointer);
    this.registry.set('zone', zoneAt(this.world, tx, ty));
    this.registry.set('tile', tile);
  }
}
