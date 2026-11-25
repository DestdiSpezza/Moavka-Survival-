import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import {
  absorbDamage, canFire, consumeAmmo, cycleWeapon, deathPenalty, inMeleeArc, newArsenal, pelletAngles,
  pickupWeapon, rayCircleHit, selectWeapon, WEAPONS,
} from './combat';

describe('výbava', () => {
  it('na začátku jen pěsti, které můžou pořád', () => {
    const a = newArsenal();
    expect(a.owned).toEqual(['fists']);
    expect(canFire(a)).toBe(true);
  });

  it('sebraná zbraň se vezme do ruky a dostane munici; další kus doplní munici do maxima', () => {
    let a = pickupWeapon(newArsenal(), 'pistol');
    expect(a.current).toBe('pistol');
    expect(a.ammo.pistol).toBe(WEAPONS.pistol.pickupAmmo);
    a = selectWeapon(a, 'fists');
    for (let i = 0; i < 20; i++) a = pickupWeapon(a, 'pistol');
    expect(a.current).toBe('fists');
    expect(a.ammo.pistol).toBe(WEAPONS.pistol.maxAmmo);
  });

  it('zbraně jsou v pevném pořadí a kolečko je točí dokola', () => {
    let a = pickupWeapon(pickupWeapon(newArsenal(), 'smg'), 'bat');
    expect(a.owned).toEqual(['fists', 'bat', 'smg']);
    a = selectWeapon(a, 'smg');
    expect(cycleWeapon(a, 1).current).toBe('fists');
    expect(cycleWeapon(a, -1).current).toBe('bat');
  });

  it('nevlastněnou zbraň nejde vybrat a bez munice nejde střílet', () => {
    let a = selectWeapon(newArsenal(), 'shotgun');
    expect(a.current).toBe('fists');
    a = pickupWeapon(a, 'shotgun');
    for (let i = 0; i < WEAPONS.shotgun.pickupAmmo; i++) a = consumeAmmo(a);
    expect(a.ammo.shotgun).toBe(0);
    expect(canFire(a)).toBe(false);
  });
});

describe('zdraví a vesta', () => {
  it('bez vesty jde celý zásah do zdraví', () => {
    expect(absorbDamage(100, 0, 30)).toEqual({ health: 70, armor: 0 });
  });
  it('vesta vezme dvě třetiny, dokud vydrží', () => {
    expect(absorbDamage(100, 50, 30)).toEqual({ health: 90, armor: 30 });
    const r = absorbDamage(100, 5, 30);
    expect(r.armor).toBe(0);
    expect(r.health).toBe(75);
  });
  it('zdraví neklesne pod nulu', () => {
    expect(absorbDamage(10, 0, 500).health).toBe(0);
  });
  it('smrt stojí 30 % peněz', () => {
    expect(deathPenalty(1000)).toEqual({ money: 700, lost: 300 });
  });
});

describe('zásahy', () => {
  it('úder trefí jen před sebou a v dosahu', () => {
    const me = { x: 0, y: 0 };
    expect(inMeleeArc(me, 0, { x: 12, y: 3 }, 16)).toBe(true);
    expect(inMeleeArc(me, 0, { x: -12, y: 0 }, 16)).toBe(false);
    expect(inMeleeArc(me, 0, { x: 30, y: 0 }, 16)).toBe(false);
  });

  it('výstřel trefí kruh v cestě, ne vedle ani za sebou ani za dostřelem', () => {
    const me = { x: 0, y: 0 };
    expect(rayCircleHit(me, 0, 200, { x: 100, y: 3 }, 5)).toBeCloseTo(96, 0);
    expect(rayCircleHit(me, 0, 200, { x: 100, y: 20 }, 5)).toBeNull();
    expect(rayCircleHit(me, 0, 200, { x: -100, y: 0 }, 5)).toBeNull();
    expect(rayCircleHit(me, 0, 50, { x: 100, y: 0 }, 5)).toBeNull();
  });

  it('broky se rozprostřou do vějíře kolem míření', () => {
    const angles = pelletAngles(1, 7, 0.45, createRng(1));
    expect(angles).toHaveLength(7);
    expect(Math.min(...angles)).toBeLessThan(1 - 0.15);
    expect(Math.max(...angles)).toBeGreaterThan(1 + 0.15);
    for (const a of angles) expect(Math.abs(a - 1)).toBeLessThanOrEqual(0.45);
  });
});
