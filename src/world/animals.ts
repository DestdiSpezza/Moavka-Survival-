import { TILE } from '../config';
import { pointAlong, polylineLength } from './geom';
import type { WorldMap } from './moravka';
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
 * Najde, kudy divočák přeběhne hlavní silnici: z pole nebo lesa na jedné straně
 * kus za silnici na druhou stranu a zpátky. Celá trasa musí jít proběhnout (žádné domy ani voda).
 * `ok` může vyloučit místa (např. ta, která hráč právě vidí).
 */
export function findBoarCrossing(map: WorldMap, rnd: () => number, ok: (x: number, y: number) => boolean): Crossing | null {
  const mains = map.roads.filter((r) => r.kind === 'main');
  if (!mains.length) return null;
  for (let tries = 0; tries < 60; tries++) {
    const road = mains[Math.floor(rnd() * mains.length)];
    const p = pointAlong(road.pts, 2 + rnd() * Math.max(0, polylineLength(road.pts) - 4));
    const side = rnd() < 0.5 ? 1 : -1;
    // Kolmo k silnici: odkud (dál) a kam (blíž za silnicí).
    const nx = -p.dy * side;
    const ny = p.dx * side;
    const far = road.width / 2 + 7 + rnd() * 7;
    const near = road.width / 2 + 2.5 + rnd() * 3;
    const from = { x: p.x + nx * far, y: p.y + ny * far };
    const to = { x: p.x - nx * near, y: p.y - ny * near };
    const steps = Math.ceil((far + near) * 5);
    let clear = true;
    for (let i = 0; i <= steps && clear; i++) {
      const k = i / steps;
      if (!walkable(map.tiles[Math.floor(from.y + (to.y - from.y) * k)]?.[Math.floor(from.x + (to.x - from.x) * k)])) clear = false;
    }
    const start = map.tiles[Math.floor(from.y)]?.[Math.floor(from.x)];
    if (!clear || (start !== Tile.Grass && start !== Tile.ForestFloor && start !== Tile.Dirt)) continue;
    const fromPx = { x: from.x * TILE, y: from.y * TILE };
    if (!ok(fromPx.x, fromPx.y)) continue;
    return { from: fromPx, to: { x: to.x * TILE, y: to.y * TILE } };
  }
  return null;
}
