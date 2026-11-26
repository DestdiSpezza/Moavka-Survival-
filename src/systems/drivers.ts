/**
 * Řidiči v provozu nejsou stejní: většina jezdí normálně, někdo spěchá,
 * někdo kouká do mobilu a večer vyrazí od hospody opilci.
 * Reakční doba určuje, jak rychle řidič zareaguje na překážku před sebou;
 * zpožděná reakce je zdroj nárazů zezadu.
 */

export type DriverTrait = 'normal' | 'speeder' | 'distracted' | 'drunk';

export interface Driver {
  trait: DriverTrait;
  /** Cílová rychlost v px/s. */
  cruise: number;
  /** Reakční doba v sekundách. */
  reaction: number;
  /** Kličkování (opilci). */
  swerve: number;
}

export const DRIVER_LINES: Record<DriverTrait, string> = {
  normal: 'řidič',
  speeder: 'spěchající řidič',
  distracted: 'řidič s mobilem',
  drunk: 'opilý řidič',
};

export function rollDriver(rnd: () => number, evening: boolean): Driver {
  const r = rnd();
  // Opilců a mobilů je málo (ať je vesnice živá, ale nebourá se každou minutu).
  if (evening && r < 0.04) return { trait: 'drunk', cruise: 100 + rnd() * 20, reaction: 0.9, swerve: 0.45 };
  if (r < 0.16) return { trait: 'speeder', cruise: 110 + rnd() * 12, reaction: 0.2, swerve: 0 };
  if (r < 0.22) return { trait: 'distracted', cruise: 75 + rnd() * 10, reaction: 0.35, swerve: 0 };
  return { trait: 'normal', cruise: 80 + rnd() * 15, reaction: 0.15, swerve: 0 };
}

/** Opilec za volantem. */
export function drunkDriver(rnd: () => number): Driver {
  return { trait: 'drunk', cruise: 105 + rnd() * 25, reaction: 1.1, swerve: 0.6 };
}

/**
 * Brzdí řidič? Překážka musí být vidět aspoň tak dlouho, jak trvá jeho reakce.
 * Vrací nový čas, odkdy překážku vidí (0 = nevidí).
 */
export function reactToObstacle(obstacleAhead: boolean, seenSince: number, now: number, reaction: number): { brake: boolean; seenSince: number } {
  if (!obstacleAhead) return { brake: false, seenSince: 0 };
  const since = seenSince || now;
  return { brake: now - since >= reaction, seenSince: since };
}

/** Prudké brzdění: zpomalení nad tuto hodnotu (px/s²) při rychlosti nad 50 px/s. */
export const HARD_BRAKE = 160;
/** Náraz mezi auty, ze kterého je nehoda (rozdíl rychlostí v px/s). */
export const CRASH_SPEED = 45;
