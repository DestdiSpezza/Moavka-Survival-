import { TILE } from '../config';
import { nearSegment, pointAlong, type Pt } from '../world/geom';
import type { WorldMap } from '../world/moravka';
import { Tile } from '../world/tiles';
import { type Color, hash2, PAL, Painter, shade } from './painter';

/**
 * Silnice a potoky kreslené hladce podle os (i šikmo), ne po dlaždicích:
 * asfalt s flíčky a záplatami, obrubníky a chodníky z dlaždic, krajnice,
 * polní cesty s kolejemi, středové čáry, přechody, mosty se zábradlím,
 * potoky s pěnou u břehu. Logika hry dál pracuje s dlaždicemi.
 */

/** Šířka pruhu chodníku vedle silnice (px). */
const SIDEWALK = 14;

interface Fields {
  W: number;
  H: number;
  /** 1 = asfalt */
  asphalt: Uint8Array;
  /** 1 = chodník */
  walk: Uint8Array;
  /** Polní cesta: vzdálenost od osy / poloviční šířka × 200 (0 = osa), 255 = není. */
  track: Uint8Array;
  /** 1 = voda potoka (průhledná) */
  water: Uint8Array;
}

/** Projde pixely v okolí úseku a–b (v dlaždicích) do vzdálenosti `reach` px. */
function forPixelsNear(W: number, H: number, a: Pt, b: Pt, reach: number, fn: (i: number, x: number, y: number, d: number, t: number, side: number) => void): void {
  const ax = a[0] * TILE;
  const ay = a[1] * TILE;
  const bx = b[0] * TILE;
  const by = b[1] * TILE;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - reach));
  const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + reach));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by) - reach));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + reach));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const n = nearSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
      if (n.d <= reach) fn(y * W + x, x, y, n.d, n.t, n.side);
    }
  }
}

function segments(pts: readonly Pt[]): Array<[Pt, Pt]> {
  const out: Array<[Pt, Pt]> = [];
  for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i], pts[i + 1]]);
  return out;
}

export function buildFields(map: WorldMap): Fields {
  const W = map.width * TILE;
  const H = map.height * TILE;
  const f: Fields = { W, H, asphalt: new Uint8Array(W * H), walk: new Uint8Array(W * H), track: new Uint8Array(W * H).fill(255), water: new Uint8Array(W * H) };
  const tx = (x: number, y: number) => map.tiles[y]?.[x];
  // Chodník je pruh podél silnice; dlaždice chodníků jdou po schodech, proto stačí, když je chodník vedle.
  const walkTile: boolean[][] = map.tiles.map((row, y) => row.map((tile, x) => {
    if (tile === Tile.Sidewalk) return true;
    if (tile !== Tile.Grass && tile !== Tile.Road) return false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (tx(x + i, y + j) === Tile.Sidewalk) return true;
    return false;
  }));
  for (const s of map.streams) {
    const hw = (s.width / 2) * TILE;
    for (const [a, b] of segments(s.pts)) forPixelsNear(W, H, a, b, hw, (i) => (f.water[i] = 1));
  }
  for (const road of map.roads) {
    const hw = (road.width / 2) * TILE;
    for (const [a, b] of segments(road.pts)) {
      if (road.kind === 'track') {
        forPixelsNear(W, H, a, b, hw, (i, _x, _y, d) => {
          const v = Math.min(254, Math.round((d / hw) * 200));
          if (v < f.track[i]) f.track[i] = v;
        });
        continue;
      }
      forPixelsNear(W, H, a, b, hw + SIDEWALK, (i, x, y, d) => {
        if (d < hw) f.asphalt[i] = 1;
        else if (walkTile[Math.floor(y / TILE)]?.[Math.floor(x / TILE)]) f.walk[i] = 1;
      });
    }
  }
  return f;
}

/** Je tahle vodní dlaždice součástí potoka (kreslí se hladce), nebo jezera (po dlaždicích)? */
export function streamTile(map: WorldMap, tx: number, ty: number): boolean {
  const cx = tx + 0.5;
  const cy = ty + 0.5;
  return map.streams.some((s) => {
    for (const [a, b] of segments(s.pts)) if (nearSegment(cx, cy, a[0], a[1], b[0], b[1]).d < s.width / 2 + 1.2) return true;
    return false;
  });
}

