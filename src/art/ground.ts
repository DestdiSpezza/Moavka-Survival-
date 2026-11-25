import { TILE } from '../config';
import { createRng } from '../systems/rng';
import { type Building, CROSS_ROAD_Y, DAM_Y, mainRoadX, type WorldMap } from '../world/moravka';
import { Tile } from '../world/tiles';
import { type Color, hash2, mix, PAL, Painter, shade } from './painter';

/**
 * Statická malba celé mapy shora (styl GTA 2): terén s variacemi, asfalt s
 * prasklinami a pruhy, chodníky z dlaždic s obrubníky, břehy s pěnou, mosty,
 * stíny budov, střechy podle typu budovy, koruny stromů a keře.
 * Voda zůstane průhledná, aby pod ní byla vidět animovaná vrstva dlaždic.
 */
export function paintGround(map: WorldMap, seed: number): { ground: HTMLCanvasElement; lights: HTMLCanvasElement; chimneys: Array<{ x: number; y: number }> } {
  const W = map.width * TILE;
  const H = map.height * TILE;
  const p = new Painter(W, H, createRng(seed * 7 + 3));
  const t = map.tiles;
  const at = (x: number, y: number) => t[y]?.[x] ?? Tile.Rock;
  windows = [];
  chimneys = [];

  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) paintTile(p, at(tx, ty), tx, ty, at, seed);
  }
  paintEdges(p, map, at);
  paintMarkings(p, map, at);
  paintPlayground(p, map);
  paintBushes(p, at, seed);
  paintGardens(p, map, at, seed);
  paintShores(p, map, at, seed);
  paintForestDetails(p, map, at, seed);
  paintBusStop(p, map, at);

  // Stíny budov a stromů nejdřív, ať se nekreslí přes střechy a koruny.
  for (const b of map.buildings) {
    const x = b.x * TILE;
    const y = b.y * TILE;
    p.rect(x + b.w * TILE, y + 6, 6, b.h * TILE, PAL.shadow, 0.32);
    p.rect(x + 6, y + b.h * TILE, b.w * TILE, 6, PAL.shadow, 0.32);
  }
  const trees: Array<[number, number]> = [];
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) if (at(tx, ty) === Tile.Tree) trees.push([tx, ty]);
  for (const [tx, ty] of trees) p.ellipse(tx * TILE + 11, ty * TILE + 12, 9, 7, PAL.shadow, 0.28);

  for (const b of map.buildings) paintBuilding(p, b, seed);
  const lamps = lampPositions(map, at);
  for (const l of lamps) paintLamp(p, l);
  for (const [tx, ty] of trees) paintTree(p, tx, ty, seed);

  return { ground: p.toCanvas(), lights: paintNightLights(W, H, lamps), chimneys };
}

// ---------- Noční světla ----------

/** Okna zapsaná při kreslení průčelí (pro noční vrstvu). */
let windows: Array<{ x: number; y: number; w: number; h: number }> = [];
/** Komíny (odtud stoupá kouř). */
let chimneys: Array<{ x: number; y: number }> = [];

interface Lamp {
  /** Pata sloupu */
  x: number;
  y: number;
  /** Kam svítí (bod nad silnicí) */
  lx: number;
  ly: number;
}

/** Lampy na chodnících podél silnice, zhruba po šesti dlaždicích. */
function lampPositions(map: WorldMap, at: (x: number, y: number) => number): Lamp[] {
  const out: Lamp[] = [];
  for (let ty = 1; ty < map.height - 1; ty++) {
    for (let tx = 1; tx < map.width - 1; tx++) {
      if (at(tx, ty) !== Tile.Sidewalk || (tx * 3 + ty * 5) % 7 !== 0) continue;
      const dirs: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const road = dirs.find(([dx, dy]) => at(tx + dx, ty + dy) === Tile.Road);
      if (!road) continue;
      const x = tx * TILE + 8 - road[0] * 5;
      const y = ty * TILE + 8 - road[1] * 5;
      out.push({ x, y, lx: x + road[0] * 9, ly: y + road[1] * 9 });
    }
  }
  return out;
}

function paintLamp(p: Painter, l: Lamp): void {
  p.ellipse(l.x + 1, l.y + 1, 2, 2, PAL.shadow, 0.35);
  p.ellipse(l.x, l.y, 1, 1, 0x2a2a2e);
  p.line(l.x, l.y, l.lx, l.ly, 0x3a3a40);
  p.rect(l.lx - 1, l.ly - 1, 3, 3, 0x5a5a60);
  p.px(l.lx, l.ly, 0xe8e0b0);
}

/** Vrstva světel na noc (aditivně přes tmu): kužely lamp a rozsvícená okna. */
function paintNightLights(W: number, H: number, lamps: Lamp[]): HTMLCanvasElement {
  const p = new Painter(W, H, createRng(99));
  for (const l of lamps) {
    for (const [r, a] of [[26, 0.05], [19, 0.07], [12, 0.1], [6, 0.16]] as const) p.ellipse(l.lx, l.ly, r, r * 0.8, 0xffd890, a);
    p.px(l.lx, l.ly, 0xffffff);
  }
  for (const w of windows) {
    if (hash2(w.x, w.y, 3) < 0.35) continue; // někde už spí
    p.rect(w.x - 2, w.y - 2, w.w + 4, w.h + 4, 0xffb850, 0.18);
    p.rect(w.x, w.y, w.w, w.h, 0xffd070, 0.85);
  }
  return p.toCanvas();
}

