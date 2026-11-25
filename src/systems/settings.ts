import { clamp } from './math';

/** Nastavení hráče (hlasitosti, tutoriál). Drží se v prohlížeči. */
export interface Settings {
  master: number;
  music: number;
  sfx: number;
  tutorial: boolean;
}

export const SETTINGS_KEY = 'survive-moravka-settings-v1';

export function defaultSettings(): Settings {
  return { master: 0.8, music: 0.6, sfx: 0.8, tutorial: true };
}

/** Hlasitost se mění po 10 % a drží se v rozsahu 0–1. */
export function stepVolume(v: number, dir: 1 | -1): number {
  return clamp(Math.round((v + dir * 0.1) * 10) / 10, 0, 1);
}

export function parseSettings(text: string | null): Settings {
  const d = defaultSettings();
  if (!text) return d;
  try {
    const s = JSON.parse(text) as Partial<Settings>;
    const vol = (x: unknown, def: number) => (typeof x === 'number' && Number.isFinite(x) ? clamp(x, 0, 1) : def);
    return { master: vol(s.master, d.master), music: vol(s.music, d.music), sfx: vol(s.sfx, d.sfx), tutorial: typeof s.tutorial === 'boolean' ? s.tutorial : d.tutorial };
  } catch {
    return d;
  }
}

export function loadSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Bez úložiště se nastavení prostě nezapamatuje.
  }
}
