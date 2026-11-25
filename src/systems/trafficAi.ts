import { clamp } from './math';
import type { DriveInput } from './vehicleModel';

export interface Point {
  x: number;
  y: number;
}

/** Rozdíl úhlů v rozsahu -π..π. */
export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Je překážka před autem v jeho pruhu? (vzdálenost dopředu < range, do boku < halfWidth)
 */
export function isAhead(from: Point, angle: number, other: Point, range: number, halfWidth: number): boolean {
  const dx = other.x - from.x;
  const dy = other.y - from.y;
  const ahead = dx * Math.cos(angle) + dy * Math.sin(angle);
  const side = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return ahead > 0 && ahead < range && Math.abs(side) < halfWidth;
}

/** Řízení NPC auta k dalšímu bodu trasy: zatočit k cíli, držet cílovou rychlost, zastavit před překážkou. */
export function steerToward(pos: Point, angle: number, speed: number, target: Point, cruise: number, blocked: boolean): DriveInput {
  const want = Math.atan2(target.y - pos.y, target.x - pos.x);
  const diff = angleDiff(angle, want);
  const steer = clamp(diff * 2.5, -1, 1);
  // V ostré zatáčce zpomalit.
  const desired = blocked ? 0 : cruise * (Math.abs(diff) > 0.6 ? 0.5 : 1);
  let throttle = 0;
  if (speed < desired - 5) throttle = 1;
  else if (speed > desired + 10) throttle = -1;
  return { throttle, steer, handbrake: false };
}
