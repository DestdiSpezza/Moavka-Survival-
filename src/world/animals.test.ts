import { describe, expect, it } from 'vitest';
import { TILE } from '../config';
import { createRng } from '../systems/rng';
import { AREAS } from './areas';
import { findBoarCrossing } from './animals';
import { isSolid, Tile } from './tiles';
import { buildWorld } from './world';

describe.each(Object.values(AREAS).filter((a) => a.playable))('divočák: $name', (area) => {
  const map = buildWorld(area.id);
  it('vždycky najde trasu přes hlavní silnici bez domů a vody', () => {
    const rnd = createRng(9);
    for (let i = 0; i < 30; i++) {
      const c = findBoarCrossing(map, rnd, () => true)!;
      expect(c).not.toBeNull();
      const start = map.tiles[Math.floor(c.from.y / TILE)][Math.floor(c.from.x / TILE)];
      expect([Tile.Grass, Tile.ForestFloor, Tile.Dirt]).toContain(start);
      let crossesRoad = false;
      for (let k = 0; k <= 40; k++) {
        const x = c.from.x + ((c.to.x - c.from.x) * k) / 40;
        const y = c.from.y + ((c.to.y - c.from.y) * k) / 40;
        const t = map.tiles[Math.floor(y / TILE)][Math.floor(x / TILE)];
        expect(isSolid(t), `${x},${y}`).toBe(false);
        if (t === Tile.Road || t === Tile.Bridge) crossesRoad = true;
      }
      expect(crossesRoad).toBe(true);
    }
  });
});
