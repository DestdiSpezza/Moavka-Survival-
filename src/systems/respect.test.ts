import { describe, expect, it } from 'vitest';
import { darkness, formatClock, isEvening, minuteOfDay } from './clock';
import { applyRespect, attitude, ecoAngryAtVehicle, missionTiers, newRespect, relation } from './respect';

describe('vztahy skupin', () => {
  it('odpovídají plánu', () => {
    expect(relation('drevari', 'ekologove')).toBe(-2);
    expect(relation('drevari', 'stamgasti')).toBe(1);
    expect(relation('stamgasti', 'skola')).toBe(-1);
    expect(relation('ekologove', 'skola')).toBe(-1);
    expect(relation('drevari', 'skola')).toBe(0);
  });
  it('jsou souměrné', () => {
    const ids = ['drevari', 'stamgasti', 'ekologove', 'skola'] as const;
    for (const a of ids) for (const b of ids) expect(relation(a, b)).toBe(relation(b, a));
  });
});

describe('respekt', () => {
  it('začíná neutrálně', () => {
    expect(Object.values(newRespect())).toEqual([0, 0, 0, 0]);
  });

  it('zabití Biomatky: Biomatky ↓, Dřevaři ↑, Omladina trochu ↑', () => {
    const r = applyRespect(newRespect(), 'ekologove', 'killMember');
    expect(r.ekologove).toBeLessThan(0);
    expect(r.drevari).toBeGreaterThan(0);
    expect(r.skola).toBeGreaterThan(0);
    expect(r.drevari).toBeGreaterThan(r.skola);
    expect(r.stamgasti).toBe(0);
  });

  it('pomoc Dřevařům potěší i Štamgasty a naštve Biomatky', () => {
    const r = applyRespect(newRespect(), 'drevari', 'missionYellow');
    expect(r.drevari).toBe(18);
    expect(r.stamgasti).toBeGreaterThan(0);
    expect(r.ekologove).toBeLessThan(0);
  });

  it('nejde přes ±100', () => {
    let r = newRespect();
    for (let i = 0; i < 20; i++) r = applyRespect(r, 'skola', 'killMember');
    expect(r.skola).toBe(-100);
  });

  it('postoj podle respektu, večer agresivněji', () => {
    expect(attitude(0)).toBe('neutral');
    expect(attitude(60)).toBe('ally');
    expect(attitude(-50)).toBe('hostile');
    expect(attitude(-90)).toBe('hunt');
    expect(attitude(-20, 20)).toBe('hostile');
  });

  it('zakázky se odemykají respektem', () => {
    expect(missionTiers(0)).toEqual(['green']);
    expect(missionTiers(30)).toEqual(['green', 'yellow']);
    expect(missionTiers(80)).toEqual(['green', 'yellow', 'red']);
  });

  it('Biomatkám nevadí kolo, traktor ano i při slušném respektu', () => {
    expect(ecoAngryAtVehicle(0, 'kolo', false)).toBe(false);
    expect(ecoAngryAtVehicle(0, 'osobak', false)).toBe(true);
    expect(ecoAngryAtVehicle(55, 'osobak', false)).toBe(false);
    expect(ecoAngryAtVehicle(55, 'traktor', false)).toBe(true);
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