// ---------- Potoky ----------

export function paintStreams(p: Painter, f: Fields): void {
  const { W, H, water } = f;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (water[i]) {
        p.clear(x, y, 1, 1);
        // Pěna u břehu.
        const edge = (x > 0 && !water[i - 1]) || (x < W - 1 && !water[i + 1]) || (y > 0 && !water[i - W]) || (y < H - 1 && !water[i + W]);
        if (edge && (x + y) % 2 === 0) p.px(x, y, PAL.foam, 0.9);
        continue;
      }
      // Tmavší bahnitý břeh u vody.
      const near1 = (x > 0 && water[i - 1]) || (x < W - 1 && water[i + 1]) || (y > 0 && water[i - W]) || (y < H - 1 && water[i + W]);
      if (near1) p.px(x, y, 0x3a3226, 0.55);
      else if ((x > 1 && water[i - 2]) || (x < W - 2 && water[i + 2]) || (y > 1 && water[i - 2 * W]) || (y < H - 2 && water[i + 2 * W])) p.px(x, y, 0x3a3226, 0.25);
    }
  }
}

// ---------- Silnice ----------

const ASPHALT = PAL.asphalt;

export function paintRoads(p: Painter, map: WorldMap, f: Fields, lakeAt: (tx: number, ty: number) => boolean): void {
  const { W, H, asphalt, walk, track, water } = f;
  const d = p.data;
  const put = (i: number, c: Color) => {
    d[i * 4] = (c >> 16) & 0xff;
    d[i * 4 + 1] = (c >> 8) & 0xff;
    d[i * 4 + 2] = c & 0xff;
    d[i * 4 + 3] = 255;
  };
  const isA = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && asphalt[y * W + x] === 1;
  const isWalk = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && walk[y * W + x] === 1;
  const overWater = (x: number, y: number) => water[y * W + x] === 1 || lakeAt(Math.floor(x / TILE), Math.floor(y / TILE)) || map.tiles[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] === Tile.Bridge;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (track[i] < 255 && !asphalt[i]) {
        // Polní cesta: hlína, dvě vyjeté koleje, uprostřed tráva.
        const r = track[i] / 200;
        const h = hash2(x, y, 41);
        let c: Color = PAL.dirt[Math.floor(h * PAL.dirt.length)];
        if (r < 0.2) c = h < 0.55 ? PAL.grass[Math.floor(h * 9) % PAL.grass.length] : c;
        else if (r > 0.38 && r < 0.66) c = shade(c, 0.78);
        else if (r > 0.86) c = h < 0.5 ? PAL.grass[Math.floor(h * 7) % PAL.grass.length] : shade(c, 1.08);
        put(i, c);
        continue;
      }
      if (walk[i] && !asphalt[i]) {
        // Chodník: betonové dlaždice 8×8 se spárami, obrubník u silnice.
        const sx = x >> 3;
        const sy = y >> 3;
        const v = hash2(sx, sy, 9);
        let c: Color = PAL.pavement[Math.floor(v * PAL.pavement.length)];
        if (hash2(x, y, 10) < 0.25) c = shade(c, hash2(x, y, 11) < 0.5 ? 0.94 : 1.05);
        if ((x & 7) === 7 || (y & 7) === 7) c = PAL.pavementSeam;
        if (isA(x - 1, y) || isA(x + 1, y) || isA(x, y - 1) || isA(x, y + 1)) c = 0xe2ded4;
        else if (isA(x - 2, y) || isA(x + 2, y) || isA(x, y - 2) || isA(x, y + 2)) c = PAL.curb;
        put(i, c);
        continue;
      }
      if (!asphalt[i]) {
        // Zábradlí mostu: nad vodou těsně vedle asfaltu, se sloupky.
        if (water[i] || lakeAt(Math.floor(x / TILE), Math.floor(y / TILE))) {
          const a1 = isA(x - 1, y) || isA(x + 1, y) || isA(x, y - 1) || isA(x, y + 1);
          const a2 = !a1 && (isA(x - 2, y) || isA(x + 2, y) || isA(x, y - 2) || isA(x, y + 2));
          if (a1) put(i, (x + y) % 5 === 0 ? 0x2a1c10 : 0x8a6a46);
          else if (a2) put(i, 0x3e2a18);
        }
        continue;
      }
      // Asfalt: zrnitý, s okrajem do trávy nebo stínem pod obrubníkem.
      const h = hash2(x, y, 3);
      let c: Color = ASPHALT[Math.floor(h * h * ASPHALT.length)];
      const cell = hash2(x >> 4, y >> 4, 77);
      if (cell < 0.05 && (x & 15) > 3 && (x & 15) < 12 && (y & 15) > 4 && (y & 15) < 11) c = hash2(x, y, 5) < 0.5 ? 0x37373b : 0x434347;
      const edge1 = !isA(x - 1, y) || !isA(x + 1, y) || !isA(x, y - 1) || !isA(x, y + 1);
      const edge2 = !edge1 && (!isA(x - 2, y) || !isA(x + 2, y) || !isA(x, y - 2) || !isA(x, y + 2));
      const nearWalk = isWalk(x - 1, y) || isWalk(x + 1, y) || isWalk(x, y - 1) || isWalk(x, y + 1) || isWalk(x - 2, y) || isWalk(x + 2, y) || isWalk(x, y - 2) || isWalk(x, y + 2);
      if (overWater(x, y) && (edge1 || edge2)) {
        // Most: zábradlí se sloupky.
        c = edge1 ? ((x + y) % 6 < 2 ? 0x2a1c10 : 0x8a6a46) : 0x3e2a18;
      } else if (edge1) c = nearWalk ? 0x2a2a2e : 0x6e6658;
      else if (edge2 && !nearWalk) c = 0x5f5a50;
      put(i, c);
    }
  }
  paintCracks(p, f);
}

