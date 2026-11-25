import { clamp } from './math';
import { Tile } from '../world/tiles';

/** Parametry jednoho typu vozidla. Rychlosti v px/s, úhly v radiánech. */
export interface VehicleParams {
  maxSpeed: number;
  reverseSpeed: number;
  accel: number;
  brake: number;
  /** Rychlost otáčení při plné rychlosti (rad/s). */
  turnRate: number;
  /** Jak rychle pneumatiky zastaví smyk do boku (vyšší = méně klouže). */
  grip: number;
  /** Terénní vozidla v trávě a lese tolik neztrácí. */
  offroad: boolean;
}

export interface DriveInput {
  /** -1 = brzda/couvání, 1 = plyn */
  throttle: number;
  /** -1 = doleva, 1 = doprava */
  steer: number;
  handbrake: boolean;
}

export interface DriveState {
  angle: number;
  vx: number;
  vy: number;
}

export interface Surface {
  speed: number;
  grip: number;
  accel: number;
}

const ROAD: Surface = { speed: 1, grip: 1, accel: 1 };
const SURFACES: Record<number, Surface> = {
  [Tile.Road]: ROAD,
  [Tile.Bridge]: ROAD,
  [Tile.Dam]: ROAD,
  [Tile.Sidewalk]: { speed: 0.9, grip: 0.95, accel: 1 },
  [Tile.Grass]: { speed: 0.6, grip: 0.7, accel: 0.8 },
  [Tile.Dirt]: { speed: 0.75, grip: 0.8, accel: 0.9 },
  [Tile.ForestFloor]: { speed: 0.35, grip: 0.6, accel: 0.6 },
};

/** Povrch pod autem. Terénní vozidla mají penalizaci jen zhruba třetinovou. */
export function surfaceFor(tile: number, offroad: boolean): Surface {
  const s = SURFACES[tile] ?? ROAD;
  if (!offroad) return s;
  const soften = (f: number) => 1 - (1 - f) * 0.35;
  return { speed: soften(s.speed), grip: soften(s.grip), accel: soften(s.accel) };
}

const ROLL_DRAG = 60;
const STOP_EPS = 5;

/**
 * Jeden krok jízdního modelu shora.
 * Rychlost se rozloží na podélnou (plyn, brzda) a boční složku (smyk).
 * Boční složku tlumí přilnavost pneumatik; ruční brzda ji skoro vypne, takže auto driftuje.
 * Zatáčet jde jen za jízdy; při couvání se řízení otočí samo.
 */
export function stepDrive(state: DriveState, input: DriveInput, p: VehicleParams, surface: Surface, dt: number): DriveState {
  const fx = Math.cos(state.angle);
  const fy = Math.sin(state.angle);
  let vf = state.vx * fx + state.vy * fy;
  let vl = state.vx * -fy + state.vy * fx;

  // Terén omezuje maximální rychlost.
  const top = p.maxSpeed * surface.speed;
  const rev = p.reverseSpeed * surface.speed;

  const throttle = clamp(input.throttle, -1, 1);
  if (throttle > 0) {
    if (vf < -STOP_EPS) vf = Math.min(0, vf + p.brake * dt);
    else if (vf < top) vf = Math.min(top, vf + p.accel * throttle * surface.accel * dt);
  } else if (throttle < 0) {
    if (vf > STOP_EPS) vf = Math.max(0, vf - p.brake * dt);
    else if (vf > -rev) vf = Math.max(-rev, vf - p.accel * 0.6 * -throttle * surface.accel * dt);
  } else {
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), ROLL_DRAG * dt);
  }
  if (input.handbrake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), p.brake * 0.5 * dt);

  // Když auto vjede z asfaltu do trávy rychleji, než tam jde, plynule zpomalí.
  if (vf > top) vf -= (vf - top) * Math.min(1, 3 * dt);
  if (vf < -rev) vf -= (vf + rev) * Math.min(1, 3 * dt);

  const gripRate = p.grip * surface.grip * (input.handbrake ? 0.12 : 1);
  vl *= Math.exp(-gripRate * dt);

  const steerFactor = clamp(vf / 60, -1, 1);
  const angle = state.angle + clamp(input.steer, -1, 1) * p.turnRate * steerFactor * dt * (input.handbrake ? 1.4 : 1);

  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  return { angle, vx: nx * vf - ny * vl, vy: ny * vf + nx * vl };
}

/** Podélná rychlost (kladná = dopředu). */
export function forwardSpeed(s: DriveState): number {
  return s.vx * Math.cos(s.angle) + s.vy * Math.sin(s.angle);
}

/** Boční rychlost (smyk). */
export function lateralSpeed(s: DriveState): number {
  return -s.vx * Math.sin(s.angle) + s.vy * Math.cos(s.angle);
}

/** Převod px/s na km/h pro tachometr (1 px ≈ 14 cm). */
export function toKmh(pxPerSecond: number): number {
  return Math.round(Math.abs(pxPerSecond) * 0.5);
}
