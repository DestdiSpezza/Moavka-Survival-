/**
 * Akty a jejich mise (plán v docs/hra/PRIBEH.md). Mise jdou po sobě; prázdné id
 * znamená volnou hru, dokud nepřijde další mise.
 */

export interface MissionDef {
  id: string;
  title: string;
}

export interface ActDef {
  num: number;
  title: string;
  missions: MissionDef[];
}

export const ACTS: ActDef[] = [
  {
    num: 1,
    title: 'Příjezd',
    missions: [
      { id: 'a1-prijezd', title: 'Příjezd' },
      { id: 'a1-hospoda', title: 'Do hospody' },
    ],
  },
];

export function actOf(num: number): ActDef {
  return ACTS.find((a) => a.num === num) ?? ACTS[0];
}

export function missionOf(id: string): MissionDef | null {
  for (const a of ACTS) for (const m of a.missions) if (m.id === id) return m;
  return null;
}

/** Mise po dané misi ve stejném aktu ('' = v aktu už nic dalšího není). */
export function nextMission(id: string): string {
  for (const a of ACTS) {
    const i = a.missions.findIndex((m) => m.id === id);
    if (i >= 0) return a.missions[i + 1]?.id ?? '';
  }
  return '';
}
