import { describe, expect, it } from 'vitest';
import { TILE } from '../config';
import { buildMoravka } from './moravka';
import { pickupSpots } from './pickups';
import { isSolid, Tile } from './tiles';

describe('věci k sebrání', () => {
  const map = buildMoravka();
  const spots = pickupSpots(map);

  it('jsou tam všechny zbraně, vesta i lékárnička', () => {
    const kinds = spots.map((s) => s.kind);
    for (const k of ['bat', 'pistol', 'shotgun', 'smg', 'vest', 'medkit']) expect(kinds).toContain(k);
  });

  it('leží na průchozí dlaždici mimo silnici a každá jinde', () => {
    const keys = new Set<string>();
    for (const s of spots) {
      const t = map.tiles[Math.floor(s.y / TILE)][Math.floor(s.x / TILE)];
      expect(isSolid(t), s.kind).toBe(false);
      expect(t, s.kind).not.toBe(Tile.Road);
      keys.add(`${s.x},${s.y}`);
    }
    expect(keys.size).toBe(spots.length);
  });
});
