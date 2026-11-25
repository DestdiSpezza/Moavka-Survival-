/**
 * Geometrie lomených čar (osy silnic a potoků) v dlaždicových souřadnicích.
 * Mapa je dál mřížka dlaždic, ale silnice a potoky můžou vést šikmo:
 * do mřížky se „promítnou“ podle vzdálenosti středu dlaždice od osy.
 */

export type Pt = readonly [number, number];

export interface Near {
  /** Vzdálenost od osy. */
  d: number;
  /** Poloha na úseku 0..1. */
  t: number;
  /** Na které straně osy bod leží (kladné = vpravo ve směru čáry, osa y míří dolů). */
  side: number;
}

/** Vzdálenost bodu od úsečky a–b. */
export function nearSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): Near {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const qx = ax + dx * t;
  const qy = ay + dy * t;
  const side = Math.sign(-(px - ax) * dy + (py - ay) * dx) || 1;
  return { d: Math.hypot(px - qx, py - qy), t, side };
}

/** Nejmenší vzdálenost bodu od lomené čáry. */
export function distToPolyline(px: number, py: number, pts: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const n = nearSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (n.d < best) best = n.d;
  }
  return best;
}

export function polylineLength(pts: readonly Pt[]): number {
  let len = 0;
  for (let i = 0; i + 1 < pts.length; i++) len += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return len;
}

/** Bod a směr ve vzdálenosti `dist` od začátku čáry. */
export function pointAlong(pts: readonly Pt[], dist: number): { x: number; y: number; dx: number; dy: number } {
  let left = Math.max(0, dist);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (left <= len || i + 2 === pts.length) {
      const t = len ? Math.min(1, left / len) : 0;
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, dx: len ? (bx - ax) / len : 1, dy: len ? (by - ay) / len : 0 };
    }
    left -= len;
  }
  const [x, y] = pts[pts.length - 1];
  return { x, y, dx: 1, dy: 0 };
}

/** Body po čáře v pravidelném rozestupu (včetně konce). */
export function resample(pts: readonly Pt[], step: number): Pt[] {
  const len = polylineLength(pts);
  const n = Math.max(1, Math.round(len / step));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const p = pointAlong(pts, (len * i) / n);
    out.push([p.x, p.y]);
  }
  return out;
}

/** Čára posunutá doprava (ve směru jízdy) o `off`; záporné = doleva. */
export function offsetPath(pts: readonly Pt[], off: number): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    // Vpravo od směru (dx, dy) při ose y dolů je (-dy, dx).
    return [p[0] - (dy / len) * off, p[1] + (dx / len) * off] as Pt;
  });
}

export function reversed(pts: readonly Pt[]): Pt[] {
  return [...pts].reverse();
}

/** Spojí čáry za sebou; shodné body na švech vynechá. */
export function joinPaths(...parts: ReadonlyArray<readonly Pt[]>): Pt[] {
  const out: Pt[] = [];
  for (const part of parts) {
    for (const p of part) {
      const last = out[out.length - 1];
      if (last && Math.hypot(last[0] - p[0], last[1] - p[1]) < 0.05) continue;
      out.push(p);
    }
  }
  return out;
}

/** Úsek čáry od bodu `from` po bod `to` (indexy bodů včetně). */
export function slice(pts: readonly Pt[], from: number, to: number): Pt[] {
  return pts.slice(from, to + 1);
}
