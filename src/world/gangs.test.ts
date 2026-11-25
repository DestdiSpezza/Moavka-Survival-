import { describe, expect, it } from 'vitest';
import { GROUP_IDS } from '../systems/respect';
import { GROUPS, inZones, spawnTiles, territory } from './gangs';
import { buildMoravka } from './realMoravka';

const map = buildMoravka();

describe('skupiny na mapě', () => {
  it('každá skupina má kde stát, aspoň dvakrát tolik míst než členů', () => {
    for (const id of GROUP_IDS) expect(spawnTiles(map, id).length, id).toBeGreaterThan(GROUPS[id].members * 2);
  });

  it('pila patří Dřevařům, hospoda Dřevařům i Štamgastům, škola Škole', () => {
    const pila = map.buildings.find((b) => b.name === 'Pila')!;
    const hospoda = map.buildings.find((b) => b.name === 'Hospoda')!;
    const skola = map.buildings.find((b) => b.name === 'Škola')!;
    expect(inZones(territory(map, 'drevari'), pila.x, pila.y)).toBe(true);
    expect(inZones(territory(map, 'drevari'), hospoda.x, hospoda.y)).toBe(true);
    expect(inZones(territory(map, 'stamgasti'), hospoda.x, hospoda.y)).toBe(true);
    expect(inZones(territory(map, 'skola'), skola.x, skola.y)).toBe(true);
    expect(inZones(territory(map, 'skola'), pila.x, pila.y)).toBe(false);
  });

  it('Biomatky jsou všude', () => {
    expect(inZones(territory(map, 'ekologove'), 5, 5)).toBe(true);
    expect(inZones(territory(map, 'ekologove'), 100, 80)).toBe(true);
  });
});