/** Praskliny a kanály: jen tam, kde je celý kousek na asfaltu. */
function paintCracks(p: Painter, f: Fields): void {
  const { W, H, asphalt } = f;
  for (let cy = 0; cy < H / 16; cy++) {
    for (let cx = 0; cx < W / 16; cx++) {
      const h = hash2(cx, cy, 91);
      const x = cx * 16;
      const y = cy * 16;
      const inside = (px: number, py: number) => asphalt[py * W + px] === 1;
      if (h < 0.04 && inside(x + 8, y + 1) && inside(x + 8, y + 14)) {
        let kx = x + 3 + Math.floor(h * 250) % 10;
        for (let ky = y + 1; ky < y + 14; ky++) {
          if (inside(kx, ky)) p.px(kx, ky, 0x2e2e32);
          kx += hash2(kx, ky, 2) < 0.4 ? (hash2(kx, ky, 4) < 0.5 ? -1 : 1) : 0;
        }
      } else if (h > 0.985 && inside(x + 4, y + 4) && inside(x + 12, y + 12)) {
        p.ellipse(x + 8, y + 8, 3, 3, 0x2a2a2e);
        p.rect(x + 6, y + 8, 5, 1, 0x56565c);
      } else if (h > 0.6 && h < 0.625 && inside(x + 5, y + 6) && inside(x + 11, y + 11)) {
        p.ellipse(x + 8, y + 9, 3, 2, 0x2c2c33, 0.6);
      }
    }
  }
}

/** Body, kde se silnice potkávají (tam se nekreslí středová čára). */
function junctions(map: WorldMap): Array<{ x: number; y: number; r: number }> {
  const out: Array<{ x: number; y: number; r: number }> = [];
  const roads = map.roads.filter((r) => r.kind !== 'track');
  for (const road of roads) {
    for (const end of [road.pts[0], road.pts[road.pts.length - 1]]) {
      for (const other of roads) {
        if (other === road) continue;
        for (const [a, b] of segments(other.pts)) {
          if (nearSegment(end[0], end[1], a[0], a[1], b[0], b[1]).d < other.width / 2 + 0.6) {
            out.push({ x: end[0] * TILE, y: end[1] * TILE, r: (Math.max(road.width, other.width) / 2 + 1.6) * TILE });
          }
        }
      }
    }
  }
  return out;
}

