import Phaser from 'phaser';
import { Pedestrian } from '../entities/Pedestrian';
import type { Vehicle } from '../entities/Vehicle';
import { isEvening } from '../systems/clock';
import { CRASH_SPEED } from '../systems/drivers';
import { vehicleText } from '../systems/witness';
import { T } from '../texts/cs';
import { placeLabel } from '../world/areas';
import { zoneAt } from '../world/moravka';
import { CIVILIANS } from '../art/sprites';
import { TILE } from '../config';
import type { GameScene } from './GameScene';

type ArgPhase = 'meet' | 'argue' | 'fight' | 'leave';

interface Argument {
  cars: [Vehicle, Vehicle];
  peds: [Pedestrian, Pedestrian];
  started: number;
  phase: ArgPhase;
  nextLine: number;
  speaker: 0 | 1;
  phaseUntil: number;
  aggressor: 0 | 1;
  eventId: number;
}

interface PlayerCrash {
  car: Vehicle;
  driver: Pedestrian;
  until: number;
  eventId: number;
}

const ARGUE_SECONDS = 8;
const FIGHT_SECONDS = 7;
const MAX_ARGUMENTS = 2;

/**
 * Nehody a jejich dohry bez scénáře: náraz dvou aut → řidiči vystoupí a hádají se →
 * usmíří se, poperou, nebo jeden ujede. Sražený chodec, opilci od hospody,
 * hráč, který někoho nabourá a ujede (poškozený řidič volá policii).
 */
export class Incidents {
  private args: Argument[] = [];
  private playerCrashes: PlayerCrash[] = [];
  private pairCooldown = new Map<string, number>();
  private drunkTimer = 0;
  /** Kdy koho naposledy srazilo auto (jeden náraz = jedna událost, ne každý snímek). */
  private runOverAt = new WeakMap<Pedestrian, number>();

  constructor(private game: GameScene) {}

  private get now(): number {
    return this.game.time.now / 1000;
  }

  private placeName(x: number, y: number): string {
    const g = this.game;
    const z = zoneAt(g.world, Math.floor(x / TILE), Math.floor(y / TILE));
    return z === 'Morávka' ? g.area.name : placeLabel(g.area.id, z);
  }

  /** Je auto zapletené do hádky nebo nehody s hráčem? */
  involves(v: Vehicle): boolean {
    return this.busy(v);
  }

  private busy(v: Vehicle): boolean {
    return this.args.some((a) => a.cars.includes(v)) || this.playerCrashes.some((c) => c.car === v);
  }

  // ---------- Nárazy ----------

  /** Dvě auta v provozu do sebe narazila. */
  onCrash(a: Vehicle, b: Vehicle, speed: number): void {
    const g = this.game;
    const key = [g.vehicles.indexOf(a), g.vehicles.indexOf(b)].sort().join('-');
    if (this.now - (this.pairCooldown.get(key) ?? -100) < 15) return;
    this.pairCooldown.set(key, this.now);
    const cause = [g.causeOf(a), g.causeOf(b)].filter((c): c is number => c !== null).sort((x, y) => y - x)[0] ?? null;
    const at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const crashId = g.logEvent('crash', `nehoda ${g.driverLabel(a)} × ${g.driverLabel(b)} (${Math.round(speed)} px/s)`, at, ['traffic'], [cause], [a, b]);
    g.announcer.say('rozhlas', T.village.rozhlasCrash.replace('{místo}', this.placeName(at.x, at.y)), 'crash', 120);
    // Kdo ujíždí, ten nezastavuje.
    if (g.isFleeing(a) || g.isFleeing(b) || a.wrecked || b.wrecked) return;
    if (this.busy(a) || this.busy(b) || this.args.length >= MAX_ARGUMENTS) return;
    this.startArgument(a, b, crashId);
  }

