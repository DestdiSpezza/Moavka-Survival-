import { describe, expect, it } from 'vitest';
import { AnnouncerQueue } from './announcer';
import { reactToObstacle, rollDriver } from './drivers';
import { EventLog, validCause } from './eventLog';
import { createRng } from './rng';
import { newRoster, REGEN_SECONDS, returnOfficers, takeOfficers, tickRoster } from './roster';
import { callChance, describe as describeOf, describeText, mistaken, recognizes, vehicleText } from './witness';

describe('deník událostí', () => {
  it('poskládá řetězec příčin a spočítá systémy', () => {
    const log = new EventLog();
    const at = { x: 0, y: 0, t: 0 };
    const boar = log.add({ ...at, kind: 'boar', text: 'divočák', systems: ['animals'], cause: null });
    const brake = log.add({ ...at, kind: 'brake', text: 'brzdění', systems: ['traffic'], cause: boar });
    const crash = log.add({ ...at, kind: 'crash', text: 'náraz', systems: ['traffic'], cause: brake });
    const fight = log.add({ ...at, kind: 'argue', text: 'hádka', systems: ['crowd'], cause: crash });
    expect(log.chain(fight).map((e) => e.text)).toEqual(['divočák', 'brzdění', 'náraz', 'hádka']);
    expect(log.systemsOf(fight).size).toBe(3);
    expect(log.countChains(3, true)).toBe(1);
    expect(log.countChains(4, true)).toBe(0);
  });

  it('řetězce s hráčem se dají vyřadit', () => {
    const log = new EventLog();
    const a = log.add({ x: 0, y: 0, t: 0, kind: 'a', text: 'a', systems: ['player'], cause: null });
    log.add({ x: 0, y: 0, t: 0, kind: 'b', text: 'b', systems: ['police', 'witness'], cause: a });
    expect(log.countChains(3, false)).toBe(1);
    expect(log.countChains(3, true)).toBe(0);
  });

  it('stará událost už není příčinou', () => {
    expect(validCause(5, 10, 20)).toBe(5);
    expect(validCause(5, 10, 100)).toBeNull();
    expect(validCause(null, 10, 11)).toBeNull();
  });
});

describe('svědci a popis', () => {
  const red = { kind: 'osobak' as const, color: 'cerveny' as const };

  it('popis v češtině se shodou rodu', () => {
    expect(vehicleText(red)).toBe('červený osobák');
    expect(vehicleText({ kind: 'dodavka', color: 'bily' })).toBe('bílá dodávka');
    expect(vehicleText({ kind: 'kolo', color: 'zeleny' })).toBe('zelené kolo');
    expect(describeText({ vehicle: red, personKnown: false }, 'punkáč')).toBe('červený osobák');
    expect(describeText({ vehicle: null, personKnown: true }, 'punkáč')).toBe('punkáč');
  });

  it('svědek vidí osobu, jen když pachatel nesedí v autě nebo vystoupil', () => {
    expect(describeOf({ vehicle: red }, false).personKnown).toBe(false);
    expect(describeOf({ vehicle: null }, false).personKnown).toBe(true);
  });

  it('policie pozná hráče podle shody auta, zblízka vždycky', () => {
    const d = { vehicle: red, personKnown: false };
    expect(recognizes(d, { vehicle: red }, 200)).toBe(true);
    expect(recognizes(d, { vehicle: { kind: 'osobak', color: 'modry' } }, 200)).toBe(false);
    expect(recognizes(d, { vehicle: null }, 200)).toBe(false);
    expect(recognizes(d, { vehicle: null }, 30)).toBe(true);
    expect(recognizes({ vehicle: red, personKnown: true }, { vehicle: null }, 200)).toBe(true);
  });

  it('svědek se občas splete, většinou ne', () => {
    const rnd = createRng(4);
    let wrong = 0;
    for (let i = 0; i < 1000; i++) {
      const m = mistaken({ vehicle: red, personKnown: false }, rnd);
      if (m.vehicle!.color !== 'cerveny' || m.vehicle!.kind !== 'osobak') wrong++;
    }
    expect(wrong).toBeGreaterThan(200);
    expect(wrong).toBeLessThan(380);
  });

  it('spojenci hráče nepráskají, nepřátelé ano', () => {
    expect(callChance('gang', 'ally', true)).toBe(0);
    expect(callChance('gang', 'hostile', true)).toBeGreaterThan(callChance('civil', null, true));
    expect(callChance('civil', null, false)).toBeGreaterThan(0);
  });
});

describe('policisté na stanici', () => {
  it('posádka se bere ze stanice a vrací', () => {
    let r = newRoster();
    const a = takeOfficers(r, 4);
    expect(a.ok).toBe(true);
    r = a.roster;
    expect(r.available).toBe(6);
    expect(takeOfficers({ ...r, available: 1 }, 2).ok).toBe(false);
    expect(returnOfficers(r, 4).available).toBe(10);
  });

  it('vyřazení se doplňují pomalu, na pět hvězd přijede region', () => {
    let r = { ...newRoster(), available: 2 };
    r = tickRoster(r, REGEN_SECONDS - 1, 1, 4);
    expect(r.available).toBe(2);
    r = tickRoster(r, 2, 1, 4);
    expect(r.available).toBe(3);
    const five = tickRoster({ ...newRoster(), available: 0 }, 0.1, 5, 10);
    expect(five.max).toBe(16);
    expect(five.available).toBe(6);
  });
});

describe('řidiči', () => {
  it('opilci jen večer', () => {
    const rnd = createRng(2);
    for (let i = 0; i < 500; i++) expect(rollDriver(rnd, false).trait).not.toBe('drunk');
    const rnd2 = createRng(3);
    const traits = Array.from({ length: 500 }, () => rollDriver(rnd2, true).trait);
    expect(traits).toContain('drunk');
  });

  it('brzdí až po reakční době', () => {
    let s = reactToObstacle(true, 0, 10, 0.8);
    expect(s.brake).toBe(false);
    s = reactToObstacle(true, s.seenSince, 10.5, 0.8);
    expect(s.brake).toBe(false);
    s = reactToObstacle(true, s.seenSince, 10.9, 0.8);
    expect(s.brake).toBe(true);
    expect(reactToObstacle(false, s.seenSince, 11, 0.8)).toEqual({ brake: false, seenSince: 0 });
  });
});

describe('rozhlas', () => {
  it('stejné téma se neopakuje a hlášení se nepřekřikují', () => {
    const q = new AnnouncerQueue();
    expect(q.push({ channel: 'rozhlas', text: 'prase', key: 'boar' }, 0, 60)).toBe(true);
    expect(q.push({ channel: 'rozhlas', text: 'prase', key: 'boar' }, 10, 60)).toBe(false);
    q.push({ channel: 'radio', text: 'honička', key: 'chase' }, 10, 60);
    expect(q.next(10, 6)?.key).toBe('boar');
    expect(q.next(12, 6)).toBeNull();
    expect(q.next(17, 6)?.key).toBe('chase');
    expect(q.push({ channel: 'rozhlas', text: 'prase', key: 'boar' }, 70, 60)).toBe(true);
  });
});
