import Phaser from 'phaser';
import { TILE } from '../config';
import { Pedestrian } from '../entities/Pedestrian';
import type { Vehicle } from '../entities/Vehicle';
import type { Point } from '../systems/combat';
import { lineOfSight } from '../systems/sight';
import type { CrimeKind } from '../systems/wanted';
import {
  callChance, callDuration, describe, describeText, type Description, MAX_CALLERS, mistaken, WITNESS_RANGE,
} from '../systems/witness';
import { T } from '../texts/cs';
import { blocksBullets } from '../world/tiles';
import type { CrimeEvent } from './Combat';
import type { GameScene } from './GameScene';

export type NpcCrimeKind = 'runOver' | 'hitAndRun' | 'assault' | 'drunk' | 'boar';

export const NPC_CRIME_TEXT: Record<NpcCrimeKind, string> = {
  runOver: 'srazil chodce',
  hitAndRun: 'ujel od nehody',
  assault: 'rvačka',
  drunk: 'opilý za volantem',
  boar: 'omráčený na silnici',
};

/** Podezřelý z řad NPC: řidič auta, nebo postava. */
export interface NpcSuspect {
  vehicle?: Vehicle;
  ped?: Pedestrian;
  /** „řidiče bílé dodávky“, „rváče“ – pro rozhlas a rádio. */
  label: string;
  /** Událost výjezdu hlídky: zatčení na ni navazuje, i když auto mezitím brzdilo. */
  caseId?: number;
}

interface Crime {
  id: number;
  kind: CrimeKind | NpcCrimeKind;
  at: Point;
  t: number;
  suspect: 'player' | NpcSuspect;
  description: Description;
  reported: boolean;
  eventId: number;
}

interface Call {
  witness: Pedestrian;
  crime: Crime;
  until: number;
  hp: number;
  intimidated: boolean;
}

const MERGE_SECONDS = 3;
const MERGE_DISTANCE = 90;

/**
 * Svědci: zločin zvedne hledanost, jen když ho vidí policista, nebo když ho
 * svědek nahlásí. Volání trvá pár vteřin a jde přerušit (zabít, zranit, zastrašit).
 * Hlášení nese popis pachatele, ve kterém se svědek může splést.
 * Stejně fungují i zločiny NPC (nehoda s útěkem, sražený chodec, opilec).
 */
export class Witnesses {
  private crimes: Crime[] = [];
  private calls: Call[] = [];
  private nextId = 1;

  constructor(private game: GameScene) {
    game.events.on('crime', (e: CrimeEvent) => this.playerCrime(e));
  }

  private get now(): number {
    return this.game.time.now / 1000;
  }

  /** Probíhá hovor s policií o hráči? (pro HUD a testy) */
  get activeCalls(): number {
    return this.calls.length;
  }

  /** Telefonuje tahle postava zrovna s policií? */
  isCalling(p: Pedestrian): boolean {
    return this.calls.some((c) => c.witness === p);
  }

  // ---------- Zločiny ----------

  private playerCrime(e: CrimeEvent): void {
    const g = this.game;
    if (g.player.dead) return;
    const now = this.now;
    // Dávka ze samopalu nebo opakované rány na jednom místě = jeden zločin.
    const recent = this.crimes.find(
      (c) => c.suspect === 'player' && c.kind === e.kind && now - c.t < MERGE_SECONDS && Phaser.Math.Distance.Between(c.at.x, c.at.y, e.x, e.y) < MERGE_DISTANCE,
    );
    if (recent) {
      recent.t = now;
      if (recent.reported && g.police.observes(e)) g.police.report({ kind: e.kind, at: e, description: this.playerDescription(e), seen: true });
      return;
    }
    const description = this.playerDescription(e);
    const eventId = g.logEvent('crime', `zločin hráče (${e.kind})`, e, ['player'], [g.causeOf(g.player)], [g.player]);
    const crime: Crime = { id: this.nextId++, kind: e.kind, at: { x: e.x, y: e.y }, t: now, suspect: 'player', description, reported: false, eventId };
    this.crimes.push(crime);
    this.pruneCrimes();

    if (g.police.observes(e)) {
      crime.reported = true;
      g.logEvent('police-saw', 'policie to viděla', e, ['police'], [eventId]);
      g.police.report({ kind: e.kind, at: e, description, seen: true });
      return;
    }
    this.findWitnesses(crime, e.witness ?? null);
  }

  /** Jak hráč vypadá pro svědka zločinu. */
  private playerDescription(e: CrimeEvent): Description {
    const g = this.game;
    // Krádež: svědek vidí osobu, která do auta nastupuje, a to auto.
    if (e.vehicle) return { vehicle: { kind: e.vehicle.spec.kind, color: e.vehicle.paint }, personKnown: true };
    const app = g.playerAppearance();
    return describe(app, !app.vehicle);
  }

