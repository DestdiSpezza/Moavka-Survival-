import { describe, expect, it } from 'vitest';
import { Tile } from '../world/tiles';
import { lineOfSight } from './sight';
import { addCrime, arrestFine, CRIME_GRACE, evadeTime, levelFor, newWanted, responseFor, swapCar, tickWanted } from './wanted';

const here = { x: 10, y: 20 };

describe('hledanost', () => {
  it('krádež auta stačí na první úroveň', () => {
    const w = addCrime(newWanted(), 'theft', here);
    expect(w.level).toBe(1);
    expect(w.lastSeen).toEqual(here);
  });

  it('zabití policisty vyhrotí situaci', () => {
    let w = newWanted();
    w = addCrime(w, 'copMurder', here);
    w = addCrime(w, 'copMurder', here);
    expect(w.level).toBeGreaterThanOrEqual(3);
  });

  it('úrovně rostou s žárem až na pět', () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(59)).toBe(1);
    expect(levelFor(60)).toBe(2);
    expect(levelFor(10_000)).toBe(5);
  });

  it('dokud tě vidí, hledanost nepadá', () => {
    let w = addCrime(newWanted(), 'murder', here);
    for (let i = 0; i < 100; i++) w = tickWanted(w, 1, { x: 1, y: 1 }).wanted;
    expect(w.level).toBe(1);
    expect(w.lastSeen).toEqual({ x: 1, y: 1 });
  });

  it('mimo dohled se policie po čase vzdá, v lese dřív', () => {
    // Stav po tom, co tě policie viděla a pak ztratila.
    const w = { ...addCrime(newWanted(), 'murder', here), unseen: 0 };
    const t = evadeTime(w.level);
    expect(tickWanted({ ...w }, t - 0.1, null).evaded).toBe(false);
    expect(tickWanted({ ...w }, t, null).evaded).toBe(true);
    expect(tickWanted({ ...w }, t / 2, null, 2).evaded).toBe(true);
  });

  it('po zločinu má policie čas dojet, než se dá utéct', () => {
    const w = addCrime(newWanted(), 'theft', here);
    const t = evadeTime(w.level);
    expect(tickWanted({ ...w }, t, null).evaded).toBe(false);
    expect(tickWanted({ ...w }, t + CRIME_GRACE, null).evaded).toBe(true);
  });

  it('vyšší úroveň se ztrácí déle', () => {
    expect(evadeTime(5)).toBeGreaterThan(evadeTime(1));
  });

  it('přesednutí do jiného auta zkrátí hledání', () => {
    const w = addCrime(newWanted(), 'murder', here);
    expect(swapCar(w).unseen).toBeGreaterThan(w.unseen);
  });

  it('reakce policie se stupňuje', () => {
    expect(responseFor(1)).toMatchObject({ cars: 1, shoot: 'never', arrest: true });
    expect(responseFor(3).roadblocks).toBeGreaterThan(0);
    expect(responseFor(4).swat).toBe(true);
    expect(responseFor(5).cars).toBeGreaterThan(responseFor(4).cars);
  });

  it('pokuta je 20 %, aspoň stovka, ale ne víc, než máš', () => {
    expect(arrestFine(1000)).toBe(200);
    expect(arrestFine(300)).toBe(100);
    expect(arrestFine(50)).toBe(50);
  });
});

describe('výhled', () => {
  const G = Tile.Grass;
  const W = Tile.Wall;
  const tiles = [
    [G, G, G, G],
    [G, W, G, G],
    [G, G, G, G],
  ];
  const blocks = (t: number) => t === W;
  it('přes volno je vidět', () => {
    expect(lineOfSight(tiles, 16, { x: 8, y: 8 }, { x: 56, y: 8 }, blocks)).toBe(true);
  });
  it('přes zeď ne', () => {
    expect(lineOfSight(tiles, 16, { x: 8, y: 24 }, { x: 56, y: 24 }, blocks)).toBe(false);
  });
});
