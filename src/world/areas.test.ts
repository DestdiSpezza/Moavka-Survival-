import { describe, expect, it } from 'vitest';
import { TILE } from '../config';
import { GROUP_IDS } from '../systems/respect';
import { AREAS, goalMet, placeLabel } from './areas';
import { spawnTiles } from './gangs';
import { buildArea } from './moravka';
import { pickupSpots } from './pickups';
import { Tile } from './tiles';
import { parkedVehicles, trafficPaths } from './vehicles';

describe('oblasti', () => {
  it('postup Morávka → Raškovice → Krásná → Lysá hora', () => {
    expect(AREAS.moravka.next).toBe('raskovice');
    expect(AREAS.raskovice.prev).toBe('moravka');
    expect(AREAS.raskovice.next).toBe('krasna');
    expect(AREAS.lysa.next).toBeNull();
  });

  it('každá další oblast chce víc', () => {
    expect(AREAS.raskovice.goal.score).toBeGreaterThan(AREAS.moravka.goal.score);
    expect(AREAS.raskovice.goal.money).toBeGreaterThan(AREAS.moravka.goal.money);
  });

  it('cíl platí, až když je splněné skóre i peníze', () => {
    expect(goalMet('moravka', 1500, 2500)).toBe(true);
    expect(goalMet('moravka', 1500, 100)).toBe(false);
    expect(goalMet('moravka', 10, 9999)).toBe(false);
  });

  it('místní názvy', () => {
    expect(placeLabel('raskovice', 'Hospoda')).toBe('Hospoda U Kapra');
    expect(placeLabel('moravka', 'Hospoda')).toBe('Hospoda');
  });

  const playable = Object.values(AREAS).filter((a) => a.playable);
  it.each(playable.map((a) => [a.name, a] as const))('%s: auta, věci a skupiny mají kde být, provoz jezdí po silnici', (_n, area) => {
    const map = buildArea(area.seed, area.phase);
    expect(parkedVehicles(map).length).toBeGreaterThan(5);
    expect(pickupSpots(map).length).toBeGreaterThan(5);
    for (const g of GROUP_IDS) expect(spawnTiles(map, g).length).toBeGreaterThan(5);
    for (const path of trafficPaths(map)) {
      for (const p of path) expect([Tile.Road, Tile.Bridge, Tile.Dam]).toContain(map.tiles[Math.floor(p.y / TILE)][Math.floor(p.x / TILE)]);
    }
  });
});
