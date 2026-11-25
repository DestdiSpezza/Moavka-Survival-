import type { AreaId } from '../world/areas';
import type { Arsenal } from './combat';
import { newRespect, normalizeRespect, type Respect } from './respect';

export type Gender = 'm' | 'f';

/** Hrdina nebo hrdinka a jméno, které si hráč napsal. */
export interface Hero {
  gender: Gender;
  name: string;
}

/** Kde je hráč v příběhu. */
export interface StoryState {
  /** Číslo aktu (1 = Příjezd). */
  act: number;
  /** Rozehraná mise ('' = volná hra, další mise zatím není). */
  mission: string;
  /** Úvodní scéna s autobusem už proběhla. */
  introDone: boolean;
  /** Příznaky z dialogů a misí (refusedTalk, metPlotkova…). */
  flags: string[];
  /** Vztahy s postavami (-100 až 100). */
  rel: Record<string, number>;
  /** Postavy, jejichž jméno hráč zná. */
  known: string[];
  /** Počítadla (panáky s Plotkovou, kolik dlužní Denny sochař…). */
  counts: Record<string, number>;
  /** Rozdělaná mise od štamgasta ('' = žádná; ADR-020). */
  job: string;
}

/** Uložený postup hry. */
export interface Progress {
  version: 2;
  area: AreaId;
  unlocked: AreaId[];
  money: number;
  score: number;
  /** Skóre získané v jednotlivých oblastech (cíl oblasti se počítá z něj). */
  areaScore: Partial<Record<AreaId, number>>;
  respect: Partial<Record<AreaId, Respect>>;
  hideouts: AreaId[];
  health: number;
  armor: number;
  arsenal: Arsenal;
  /** Herní čas v sekundách od začátku (hodiny). */
  clock: number;
  /** Splněné kroky tutoriálu. */
  tutorial: string[];
  hero: Hero;
  story: StoryState;
}

export const DEFAULT_HERO: Hero = { gender: 'm', name: 'Punkáč' };

/** Příběh od začátku: Akt 1, úvodní scéna s autobusem. */
export function newStory(): StoryState {
  return { act: 1, mission: 'a1-prijezd', introDone: false, flags: [], rel: {}, known: [], counts: {}, job: '' };
}

export const SAVE_KEY = 'survive-moravka-save-v1';

export function newProgress(hero: Hero = DEFAULT_HERO): Progress {
  return {
    version: 2, area: 'moravka', unlocked: ['moravka'], money: 500, score: 0, areaScore: {}, respect: {},
    hideouts: [], health: 100, armor: 0, clock: 0, tutorial: [],
    arsenal: { owned: ['fists'], current: 'fists', ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0, caj: 0 } },
    hero: { ...hero }, story: newStory(),
  };
}

export function respectIn(p: Progress, area: AreaId): Respect {
  return p.respect[area] ?? newRespect();
}

export function serialize(p: Progress): string {
  return JSON.stringify(p);
}

/**
 * Načte uložený postup; poškozená nebo cizí data vrátí null (hra začne znovu).
 * Uložení z doby zakázek (verze 1) se převede: příběh začne Aktem 1 bez úvodní scény
 * (hráč stojí ve vesnici a jde do hospody), peníze a výbava zůstanou.
 */
export function deserialize(text: string | null): Progress | null {
  if (!text) return null;
  try {
    const data = JSON.parse(text) as Omit<Partial<Progress>, 'version'> & { version?: number; missionsDone?: unknown };
    if ((data.version !== 1 && data.version !== 2) || typeof data.money !== 'number' || typeof data.area !== 'string' || !data.arsenal) return null;
    const { missionsDone: _old, ...rest } = data;
    void _old;
    const base = newProgress(data.hero ?? DEFAULT_HERO);
    if (data.version === 1) return fixUp({ ...base, ...rest, version: 2, hero: { ...DEFAULT_HERO }, story: { ...newStory(), mission: 'a1-hospoda', introDone: true } } as Progress);
    return fixUp({ ...base, ...rest, story: { ...newStory(), ...data.story } } as Progress);
  } catch {
    return null;
  }
}

/**
 * Doplní, co starší uložení nezná: skupiny po přejmenování (Dřevaři → Hasiči, bez Biomatek)
 * a náboje (počty) u nových věcí ve výbavě.
 */
function fixUp(p: Progress): Progress {
  const respect: Progress['respect'] = {};
  for (const [area, r] of Object.entries(p.respect ?? {})) respect[area as AreaId] = normalizeRespect(r as Record<string, number>);
  const ammo = { ...newProgress().arsenal.ammo, ...p.arsenal.ammo };
  return { ...p, respect, arsenal: { ...p.arsenal, ammo } };
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