// ---------- Dlaždice ----------

function paintTile(p: Painter, tile: number, tx: number, ty: number, at: (x: number, y: number) => number, seed: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  const h = hash2(tx, ty, seed);
  switch (tile) {
    case Tile.Grass:
      grass(p, x, y, h, seed);
      break;
    case Tile.Dirt:
      p.rect(x, y, TILE, TILE, PAL.dirt[0]);
      mottle(p, tx, ty, seed, 0x5a4430, 0xb09068);
      p.noise(x, y, TILE, TILE, PAL.dirt, 0.45);
      if (h < 0.4) {
        // Kamínky
        const kx = x + Math.floor(h * 37) % 14;
        const ky = y + Math.floor(h * 91) % 14;
        p.px(kx, ky, 0xb0a89a);
        p.px(kx + 1, ky + 1, 0x5a4a32);
      }
      break;
    case Tile.ForestFloor:
    case Tile.Tree:
      p.rect(x, y, TILE, TILE, PAL.forest[0]);
      p.noise(x, y, TILE, TILE, PAL.forest, 0.6);
      // Jehličí a listí
      for (let i = 0; i < 4; i++) {
        const lx = x + Math.floor(p.rnd() * 14);
        const ly = y + Math.floor(p.rnd() * 15);
        p.rect(lx, ly, 2, 1, p.rnd() < 0.5 ? 0x5a4428 : 0x3f6a30);
      }
      break;
    case Tile.Rock:
      p.rect(x, y, TILE, TILE, PAL.rock[0]);
      p.noise(x, y, TILE, TILE, PAL.rock, 0.5);
      if (h < 0.5) p.line(x + 2, y + Math.floor(h * 20) % 12 + 2, x + 9, y + Math.floor(h * 33) % 12 + 3, 0x4e4a44);
      p.rect(x + 3, y + 3, 3, 1, 0x9a968e);
      break;
    case Tile.Road:
      asphalt(p, x, y, h);
      break;
    case Tile.Sidewalk:
      pavement(p, x, y, tx, ty, seed);
      break;
    case Tile.Bridge: {
      // Prkna napříč směrem jízdy (most vede východ–západ).
      for (let i = 0; i < TILE; i += 3) {
        const c = PAL.plank[(tx * 5 + i) % PAL.plank.length];
        p.rect(x + i, y, 2, TILE, c);
        p.rect(x + i + 2, y, 1, TILE, 0x3e2a18);
      }
      p.noise(x, y, TILE, TILE, [0x5a3f26, 0x8a6a46], 0.12);
      // Zábradlí, kde je pod mostem voda.
      if (at(tx, ty - 1) === Tile.Water) rail(p, x, y, true);
      if (at(tx, ty + 1) === Tile.Water) rail(p, x, y + TILE - 3, true);
      break;
    }
    case Tile.Dam:
      p.rect(x, y, TILE, TILE, PAL.concrete[0]);
      p.noise(x, y, TILE, TILE, PAL.concrete, 0.35);
      p.rect(x + TILE - 1, y, 1, TILE, 0x7e7a72);
      if (at(tx, ty + 1) === Tile.Water) {
        p.rect(x, y + TILE - 3, TILE, 1, 0x5e5a54);
        p.rect(x, y + TILE - 2, TILE, 2, 0x8e8a82);
        for (let i = 2; i < TILE; i += 5) p.rect(x + i, y + TILE - 5, 1, 3, 0x3a3834);
      }
      break;
    case Tile.Logs:
      p.rect(x, y, TILE, TILE, PAL.dirt[1]);
      p.noise(x, y, TILE, TILE, PAL.dirt, 0.4);
      for (let i = 0; i < 3; i++) {
        const ly = y + 1 + i * 5;
        p.rect(x, ly, TILE, 4, 0x5e4026);
        p.rect(x, ly, TILE, 1, 0x7a5636);
        p.rect(x, ly + 3, TILE, 1, 0x3e2a18);
        // Čela kmenů s letokruhy
        p.ellipse(x + 2 + (i % 2) * 7, ly + 2, 2, 2, 0xc89a62);
        p.px(x + 2 + (i % 2) * 7, ly + 2, 0x8a6236);
      }
      break;
    case Tile.Water:
      p.clear(x, y, TILE, TILE);
      break;
    default:
      // Zdi a střechy pokryje kreslení budov.
      p.rect(x, y, TILE, TILE, 0x5a5048);
  }
}

/** Skvrny 4×4 px s nízkou frekvencí: rozbijí opakování dlaždic. */
function mottle(p: Painter, tx: number, ty: number, seed: number, dark: Color, light: Color): void {
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const v = hash2(tx * 4 + i, ty * 4 + j, seed + 3) * 0.5 + hash2(Math.floor((tx * 4 + i) / 3), Math.floor((ty * 4 + j) / 3), seed + 4) * 0.5;
      if (v < 0.3) p.rect(tx * TILE + i * 4, ty * TILE + j * 4, 4, 4, dark, 0.22);
      else if (v > 0.75) p.rect(tx * TILE + i * 4, ty * TILE + j * 4, 4, 4, light, 0.16);
    }
  }
}

