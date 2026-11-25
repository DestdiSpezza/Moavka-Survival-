import type { GroupId } from '../systems/respect';
import type { VehicleParams } from '../systems/vehicleModel';
import type { WorldMap } from './moravka';
import { Tile } from './tiles';
import { TILE } from '../config';

export type VehicleKind = 'osobak' | 'dodavka' | 'terenak' | 'traktor' | 'policie' | 'zasahovka' | 'skutr' | 'kolo';

export interface VehicleType {
  kind: VehicleKind;
  name: string;
  /** Rozměr sprite v px (délka × šířka), auto je kreslené čelem doprava. */
  length: number;
  width: number;
  maxHp: number;
  params: VehicleParams;
}

export const VEHICLE_TYPES: Record<VehicleKind, VehicleType> = {
  osobak: {
    kind: 'osobak', name: 'Osobák', length: 24, width: 12, maxHp: 100,
    params: { maxSpeed: 190, reverseSpeed: 60, accel: 150, brake: 260, turnRate: 2.6, grip: 7, offroad: false },
  },
  dodavka: {
    kind: 'dodavka', name: 'Dodávka', length: 28, width: 13, maxHp: 150,
    params: { maxSpeed: 150, reverseSpeed: 50, accel: 100, brake: 200, turnRate: 2.0, grip: 6, offroad: false },
  },
  terenak: {
    kind: 'terenak', name: 'Teréňák', length: 26, width: 13, maxHp: 140,
    params: { maxSpeed: 170, reverseSpeed: 60, accel: 130, brake: 230, turnRate: 2.4, grip: 6.5, offroad: true },
  },
  traktor: {
    kind: 'traktor', name: 'Traktor', length: 22, width: 14, maxHp: 200,
    params: { maxSpeed: 75, reverseSpeed: 35, accel: 70, brake: 200, turnRate: 2.2, grip: 9, offroad: true },
  },
  policie: {
    kind: 'policie', name: 'Policejní auto', length: 24, width: 12, maxHp: 120,
    params: { maxSpeed: 210, reverseSpeed: 65, accel: 170, brake: 280, turnRate: 2.8, grip: 7.5, offroad: false },
  },
  skutr: {
    kind: 'skutr', name: 'Skútr', length: 14, width: 7, maxHp: 45,
    params: { maxSpeed: 150, reverseSpeed: 30, accel: 170, brake: 260, turnRate: 3.3, grip: 7, offroad: false },
  },
  kolo: {
    kind: 'kolo', name: 'Kolo', length: 14, width: 6, maxHp: 30,
    params: { maxSpeed: 95, reverseSpeed: 20, accel: 120, brake: 240, turnRate: 3.5, grip: 8, offroad: true },
  },
  zasahovka: {
    kind: 'zasahovka', name: 'Zásahovka', length: 28, width: 13, maxHp: 240,
    params: { maxSpeed: 175, reverseSpeed: 55, accel: 130, brake: 230, turnRate: 2.2, grip: 6.5, offroad: true },
  },
};

export function isPoliceKind(kind: VehicleKind): boolean {
  return kind === 'policie' || kind === 'zasahovka';
}

export interface ParkedVehicle {
  kind: VehicleKind;
  /** Skupina, které vozidlo patří (krádež nebo zničení jí vadí). */
  owner: GroupId | null;
  /** Střed vozidla v px. */
  x: number;
  y: number;
  angle: number;
}

/** Kde můžou stát zaparkovaná auta: tráva nebo hlína, ne silnice. */
function isParkable(t: number | undefined): boolean {
  return t === Tile.Grass || t === Tile.Dirt;
}

/**
 * Najde nejbližší volné místo 2×1 dlaždice od zadaného bodu (BFS),
 * které ještě není obsazené jiným zaparkovaným autem.
 */
export function findParkingSpot(map: WorldMap, sx: number, sy: number, taken: Set<string>): { tx: number; ty: number } {
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;
    if (seen.has(key) || x < 1 || y < 1 || x >= map.width - 2 || y >= map.height - 1) continue;
    seen.add(key);
    const free = !taken.has(key) && !taken.has(`${x + 1},${y}`) && !taken.has(`${x - 1},${y}`);
    if (free && isParkable(map.tiles[y][x]) && isParkable(map.tiles[y][x + 1])) {
      taken.add(key);
      taken.add(`${x + 1},${y}`);
      return { tx: x, ty: y };
    }
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  throw new Error(`Žádné místo k parkování u ${sx},${sy}`);
}

/** Zaparkovaná auta u důležitých míst. Policejní auto stojí u obecního úřadu. */
export function parkedVehicles(map: WorldMap): ParkedVehicle[] {
  const taken = new Set<string>();
  const near = (name: string) => {
    const b = map.buildings.find((x) => x.name === name);
    if (!b) throw new Error(`Chybí budova ${name}`);
    return { x: Math.floor(b.x + b.w / 2), y: b.y + b.h + 1 };
  };
  const dam = map.spots.damParking;
  const plan: Array<[VehicleKind, { x: number; y: number }, GroupId | null]> = [
    ['osobak', near('Hospoda'), 'stamgasti'],
    ['traktor', near('Hospoda'), 'drevari'],
    ['skutr', near('Hospoda'), 'stamgasti'],
    ['dodavka', near('Pila'), 'drevari'],
    ['traktor', near('Pila'), 'drevari'],
    ['osobak', near('Škola'), 'skola'],
    ['skutr', near('Škola'), 'skola'],
    ['skutr', near('Škola'), 'skola'],
    ['policie', near('Obecní úřad'), null],
    ['dodavka', near('Obchod'), null],
    ['kolo', near('Obchod'), 'ekologove'],
    ['terenak', dam, null],
    ['kolo', dam, 'ekologove'],
  ];
  return plan.map(([kind, at, owner], i) => {
    const { tx, ty } = findParkingSpot(map, at.x, at.y, taken);
    return { kind, owner, x: (tx + 1) * TILE, y: (ty + 0.5) * TILE, angle: i % 2 ? Math.PI : 0 };
  });
}

/** Trasy pro provoz (jezdí se vpravo); první vede od výjezdu na sever (konvoj od Raškovic). */
export function trafficPaths(map: WorldMap): Array<Array<{ x: number; y: number }>> {
  return map.traffic;
}
