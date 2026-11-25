import { TILE } from '../config';
import type { WeaponId } from '../systems/combat';
import type { WorldMap } from './moravka';
import { Tile } from './tiles';

export type PickupKind = WeaponId | 'vest' | 'medkit' | 'money';

export interface PickupSpot {
  kind: PickupKind;
  x: number;
  y: number;
}

/** Za kolik sekund se sebraná věc znovu objeví. */
export const PICKUP_RESPAWN = 60;

function isFree(t: number | undefined): boolean {
  return t === Tile.Grass || t === Tile.Dirt || t === Tile.ForestFloor;
}

/** Nejbližší volná dlaždice (ne silnice) k bodu, kterou ještě nezabrala jiná věc. */
export function findFreeTile(map: WorldMap, sx: number, sy: number, taken: Set<string>): { tx: number; ty: number } {
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;
    if (seen.has(key) || x < 1 || y < 1 || x >= map.width - 1 || y >= map.height - 1) continue;
    seen.add(key);
    if (!taken.has(key) && isFree(map.tiles[y][x])) {
      taken.add(key);
      return { tx: x, ty: y };
    }
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  throw new Error(`Žádné volné místo u ${sx},${sy}`);
}

/**
 * Kde leží zbraně a výbava. Pálka u školy, pistole za hospodou, brokovnice na pile,
 * samopal daleko u hráze, vesta u obecního úřadu, lékárničky u střediska a obchodu.
 */
export function pickupSpots(map: WorldMap): PickupSpot[] {
  const taken = new Set<string>();
  const behind = (name: string, dx = 0) => {
    const b = map.buildings.find((x) => x.name === name);
    if (!b) throw new Error(`Chybí budova ${name}`);
    return { x: b.x + Math.floor(b.w / 2) + dx, y: b.y - 1 };
  };
  const below = (name: string, dx = 0) => {
    const b = map.buildings.find((x) => x.name === name)!;
    return { x: b.x + Math.floor(b.w / 2) + dx, y: b.y + b.h + 2 };
  };
  const plan: Array<[PickupKind, { x: number; y: number }]> = [
    ['bat', below('Škola', 3)],
    ['pistol', behind('Hospoda')],
    ['shotgun', behind('Pila')],
    ['smg', map.spots.smg],
    ['vest', below('Obecní úřad')],
    ['medkit', below('Zdravotní středisko')],
    ['medkit', below('Obchod', 2)],
  ];
  return plan.map(([kind, at]) => {
    const { tx, ty } = findFreeTile(map, at.x, at.y, taken);
    return { kind, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  });
}