function grass(p: Painter, x: number, y: number, h: number, seed: number): void {
  p.rect(x, y, TILE, TILE, PAL.grass[0]);
  mottle(p, x / TILE, y / TILE, seed + 1, 0x355a26, 0x6a9c48);
  p.noise(x, y, TILE, TILE, PAL.grass, 0.42);
  // Trsy trávy: tmavá stopka a světlá špička.
  for (let i = 0; i < 3; i++) {
    const gx = x + 1 + Math.floor(p.rnd() * 13);
    const gy = y + 2 + Math.floor(p.rnd() * 12);
    p.px(gx, gy, PAL.grassDark);
    p.px(gx - 1, gy - 1, 0x6a9c48);
    p.px(gx + 1, gy - 1, 0x6a9c48);
  }
  if (h > 0.93) {
    const c = PAL.flower[Math.floor(h * 1000) % PAL.flower.length];
    for (let i = 0; i < 3; i++) p.px(x + 3 + Math.floor(p.rnd() * 10), y + 3 + Math.floor(p.rnd() * 10), c);
  }
}

function asphalt(p: Painter, x: number, y: number, h: number): void {
  p.rect(x, y, TILE, TILE, PAL.asphalt[0]);
  p.noise(x, y, TILE, TILE, PAL.asphalt, 0.7);
  if (h < 0.07) {
    // Prasklina
    let cx = x + 2 + Math.floor(h * 100) % 10;
    let cy = y + 1;
    for (let i = 0; i < 12; i++) {
      p.px(cx, cy, 0x2e2e32);
      cy++;
      cx += p.rnd() < 0.4 ? (p.rnd() < 0.5 ? -1 : 1) : 0;
    }
  } else if (h < 0.11) {
    // Záplata
    p.rect(x + 3, y + 4, 8, 6, 0x3c3c40);
    p.noise(x + 3, y + 4, 8, 6, [0x37373b, 0x434347], 0.5);
  } else if (h > 0.985) {
    // Kanál
    p.ellipse(x + 8, y + 8, 3, 3, 0x2a2a2e);
    p.rect(x + 6, y + 8, 5, 1, 0x56565c);
  }
  // Olejová skvrna
  if (h > 0.6 && h < 0.63) p.ellipse(x + 8, y + 9, 3, 2, 0x2c2c33, 0.6);
}

function pavement(p: Painter, x: number, y: number, tx: number, ty: number, seed: number): void {
  // Betonové dlaždice 8×8 se spárami, každá trochu jinak světlá.
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const v = hash2(tx * 2 + i, ty * 2 + j, seed + 9);
      const c = PAL.pavement[Math.floor(v * PAL.pavement.length)];
      p.rect(x + i * 8, y + j * 8, 8, 8, c);
      p.noise(x + i * 8, y + j * 8, 8, 8, [shade(c, 0.93), shade(c, 1.05)], 0.3);
      if (v > 0.9) p.line(x + i * 8 + 1, y + j * 8 + 2, x + i * 8 + 6, y + j * 8 + 5, shade(c, 0.75));
    }
  }
  p.rect(x, y + 7, TILE, 1, PAL.pavementSeam);
  p.rect(x + 7, y, 1, TILE, PAL.pavementSeam);
  p.rect(x, y + 15, TILE, 1, PAL.pavementSeam);
  p.rect(x + 15, y, 1, TILE, PAL.pavementSeam);
}

function rail(p: Painter, x: number, y: number, horizontal: boolean): void {
  if (!horizontal) return;
  p.rect(x, y, TILE, 3, 0x3e2a18);
  p.rect(x, y, TILE, 1, 0x8a6a46);
  for (let i = 1; i < TILE; i += 6) p.rect(x + i, y, 2, 3, 0x2a1c10);
}

// ---------- Okraje: obrubníky, krajnice, břehy, skály ----------

function paintEdges(p: Painter, map: WorldMap, at: (x: number, y: number) => number): void {
  const dirs: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const tile = at(tx, ty);
      const x = tx * TILE;
      const y = ty * TILE;
      for (const [dx, dy] of dirs) {
        const n = at(tx + dx, ty + dy);
        // Pruh na okraji dlaždice směrem k sousedovi (šířka w).
        const edge = (w: number, c: Color, a = 1) => {
          if (dy === -1) p.rect(x, y, TILE, w, c, a);
          if (dy === 1) p.rect(x, y + TILE - w, TILE, w, c, a);
          if (dx === -1) p.rect(x, y, w, TILE, c, a);
          if (dx === 1) p.rect(x + TILE - w, y, w, TILE, c, a);
        };
        if (tile === Tile.Sidewalk && n === Tile.Road) {
          // Obrubník: světlá hrana a pod ní stín do silnice.
          edge(2, PAL.curb);
          edge(1, 0xe2ded4);
        }
        if (tile === Tile.Road && n === Tile.Sidewalk) edge(1, 0x2a2a2e, 0.6);
        if (tile === Tile.Road && (n === Tile.Grass || n === Tile.Dirt || n === Tile.ForestFloor)) {
          edge(2, 0x5f5a50, 0.8);
          edge(1, 0x6e6658, 0.6);
        }
        if (tile === Tile.Water && n !== Tile.Water) {
          // Pěna u břehu (voda je průhledná, kreslí se jen pěna).
          if (dy === -1) p.dither(x, y, TILE, 2, PAL.foam, 0.9);
          if (dy === 1) p.dither(x, y + TILE - 2, TILE, 2, PAL.foam, 0.9);
          if (dx === -1) p.dither(x, y, 2, TILE, PAL.foam, 0.9);
          if (dx === 1) p.dither(x + TILE - 2, y, 2, TILE, PAL.foam, 0.9);
        }
        if ((tile === Tile.Grass || tile === Tile.Dirt || tile === Tile.ForestFloor || tile === Tile.Sidewalk) && n === Tile.Water) {
          edge(2, 0x3a3226, 0.5);
        }
        if (tile === Tile.Rock && n !== Tile.Rock) {
          edge(1, 0x46423c);
          if (dy === -1 || dx === -1) edge(2, 0xa5a198, 0.5);
        }
        if (tile === Tile.Grass && (n === Tile.ForestFloor || n === Tile.Tree)) edge(2, PAL.grassDark, 0.5);
      }
    }
  }
}