  /** Hráč nabourá auto v provozu: řidič vystoupí a nadává; když hráč ujede, volá policii. */
  onPlayerCrash(npcCar: Vehicle, speed: number): void {
    const g = this.game;
    if (this.busy(npcCar) || npcCar.wrecked || speed < CRASH_SPEED) return;
    const id = g.logEvent('player-crash', 'hráč nabořil auto', npcCar, ['player', 'traffic'], [g.causeOf(npcCar)], [npcCar]);
    const driver = this.spawnDriver(npcCar);
    g.holdTraffic(npcCar, 30);
    g.floatText(driver.x, driver.y - 10, pick(T.village.argue, g.random), '#ffffff', 2000);
    this.playerCrashes.push({ car: npcCar, driver, until: this.now + 7, eventId: id });
  }

  private startArgument(a: Vehicle, b: Vehicle, cause: number): void {
    const g = this.game;
    g.holdTraffic(a, 45);
    g.holdTraffic(b, 45);
    const pa = this.spawnDriver(a);
    const pb = this.spawnDriver(b);
    const id = g.logEvent('argue', 'řidiči se hádají', a, ['crowd'], [cause], [a, b, pa, pb]);
    this.args.push({
      cars: [a, b], peds: [pa, pb], started: this.now, phase: 'meet', nextLine: this.now + 1.2, speaker: 0,
      phaseUntil: this.now + 2, aggressor: g.random() < 0.5 ? 0 : 1, eventId: id,
    });
  }

  /** Řidič vystoupí na straně řidiče (vlevo). */
  private spawnDriver(v: Vehicle): Pedestrian {
    const g = this.game;
    const a = v.rotation - Math.PI / 2;
    const off = v.spec.width / 2 + 7;
    let x = v.x + Math.cos(a) * off;
    let y = v.y + Math.sin(a) * off;
    if (g.isSolidAt(x, y)) {
      x = v.x - Math.cos(a) * off;
      y = v.y - Math.sin(a) * off;
    }
    const look = Math.floor(g.random() * CIVILIANS.length);
    const p = new Pedestrian(g, x, y, look, look >= 4);
    p.scripted = true;
    p.lastEventId = v.lastEventId;
    p.lastEventAt = v.lastEventAt;
    g.cameras.getCamera('minimap')?.ignore(p);
    g.combat.peds.push(p);
    return p;
  }

  /** Řidič nastoupí zpátky a pokračuje v cestě (nebo ujíždí). */
  private reboard(p: Pedestrian, v: Vehicle, flee: boolean): void {
    const g = this.game;
    if (p.active) p.destroy();
    if (v.wrecked || !v.active) return;
    g.releaseTraffic(v, flee);
  }

  /** Poškozený nastoupí až po hovoru s policií (jinak by hovor utnul). */
  private reboardAfterCall(p: Pedestrian, v: Vehicle, delayMs: number): void {
    this.game.time.delayedCall(delayMs, () => {
      if (p.active && p.alive && this.game.witnesses.isCalling(p)) this.reboardAfterCall(p, v, 1500);
      else if (p.active && p.alive) this.reboard(p, v, false);
    });
  }

  // ---------- Každý snímek ----------

  update(dt: number): void {
    const now = this.now;
    for (const arg of this.args) this.updateArgument(arg, now);
    this.args = this.args.filter((a) => a.phase !== 'leave' || now < a.phaseUntil);
    for (const c of this.playerCrashes) this.updatePlayerCrash(c, now);
    this.playerCrashes = this.playerCrashes.filter((c) => now < c.until);
    this.drunkTimer += dt;
    if (this.drunkTimer > 60) {
      this.drunkTimer = 0;
      this.maybeDrunk();
    }
    this.watchDrunks();
  }

