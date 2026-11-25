/** Oblasti hry. Postup: Morávka → Raškovice → Krásná → Lysá hora. */

import type { GroupId } from '../systems/respect';
import { GROUPS } from './gangs';

export type AreaId = 'moravka' | 'raskovice' | 'krasna' | 'lysa';

export interface AreaGoal {
  /** Skóre získané v této oblasti. */
  score: number;
  /** Peníze v kapse. */
  money: number;
}

export interface AreaDef {
  id: AreaId;
  name: string;
  /** „do …“ (2. pád): do Morávky, do Raškovic. */
  toName: string;
  /** Semínko generátoru (domy, les, skály). */
  seed: number;
  /** Posun vlnění řeky a silnice: každá oblast má jiné údolí. */
  phase: number;
  goal: AreaGoal;
  next: AreaId | null;
  prev: AreaId | null;
  /** Zatím jen v plánu (fáze 8). */
  playable: boolean;
  /** Místní názvy budov a míst (klíč = role v generátoru mapy). */
  labels: Record<string, string>;
  /** Místní skupiny: stejné chování, jiné jméno (Raškovice mají Voraře místo Dřevařů…). */
  groupNames?: Partial<Record<GroupId, string>>;
}

export const AREAS: Record<AreaId, AreaDef> = {
  moravka: {
    id: 'moravka', name: 'Morávka', toName: 'Morávky', seed: 1234, phase: 0, goal: { score: 1500, money: 2500 },
    next: 'raskovice', prev: null, playable: true,
    labels: {
      Hospoda: 'Hospoda eRko',
      Obchod: 'Foop obchod',
      Garáž: 'Autoúpravy Dan',
      Chata: 'Safe house',
      'Cesta na Raškovice': 'Cesta na Raškovice',
    },
  },
  raskovice: {
    id: 'raskovice', name: 'Raškovice', toName: 'Raškovic', seed: 777, phase: 2.2, goal: { score: 3000, money: 6000 },
    next: 'krasna', prev: 'moravka', playable: true,
    labels: {
      Hospoda: 'Hospoda U Kapra',
      Kostel: 'Kostel sv. Jana',
      Pila: 'Pila na Morávce',
      'Přehrada Morávka': 'Jez a koupaliště',
      'Cesta na Raškovice': 'Cesta na Krásnou',
      Náves: 'Náves Raškovice',
      Škola: 'Učiliště',
    },
    groupNames: { drevari: 'Voraři', stamgasti: 'Rybáři', ekologove: 'Chalupáři', skola: 'Učňáci' },
  },
  krasna: {
    id: 'krasna', name: 'Krásná', toName: 'Krásné', seed: 4242, phase: 4.1, goal: { score: 6000, money: 12000 },
    next: 'lysa', prev: 'raskovice', playable: false, labels: {},
  },
  lysa: {
    id: 'lysa', name: 'Lysá hora', toName: 'Lysé hory', seed: 1324, phase: 1.3, goal: { score: 10000, money: 20000 },
    next: null, prev: 'krasna', playable: false, labels: {},
  },
};

/** Jméno skupiny v dané oblasti. */
export function groupName(area: AreaId, g: GroupId): string {
  return AREAS[area].groupNames?.[g] ?? GROUPS[g].name;
}

/** Místní název budovy nebo zóny v dané oblasti. */
export function placeLabel(area: AreaId, role: string): string {
  return AREAS[area].labels[role] ?? role;
}

export function goalMet(area: AreaId, areaScore: number, money: number): boolean {
  const g = AREAS[area].goal;
  return areaScore >= g.score && money >= g.money;
}
