import { describe, expect, it } from 'vitest';
import { stickWalk } from './stick';

describe('joystick pěšky', () => {
  it('mrtvá zóna, libovolný směr, rychlost podle vychýlení', () => {
    expect(stickWalk(0.1, 0.05).speed).toBe(0);
    const w = stickWalk(0.5, 0.2);
    expect(Math.atan2(w.dy, w.dx)).toBeCloseTo(Math.atan2(0.2, 0.5));
    expect(stickWalk(0.25, 0).speed).toBeCloseTo(0.35);
    expect(stickWalk(1, 0).speed).toBe(1);
  });
});
