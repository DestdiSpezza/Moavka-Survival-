import { TILE } from '../config';
import { createRng } from '../systems/rng';
import { distToPolyline, joinPaths, offsetPath, pointAlong, polylineLength, type Pt, resample, reversed } from './geom';
import type { Building, Crosswalk, Decor, RoadLine, StreamLine, WorldMap, Zone } from './moravka';
import { MAP_H, MAP_W } from './moravka';
import { Tile } from './tiles';

/**
 * Morávka podle skutečné mapy obce (ne na sto procent, ale poznáš ji):
 * křižovatka u hospody eRko, silnice na severozápad, na Raškovice (severovýchod),
 * na jihozápad a na jih ke škole a přehradě. Vlaský potok na západě, řeka Morávka
 * na severovýchodě a východě, podél ní silnice s cyklostezkou až k hrázi.
 *
 * Souřadnice jsou v dlaždicích (16 px) a vycházejí z mapy obce v měřítku 16 px mapy na dlaždici.
 */

// ---------- Silnice (osy) ----------

/** Křižovatka u hospody: střed vesnice. */
const CROSS: Pt = [34, 21.5];
/** Odbočka silnice podél řeky ze silnice na Raškovice. */
const RIVER_JUNCTION: Pt = [68, 7.6];

const NW: Pt[] = [[9.5, 0], [18, 7.5], CROSS];
const NE_A: Pt[] = [CROSS, [43.8, 18.1], [53, 14.4], [62, 10.6], RIVER_JUNCTION];
const NE_B: Pt[] = [RIVER_JUNCTION, [72, 3.4], [74.5, 0]];
const SOUTH: Pt[] = [CROSS, [37, 24], [43.8, 37], [51.2, 53], [55.2, 62], [56.8, 66.4], [59.5, 69.5]];
const SW: Pt[] = [CROSS, [27, 25.6], [20.6, 29.7], [17, 35], [15, 39.4], [12.5, 45], [11, 51.2], [8, 56], [4, 62], [1, 65.5]];
const CREST: Pt[] = [[59.5, 69.5], [107.5, 69.5]];
const RIVER_ROAD: Pt[] = [RIVER_JUNCTION, [75, 11.5], [81, 15.5], [88, 19.5], [94, 23], [99, 28.5], [102.5, 36], [104.5, 46], [105.5, 55], [106.5, 62], [107.5, 66], [107.5, 69.5]];

const ROADS: RoadLine[] = [
  { kind: 'main', width: 2.6, pts: NW },
  { kind: 'main', width: 2.6, pts: joinPaths(NE_A, NE_B) },
  { kind: 'main', width: 2.6, pts: SOUTH },
  { kind: 'main', width: 2.6, pts: SW },
  { kind: 'main', width: 2.4, pts: CREST },
  { kind: 'main', width: 2.4, pts: RIVER_ROAD },
  // Slepé ulice s domky jihozápadně od křižovatky.
  { kind: 'side', width: 2, pts: [[15, 39.4], [24, 43.5], [31.5, 47]] },
  { kind: 'side', width: 2, pts: [[11, 51.2], [20, 55.2], [27.5, 58.6]] },
  // Odbočka k domům u silnice na Raškovice.
  { kind: 'side', width: 2, pts: [[65, 9.1], [66.5, 14], [67.8, 18.5]] },
  // Příjezd ke škole.
  { kind: 'side', width: 2, pts: [[51.2, 53], [55, 51], [59, 49.4], [62, 52], [62.5, 54.3]] },
  // Krátká ulice u Školky na jih.
  { kind: 'side', width: 2, pts: [[55.2, 62], [48, 64.4], [42, 65.6]] },
  // Polní cesty.
  { kind: 'track', width: 1.4, pts: [[52.5, 14.8], [45, 10.6], [35, 7.6], [26, 5.2]] },
  { kind: 'track', width: 1.4, pts: [[67.8, 18.5], [61, 25], [52, 30.5], [44, 36.6]] },
  { kind: 'track', width: 1.4, pts: [[12.3, 2.5], [9.5, 6], [8, 9]] },
];

