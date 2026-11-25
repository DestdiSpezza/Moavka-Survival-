import Phaser from 'phaser';
import type { Vehicle } from '../entities/Vehicle';
import { driftScore, escapeBonus, isDrifting, SCORE, wreckScore } from '../systems/score';
import { lateralSpeed } from '../systems/vehicleModel';
import { AREAS, type AreaId, goalMet } from '../world/areas';
import { pixelFont } from './BootScene';
import type { PedHurtEvent } from './Combat';
import type { GameScene } from './GameScene';

interface Exit {
  to: AreaId;
  at: { x: number; y: number };
  /** Kam se hráč postaví, když přijde z té oblasti. */
  arrive: { x: number; y: number };
  marker: Phaser.GameObjects.Container;
}

export interface GoalHud {
  area: string;
  score: number;
  scoreGoal: number;
  money: number;
  moneyGoal: number;
  met: boolean;
  next: string | null;
}

/**
 * Postup: skóre za chaos a styl, cíl oblasti, výjezdy do dalších oblastí.
 */
export class Progression {
  exits: Exit[] = [];
  private driftTime = 0;
  private lastWreckAt = -100;
  private chain = 0;
  private atFiveFor = 0;
  private fiveRewarded = false;
  private blockedToastAt = -100;
  private goalAnnounced: boolean;

  constructor(private game: GameScene) {
    const area = game.area;
    const { next, prev } = game.world.exits;
    if (area.next) this.addExit(area.next, next.at, next.arrive, '▲');
    if (area.prev && prev) this.addExit(area.prev, prev.at, prev.arrive, '▼');
    this.goalAnnounced = this.goalReached();

    game.events.on('pedHurt', (e: PedHurtEvent) => {
      if (!e.killed || !e.byPlayer) return;
      const pts = e.ped.role === 'cop' ? SCORE.killCop : e.ped.role === 'gang' ? SCORE.killGang : SCORE.killCivil;
      game.addScore(pts, null);
    });
  }

  private addExit(to: AreaId, at: { x: number; y: number }, arrive: { x: number; y: number }, arrow: string): void {
    const g = this.game;
    const name = AREAS[to].name;
    const sign = g.add.text(0, 0, `${arrow} ${name}`, pixelFont(16, '#ffd23f')).setOrigin(0.5).setScale(0.5).setStroke('#000', 3);
    const pad = g.add.rectangle(0, 0, 30, 30, 0xffd23f, 0.15).setStrokeStyle(2, 0xffd23f);
    const marker = g.add.container(at.x, at.y, [pad, sign]).setDepth(5);
    g.cameras.getCamera('minimap')?.ignore(marker);
    this.exits.push({ to, at, arrive, marker });
  }

  /** Místo příjezdu z jiné oblasti (u výjezdu, který do ní vede). */
  arrivalFrom(from: AreaId): { x: number; y: number } | null {
    return this.exits.find((e) => e.to === from)?.arrive ?? null;
  }

  goalReached(): boolean {
    const g = this.game;
    return goalMet(g.area.id, g.areaScore, g.player.money);
  }

  update(dt: number): void {
    const g = this.game;
    this.scoreDrift(dt);
    this.scoreWantedFive(dt);

    // Cíl oblasti: oznámit jednou a odemknout další oblast.
    if (!this.goalAnnounced && this.goalReached()) {
      this.goalAnnounced = true;
      const next = g.area.next;
      if (next && !g.progress.unlocked.includes(next)) g.progress.unlocked.push(next);
      g.events.emit('banner', `${g.area.name.toUpperCase()} JE TVOJE`);
      g.toast(next ? `Máš tu jméno. Cesta do ${AREAS[next].toName} je otevřená (na severu).` : 'Dokázal jsi to.');
      g.saveGame(false);
    }

    const focus = g.driving ?? g.player;
    if (!g.player.dead) {
      for (const e of this.exits) {
        if (Phaser.Math.Distance.Between(focus.x, focus.y, e.at.x, e.at.y) > 22) continue;
        const target = AREAS[e.to];
        const now = g.time.now / 1000;
        if (!target.playable) {
          if (now - this.blockedToastAt > 4) g.toast(`${target.name} se teprve staví. Přijde v další fázi.`);
          this.blockedToastAt = now;
        } else if (g.progress.unlocked.includes(e.to)) {
          g.travel(e.to);
          return;
        } else {
          if (now - this.blockedToastAt > 4) g.toast(`Do ${target.toName} tě pustí, až tady splníš cíl oblasti.`);
          this.blockedToastAt = now;
        }
      }
    }

    g.registry.set('goal', {
      area: g.area.name,
      score: g.areaScore,
      scoreGoal: g.area.goal.score,
      money: g.player.money,
      moneyGoal: g.area.goal.money,
      met: this.goalAnnounced,
      next: g.area.next ? AREAS[g.area.next].name : null,
    } satisfies GoalHud);
  }

  /** Drift: body za smyk ve vysoké rychlosti, připíšou se, až smyk skončí. */
  private scoreDrift(dt: number): void {
    const v = this.game.driving;
    if (v && isDrifting(v.speed, lateralSpeed(v.drive))) {
      this.driftTime += dt;
      return;
    }
    if (this.driftTime > 0) {
      const pts = driftScore(this.driftTime);
      if (pts > 0) this.game.addScore(pts, 'Drift');
      this.driftTime = 0;
    }
  }

  /** Přežít 30 s na páté úrovni je výkon. */
  private scoreWantedFive(dt: number): void {
    const level = this.game.police.wanted.level;
    if (level < 5) {
      this.atFiveFor = 0;
      if (level === 0) this.fiveRewarded = false;
      return;
    }
    this.atFiveFor += dt;
    if (this.atFiveFor > 30 && !this.fiveRewarded) {
      this.fiveRewarded = true;
      this.game.addScore(SCORE.surviveFive, 'Přežil jsi hon');
    }
  }

  /** Policie to vzdala: odměna podle úrovně, ze které hráč utekl. */
  onEvaded(level: number): void {
    this.game.addScore(escapeBonus(level), `Útěk z ${level}★`);
  }

  /** Hráč zničil vozidlo: body, víc za řetězovou reakci. */
  onWreck(_v: Vehicle): void {
    const now = this.game.time.now / 1000;
    this.chain = now - this.lastWreckAt < 3 ? this.chain + 1 : 1;
    this.lastWreckAt = now;
    this.game.addScore(wreckScore(this.chain), this.chain > 1 ? `Řetězovka ×${this.chain}` : 'Vrak');
  }
}
