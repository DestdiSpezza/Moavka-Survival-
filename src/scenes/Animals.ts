import Phaser from 'phaser';
import { TILE } from '../config';
import { Pedestrian } from '../entities/Pedestrian';
import { T } from '../texts/cs';
import { findBoarCrossing } from '../world/animals';
import { placeLabel } from '../world/areas';
import { zoneAt } from '../world/moravka';
import type { PedHurtEvent } from './Combat';
import type { GameScene } from './GameScene';

const MAX_BOARS = 2;
const BOAR_HP = 60;
const BOAR_SPEED = 72;
const CHARGE_SECONDS = 7;
/** Jak dlouho sedí divočák omráčený po srážce s autem. */
const STUN_SECONDS = 25;

interface Boar {
  ped: Pedestrian;
  from: { x: number; y: number };
  to: { x: number; y: number };
  state: 'cross' | 'back' | 'charge' | 'stunned' | 'gone';
  until: number;
  nextBite: number;
}

/**
 * Divočáci: občas vyběhnou z polí a lesa a přeběhnou hlavní silnici sem a zpátky.
 * Řidiči před nimi prudce brzdí (a ten za nimi to nemusí ubrzdit).
 * Kdo divočáka zraní, toho jde prase vyřídit.
 */
export class Animals {
  private boars: Boar[] = [];
  private spawnIn: number;

  constructor(private game: GameScene) {
    this.spawnIn = 25 + game.random() * 30;
    game.events.on('pedHurt', (e: PedHurtEvent) => {
      const b = this.boars.find((x) => x.ped === e.ped);
      if (!b || e.killed) return;
      if (e.byPlayer && b.state !== 'charge') {
        b.state = 'charge';
        b.until = this.now + CHARGE_SECONDS;
        game.floatText(b.ped.x, b.ped.y - 10, T.village.boarCharge[0], '#ff9a6a', 1200);
      } else if (!e.byPlayer && !e.attacker && b.state !== 'charge') {
        // Sražený autem z provozu: chvíli sedí omráčeně na silnici.
        b.state = 'stunned';
        b.until = this.now + STUN_SECONDS;
        if (game.inView(b.ped.x, b.ped.y)) game.floatText(b.ped.x, b.ped.y - 10, T.village.boarDazed[Math.floor(game.random() * T.village.boarDazed.length)], '#ffffff', 1600);
      }
    });
  }

  private get now(): number {
    return this.game.time.now / 1000;
  }

  update(dt: number): void {
    this.spawnIn -= dt;
    const alive = this.boars.filter((b) => b.ped.active && b.ped.alive);
    if (this.spawnIn <= 0) {
      this.spawnIn = 60 + this.game.random() * 60;
      if (alive.length < MAX_BOARS) this.spawn();
    }
    for (const b of alive) this.updateBoar(b);
    this.boars = this.boars.filter((b) => b.ped.active && b.state !== 'gone');
  }

  private spawn(): void {
    const g = this.game;
    const c = findBoarCrossing(g.world, g.random, (x, y) => !g.inView(x, y));
    if (!c) return;
    const ped = new Pedestrian(g, c.from.x, c.from.y, 0, false, 'boar', BOAR_HP);
    ped.role = 'animal';
    ped.setDepth(9);
    g.cameras.getCamera('minimap')?.ignore(ped);
    g.combat.peds.push(ped);
    this.boars.push({ ped, from: c.from, to: c.to, state: 'cross', until: 0, nextBite: 0 });
    g.logEvent('boar', 'divočák vyběhl z lesa', c.from, ['animals'], [], [ped]);
    const z = zoneAt(g.world, Math.floor(c.from.x / TILE), Math.floor(c.from.y / TILE));
    const place = z === 'Morávka' ? g.area.name : placeLabel(g.area.id, z);
    if (g.random() < 0.6) g.announcer.say('rozhlas', T.village.rozhlasBoar.replace('{místo}', place), 'boar', 200);
  }

  private updateBoar(b: Boar): void {
    const g = this.game;
    const p = b.ped;
    const body = p.body as Phaser.Physics.Arcade.Body;
    if (b.state === 'stunned') {
      body.setVelocity(0, 0);
      if (this.now > b.until) b.state = 'back';
      return;
    }
    if (b.state === 'charge') {
      const f = g.driving ?? g.player;
      if (this.now > b.until || g.player.dead) {
        b.state = 'back';
        return;
      }
      g.walkTo(p, f, BOAR_SPEED * 1.3);
      if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < 15 && this.now > b.nextBite) {
        b.nextBite = this.now + 1;
        if (g.driving) g.driving.damage(6);
        else g.combat.damagePlayer(10);
      }
      return;
    }
    const target = b.state === 'cross' ? b.to : b.from;
    if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) < 8) {
      if (b.state === 'cross') {
        // Chvíli se porozhlédne u řeky a běží zpátky (zase přes silnici).
        b.state = 'back';
        body.setVelocity(0, 0);
        return;
      }
      if (!g.inView(p.x, p.y)) {
        p.destroy();
        b.state = 'gone';
        return;
      }
      body.setVelocity(0, 0);
      return;
    }
    g.walkTo(p, target, BOAR_SPEED);
  }
}
