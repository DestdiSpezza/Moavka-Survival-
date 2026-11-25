import { TILE } from '../config';
import { DAM_Y, mainRoadX, riverX, type WorldMap } from './moravka';
import { isSolid, Tile } from './tiles';

export interface Crossing {
  /** Kde divočák vyběhne (pole nebo les východně od silnice). */
  from: { x: number; y: number };
  /** Kam běží: pruh trávy mezi silnicí a řekou. */
  to: { x: number; y: number };
}

function walkable(t: number | undefined): boolean {
  return t !== undefined && !isSolid(t);
}

/**
 * Najde, kudy divočák přeběhne hlavní silnici: z východní strany do pruhu mezi
 * silnicí a řekou a zpátky. Celá trasa musí jít proběhnout (žádné domy).
 * `ok` může vyloučit místa (např. ta, která hráč právě vidí).
 */
export function findBoarCrossing(map: WorldMap, rnd: () => number, ok: (x: number, y: number) => boolean): Crossing | null {
  for (let tries = 0; tries < 40; tries++) {
    const ty = 4 + Math.floor(rnd() * (DAM_Y - 12));
    const road = mainRoadX(ty, map.phase);
    const river = riverX(ty, map.phase);
    const fx = road + 9 + Math.floor(rnd() * 8);
    const tx = river + 3 + Math.floor(rnd() * Math.max(1, road - river - 4));
    if (tx >= road) continue;
    let clear = true;
    for (let x = tx; x <= fx; x++) if (!walkable(map.tiles[ty]?.[x])) clear = false;
    const start = map.tiles[ty]?.[fx];
    if (!clear || (start !== Tile.Grass && start !== Tile.ForestFloor && start !== Tile.Dirt)) continue;
    const from = { x: (fx + 0.5) * TILE, y: (ty + 0.5) * TILE };
    if (!ok(from.x, from.y)) continue;
    return { from, to: { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE } };
  }
  return null;
}
