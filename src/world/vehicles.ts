import type { GroupId } from '../systems/respect';
import type { VehicleParams } from '../systems/vehicleModel';
import type { WorldMap } from './moravka';
import { Tile } from './tiles';
import { TILE } from '../config';

export type VehicleKind = 'osobak' | 'dodavka' | 'terenak' | 'traktor' | 'policie' | 'zasahovka' | 'skutr' | 'kolo' | 'jerab';

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
  // Autojeřáb ze stavby v Raškovicích (mise Vesty): těžký, pomalý, zatáčí jak tanker.
  jerab: {
    kind: 'jerab', name: 'Jeřáb', length: 34, width: 15, maxHp: 280,
    params: { maxSpeed: 80, reverseSpeed: 30, accel: 55, brake: 180, turnRate: 1.5, grip: 9, offroad: true },
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
  const near = (name: string, dx = 0) => {
    const b = map.buildings.find((x) => x.name === name);
    if (!b) throw new Error(`Chybí budova ${name}`);
    return { x: Math.floor(b.x + b.w / 2) + dx, y: b.y + b.h + 1 };
  };
  const dam = map.spots.damParking;
  // Před dveřmi eRka se neparkuje.
  const pub = map.buildings.find((x) => x.name === 'Hospoda');
  if (pub) {
    const dx = Math.floor(pub.x + pub.w / 2);
    for (let x = dx - 2; x <= dx + 1; x++) for (let y = pub.y + pub.h; y <= pub.y + pub.h + 1; y++) taken.add(`${x},${y}`);
  }
  // Parkoviště u eRka: auta srovnaně ve stáních (čelem k okraji), dole traktor s vlečkou.
  const lot = map.spots.pubParking;
  const lotCars: ParkedVehicle[] = [];
  if (lot) {
    for (let y = lot.y; y < lot.y + lot.h; y++) for (let x = lot.x; x < lot.x + lot.w; x++) taken.add(`${x},${y}`);
    const x0 = lot.x * TILE;
    const y0 = lot.y * TILE;
    const w = lot.w * TILE;
    const stall = (col: 0 | 1, row: number) => ({ x: col ? x0 + w - 15 : x0 + 15, y: y0 + 8 + row * 16, angle: col ? 0 : Math.PI });
    const fill: Array<[VehicleKind, GroupId | null, 0 | 1, number]> = [
      ['osobak', 'stamgasti', 0, 0],
      ['osobak', null, 1, 0],
      ['osobak', null, 0, 1],
      ['skutr', 'stamgasti', 1, 2],
      ['osobak', 'stamgasti', 0, 3],
      ['osobak', null, 1, 3],
    ];
    for (const [kind, owner, col, row] of fill) lotCars.push({ kind, owner, ...stall(col, row) });
    // Traktor v dlouhém stání dole, čelem na východ; vlečka za ním.
    lotCars.push({ kind: 'traktor', owner: null, x: x0 + w - 18, y: y0 + 73, angle: 0 });
  }
  // Čtvrtý údaj: natočení (traktor čelem na východ, ať má vlečka místo za sebou).
  const plan: Array<[VehicleKind, { x: number; y: number }, GroupId | null, number?]> = [
    // U eRka bez parkoviště (jiné mapy) aspoň auto a skútr Štamgastů; traktor jen bez parkoviště.
    ...(lot ? [] : ([['osobak', near('Hospoda'), 'stamgasti'], ['traktor', near('Hospoda', -7), null, 0], ['skutr', near('Hospoda'), 'stamgasti']] as Array<[VehicleKind, { x: number; y: number }, GroupId | null, number?]>)),
    ['dodavka', near('Hasiči'), 'hasici'],
    ['traktor', near(map.buildings.some((b) => b.name === 'Pila') ? 'Pila' : 'Hasiči'), null],
    ['osobak', near('Škola'), 'omladina'],
    ['skutr', near('Škola'), 'omladina'],
    ['skutr', near('Škola'), 'omladina'],
    ['policie', near('Obecní úřad'), null],
    ['dodavka', near('Obchod'), null],
    ['kolo', near('Obchod'), null],
    ['terenak', dam, null],
    ['kolo', dam, null],
  ];
  return [
    ...lotCars,
    ...plan.map(([kind, at, owner, angle], i) => {
      const { tx, ty } = findParkingSpot(map, at.x, at.y, taken);
      return { kind, owner, x: (tx + 1) * TILE, y: (ty + 0.5) * TILE, angle: angle ?? (i % 2 ? Math.PI : 0) };
    }),
  ];
}

/** Trasy pro provoz (jezdí se vpravo); první vede od výjezdu na sever (konvoj od Raškovic). */
export function trafficPaths(map: WorldMap): Array<Array<{ x: number; y: number }>> {
  return map.traffic;
}
