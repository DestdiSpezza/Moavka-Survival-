/**
 * Srážka dvou vozidel (ADR-032). Tělo je kruh; auta se rozdělí podle váhy.
 * Je-li jedno aspoň PUSH_RATIO× těžší, celý překryv ustoupí to lehčí
 * (dodávka, traktor nebo zásahovka odsune osobák i fízly), jinak se dělí
 * podle váhy a osobák s fízlem se zaseknou o sebe jako dřív.
 */

export const PUSH_RATIO = 1.8;
/** Pružnost nárazu (0 = drcnou se a jedou spolu, 1 = odrazí se jako koule). */
const BOUNCE = 0.15;

export interface PushBody {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  /** Váha (osobák = 1); Infinity = nehne se (vrak). */
  w: number;
  /** Stojí na brzdě (zaparkované nebo stojící auto): odsune ho jen o hodně těžší. */
  braked?: boolean;
}

export interface PushResult {
  /** Posun pozice a nová rychlost obou těl. */
  a: { dx: number; dy: number; vx: number; vy: number };
  b: { dx: number; dy: number; vx: number; vy: number };
}

export function resolvePush(a0: PushBody, b0: PushBody): PushResult | null {
  // Zabrzděné auto se lehčímu nebo stejně těžkému nepohne.
  const a = a0.braked && !(b0.w >= a0.w * PUSH_RATIO) ? { ...a0, w: Infinity } : a0;
  const b = b0.braked && !(a0.w >= b0.w * PUSH_RATIO) ? { ...b0, w: Infinity } : b0;
  let nx = b.x - a.x;
  let ny = b.y - a.y;
  let d = Math.hypot(nx, ny);
  const overlap = a.r + b.r - d;
  if (overlap <= 0) return null;
  if (d < 1e-6) {
    nx = 1;
    ny = 0;
    d = 1;
  } else {
    nx /= d;
    ny /= d;
  }
  // Jakou část překryvu ustoupí A (zbytek B).
  let shareA: number;
  if (a.w === Infinity && b.w === Infinity) shareA = 0.5;
  else if (a.w === Infinity || a.w >= b.w * PUSH_RATIO) shareA = 0;
  else if (b.w === Infinity || b.w >= a.w * PUSH_RATIO) shareA = 1;
  else shareA = b.w / (a.w + b.w);

  // Impuls jen když se k sobě přibližují.
  const inv = (w: number) => (w === Infinity ? 0 : 1 / w);
  const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  let ja = 0;
  let jb = 0;
  if (vrel < 0 && inv(a.w) + inv(b.w) > 0) {
    const j = (-(1 + BOUNCE) * vrel) / (inv(a.w) + inv(b.w));
    ja = -j * inv(a.w);
    jb = j * inv(b.w);
  }
  // Zabrzděné auto, které se nepohnulo, si nechá svou rychlost.
  return {
    a: { dx: -nx * overlap * shareA, dy: -ny * overlap * shareA, vx: a.vx + nx * ja, vy: a.vy + ny * ja },
    b: { dx: nx * overlap * (1 - shareA), dy: ny * overlap * (1 - shareA), vx: b.vx + nx * jb, vy: b.vy + ny * jb },
  };
}
