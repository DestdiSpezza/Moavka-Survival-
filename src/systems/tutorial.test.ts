import { describe, expect, it } from 'vitest';
import { advanceTutorial, type TutorialState } from './tutorial';

const base: TutorialState = { moved: 0, sprinted: false, inCar: false, drove: 0, armed: false, missionStarted: false, wanted: 0, shownFor: 0 };

describe('tutoriál', () => {
  it('začíná pohybem a pokračuje, až hráč splní krok', () => {
    const done = new Set<string>();
    expect(advanceTutorial(done, null, base)).toBe('move');
    expect(advanceTutorial(done, 'move', base)).toBe('move');
    expect(advanceTutorial(done, 'move', { ...base, moved: 200 })).toBe('sprint');
  });

  it('co už hráč umí, přeskočí', () => {
    const done = new Set<string>();
    const s = { ...base, moved: 200, sprinted: true, inCar: true, drove: 700, armed: true };
    expect(advanceTutorial(done, null, s)).toBe('missions');
  });

  it('nápověda o policii čeká na první hvězdu', () => {
    const done = new Set(['move', 'sprint', 'car', 'drive', 'weapons', 'missions', 'respect']);
    expect(advanceTutorial(done, null, base)).toBe('goal');
    const done2 = new Set(['move', 'sprint', 'car', 'drive', 'weapons', 'missions', 'respect']);
    expect(advanceTutorial(done2, null, { ...base, wanted: 1 })).toBe('police');
  });

  it('nakonec nic', () => {
    const all = new Set(['move', 'sprint', 'car', 'drive', 'weapons', 'missions', 'respect', 'police', 'goal']);
    expect(advanceTutorial(all, null, base)).toBeNull();
  });
});
