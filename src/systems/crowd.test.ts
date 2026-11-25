import { describe, expect, it } from 'vitest';
import { fleeAngle, hears, runOverDamage } from './crowd';

describe('chodci', () => {
  it('utíkají od hrozby', () => {
    const a = fleeAngle({ x: 10, y: 0 }, { x: 0, y: 0 }, () => 0.5);
    expect(Math.cos(a)).toBeGreaterThan(0.9);
  });
  it('slyší výstřel jen v dosahu', () => {
    expect(hears({ x: 0, y: 0 }, { x: 100, y: 0 }, 150)).toBe(true);
    expect(hears({ x: 0, y: 0 }, { x: 200, y: 0 }, 150)).toBe(false);
  });
  it('přejetí bolí podle rychlosti, pomalé ťuknutí ne', () => {
    expect(runOverDamage(20)).toBe(0);
    expect(runOverDamage(150)).toBeGreaterThan(60);
  });
});
