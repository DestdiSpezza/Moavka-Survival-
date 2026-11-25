import { describe, expect, it } from 'vitest';
import { canAfford, repairCost, resprayCost, sellPrice, SHOP } from './economy';
import { deserialize, newProgress, serialize } from './save';
import { driftScore, escapeBonus, isDrifting, wreckScore } from './score';

describe('skóre', () => {
  it('útěk z páté úrovně má mnohem větší cenu než z první', () => {
    expect(escapeBonus(1)).toBe(50);
    expect(escapeBonus(5)).toBe(1250);
  });
  it('řetězová reakce se vyplácí', () => {
    expect(wreckScore(3)).toBeGreaterThan(wreckScore(1) * 3);
  });
  it('drift jen při rychlosti a smyku, krátký se nepočítá', () => {
    expect(isDrifting(150, 80)).toBe(true);
    expect(isDrifting(50, 80)).toBe(false);
    expect(driftScore(0.5)).toBe(0);
    expect(driftScore(2)).toBe(30);
  });
});

describe('ekonomika', () => {
  it('rozbité auto se prodá levněji, policejní dráž', () => {
    expect(sellPrice('osobak', 0.3)).toBeLessThan(sellPrice('osobak', 1));
    expect(sellPrice('policie', 1)).toBeGreaterThan(sellPrice('osobak', 1));
    expect(sellPrice('kolo', 0)).toBeGreaterThan(0);
  });
  it('oprava podle poškození, celé auto zdarma', () => {
    expect(repairCost(100, 100)).toBe(0);
    expect(repairCost(95, 100)).toBe(50);
    expect(repairCost(20, 100)).toBe(160);
  });
  it('přelakování dráž při vyšší hledanosti', () => {
    expect(resprayCost(3)).toBeGreaterThan(resprayCost(1));
  });
  it('obchod a peníze', () => {
    expect(SHOP.length).toBeGreaterThanOrEqual(5);
    expect(canAfford(100, 120)).toBe(false);
  });
});

describe('ukládání', () => {
  it('uložený postup se načte beze změny', () => {
    const p = { ...newProgress(), money: 4321, unlocked: ['moravka', 'raskovice'] as const, area: 'raskovice' as const };
    expect(deserialize(serialize(p as never))).toEqual(p);
  });
  it('poškozená data nevadí', () => {
    expect(deserialize('{nesmysl')).toBeNull();
    expect(deserialize('{"version":2}')).toBeNull();
    expect(deserialize('{"version":3,"money":1,"area":"moravka","arsenal":{}}')).toBeNull();
    expect(deserialize(null)).toBeNull();
  });
  it('uložení z doby zakázek (verze 1) se převede na příběh: Akt 1 bez úvodní scény, peníze zůstanou', () => {
    const p = deserialize(JSON.stringify({ version: 1, area: 'moravka', money: 10, arsenal: newProgress().arsenal, missionsDone: { moravka: ['drevari-pila'] } }));
    expect(p?.version).toBe(2);
    expect(p?.hideouts).toEqual([]);
    expect(p?.score).toBe(0);
    expect(p?.money).toBe(10);
    expect(p?.story).toMatchObject({ act: 1, mission: 'a1-hospoda', introDone: true });
    expect(p?.hero.gender).toBe('m');
    expect('missionsDone' in (p ?? {})).toBe(false);
  });

  it('nová hra si pamatuje hrdinku a jméno a začne úvodní scénou', () => {
    const p = newProgress({ gender: 'f', name: 'Jarmila' });
    expect(deserialize(serialize(p))?.hero).toEqual({ gender: 'f', name: 'Jarmila' });
    expect(p.story).toMatchObject({ act: 1, mission: 'a1-prijezd', introDone: false });
  });
});
