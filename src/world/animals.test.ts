import { describe, expect, it } from 'vitest';
import { TILE } from '../config';
import { createRng } from '../systems/rng';
import { AREAS } from './areas';
import { findBoarCrossing } from './animals';
import { buildArea, mainRoadX } from './moravka';
import { isSolid, Tile } from './tiles';

describe.each(Object.values(AREAS).filter((a) => a.playable))('divočák: $name', (area) => {
  const map = buildArea(area.seed, area.phase);
  it('vždycky najde trasu přes hlavní silnici bez domů a vody', () => {
    const rnd = createRng(9);
    for (let i = 0; i < 30; i++) {
      const c = findBoarCrossing(map, rnd, () => true)!;
      expect(c).not.toBeNull();
      const ty = Math.floor(c.from.y / TILE);
      const fx = Math.floor(c.from.x / TILE);
      const tx = Math.floor(c.to.x / TILE);
      expect(tx).toBeLessThan(mainRoadX(ty, map.phase));
      expect(fx).toBeGreaterThan(mainRoadX(ty, map.phase) + 1);
      let crossesRoad = false;
      for (let x = tx; x <= fx; x++) {
        expect(isSolid(map.tiles[ty][x])).toBe(false);
        if (map.tiles[ty][x] === Tile.Road) crossesRoad = true;
      }
      expect(crossesRoad).toBe(true);
    }
  });
});
