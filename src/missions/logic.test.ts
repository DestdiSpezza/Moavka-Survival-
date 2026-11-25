import { describe, expect, it } from 'vitest';
import { createRng } from '../systems/rng';
import { GROUP_IDS } from '../systems/respect';
import { MISSIONS } from './catalog';
import { COMPLICATION_CHANCE, offersFor, refusesWork, rewardFor, rollComplication } from './logic';

describe('katalog zakázek', () => {
  it('Morávka má aspoň 10 zakázek a pokrývá všech 11 typů', () => {
    const m = MISSIONS.filter((x) => x.area === 'moravka');
    expect(m.length).toBeGreaterThanOrEqual(10);
    expect(new Set(m.map((x) => x.type)).size).toBe(11);
  });

  it.each(['moravka', 'raskovice'] as const)('%s: každá skupina má zelenou zakázku, všechny barvy zastoupené', (area) => {
    const m = MISSIONS.filter((x) => x.area === area);
    for (const g of GROUP_IDS) expect(m.some((x) => x.group === g && x.tier === 'green'), g).toBe(true);
    for (const t of ['green', 'yellow', 'red']) expect(m.some((x) => x.tier === t)).toBe(true);
  });

  it('nabídka v Raškovicích je raškovická', () => {
    for (const o of offersFor('skola', 80, new Set(), 'raskovice')) expect(o.area).toBe('raskovice');
  });

  it('id jsou unikátní', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });
});

describe('nabídka', () => {
  it('na začátku jen zelená, s respektem i žlutá a červená', () => {
    expect(offersFor('drevari', 0, new Set()).map((m) => m.tier)).toEqual(['green']);
    expect(offersFor('drevari', 35, new Set()).map((m) => m.tier)).toEqual(['green', 'yellow']);
    expect(offersFor('drevari', 70, new Set()).map((m) => m.tier)).toEqual(['green', 'yellow', 'red']);
  });

  it('přednost má nesplněná zakázka', () => {
    const first = offersFor('drevari', 40, new Set())[1];
    const next = offersFor('drevari', 40, new Set([first.id]))[1];
    expect(next.id).not.toBe(first.id);
    expect(next.tier).toBe('yellow');
  });

  it('nepřátelská skupina práci nedá', () => {
    expect(refusesWork(-40)).toBe(true);
    expect(refusesWork(0)).toBe(false);
  });
});

describe('odměny a komplikace', () => {
  it('těžší zakázka platí víc', () => {
    const rnd = createRng(3);
    expect(rewardFor('red', rnd).money).toBeGreaterThan(rewardFor('green', rnd).money);
    expect(rewardFor('yellow', () => 0).score).toBeGreaterThan(rewardFor('green', () => 0).score);
  });

  it('komplikace přichází častěji u těžších zakázek', () => {
    const count = (tier: 'green' | 'red') => {
      const rnd = createRng(7);
      let n = 0;
      for (let i = 0; i < 2000; i++) if (rollComplication(tier, 3, true, rnd)) n++;
      return n / 2000;
    };
    expect(count('green')).toBeCloseTo(COMPLICATION_CHANCE.green, 1);
    expect(count('red')).toBeGreaterThan(count('green'));
  });

  it('porucha auta jen u misí s autem; komplikace nepřijde v prvním kroku', () => {
    const rnd = createRng(11);
    for (let i = 0; i < 500; i++) {
      const c = rollComplication('red', 3, false, rnd);
      if (!c) continue;
      expect(['ambush', 'policeTip']).toContain(c.kind);
      expect(c.step).toBeGreaterThanOrEqual(1);
    }
  });
});
