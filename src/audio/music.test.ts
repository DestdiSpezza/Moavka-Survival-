import { describe, expect, it } from 'vitest';
import { defaultSettings, parseSettings, stepVolume } from '../systems/settings';
import { N, nextStation, noteFreq, STATIONS, stepSeconds } from './music';

describe('rádio', () => {
  it('ladění: A4 = 440 Hz, oktáva = dvojnásobek', () => {
    expect(noteFreq(0)).toBe(440);
    expect(noteFreq(12)).toBeCloseTo(880);
    expect(noteFreq(N.A3)).toBeCloseTo(220);
  });
  it('stanice mají stejně dlouhé stopy basy, melodie i bicích', () => {
    for (const s of STATIONS) {
      expect(s.lead.length, s.id).toBe(s.bass.length);
      expect(s.drums.length, s.id).toBe(s.bass.length);
      expect(stepSeconds(s)).toBeGreaterThan(0.05);
    }
  });
  it('přepínání stanic jde dokola přes vypnuto', () => {
    expect(nextStation(0)).toBe(1);
    expect(nextStation(STATIONS.length - 1)).toBe(-1);
    expect(nextStation(-1)).toBe(0);
  });
});

describe('nastavení', () => {
  it('hlasitost po 10 % v rozsahu 0–1', () => {
    expect(stepVolume(0.95, 1)).toBe(1);
    expect(stepVolume(0, -1)).toBe(0);
    expect(stepVolume(0.5, 1)).toBe(0.6);
  });
  it('poškozené nastavení dá výchozí hodnoty', () => {
    expect(parseSettings('nesmysl')).toEqual(defaultSettings());
    expect(parseSettings('{"music":7,"tutorial":false}')).toEqual({ ...defaultSettings(), music: 1, tutorial: false });
  });
});
