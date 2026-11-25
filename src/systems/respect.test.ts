import { describe, expect, it } from 'vitest';
import { darkness, formatClock, isEvening, minuteOfDay } from './clock';
import { applyRespect, attitude, newRespect, normalizeRespect, relation } from './respect';

describe('vztahy skupin', () => {
  it('odpovídají plánu', () => {
    expect(relation('hasici', 'stamgasti')).toBe(1);
    expect(relation('stamgasti', 'omladina')).toBe(-1);
    expect(relation('hasici', 'omladina')).toBe(-1);
  });
  it('jsou souměrné', () => {
    const ids = ['hasici', 'stamgasti', 'omladina'] as const;
    for (const a of ids) for (const b of ids) expect(relation(a, b)).toBe(relation(b, a));
  });
});

describe('respekt', () => {
  it('začíná neutrálně', () => {
    expect(Object.values(newRespect())).toEqual([0, 0, 0]);
  });

  it('zabití z Omladiny: Omladina ↓, Hasiči a Štamgasti trochu ↑', () => {
    const r = applyRespect(newRespect(), 'omladina', 'killMember');
    expect(r.omladina).toBeLessThan(0);
    expect(r.hasici).toBeGreaterThan(0);
    expect(r.stamgasti).toBeGreaterThan(0);
  });

  it('pomoc Hasičům potěší i Štamgasty a naštve Omladinu', () => {
    const r = applyRespect(newRespect(), 'hasici', 'missionYellow');
    expect(r.hasici).toBe(18);
    expect(r.stamgasti).toBeGreaterThan(0);
    expect(r.omladina).toBeLessThan(0);
  });

  it('staré uložení: Dřevaři → Hasiči, Škola → Omladina, Biomatky pryč', () => {
    expect(normalizeRespect({ drevari: 12, stamgasti: -5, ekologove: 40, skola: 7 })).toEqual({ hasici: 12, stamgasti: -5, omladina: 7 });
    expect(normalizeRespect({ hasici: 3 })).toEqual({ hasici: 3, stamgasti: 0, omladina: 0 });
    expect(normalizeRespect(undefined)).toEqual(newRespect());
  });

  it('nejde přes ±100', () => {
    let r = newRespect();
    for (let i = 0; i < 20; i++) r = applyRespect(r, 'omladina', 'killMember');
    expect(r.omladina).toBe(-100);
  });

  it('postoj podle respektu, večer agresivněji', () => {
    expect(attitude(0)).toBe('neutral');
    expect(attitude(60)).toBe('ally');
    expect(attitude(-50)).toBe('hostile');
    expect(attitude(-90)).toBe('hunt');
    expect(attitude(-20, 20)).toBe('hostile');
  });

});

describe('herní čas', () => {
  it('začíná v 16:00 a běží 2 minuty za sekundu', () => {
    expect(formatClock(minuteOfDay(0))).toBe('16:00');
    expect(formatClock(minuteOfDay(60))).toBe('18:00');
    expect(formatClock(minuteOfDay(300))).toBe("02:00");
  });
  it('večer a tma', () => {
    expect(isEvening(19 * 60)).toBe(true);
    expect(isEvening(12 * 60)).toBe(false);
    expect(darkness(12 * 60)).toBe(0);
    expect(darkness(23 * 60)).toBe(0.5);
    expect(darkness(19.5 * 60)).toBeGreaterThan(0);
    expect(darkness(19.5 * 60)).toBeLessThan(0.5);
  });
});
