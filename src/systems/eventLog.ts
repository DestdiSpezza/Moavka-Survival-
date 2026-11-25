/**
 * Deník událostí světa. Každá událost může mít příčinu (jinou událost),
 * takže z deníku jde poskládat řetězec „divočák → brzdění → náraz → hádka → policie“
 * a změřit, kolik systémů se do něj zapojilo.
 */

export type SystemTag = 'player' | 'traffic' | 'police' | 'crowd' | 'animals' | 'gangs' | 'witness';

export const SYSTEM_NAMES: Record<SystemTag, string> = {
  player: 'hráč',
  traffic: 'doprava',
  police: 'policie',
  crowd: 'lidé',
  animals: 'zvířata',
  gangs: 'skupiny',
  witness: 'svědci',
};

export interface WorldEvent {
  id: number;
  /** Herní čas v sekundách. */
  t: number;
  kind: string;
  text: string;
  x: number;
  y: number;
  systems: SystemTag[];
  cause: number | null;
}

/** Jak dlouho po události ji ještě jde považovat za příčinu další (s). */
export const CAUSE_WINDOW = 25;
const MAX_EVENTS = 400;

export class EventLog {
  private events: WorldEvent[] = [];
  private nextId = 1;

  add(e: Omit<WorldEvent, 'id'>): number {
    const id = this.nextId++;
    this.events.push({ ...e, id });
    if (this.events.length > MAX_EVENTS) this.events.shift();
    return id;
  }

  get(id: number): WorldEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  get all(): readonly WorldEvent[] {
    return this.events;
  }

  /** Řetězec od prvotní příčiny k dané události. */
  chain(id: number): WorldEvent[] {
    const out: WorldEvent[] = [];
    const seen = new Set<number>();
    let cur = this.get(id);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      out.unshift(cur);
      cur = cur.cause !== null ? this.get(cur.cause) : undefined;
    }
    return out;
  }

  systemsOf(id: number): Set<SystemTag> {
    const s = new Set<SystemTag>();
    for (const e of this.chain(id)) for (const tag of e.systems) s.add(tag);
    return s;
  }

  /** Konce řetězců (události, které nejsou příčinou ničeho dalšího). */
  leaves(): WorldEvent[] {
    const causes = new Set(this.events.map((e) => e.cause).filter((c): c is number => c !== null));
    return this.events.filter((e) => !causes.has(e.id));
  }

  /**
   * Kolik různých řetězců zapojilo aspoň `minSystems` systémů.
   * withoutPlayer: počítat jen řetězce, kde hráč nebyl vůbec.
   */
  countChains(minSystems: number, withoutPlayer: boolean): number {
    const roots = new Set<number>();
    for (const leaf of this.leaves()) {
      const chain = this.chain(leaf.id);
      if (chain.length < 2) continue;
      const systems = this.systemsOf(leaf.id);
      if (withoutPlayer && systems.has('player')) continue;
      // Bez započtení svědků jako samostatného systému by „lidé → svědek“ byl jeden systém dvakrát.
      if (systems.size >= minSystems) roots.add(chain[0].id);
    }
    return roots.size;
  }
}

/** Platná příčina: událost v časovém okně, jinak žádná. */
export function validCause(lastId: number | null | undefined, lastAt: number | undefined, now: number): number | null {
  if (!lastId || lastAt === undefined) return null;
  return now - lastAt <= CAUSE_WINDOW ? lastId : null;
}
