import { took } from '../input/touch';
import Phaser from 'phaser';
import { TILE } from '../config';
import type { GameScene } from './GameScene';
import type { Story } from './Story';

type Phase = 'drive' | 'doors' | 'exit' | 'leave' | 'talk' | 'done';

const DRIVE_SPEED = 85;
const LEAVE_SPEED = 70;

/**
 * Úvodní scéna Aktu 1 (ADR-005): autobus přijede od Raškovic (levý horní roh),
 * projede křižovatkou a zastaví na zastávce před eRkem. Dveře se otevřou, hrdina
 * nebo hrdinka vystoupí, autobus odjede a Slečna Kobyla pošle nováčka do hospody.
 * Mezerník nebo Esc scénu přeskočí (rozhovor s Kobylou zůstane).
 */
export class Intro {
  private phase: Phase = 'drive';
  private bus: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private path: Array<{ x: number; y: number }>;
  private idx = 1;
  private stopIdx: number;
  private timer = 0;
  private exitAt: { x: number; y: number };
  private skipKeys: Phaser.Input.Keyboard.Key[];

  constructor(private game: GameScene, private story: Story, private onDone: () => void) {
    const g = game;
    story.cutscene = true;
    // Trasa od Raškovic dolů ke křižovatce a dál na jihozápad (pruh provozu).
    this.path = g.world.traffic[2];
    const stop = g.world.spots.busStop!;
    const stopPx = { x: stop.x * TILE, y: stop.y * TILE };
    this.stopIdx = this.path.reduce((best, p, i) => (Phaser.Math.Distance.Between(p.x, p.y, stopPx.x, stopPx.y) < Phaser.Math.Distance.Between(this.path[best].x, this.path[best].y, stopPx.x, stopPx.y) ? i : best), 0);
    this.path = [...this.path.slice(0, this.stopIdx), stopPx, ...this.path.slice(this.stopIdx + 1)];
    // Dveře jsou vpravo ve směru jízdy.
    this.exitAt = { x: stopPx.x - stop.dy * 14, y: stopPx.y + stop.dx * 14 };
    const start = this.path[0];
    this.shadow = g.add.image(start.x + 2, start.y + 3, 'shadow-autobus').setDepth(7).setAlpha(0.6);
    this.bus = g.add.image(start.x, start.y, 'autobus').setDepth(8);
    this.bus.setRotation(Math.atan2(this.path[1].y - start.y, this.path[1].x - start.x));
    g.cameras.getCamera('minimap')?.ignore([this.bus, this.shadow]);

    // Hrdina zatím sedí v autobuse.
    g.player.setVisible(false);
    (g.player.body as Phaser.Physics.Arcade.Body).enable = false;
    g.player.setPosition(start.x, start.y);
    g.cameras.main.startFollow(this.bus, true, 0.1, 0.1);
    g.registry.set('cutscene', { title: `AKT ${story.state.act}: PŘÍJEZD`, hint: 'Mezerník = přeskočit' });
    const kb = g.input.keyboard!;
    this.skipKeys = [kb.addKey('SPACE'), kb.addKey('ESC')];
  }

  update(dt: number): void {
    if (this.phase === 'done' || this.phase === 'talk') return;
    if (this.phase !== 'leave' && (this.skipKeys.some((k) => Phaser.Input.Keyboard.JustDown(k)) || took('skip'))) {
      this.skip();
      return;
    }
    this.timer += dt;
    switch (this.phase) {
      case 'drive':
        this.drive(dt);
        break;
      case 'doors':
        if (this.timer > 0.7) this.stepOut();
        break;
      case 'exit':
        if (this.timer > 0.9) {
          this.bus.setTexture('autobus');
          this.phase = 'leave';
          this.timer = 0;
          this.game.registry.set('cutscene', { title: '', hint: '' });
        }
        break;
      case 'leave':
        this.leave(dt);
        break;
    }
    this.shadow.setPosition(this.bus.x + 2, this.bus.y + 3).setRotation(this.bus.rotation);
  }

