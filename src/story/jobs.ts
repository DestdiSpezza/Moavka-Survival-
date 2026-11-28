import type { NpcId } from './npcs';

/**
 * Mise od štamgastů v eRku (Akt 1, ADR-020). Dává je postava v rozhovoru,
 * hráč má najednou jen jednu. Některé čekají na jiné (traktor až po Zjebalovi).
 */

export type JobId =
  | 'omyx-caj' | 'zjebal-domu' | 'denny-auto' | 'sochar-leseni' | 'metejka-kulecnik' | 'vesta-jerab' | 'kibi-schovej' | 'plotkova-flasky'
  | 'prcka-nafta' | 'awe-karel' | 'natala-pohreb' | 'minivesta-babeta';

export interface JobDef {
  id: JobId;
  giver: NpcId;
  title: string;
  /** Musí být hotové dřív. */
  requires: JobId[];
  /** Odměna při splnění (peníze z mise si hráč drží zvlášť: čaj, výkup auta). */
  reward: { money: number; rel: number };
  /** Mise od Omladiny (ADR-037): nepočítá se do konce Aktu 1, hýbe respektem skupin. */
  omladina?: boolean;
}

export const JOBS: JobDef[] = [
  { id: 'omyx-caj', giver: 'omyx', title: 'Beskydský čaj', requires: [], reward: { money: 0, rel: 15 } },
  { id: 'zjebal-domu', giver: 'zjebal', title: 'Zjebal domů', requires: [], reward: { money: 0, rel: 10 } },
  { id: 'denny-auto', giver: 'dennyVysoky', title: 'Auto pro Dennyho', requires: [], reward: { money: 600, rel: 15 } },
  { id: 'sochar-leseni', giver: 'dennySochar', title: 'Lešení', requires: ['zjebal-domu'], reward: { money: 250, rel: 20 } },
  // Fáze P3 (zadání ze 26. 11. 2026).
  { id: 'metejka-kulecnik', giver: 'metejka', title: 'Kulečník', requires: [], reward: { money: 250, rel: 15 } },
  { id: 'vesta-jerab', giver: 'vesta', title: 'Jeřáb pro Vestu', requires: [], reward: { money: 700, rel: 15 } },
  { id: 'kibi-schovej', giver: 'kibi', title: 'Schovej Kibiho', requires: [], reward: { money: 300, rel: 20 } },
  { id: 'plotkova-flasky', giver: 'plotkova', title: 'Flašky pro Omladinu', requires: [], reward: { money: 400, rel: 15 } },
  // Omladina (zadání ze 28. 11. 2026, ADR-037). Raškovice otevírá Vesta s jeřábem.
  { id: 'prcka-nafta', giver: 'prcka', title: 'Nafta pro Přčku', requires: ['vesta-jerab'], reward: { money: 550, rel: 15 }, omladina: true },
  { id: 'awe-karel', giver: 'awe', title: 'Kde je Karel', requires: [], reward: { money: 500, rel: 20 }, omladina: true },
  { id: 'natala-pohreb', giver: 'natala', title: 'Pohřeb v lese', requires: ['denny-auto'], reward: { money: 800, rel: 20 }, omladina: true },
  { id: 'minivesta-babeta', giver: 'miniVesta', title: 'Babeta', requires: ['vesta-jerab'], reward: { money: 450, rel: 15 }, omladina: true },
];

// ---------- Awe: Karel ----------

/** Kde může Karel ležet (jména budov a míst v Morávce). */
export const KAREL_SPOTS = ['Kostel', 'Pila', 'Hasiči', 'Chata', 'Přehrada'] as const;
export type KarelSpot = (typeof KAREL_SPOTS)[number];

/** Kdo ze štamgastů chce Karla taky (Denny sochař ne, ten má umění). */
export const KAREL_RIVALS: NpcId[] = ['vesta', 'omyx', 'metejka', 'zjebal', 'kibi'];

export interface KarelPlan {
  /** Jedinečný kód mise téhle hry (ukáže se v HUD). */
  code: string;
  spot: KarelSpot;
  rival: NpcId;
}

/**
 * Z náhodného semínka nové hry: kód mise, skrýš a soupeř. Stejné semínko = stejná hra,
 * takže se to po načtení nezmění.
 */