// ---------- Vodorovné značení ----------

function paintMarkings(p: Painter, map: WorldMap, at: (x: number, y: number) => number): void {
  const phase = map.phase;
  // Hlavní silnice: přerušovaná žlutá čára mezi pruhy.
  for (let ty = 0; ty < DAM_Y; ty++) {
    const mx = mainRoadX(ty, phase);
    if (at(mx, ty) !== Tile.Road || at(mx + 1, ty) !== Tile.Road) continue;
    if (Math.abs(ty - CROSS_ROAD_Y) <= 1 || ty === CROSS_ROAD_Y + 2) continue;
    for (let py = ty * TILE; py < ty * TILE + TILE; py++) {
      if (((py >> 3) & 1) === 0) p.rect((mx + 1) * TILE - 1, py, 2, 1, PAL.lineYellow);
    }
  }
  // Příčná silnice: bílá přerušovaná, mimo křižovatku.
  for (let tx = 0; tx < map.width; tx++) {
    const y0 = CROSS_ROAD_Y;
    if (at(tx, y0) !== Tile.Road || at(tx, y0 + 1) !== Tile.Road) continue;
    if (at(tx, y0 - 1) === Tile.Road || at(tx, y0 + 2) === Tile.Road) continue;
    for (let px = tx * TILE; px < tx * TILE + TILE; px++) {
      if (((px >> 3) & 1) === 0) p.rect(px, (y0 + 1) * TILE - 1, 1, 2, PAL.lineWhite);
    }
  }
  // Přechod pro chodce na příčné silnici kousek za křižovatkou a na hlavní nad ní.
  const zx = (mainRoadX(CROSS_ROAD_Y, phase) + 4) * TILE;
  if (at(zx / TILE, CROSS_ROAD_Y) === Tile.Road) {
    for (let i = 0; i < 14; i += 4) p.rect(zx + i, CROSS_ROAD_Y * TILE + 3, 2, TILE * 2 - 6, PAL.lineWhite, 0.9);
  }
  const zy = CROSS_ROAD_Y - 4;
  const zmx = mainRoadX(zy, phase);
  if (at(zmx, zy) === Tile.Road && at(zmx + 1, zy) === Tile.Road) {
    for (let i = 0; i < 14; i += 4) p.rect(zmx * TILE + 3, zy * TILE + i, TILE * 2 - 6, 2, PAL.lineWhite, 0.9);
  }
}

/** Hřiště u školy: čáry a koše na basket. */
function paintPlayground(p: Painter, map: WorldMap): void {
  const school = map.buildings.find((b) => b.name === 'Škola');
  if (!school) return;
  const x = school.x * TILE;
  const y = (school.y + school.h) * TILE;
  const w = school.w * TILE;
  const h = 2 * TILE;
  p.rect(x + 2, y + 2, w - 4, h - 4, 0x8a5a3a);
  p.noise(x + 2, y + 2, w - 4, h - 4, [0x7e5234, 0x956444], 0.3);
  p.frame(x + 3, y + 3, w - 6, h - 6, 0xe8e6da);
  p.rect(x + w / 2, y + 3, 1, h - 6, 0xe8e6da);
  p.ellipse(x + w / 2, y + h / 2, 4, 4, 0xe8e6da);
  p.ellipse(x + w / 2, y + h / 2, 3, 3, 0x8a5a3a);
  p.rect(x + 4, y + h / 2 - 2, 2, 4, 0xd86a2a);
  p.rect(x + w - 6, y + h / 2 - 2, 2, 4, 0xd86a2a);
}

/** Keře a záhony v zahradách. */
function paintBushes(p: Painter, at: (x: number, y: number) => number, seed: number): void {
  for (let ty = 2; ty < DAM_Y - 2; ty++) {
    for (let tx = 17; tx < 99; tx++) {
      if (at(tx, ty) !== Tile.Grass) continue;
      const h = hash2(tx, ty, seed + 31);
      if (h > 0.05) continue;
      const cx = tx * TILE + 8;
      const cy = ty * TILE + 8;
      p.ellipse(cx + 2, cy + 3, 5, 4, PAL.shadow, 0.25);
      p.blob(cx, cy, 5, 0x24461c, h * 50);
      p.blob(cx - 1, cy - 1, 4, 0x36652a, h * 50);
      p.blob(cx - 2, cy - 2, 2, 0x4f8a38, h * 50);
      if (h < 0.015) for (let i = 0; i < 4; i++) p.px(cx - 3 + Math.floor(p.rnd() * 6), cy - 3 + Math.floor(p.rnd() * 6), PAL.flower[i % 4]);
    }
  }
}

// ---------- Zahrádky, břehy, les, zastávka ----------