/** Středová přerušovaná čára na hlavních silnicích a přechody pro chodce. */
export function paintMarkings(p: Painter, map: WorldMap, f: Fields): void {
  const { W, H, asphalt } = f;
  const skip = junctions(map);
  for (const road of map.roads) {
    if (road.kind !== 'main') continue;
    let along = 0;
    for (const [a, b] of segments(road.pts)) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * TILE;
      forPixelsNear(W, H, a, b, 1.2, (i, x, y, _d, t, side) => {
        if (!asphalt[i] || side < 0) return;
        const s = along + t * len;
        if (((s / 8) | 0) % 2 !== 0) return;
        if (skip.some((j) => Math.hypot(x - j.x, y - j.y) < j.r)) return;
        p.px(x, y, PAL.lineWhite, 0.95);
      });
      along += len;
    }
  }
  for (const cw of map.crosswalks) {
    const road = map.roads[cw.road];
    if (!road) continue;
    const c = pointAlong(road.pts, cw.along);
    const hw = (road.width / 2) * TILE - 3;
    const cx = c.x * TILE;
    const cy = c.y * TILE;
    const reach = hw + 8;
    for (let y = Math.floor(cy - reach); y <= cy + reach; y++) {
      for (let x = Math.floor(cx - reach); x <= cx + reach; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || !asphalt[y * W + x]) continue;
        const rx = x + 0.5 - cx;
        const ry = y + 0.5 - cy;
        const al = rx * c.dx + ry * c.dy;
        const ac = -rx * c.dy + ry * c.dx;
        if (Math.abs(al) > 5 || Math.abs(ac) > hw) continue;
        if (Math.floor((ac + hw) / 3) % 2 === 0) p.px(x, y, PAL.lineWhite, 0.92);
      }
    }
  }
}

// ---------- Lampy ----------

export interface Lamp {
  /** Pata sloupu */
  x: number;
  y: number;
  /** Kam svítí (bod nad silnicí) */
  lx: number;
  ly: number;
}

/** Lampy na chodnících podél silnic ve vesnici, zhruba po sedmi dlaždicích, střídavě po stranách. */
export function lampPositions(map: WorldMap, f: Fields): Lamp[] {
  const out: Lamp[] = [];
  map.roads.forEach((road, ri) => {
    if (road.kind === 'track') return;
    let len = 0;
    for (const [a, b] of segments(road.pts)) len += Math.hypot(b[0] - a[0], b[1] - a[1]);
    let n = 0;
    for (let s = 3 + (ri % 3); s < len - 2; s += 7) {
      const q = pointAlong(road.pts, s);
      const side = n++ % 2 ? 1 : -1;
      const off = (road.width / 2) * TILE + 6;
      const x = Math.round(q.x * TILE - q.dy * off * side);
      const y = Math.round(q.y * TILE + q.dx * off * side);
      if (x < 0 || y < 0 || x >= f.W || y >= f.H || !f.walk[y * f.W + x]) continue;
      out.push({ x, y, lx: Math.round(x + q.dy * 9 * side), ly: Math.round(y - q.dx * 9 * side) });
    }
  });
  return out;
}

// ---------- Ozdoby v terénu ----------

