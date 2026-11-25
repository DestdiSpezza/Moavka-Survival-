import { createRng } from '../systems/rng';
import { Tile } from './tiles';

/**
 * Mapa první oblasti: Morávka v údolí řeky.
 * Sever = cesta na Raškovice, jih = přehrada Morávka, po stranách lesy a kopce.
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

export interface WorldMap {
  width: number;
  height: number;
  tiles: number[][];
  buildings: Building[];
  zones: Zone[];
  spawn: { x: number; y: number };
}

/** Osa řeky: x souřadnice středu koryta v daném řádku. */
export function riverX(y: number): number {
  return Math.round(48 + 5 * Math.sin(y / 9) + 2 * Math.sin(y / 4));
}
/** Hlavní silnice vede východně podél řeky. */
export function mainRoadX(y: number): number {
  return riverX(y) + 7;
}

export const DAM_Y = 66;
export const CROSS_ROAD_Y = 34;

export function buildMoravka(seed = 1234): WorldMap {
  const rnd = createRng(seed);
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
  // Škola s hřištěm.
  building('Škola', roadE + 22, CROSS_ROAD_Y - 10, 10, 7, Tile.RoofRed);
  fill(roadE + 22, CROSS_ROAD_Y - 3, 10, 2, Tile.Dirt);
  // Pila na západním břehu u lesa.
  fill(18, CROSS_ROAD_Y + 4, 14, 10, Tile.Dirt);
  building('Pila', 19, CROSS_ROAD_Y + 5, 7, 5, Tile.RoofBrown);
  fill(28, CROSS_ROAD_Y + 6, 3, 1, Tile.Logs);
  fill(28, CROSS_ROAD_Y + 9, 3, 1, Tile.Logs);
  fill(20, CROSS_ROAD_Y + 11, 5, 1, Tile.Logs);

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
    { name: 'Náves', x: roadE - 6, y: CROSS_ROAD_Y - 10, w: 28, h: 24 },
    { name: 'Pila', x: 16, y: CROSS_ROAD_Y + 2, w: 18, h: 14 },
    { name: 'Přehrada Morávka', x: 0, y: DAM_Y - 2, w: MAP_W, h: MAP_H - DAM_Y + 2 },
    { name: 'Cesta na Raškovice', x: 0, y: 0, w: MAP_W, h: 8 },
    { name: 'Les', x: 0, y: 0, w: 18, h: MAP_H },
    { name: 'Les', x: 98, y: 0, w: MAP_W - 98, h: MAP_H },
  ];

  return {
    width: MAP_W,
    height: MAP_H,
    tiles: t,
    buildings,
    zones,
    spawn: { x: mainRoadX(CROSS_ROAD_Y), y: CROSS_ROAD_Y },
  };
}

function canPlace(t: number[][], x: number, y: number, w: number, h: number): boolean {
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
