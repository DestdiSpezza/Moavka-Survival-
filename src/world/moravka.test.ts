import { describe, expect, it } from 'vitest';
import { buildMoravka, CROSS_ROAD_Y, DAM_Y, mainRoadX, MAP_H, MAP_W, riverX, zoneAt, type WorldMap } from './moravka';
import { isSolid, Tile } from './tiles';

const map = buildMoravka();

/** Najde, kam se dá z daného bodu dojít pěšky (BFS po neprůchozích dlaždicích). */
function reachable(m: WorldMap, sx: number, sy: number): boolean[][] {
  const seen = Array.from({ length: m.height }, () => Array<boolean>(m.width).fill(false));
  const queue: Array<[number, number]> = [[sx, sy]];
  seen[sy][sx] = true;
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
      if (seen[ny][nx] || isSolid(m.tiles[ny][nx])) continue;
      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }
  return seen;
}

describe('mapa Morávky', () => {
  it('má správné rozměry a je pokaždé stejná', () => {
    expect(map.tiles).toHaveLength(MAP_H);
    expect(map.tiles[0]).toHaveLength(MAP_W);
    expect(buildMoravka().tiles).toEqual(map.tiles);
  });

  it('hráč se objeví na průchozí dlaždici na návsi', () => {
    expect(isSolid(map.tiles[map.spawn.y][map.spawn.x])).toBe(false);
    expect(zoneAt(map, map.spawn.x, map.spawn.y)).toBe('Náves');
  });

  it('z návsi se dá dojít k hospodě, pile, škole, na hráz i na sever k Raškovicím', () => {
    const r = reachable(map, map.spawn.x, map.spawn.y);
    const nextTo = (name: string) => {
      const b = map.buildings.find((x) => x.name === name)!;
      // Nějaká dlaždice kolem budovy musí být dosažitelná.
      for (let x = b.x - 1; x <= b.x + b.w; x++) {
        if (r[b.y - 1]?.[x] || r[b.y + b.h]?.[x]) return true;
      }
      for (let y = b.y; y < b.y + b.h; y++) {
        if (r[y]?.[b.x - 1] || r[y]?.[b.x + b.w]) return true;
      }
      return false;
    };
    for (const name of ['Hospoda', 'Pila', 'Škola', 'Obchod', 'Kostel', 'Obecní úřad', 'Zdravotní středisko']) {
      expect(nextTo(name), name).toBe(true);
    }
    expect(r[DAM_Y].some(Boolean), 'hráz').toBe(true);
    expect(r[0].some(Boolean), 'sever').toBe(true);
  });

  it('místo probuzení před zdravotním střediskem je průchozí a dosažitelné', () => {
    const r = reachable(map, map.spawn.x, map.spawn.y);
    expect(isSolid(map.tiles[map.hospital.y][map.hospital.x])).toBe(false);
    expect(r[map.hospital.y][map.hospital.x]).toBe(true);
    expect(zoneAt(map, map.hospital.x, map.hospital.y)).toBe('Zdravotní středisko');
  });

  it('řeka je souvislá: přejít jde jen po mostě nebo po hrázi', () => {
    for (let y = 0; y < DAM_Y; y++) {
      const row = map.tiles[y];
      const crossing = row.slice(20, 60).every((t) => !isSolid(t) || t === Tile.Tree || t === Tile.Rock);
      const hasBridge = row.includes(Tile.Bridge);
      // Každý řádek nad hrází obsahuje vodu, pokud v něm není most.
      expect(hasBridge || row.includes(Tile.Water), `řádek ${y}`).toBe(true);
      expect(crossing && !hasBridge, `řádek ${y} jde přejít suchou nohou`).toBe(false);
    }
  });

  it('budovy nestojí v řece ani na silnici', () => {
    for (const b of map.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) {
          const where = `${b.name} @${x},${y}`;
          expect(map.tiles[y][x], where).toBe(b.roof);
          expect(Math.abs(x - riverX(y)) > 1, `${where} v řece`).toBe(true);
          expect(x === mainRoadX(y) || x === mainRoadX(y) + 1, `${where} na hlavní silnici`).toBe(false);
          expect(y === CROSS_ROAD_Y || y === CROSS_ROAD_Y + 1, `${where} na příčné silnici`).toBe(false);
        }
      }
    }
  });
});
