/** Rádio v autě: tři stanice hrané syntezátorem. Čistá data a výpočty, bez zvuku. */

/** Frekvence noty: půltóny od A4 (440 Hz). */
export function noteFreq(semitonesFromA4: number): number {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

/** Pojmenované noty (půltóny od A4). */
export const N = {
  E2: -29, G2: -26, A2: -24, B2: -22, C3: -21, D3: -19, E3: -17, F3: -16, G3: -14, A3: -12,
  C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0, B4: 2, C5: 3, D5: 5, E5: 7,
} as const;

/** Jeden krok sekvenceru: null = ticho. */
export interface Station {
  id: string;
  name: string;
  /** Hláška moderátora po přepnutí. */
  dj: string;
  bpm: number;
  /** Kroky na dobu (4 = šestnáctiny). */
  stepsPerBeat: number;
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  /** Zkreslení basy (punk). */
  distortion: number;
  bass: Array<number | null>;
  lead: Array<number | null>;
  /** k = kopák, s = virbl, h = hi-hat, . = nic */
  drums: string;
}

const P = null;

export const STATIONS: Station[] = [
  {
    id: 'punk', name: 'Rádio Beskydy Punk', dj: 'Rádio Beskydy Punk: hrajeme nahlas, protože sousedi spí.',
    bpm: 176, stepsPerBeat: 2, bassWave: 'sawtooth', leadWave: 'square', distortion: 40,
    bass: [N.E2, N.E2, N.E2, N.E2, N.E2, N.E2, N.G2, N.G2, N.A2, N.A2, N.A2, N.A2, N.G2, N.G2, N.B2, N.B2],
    lead: [N.E4, P, N.E4, P, N.G4, P, N.E4, P, N.A4, P, N.G4, P, N.E4, P, N.D4, P],
    drums: 'khskkhshkhskkhsh',
  },
  {
    id: 'dechovka', name: 'Dechovka U Kapra', dj: 'Dechovka U Kapra: pro všechny, co už nemůžou řídit, a stejně řídí.',
    bpm: 132, stepsPerBeat: 1, bassWave: 'square', leadWave: 'triangle', distortion: 0,
    bass: [N.C3, P, P, N.G2, P, P, N.C3, P, P, N.G2, P, P, N.F3, P, P, N.C3, P, P, N.G2, P, P, N.G2, P, P],
    lead: [N.E4, N.F4, N.G4, N.G4, P, N.E4, N.F4, N.E4, N.D4, N.C4, P, P, N.A4, N.A4, N.G4, N.F4, P, N.E4, N.D4, N.E4, N.F4, N.E4, P, P],
    drums: 'k.hk.hk.hk.hk.hk.hk.hk.h',
  },
  {
    id: 'balada', name: 'Rádio Ekobalada', dj: 'Rádio Ekobalada: písně o stromech. Pro řidiče s výčitkami.',
    bpm: 84, stepsPerBeat: 2, bassWave: 'sine', leadWave: 'sine', distortion: 0,
    bass: [N.A2, P, P, P, N.F3, P, P, P, N.C3, P, P, P, N.G2, P, P, P],
    lead: [N.A3, N.C4, N.E4, N.C4, N.F3, N.A3, N.C4, N.A3, N.C4, N.E4, N.G4, N.E4, N.G3, N.B2, N.D4, N.B2],
    drums: 'k.......s.......',
  },
];

/** Délka jednoho kroku v sekundách. */
export function stepSeconds(s: Station): number {
  return 60 / s.bpm / s.stepsPerBeat;
}

/** Další stanice; po poslední rádio zmlkne (index -1). */
export function nextStation(current: number): number {
  return current + 1 >= STATIONS.length ? -1 : current + 1;
}
