import type { VehicleParams } from '../systems/vehicleModel';
import { CROSS_ROAD_Y, DAM_Y, mainRoadX, type WorldMap } from './moravka';
import { Tile } from './tiles';
import { TILE } from '../config';

export type VehicleKind = 'osobak' | 'dodavka' | 'terenak' | 'traktor' | 'policie';

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
    kind: 'osobak', name: 'Osobák', length: 20, width: 10, maxHp: 100,
    params: { maxSpeed: 190, reverseSpeed: 60, accel: 150, brake: 260, turnRate: 2.6, grip: 7, offroad: false },
  },
  dodavka: {
    kind: 'dodavka', name: 'Dodávka', length: 24, width: 12, maxHp: 150,
    params: { maxSpeed: 150, reverseSpeed: 50, accel: 100, brake: 200, turnRate: 2.0, grip: 6, offroad: false },
  },
  terenak: {
    kind: 'terenak', name: 'Teréňák', length: 22, width: 12, maxHp: 140,
    params: { maxSpeed: 170, reverseSpeed: 60, accel: 130, brake: 230, turnRate: 2.4, grip: 6.5, offroad: true },
  },
  traktor: {
    kind: 'traktor', name: 'Traktor', length: 18, width: 12, maxHp: 200,
    params: { maxSpeed: 75, reverseSpeed: 35, accel: 70, brake: 200, turnRate: 2.2, grip: 9, offroad: true },
  },
  policie: {
    kind: 'policie', name: 'Policejní auto', length: 20, width: 10, maxHp: 120,
    params: { maxSpeed: 210, reverseSpeed: 65, accel: 170, brake: 280, turnRate: 2.8, grip: 7.5, offroad: false },
  },
};

export interface ParkedVehicle {
  kind: VehicleKind;
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
  const plan: Array<[VehicleKind, { x: number; y: number }]> = [
    ['osobak', near('Hospoda')],
    ['traktor', near('Hospoda')],
    ['dodavka', near('Pila')],
    ['traktor', near('Pila')],
    ['osobak', near('Škola')],
    ['policie', near('Obecní úřad')],
    ['dodavka', near('Obchod')],
    ['terenak', { x: mainRoadX(DAM_Y - 3) + 4, y: DAM_Y - 3 }],
  ];
  return plan.map(([kind, at], i) => {
    const { tx, ty } = findParkingSpot(map, at.x, at.y, taken);
    return { kind, x: (tx + 1) * TILE, y: (ty + 0.5) * TILE, angle: i % 2 ? Math.PI : 0 };
  });
}

/**
 * Trasy pro provoz. Jezdí se vpravo: na jih po západním pruhu hlavní silnice,
 * na sever po východním; na východ po jižním pruhu příčné silnice, na západ po severním.
 */
export function trafficPaths(): Array<Array<{ x: number; y: number }>> {
  const south: Array<{ x: number; y: number }> = [];
  for (let y = 1; y <= DAM_Y - 2; y += 2) south.push({ x: (mainRoadX(y) + 0.5) * TILE, y: (y + 0.5) * TILE });
  const north = [...south].reverse().map((p, i) => {
    const y = Math.round(p.y / TILE - 0.5);
    return { x: (mainRoadX(y) + 1.5) * TILE, y: p.y, i };
  }).map(({ x, y }) => ({ x, y }));
  const east: Array<{ x: number; y: number }> = [];
  for (let x = 17; x <= 98; x += 2) east.push({ x: (x + 0.5) * TILE, y: (CROSS_ROAD_Y + 1.5) * TILE });
  const west = [...east].reverse().map((p) => ({ x: p.x, y: (CROSS_ROAD_Y + 0.5) * TILE }));
  return [south, north, east, west];
}