  private updateArgument(arg: Argument, now: number): void {
    const g = this.game;
    const [pa, pb] = arg.peds;
    const alive = (p: Pedestrian) => p.active && p.alive;
    // Pojistka: hádka nesmí blokovat silnici navždy.
    if (now - arg.started > 40 && arg.phase !== 'leave') this.finishArgument(arg, -1);
    if (arg.phase === 'leave') return;
    if (!alive(pa) || !alive(pb)) {
      this.finishArgument(arg, -1);
      return;
    }
    const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
    const face = (p: Pedestrian, q: Pedestrian) => {
      (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      p.setRotation(Phaser.Math.Angle.Between(p.x, p.y, q.x, q.y));
    };
    if (arg.phase === 'meet') {
      for (const [p, q] of [[pa, pb], [pb, pa]] as const) {
        if (Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) > 16) g.walkTo(p, mid, 40);
        else face(p, q);
      }
      if (now > arg.phaseUntil) {
        arg.phase = 'argue';
        arg.phaseUntil = now + ARGUE_SECONDS;
      }
      return;
    }
    face(pa, pb);
    face(pb, pa);
    if (arg.phase === 'argue') {
      if (now > arg.nextLine) {
        const p = arg.peds[arg.speaker];
        if (g.inView(p.x, p.y)) g.floatText(p.x, p.y - 10, pick(T.village.argue, g.random), '#ffffff', 1600);
        arg.speaker = arg.speaker ? 0 : 1;
        arg.nextLine = now + 1.7;
      }
      if (now > arg.phaseUntil) this.resolveArgument(arg, now);
      return;
    }
    // Rvačka: útočník mlátí druhého, dokud to neskončí nebo nepřijede policie.
    const att = arg.peds[arg.aggressor];
    const vic = arg.peds[arg.aggressor ? 0 : 1];
    if (now > arg.nextLine) {
      arg.nextLine = now + 0.8;
      g.combat.hurtPed(vic, 8, att, false);
    }
    if (now > arg.phaseUntil) this.finishArgument(arg, -1);
  }

  private resolveArgument(arg: Argument, now: number): void {
    const g = this.game;
    const r = g.random();
    const att = arg.peds[arg.aggressor];
    if (r < 0.4) {
      if (g.inView(att.x, att.y)) g.floatText(att.x, att.y - 10, pick(T.village.makeUp, g.random), '#9fffa0', 1800);
      g.logEvent('make-up', 'řidiči se usmířili', att, ['crowd'], [arg.eventId]);
      this.finishArgument(arg, -1);
    } else if (r < 0.75) {
      arg.phase = 'fight';
      arg.phaseUntil = now + FIGHT_SECONDS;
      arg.nextLine = now + 0.5;
      if (g.inView(att.x, att.y)) g.floatText(att.x, att.y - 10, pick(T.village.fightStart, g.random), '#ff9a6a', 1600);
      const id = g.logEvent('fight', 'rvačka řidičů', att, ['crowd'], [arg.eventId], [att]);
      g.witnesses.npcCrime('assault', att, { ped: att, label: 'rváče od nehody' }, id);
    } else {
      // Útočník nasedne a ujede; poškozený volá policii.
      if (g.inView(att.x, att.y)) g.floatText(att.x, att.y - 10, pick(T.village.fled, g.random), '#ff9a6a', 1600);
      const car = arg.cars[arg.aggressor];
      const vic = arg.peds[arg.aggressor ? 0 : 1];
      const id = g.logEvent('fled', 'řidič ujel od nehody', car, ['traffic'], [arg.eventId], [car]);
      this.reboard(att, car, true);
      g.witnesses.npcCrime('hitAndRun', car, { vehicle: car, label: `řidiče: ${vehicleText({ kind: car.spec.kind, color: car.paint })}` }, id, vic);
      // Poškozený odjede, až domluví s policií.
      this.reboardAfterCall(vic, arg.cars[arg.aggressor ? 0 : 1], 9000);
      arg.phase = 'leave';
      arg.phaseUntil = now + 10;
    }
  }

