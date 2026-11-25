import type { Point } from './combat';

/**
 * Vidí bod A bod B? Prochází úsečku po krocích a hledá dlaždici, která brání výhledu.
 * `blocks(tile)` rozhoduje, co je neprůhledné (zdi, stromy, skály).
 */
export function lineOfSight(tiles: number[][], tileSize: number, a: Point, b: Point, blocks: (t: number) => boolean, step = 6): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const n = Math.ceil(dist / step);
  for (let i = 1; i < n; i++) {
    const x = a.x + (dx * i) / n;
    const y = a.y + (dy * i) / n;
    const t = tiles[Math.floor(y / tileSize)]?.[Math.floor(x / tileSize)];
    if (t === undefined || blocks(t)) return false;
  }
  return true;
}
