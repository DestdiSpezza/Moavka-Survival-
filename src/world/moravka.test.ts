import { describe, expect, it } from 'vitest';
import { AREAS } from './areas';
import { distToPolyline, pointAlong, polylineLength } from './geom';
import { buildArea, MAP_H, MAP_W, zoneAt, type WorldMap } from './moravka';
import { buildMoravka } from './realMoravka';
import { isSolid, Tile } from './tiles';
import { TILE } from '../config';

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

const build = (name: string) => (name === 'Morávka' ? buildMoravka() : buildArea(AREAS.raskovice.seed, AREAS.raskovice.phase));

describe.each([
  ['Morávka', buildMoravka()],
  ['Raškovice', buildArea(AREAS.raskovice.seed, AREAS.raskovice.phase)],
])('mapa %s', (name, map) => {
  it('má správné rozměry a je pokaždé stejná', () => {
    expect(map.tiles).toHaveLength(MAP_H);
    expect(map.tiles[0]).toHaveLength(MAP_W);
    expect(build(name).tiles).toEqual(map.tiles);
  });

  it('hráč se objeví na průchozí dlaždici na návsi', () => {
    expect(isSolid(map.tiles[map.spawn.y][map.spawn.x])).toBe(false);
    expect(zoneAt(map, map.spawn.x, map.spawn.y)).toBe('Náves');
  });

  it('z návsi se dá dojít k důležitým budovám, na hráz i k výjezdu na sever', () => {
    const r = reachable(map, map.spawn.x, map.spawn.y);
    const nextTo = (bname: string) => {
      const b = map.buildings.find((x) => x.name === bname)!;
      for (let x = b.x - 1; x <= b.x + b.w; x++) {
        if (r[b.y - 1]?.[x] || r[b.y + b.h]?.[x]) return true;
      }
      for (let y = b.y; y < b.y + b.h; y++) {
        if (r[y]?.[b.x - 1] || r[y]?.[b.x + b.w]) return true;
      }
      return false;
    };
    for (const b of ['Hospoda', 'Pila', 'Škola', 'Obchod', 'Kostel', 'Obecní úřad', 'Zdravotní středisko', 'Garáž', 'Chata']) {
      expect(nextTo(b), b).toBe(true);
    }
    expect(map.tiles.some((row, y) => row.some((t, x) => t === Tile.Dam && r[y][x])), 'hráz').toBe(true);
    const exit = map.exits.next.at;
    expect(r[Math.floor(exit.y / TILE)][Math.floor(exit.x / TILE)], 'výjezd na sever').toBe(true);
    expect(r[0].some(Boolean), 'sever').toBe(true);
  });

  it('místo probuzení před zdravotním střediskem je průchozí a dosažitelné', () => {
    const r = reachable(map, map.spawn.x, map.spawn.y);
    expect(isSolid(map.tiles[map.hospital.y][map.hospital.x])).toBe(false);
    expect(r[map.hospital.y][map.hospital.x]).toBe(true);
    expect(zoneAt(map, map.hospital.x, map.hospital.y)).toBe('Zdravotní středisko');
  });

  it('potoky a řeka jsou souvislé: po celé ose je voda, jen mosty ji přeruší', () => {
    for (const s of map.streams) {
      const len = polylineLength(s.pts);
      for (let d = 0; d <= len; d += 0.5) {
        const p = pointAlong(s.pts, d);
        const tile = map.tiles[Math.min(MAP_H - 1, Math.floor(p.y))][Math.min(MAP_W - 1, Math.floor(p.x))];
        expect([Tile.Water, Tile.Bridge, Tile.Rock], `${p.x.toFixed(1)},${p.y.toFixed(1)}`).toContain(tile);
      }
    }
  });

  it('budovy nestojí ve vodě ani na silnici', () => {
    for (const b of map.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) {
          const where = `${b.name} @${x},${y}`;
          expect(map.tiles[y][x], where).toBe(b.roof);
          for (const road of map.roads) {
            if (road.kind === 'track') continue;
            expect(distToPolyline(x + 0.5, y + 0.5, road.pts), `${where} na silnici`).toBeGreaterThan(road.width / 2);
          }
          for (const s of map.streams) expect(distToPolyline(x + 0.5, y + 0.5, s.pts), `${where} ve vodě`).toBeGreaterThan(s.width / 2);
        }
      }
    }
  });
});

describe('Morávka podle skutečné vesnice', () => {
  const map = buildMoravka();
  const b = (name: string) => {
    const x = map.buildings.find((q) => q.name === name)!;
    return { x: x.x + x.w / 2, y: x.y + x.h / 2 };
  };
  const cross = map.spawn;

  it('hospoda stojí hned západně od křižovatky, mezi silnicí na severozápad a na jihozápad', () => {
    const h = b('Hospoda');
    expect(h.x).toBeLessThan(cross.x);
    expect(cross.x - h.x).toBeLessThan(15);
    expect(Math.abs(h.y - cross.y)).toBeLessThan(5);
  });

  it('škola je jihovýchodně od křižovatky u silnice na jih, vedle ní hřiště s oválem', () => {
    const s = b('Škola');
    expect(s.x - cross.x).toBeGreaterThan(20);
    expect(s.y - cross.y).toBeGreaterThan(30);
    expect(map.decor.some((d) => d.kind === 'oval' && Math.hypot(d.x - s.x, d.y - s.y) < 20)).toBe(true);
  });

  it('obchod, úřad a Vestův obchod jsou jižně od křižovatky, hasiči severovýchodně, dealer Omyx stojí u řeky', () => {
    for (const name of ['Obchod', 'Obecní úřad', 'Vesta']) expect(b(name).y, name).toBeGreaterThan(cross.y);
    expect(b('Hasiči').x).toBeGreaterThan(cross.x);
    expect(b('Hasiči').y).toBeLessThan(cross.y);
    const river = map.streams[1].pts;
    const omyx = map.spots.dealer!;
    expect(distToPolyline(omyx.x, omyx.y, river)).toBeLessThan(15);
    expect(isSolid(map.tiles[omyx.y][omyx.x])).toBe(false);
    expect(map.buildings.some((q) => q.name === 'Omyx')).toBe(false);
  });

  it('výjezd na Raškovice je v levém horním rohu a provoz od Raškovic začíná u něj', () => {
    const exit = map.exits.next.at;
    expect(exit.x / TILE).toBeLessThan(25);
    expect(exit.y / TILE).toBeLessThan(6);
    expect(zoneAt(map, Math.floor(exit.x / TILE), Math.floor(exit.y / TILE))).toBe('Cesta na Raškovice');
    const first = map.traffic[0][0];
    expect(Math.hypot(first.x - exit.x, first.y - exit.y)).toBeLessThan(5 * TILE);
  });

  it('Biomatky se drží u školky, Štamgasti u hospody, Dřevaři na pile', () => {
    const skolka = map.zones.find((z) => z.name === 'Školka')!;
    expect(map.ecoSpawn).toEqual([skolka]);
  });

  it('Vlaský potok teče na západě, řeka Morávka na východě', () => {
    expect(Math.max(...map.streams[0].pts.map((p) => p[0]))).toBeLessThan(cross.x);
    expect(Math.min(...map.streams[1].pts.map((p) => p[0]))).toBeGreaterThan(cross.x + 30);
  });
});