/** Za domky zahrádky: záhony s řádky zeleniny a laťkový plot s brankou. */
function paintGardens(p: Painter, map: WorldMap, at: (x: number, y: number) => number, seed: number): void {
  for (const b of map.buildings) {
    if (b.name !== 'Dům') continue;
    const gx0 = b.x - 1;
    const gy0 = b.y - 3;
    const gw = b.w + 2;
    const gh = 3;
    let free = true;
    for (let y = gy0; y < gy0 + gh; y++) for (let x = gx0; x < gx0 + gw; x++) if (at(x, y) !== Tile.Grass) free = false;
    if (!free) continue;
    const x = gx0 * TILE + 3;
    const y = gy0 * TILE + 3;
    const w = gw * TILE - 6;
    const h = gh * TILE - 3;
    // Záhony: střídavě hlína a řádek rostlin
    const v = hash2(b.x, b.y, seed + 61);
    const crop = v < 0.33 ? 0x4f8a38 : v < 0.66 ? 0x6aa040 : 0x3a7a3a;
    for (let j = 4; j < h - 4; j += 5) {
      p.rect(x + 4, y + j, w - 8, 3, 0x6a4e30);
      p.noise(x + 4, y + j, w - 8, 3, [0x5a4026, 0x7a5a38], 0.3);
      for (let i = x + 5; i < x + w - 5; i += 2) p.px(i, y + j + 1, crop);
      for (let i = x + 6; i < x + w - 5; i += 4) p.px(i, y + j, shade(crop, 1.3));
    }
    // Plot s brankou (mezera vpravo dole)
    const fence = 0xd8c8a0;
    const post = 0x7a6a4a;
    p.rect(x, y, w, 1, fence);
    p.rect(x, y, 1, h, fence);
    p.rect(x + w - 1, y, 1, h, fence);
    p.rect(x, y + h - 1, w - 10, 1, fence);
    for (let i = 0; i < w; i += 4) {
      p.px(x + i, y, post);
      if (i < w - 10) p.px(x + i, y + h - 1, post);
    }
    for (let j = 0; j < h; j += 4) {
      p.px(x, y + j, post);
      p.px(x + w - 1, y + j, post);
    }
    p.rect(x + 2, y + h, w - 2, 1, PAL.shadow, 0.25);
  }
}

/** Rákos na břehu a lekníny na klidné vodě. */
function paintShores(p: Painter, map: WorldMap, at: (x: number, y: number) => number, seed: number): void {
  for (let ty = 1; ty < map.height - 1; ty++) {
    for (let tx = 1; tx < map.width - 1; tx++) {
      const tile = at(tx, ty);
      const h = hash2(tx, ty, seed + 71);
      const nearWater = [at(tx + 1, ty), at(tx - 1, ty), at(tx, ty + 1), at(tx, ty - 1)].includes(Tile.Water);
      if (tile === Tile.Grass && nearWater && h < 0.45) {
        for (let i = 0; i < 9; i++) {
          const rx = tx * TILE + 2 + Math.floor(p.rnd() * 12);
          const ry = ty * TILE + 2 + Math.floor(p.rnd() * 12);
          p.px(rx, ry, 0x5a7a2a);
          p.px(rx + 1, ry - 1, 0x7a9a3a);
          if (p.rnd() < 0.3) p.rect(rx, ry - 2, 1, 2, 0x6a4024);
        }
      }
      if (tile === Tile.Water && h < 0.07 && ty > 66) {
        // Leknín: zelený list se zářezem, občas květ
        const cx = tx * TILE + 8;
        const cy = ty * TILE + 8;
        p.ellipse(cx, cy, 3, 2, 0x3a7a3a);
        p.px(cx + 2, cy, 0x2a5f93);
        p.px(cx - 1, cy - 1, 0x5a9a4a);
        if (h < 0.025) p.px(cx, cy, 0xf0c0d8);
      }
    }
  }
}

/** Les: padlé kmeny, muchomůrky a kapradí. */
function paintForestDetails(p: Painter, map: WorldMap, at: (x: number, y: number) => number, seed: number): void {
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (at(tx, ty) !== Tile.ForestFloor) continue;
      const h = hash2(tx, ty, seed + 83);
      const x = tx * TILE;
      const y = ty * TILE;
      if (h < 0.03) {
        p.rect(x + 2, y + 7, 12, 3, 0x5a3e24);
        p.rect(x + 2, y + 7, 12, 1, 0x7a5636);
        p.ellipse(x + 13, y + 8, 1, 1, 0xb08a5a);
        p.px(x + 6, y + 6, 0x3f6a30);
      } else if (h < 0.06) {
        for (const [mx, my] of [[5, 6], [9, 9], [6, 11]]) {
          p.rect(x + mx, y + my, 2, 2, 0xd02a1a);
          p.px(x + mx, y + my, 0xffffff);
        }
      } else if (h < 0.14) {
        const cx = x + 8;
        const cy = y + 8;
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + h * 10;
          p.line(cx, cy, cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4, 0x4a8a3a);
        }
      }
    }
  }
}

/** Autobusová zastávka u hlavní silnice severně od návsi. */
function paintBusStop(p: Painter, map: WorldMap, at: (x: number, y: number) => number): void {
  const ty = CROSS_ROAD_Y - 9;
  const mx = mainRoadX(ty, map.phase);
  for (const tx of [mx + 2, mx - 1]) {
    if (at(tx, ty) !== Tile.Sidewalk || at(tx, ty + 1) !== Tile.Sidewalk) continue;
    const x = tx * TILE + 3;
    const y = ty * TILE + 2;
    p.rect(x + 2, y + 2, 10, 24, PAL.shadow, 0.3);
    p.rect(x, y, 10, 24, 0x5a6a7a);
    p.rect(x, y, 10, 1, 0x9aaabb);
    p.rect(x + 1, y + 1, 8, 22, 0x6e7e8e);
    p.rect(x + 1, y + 3, 1, 18, 0x9ac0d8);
    // Cedule: žlutý ovál se zeleným „A“ pruhem
    p.ellipse(x + 5, y + 28, 2, 2, 0xe8c020);
    p.px(x + 5, y + 28, 0x2a7a3a);
    return;
  }
}

