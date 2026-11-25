import type { Point } from './combat';

/** Chování chodců. */

export const PED_WALK = 30;
export const PED_RUN = 85;
export const PED_HP = 40;
export const TOUGH_PED_HP = 70;
export const FLEE_TIME = 5;
/** Šance, že chodec při útěku zavolá policii (bude potřeba ve fázi 4). */
export const CALL_POLICE_CHANCE = 0.35;

/** Směr útěku: přímo od hrozby; když hrozba stojí na chodci, utíká náhodně. */
export function fleeAngle(from: Point, threat: Point, rnd: () => number): number {
  const dx = from.x - threat.x;
  const dy = from.y - threat.y;
  if (Math.hypot(dx, dy) < 1) return rnd() * Math.PI * 2;
  return Math.atan2(dy, dx) + (rnd() - 0.5) * 0.6;
}

/** Slyší chodec výstřel? */
export function hears(listener: Point, source: Point, radius: number): boolean {
  return Math.hypot(listener.x - source.x, listener.y - source.y) <= radius;
}

/** Přejetí: zranění podle rychlosti auta; pomalé couvání nikoho nezabije. */
export function runOverDamage(speed: number): number {
  const s = Math.abs(speed);
  return s < 35 ? 0 : (s - 35) * 0.6;
}
