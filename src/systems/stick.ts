import { clamp } from './math';

/** Mrtvá zóna joysticku (podíl poloměru). */
export const STICK_DEAD = 0.2;

/** Úhel do rozsahu -π..π. */
function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Joystick pěšky (ADR-031): směr přesně podle joysticku, rychlost podle vychýlení.
 * Vrací jednotkový směr a násobek rychlosti (0 = stojí, 0,35–1 = jde).
 */
export function stickWalk(sx: number, sy: number, dead = STICK_DEAD): { dx: number; dy: number; speed: number } {
  const mag = Math.min(1, Math.hypot(sx, sy));
  if (mag < dead) return { dx: 0, dy: 0, speed: 0 };
  return { dx: sx / Math.hypot(sx, sy), dy: sy / Math.hypot(sx, sy), speed: clamp((mag - dead) / 0.6, 0.35, 1) };
}

/**
 * Joystick v autě (ADR-031): hráč ukazuje, kam má auto jet (směr na obrazovce),
 * auto se tam stočí samo. Plyn podle vychýlení. Ukáže-li hráč skoro dozadu
 * a auto skoro stojí (nebo už couvá), auto couvá a natáčí se zádí.
 * `angle` je natočení auta, `vf` jeho podélná rychlost (kladná = dopředu).
 */
export function stickDrive(sx: number, sy: number, angle: number, vf: number, dead = STICK_DEAD): { throttle: number; steer: number } {
  const mag = Math.min(1, Math.hypot(sx, sy));
  if (mag < dead) return { throttle: 0, steer: 0 };
  const want = Math.atan2(sy, sx);
  const diff = wrap(want - angle);
  const behind = Math.abs(diff);
  const reverse = (behind > 2.6 && vf < 40) || (vf < -5 && behind > 1.9);
  const power = clamp((mag - dead) / 0.6, 0.3, 1);
  if (reverse) {
    // Záď (úhel + π) má mířit k cíli; při couvání se řízení samo otáčí, proto minus.
    const back = wrap(want - (angle + Math.PI));
    return { throttle: -power, steer: -clamp(back * 2.2, -1, 1) };
  }
  // Ostrá otočka ve vyšší rychlosti: ubrat plyn, ať auto zatočí.
  const throttle = behind > 1.6 && vf > 80 ? power * 0.3 : power;
  return { throttle, steer: clamp(diff * 2.2, -1, 1) };
}