// ---------- Stromy ----------

function paintTree(p: Painter, tx: number, ty: number, seed: number): void {
  const h = hash2(tx, ty, seed + 77);
  const cx = tx * TILE + 8 + Math.round((h - 0.5) * 4);
  const cy = ty * TILE + 8 + Math.round((hash2(ty, tx, seed) - 0.5) * 4);
  if (h < 0.62) {
    // Smrk (Beskydy): tmavý, zubatý, s paprsky větví od středu.
    const r = 8 + Math.floor(h * 6) % 3;
    p.blob(cx, cy, r + 1, 0x12281c, h * 40);
    p.blob(cx, cy, r, 0x1d3d2a, h * 40);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + h;
      p.line(cx, cy, cx + Math.cos(ang) * (r - 1), cy + Math.sin(ang) * (r - 1), 0x2a5238);
    }
    p.blob(cx - 1, cy - 1, r * 0.55, 0x2f5c3e, h * 20);
    p.noise(cx - r, cy - r, r, r, [0x3f7450, 0x356645], 0.15);
    p.px(cx, cy, 0x4a8a5e);
  } else {
    // Listnáč (buk, javor): kulatý, světlejší, osvětlený zleva shora.
    const r = 8 + Math.floor(h * 10) % 3;
    p.blob(cx, cy, r + 1, 0x1b3216, h * 30);
    p.blob(cx, cy, r, 0x2e5a26, h * 30);
    p.blob(cx - 1, cy - 1, r - 2, 0x3d7030, h * 30);
    p.blob(cx - 2, cy - 2, r - 5, 0x5a8f3e, h * 30);
    p.noise(cx - r + 1, cy - r + 1, r, r, [0x7aac52, 0x5a8f3e], 0.12);
    p.noise(cx, cy, r - 1, r - 1, [0x24461c], 0.2);
  }
}

// ---------- Budovy ----------

const ROOF_COLORS: Record<number, Color> = {
  [Tile.RoofRed]: 0xa8432e,
  [Tile.RoofGray]: 0x60646e,
  [Tile.RoofBrown]: 0x7a5236,
};
const WALLS: Color[] = [0xd8cbb0, 0xe2dccc, 0xd6c28e, 0xc8b8a0, 0xe0c8b8];

export function paintBuilding(p: Painter, b: Building, seed: number): void {
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const v = hash2(b.x, b.y, seed + 5);
  const wall = WALLS[Math.floor(v * WALLS.length)];
  const roof = ROOF_COLORS[b.roof] ?? 0x7a5236;
  const face = 6;

  switch (b.name) {
    case 'Kostel':
      church(p, x, y, w, h);
      return;
    case 'Obchod':
      flat(p, x, y, w, h - face, 0xa49a88, v);
      facade(p, x, y + h - face, w, face, 0xe8e2d0, 'shop', v);
      awning(p, x + 4, y + h, w - 8);
      return;
    case 'Obecní úřad':
      flat(p, x, y, w, h - face, 0x8e8e94, v);
      skylights(p, x + 8, y + 8, w - 16, 3);
      facade(p, x, y + h - face, w, face, 0xd8d0b8, 'office', v);
      flag(p, x + w - 6, y + h + 2);
      return;
    case 'Zdravotní středisko':
      flat(p, x, y, w, h - face, 0xd8d8d4, v, false);
      p.rect(x + w / 2 - 6, y + (h - face) / 2 - 2, 12, 4, 0xd02020);
      p.rect(x + w / 2 - 2, y + (h - face) / 2 - 6, 4, 12, 0xd02020);
      facade(p, x, y + h - face, w, face, 0xf2f2ee, 'office', v);
      return;
    case 'Škola':
      flat(p, x, y, w, h - face, 0xa8a08e, v);
      skylights(p, x + 10, y + 10, w - 20, 4);
      facade(p, x, y + h - face, w, face, 0xd6b878, 'office', v);
      return;
    case 'Pila':
      corrugated(p, x, y, w, h - face, 0x8a6a4a, true);
      facade(p, x, y + h - face, w, face, 0x6a4a2e, 'barn', v);
      return;
    case 'Garáž':
      corrugated(p, x, y, w, h - face, 0x6a7a86, false);
      facade(p, x, y + h - face, w, face, 0x8a8a88, 'garage', v);
      p.ellipse(x + w / 2, y + h + 6, 6, 3, 0x1a1a1e, 0.45);
      return;
    case 'Chata':
      pitched(p, x, y, w, h - face, 0x4e3624, v, true);
      facade(p, x, y + h - face, w, face, 0x7a5632, 'house', v);
      return;
    case 'Hospoda':
      pitched(p, x, y, w, h - face, roof, v, false);
      facade(p, x, y + h - face, w, face, 0xe8d8b0, 'pub', v);
      // Sudy a lavice před hospodou.
      for (let i = 0; i < 2; i++) {
        p.ellipse(x + 5 + i * 6, y + h + 5, 2, 2, 0x6a4424);
        p.px(x + 5 + i * 6, y + h + 5, 0x3a2414);
      }
      p.rect(x + w - 18, y + h + 3, 12, 2, 0x7a5636);
      return;
    default:
      pitched(p, x, y, w, h - face, roof, v, true);
      facade(p, x, y + h - face, w, face, wall, 'house', v);
  }
}

