import { clamp } from './math';

export const WALK_SPEED = 70;
export const SPRINT_SPEED = 125;
export const STAMINA_MAX = 100;
const STAMINA_DRAIN = 35; // za sekundu sprintu
const STAMINA_REGEN = 22; // za sekundu bez sprintu
const STAMINA_MIN_TO_SPRINT = 15;

export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  /** Analogový směr (joystick): jednotkový vektor a násobek rychlosti; má přednost před šipkami. */
  analog?: { dx: number; dy: number; speed: number };
}

export interface MoveState {
  stamina: number;
  /** Po vyčerpání musí hráč nabrat dech, než může znovu sprintovat. */
  exhausted: boolean;
}

export interface MoveResult {
  vx: number;
  vy: number;
  sprinting: boolean;
  state: MoveState;
}

/**
 * Spočítá rychlost hráče pro jeden snímek.
 * Diagonální pohyb je normalizovaný, aby nebyl rychlejší než rovný.
 */
export function computeMove(input: MoveInput, state: MoveState, dt: number, terrainFactor: number): MoveResult {
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  let scale = 1;
  if (input.analog && input.analog.speed > 0 && dx === 0 && dy === 0) {
    dx = input.analog.dx;
    dy = input.analog.dy;
    scale = input.analog.speed;
  }
  const moving = dx !== 0 || dy !== 0;
  if (moving) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }

  let exhausted = state.exhausted;
  if (exhausted && state.stamina >= STAMINA_MIN_TO_SPRINT) exhausted = false;
  const sprinting = moving && input.sprint && !exhausted && state.stamina > 0;

  let stamina = state.stamina + (sprinting ? -STAMINA_DRAIN : STAMINA_REGEN) * dt;
  stamina = clamp(stamina, 0, STAMINA_MAX);
  if (stamina === 0) exhausted = true;

  const speed = (sprinting ? SPRINT_SPEED : WALK_SPEED * scale) * terrainFactor;
  return { vx: dx * speed, vy: dy * speed, sprinting, state: { stamina, exhausted } };
}
