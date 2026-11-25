import { AREAS, type AreaId } from './areas';
import { buildArea, type WorldMap } from './moravka';
import { buildMoravka } from './realMoravka';

/** Mapa oblasti: Morávka má vlastní mapu podle skutečné vesnice, ostatní jsou generovaná údolí. */
export function buildWorld(id: AreaId): WorldMap {
  if (id === 'moravka') return buildMoravka();
  const a = AREAS[id];
  return buildArea(a.seed, a.phase);
}
