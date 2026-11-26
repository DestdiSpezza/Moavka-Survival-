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

/** Kolik stupňů od svislice je plný rejd volantu. */
export const WHEEL_FULL_DEG = 70;

/**
 * Volant na mobilu (ADR-033): půlkruh vlevo dole. Rejd je úhel prstu od středu
 * volantu: nahoře rovně, vlevo/vpravo do strany (plný rejd 70° od svislice).
 * dx, dy = prst minus střed volantu (y dolů kladně). Vrací -1..1.
 */
export function wheelSteer(dx: number, dy: number): number {
  if (Math.hypot(dx, dy) < 14) return 0;
  // Úhel od svislice nahoru; prst pod středem = plný rejd na tu stranu.
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const s = clamp(deg / WHEEL_FULL_DEG, -1, 1);
  return Math.abs(s) < 0.06 ? 0 : s;
}

/**
 * Pedály na mobilu (ADR-033): PLYN jede podle zařazené rychlosti (dopředu, nebo
 * zpátečka), BRZDA jen brzdí (proti směru jízdy) a ve stání drží auto.
 */
export function carPedals(gas: boolean, brake: boolean, reverse: boolean, speed: number): { throttle: number; hold: boolean } {
  if (brake) {
    if (speed > 5) return { throttle: -1, hold: false };
    if (speed < -5) return { throttle: 1, hold: false };
    return { throttle: 0, hold: true };
  }
  if (gas) return { throttle: reverse ? -1 : 1, hold: false };
  return { throttle: 0, hold: false };
}