/** Sedlová střecha: dvě poloviny (osvětlená a ve stínu), řady tašek, hřeben, komín. */
function pitched(p: Painter, x: number, y: number, w: number, h: number, base: Color, v: number, chimney: boolean): void {
  const horizontal = w >= h;
  const light = shade(base, 1.18);
  const dark = shade(base, 0.78);
  p.rect(x, y, w, h, dark);
  if (horizontal) {
    const mid = Math.floor(h / 2);
    p.rect(x, y, w, mid, light);
    for (let row = 0; row < h; row += 3) {
      const c = row < mid ? shade(light, 0.86) : shade(dark, 0.82);
      p.rect(x, y + row + 2, w, 1, c);
      for (let i = (row / 3) % 2 ? 1 : 3; i < w; i += 4) p.px(x + i, y + row + 1, c);
    }
    p.rect(x, y + mid - 1, w, 2, shade(base, 0.6));
    p.rect(x, y + mid - 1, w, 1, shade(base, 1.35));
  } else {
    const mid = Math.floor(w / 2);
    p.rect(x, y, mid, h, light);
    for (let col = 0; col < w; col += 3) {
      const c = col < mid ? shade(light, 0.86) : shade(dark, 0.82);
      p.rect(x + col + 2, y, 1, h, c);
      for (let j = (col / 3) % 2 ? 1 : 3; j < h; j += 4) p.px(x + col + 1, y + j, c);
    }
    p.rect(x + mid - 1, y, 2, h, shade(base, 0.6));
    p.rect(x + mid - 1, y, 1, h, shade(base, 1.35));
  }
  p.frame(x, y, w, h, shade(base, 0.45));
  if (chimney) {
    const cx = x + 4 + Math.floor(v * (w - 12));
    const cy = y + 3 + Math.floor(v * 7) % Math.max(1, Math.floor(h / 2) - 4);
    p.rect(cx + 1, cy + 1, 5, 5, PAL.shadow, 0.35);
    p.rect(cx, cy, 5, 5, 0x8a4a34);
    p.rect(cx, cy, 5, 1, 0xa86a50);
    p.rect(cx + 1, cy + 1, 3, 3, 0x1a1412);
    chimneys.push({ x: cx + 2, y: cy + 2 });
  }
  if (v > 0.55 && w > 40) {
    // Střešní okno
    const sx = x + Math.floor(w * 0.65);
    const sy = y + 3;
    p.rect(sx, sy, 6, 4, 0x2a3a4a);
    p.rect(sx, sy, 6, 1, 0x8ab0c8);
    p.px(sx + 1, sy + 1, 0xc8e0f0);
  }
}

/** Plochá střecha: atika, štěrk, klimatizace, větrání, skvrny. */
function flat(p: Painter, x: number, y: number, w: number, h: number, base: Color, v: number, units = true): void {
  p.rect(x, y, w, h, base);
  p.noise(x, y, w, h, [shade(base, 0.9), shade(base, 1.08), shade(base, 0.82)], 0.45);
  p.frame(x, y, w, h, shade(base, 0.55));
  p.frame(x + 1, y + 1, w - 2, h - 2, shade(base, 1.3));
  p.frame(x + 2, y + 2, w - 4, h - 4, shade(base, 0.75));
  // Louže / skvrna
  p.ellipse(x + w * 0.3, y + h * 0.6, 4, 2, shade(base, 0.8), 0.6);
  if (!units) return;
  const n = Math.max(1, Math.floor(w / 40));
  for (let i = 0; i < n; i++) {
    const ax = x + 6 + Math.floor(((i + v) * w) / (n + 1)) % (w - 14);
    const ay = y + h - 12;
    p.rect(ax + 1, ay + 1, 8, 6, PAL.shadow, 0.35);
    p.rect(ax, ay, 8, 6, 0xb8bcc0);
    p.frame(ax, ay, 8, 6, 0x6e7276);
    p.ellipse(ax + 4, ay + 3, 2, 2, 0x4a4e52);
    p.px(ax + 4, ay + 3, 0x9aa0a4);
  }
  // Odvětrání
  p.ellipse(x + w - 8, y + 7, 2, 2, 0x3a3a3e);
  p.px(x + w - 9, y + 6, 0x8a8a8e);
}

function skylights(p: Painter, x: number, y: number, w: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor((i * w) / n);
    p.rect(sx, y, 7, 5, 0x3a4e62);
    p.rect(sx, y, 7, 1, 0x9ac0d8);
    p.rect(sx, y, 1, 5, 0x6a8aa2);
    p.px(sx + 2, y + 2, 0xd0e8f4);
  }
}

/** Vlnitý plech: střídavé světlé a tmavé pruhy, rez. */
function corrugated(p: Painter, x: number, y: number, w: number, h: number, base: Color, rusty: boolean): void {
  for (let i = 0; i < w; i++) p.rect(x + i, y, 1, h, i % 3 === 0 ? shade(base, 1.25) : i % 3 === 1 ? base : shade(base, 0.72));
  if (rusty) p.noise(x, y, w, h, [0x8a4a22, 0x6a3a1a, 0x9a5a2a], 0.08);
  p.frame(x, y, w, h, shade(base, 0.45));
  p.rect(x, y + Math.floor(h / 2), w, 1, shade(base, 0.6));
}

