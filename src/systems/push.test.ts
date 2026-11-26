import { describe, expect, it } from 'vitest';
import { resolvePush, type PushBody } from './push';
import { VEHICLE_TYPES } from '../world/vehicles';

const body = (x: number, vx: number, w: number): PushBody => ({ x, y: 0, r: 6, vx, vy: 0, w });

describe('odtlačování aut', () => {
  it('dodávka odsune osobák i fízly, osobák fízly nepřetlačí', () => {
    const W = (k: keyof typeof VEHICLE_TYPES) => VEHICLE_TYPES[k].weight;
    expect(W('dodavka') / W('policie')).toBeGreaterThanOrEqual(1.8);
    expect(W('traktor') / W('osobak')).toBeGreaterThanOrEqual(1.8);
    expect(W('osobak') / W('policie')).toBeLessThan(1.8);
    expect(W('zasahovka') / W('osobak')).toBeGreaterThanOrEqual(1.8);
  });

  it('těžší auto ustoupí o nic, lehčí o celý překryv', () => {
    const r = resolvePush(body(0, 80, 3), body(10, -40, 1.2))!;
    expect(r.a.dx).toBeCloseTo(0);
    expect(r.b.dx).toBeCloseTo(2);
    // Dodávka skoro nezpomalí, fízl jede s ní.
    expect(r.a.vx).toBeGreaterThan(40);
    expect(r.b.vx).toBeGreaterThan(30);
  });

  it('stejně těžká auta se dělí napůl a zastaví se o sebe', () => {
    const r = resolvePush(body(0, 60, 1), body(10, -60, 1))!;
    expect(r.a.dx).toBeCloseTo(-1);
    expect(r.b.dx).toBeCloseTo(1);
    expect(Math.abs(r.a.vx)).toBeLessThan(15);
  });

  it('stojící fízla osobák neodtlačí, dodávka ano', () => {
    const cop = { ...body(10, 0, 1.2), braked: true };
    const byCar = resolvePush(body(0, 80, 1), cop)!;
    expect(byCar.b.dx).toBeCloseTo(0);
    expect(byCar.b.vx).toBeCloseTo(0);
    expect(byCar.a.dx).toBeCloseTo(-2);
    const byVan = resolvePush(body(0, 80, 2.4), cop)!;
    expect(byVan.b.dx).toBeCloseTo(2);
    expect(byVan.b.vx).toBeGreaterThan(40);
  });

  it('vrak se nehne, bez překryvu nic', () => {
    const r = resolvePush(body(0, 80, 5), body(10, 0, Infinity))!;
    expect(r.b.dx).toBeCloseTo(0);
    expect(r.a.dx).toBeCloseTo(-2);
    expect(r.a.vx).toBeLessThanOrEqual(0);
    expect(resolvePush(body(0, 0, 1), body(20, 0, 1))).toBeNull();
  });
});
