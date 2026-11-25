import Phaser from 'phaser';
import { TILE } from '../config';
import { Sound } from '../audio/Sound';
import { Pedestrian } from '../entities/Pedestrian';
import { canAfford } from '../systems/economy';
import { STAMINA_MAX } from '../systems/movement';
import { OMYX } from '../texts/chatter';
import { pixelFont } from './BootScene';
import type { GameScene } from './GameScene';

export const WEED_PRICE = 150;
export const WEED_SECONDS = 60;
/** Za jak dlouho se zabitý dealer vrátí (když se hráč nedívá). */
const RESPAWN_SECONDS = 180;
const RANGE = 24;

/**
 * Dealer Omyx stojí u řeky a prodává trávu. Po trávě je minuta klidu:
 * obraz se vlní a zezelená, hráč jde pomaleji, ale dech mu nedochází
 * a pomalu se hojí. Žádné falešné sirény: chaos musí zůstat čitelný.
 */
export class Dealer {
  ped: Pedestrian | null = null;
  stonedUntil = 0;
  private label: Phaser.GameObjects.Text | null = null;
  private respawnAt = 0;
  private nextPitch = 0;
  private nextLine = 0;
  private wasStoned = false;

  constructor(private game: GameScene) {
    game.registry.set('stoned', 0);
    if (this.spot) this.spawn();
  }

  private get now(): number {
    return this.game.time.now / 1000;
  }

  /** Kde Omyx stojí (px), nebo null, když v oblasti není. */
  get spot(): { x: number; y: number } | null {
    const s = this.game.world.spots.dealer;
    return s ? { x: (s.x + 0.5) * TILE, y: (s.y + 0.5) * TILE } : null;
  }

  get stoned(): boolean {
    return this.now < this.stonedUntil;
  }

  /** Stojí Omyx u hráče a dá se s ním obchodovat? */
  near(focus: { x: number; y: number }): boolean {
    const p = this.ped;
    return !!p && p.active && p.alive && !this.game.driving && Phaser.Math.Distance.Between(focus.x, focus.y, p.x, p.y) < RANGE;
  }

  private spawn(): void {
    const g = this.game;
    const at = this.spot!;
    const p = new Pedestrian(g, at.x, at.y, 0, true, 'dealer', 70);
    p.scripted = true;
    g.cameras.getCamera('minimap')?.ignore(p);
    g.combat.peds.push(p);
    this.ped = p;
    this.label ??= g.add.text(0, 0, OMYX.name.toUpperCase(), pixelFont(14, '#7fe07a')).setOrigin(0.5).setScale(0.5).setStroke('#000', 3).setDepth(44);
    g.cameras.getCamera('minimap')?.ignore(this.label);
    this.respawnAt = 0;
  }

  menu(): { title: string; hint: string; options: Array<{ label: string; enabled: boolean; run: () => void }> } {
    const pl = this.game.player;
    return {
      title: OMYX.menuTitle,
      hint: OMYX.menuHint,
      options: [{ label: OMYX.buy, enabled: !this.stoned && canAfford(pl.money, WEED_PRICE), run: () => this.buy() }],
    };
  }

  private buy(): void {
    const g = this.game;
    g.player.money -= WEED_PRICE;
    this.stonedUntil = this.now + WEED_SECONDS;
    this.nextLine = this.now + 3;
    Sound.pickup();
    g.toast(OMYX.bought);
  }

  update(dt: number): void {
    const g = this.game;
    const now = this.now;
    const p = this.ped;
    if (p && (!p.active || !p.alive)) {
      if (!this.respawnAt) this.respawnAt = now + RESPAWN_SECONDS;
      this.label?.setVisible(false);
      const at = this.spot!;
      if (now > this.respawnAt && !g.inView(at.x, at.y)) this.spawn();
    } else if (p) {
      this.label?.setVisible(true).setPosition(Math.round(p.x), Math.round(p.y - 13));
      const pl = g.player;
      const d = Phaser.Math.Distance.Between(p.x, p.y, pl.x, pl.y);
      const body = p.body as Phaser.Physics.Arcade.Body;
      const home = this.spot!;
      // Kdo do něj strčí, k tomu se otočí a vrátí se na své místo.
      if (Phaser.Math.Distance.Between(p.x, p.y, home.x, home.y) > 8) g.walkTo(p, home, 40);
      else body.setVelocity(0, 0);
      if (d < 90 && !pl.dead) {
        p.setRotation(Phaser.Math.Angle.Between(p.x, p.y, pl.x, pl.y));
        if (now > this.nextPitch) {
          this.nextPitch = now + 9;
          g.speech.say(p, OMYX.pitch[Math.floor(g.random() * OMYX.pitch.length)], 0x3fbf4a);
        }
      }
    }
    this.updateStoned(dt);
  }

  /** Minuta po trávě. */
  private updateStoned(dt: number): void {
    const g = this.game;
    const cam = g.cameras.main;
    const stoned = this.stoned && !g.player.dead;
    if (stoned) {
      const pl = g.player;
      pl.health = Math.min(100, pl.health + 1.5 * dt);
      pl.move = { stamina: STAMINA_MAX, exhausted: false };
      cam.setRotation(Math.sin(this.now * 1.1) * 0.018);
      if (this.now > this.nextLine) {
        this.nextLine = this.now + 8 + g.random() * 4;
        g.speech.say(pl, OMYX.stonedLines[Math.floor(g.random() * OMYX.stonedLines.length)], 0x3fbf4a);
      }
      g.registry.set('stoned', Math.min(1, (this.stonedUntil - this.now) / 5));
    } else if (this.wasStoned) {
      cam.setRotation(0);
      g.registry.set('stoned', 0);
      if (!g.player.dead) g.toast(OMYX.stonedEnd);
    }
    this.wasStoned = stoned;
  }

  /** Hráčova chůze je po trávě pomalejší. */
  get walkFactor(): number {
    return this.stoned ? 0.85 : 1;
  }
}