  /** Konec hádky: kdo může, nastoupí a jede dál (index = kdo už odjel jinak). */
  private finishArgument(arg: Argument, skip: number): void {
    arg.peds.forEach((p, i) => {
      if (i === skip) return;
      const car = arg.cars[i];
      if (p.active && p.alive && !car.wrecked) this.reboard(p, car, false);
      else if (p.active && p.alive) p.scripted = false; // bez auta: odejde pěšky
      else if (!car.wrecked) this.game.releaseTraffic(car, false, true);
    });
    arg.phase = 'leave';
    arg.phaseUntil = this.now + 1;
  }

  private updatePlayerCrash(c: PlayerCrash, now: number): void {
    const g = this.game;
    const d = c.driver;
    if (!d.active || !d.alive) {
      c.until = 0;
      return;
    }
    const f = g.driving ?? g.player;
    const dist = Phaser.Math.Distance.Between(d.x, d.y, f.x, f.y);
    if (dist > 140) {
      // Hráč ujel: řidič volá policii.
      c.until = 0;
      g.events.emit('crime', { x: f.x, y: f.y, kind: 'hitAndRun', witness: d });
      this.reboardAfterCall(d, c.car, 9000);
      return;
    }
    g.walkTo(d, f, 30);
    if (now >= c.until) {
      // Hráč zůstal: řidič si odplivne a jede dál.
      this.reboard(d, c.car, false);
    }
  }

  // ---------- Sražený chodec ----------

  /** Auto v provozu srazilo chodce: řidič zastaví, nebo ujede. */
  onRunOver(v: Vehicle, victim: Pedestrian): void {
    const g = this.game;
    if (v.driver !== 'npc') return;
    if (this.now - (this.runOverAt.get(victim) ?? -100) < 3) return;
    this.runOverAt.set(victim, this.now);
    const id = g.logEvent('run-over', 'auto srazilo chodce', victim, ['traffic', 'crowd'], [g.causeOf(v), g.causeOf(victim)], [v]);
    const label = `řidiče: ${vehicleText({ kind: v.spec.kind, color: v.paint })}`;
    if (g.isFleeing(v) || g.random() < 0.45) {
      g.releaseTraffic(v, true);
      g.witnesses.npcCrime('hitAndRun', v, { vehicle: v, label }, id);
      return;
    }
    g.holdTraffic(v, 5);
    if (g.inView(v.x, v.y)) g.floatText(v.x, v.y - 12, pick(T.village.runOverStop, g.random), '#ffffff', 2000);
    g.witnesses.npcCrime('runOver', v, { vehicle: v, label }, id);
  }

  // ---------- Opilci ----------

  /** Večer občas vyrazí od hospody opilý řidič. */
  private maybeDrunk(): void {
    const g = this.game;
    if (!isEvening(g.gangs.minute) || g.random() > 0.35) return;
    const v = g.addDrunkDriver();
    if (!v) return;
    g.logEvent('drunk', 'opilý řidič vyrazil od hospody', v, ['traffic', 'crowd'], [], [v]);
    g.announcer.say('rozhlas', T.village.rozhlasDrunk, 'drunk', 240);
  }

  /** Hlídka, která uvidí kličkujícího opilce, ho zastaví. */
  private watchDrunks(): void {
    const g = this.game;
    for (const v of g.drunkDrivers()) {
      if (!g.police.observes(v, 150)) continue;
      const id = g.logEvent('drunk-seen', 'hlídka si všimla opilce', v, ['police'], [g.causeOf(v)], [v]);
      if (g.random() < 0.6) g.releaseTraffic(v, true);
      g.witnesses.npcCrime('drunk', v, { vehicle: v, label: 'opilého řidiče' }, id);
      g.markDrunkSeen(v);
    }
  }

  // ---------- Zatčení NPC ----------

  /** Policie zadržela řidiče: auto zůstane stát prázdné. */
  arrestVehicle(v: Vehicle): void {
    this.game.removeFromTraffic(v);
    v.driver = 'none';
    this.game.scheduleTow(v, 20);
  }
}

function pick<T>(items: readonly T[], rnd: () => number): T {
  return items[Math.floor(rnd() * items.length)];
}
