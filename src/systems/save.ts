import type { AreaId } from '../world/areas';
import type { Arsenal } from './combat';
import { newRespect, type Respect } from './respect';

/** Uložený postup hry. */
export interface Progress {
  version: 1;
  area: AreaId;
  unlocked: AreaId[];
  money: number;
  score: number;
  /** Skóre získané v jednotlivých oblastech (cíl oblasti se počítá z něj). */
  areaScore: Partial<Record<AreaId, number>>;
  respect: Partial<Record<AreaId, Respect>>;
  missionsDone: Partial<Record<AreaId, string[]>>;
  hideouts: AreaId[];
  health: number;
  armor: number;
  arsenal: Arsenal;
  /** Herní čas v sekundách od začátku (hodiny). */
  clock: number;
  /** Splněné kroky tutoriálu. */
  tutorial: string[];
}

export const SAVE_KEY = 'survive-moravka-save-v1';

export function newProgress(): Progress {
  return {
    version: 1, area: 'moravka', unlocked: ['moravka'], money: 500, score: 0, areaScore: {}, respect: {},
    missionsDone: {}, hideouts: [], health: 100, armor: 0, clock: 0, tutorial: [],
    arsenal: { owned: ['fists'], current: 'fists', ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0 } },
  };
}

export function respectIn(p: Progress, area: AreaId): Respect {
  return p.respect[area] ?? newRespect();
}

export function serialize(p: Progress): string {
  return JSON.stringify(p);
}

/** Načte uložený postup; poškozená nebo cizí data vrátí null (hra začne znovu). */
export function deserialize(text: string | null): Progress | null {
  if (!text) return null;
  try {
    const data = JSON.parse(text) as Partial<Progress>;
    if (data.version !== 1 || typeof data.money !== 'number' || typeof data.area !== 'string' || !data.arsenal) return null;
    return { ...newProgress(), ...data } as Progress;
  } catch {
    return null;
  }
}

/** Úložiště prohlížeče může chybět nebo házet (soukromé okno): pak se jen neuloží. */
export function writeSave(p: Progress): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(p));
    return true;
  } catch {
    return false;
  }
}

export function readSave(): Progress | null {
  try {
    return deserialize(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}