const STREAMS: StreamLine[] = [
  // Vlaský potok
  { width: 1.6, pts: [[23, 0], [20.6, 3.8], [18, 8.1], [14.7, 15], [12.5, 20.6], [10.3, 26], [7.5, 35], [5, 42.5], [2.5, 49.4], [0.5, 54]] },
  // Řeka Morávka: od hráze na sever, pak na severozápad k Raškovicím
  { width: 3, pts: [[82, 0], [86, 4.5], [93, 10], [100, 15.5], [106, 22], [110.5, 29], [113.5, 37], [115.5, 47], [116, 57], [115.5, 65], [115, 71.6]] },
];

/** Hráz: zeď v řádku DAM_ROW, pod ní nádrž. Po koruně vede silnice. */
const DAM_ROW = 71;
const LAKE = { cx: 86, top: 72, rx: 33, ry: 16 };

/** Kde jsou chodníky: vesnice, ne pole, les a hráz. */
const VILLAGE: Array<[number, number, number, number]> = [
  [12, 6, 71, 67],
  [96, 40, 113, 66],
];

// ---------- Budovy ----------

/** Pojmenované budovy: [jméno, x, y, šířka, výška, střecha]. */
const NAMED: Array<[string, number, number, number, number, number]> = [
  ['Hospoda', 20, 18, 7, 5, Tile.RoofBrown],
  ['Obchod', 26, 29, 6, 4, Tile.RoofRed],
  ['Obecní úřad', 30, 34, 7, 4, Tile.RoofGray],
  ['Vesta', 33, 40, 5, 3, Tile.RoofRed],
  ['Zdravotní středisko', 44, 27, 7, 4, Tile.RoofRed],
  ['Hasiči', 40, 11, 6, 4, Tile.RoofRed],
  ['Kostel', 69, 21, 5, 8, Tile.RoofGray],
  ['Školka', 43, 54, 5, 3, Tile.RoofRed],
  ['Škola', 58, 57, 9, 5, Tile.RoofRed],
  ['Tělocvična', 68, 59, 5, 6, Tile.RoofGray],
  ['Pila', 3, 8, 7, 5, Tile.RoofBrown],
  ['Garáž', 11, 29, 5, 4, Tile.RoofGray],
  ['Chata', 109, 56, 3, 3, Tile.RoofBrown],
];

/** Kde stojí dealer Omyx (u řeky, mezi silnicí na sever a cyklostezkou). */
const OMYX: Pt = [80, 9];

/** Středy rodinných domů podle mapy obce; kam se nevejdou, tam nebudou. */
const HOUSES: Pt[] = [
  // Sever: mezi potokem, silnicí na severozápad a na Raškovice
  [25.6, 8.8], [35, 6], [33, 2.5], [45.6, 4.7], [49, 8], [54, 9.5], [63, 5.6], [58, 6], [40, 6.5], [29, 11.5], [26, 13.5],
  [33.8, 16.8], [37.5, 15.5], [47.5, 12.2], [52, 11], [57, 9], [68, 3], [61, 14.5],
  // Jižně od silnice na Raškovice
  [45, 23.8], [49, 22], [53, 20.6], [47.5, 27.2], [56, 25.3], [63.8, 20], [60, 17], [64, 25.5], [58, 21], [62, 29],
  // Mezi silnicí na jihozápad a na jih
  [26.9, 31.1], [25.9, 40.5], [31, 42.5], [41, 46], [44, 51.4], [38.4, 63.1], [40, 42], [29, 37], [35, 47], [36, 52], [40, 57], [33, 59],
  // Východně od silnice na jih
  [49.5, 42.8], [53, 47.6], [47, 38], [55, 40],
  // Ulice na jihozápadě
  [12, 37.8], [16.8, 43.4], [20.6, 45], [25.3, 46.9], [28.4, 48.1], [14, 47.5], [18.4, 50.6], [22.2, 53.75], [26.6, 55.3],
  [15.6, 58.75], [23.4, 59.7], [21.6, 64.7], [30.5, 62], [31, 52], [17, 62],
  // Západně od křižovatky
  [17, 25], [21, 12], [25, 26], [21, 33],
  // Jihovýchod u řeky (safe house)
  [100, 45], [100, 50], [101, 56], [102, 61], [109.5, 46.5], [109.5, 51], [110, 62], [96, 40], [104, 41], [97, 34], [109, 41],
  // Podél silnice u řeky
  [85, 22], [91, 26], [79, 18], [96, 30],
];

