import { clamp } from './math';

/** Skupiny Morávky a respekt hráče u nich. */

export type GroupId = 'drevari' | 'stamgasti' | 'ekologove' | 'skola';
export const GROUP_IDS: GroupId[] = ['drevari', 'stamgasti', 'ekologove', 'skola'];

/** Vztah mezi skupinami: 1 přátelé, 0 neutrální, -1 rivalové, -2 nepřátelé. */
export type Relation = 1 | 0 | -1 | -2;

const RELATIONS: Record<GroupId, Record<GroupId, Relation>> = {
  drevari: { drevari: 1, stamgasti: 1, ekologove: -2, skola: 0 },
  stamgasti: { drevari: 1, stamgasti: 1, ekologove: 0, skola: -1 },
  ekologove: { drevari: -2, stamgasti: 0, ekologove: 1, skola: -1 },
  skola: { drevari: 0, stamgasti: -1, ekologove: -1, skola: 1 },
};

export function relation(a: GroupId, b: GroupId): Relation {
  return RELATIONS[a][b];
}

export type Respect = Record<GroupId, number>;

export function newRespect(): Respect {
  return { drevari: 0, stamgasti: 0, ekologove: 0, skola: 0 };
}

export type RespectEvent =
  | 'hurtMember'
  | 'killMember'
  | 'destroyProperty'
  | 'stealProperty'
  | 'helpMember'
  | 'killAttacker'
  | 'missionGreen'
  | 'missionYellow'
  | 'missionRed'
  | 'missionFailed';

/** Změna respektu u postižené skupiny. */
const DIRECT: Record<RespectEvent, number> = {
  hurtMember: -6,
  killMember: -25,
  destroyProperty: -12,
  stealProperty: -8,
  helpMember: 3,
  killAttacker: 8,
  missionGreen: 10,
  missionYellow: 18,
  missionRed: 30,
  missionFailed: -15,
};

/**
 * Jak se změna promítne do ostatních skupin podle vztahu.
 * Škodíš skupině → její nepřátelé tě mají radši, přátelé míň. Pomáháš → naopak.
 */
const SPILL: Record<Relation, number> = { 1: 0.4, 0: 0, [-1]: -0.2, [-2]: -0.4 };

export function applyRespect(r: Respect, group: GroupId, event: RespectEvent): Respect {
  const delta = DIRECT[event];
  const out = { ...r };
  for (const g of GROUP_IDS) {
    const change = g === group ? delta : delta * SPILL[relation(group, g)];
    out[g] = clamp(Math.round((out[g] + change) * 10) / 10, -100, 100);
  }
  return out;
}

export type Attitude = 'ally' | 'friendly' | 'neutral' | 'hostile' | 'hunt';

/**
 * Postoj skupiny k hráči.
 * hostile = napadne tě na svém území, hunt = kdekoli, kde tě uvidí, ally = pomůže ti.
 * `aggression` posouvá hranice (Štamgasti večer).
 */
export function attitude(respect: number, aggression = 0): Attitude {
  const r = respect - aggression;
  if (r >= 50) return 'ally';
  if (r >= 20) return 'friendly';
  if (r >= -30) return 'neutral';
  if (r >= -70) return 'hostile';
  return 'hunt';
}

/** Zakázky podle respektu (fáze 6): zelené vždy, žluté od +30, červené od +60. */
export function missionTiers(respect: number): Array<'green' | 'yellow' | 'red'> {
  const tiers: Array<'green' | 'yellow' | 'red'> = ['green'];
  if (respect >= 30) tiers.push('yellow');
  if (respect >= 60) tiers.push('red');
  return tiers;
}

/** Biomatky nesnáší auta. Kolo jim nevadí, nákladní a kouřící auta nejvíc. */
export function ecoAngryAtVehicle(respect: number, kind: string, smoking: boolean): boolean {
  if (kind === 'kolo') return false;
  const heavy = kind === 'traktor' || kind === 'dodavka' || kind === 'zasahovka';
  return respect < (heavy || smoking ? 70 : 50);
}