export function karelPlan(seed: number): KarelPlan {
  const s = Math.abs(Math.floor(seed)) || 1;
  const code = `KAREL-${s.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
  return { code, spot: KAREL_SPOTS[s % KAREL_SPOTS.length], rival: KAREL_RIVALS[Math.floor(s / 7) % KAREL_RIVALS.length] };
}

/** Kolik dá soupeř za Karla (víc než Awe, ať je to dilema). */
export const KAREL_RIVAL_PRICE = 800;

// ---------- Metějka: kulečník ----------

export type PoolMove = 'strcit' | 'rada' | 'koule';

/**
 * Jedno kolo kulečníku: hráč Metějkovi tajně „pomáhá“. Rada je bezpečná, ale nejistá;
 * posunutá koule skoro jistá, ale Hasič si toho může všimnout; strčit do tága je něco mezi.
 */
export function poolRound(move: PoolMove, roll: number, catchRoll: number): { won: boolean; caught: boolean } {
  const odds: Record<PoolMove, { win: number; caught: number }> = {
    rada: { win: 0.55, caught: 0 },
    strcit: { win: 0.7, caught: 0.2 },
    koule: { win: 0.9, caught: 0.35 },
  };
  const o = odds[move];
  const caught = catchRoll < o.caught;
  return { won: !caught && roll < o.win, caught };
}

// ---------- Plotková: flašky ----------

export const BOTTLES = { start: 6, stops: 4, time: 110, drinkEvery: 18, drinkPenalty: 8 };

/** Stihne se to ještě? (flašek musí být aspoň tolik, kolik zbývá zastávek) */
export function bottlesEnough(bottles: number, stopsLeft: number): boolean {
  return bottles >= stopsLeft;
}

export function jobOf(id: string): JobDef | null {
  return JOBS.find((j) => j.id === id) ?? null;
}

export function jobBy(npc: NpcId): JobDef | null {
  return JOBS.find((j) => j.giver === npc) ?? null;
}

export const doneFlag = (id: JobId) => `job:${id}`;

export type JobStatus = 'locked' | 'open' | 'active' | 'busy' | 'done';

/**
 * Stav mise pro hráče: hotová, právě běží, hráč má jinou (busy),
 * čeká na jinou misi (locked), nebo jde vzít (open).
 */
export function jobStatus(id: JobId, active: string, flags: readonly string[]): JobStatus {
  if (flags.includes(doneFlag(id))) return 'done';
  if (active === id) return 'active';
  const def = jobOf(id)!;
  if (def.requires.some((r) => !flags.includes(doneFlag(r)))) return 'locked';
  return active ? 'busy' : 'open';
}

/** Všechny mise v eRku hotové? (Omladina se do konce Aktu 1 nepočítá.) */
export function allJobsDone(flags: readonly string[]): boolean {
  return JOBS.every((j) => j.omladina || flags.includes(doneFlag(j.id)));
}

// ---------- Zjebal: časový limit ----------

/** Jakou část nejvyšší rychlosti auto udrží v průměru (rozjezdy, zatáčky, křižovatky). */
export const CRUISE = 0.62;
/** Rezerva na chyby hráče (+10 %, zadání). */
export const SLACK = 1.1;

/**
 * Čas na odvoz: délka trasy po silnici děleno průměrnou rychlostí auta, plus 10 %.
 * Nejméně 12 s, ať je co dělat i na krátké trase.
 */
export function rideTimeLimit(routePx: number, maxSpeed: number): number {
  const ideal = routePx / (maxSpeed * CRUISE);
  return Math.max(12, Math.ceil(ideal * SLACK));
}

/** Pro Zjebala se nehodí kolo ani skútr (devadesát kilo a osm piv). */
export function carriesPassenger(kind: string): boolean {
  return kind !== 'kolo' && kind !== 'skutr';
}

// ---------- Denny: auto do dílny ----------

/** „Nenabourané“: aspoň 90 % zdraví auta. */
export const DENNY_MIN_HP = 0.9;

export function dennyAccepts(hpFraction: number, wanted: number, kind: string): 'ok' | 'damaged' | 'wanted' | 'police' {
  if (kind === 'policie' || kind === 'zasahovka') return 'police';
  if (wanted > 0) return 'wanted';
  if (hpFraction < DENNY_MIN_HP) return 'damaged';
  return 'ok';
}
