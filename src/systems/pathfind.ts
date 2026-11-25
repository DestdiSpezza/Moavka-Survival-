/**
 * Hledání cesty po dlaždicích (Dijkstra s binární haldou).
 * `cost(tile)` vrací cenu vstupu na dlaždici, nebo Infinity pro neprůjezdnou.
 * Vrací seznam dlaždic [x, y] od startu do cíle, nebo null.
 */
export function findPath(
  tiles: number[][],
  start: [number, number],
  goal: [number, number],
  cost: (tile: number, x: number, y: number) => number,
  maxNodes = 20000,
): Array<[number, number]> | null {
  const h = tiles.length;
  const w = tiles[0].length;
  const idx = (x: number, y: number) => y * w + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  if (!inside(...start) || !inside(...goal)) return null;

  const dist = new Float64Array(w * h).fill(Infinity);
  const prev = new Int32Array(w * h).fill(-1);
  const heap: Array<[number, number]> = [];
  const push = (d: number, i: number) => {
    heap.push([d, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };

  const s = idx(...start);
  const g = idx(...goal);
  dist[s] = 0;
  push(0, s);
  let visited = 0;
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    if (i === g) break;
    if (++visited > maxNodes) return null;
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(nx, ny)) continue;
      // Diagonálou jen tam, kde nejsou rohy zablokované (auto by se zaseklo o roh).
      if (dx && dy && (cost(tiles[y][nx], nx, y) === Infinity || cost(tiles[ny][x], x, ny) === Infinity)) continue;
      const c = cost(tiles[ny][nx], nx, ny);
      if (c === Infinity) continue;
      const nd = d + c * (dx && dy ? Math.SQRT2 : 1);
      const ni = idx(nx, ny);
      if (nd < dist[ni]) {
        dist[ni] = nd;
        prev[ni] = i;
        push(nd, ni);
      }
    }
  }
  if (dist[g] === Infinity) return null;
  const path: Array<[number, number]> = [];
  for (let i = g; i !== -1; i = prev[i]) path.push([i % w, Math.floor(i / w)]);
  return path.reverse();
}
