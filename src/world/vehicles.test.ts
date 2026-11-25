import { describe, expect, it } from 'vitest';
import { TILE } from '../config';
import { buildMoravka } from './realMoravka';
import { Tile } from './tiles';
import { parkedVehicles, trafficPaths } from './vehicles';

const map = buildMoravka();
const tileAt = (x: number, y: number) => map.tiles[Math.floor(y / TILE)][Math.floor(x / TILE)];

describe('vozidla na mapě', () => {
  it('zaparkovaná auta stojí na trávě nebo hlíně a nepřekrývají se', () => {
    const parked = parkedVehicles(map);
    expect(parked.some((p) => p.kind === 'policie')).toBe(true);
    expect(parked.filter((p) => p.owner === 'omladina').length).toBeGreaterThan(1);
    expect(parked.some((p) => p.owner === 'hasici')).toBe(true);
    // Traktor před eRkem nikomu nepatří (mise Dennyho sochaře).
    expect(parked.some((p) => p.kind === 'traktor' && p.owner === null)).toBe(true);
    for (const p of parked) {
      // Auto zabírá dvě dlaždice vedle sebe.
      expect([Tile.Grass, Tile.Dirt]).toContain(tileAt(p.x - 8, p.y));
      expect([Tile.Grass, Tile.Dirt]).toContain(tileAt(p.x + 8, p.y));
    }
    for (let i = 0; i < parked.length; i++) {
      for (let j = i + 1; j < parked.length; j++) {
        const d = Math.hypot(parked[i].x - parked[j].x, parked[i].y - parked[j].y);
        expect(d, `${parked[i].kind} a ${parked[j].kind}`).toBeGreaterThanOrEqual(TILE);
      }
    }
  });

  it('trasy provozu vedou po silnici, mostě nebo hrázi', () => {
    for (const path of trafficPaths(map)) {
      expect(path.length).toBeGreaterThan(10);
      for (const p of path) expect([Tile.Road, Tile.Bridge, Tile.Dam], `${p.x},${p.y}`).toContain(tileAt(p.x, p.y));
    }
  });
});
