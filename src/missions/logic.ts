import { missionTiers, type GroupId } from '../systems/respect';
import type { AreaId } from '../world/areas';
import { MISSIONS, type MissionInfo, type Tier } from './catalog';

export interface Reward {
  money: number;
  score: number;
}

const REWARDS: Record<Tier, { money: [number, number]; score: number }> = {
  green: { money: [150, 300], score: 100 },
  yellow: { money: [400, 700], score: 250 },
  red: { money: [900, 1500], score: 600 },
};

export function rewardFor(tier: Tier, rnd: () => number): Reward {
  const r = REWARDS[tier];
  const money = Math.round((r.money[0] + rnd() * (r.money[1] - r.money[0])) / 10) * 10;
  return { money, score: r.score };
}

/**
 * Nabídka zakázek u skupiny: na každou odemčenou barvu jedna zakázka.
 * Přednost mají ty, které hráč ještě nesplnil; hotové se dají opakovat.
 */
export function offersFor(group: GroupId, respect: number, done: Set<string>, area: AreaId = 'moravka'): MissionInfo[] {
  const out: MissionInfo[] = [];
  for (const tier of missionTiers(respect)) {
    const pool = MISSIONS.filter((m) => m.area === area && m.group === group && m.tier === tier);
    if (!pool.length) continue;
    out.push(pool.find((m) => !done.has(m.id)) ?? pool[0]);
  }
  return out;
}

/** Skupina, která tě nesnáší, ti práci nedá. */
export function refusesWork(respect: number): boolean {
  return respect < -30;
}

export type ComplicationKind = 'ownerCalls' | 'ambush' | 'breakdown' | 'policeTip';

/** Šance, že se zakázka zkomplikuje: čím těžší, tím spíš. */
export const COMPLICATION_CHANCE: Record<Tier, number> = { green: 0.35, yellow: 0.6, red: 0.85 };

export interface ComplicationPlan {
  kind: ComplicationKind;
  /** Ve kterém kroku mise a kolik sekund po jeho začátku. */
  step: number;
  delay: number;
}

/** Náhodně naplánuje komplikaci (nebo žádnou) pro misi s daným počtem kroků. */
export function rollComplication(tier: Tier, steps: number, hasVehicle: boolean, rnd: () => number): ComplicationPlan | null {
  if (rnd() >= COMPLICATION_CHANCE[tier]) return null;
  const kinds: ComplicationKind[] = ['ambush', 'policeTip'];
  if (hasVehicle) kinds.push('ownerCalls', 'breakdown');
  const kind = kinds[Math.floor(rnd() * kinds.length)];
  const step = steps > 1 ? 1 + Math.floor(rnd() * (steps - 1)) : 0;
  return { kind, step, delay: 3 + rnd() * 7 };
}
