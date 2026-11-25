import { TILE } from '../../config';
import type { Point } from '../../systems/combat';
import { findPath } from '../../systems/pathfind';
import type { Building, WorldMap } from '../../world/moravka';
import { isSolid, Tile } from '../../world/tiles';

/** Cena dlaždice pro auto: silnice nejlevnější, chodník a hlína dražší, zdi nejdou. */
function driveCost(t: number): number {
  if (t === Tile.Road || t === Tile.Bridge) return 1;
  if (isSolid(t)) return Infinity;
  if (t === Tile.Sidewalk) return 1.8;
  return 3;
}

/** Nejlepší trasa autem (středy dlaždic v px); prázdná, když cesta není. */
export function roadRoute(map: WorldMap, from: Point, to: Point): Point[] {
  const tile = (p: Point): [number, number] => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)];
  const path = findPath(map.tiles, tile(from), tile(to), driveCost, 60000) ?? [];
  return path.map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
}

/** Délka nejlepší trasy autem (px). Kudy pojede hráč, je na něm; tohle je měřítko pro časový limit. */
export function routeLength(route: Point[], from: Point, to: Point): number {
  if (route.length < 2) return Math.hypot(to.x - from.x, to.y - from.y);
  let len = 0;
  for (let i = 1; i < route.length; i++) len += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return len;
}

/** Dům, kde bydlí Zjebal s Ajinou: rodinný dům na jihovýchodě u řeky. */
export function ajinaHouse(map: WorldMap): Building | null {
  const houses = map.buildings.filter((b) => b.name === 'Dům');
  if (!houses.length) return null;
  const want = { x: 100, y: 45 };
  return houses.reduce((best, b) => (Math.hypot(b.x - want.x, b.y - want.y) < Math.hypot(best.x - want.x, best.y - want.y) ? b : best));
}

/** Místo před vchodem budovy (dole uprostřed), v px. */
export function doorOf(b: Building, out = 1): Point {
  return { x: (b.x + b.w / 2) * TILE, y: (b.y + b.h + out) * TILE };
}