/** Mapa Morávky. Pokaždé stejná (semínko 1234 jen pro les a velikost domů). */
export function buildMoravka(): WorldMap {
  const rnd = createRng(1234);
  const W = MAP_W;
  const H = MAP_H;
  const t: number[][] = Array.from({ length: H }, () => Array<number>(W).fill(Tile.Grass));
  /** Místa, kam se nestaví domy (dvory, hřiště, tábor…). */
  const reserved: boolean[][] = Array.from({ length: H }, () => Array<boolean>(W).fill(false));
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = v;
  };
  const fill = (x: number, y: number, w: number, h: number, v: number) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, v);
  };
  const reserve = (x: number, y: number, w: number, h: number) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (reserved[j]?.[i] !== undefined) reserved[j][i] = true;
  };
  const forest = (x: number, y: number, density: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = rnd() < density ? Tile.Tree : Tile.ForestFloor;
  };
  const vlasky = STREAMS[0].pts;
  const moravka = STREAMS[1].pts;

  // ---------- Terén: lesy a skály ----------
  for (let y = 0; y < H; y++) {
    const westOfStream = xAtY(vlasky, y);
    const eastOfRiver = xAtY(moravka, y);
    for (let x = 0; x < W; x++) {
      // Les za Vlaským potokem (kromě pily) a za řekou.
      const pila = x <= 14 && y >= 3 && y <= 18;
      if (westOfStream !== null && x < westOfStream - 2.5 && !pila && y < 62) forest(x, y, 0.36);
      if (eastOfRiver !== null && x > eastOfRiver + 2.5 && y < DAM_ROW) forest(x, y, 0.4);
      // Lesík nad řekou u silnice na Raškovice.
      if (x >= 76 && y < 6 && eastOfRiver !== null && x < eastOfRiver - 2) forest(x, y, 0.32);
      // Zelený pás jižně od cyklostezky.
      if (x >= 74 && x <= 81 && y >= 19 && y <= 36) forest(x, y, 0.22);
      // Lesy na jihozápadě a kolem nádrže.
      if (y >= 66 && x < 52) forest(x, y, 0.4);
      if (y >= DAM_ROW && (x < 50 || x > 116)) forest(x, y, 0.4);
      // Skalnaté rohy na jihu a okraj mapy.
      const corner = Math.min(Math.hypot(x, H - y), Math.hypot(W - x, H - y));
      if (corner < 13 + rnd() * 3) t[y][x] = Tile.Rock;
      if (x === 0 || x === W - 1 || y === H - 1) t[y][x] = Tile.Rock;
    }
  }

  // ---------- Přehrada ----------
  for (let y = LAKE.top; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const dx = (x + 0.5 - LAKE.cx) / LAKE.rx;
      const dy = (y + 0.5 - LAKE.top) / LAKE.ry;
      if (dx * dx + dy * dy < 1) t[y][x] = Tile.Water;
    }
  }
  fill(53, DAM_ROW, W - 54, 1, Tile.Dam);

  // ---------- Potoky, silnice, chodníky ----------
  rasterize(W, H, STREAMS, (x, y) => set(x, y, Tile.Water));
  for (const road of ROADS) {
    const hw = road.width / 2;
    // Polní cesty jsou jen namalované (po trávě se chodí i jezdí stejně).
    if (road.kind === 'track') continue;
    forTilesNear(W, H, road.pts, hw + 0.15, (x, y) => set(x, y, t[y][x] === Tile.Water || t[y][x] === Tile.Bridge ? Tile.Bridge : Tile.Road));
  }
  // Křižovatka: větší vydlážděná plocha, ať se auta vejdou do zatáčky.
  forTilesNear(W, H, [CROSS, CROSS], 2.2, (x, y) => set(x, y, Tile.Road));
  for (const road of ROADS) {
    if (road.kind === 'track') continue;
    forTilesNear(W, H, road.pts, road.width / 2 + 1.05, (x, y) => {
      if (t[y][x] === Tile.Grass && inVillage(x, y)) set(x, y, Tile.Sidewalk);
    });
  }

  // ---------- Hřiště, dvory, parkoviště ----------
  const decor: Decor[] = [
    { kind: 'oval', x: 74.5, y: 50, rx: 6.5, ry: 8.5 },
    { kind: 'playground', x: 42, y: 58, w: 6, h: 3 },
    { kind: 'parking', x: 37, y: 34, w: 3, h: 4 },
    // Parkoviště u eRka (vlevo od hospody, mezi potokem a hospodou).
    { kind: 'parking', x: 14, y: 18, w: 6, h: 5 },
    { kind: 'court', x: 58, y: 63, w: 9, h: 3 },
  ];
  for (const d of decor) {
    if (d.kind === 'oval') {
      for (let y = Math.floor(d.y - d.ry - 1); y <= d.y + d.ry + 1; y++) {
        for (let x = Math.floor(d.x - d.rx - 1); x <= d.x + d.rx + 1; x++) {
          const r = Math.hypot((x + 0.5 - d.x) / d.rx, (y + 0.5 - d.y) / d.ry);
          if (r < 1.12) {
            reserved[y][x] = true;
            set(x, y, Tile.Grass);
          }
        }
      }
    } else {
      fill(d.x, d.y, d.w, d.h, d.kind === 'parking' ? Tile.Dirt : Tile.Grass);
      reserve(d.x - 1, d.y - 1, d.w + 2, d.h + 2);
    }
  }
  // Dvůr pily s klády, dvůr autoúprav, mýtina v lese.
  fill(1, 5, 13, 12, Tile.Dirt);
  reserve(0, 4, 15, 14);
  fill(10, 33, 6, 3, Tile.Dirt);
  reserve(9, 28, 9, 9);
  const camp = { x: 4, y: 28 };
  for (let y = camp.y - 3; y <= camp.y + 3; y++) for (let x = camp.x - 3; x <= camp.x + 3; x++) if (Math.hypot(x - camp.x, y - camp.y) < 3.2 && t[y][x] !== Tile.Water) set(x, y, Tile.ForestFloor);
  reserve(camp.x - 4, camp.y - 4, 9, 9);

  // ---------- Budovy ----------
  const buildings: Building[] = [];
  const building = (name: string, x: number, y: number, w: number, h: number, roof: number) => {
    fill(x, y, w, h, roof);
    // Kolem veřejných budov zůstane volno (dvůr, parkování), mezi domky stačí ulička.
    const m = name === 'Dům' ? 0 : 2;
    reserve(x - m, y - m, w + 2 * m, h + 2 * m);
    buildings.push({ name, x, y, w, h, roof });
  };
  for (const [name, x, y, w, h, roof] of NAMED) building(name, x, y, w, h, roof);
  fill(11, 5, 1, 3, Tile.Logs);
  fill(1, 15, 5, 1, Tile.Logs);
  fill(7, 15, 5, 1, Tile.Logs);
  fill(11, 10, 2, 1, Tile.Logs);

  // Domy podle mapy obce, pak řady domů podél ulic ve vesnici (s předzahrádkou).
  const candidates: Pt[] = [...HOUSES];
  for (const road of ROADS) {
    if (road.kind === 'track' || road === ROADS[4]) continue;
    const len = polylineLength(road.pts);
    for (let d = 3; d < len - 2; d += 4) {
      const p = pointAlong(road.pts, d);
      for (const side of [1, -1]) {
        const off = road.width / 2 + 3.4;
        const cx = p.x - p.dy * off * side;
        const cy = p.y + p.dx * off * side;
        if (inVillage(Math.floor(cx), Math.floor(cy))) candidates.push([cx, cy]);
      }
    }
  }
  const NUDGE: Array<[number, number]> = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
  for (const [cx, cy] of candidates) {
    const w = 3 + Math.floor(rnd() * 2);
    const h = 3;
    const spot = NUDGE.map(([dx, dy]) => [Math.round(cx - w / 2) + dx, Math.round(cy - h / 2) + dy]).find(([x, y]) => canPlaceHouse(t, reserved, x, y, w, h));
    if (spot) building('Dům', spot[0], spot[1], w, h, rnd() < 0.62 ? Tile.RoofRed : Tile.RoofGray);
  }

  // Stromy na zahradách a mezi poli (ne u silnic a domů).
  for (let y = 2; y < DAM_ROW - 1; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (t[y][x] !== Tile.Grass || reserved[y][x]) continue;
      let open = true;
      for (let j = -1; j <= 1 && open; j++) for (let i = -1; i <= 1; i++) if (t[y + j][x + i] !== Tile.Grass && t[y + j][x + i] !== Tile.ForestFloor && t[y + j][x + i] !== Tile.Tree) open = false;
      if (open && rnd() < (inVillage(x, y) ? 0.035 : 0.05)) t[y][x] = Tile.Tree;
    }
  }

  // ---------- Zóny ----------
  const zones: Zone[] = [
    { name: 'Cesta na Raškovice', x: 5, y: 0, w: 14, h: 4 },
    { name: 'Hospoda', x: 16, y: 15, w: 14, h: 11 },
    { name: 'Škola', x: 52, y: 40, w: 32, h: 26 },
    { name: 'Školka', x: 42, y: 52, w: 10, h: 9 },
    { name: 'Zdravotní středisko', x: 42, y: 25, w: 11, h: 9 },
    { name: 'Garáž', x: 8, y: 27, w: 11, h: 10 },
    { name: 'Chata', x: 105, y: 53, w: 9, h: 9 },
    { name: 'Hasiči', x: 38, y: 9, w: 10, h: 8 },
    { name: 'Omyx', x: 75, y: 5, w: 9, h: 7 },
    { name: 'Kostel', x: 67, y: 19, w: 9, h: 12 },
    { name: 'Náves', x: 26, y: 14, w: 22, h: 31 },
    { name: 'Pila', x: 0, y: 3, w: 15, h: 16 },
    { name: 'Přehrada Morávka', x: 0, y: 67, w: W, h: H - 67 },

    { name: 'Les', x: 0, y: 18, w: 7, h: 49 },
    { name: 'Les', x: 112, y: 0, w: W - 112, h: 67 },
  ];

  // ---------- Provoz ----------
  // První trasa vede od Raškovic (levý horní roh): křižovatka → na jih → po hrázi → podél řeky → na sever.
  const loop = joinPaths(NW, SOUTH, CREST, reversed(RIVER_ROAD), NE_B);
  const westSouth = joinPaths(NW, SW);
  const westNorth = joinPaths(NW, NE_A, NE_B);
  const southLoop = joinPaths(reversed(SW), SOUTH, CREST, reversed(RIVER_ROAD), NE_B);
  // Pruh vpravo; body u okraje mapy (kde trasa začíná a končí) se oříznou.
  const inside = ([x, y]: Pt) => x > 1.4 && y > 0.8 && x < W - 1.4 && y < H - 1.4;
  const lane = (pts: Pt[]) => offsetPath(resample(pts, 1.5), 0.62).filter(inside).map(([x, y]) => ({ x: x * TILE, y: y * TILE }));
  const traffic = [loop, reversed(loop), westSouth, reversed(westSouth), westNorth, reversed(westNorth), southLoop, reversed(southLoop)].map(lane);

  // ---------- Výjezd, místa, zastávky, přechody ----------
  // Výjezd na Raškovice: silnice na severozápad v levém horním rohu.
  const exitAt = pointAlong(NW, 2);
  const exitArrive = pointAlong(NW, 8);
  const crosswalks: Crosswalk[] = [
    { road: 0, along: polylineLength(NW) - 4.2 },
    { road: 1, along: 4.2 },
    { road: 2, along: 4.2 },
    { road: 3, along: 4.2 },
    { road: 2, along: 15.2 },
    { road: 2, along: 31 },
  ];

  // Zastávka před eRkem: bod na silnici na jihozápad nejblíž dveřím hospody, autobus stojí v pravém pruhu.
  const pub = buildings.find((b) => b.name === 'Hospoda')!;
  const door: Pt = [pub.x + pub.w / 2, pub.y + pub.h];
  let best = { d: Infinity, along: 0 };
  for (let s = 0; s < polylineLength(SW); s += 0.1) {
    const q = pointAlong(SW, s);
    const d = Math.hypot(q.x - door[0], q.y - door[1]);
    if (d < best.d) best = { d, along: s };
  }
  const stop = pointAlong(SW, best.along);
  // Vpravo ve směru jízdy (osa y dolů): (-dy, dx).
  const rx = -stop.dy;
  const ry = stop.dx;
  const busStop = { x: stop.x + rx * 0.62, y: stop.y + ry * 0.62, dx: stop.dx, dy: stop.dy };
  const shelter = { x: stop.x + rx * 2.1 + stop.dx * 1.4, y: stop.y + ry * 2.1 + stop.dy * 1.4 };
  const kobyla = { x: stop.x + rx * 2.4 - stop.dx * 1.2, y: stop.y + ry * 2.4 - stop.dy * 1.2 };
  const garage = buildings.find((b) => b.name === 'Garáž')!;

  return {
    width: W,
    height: H,
    tiles: t,
    buildings,
    zones,
    spawn: { x: Math.floor(CROSS[0]), y: Math.floor(CROSS[1]) },
    hospital: { x: 47, y: 31 },
    phase: 0,
    roads: ROADS,
    streams: STREAMS,
    traffic,
    exits: {
      next: { at: { x: exitAt.x * TILE, y: exitAt.y * TILE }, arrive: { x: exitArrive.x * TILE, y: exitArrive.y * TILE } },
      prev: null,
    },
    spots: {
      dam: { x: 84, y: 67 },
      camp,
      smg: { x: 60, y: DAM_ROW },
      damParking: { x: 64, y: 67 },
      hriste: { x: 74, y: 50 },
      dealer: { x: OMYX[0], y: OMYX[1] },
      busStop,
      kobyla,
      denny: { x: garage.x + garage.w / 2 + 2, y: garage.y + garage.h + 1 },
      pubParking: { x: 14, y: 18, w: 6, h: 5 },
    },
    busStops: [
      { x: 40 * TILE + 3, y: 34 * TILE + 2 },
      { x: 45 * TILE + 3, y: 37 * TILE + 2 },
      { x: Math.round(shelter.x * TILE) - 5, y: Math.round(shelter.y * TILE) - 12 },
    ],
    crosswalks,
    decor,
  };
}