export function paintDecor(p: Painter, map: WorldMap): void {
  for (const dcr of map.decor) {
    if (dcr.kind === 'oval') {
      // Atletický ovál: tartan s drahami, uvnitř trávník s čárami a brankami.
      const cx = dcr.x * TILE;
      const cy = dcr.y * TILE;
      const rx = dcr.rx * TILE;
      const ry = dcr.ry * TILE;
      for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
        for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
          const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
          if (r > 1.0) continue;
          if (r > 0.8) {
            const lane = Math.floor(((r - 0.8) / 0.2) * 4);
            const k = (r - 0.8) / 0.2 * 4 - lane;
            p.px(x, y, k < 0.12 ? 0xe8e6da : hash2(x, y, 12) < 0.3 ? 0xa8503a : 0xb85a40);
          } else {
            const stripe = Math.floor((y - (cy - ry)) / 10) % 2 === 0;
            p.px(x, y, stripe ? 0x4f8a38 : 0x5a9640);
          }
        }
      }
      // Fotbalové hřiště uvnitř.
      const fw = rx * 1.05;
      const fh = ry * 1.25;
      p.frame(Math.round(cx - fw / 2), Math.round(cy - fh / 2), Math.round(fw), Math.round(fh), 0xe8e6da);
      p.rect(Math.round(cx - fw / 2), Math.round(cy), Math.round(fw), 1, 0xe8e6da);
      p.ellipse(cx, cy, 6, 6, 0xe8e6da);
      p.ellipse(cx, cy, 5, 5, 0x4f8a38);
      for (const sy of [-1, 1]) {
        const gy = Math.round(cy + (sy * fh) / 2);
        p.frame(Math.round(cx - 12), sy < 0 ? gy : gy - 10, 24, 10, 0xe8e6da);
        p.rect(Math.round(cx - 6), sy < 0 ? gy - 3 : gy, 12, 3, 0xf2f2ee);
      }
    } else if (dcr.kind === 'court') {
      const x = dcr.x * TILE;
      const y = dcr.y * TILE;
      const w = dcr.w * TILE;
      const h = dcr.h * TILE;
      p.rect(x + 2, y + 2, w - 4, h - 4, 0x8a5a3a);
      p.noise(x + 2, y + 2, w - 4, h - 4, [0x7e5234, 0x956444], 0.3);
      p.frame(x + 3, y + 3, w - 6, h - 6, 0xe8e6da);
      p.rect(x + w / 2, y + 3, 1, h - 6, 0xe8e6da);
      p.ellipse(x + w / 2, y + h / 2, 4, 4, 0xe8e6da);
      p.ellipse(x + w / 2, y + h / 2, 3, 3, 0x8a5a3a);
      p.rect(x + 4, y + h / 2 - 2, 2, 4, 0xd86a2a);
      p.rect(x + w - 6, y + h / 2 - 2, 2, 4, 0xd86a2a);
    } else if (dcr.kind === 'playground') {
      // Pískoviště, houpačky a skluzavka u školky.
      const x = dcr.x * TILE;
      const y = dcr.y * TILE;
      const w = dcr.w * TILE;
      const h = dcr.h * TILE;
      p.rect(x + 2, y + 2, w - 4, h - 4, 0xd8c08a);
      p.noise(x + 2, y + 2, w - 4, h - 4, [0xc8b07a, 0xe4cc96], 0.4);
      p.frame(x + 1, y + 1, w - 2, h - 2, 0xd8c8a0);
      p.rect(x + 8, y + 6, 18, 2, 0x8a4a2a);
      for (const sx of [10, 16, 22]) p.rect(x + sx, y + 9, 2, 3, 0x2a2a2e);
      p.rect(x + w - 26, y + 10, 4, 18, 0xd0402a);
      p.rect(x + w - 26, y + 10, 4, 2, 0xe8e0b0);
      p.ellipse(x + 14, y + h - 12, 5, 4, 0x6a9c48);
      p.ellipse(x + 30, y + h - 14, 3, 3, 0xe8c020);
    } else {
      // Parkoviště: asfalt s bílými stáními.
      const x = dcr.x * TILE;
      const y = dcr.y * TILE;
      const w = dcr.w * TILE;
      const h = dcr.h * TILE;
      p.rect(x, y, w, h, PAL.asphalt[0]);
      p.noise(x, y, w, h, PAL.asphalt, 0.6);
      p.frame(x, y, w, h, 0x6e6658);
      for (let j = 14; j < h - 2; j += 14) p.rect(x + 2, y + j, w - 4, 1, PAL.lineWhite, 0.9);
      p.rect(x + w / 2 - 6, y + 4, 12, 7, 0x2f5fa8);
      p.rect(x + w / 2 - 2, y + 5, 4, 5, 0xffffff);
    }
  }
}

/** Autobusové zastávky: přístřešek a cedule. */
export function paintBusStops(p: Painter, map: WorldMap): void {
  for (const s of map.busStops) {
    const x = s.x;
    const y = s.y;
    p.rect(x + 2, y + 2, 10, 24, PAL.shadow, 0.3);
    p.rect(x, y, 10, 24, 0x5a6a7a);
    p.rect(x, y, 10, 1, 0x9aaabb);
    p.rect(x + 1, y + 1, 8, 22, 0x6e7e8e);
    p.rect(x + 1, y + 3, 1, 18, 0x9ac0d8);
    // Cedule: žlutý ovál se zeleným pruhem
    p.ellipse(x + 5, y + 28, 2, 2, 0xe8c020);
    p.px(x + 5, y + 28, 0x2a7a3a);
  }
}
