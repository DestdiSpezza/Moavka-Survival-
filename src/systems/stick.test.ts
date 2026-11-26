import { describe, expect, it } from 'vitest';
import { carPedals, stickWalk, wheelSteer } from './stick';

describe('joystick pěšky', () => {
  it('mrtvá zóna, libovolný směr, rychlost podle vychýlení', () => {
    expect(stickWalk(0.1, 0.05).speed).toBe(0);
    const w = stickWalk(0.5, 0.2);
    expect(Math.atan2(w.dy, w.dx)).toBeCloseTo(Math.atan2(0.2, 0.5));
    expect(stickWalk(0.25, 0).speed).toBeCloseTo(0.35);
    expect(stickWalk(1, 0).speed).toBe(1);
  });
});

describe('volant a pedály na mobilu', () => {
  it('nahoře rovně, do strany zatáčí, plný rejd od 70°', () => {
    expect(wheelSteer(0, -100)).toBe(0);
    expect(wheelSteer(100, 0)).toBe(1);
    expect(wheelSteer(-100, 0)).toBe(-1);
    expect(wheelSteer(50, -86.6)).toBeCloseTo(30 / 70);
    expect(wheelSteer(40, 30)).toBe(1);
    expect(wheelSteer(3, 3)).toBe(0);
  });

  it('plyn podle zařazení, brzda jen brzdí', () => {
    expect(carPedals(true, false, false, 0).throttle).toBe(1);
    expect(carPedals(true, false, true, 0).throttle).toBe(-1);
    expect(carPedals(false, true, false, 80).throttle).toBe(-1);
    expect(carPedals(false, true, true, -40).throttle).toBe(1);
    expect(carPedals(false, true, false, 0)).toEqual({ throttle: 0, hold: true });
    expect(carPedals(true, true, false, 0)).toEqual({ throttle: 0, hold: true });
  });
});
