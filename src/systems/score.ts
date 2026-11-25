/** Skóre za chaos a styl. */

export const SCORE = {
  /** Zničené vozidlo (hráč ho rozbil nebo v něm seděl). */
  wreck: 25,
  /** Každé další auto zničené do 3 s po předchozím (řetězová reakce). */
  chainBonus: 40,
  killCivil: 5,
  killGang: 10,
  killCop: 20,
  /** Za sekundu driftu. */
  driftPerSecond: 15,
  /** Přežití 30 s na páté úrovni hledanosti. */
  surviveFive: 500,
} as const;

/** Útěk policii: čím vyšší hledanost, tím víc (kvadraticky). */
export function escapeBonus(level: number): number {
  return 50 * level * level;
}

/** Řetězová reakce: n-té auto v řadě (od 1) dostane bonus navíc. */
export function wreckScore(chainIndex: number): number {
  return SCORE.wreck + Math.max(0, chainIndex - 1) * SCORE.chainBonus;
}

/** Drift: boční skluz nad 60 px/s při rychlosti nad 80 px/s. */
export function isDrifting(forward: number, lateral: number): boolean {
  return Math.abs(forward) > 80 && Math.abs(lateral) > 60;
}

/** Body za drift; krátké smyky (pod 0,8 s) se nepočítají. */
export function driftScore(seconds: number): number {
  return seconds < 0.8 ? 0 : Math.round(seconds * SCORE.driftPerSecond);
}