/** Je dlaždice ve vesnici (chodníky, lampy)? */
function inVillage(x: number, y: number): boolean {
  return VILLAGE.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
}

/** Dům stojí na trávě; kolem něj je tráva nebo chodník (ne silnice, potok, jiný dům ani dvůr). */
function canPlaceHouse(t: number[][], reserved: boolean[][], x: number, y: number, w: number, h: number): boolean {
  for (let j = y - 1; j <= y + h; j++) {
    for (let i = x - 1; i <= x + w; i++) {
      const inside = i >= x && i < x + w && j >= y && j < y + h;
      const tile = t[j]?.[i];
      if (reserved[j]?.[i] !== false) return false;
      if (inside ? tile !== Tile.Grass : tile !== Tile.Grass && tile !== Tile.Sidewalk) return false;
    }
  }
  return true;
}

/** x osy čáry v daném řádku (pro čáry, které vedou shora dolů), nebo null. */
function xAtY(pts: readonly Pt[], y: number): number | null {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if ((y >= ay && y <= by) || (y >= by && y <= ay)) {
      const k = by === ay ? 0 : (y - ay) / (by - ay);
      return ax + (bx - ax) * k;
    }
  }
  return null;
}

/** Projde dlaždice, jejichž střed je od osy blíž než `r`. */
function forTilesNear(W: number, H: number, pts: readonly Pt[], r: number, fn: (x: number, y: number) => void): void {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.max(0, Math.floor(y0 - r - 1)); y <= Math.min(H - 1, Math.ceil(y1 + r + 1)); y++) {
    for (let x = Math.max(0, Math.floor(x0 - r - 1)); x <= Math.min(W - 1, Math.ceil(x1 + r + 1)); x++) {
      if (distToPolyline(x + 0.5, y + 0.5, pts) < r) fn(x, y);
    }
  }
}

function rasterize(W: number, H: number, streams: readonly StreamLine[], fn: (x: number, y: number) => void): void {
  for (const s of streams) forTilesNear(W, H, s.pts, s.width / 2, fn);
}
