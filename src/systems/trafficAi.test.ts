import { describe, expect, it } from 'vitest';
import { angleDiff, isAhead, steerToward } from './trafficAi';

describe('řízení provozu', () => {
  it('rozdíl úhlů je vždy nejkratší cestou', () => {
    expect(angleDiff(0.1, -0.1)).toBeCloseTo(-0.2);
    expect(angleDiff(3, -3)).toBeCloseTo(2 * Math.PI - 6);
  });

  it('pozná překážku v pruhu před sebou, ne vedle ani za sebou', () => {
    const me = { x: 0, y: 0 };
    expect(isAhead(me, 0, { x: 20, y: 2 }, 30, 8)).toBe(true);
    expect(isAhead(me, 0, { x: 20, y: 16 }, 30, 8)).toBe(false);
    expect(isAhead(me, 0, { x: -20, y: 0 }, 30, 8)).toBe(false);
  });

  it('zatočí k cíli a před překážkou brzdí', () => {
    const go = steerToward({ x: 0, y: 0 }, 0, 0, { x: 10, y: 10 }, 90, false);
    expect(go.steer).toBeGreaterThan(0);
    expect(go.throttle).toBe(1);
    const stop = steerToward({ x: 0, y: 0 }, 0, 80, { x: 50, y: 0 }, 90, true);
    expect(stop.throttle).toBe(-1);
  });
});
