import type { VehicleKind } from '../world/vehicles';
import type { WeaponId } from './combat';

/** Výkupní ceny v garáži (plně funkční auto). */
const SELL_BASE: Record<VehicleKind, number> = {
  osobak: 220,
  dodavka: 320,
  terenak: 450,
  traktor: 260,
  policie: 600,
  zasahovka: 900,
  skutr: 120,
  kolo: 40,
  jerab: 1200,
};

/** Garáž vykoupí auto podle typu a stavu; rozbité za zlomek. */
export function sellPrice(kind: VehicleKind, hpFraction: number): number {
  const f = Math.max(0.15, Math.min(1, hpFraction));
  return Math.round((SELL_BASE[kind] * f) / 10) * 10;
}

/** Oprava: 2 Kč za každý chybějící bod životů, aspoň 50 Kč. */
export function repairCost(hp: number, maxHp: number): number {
  const missing = Math.max(0, maxHp - hp);
  return missing < 1 ? 0 : Math.max(50, Math.round((missing * 2) / 10) * 10);
}

/** Přelakování smaže hledanost do 3 hvězd; cena roste s úrovní. */
export const RESPRAY_MAX_LEVEL = 3;
export function resprayCost(level: number): number {
  return 150 + level * 100;
}

export type ShopItem = { id: WeaponId | 'vest' | 'medkit'; name: string; price: number };

/** „Pod pultem“ v obchodě. */
export const SHOP: ShopItem[] = [
  { id: 'pistol', name: 'Pistole + 24 nábojů', price: 200 },
  { id: 'shotgun', name: 'Brokovnice + 10 nábojů', price: 450 },
  { id: 'smg', name: 'Samopal + 60 nábojů', price: 900 },
  { id: 'vest', name: 'Neprůstřelná vesta', price: 300 },
  { id: 'medkit', name: 'Lékárnička (a slivovice)', price: 120 },
];

export const HIDEOUT_PRICE = 1000;

export function canAfford(money: number, price: number): boolean {
  return money >= price;
}
