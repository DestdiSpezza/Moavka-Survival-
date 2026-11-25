import { describe, expect, it } from 'vitest';
import { GROUP_IDS } from '../systems/respect';
import { GROUPS, inZones, spawnTiles, territory } from './gangs';
import { buildMoravka } from './realMoravka';

const map = buildMoravka();

describe('skupiny na mapě', () => {
  it('každá skupina má kde stát, aspoň dvakrát tolik míst než členů', () => {
    for (const id of GROUP_IDS) expect(spawnTiles(map, id).length, id).toBeGreaterThan(GROUPS[id].members * 2);
  });

  it('zbrojnice patří Hasičům, hospoda Štamgastům, hřiště u školy Omladině; pila je volná', () => {
    const pila = map.buildings.find((b) => b.name === 'Pila')!;
    const hasici = map.buildings.find((b) => b.name === 'Hasiči')!;
    const hospoda = map.buildings.find((b) => b.name === 'Hospoda')!;
    const skola = map.buildings.find((b) => b.name === 'Škola')!;
    expect(inZones(territory(map, 'hasici'), hasici.x, hasici.y)).toBe(true);
    expect(inZones(territory(map, 'stamgasti'), hospoda.x, hospoda.y)).toBe(true);
    expect(inZones(territory(map, 'omladina'), skola.x, skola.y)).toBe(true);
    for (const id of ['hasici', 'stamgasti', 'omladina'] as const) expect(inZones(territory(map, id), pila.x, pila.y), id).toBe(false);
  });

  it('skupiny jsou tři: Hasiči, Štamgasti, Omladina', () => {
    expect(GROUP_IDS.map((id) => GROUPS[id].name)).toEqual(['Hasiči', 'Štamgasti', 'Omladina']);
  });
});
