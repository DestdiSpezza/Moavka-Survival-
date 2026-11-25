/** Zbraně, munice, zdraví a vesta. Čistá logika bez vykreslování. */

export type WeaponId = 'fists' | 'bat' | 'pistol' | 'shotgun' | 'smg' | 'caj';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  melee: boolean;
  /** Poškození jednoho zásahu (u brokovnice jednoho broku). */
  damage: number;
  /** Sekundy mezi výstřely nebo údery. */
  cooldown: number;
  /** Dosah v px. */
  range: number;
  pellets: number;
  /** Rozptyl v radiánech (celková šíře vějíře). */
  spread: number;
  /** Střílí, dokud držíš tlačítko. */
  auto: boolean;
  pickupAmmo: number;
  maxAmmo: number;
  /** Jak daleko je výstřel slyšet (chodci utíkají). */
  noise: number;
  /** Není to zbraň, ale věc v ruce: „útok“ ji nabídne (beskydský čaj, ADR-019). */
  item?: boolean;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  fists: { id: 'fists', name: 'Pěsti', melee: true, damage: 10, cooldown: 0.4, range: 16, pellets: 1, spread: 0, auto: false, pickupAmmo: 0, maxAmmo: 0, noise: 0 },
  bat: { id: 'bat', name: 'Pálka', melee: true, damage: 25, cooldown: 0.6, range: 20, pellets: 1, spread: 0, auto: false, pickupAmmo: 0, maxAmmo: 0, noise: 0 },
  pistol: { id: 'pistol', name: 'Pistole', melee: false, damage: 25, cooldown: 0.3, range: 260, pellets: 1, spread: 0.04, auto: false, pickupAmmo: 24, maxAmmo: 120, noise: 220 },
  shotgun: { id: 'shotgun', name: 'Brokovnice', melee: false, damage: 12, cooldown: 0.9, range: 150, pellets: 7, spread: 0.45, auto: false, pickupAmmo: 10, maxAmmo: 50, noise: 300 },
  smg: { id: 'smg', name: 'Samopal', melee: false, damage: 14, cooldown: 0.09, range: 230, pellets: 1, spread: 0.12, auto: true, pickupAmmo: 60, maxAmmo: 300, noise: 260 },
  caj: { id: 'caj', name: 'Beskydský čaj', melee: false, damage: 0, cooldown: 0.5, range: 26, pellets: 0, spread: 0, auto: false, pickupAmmo: 3, maxAmmo: 9, noise: 0, item: true },
};

export const WEAPON_ORDER: WeaponId[] = ['fists', 'bat', 'pistol', 'shotgun', 'smg', 'caj'];

export interface Arsenal {
  owned: WeaponId[];
  ammo: Record<WeaponId, number>;
  current: WeaponId;
}

export function newArsenal(): Arsenal {
  return { owned: ['fists'], ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0, caj: 0 }, current: 'fists' };
}

/** Sebrání zbraně: přidá ji do výbavy a doplní munici (do maxima). Novou zbraň rovnou vezme do ruky. */
export function pickupWeapon(a: Arsenal, id: WeaponId): Arsenal {
  const def = WEAPONS[id];
  const isNew = !a.owned.includes(id);
  const owned = isNew ? WEAPON_ORDER.filter((w) => w === id || a.owned.includes(w)) : a.owned;
  const ammo = { ...a.ammo, [id]: Math.min(def.maxAmmo, a.ammo[id] + def.pickupAmmo) };
  return { owned, ammo, current: isNew ? id : a.current };
}

export function selectWeapon(a: Arsenal, id: WeaponId): Arsenal {
  return a.owned.includes(id) ? { ...a, current: id } : a;
}

/** Další/předchozí vlastněná zbraň (kolečko myši, Q). */
export function cycleWeapon(a: Arsenal, dir: 1 | -1): Arsenal {
  const i = a.owned.indexOf(a.current);
  const next = a.owned[(i + dir + a.owned.length) % a.owned.length];
  return { ...a, current: next };
}

export function canFire(a: Arsenal): boolean {
  const def = WEAPONS[a.current];
  return def.melee || a.ammo[a.current] > 0;
}

export function consumeAmmo(a: Arsenal): Arsenal {
  if (WEAPONS[a.current].melee) return a;
  return { ...a, ammo: { ...a.ammo, [a.current]: Math.max(0, a.ammo[a.current] - 1) } };
}

/** Vesta pohltí dvě třetiny zásahu, dokud vydrží. */
export function absorbDamage(health: number, armor: number, damage: number): { health: number; armor: number } {
  const toArmor = Math.min(armor, damage * (2 / 3));
  return { health: Math.max(0, health - (damage - toArmor)), armor: armor - toArmor };
}

export interface Point {
  x: number;
  y: number;
}

/** Je cíl v dosahu úderu (výseč před útočníkem)? */
export function inMeleeArc(origin: Point, angle: number, target: Point, range: number, halfArc = Math.PI / 3): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  let d = Math.atan2(dy, dx) - angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) <= halfArc;
}

/** Průsečík paprsku (výstřelu) s kruhem: vzdálenost k zásahu, nebo null. */
export function rayCircleHit(origin: Point, angle: number, range: number, center: Point, radius: number): number | null {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const ox = center.x - origin.x;
  const oy = center.y - origin.y;
  const along = ox * dx + oy * dy;
  if (along < 0) return null;
  const perp2 = ox * ox + oy * oy - along * along;
  const r2 = radius * radius;
  if (perp2 > r2) return null;
  const t = along - Math.sqrt(r2 - perp2);
  const hit = Math.max(0, t);
  return hit <= range ? hit : null;
}

/** Směry broků/kulek: rovnoměrně v rozptylu s malou náhodou. */
export function pelletAngles(base: number, pellets: number, spread: number, rnd: () => number): number[] {
  if (pellets === 1) return [base + (rnd() - 0.5) * spread];
  const out: number[] = [];
  for (let i = 0; i < pellets; i++) {
    const t = i / (pellets - 1) - 0.5;
    out.push(base + t * spread + (rnd() - 0.5) * (spread / pellets));
  }
  return out;
}

/** Po smrti si doktor ve zdravotním středisku vezme 30 % peněz. */
export const DEATH_FEE = 0.3;
export function deathPenalty(money: number): { money: number; lost: number } {
  const lost = Math.round(money * DEATH_FEE);
  return { money: money - lost, lost };
}

/** Výbuch zraní lidi víc než auta (auta mají plech). */
export const PERSON_EXPLOSION_DAMAGE = 70;
