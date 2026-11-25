import { describe, expect, it } from 'vitest';
import { buildMoravka } from '../world/realMoravka';
import { isSolid, Tile } from '../world/tiles';
import { findPath } from './pathfind';

const open = (t: number) => (t === 1 ? Infinity : 1);

describe('hledání cesty', () => {
  it('objede zeď', () => {
    const tiles = [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 1, 0],
    ];
    const path = findPath(tiles, [2, 2], [2, 0], open)!;
    expect(path[0]).toEqual([2, 2]);
    expect(path[path.length - 1]).toEqual([2, 0]);
    for (const [x, y] of path) expect(tiles[y][x]).toBe(0);
  });

  it('vrátí null, když cesta neexistuje', () => {
    const tiles = [
      [0, 1, 0],
      [0, 1, 0],
    ];
    expect(findPath(tiles, [0, 0], [2, 0], open)).toBeNull();
  });

  it('na mapě Morávky najde cestu z jihu vesnice na pilu přes most', () => {
    const map = buildMoravka();
    const cost = (t: number) => (isSolid(t) ? Infinity : t === Tile.Road || t === Tile.Bridge ? 1 : 3);
    const pila = map.buildings.find((b) => b.name === 'Pila')!;
    const path = findPath(map.tiles, [map.spawn.x + 10, map.spawn.y + 10], [pila.x, pila.y - 1], cost);
    expect(path).not.toBeNull();
    expect(path!.some(([x, y]) => map.tiles[y][x] === Tile.Bridge || map.tiles[y][x] === Tile.Dam)).toBe(true);
  });
});
