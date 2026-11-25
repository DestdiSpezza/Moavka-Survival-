import type { Point } from './combat';
import type { Description } from './witness';

/** Hledanost: trestné činy zvyšují „žár“, ten určuje úroveň 0–5. */

export type CrimeKind =
  | 'theft'
  | 'assault'
  | 'shooting'
  | 'murder'
  | 'reported'
  | 'rammedCop'
  | 'copAssault'
  | 'copMurder'
  | 'policeTheft'
  | 'hitAndRun';

export const CRIME_HEAT: Record<CrimeKind, number> = {
  theft: 8,
  assault: 15,
  shooting: 10,
  murder: 40,
  reported: 15,
  rammedCop: 20,
  copAssault: 45,
  copMurder: 110,
  policeTheft: 60,
  hitAndRun: 12,
};

/** Kolik žáru je potřeba na úroveň (index = úroveň). */
export const LEVEL_HEAT = [0, 1, 60, 170, 330, 540];
export const MAX_LEVEL = 5;
const MAX_HEAT = 800;

export function levelFor(heat: number): number {
  let level = 0;
  for (let i = 1; i < LEVEL_HEAT.length; i++) if (heat >= LEVEL_HEAT[i]) level = i;
  return level;
}

export interface Wanted {
  heat: number;
  level: number;
  /** Sekundy, co hráče žádný policista neviděl. */
  unseen: number;
  /** Kde ho policie viděla naposledy (nebo kde se stal zločin). */
  lastSeen: Point | null;
  /** Co policie ví o tom, jak pachatel vypadá (null = nic). */
  description: Description | null;
}

export function newWanted(): Wanted {
  return { heat: 0, level: 0, unseen: 0, lastSeen: null, description: null };
}

/** Po nahlášení zločinu má policie čas dojet, než začne běžet odpočet útěku. */
export const CRIME_GRACE = 10;

/** Zločin: přidá žár, úroveň jen roste a policie ví, kde se to stalo. */
export function addCrime(w: Wanted, kind: CrimeKind, at: Point): Wanted {
  const heat = Math.min(MAX_HEAT, w.heat + CRIME_HEAT[kind]);
  return { ...w, heat, level: Math.max(w.level, levelFor(heat)), unseen: Math.min(w.unseen, -CRIME_GRACE), lastSeen: { x: at.x, y: at.y } };
}

/** Jak dlouho musí hráč zůstat mimo dohled, aby se policie vzdala. */
export function evadeTime(level: number): number {
  return level === 0 ? 0 : 8 + level * 5;
}

/**
 * Jeden krok: když hráče policie vidí, ví kde je a nic neopadá.
 * Mimo dohled běží odpočet (v lese dvakrát rychleji); po jeho uplynutí hledanost zmizí.
 */
export function tickWanted(w: Wanted, dt: number, seenAt: Point | null, hideFactor = 1): { wanted: Wanted; evaded: boolean } {
  if (w.level === 0) return { wanted: w, evaded: false };
  if (seenAt) return { wanted: { ...w, unseen: 0, lastSeen: { x: seenAt.x, y: seenAt.y } }, evaded: false };
  const unseen = w.unseen + dt * hideFactor;
  if (unseen >= evadeTime(w.level)) return { wanted: newWanted(), evaded: true };
  return { wanted: { ...w, unseen }, evaded: false };
}

/** Převlečení: přesednutí do jiného auta mimo dohled policii zmate. */
export const CAR_SWAP_BONUS = 6;
export function swapCar(w: Wanted): Wanted {
  return w.level === 0 ? w : { ...w, unseen: w.unseen + CAR_SWAP_BONUS };
}

export type ShootPolicy = 'never' | 'armed' | 'always';

export interface Response {
  cars: number;
  roadblocks: number;
  /** Zásahovka s ozbrojenou jednotkou. */
  swat: boolean;
  shoot: ShootPolicy;
  /** Na nízké úrovni se policie snaží zatknout, ne zabít. */
  arrest: boolean;
  /** Policejní auta úmyslně narážejí do hráčova auta. */
  ram: boolean;
  /** Rychlost policejních aut v px/s. */
  cruise: number;
}

/** Reakce policie na jednotlivých úrovních. */
export function responseFor(level: number): Response {
  switch (level) {
    case 0:
      return { cars: 0, roadblocks: 0, swat: false, shoot: 'never', arrest: false, ram: false, cruise: 0 };
    case 1:
      return { cars: 1, roadblocks: 0, swat: false, shoot: 'never', arrest: true, ram: false, cruise: 130 };
    case 2:
      return { cars: 3, roadblocks: 0, swat: false, shoot: 'armed', arrest: true, ram: true, cruise: 160 };
    case 3:
      return { cars: 4, roadblocks: 2, swat: false, shoot: 'always', arrest: false, ram: true, cruise: 180 };
    case 4:
      return { cars: 5, roadblocks: 2, swat: true, shoot: 'always', arrest: false, ram: true, cruise: 195 };
    default:
      return { cars: 7, roadblocks: 3, swat: true, shoot: 'always', arrest: false, ram: true, cruise: 210 };
  }
}

/** Pokuta při zatčení: 20 % peněz, nejméně 100 Kč (pokud je). */
export function arrestFine(money: number): number {
  return Math.min(money, Math.max(100, Math.round(money * 0.2)));
}
