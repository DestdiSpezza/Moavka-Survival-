import { describe, expect, it } from 'vitest';
import { computeMove, SPRINT_SPEED, STAMINA_MAX, WALK_SPEED, type MoveInput } from './movement';

const none: MoveInput = { up: false, down: false, left: false, right: false, sprint: false };
const fresh = { stamina: STAMINA_MAX, exhausted: false };

describe('computeMove', () => {
  it('stojí, když se nic nedrží', () => {
    const r = computeMove(none, fresh, 0.016, 1);
    expect(r.vx).toBe(0);
    expect(r.vy).toBe(0);
  });

  it('diagonála není rychlejší než rovný pohyb', () => {
    const r = computeMove({ ...none, up: true, right: true }, fresh, 0.016, 1);
    expect(Math.hypot(r.vx, r.vy)).toBeCloseTo(WALK_SPEED);
  });

  it('sprint je rychlejší a ubírá výdrž', () => {
    const r = computeMove({ ...none, right: true, sprint: true }, fresh, 1, 1);
    expect(r.vx).toBeCloseTo(SPRINT_SPEED);
    expect(r.state.stamina).toBeLessThan(STAMINA_MAX);
  });

  it('terén zpomaluje', () => {
    const r = computeMove({ ...none, right: true }, fresh, 0.016, 0.5);
    expect(r.vx).toBeCloseTo(WALK_SPEED * 0.5);
  });

  it('po vyčerpání nejde sprintovat, dokud hráč nenabere dech', () => {
    let state = { stamina: 1, exhausted: false };
    const run = { ...none, right: true, sprint: true };
    state = computeMove(run, state, 1, 1).state;
    expect(state.exhausted).toBe(true);
    expect(computeMove(run, state, 0.1, 1).sprinting).toBe(false);
    // Nabrat dech (stání)
    for (let i = 0; i < 10; i++) state = computeMove(none, state, 0.1, 1).state;
    expect(computeMove(run, state, 0.016, 1).sprinting).toBe(true);
  });
});
