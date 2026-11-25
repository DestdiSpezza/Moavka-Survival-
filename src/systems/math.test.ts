import { describe, expect, it } from 'vitest';
import { clamp } from './math';

describe('clamp', () => {
  it('nechá hodnotu v rozsahu beze změny', () => {
    expect(clamp(42, -100, 100)).toBe(42);
  });
  it('ořízne hodnoty mimo rozsah', () => {
    expect(clamp(150, -100, 100)).toBe(100);
    expect(clamp(-150, -100, 100)).toBe(-100);
  });
  it('odmítne obrácený rozsah', () => {
    expect(() => clamp(1, 5, 0)).toThrow();
  });
});
