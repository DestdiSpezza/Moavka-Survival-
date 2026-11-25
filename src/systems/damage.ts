/** Poškození vozidel: náraz → kouř → oheň → výbuch. */

export type DamageState = 'ok' | 'smoke' | 'fire' | 'wrecked';

/** Pod touto změnou rychlosti (px/s) se nic neděje: ťuknutí do obrubníku. */
export const IMPACT_THRESHOLD = 45;
const IMPACT_FACTOR = 0.3;
/** Hořící auto ztrácí 5 % životů za sekundu, takže z hranice ohně (25 %) vybuchne zhruba za 5 s. */
export const FIRE_BURN_FRACTION = 0.05;
export const EXPLOSION_RADIUS = 48;
export const EXPLOSION_DAMAGE = 35;

export function impactDamage(deltaV: number): number {
  return deltaV <= IMPACT_THRESHOLD ? 0 : (deltaV - IMPACT_THRESHOLD) * IMPACT_FACTOR;
}

export function damageState(hp: number, maxHp: number): DamageState {
  if (hp <= 0) return 'wrecked';
  const f = hp / maxHp;
  if (f <= 0.25) return 'fire';
  if (f <= 0.5) return 'smoke';
  return 'ok';
}

/** Výbuch zraní okolní auta tím víc, čím jsou blíž. */
export function explosionDamageAt(distance: number): number {
  if (distance >= EXPLOSION_RADIUS) return 0;
  return EXPLOSION_DAMAGE * (1 - distance / EXPLOSION_RADIUS);
}
