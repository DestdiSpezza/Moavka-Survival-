import Phaser from 'phaser';
import { TILE } from '../../config';
import type { Vehicle } from '../../entities/Vehicle';
import { dennyAccepts } from '../../story/jobs';
import type { Point } from '../../systems/combat';
import type { Building } from '../../world/moravka';
import { Job, type JobResult } from './Job';

/**
 * Auto pro Dennyho (ADR-022): ukrást jakékoli nepolicejní auto a dovézt ho před garáž
 * Autoúprav Dan aspoň na 90 % a bez hvězd. Auto pak samo vjede do garáže a vrata spadnou.
 */
export class DennyJob extends Job {
  readonly id = 'denny-auto' as const;
  private garage: Building | null = null;
  private front: Point = { x: 0, y: 0 };
  private complainedAt = -100;
  private inside = 0;
  private car: Vehicle | null = null;
  private door: Phaser.GameObjects.Image | null = null;
  private doorDown = false;

  start(): void {
    this.garage = this.g.world.buildings.find((b) => b.name === 'Garáž') ?? null;
    if (this.garage) this.front = { x: (this.garage.x + this.garage.w / 2) * TILE, y: (this.garage.y + this.garage.h + 1.6) * TILE };
  }

  objective(): string {
    const v = this.g.driving;
    if (this.car) return 'Hm.';
    if (!v || v.isPolice) return 'Ukradni auto (ne policejní) a dovez ho Vysokému Dennymu do Autoúprav Dan';
    const hp = Math.round((v.hp / v.spec.maxHp) * 100);
    const stars = this.g.police.wanted.level;
    return `Dovez auto do Autoúprav Dan nenabourané a bez hvězd (stav ${hp} %, hvězdy ${stars})`;
  }

  target(): Point | null {
    return this.car ? null : this.front;
  }

  update(dt: number): JobResult {
    const g = this.g;
    if (!this.garage) {
      this.failReason = 'Garáž tu není. Hm.';
      return 'fail';
    }
    if (this.car) return this.driveIn(dt);
    const v = g.driving;
    if (!v || Phaser.Math.Distance.Between(v.x, v.y, this.front.x, this.front.y) > 40 || Math.abs(v.speed) > 25) return 'run';
    const now = g.time.now / 1000;
    const denny = g.townsfolk.denny;
    if (!denny || !denny.visible) {
      if (now - this.complainedAt > 8) g.toast(g.story.festival ? 'Zavřeno. Vysoký Denny je na festivalu v eRku.' : 'Zavřeno. Vysoký Denny je v eRku (13–17). Počkej.');
      this.complainedAt = now;
      return 'run';
    }
    const verdict = dennyAccepts(v.hp / v.spec.maxHp, g.police.wanted.level, v.spec.kind);
    if (verdict !== 'ok') {
      if (now - this.complainedAt > 5) {
        const say: Record<string, string> = {
          police: 'Hm. Policejní ne. To se nedá přelakovat. Teda dá, ale nechci.',
          wanted: 'Hm. Fízlové. Zmiz a vrať se bez nich.',
          damaged: `Hm. Nabouraný. Takový nechci. (${Math.round((v.hp / v.spec.maxHp) * 100)} %, chci aspoň 90.)`,
        };
        g.speech.say(denny, say[verdict], 0x2a4a6a, 2600);
      }
      this.complainedAt = now;
      return 'run';
    }
    this.startDriveIn(v);
    return 'run';
  }

  /** Hráč vystoupí, auto se srovná před vraty a samo vjede dovnitř. */
  private startDriveIn(v: Vehicle): void {
    const g = this.g;
    const b = this.garage!;
    this.story.cutscene = true;
    g.registry.set('cutscene', { title: '', hint: '' });
    g.exitVehicle();
    this.car = v;
    this.inside = 0;
    v.scripted = true;
    (v.body as Phaser.Physics.Arcade.Body).enable = false;
    v.setShadowVisible(false);
    const doorX = (b.x + b.w / 2) * TILE;
    const edge = (b.y + b.h) * TILE;
    v.setPosition(doorX, edge + v.spec.length / 2 + 3).setRotation(-Math.PI / 2);
    g.tweens.add({ targets: v, y: edge - v.spec.length / 2 - 2, duration: 1800, delay: 300, ease: 'Sine.inOut' });
    this.door = g.add.image(doorX, edge - 8, 'garaz-vrata').setOrigin(0.5, 0).setDepth(9).setScale((b.w * TILE * 0.55) / 32, 0);
    g.cameras.getCamera('minimap')?.ignore(this.door);
    const denny = g.townsfolk.denny;
    if (denny) g.speech.say(denny, 'Hm.', 0x2a4a6a, 1400);
  }

  /** Co je už za vraty, není vidět (ořez přední části auta); pak vrata sjedou dolů. */
  private driveIn(dt: number): JobResult {
    const g = this.g;
    const v = this.car!;
    const b = this.garage!;
    const edge = (b.y + b.h) * TILE;
    const visible = Phaser.Math.Clamp(v.y + v.spec.length / 2 - edge, 0, v.spec.length);
    v.setCrop(0, 0, visible + 1, v.height);
    this.inside += dt;
    if (visible <= 0.5 && this.door && !this.doorDown) {
      this.doorDown = true;
      g.tweens.add({ targets: this.door, scaleY: 1, duration: 450, ease: 'Bounce.out' });
    }
    if (this.inside > 3) {
      g.removeVehicle(v);
      this.story.cutscene = false;
      g.registry.set('cutscene', null);
      const door = this.door;
      if (door) g.tweens.add({ targets: door, alpha: 0, delay: 2500, duration: 600, onComplete: () => door.destroy() });
      this.door = null;
      const denny = g.townsfolk.denny;
      if (denny) g.speech.say(denny, 'Hm. Dobrý.', 0x2a4a6a, 2200);
      this.doneText = 'Vysoký Denny: „Hm. Dobrý.“ Auto zmizelo. Navždy. Hm.';
      return 'done';
    }
    return 'run';
  }

  cleanup(): void {
    if (this.story.cutscene) {
      this.story.cutscene = false;
      this.g.registry.set('cutscene', null);
    }
  }
}
