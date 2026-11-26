import { TILE } from '../config';
import { createRng } from '../systems/rng';
import type { Pt } from './geom';
import { Tile } from './tiles';

/**
 * Společný tvar mapy oblasti a generátor údolí (Raškovice a další oblasti):
 * řeka, hlavní silnice podél ní, příčná silnice přes most, přehrada na jihu.
 * Morávka má vlastní mapu podle skutečné vesnice (realMoravka.ts).
 * Mapa se generuje kódem ze semínka, takže je pokaždé stejná a jde snadno upravovat.
 */
export const MAP_W = 120;
export const MAP_H = 90;

export interface Building {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roof: number;
}

export interface Zone {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RoadKind = 'main' | 'side' | 'track';

/** Silnice jako lomená čára (osa) v dlaždicích; šířka taky v dlaždicích. */
export interface RoadLine {
  kind: RoadKind;
  width: number;
  pts: Pt[];
}

/** Potok nebo řeka jako lomená čára. */
export interface StreamLine {
  width: number;
  pts: Pt[];
}

/** Výjezd do jiné oblasti (v px): kde je značka a kam hráč přijede. */
export interface MapExit {
  at: { x: number; y: number };
  arrive: { x: number; y: number };
}

/** Přechod pro chodce: silnice (index) a vzdálenost od jejího začátku v dlaždicích. */
export interface Crosswalk {
  road: number;
  along: number;
}

/** Ozdoby malované do terénu: atletický ovál, hřiště s čárami. */
export type Decor =
  | { kind: 'oval'; x: number; y: number; rx: number; ry: number }
  | { kind: 'court'; x: number; y: number; w: number; h: number }
  | { kind: 'playground'; x: number; y: number; w: number; h: number }
  | { kind: 'parking'; x: number; y: number; w: number; h: number };

/** Pojmenovaná místa pro zakázky, výbavu a skupiny (v dlaždicích). */
export interface MapSpots {
  /** U přehrady (zakázky, auta). */
  dam: { x: number; y: number };
  /** Mýtina v lese (zatím bez využití). */
  camp: { x: number; y: number };
  /** Samopal na hrázi. */
  smg: { x: number; y: number };
  /** Parkování u přehrady. */
  damParking: { x: number; y: number };
  /** Školní hřiště. */
  hriste: { x: number; y: number };
  /** Kde stojí dealer trávy (Omyx), pokud v oblasti je. */
  dealer?: { x: number; y: number };
  /** Zastávka před hospodou: kde zastaví autobus (střed pruhu) a kudy jede (směr). */
  busStop?: { x: number; y: number; dx: number; dy: number };
  /** Kde stojí Slečna Kobyla (u zastávky). */
  kobyla?: { x: number; y: number };
  /** Kde stojí Vysoký Denny, když je u garáže. */
  denny?: { x: number; y: number };
  /** Parkoviště u eRka (dlaždice): srovnaná stání pro auta štamgastů a traktor s vlečkou. */
  pubParking?: { x: number; y: number; w: number; h: number };
}

export interface WorldMap {
  width: number;
  height: number;
  tiles: number[][];
  buildings: Building[];
  zones: Zone[];
  spawn: { x: number; y: number };
  /** Kde se hráč probudí po smrti (před zdravotním střediskem). */
  hospital: { x: number; y: number };
  /** Posun vlnění řeky a silnice (viz riverX). */
  phase: number;
  /** Osy silnic (pro kreslení a provoz). */
  roads: RoadLine[];
  /** Osy potoků a řek (kreslí se hladce, jezero zůstává po dlaždicích). */
  streams: StreamLine[];
  /** Trasy provozu v px (jezdí se vpravo). */
  traffic: Array<Array<{ x: number; y: number }>>;
  /** Výjezd na sever (další oblast) a na jih (předchozí oblast). */
  exits: { next: MapExit; prev: MapExit | null };
  spots: MapSpots;
  /** Autobusové zastávky (px, levý horní roh přístřešku). */
  busStops: Array<{ x: number; y: number }>;
  crosswalks: Crosswalk[];
  decor: Decor[];
}

/** Osa řeky: x souřadnice středu koryta v daném řádku. `phase` posouvá vlnění (jiná oblast = jiné údolí). */
export function riverX(y: number, phase = 0): number {
  return riverXOf(y, phase);
}
function riverXOf(y: number, phase: number): number {
  return Math.round(48 + 5 * Math.sin(y / 9 + phase) + 2 * Math.sin(y / 4 + phase * 1.7));
}
/** Hlavní silnice vede východně podél řeky. */
export function mainRoadX(y: number, phase = 0): number {
  return mainRoadXOf(y, phase);
}
function mainRoadXOf(y: number, phase: number): number {
  return riverXOf(y, phase) + 7;
}

export const DAM_Y = 66;
export const CROSS_ROAD_Y = 34;

/** Vygeneruje údolí: řeka, silnice, náves, škola, pila, přehrada, domy, lesy. */
export function buildArea(seed: number, phase: number): WorldMap {
  const rnd = createRng(seed);
  const riverX = (y: number) => riverXOf(y, phase);
  const mainRoadX = (y: number) => mainRoadXOf(y, phase);
  const t: number[][] = Array.from({ length: MAP_H }, () => Array<number>(MAP_W).fill(Tile.Grass));
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) t[y][x] = v;
  };
  const fill = (x: number, y: number, w: number, h: number, v: number) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, v);
  };

  // Lesy na západních a východních svazích.
  for (let y = 0; y < MAP_H; y++) {
    const westEdge = 14 + Math.round(3 * Math.sin(y / 7));
    const eastEdge = 100 + Math.round(3 * Math.cos(y / 6));
    for (let x = 0; x < MAP_W; x++) {
      if (x < westEdge || x > eastEdge) t[y][x] = rnd() < 0.38 ? Tile.Tree : Tile.ForestFloor;
    }
  }
  // Skalnaté kopce v rozích a okraj mapy (neprůchozí).
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const corner = Math.min(Math.hypot(x, MAP_H - y), Math.hypot(MAP_W - x, MAP_H - y));
      if (corner < 16 + rnd() * 3) t[y][x] = Tile.Rock;
      if (x === 0 || x === MAP_W - 1 || y === MAP_H - 1) t[y][x] = Tile.Rock;
    }
  }

  // Přehrada: nádrž na jihu, hráz na její severní straně.
  for (let y = DAM_Y + 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      const dx = (x - 58) / 34;
      const dy = (y - 80) / 13;
      if (dx * dx + dy * dy < 1) t[y][x] = Tile.Water;
    }
  }
  fill(30, DAM_Y, 58, 2, Tile.Dam);

  // Řeka teče od hráze na sever.
  for (let y = 0; y < DAM_Y; y++) {
    const rx = riverX(y);
    for (let x = rx - 1; x <= rx + 1; x++) set(x, y, Tile.Water);
  }

  // Hlavní silnice (sever → hráz) a příčná silnice přes most na náves.
  for (let y = 0; y < DAM_Y; y++) {
    const rx = mainRoadX(y);
    fill(rx, y, 2, 1, Tile.Road);
    if (y > 0) {
      // Napojení, když silnice uhne o víc než jednu dlaždici.
      const prev = mainRoadX(y - 1);
      for (let x = Math.min(prev, rx); x <= Math.max(prev, rx) + 1; x++) set(x, y, Tile.Road);
    }
  }
  for (let x = 16; x <= 99; x++) {
    const isRiver = Math.abs(x - riverX(CROSS_ROAD_Y)) <= 1 || Math.abs(x - riverX(CROSS_ROAD_Y + 1)) <= 1;
    fill(x, CROSS_ROAD_Y, 1, 2, isRiver ? Tile.Bridge : Tile.Road);
  }
  // Cesta na pilu a k přehradě po západním břehu.
  for (let y = CROSS_ROAD_Y + 2; y < DAM_Y; y++) fill(26, y, 2, 1, Tile.Road);

  // Chodníky podél silnic ve vesnici (ne v lese a ne přes pole u přehrady).
  for (let y = 1; y < DAM_Y - 1; y++) {
    for (let x = 16; x < 100; x++) {
      if (t[y][x] !== Tile.Grass) continue;
      const nearRoad = [t[y - 1][x], t[y + 1][x], t[y][x - 1], t[y][x + 1]].some((n) => n === Tile.Road);
      if (nearRoad) t[y][x] = Tile.Sidewalk;
    }
  }

  const buildings: Building[] = [];
  const building = (name: string, x: number, y: number, w: number, h: number, roof: number) => {
    fill(x, y, w, h, roof);
    buildings.push({ name, x, y, w, h, roof });
  };

  // Náves stojí východně od silnice; silnice se vlní, proto bereme její nejvýchodnější bod v okolí.
  let roadE = 0;
  for (let y = CROSS_ROAD_Y - 12; y <= CROSS_ROAD_Y + 14; y++) roadE = Math.max(roadE, mainRoadX(y) + 3);
  // Náves u křižovatky.
  building('Hospoda', roadE, CROSS_ROAD_Y - 8, 8, 6, Tile.RoofBrown);
  building('Obchod', roadE + 10, CROSS_ROAD_Y - 6, 6, 4, Tile.RoofRed);
  building('Obecní úřad', roadE, CROSS_ROAD_Y + 4, 7, 5, Tile.RoofGray);
  building('Kostel', roadE + 10, CROSS_ROAD_Y + 4, 5, 9, Tile.RoofGray);
  building('Zdravotní středisko', roadE + 18, CROSS_ROAD_Y + 4, 8, 5, Tile.RoofRed);
  // Škola s hřištěm.
  building('Škola', roadE + 22, CROSS_ROAD_Y - 10, 10, 7, Tile.RoofRed);
  fill(roadE + 22, CROSS_ROAD_Y - 3, 10, 2, Tile.Dirt);
  // Hasičská zbrojnice na západním břehu, před ní cvičiště na požární útok.
  fill(18, CROSS_ROAD_Y + 4, 14, 10, Tile.Dirt);
  building('Hasiči', 19, CROSS_ROAD_Y + 5, 7, 5, Tile.RoofRed);
  fill(28, CROSS_ROAD_Y + 6, 3, 1, Tile.Logs);

  // Garáž u silnice na sever (opravy, přelakování, prodej aut).
  let garageX = 0;
  for (let y = 8; y <= 16; y++) garageX = Math.max(garageX, mainRoadX(y) + 4);
  building('Garáž', garageX, 10, 6, 4, Tile.RoofGray);
  // Chata na mýtině v západním lese (úkryt: uložení hry, spánek).
  fill(15, 23, 7, 7, Tile.Dirt);
  building('Chata', 17, 24, 3, 3, Tile.RoofBrown);

  // Rodinné domy podél silnic.
  const houseSpots: Array<[number, number]> = [];
  for (let y = 2; y < DAM_Y - 5; y += 5) {
    houseSpots.push([mainRoadX(y) + 4, y]);
    houseSpots.push([mainRoadX(y) + 10, y + 1]);
    houseSpots.push([riverX(y) - 8, y]);
    houseSpots.push([riverX(y) - 15, y + 2]);
  }
  for (let x = 20; x < 98; x += 6) {
    houseSpots.push([x, CROSS_ROAD_Y - 5]);
    houseSpots.push([x, CROSS_ROAD_Y + 4]);
  }
  for (const [hx, hy] of houseSpots) {
    if (rnd() < 0.2) continue;
    const w = 3 + Math.floor(rnd() * 2);
    const h = 3;
    if (canPlace(t, hx, hy, w, h)) building('Dům', hx, hy, w, h, rnd() < 0.6 ? Tile.RoofRed : Tile.RoofGray);
  }

  const zones: Zone[] = [
    { name: 'Hospoda', x: roadE - 2, y: CROSS_ROAD_Y - 10, w: 12, h: 10 },
    { name: 'Škola', x: roadE + 20, y: CROSS_ROAD_Y - 12, w: 14, h: 12 },
    { name: 'Zdravotní středisko', x: roadE + 16, y: CROSS_ROAD_Y + 2, w: 12, h: 9 },
    { name: 'Garáž', x: garageX - 2, y: 8, w: 10, h: 8 },
    { name: 'Chata', x: 14, y: 22, w: 9, h: 9 },
    // Náves sahá přes silnici až ke křižovatce, kde hráč začíná.
    { name: 'Náves', x: Math.min(roadE - 6, mainRoadX(CROSS_ROAD_Y) - 2), y: CROSS_ROAD_Y - 10, w: 28 + Math.max(0, roadE - 6 - (mainRoadX(CROSS_ROAD_Y) - 2)), h: 24 },
    { name: 'Hasiči', x: 16, y: CROSS_ROAD_Y + 2, w: 18, h: 14 },
    { name: 'Přehrada Morávka', x: 0, y: DAM_Y - 2, w: MAP_W, h: MAP_H - DAM_Y + 2 },
    { name: 'Cesta na Raškovice', x: 0, y: 0, w: MAP_W, h: 8 },
    { name: 'Les', x: 0, y: 0, w: 18, h: MAP_H },
    { name: 'Les', x: 98, y: 0, w: MAP_W - 98, h: MAP_H },
  ];

  // Osy silnic a řeky pro kreslení (dlaždice výše zůstávají, jak byly).
  const mainPts: Pt[] = [[mainRoadX(0) + 1, 0]];
  for (let y = 0; y < DAM_Y; y++) mainPts.push([mainRoadX(y) + 1, y + 0.5]);
  const roads = [
    { kind: 'main' as const, width: 2, pts: mainPts },
    { kind: 'main' as const, width: 2, pts: [[16, CROSS_ROAD_Y + 1], [100, CROSS_ROAD_Y + 1]] as Pt[] },
    { kind: 'side' as const, width: 2, pts: [[27, CROSS_ROAD_Y + 2], [27, DAM_Y]] as Pt[] },
  ];
  const riverPts: Pt[] = [];
  for (let y = 0; y < DAM_Y; y++) riverPts.push([riverX(y) + 0.5, y + 0.5]);

  // Provoz: jezdí se vpravo. Na jih po západním pruhu hlavní silnice, na sever po východním,
  // na východ po jižním pruhu příčné silnice, na západ po severním.
  const px = (x: number, y: number) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
  const south: Array<{ x: number; y: number }> = [];
  for (let y = 1; y <= DAM_Y - 2; y += 2) south.push(px(mainRoadX(y), y));
  const north = [...south].reverse().map((p) => ({ x: p.x + TILE, y: p.y }));
  const east: Array<{ x: number; y: number }> = [];
  for (let x = 17; x <= 98; x += 2) east.push(px(x, CROSS_ROAD_Y + 1));
  const west = [...east].reverse().map((p) => ({ x: p.x, y: p.y - TILE }));

  const damZone = zones.find((z) => z.name === 'Přehrada Morávka')!;
  const school = buildings.find((b) => b.name === 'Škola')!;
  const northAt = { x: (mainRoadX(2) + 1) * TILE, y: 2 * TILE };
  const southAt = { x: (mainRoadX(DAM_Y - 3) + 1) * TILE, y: (DAM_Y - 3) * TILE };
  const busY = CROSS_ROAD_Y - 9;
  const busX = [mainRoadX(busY) + 2, mainRoadX(busY) - 1].find((x) => t[busY][x] === Tile.Sidewalk && t[busY + 1][x] === Tile.Sidewalk);

  return {
    width: MAP_W,
    height: MAP_H,
    tiles: t,
    buildings,
    zones,
    spawn: { x: mainRoadX(CROSS_ROAD_Y), y: CROSS_ROAD_Y },
    hospital: { x: roadE + 22, y: CROSS_ROAD_Y + 3 },
    phase,
    roads,
    streams: [{ width: 3, pts: riverPts }],
    traffic: [south, north, east, west],
    exits: {
      next: { at: northAt, arrive: { x: northAt.x, y: northAt.y + 5 * TILE } },
      prev: { at: southAt, arrive: { x: southAt.x, y: southAt.y - 5 * TILE } },
    },
    spots: {
      dam: { x: 60, y: damZone.y - 2 },
      camp: { x: 17, y: 18 },
      smg: { x: 34, y: damZone.y + 1 },
      damParking: { x: mainRoadX(DAM_Y - 3) + 4, y: DAM_Y - 3 },
      hriste: { x: school.x + 7, y: school.y + school.h + 1 },
    },
    busStops: busX === undefined ? [] : [{ x: busX * TILE + 3, y: busY * TILE + 2 }],
    crosswalks: [
      { road: 1, along: mainRoadX(CROSS_ROAD_Y) + 4.5 - 16 },
      { road: 0, along: CROSS_ROAD_Y - 3.5 },
    ],
    decor: [{ kind: 'court', x: school.x, y: school.y + school.h, w: school.w, h: 2 }],
  };
}

export function canPlace(t: number[][], x: number, y: number, w: number, h: number): boolean {
  for (let j = y - 1; j <= y + h; j++) {
    for (let i = x - 1; i <= x + w; i++) {
      if (t[j]?.[i] !== Tile.Grass) return false;
    }
  }
  return true;
}

/** Jméno místa, kde hráč stojí (první zóna v pořadí vyhrává, konkrétní místa jsou první). */
export function zoneAt(map: WorldMap, tx: number, ty: number): string {
  for (const z of map.zones) {
    if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z.name;
  }
  return 'Morávka';
}
