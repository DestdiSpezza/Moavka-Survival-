import type { VehicleKind } from '../world/vehicles';
import type { Attitude } from './respect';

/** Svědci, popis pachatele a to, jestli ho policie pozná. */

export type ColorId = 'cerveny' | 'modry' | 'bily' | 'zeleny' | 'hnedy' | 'cerny' | 'zluty' | 'sedy' | 'olivovy' | 'fialovy' | 'policejni';

/** Kmen přídavného jména (červen-ý/á/é); policejní je měkké a nemění se. */
const COLOR_STEM: Record<ColorId, string> = {
  cerveny: 'červen', modry: 'modr', bily: 'bíl', zeleny: 'zelen', hnedy: 'hněd', cerny: 'čern', zluty: 'žlut',
  sedy: 'šed', olivovy: 'olivov', fialovy: 'fialov', policejni: 'policejní',
};

/** Barvy osobáků podle varianty laku (pořadí CAR_PAINT ve sprites.ts). */
export const PAINT_COLORS: ColorId[] = ['cerveny', 'modry', 'bily', 'zeleny', 'hnedy', 'cerny', 'zluty', 'sedy'];

/** Podstatné jméno vozidla v 1. a 2. pádě (osobák / bez osobáku) a jeho rod. */
const KIND_NOUN: Record<VehicleKind, { noun: string; gen: string; gender: 'm' | 'f' | 'n' }> = {
  osobak: { noun: 'osobák', gen: 'osobáku', gender: 'm' },
  dodavka: { noun: 'dodávka', gen: 'dodávky', gender: 'f' },
  terenak: { noun: 'teréňák', gen: 'teréňáku', gender: 'm' },
  traktor: { noun: 'traktor', gen: 'traktoru', gender: 'm' },
  policie: { noun: 'policejní auto', gen: 'policejního auta', gender: 'n' },
  zasahovka: { noun: 'zásahovka', gen: 'zásahovky', gender: 'f' },
  skutr: { noun: 'skútr', gen: 'skútru', gender: 'm' },
  kolo: { noun: 'kolo', gen: 'kola', gender: 'n' },
};

/** Výchozí barva typů, které nemají varianty laku. */
export const DEFAULT_COLOR: Record<VehicleKind, ColorId> = {
  osobak: 'cerveny', dodavka: 'bily', terenak: 'olivovy', traktor: 'zeleny', policie: 'policejni',
  zasahovka: 'cerny', skutr: 'fialovy', kolo: 'zeleny',
};

export interface VehicleLook {
  kind: VehicleKind;
  color: ColorId;
}

/** Jak pachatel vypadá teď: v jakém autě sedí (nebo pěšky). */
export interface Appearance {
  vehicle: VehicleLook | null;
}

/** Co o pachateli ví policie. */
export interface Description {
  vehicle: VehicleLook | null;
  /** Svědek viděl osobu (pěšky, při vystupování, při přepadení řidiče). */
  personKnown: boolean;
}

export function colorAdjective(color: ColorId, gender: 'm' | 'f' | 'n'): string {
  const stem = COLOR_STEM[color];
  if (color === 'policejni') return stem;
  return stem + (gender === 'm' ? 'ý' : gender === 'f' ? 'á' : 'é');
}

export function vehicleText(v: VehicleLook): string {
  const k = KIND_NOUN[v.kind];
  if (v.kind === 'policie') return 'policejní auto';
  return `${colorAdjective(v.color, k.gender)} ${k.noun}`;
}

/** Vozidlo ve 2. pádě: „řidiče bílé dodávky“, „řidiče červeného osobáku“. */
export function vehicleGenitive(v: VehicleLook): string {
  const k = KIND_NOUN[v.kind];
  if (v.kind === 'policie') return k.gen;
  const stem = COLOR_STEM[v.color];
  const adj = v.color === 'policejni' ? (k.gender === 'f' ? stem : 'policejního') : stem + (k.gender === 'f' ? 'é' : 'ého');
  return `${adj} ${k.gen}`;
}

/** Popis pro HUD a vysílačku. */
export function describeText(d: Description, personText: string): string {
  const parts: string[] = [];
  if (d.vehicle) parts.push(vehicleText(d.vehicle));
  if (d.personKnown || !d.vehicle) parts.push(personText);
  return parts.join(', ');
}

/** Popis tak, jak ho svědek viděl (osobu vidí, když pachatel nesedí v autě nebo když přepadl řidiče). */
export function describe(app: Appearance, sawPerson: boolean): Description {
  return { vehicle: app.vehicle ? { ...app.vehicle } : null, personKnown: sawPerson || !app.vehicle };
}

const SIMILAR: Partial<Record<VehicleKind, VehicleKind>> = {
  osobak: 'terenak', terenak: 'osobak', dodavka: 'zasahovka', skutr: 'kolo', kolo: 'skutr',
};

/** Svědek se může splést: 20 % barva, 10 % typ auta. */
export function mistaken(d: Description, rnd: () => number): Description {
  if (!d.vehicle) return d;
  const v = { ...d.vehicle };
  if (rnd() < 0.2 && v.kind !== 'policie') {
    const others = PAINT_COLORS.filter((c) => c !== v.color);
    v.color = others[Math.floor(rnd() * others.length)];
  }
  if (rnd() < 0.1 && SIMILAR[v.kind]) v.kind = SIMILAR[v.kind]!;
  return { ...d, vehicle: v };
}

/** Na tuto vzdálenost (px) policista pozná hledaného bez ohledu na popis. */
export const CLOSE_RECOGNITION = 45;

/**
 * Pozná policista hráče? Zblízka vždycky. Jinak podle popisu:
 * v autě se musí shodovat typ i barva, pěšky musí znát osobu.
 */
export function recognizes(d: Description | null, app: Appearance, distance: number): boolean {
  if (distance < CLOSE_RECOGNITION) return true;
  if (!d) return true;
  if (app.vehicle) return !!d.vehicle && d.vehicle.kind === app.vehicle.kind && d.vehicle.color === app.vehicle.color;
  return d.personKnown;
}

export type WitnessKind = 'civil' | 'tough' | 'gang';

/**
 * Ochota zavolat policii. Spojenci hráče ho nepráskají, nepřátelé ano rádi,
 * drsoni a skupiny policii obecně nemusí.
 */
export function callChance(kind: WitnessKind, attitude: Attitude | null, againstPlayer: boolean): number {
  if (kind === 'civil') return 0.55;
  if (kind === 'tough') return 0.3;
  if (!againstPlayer) return 0.15;
  switch (attitude) {
    case 'ally':
      return 0;
    case 'friendly':
      return 0.05;
    case 'hostile':
      return 0.7;
    case 'hunt':
      return 0.85;
    default:
      return 0.2;
  }
}

/** Jak dlouho svědkovi trvá zavolat (s). */
export function callDuration(rnd: () => number): number {
  return 5 + rnd() * 5;
}

/** Nejvýš tolik svědků volá k jednomu zločinu (ať není každá rvačka deset telefonátů). */
export const MAX_CALLERS = 2;
export const WITNESS_RANGE = 170;
