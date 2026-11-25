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
  /** Při jakém zbytku zdraví utíká (Omladina). */
  fleeAt: number;
  /** Co křičí, když tě pozná na svém území. */
  spotted: string[];
  /** Co křičí, když ti jde pomoct. */
  helping: string[];
}

export const GROUPS: Record<GroupId, GroupSpec> = {
  hasici: {
    id: 'hasici', name: 'Hasiči', color: 0xc8302a, css: '#e0583f', members: 5, hp: 120, speed: 60,
    melee: { damage: 13, range: 18, cooldown: 1.5 }, ranged: null, fleeAt: 0,
    spotted: [
      '{To je on! Ten, co nám zapálil popelnici!|To je ona! Ta, co nám zapálila popelnici!}',
      'Kluci, sekery! Zásah!',
      '{Tebe uhasíme, čírko!|Tebe uhasíme, čírko!}',
      'Na tebe nepotřebujem hadici, stačí lopata!',
    ],
    helping: ['SDH Morávka, zásah!', 'Tohle hasíme my!', '{Nech ho bejt, ten je náš!|Nech ji bejt, ta je naše!}'],
  },
  stamgasti: {
    id: 'stamgasti', name: 'Štamgasti', color: 0xd8b030, css: '#f0c840', members: 5, hp: 70, speed: 55,
    melee: { damage: 8, range: 16, cooldown: 1.3 }, ranged: { kind: 'bottle', damage: 12, range: 140, cooldown: 1.8 }, fleeAt: 0,
    spotted: ['{To je on! Ten, co nezaplatil útratu!|To je ona! Ta, co nezaplatila útratu!}', 'Hospodo, podrž mi pivo!', '{Ty seš ten punkáč!|Ty seš ta punkačka!}'],
    helping: ['Na zdraví, fízlové!', 'Za našeho kámoše!'],
  },
  omladina: {
    id: 'omladina', name: 'Omladina', color: 0x9a4ad0, css: '#c07af0', members: 6, hp: 45, speed: 98,
    melee: { damage: 8, range: 16, cooldown: 0.8 }, ranged: { kind: 'firework', damage: 15, range: 130, cooldown: 3.2 }, fleeAt: 0.4,
    spotted: ['{To je on!|To je ona!} Kluci, sem!', '{Ty vole, to je ten týpek!|Ty vole, to je ta holka!}', 'Dej mobil, {punkáči|punkačko}!'],
    helping: ['Fízlové, chytněte si nás!', 'Kluci, petardy!'],
  },
};

function zone(map: WorldMap, name: string): Zone {
  const z = map.zones.find((x) => x.name === name);
  if (!z) throw new Error(`Chybí zóna ${name}`);
  return z;
}

/** Území skupiny (kde tě nepřátelská skupina napadne). Hasiči hlídají zbrojnici a náves (a pijou v eRku). */
export function territory(map: WorldMap, id: GroupId): Zone[] {
  switch (id) {
    case 'hasici':
      return [zone(map, 'Hasiči')];
    case 'stamgasti':
      return [zone(map, 'Hospoda')];
    case 'omladina':
      return [zone(map, 'Škola')];
  }
}

/** Kde se členové objevují: Hasiči u zbrojnice, Štamgasti u hospody, Omladina u hřiště za školou. */
export function spawnAreas(map: WorldMap, id: GroupId): Zone[] {
  return territory(map, id);
}

export function inZones(zones: Zone[], tx: number, ty: number): boolean {
  return zones.some((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h);
}

/** Dá se tam postavit člen skupiny? */
export function standable(tile: number | undefined): boolean {
  return tile === Tile.Grass || tile === Tile.Dirt || tile === Tile.ForestFloor || tile === Tile.Dam || tile === Tile.Sidewalk;
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