  /** Zločin NPC (nehoda s útěkem, sražený chodec, rvačka, opilec za volantem). */
  npcCrime(kind: NpcCrimeKind, at: Point, suspect: NpcSuspect, cause: number | null, forcedWitness: Pedestrian | null = null): void {
    const g = this.game;
    const now = this.now;
    if (this.crimes.some((c) => c.suspect !== 'player' && (c.suspect.vehicle ?? c.suspect.ped) === (suspect.vehicle ?? suspect.ped) && now - c.t < 10)) return;
    const eventId = g.logEvent('npc-crime', `${suspect.label}: ${NPC_CRIME_TEXT[kind]}`, at, ['crowd'], [cause]);
    const description: Description = { vehicle: suspect.vehicle ? { kind: suspect.vehicle.spec.kind, color: suspect.vehicle.paint } : null, personKnown: !!suspect.ped };
    const crime: Crime = { id: this.nextId++, kind, at: { x: at.x, y: at.y }, t: now, suspect, description, reported: false, eventId };
    this.crimes.push(crime);
    this.pruneCrimes();
    if (g.police.observes(at)) {
      crime.reported = true;
      g.logEvent('police-saw', 'policie to viděla', at, ['police'], [eventId]);
      g.police.reportNpc(suspect, NPC_CRIME_TEXT[kind], at, eventId);
      return;
    }
    this.findWitnesses(crime, forcedWitness);
  }

  private pruneCrimes(): void {
    const now = this.now;
    this.crimes = this.crimes.filter((c) => now - c.t < 60);
  }

  // ---------- Svědci a hovory ----------

  private findWitnesses(crime: Crime, forced: Pedestrian | null): void {
    const g = this.game;
    const againstPlayer = crime.suspect === 'player';
    const suspectPed = crime.suspect !== 'player' ? crime.suspect.ped : undefined;
    const candidates = g.combat.peds
      .filter((p) => p.alive && p.active && (p.role === 'civil' || p.role === 'gang') && p !== suspectPed && !p.scripted)
      .map((p) => ({ p, d: Phaser.Math.Distance.Between(p.x, p.y, crime.at.x, crime.at.y) }))
      .filter(({ p, d }) => d < WITNESS_RANGE && lineOfSight(g.world.tiles, TILE, p, crime.at, blocksBullets))
      .sort((a, b) => a.d - b.d);
    let callers = 0;
    if (forced && forced.alive) {
      this.startCall(forced, crime);
      callers++;
    }
    for (const { p } of candidates) {
      if (callers >= MAX_CALLERS) break;
      if (this.calls.some((c) => c.witness === p)) continue;
      const kind = p.role === 'gang' ? 'gang' : p.tough ? 'tough' : 'civil';
      const attitude = p.group ? g.gangs.attitudeOf(p.group) : null;
      // Po „s nikým se bavit nechci“ je vesnice podezíravější (ADR-006).
      const wary = g.story?.has('refusedTalk') ? 1.25 : 1;
      if (g.random() >= callChance(kind, attitude, againstPlayer) * wary) continue;
      this.startCall(p, crime);
      callers++;
    }
  }

  private startCall(p: Pedestrian, crime: Crime): void {
    const g = this.game;
    this.calls.push({ witness: p, crime, until: this.now + callDuration(g.random), hp: p.hp, intimidated: false });
    g.logEvent('call', 'svědek volá policii', p, ['witness'], [crime.eventId], [p]);
    if (g.inView(p.x, p.y)) g.floatText(p.x, p.y - 10, pick(T.village.calling, g.random), '#9fc4ff', 2400);
  }

  update(): void {
    const g = this.game;
    const now = this.now;
    for (const c of this.calls) {
      const w = c.witness;
      if (!w.active || !w.alive) {
        c.until = -1;
        g.logEvent('call-cut', T.village.silenced, w, ['witness'], [c.crime.eventId]);
        continue;
      }
      if (w.hp < c.hp) {
        c.until = -1;
        continue;
      }
      // Zastrašení: hráč se zbraní v ruce stojí přímo u volajícího.
      const weapon = g.player.arsenal.current;
      const armed = weapon !== 'fists';
      if (!c.intimidated && !g.driving && armed && c.crime.suspect === 'player' && Phaser.Math.Distance.Between(w.x, w.y, g.player.x, g.player.y) < 28) {
        c.intimidated = true;
        if (g.random() < 0.7) {
          c.until = -1;
          g.floatText(w.x, w.y - 10, pick(T.village.intimidated, g.random), '#ffffff', 2000);
          continue;
        }
      }
      if (now >= c.until) this.complete(c);
    }
    this.calls = this.calls.filter((c) => c.until > 0 && now < c.until);
  }

  private complete(c: Call): void {
    const g = this.game;
    c.until = -1;
    const crime = c.crime;
    if (crime.reported) return;
    crime.reported = true;
    const description = mistaken(crime.description, g.random);
    const id = g.logEvent('reported', 'nahlášeno policii', c.witness, ['witness'], [crime.eventId], [c.witness]);
    if (crime.suspect === 'player') {
      if (g.inView(c.witness.x, c.witness.y)) {
        const popis = describeText(description, T.village.person);
        g.floatText(c.witness.x, c.witness.y - 10, pick(T.village.reported, g.random).replace('{popis}', popis), '#9fc4ff', 2600);
      }
      g.police.report({ kind: crime.kind as CrimeKind, at: crime.at, description, seen: false });
    } else {
      g.police.reportNpc(crime.suspect, NPC_CRIME_TEXT[crime.kind as NpcCrimeKind], crime.at, id);
    }
  }
}

function pick<T>(items: readonly T[], rnd: () => number): T {
  return items[Math.floor(rnd() * items.length)];
}
