import { describe, expect, it } from 'vitest';
import { damageState, explosionDamageAt, EXPLOSION_RADIUS, impactDamage, IMPACT_THRESHOLD } from './damage';

describe('poškození', () => {
  it('ťuknutí nic neudělá, tvrdý náraz ano', () => {
    expect(impactDamage(IMPACT_THRESHOLD)).toBe(0);
    expect(impactDamage(190)).toBeGreaterThan(40);
  });

  it('stavy podle zbývajících životů', () => {
    expect(damageState(100, 100)).toBe('ok');
    expect(damageState(50, 100)).toBe('smoke');
    expect(damageState(20, 100)).toBe('fire');
    expect(damageState(0, 100)).toBe('wrecked');
  });

  it('výbuch zraní víc zblízka a nic za dosahem', () => {
    expect(explosionDamageAt(0)).toBeGreaterThan(explosionDamageAt(EXPLOSION_RADIUS / 2));
    expect(explosionDamageAt(EXPLOSION_RADIUS)).toBe(0);
  });
});