/** Kostel: loď se sedlovou střechou a věž s jehlanem a křížem. */
function church(p: Painter, x: number, y: number, w: number, h: number): void {
  const slate = 0x52565e;
  pitched(p, x, y + w, w, h - w - 6, slate, 0.2, false);
  facade(p, x, y + h - 6, w, 6, 0xe8e0cc, 'church', 0.5);
  // Věž: jehlan ze čtyř trojúhelníků (sever a západ osvětlené).
  const s = w;
  const cx = x + s / 2;
  const cy = y + s / 2;
  for (let j = 0; j < s; j++) {
    for (let i = 0; i < s; i++) {
      const dx = i - s / 2 + 0.5;
      const dy = j - s / 2 + 0.5;
      const c = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0x6a7078 : 0x3e424a) : dy < 0 ? 0x767c84 : 0x464a52;
      p.px(x + i, y + j, c);
    }
  }
  p.frame(x, y, s, s, 0x2a2c30);
  p.line(x, y, x + s - 1, y + s - 1, 0x2e3036);
  p.line(x + s - 1, y, x, y + s - 1, 0x2e3036);
  // Zlatý kříž na špičce
  p.rect(cx - 1, cy - 4, 2, 8, 0xe8c040);
  p.rect(cx - 3, cy - 2, 6, 2, 0xe8c040);
}

type FacadeKind = 'house' | 'shop' | 'office' | 'pub' | 'barn' | 'garage' | 'church';

/** Průčelí (jižní stěna) pod střechou: okna, dveře, výloha, vrata. */
function facade(p: Painter, x: number, y: number, w: number, h: number, wall: Color, kind: FacadeKind, v: number): void {
  p.rect(x, y, w, h, wall);
  p.noise(x, y, w, h, [shade(wall, 0.92), shade(wall, 1.04)], 0.25);
  p.rect(x, y, w, 1, shade(wall, 0.6));
  p.rect(x, y + h - 1, w, 1, shade(wall, 0.55));
  const glass = 0x3a5068;
  const glassHi = 0x9ac0d8;
  const door = Math.floor(w / 2) - 2 + (v > 0.5 ? 6 : -6);
  if (kind === 'shop') {
    windows.push({ x: x + 3, y: y + 1, w: w - 6, h: h - 2 });
    p.rect(x + 3, y + 1, w - 6, h - 2, glass);
    p.rect(x + 3, y + 1, w - 6, 1, glassHi);
    for (let i = x + 8; i < x + w - 4; i += 10) p.rect(i, y + 1, 1, h - 2, 0x6e6a62);
    return;
  }
  if (kind === 'garage') {
    for (const gx of [x + 4, x + w / 2 + 2]) {
      p.rect(gx, y + 1, w / 2 - 6, h - 1, 0x9a9e9e);
      for (let j = 2; j < h; j += 2) p.rect(gx, y + j, w / 2 - 6, 1, 0x6a6e70);
    }
    return;
  }
  if (kind === 'barn') {
    p.rect(x + w / 2 - 8, y + 1, 16, h - 1, 0x3e2a18);
    p.line(x + w / 2 - 8, y + 1, x + w / 2 + 7, y + h - 1, 0x5e4026);
    p.line(x + w / 2 + 7, y + 1, x + w / 2 - 8, y + h - 1, 0x5e4026);
    return;
  }
  const step = kind === 'church' ? 8 : 7;
  for (let i = x + 3; i < x + w - 4; i += step) {
    if (Math.abs(i - (x + door)) < 5) continue;
    p.rect(i, y + 1, kind === 'church' ? 2 : 3, h - 3, glass);
    p.px(i, y + 1, glassHi);
    windows.push({ x: i, y: y + 1, w: kind === 'church' ? 2 : 3, h: h - 3 });
  }
  p.rect(x + door, y + 1, 4, h - 1, kind === 'pub' ? 0x5a3418 : 0x6a4424);
  p.px(x + door + 3, y + 3, 0xd8b040);
  if (kind === 'pub') {
    // Vývěsní štít s pivem
    p.rect(x + door - 6, y + 1, 4, 3, 0xd8a020);
    p.px(x + door - 5, y + 1, 0xffffff);
  }
}

/** Pruhovaná markýza přes chodník před obchodem. */
function awning(p: Painter, x: number, y: number, w: number): void {
  p.rect(x + 2, y + 5, w, 2, PAL.shadow, 0.3);
  for (let i = 0; i < w; i++) p.rect(x + i, y, 1, 5, Math.floor(i / 3) % 2 ? 0xd83a2a : 0xf0ece0);
  p.rect(x, y + 4, w, 1, 0x8a2a1a);
}

/** Stožár s českou vlajkou. */
function flag(p: Painter, x: number, y: number): void {
  p.rect(x + 1, y + 1, 2, 2, PAL.shadow, 0.4);
  p.px(x, y, 0x3a3a3a);
  p.rect(x + 1, y - 6, 7, 2, 0xf2f2f2);
  p.rect(x + 1, y - 4, 7, 2, 0xd02020);
  for (let i = 0; i < 3; i++) p.rect(x + 1, y - 6 + i, 3 - i, 1, 0x2050c0);
  p.rect(x + 1, y - 3, 1, 1, 0x2050c0);
  void mix;
}
