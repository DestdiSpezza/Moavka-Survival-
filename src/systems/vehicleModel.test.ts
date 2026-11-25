import { describe, expect, it } from 'vitest';
import { Tile } from '../world/tiles';
import { VEHICLE_TYPES } from '../world/vehicles';
import { forwardSpeed, lateralSpeed, stepDrive, surfaceFor, type DriveInput, type DriveState } from './vehicleModel';

const car = VEHICLE_TYPES.osobak.params;
const tractor = VEHICLE_TYPES.traktor.params;
const road = surfaceFor(Tile.Road, false);
const idle: DriveInput = { throttle: 0, steer: 0, handbrake: false };
const still: DriveState = { angle: 0, vx: 0, vy: 0 };

function drive(state: DriveState, input: DriveInput, seconds: number, p = car, surface = road): DriveState {
  for (let t = 0; t < seconds; t += 1 / 60) state = stepDrive(state, input, p, surface, 1 / 60);
  return state;
}

describe('jízdní model', () => {
  it('plyn rozjede auto, ale ne nad maximální rychlost', () => {
    const s = drive(still, { ...idle, throttle: 1 }, 10);
    expect(forwardSpeed(s)).toBeGreaterThan(car.maxSpeed * 0.95);
    expect(forwardSpeed(s)).toBeLessThanOrEqual(car.maxSpeed + 1);
  });

  it('stojící auto nezatočí', () => {
    const s = drive(still, { ...idle, steer: 1 }, 1);
    expect(s.angle).toBe(0);
  });

  it('brzda zastaví a pak auto couvá', () => {
    let s = drive(still, { ...idle, throttle: 1 }, 2);
    s = drive(s, { ...idle, throttle: -1 }, 4);
    expect(forwardSpeed(s)).toBeLessThan(0);
    expect(forwardSpeed(s)).toBeGreaterThanOrEqual(-car.reverseSpeed - 1);
  });

  it('bez plynu auto samo dojede', () => {
    let s = drive(still, { ...idle, throttle: 1 }, 1);
    s = drive(s, idle, 10);
    expect(Math.abs(forwardSpeed(s))).toBeLessThan(1);
  });

  it('ruční brzda v zatáčce dělá smyk', () => {
    const fast = drive(still, { ...idle, throttle: 1 }, 3);
    const normal = drive(fast, { throttle: 1, steer: 1, handbrake: false }, 0.4);
    const drift = drive(fast, { throttle: 1, steer: 1, handbrake: true }, 0.4);
    expect(Math.abs(lateralSpeed(drift))).toBeGreaterThan(Math.abs(lateralSpeed(normal)) * 2);
  });

  it('v trávě je auto pomalejší než na silnici', () => {
    const grass = surfaceFor(Tile.Grass, false);
    const onGrass = drive(still, { ...idle, throttle: 1 }, 10, car, grass);
    expect(forwardSpeed(onGrass)).toBeLessThan(car.maxSpeed * 0.65);
  });

  it('traktoru les vadí míň než osobáku', () => {
    expect(surfaceFor(Tile.ForestFloor, true).speed).toBeGreaterThan(surfaceFor(Tile.ForestFloor, false).speed);
    const inForest = drive(still, { ...idle, throttle: 1 }, 10, tractor, surfaceFor(Tile.ForestFloor, true));
    expect(forwardSpeed(inForest)).toBeGreaterThan(tractor.maxSpeed * 0.7);
  });
});
