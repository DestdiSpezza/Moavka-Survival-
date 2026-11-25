/**
 * Omezený počet policistů na stanici. Vyřazení se nenahrazují hned:
 * posily z okresu chodí postupně, na pět hvězd se mobilizuje region.
 */
export interface Roster {
  available: number;
  max: number;
  regen: number;
}

export const BASE_OFFICERS = 10;
export const REGION_OFFICERS = 16;
/** Za kolik sekund přijede jeden policista z okresu. */
export const REGEN_SECONDS = 45;
/** Kolik hlídek jezdí po obci, i když nikoho nehledají. */
export const PATROLS_AT_REST = 2;

export function newRoster(): Roster {
  return { available: BASE_OFFICERS, max: BASE_OFFICERS, regen: 0 };
}

/** Vezme posádku na auto; když lidi nejsou, auto nevyjede. */
export function takeOfficers(r: Roster, n: number): { roster: Roster; ok: boolean } {
  if (r.available < n) return { roster: r, ok: false };
  return { roster: { ...r, available: r.available - n }, ok: true };
}

/** Posádka se vrátila na stanici (odjela, nastoupila zpátky). */
export function returnOfficers(r: Roster, n: number): Roster {
  return { ...r, available: Math.min(r.max, r.available + n) };
}

/** Čas běží: posily z okresu; na pět hvězd se zvedne strop (mobilizace regionu). */
export function tickRoster(r: Roster, dt: number, level: number, onDuty: number): Roster {
  const max = level >= 5 ? REGION_OFFICERS : BASE_OFFICERS;
  let { available, regen } = r;
  regen += dt;
  if (available + onDuty < max) {
    if (level >= 5 && max > r.max) available += max - r.max;
    while (regen >= REGEN_SECONDS && available + onDuty < max) {
      regen -= REGEN_SECONDS;
      available++;
    }
  }
  if (available + onDuty >= max) regen = 0;
  return { available: Math.min(available, Math.max(0, max - onDuty)), max, regen };
}
