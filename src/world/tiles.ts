/** Typy dlaždic mapy. Číslo = index v tilesetu. */
export const Tile = {
  Grass: 0,
  Road: 1,
  Water: 2,
  Dam: 3,
  ForestFloor: 4,
  Tree: 5,
  Rock: 6,
  Wall: 7,
  Bridge: 8,
  Dirt: 9,
  RoofRed: 10,
  RoofGray: 11,
  RoofBrown: 12,
  Logs: 13,
} as const;
export type TileId = (typeof Tile)[keyof typeof Tile];
export const TILE_COUNT = 14;

const SOLID = new Set<number>([Tile.Water, Tile.Tree, Tile.Rock, Tile.Wall, Tile.RoofRed, Tile.RoofGray, Tile.RoofBrown, Tile.Logs]);

/** Dá se na dlaždici vstoupit? */
export function isSolid(tile: number): boolean {
  return SOLID.has(tile);
}

/** Zastaví kulku? Přes vodu se střílí, přes stromy, skály a domy ne. */
export function blocksBullets(tile: number): boolean {
  return isSolid(tile) && tile !== Tile.Water;
}

/** Násobitel rychlosti chůze na dané dlaždici (les a hlína zpomalují). */
export function speedFactor(tile: number): number {
  switch (tile) {
    case Tile.ForestFloor:
      return 0.55;
    case Tile.Dirt:
      return 0.85;
    case Tile.Road:
    case Tile.Bridge:
    case Tile.Dam:
      return 1.1;
    default:
      return 1;
  }
}
