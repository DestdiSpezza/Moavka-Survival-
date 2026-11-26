import { clamp } from './math';

/** Skupiny Morávky a respekt hráče u nich. */

export type GroupId = 'hasici' | 'stamgasti' | 'omladina';
export const GROUP_IDS: GroupId[] = ['hasici', 'stamgasti', 'omladina'];

/** Vztah mezi skupinami: 1 přátelé, 0 neutrální, -1 rivalové, -2 nepřátelé. */
export type Relation = 1 | 0 | -1 | -2;

// Hasiči pijou v eRku se Štamgasty; Omladině nemůžou odpustit petardy v popelnicích.
const RELATIONS: Record<GroupId, Record<GroupId, Relation>> = {
  hasici: { hasici: 1, stamgasti: 1, omladina: -1 },
  stamgasti: { hasici: 1, stamgasti: 1, omladina: -1 },
  omladina: { hasici: -1, stamgasti: -1, omladina: 1 },
};

export function relation(a: GroupId, b: GroupId): Relation {
  return RELATIONS[a][b];
}

export type Respect = Record<GroupId, number>;

export function newRespect(): Respect {
  return { hasici: 0, stamgasti: 0, omladina: 0 };
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

/** Od kolika dolů tě skupina napadne na svém území (ADR-034), a od kolika všude. */
export const HOSTILE_AT = -65;
export const HUNT_AT = -85;

/**
 * Postoj skupiny k hráči.
 * hostile = napadne tě na svém území, hunt = kdekoli, kde tě uvidí, ally = pomůže ti.
 * `aggression` (Štamgasti večer) jen ubírá přátelství; napadat začnou až od HOSTILE_AT,
 * ať jedna nehoda (přejetý člen) neukončí hru.
 */
export function attitude(respect: number, aggression = 0): Attitude {
  if (respect <= HUNT_AT) return 'hunt';
  if (respect <= HOSTILE_AT) return 'hostile';
  const r = respect - aggression;
  if (r >= 50) return 'ally';
  if (r >= 20) return 'friendly';
  return 'neutral';
}

/**
 * Respekt z uložení z doby, kdy byli Dřevaři a Biomatky (ADR-016, ADR-017):
 * Dřevaři → Hasiči, Škola → Omladina, Biomatky zmizely.
 */
export function normalizeRespect(r: Partial<Record<string, number>> | undefined): Respect {
  const out = newRespect();
  if (!r) return out;
  const old: Record<string, GroupId> = { drevari: 'hasici', skola: 'omladina' };
  for (const [k, v] of Object.entries(r)) {
    const id = (GROUP_IDS as string[]).includes(k) ? (k as GroupId) : old[k];
    if (id && typeof v === 'number') out[id] = v;
  }
  return out;
}
