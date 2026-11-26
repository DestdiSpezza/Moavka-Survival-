import { clamp } from './math';

/** Mrtvá zóna joysticku (podíl poloměru). */
export const STICK_DEAD = 0.2;

/**
 * Joystick pěšky (ADR-031): směr přesně podle joysticku, rychlost podle vychýlení.
 * Vrací jednotkový směr a násobek rychlosti (0 = stojí, 0,35–1 = jde).
 */
export function stickWalk(sx: number, sy: number, dead = STICK_DEAD): { dx: number; dy: number; speed: number } {
  const mag = Math.min(1, Math.hypot(sx, sy));
  if (mag < dead) return { dx: 0, dy: 0, speed: 0 };
  return { dx: sx / Math.hypot(sx, sy), dy: sy / Math.hypot(sx, sy), speed: clamp((mag - dead) / 0.6, 0.35, 1) };
}
