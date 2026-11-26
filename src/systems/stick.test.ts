import { describe, expect, it } from 'vitest';
import { stickDrive, stickWalk } from './stick';
import { forwardSpeed, stepDrive, surfaceFor, type DriveState } from './vehicleModel';
import { VEHICLE_TYPES } from '../world/vehicles';
import { Tile } from '../world/tiles';

describe('joystick pěšky', () => {
  it('mrtvá zóna, libovolný směr, rychlost podle vychýlení', () => {
    expect(stickWalk(0.1, 0.05).speed).toBe(0);
    const w = stickWalk(0.5, 0.2);
    expect(Math.atan2(w.dy, w.dx)).toBeCloseTo(Math.atan2(0.2, 0.5));
    expect(stickWalk(0.25, 0).speed).toBeCloseTo(0.35);
    expect(stickWalk(1, 0).speed).toBe(1);
  });
});

describe('joystick v autě', () => {
  it('stočí auto tam, kam joystick ukazuje', () => {
    // Auto míří doprava, joystick dolů (na obrazovce) → zatočit doprava (úhel roste).
    const r = stickDrive(0, 1, 0, 100);
    expect(r.throttle).toBeGreaterThan(0);
    expect(r.steer).toBe(1);
    expect(stickDrive(1, 0, 0, 100).steer).toBe(0);
    expect(stickDrive(0.05, 0.05, 0, 0)).toEqual({ throttle: 0, steer: 0 });
  });

  it('úplně dozadu ze stání = couvání', () => {
    expect(stickDrive(-1, 0, 0, 0).throttle).toBeLessThan(0);
    // V rychlosti se necouvá, ale ubere plyn a zatáčí.
    const fast = stickDrive(-1, 0.05, 0, 150);
    expect(fast.throttle).toBeGreaterThan(0);
    expect(fast.throttle).toBeLessThan(0.5);
  });

  it('v jízdním modelu se auto do dvou vteřin otočí po joysticku', () => {
    const car = VEHICLE_TYPES.osobak.params;
    const road = surfaceFor(Tile.Road, false);
    let s: DriveState = { angle: 0, vx: 0, vy: 0 };
    for (let i = 0; i < 120; i++) {
      const t = stickDrive(0, 1, s.angle, forwardSpeed(s));
      s = stepDrive(s, { ...t, handbrake: false }, car, road, 1 / 60);
    }
    expect(s.angle).toBeGreaterThan(Math.PI / 2 - 0.25);
    expect(s.angle).toBeLessThan(Math.PI / 2 + 0.25);
    expect(forwardSpeed(s)).toBeGreaterThan(30);
  });
});
