import type { GroupId } from '../systems/respect';
import type { WorldMap, Zone } from './moravka';
import { Tile } from './tiles';

export type ProjectileKind = 'bottle' | 'molotov' | 'rock' | 'firework';

export interface GroupSpec {
  id: GroupId;
  name: string;
  /** Barva skupiny (bunda, HUD). */
  color: number;
  css: string;
  members: number;
  hp: number;
  speed: number;
  melee: { damage: number; range: number; cooldown: number } | null;
  ranged: { kind: ProjectileKind; damage: number; range: number; cooldown: number } | null;
  /** Při jakém zbytku zdraví utíká (Škola). */
  fleeAt: number;
  /** Co křičí, když tě pozná na svém území. */
  spotted: string[];
  /** Co křičí, když ti jde pomoct. */
  helping: string[];
}

export const GROUPS: Record<GroupId, GroupSpec> = {
  drevari: {
    id: 'drevari', name: 'Dřevaři', color: 0xb03a2a, css: '#e0583f', members: 5, hp: 120, speed: 58,
    melee: { damage: 13, range: 18, cooldown: 1.5 }, ranged: null, fleeAt: 0,
    spotted: ['To je on! Na pilu s ním!', 'Seš na našem dříví, čírko!', 'Vem sekeru, Franto!'],
    helping: ['Nech ho bejt, ten je náš!', 'Sekera už se těší!'],
  },
  stamgasti: {
    id: 'stamgasti', name: 'Štamgasti', color: 0xd8b030, css: '#f0c840', members: 5, hp: 70, speed: 55,
    melee: { damage: 8, range: 16, cooldown: 1.3 }, ranged: { kind: 'bottle', damage: 12, range: 140, cooldown: 1.8 }, fleeAt: 0,
    spotted: ['To je on! Ten, co nezaplatil útratu!', 'Hospodo, podrž mi pivo!', 'Ty seš ten punkáč!'],
    helping: ['Na zdraví, fízlové!', 'Za našeho kámoše!'],
  },
  ekologove: {
    id: 'ekologove', name: 'Ekologové', color: 0x3aa04a, css: '#5ad06a', members: 6, hp: 50, speed: 75,
    melee: null, ranged: { kind: 'rock', damage: 8, range: 170, cooldown: 1.3 }, fleeAt: 0.3,
    spotted: ['To je on! Vrah stromů!', 'Smrdíš benzínem!', 'Za Beskydy!'],
    helping: ['Policejní auta smrdí taky!', 'Za svobodu a les!'],
  },
  skola: {
    id: 'skola', name: 'Škola', color: 0x9a4ad0, css: '#c07af0', members: 6, hp: 45, speed: 98,
    melee: { damage: 8, range: 16, cooldown: 0.8 }, ranged: { kind: 'firework', damage: 15, range: 130, cooldown: 3.2 }, fleeAt: 0.4,
    spotted: ['To je on! Kluci, sem!', 'Ty vole, to je ten týpek!', 'Dej mobil, punkáči!'],
    helping: ['Fízlové, chytněte si nás!', 'Kluci, petardy!'],
  },
};

function zone(map: WorldMap, name: string): Zone {
  const z = map.zones.find((x) => x.name === name);
  if (!z) throw new Error(`Chybí zóna ${name}`);
  return z;
}

/** Území skupiny (kde tě nepřátelská skupina napadne). Ekologové jsou všude. */
export function territory(map: WorldMap, id: GroupId): Zone[] {
  switch (id) {
    case 'drevari':
      return [zone(map, 'Pila'), zone(map, 'Hospoda')];
    case 'stamgasti':
      return [zone(map, 'Hospoda')];
    case 'skola':
      return [zone(map, 'Škola')];
    case 'ekologove':
      return [{ name: 'Morávka', x: 0, y: 0, w: map.width, h: map.height }];
  }
}

/** Kde se členové objevují. Ekologové v lese u vesnice, u přehrady a na návsi. */
export function spawnAreas(map: WorldMap, id: GroupId): Zone[] {
  if (id !== 'ekologove') return territory(map, id);
  const dam = zone(map, 'Přehrada Morávka');
  return [
    { name: 'Les', x: 14, y: 10, w: 8, h: 50 },
    { name: 'Hráz', x: 28, y: dam.y, w: 60, h: 3 },
    zone(map, 'Náves'),
  ];
}

export function inZones(zones: Zone[], tx: number, ty: number): boolean {
  return zones.some((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h);
}

/** Dá se tam postavit člen skupiny? */
export function standable(tile: number | undefined): boolean {
  return tile === Tile.Grass || tile === Tile.Dirt || tile === Tile.ForestFloor || tile === Tile.Dam;
}

/** Všechna místa ve spawn oblastech, kde může člen stát. */
export function spawnTiles(map: WorldMap, id: GroupId): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const z of spawnAreas(map, id)) {
    for (let y = z.y; y < z.y + z.h; y++) {
      for (let x = z.x; x < z.x + z.w; x++) if (standable(map.tiles[y]?.[x])) out.push([x, y]);
    }
  }
  return out;
}