  /** Jede po trase k zastávce, před ní brzdí. */
  private drive(dt: number): void {
    const target = this.path[this.idx];
    const stop = this.path[this.stopIdx];
    const toStop = Phaser.Math.Distance.Between(this.bus.x, this.bus.y, stop.x, stop.y);
    const speed = this.idx >= this.stopIdx - 3 ? Math.max(18, Math.min(DRIVE_SPEED, toStop * 1.4)) : DRIVE_SPEED;
    if (this.moveTowards(target, speed * dt)) {
      if (this.idx === this.stopIdx) {
        this.bus.setTexture('autobus-open');
        this.phase = 'doors';
        this.timer = 0;
      } else this.idx++;
    }
  }

  /** Posune autobus k bodu; vrátí true, když dorazil. */
  private moveTowards(p: { x: number; y: number }, step: number): boolean {
    const d = Phaser.Math.Distance.Between(this.bus.x, this.bus.y, p.x, p.y);
    if (d <= step) {
      this.bus.setPosition(p.x, p.y);
      return true;
    }
    const a = Math.atan2(p.y - this.bus.y, p.x - this.bus.x);
    this.bus.setPosition(this.bus.x + Math.cos(a) * step, this.bus.y + Math.sin(a) * step);
    this.bus.setRotation(Phaser.Math.Angle.RotateTo(this.bus.rotation, a, 0.08));
    return false;
  }

  /** Hrdina vystoupí dveřmi a udělá pár kroků od autobusu. */
  private stepOut(): void {
    const g = this.game;
    const pl = g.player;
    const out = { x: this.exitAt.x + (this.exitAt.x - this.bus.x) * 0.5, y: this.exitAt.y + (this.exitAt.y - this.bus.y) * 0.5 };
    pl.setPosition(this.exitAt.x, this.exitAt.y).setVisible(true).setRotation(Math.atan2(out.y - this.exitAt.y, out.x - this.exitAt.x));
    g.tweens.add({ targets: pl, x: out.x, y: out.y, duration: 700 });
    g.cameras.main.startFollow(pl, true, 0.15, 0.15);
    this.phase = 'exit';
    this.timer = 0;
  }

  /** Autobus odjede dál po trase a zmizí. */
  private leave(dt: number): void {
    const target = this.path[Math.min(this.idx + 1, this.path.length - 1)];
    if (this.moveTowards(target, LEAVE_SPEED * dt) && this.idx < this.path.length - 2) this.idx++;
    this.bus.setAlpha(Math.max(0, 1 - Math.max(0, this.timer - 2) / 1));
    this.shadow.setAlpha(this.bus.alpha * 0.6);
    if (this.timer > 3) {
      this.bus.destroy();
      this.shadow.destroy();
      this.talk();
    }
  }

  private skip(): void {
    const g = this.game;
    g.tweens.killTweensOf(g.player);
    this.bus.destroy();
    this.shadow.destroy();
    g.player.setPosition(this.exitAt.x, this.exitAt.y).setVisible(true);
    g.cameras.main.startFollow(g.player, true, 0.15, 0.15);
    this.talk();
  }

  /** Slečna Kobyla se ozve a pošle nováčka do hospody. */
  private talk(): void {
    const g = this.game;
    this.phase = 'talk';
    g.registry.set('cutscene', { title: '', hint: '' });
    const kobyla = g.townsfolk.kobyla;
    (g.player.body as Phaser.Physics.Arcade.Body).reset(g.player.x, g.player.y);
    if (kobyla) {
      g.player.setRotation(Phaser.Math.Angle.Between(g.player.x, g.player.y, kobyla.x, kobyla.y));
      g.speech.say(kobyla, 'Hele, další!', 0xd8a0e0, 1400);
    }
    g.time.delayedCall(1100, () => {
      this.story.talk('kobyla', 'Game', () => this.finish());
    });
  }

  private finish(): void {
    const g = this.game;
    this.phase = 'done';
    (g.player.body as Phaser.Physics.Arcade.Body).enable = true;
    g.registry.set('cutscene', null);
    this.story.cutscene = false;
    for (const k of this.skipKeys) k.reset();
    this.onDone();
  }
}
