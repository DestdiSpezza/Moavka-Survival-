import Phaser from 'phaser';
import { TILE } from '../config';
import { Pedestrian } from '../entities/Pedestrian';
import type { Vehicle } from '../entities/Vehicle';
import {
  absorbDamage, canFire, consumeAmmo, cycleWeapon, deathPenalty, inMeleeArc, pelletAngles, PERSON_EXPLOSION_DAMAGE,
  pickupWeapon, rayCircleHit, selectWeapon, WEAPON_ORDER, WEAPONS, type Point, type WeaponId,
} from '../systems/combat';
import { CALL_POLICE_CHANCE, FLEE_TIME, fleeAngle, hears, PED_RUN, PED_WALK, runOverDamage } from '../systems/crowd';
import { EXPLOSION_RADIUS } from '../systems/damage';
import type { CrimeKind } from '../systems/wanted';
import { T } from '../texts/cs';
import { PICKUP_RESPAWN, pickupSpots, type PickupKind } from '../world/pickups';
import { blocksBullets, isSolid, Tile } from '../world/tiles';
import { PED_LOOKS, TOUGH_LOOKS } from '../world/tileset';
import type { GameScene } from './GameScene';

const PED_COUNT = 24;
const BULLET_STEP = 4;
const PICKUP_RANGE = 12;

interface Pickup {
  kind: PickupKind;
  sprite: Phaser.GameObjects.Image;
  amount: number;
  /** Stálé místo se po sebrání obnoví; peníze z mrtvol ne. */
  respawns: boolean;
  readyAt: number;
}

/** Zranění postavy (pro respekt skupin a odvetu). */
export interface PedHurtEvent {
  ped: Pedestrian;
  killed: boolean;
  byPlayer: boolean;
  /** Kdo útočil, pokud je to postava (policista, člen skupiny). */
  attacker: Pedestrian | null;
}

/** Hlášení trestného činu pro policii. */
export interface CrimeEvent {
  x: number;
  y: number;
  kind: CrimeKind;
}

type WeaponKeys = Record<'one' | 'two' | 'three' | 'four' | 'five' | 'cycle', Phaser.Input.Keyboard.Key>;

/**
 * Boj: zbraně hráče, střelba (i z auta), chodci a jejich reakce,
 * věci k sebrání, zdraví, smrt a probuzení ve zdravotním středisku.
 */
export class Combat {
  peds: Pedestrian[] = [];
  private pickups: Pickup[] = [];
  private keys: WeaponKeys;
  private cooldown = 0;
  private wasDown = false;
  private respawnTimer = 0;
  private fx: Phaser.GameObjects.Graphics;
  private blood: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private game: GameScene) {
    const scene = game;
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys({ one: 'ONE', two: 'TWO', three: 'THREE', four: 'FOUR', five: 'FIVE', cycle: 'Q' }) as WeaponKeys;
    scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.setArsenal(cycleWeapon(this.player.arsenal, dy > 0 ? 1 : -1));
    });
    this.fx = scene.add.graphics().setDepth(14);
    this.blood = scene.add.particles(0, 0, 'spark', {
      lifespan: 400, speed: { min: 20, max: 70 }, tint: [0xa01010, 0x701010], scale: { start: 1.2, end: 0.4 }, emitting: false,
    }).setDepth(12);
    this.sparks = scene.add.particles(0, 0, 'spark', {
      lifespan: 220, speed: { min: 30, max: 90 }, tint: [0xfff2a0, 0xffd23f], scale: { start: 1, end: 0 }, emitting: false,
    }).setDepth(12);
    const mini = scene.cameras.getCamera('minimap');
    mini?.ignore([this.fx, this.blood, this.sparks]);

    for (const s of pickupSpots(game.world)) this.addPickup(s.kind, s.x, s.y, 0, true);
    for (let i = 0; i < PED_COUNT; i++) this.spawnPed(false);
    scene.physics.add.collider(this.peds, game.layer);
    scene.physics.add.collider(game.player, this.peds);
    scene.physics.add.overlap(this.peds, game.vehicles, (p, v) => this.onRunOver(p as Pedestrian, v as Vehicle));
    this.player.updateLook();
  }

  private get player() {
    return this.game.player;
  }

  private get time(): number {
    return this.game.time.now / 1000;
  }

  update(dt: number): void {
    this.fx.clear();
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.player.dead) {
      this.handleWeaponKeys();
      this.handleFire();
      this.collectPickups();
    }
    this.updatePeds(dt);
    this.updatePickups();

    this.respawnTimer += dt;
    if (this.respawnTimer > 2) {
      this.respawnTimer = 0;
      const alive = this.peds.filter((p) => p.alive && p.role === 'civil').length;
      if (alive < PED_COUNT) this.spawnPed(true);
    }
  }

  // ---------- Zbraně ----------

  private setArsenal(a: typeof this.player.arsenal): void {
    this.player.arsenal = a;
    this.player.updateLook();
  }

  private handleWeaponKeys(): void {
    const k = this.keys;
    // U zadavatele zakázek vybírají čísla zakázku, ne zbraň.
    if (this.game.missions?.boardOpen) return;
    const pressed = [k.one, k.two, k.three, k.four, k.five].findIndex((key) => Phaser.Input.Keyboard.JustDown(key));
    if (pressed >= 0) this.setArsenal(selectWeapon(this.player.arsenal, WEAPON_ORDER[pressed]));
    if (Phaser.Input.Keyboard.JustDown(k.cycle)) this.setArsenal(cycleWeapon(this.player.arsenal, 1));
  }

  private handleFire(): void {
    const pointer = this.game.input.activePointer;
    const down = pointer.leftButtonDown();
    const justDown = down && !this.wasDown;
    this.wasDown = down;
    const a = this.player.arsenal;
    const def = WEAPONS[a.current];
    const driving = this.game.driving;
    if (!down || this.cooldown > 0) return;
    if (!def.auto && !justDown) return;
    if (driving && def.melee) return;
    if (!canFire(a)) {
      if (justDown) this.game.toast(T.noAmmo);
      return;
    }
    this.cooldown = def.cooldown;
    const origin: Point = driving ? { x: driving.x, y: driving.y } : { x: this.player.x, y: this.player.y };
    const aim = pointer.positionToCamera(this.game.cameras.main) as Phaser.Math.Vector2;
    const angle = Math.atan2(aim.y - origin.y, aim.x - origin.x);
    if (def.melee) this.melee(origin, angle, def.id);
    else {
      this.setArsenal(consumeAmmo(a));
      this.shoot(origin, angle, def.id, driving ?? undefined);
    }
  }

  private melee(origin: Point, angle: number, id: WeaponId): void {
    const def = WEAPONS[id];
    let hit = false;
    for (const p of this.peds) {
      if (p.alive && inMeleeArc(origin, angle, p, def.range + 5)) {
        this.hurtPed(p, def.damage, origin);
        hit = true;
      }
    }
    for (const v of this.game.vehicles) {
      if (!v.wrecked && inMeleeArc(origin, angle, v, def.range + 8)) {
        v.playerHitAt = this.time;
        v.damage(def.damage * 0.2);
        if (v.isPolice) this.crime(origin, 'copAssault');
        hit = true;
      }
    }
    // Švih: krátký oblouk před hráčem.
    this.fx.lineStyle(2, 0xffffff, 0.6).beginPath().arc(origin.x, origin.y, def.range, angle - 0.8, angle + 0.8).strokePath();
    if (hit) this.game.cameras.main.shake(60, 0.002);
  }

  private shoot(origin: Point, angle: number, id: WeaponId, own?: Vehicle): void {
    const def = WEAPONS[id];
    const muzzle = own ? 12 : 10;
    const start = { x: origin.x + Math.cos(angle) * muzzle, y: origin.y + Math.sin(angle) * muzzle };
    for (const a of pelletAngles(angle, def.pellets, def.spread, this.game.random)) this.fireRay(start, a, def.range, def.damage, own);
    this.fx.fillStyle(0xfff2a0, 0.9).fillCircle(start.x, start.y, 3);
    this.noise(origin, def.noise, 'shooting');
  }

  /** Paprsek kulky: nejbližší zásah mezi zdí, chodcem a autem. */
  private fireRay(start: Point, angle: number, range: number, damage: number, own?: Vehicle): void {
    let wall = range;
    for (let d = 0; d < range; d += BULLET_STEP) {
      const x = start.x + Math.cos(angle) * d;
      const y = start.y + Math.sin(angle) * d;
      if (blocksBullets(this.game.tileAt(x, y))) {
        wall = d;
        break;
      }
    }
    let best = wall;
    let hitPed: Pedestrian | null = null;
    let hitCar: Vehicle | null = null;
    for (const p of this.peds) {
      if (!p.alive) continue;
      const d = rayCircleHit(start, angle, best, p, 6);
      if (d !== null && d < best) {
        best = d;
        hitPed = p;
        hitCar = null;
      }
    }
    for (const v of this.game.vehicles) {
      if (v === own || v.wrecked) continue;
      const d = rayCircleHit(start, angle, best, v, v.spec.width / 2 + 2);
      if (d !== null && d < best) {
        best = d;
        hitCar = v;
        hitPed = null;
      }
    }
    const end = { x: start.x + Math.cos(angle) * best, y: start.y + Math.sin(angle) * best };
    const tracer = this.game.add.line(0, 0, start.x, start.y, end.x, end.y, 0xfff2a0, 0.8).setOrigin(0).setLineWidth(1).setDepth(14);
    this.game.cameras.getCamera('minimap')?.ignore(tracer);
    this.game.tweens.add({ targets: tracer, alpha: 0, duration: 90, onComplete: () => tracer.destroy() });

    if (hitPed) {
      this.hurtPed(hitPed, damage, start);
      this.blood.explode(6, end.x, end.y);
    } else if (hitCar) {
      hitCar.playerHitAt = this.time;
      hitCar.damage(damage * 0.5);
      if (hitCar.isPolice && !own) this.crime(start, 'copAssault');
      this.sparks.explode(4, end.x, end.y);
    } else if (best < range) {
      this.sparks.explode(3, end.x, end.y);
    }
  }

  /** Hluk (výstřel, výbuch): chodci v doslechu zpanikaří a někdo zavolá policii. */
  private noise(at: Point, radius: number, kind: CrimeKind | null): void {
    if (radius <= 0) return;
    if (kind) this.crime(at, kind);
    for (const p of this.peds) {
      if (p.alive && p.role === 'civil' && p.mood !== 'fight' && hears(p, at, radius)) this.panic(p, at);
    }
  }

  private crime(at: Point, kind: CrimeKind): void {
    // Policie potřebuje vědět, kde je hráč, ne kde dopadla kulka.
    const focus = this.game.driving ?? this.player;
    this.game.events.emit('crime', { x: focus.x, y: focus.y, kind } satisfies CrimeEvent);
    void at;
  }

  // ---------- Chodci ----------

  private spawnPed(offscreen: boolean): void {
    const rnd = this.game.random;
    for (let tries = 0; tries < 40; tries++) {
      const tx = 18 + Math.floor(rnd() * 80);
      const ty = 2 + Math.floor(rnd() * 62);
      const t = this.game.world.tiles[ty][tx];
      if (t !== Tile.Grass && t !== Tile.Dirt) continue;
      const x = (tx + 0.5) * TILE;
      const y = (ty + 0.5) * TILE;
      if (offscreen && this.game.inView(x, y)) continue;
      const look = Math.floor(rnd() * PED_LOOKS.length);
      const p = new Pedestrian(this.game, x, y, look, TOUGH_LOOKS.has(look));
      this.game.cameras.getCamera('minimap')?.ignore(p);
      this.peds.push(p);
      return;
    }
  }

  private updatePeds(dt: number): void {
    const now = this.time;
    const rnd = this.game.random;
    for (const p of this.peds) {
      if (!p.alive || p.role !== 'civil') continue;
      const body = p.body as Phaser.Physics.Arcade.Body;
      if (p.mood === 'flee') {
        if (now > p.until) p.mood = 'idle';
        else this.walk(p, p.heading, PED_RUN);
      } else if (p.mood === 'fight') {
        this.fight(p, now);
      } else if (p.mood === 'wander' && p.target) {
        const d = Phaser.Math.Distance.Between(p.x, p.y, p.target.x, p.target.y);
        p.stuckFor = body.speed < 5 ? p.stuckFor + dt : 0;
        if (d < 4 || p.stuckFor > 1.5) {
          p.mood = 'idle';
          p.until = now + 1 + rnd() * 3;
          body.setVelocity(0, 0);
        } else {
          this.walk(p, Phaser.Math.Angle.Between(p.x, p.y, p.target.x, p.target.y), PED_WALK);
        }
      } else {
        body.setVelocity(0, 0);
        if (now > p.until) this.pickWanderTarget(p);
      }
    }
    // Zničené (uklizené mrtvoly, odjetí policisté) vyřaď. Pole se mění na místě,
    // protože na něj odkazují kolize; nové pole by kolize neviděly.
    for (let i = this.peds.length - 1; i >= 0; i--) if (!this.peds[i].active) this.peds.splice(i, 1);
  }

  private walk(p: Pedestrian, angle: number, speed: number): void {
    p.heading = angle;
    p.setRotation(angle);
    this.game.physics.velocityFromRotation(angle, speed, (p.body as Phaser.Physics.Arcade.Body).velocity);
  }

  private pickWanderTarget(p: Pedestrian): void {
    const rnd = this.game.random;
    for (let tries = 0; tries < 8; tries++) {
      const x = p.x + (rnd() - 0.5) * 160;
      const y = p.y + (rnd() - 0.5) * 160;
      const t = this.game.tileAt(x, y);
      // Chodci se silnici spíš vyhýbají, ale občas ji přejdou.
      if (isSolid(t) || (t === Tile.Road && rnd() < 0.8)) continue;
      p.target = { x, y };
      p.mood = 'wander';
      p.stuckFor = 0;
      return;
    }
    p.until = this.time + 1;
  }

  private panic(p: Pedestrian, threat: Point): void {
    const now = this.time;
    const wasCalm = p.mood !== 'flee';
    p.mood = 'flee';
    p.until = now + FLEE_TIME + this.game.random() * 2;
    p.heading = fleeAngle(p, threat, this.game.random);
    if (wasCalm && this.game.inView(p.x, p.y)) {
      const rnd = this.game.random;
      if (rnd() < CALL_POLICE_CHANCE) {
        this.game.floatText(p.x, p.y - 10, pick(T.callPolice, rnd), '#9fc4ff', 2200);
        this.crime(p, 'reported');
      } else if (rnd() < 0.4) {
        this.game.floatText(p.x, p.y - 10, pick(T.panic, rnd), '#ffffff', 1600);
      }
    }
  }

  /** Zranění chodce nebo policisty. byPlayer=false: zásah od policie (není to tvůj zločin). */
  hurtPed(p: Pedestrian, damage: number, from: Point, byPlayer = true): void {
    if (!p.alive || damage <= 0) return;
    p.hp -= damage;
    this.blood.explode(4, p.x, p.y);
    const cop = p.role === 'cop';
    const attacker = from instanceof Pedestrian ? from : null;
    if (p.hp <= 0) {
      this.killPed(p);
      this.game.events.emit('pedHurt', { ped: p, killed: true, byPlayer, attacker } satisfies PedHurtEvent);
      this.noise(p, 140, byPlayer ? (cop ? 'copMurder' : 'murder') : null);
      return;
    }
    this.game.events.emit('pedHurt', { ped: p, killed: false, byPlayer, attacker } satisfies PedHurtEvent);
    if (p.role === 'gang') {
      if (byPlayer) this.crime(p, 'assault');
      return;
    }
    if (cop) {
      if (byPlayer) this.crime(p, 'copAssault');
      return;
    }
    if (!byPlayer) {
      this.panic(p, from);
      return;
    }
    // Drsoň se otočí a jde po tobě, ostatní utíkají.
    if (p.tough && !this.game.driving) {
      if (p.mood !== 'fight') this.game.floatText(p.x, p.y - 10, pick(T.toughAngry, this.game.random), '#ff9a6a', 1800);
      p.mood = 'fight';
      p.until = this.time + 15;
    } else {
      this.panic(p, from);
    }
    this.noise(p, 90, 'assault');
  }

  private fight(p: Pedestrian, now: number): void {
    const body = p.body as Phaser.Physics.Arcade.Body;
    const target = this.player;
    const d = Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y);
    if (now > p.until || d > 260 || target.dead || this.game.driving) {
      p.mood = 'idle';
      body.setVelocity(0, 0);
      return;
    }
    const angle = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
    if (d > 13) this.walk(p, angle, PED_RUN * 0.9);
    else {
      body.setVelocity(0, 0);
      p.setRotation(angle);
      if (now > p.attackReadyAt) {
        p.attackReadyAt = now + 0.8;
        this.damagePlayer(8);
        this.fx.lineStyle(2, 0xffffff, 0.6).beginPath().arc(p.x, p.y, 12, angle - 0.7, angle + 0.7).strokePath();
      }
    }
  }

  private killPed(p: Pedestrian): void {
    p.mood = 'dead';
    p.setTexture('corpse').setDepth(3);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    if (p.role === 'cop') {
      // Policista upustí služební zbraň.
      this.addPickup(p.texture.key === 'cop-swat' ? 'smg' : 'pistol', p.x + 6, p.y + 4, 0, false);
      p.setTexture('corpse');
    } else if (p.role === 'gang' || this.game.random() < 0.6) {
      const amount = p.role === 'gang' ? 40 + Math.floor(this.game.random() * 120) : 10 + Math.floor(this.game.random() * 70);
      this.addPickup('money', p.x + 6, p.y + 4, amount, false);
    }
    this.game.tweens.add({ targets: p, alpha: 0, delay: 25000, duration: 2000, onComplete: () => p.destroy() });
  }

  private onRunOver(p: Pedestrian, v: Vehicle): void {
    if (!p.alive || v.wrecked) return;
    const dmg = runOverDamage(v.speed);
    if (dmg <= 0) {
      if (p.mood !== 'flee' && p.role === 'civil') this.panic(p, v);
      return;
    }
    // Přejetí policejním autem ani provozem není hráčův zločin.
    this.hurtPed(p, dmg, v, v === this.game.driving);
    if (p.alive) {
      const body = p.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(v.drive.vx * 0.8, v.drive.vy * 0.8);
    }
  }

  // ---------- Výbuchy ----------

  /** Výbuch auta zraní lidi okolo, hráče taky. */
  explosionAt(x: number, y: number): void {
    const hurt = (d: number) => (d >= EXPLOSION_RADIUS ? 0 : PERSON_EXPLOSION_DAMAGE * (1 - d / EXPLOSION_RADIUS));
    for (const p of this.peds) {
      if (p.alive) this.hurtPed(p, hurt(Phaser.Math.Distance.Between(x, y, p.x, p.y)) || 0, { x, y });
    }
    if (!this.game.driving) this.damagePlayer(hurt(Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y)));
    this.noise({ x, y }, 320, 'shooting');
  }

  // ---------- Hráč: zdraví a smrt ----------

  damagePlayer(amount: number): void {
    const pl = this.player;
    if (amount <= 0 || pl.dead) return;
    const r = absorbDamage(pl.health, pl.armor, amount);
    pl.health = r.health;
    pl.armor = r.armor;
    pl.setTintFill(0xff4040);
    this.game.time.delayedCall(80, () => pl.clearTint());
    if (pl.health <= 0) this.die();
  }

  private die(): void {
    const pl = this.player;
    pl.setTexture('corpse').setOrigin(0.5);
    this.knockout(T.died, [40, 0, 0], this.game.world.hospital, () => {
      const { money, lost } = deathPenalty(pl.money);
      pl.money = money;
      return T.wokeUp.replace('{lost}', String(lost));
    });
  }

  /** Zatčení: noc na služebně (obecní úřad), pokuta a zbraně pryč. */
  arrest(fine: number, station: { x: number; y: number }): void {
    if (this.player.dead) return;
    this.knockout(T.busted, [0, 0, 40], station, () => {
      this.player.money -= fine;
      return T.bustedInfo.replace('{fine}', String(fine));
    });
  }

  /** Společný průběh smrti i zatčení: zatmít, odebrat zbraně, probudit jinde. */
  private knockout(banner: string, rgb: [number, number, number], at: { x: number; y: number }, penalty: () => string): void {
    const pl = this.player;
    pl.dead = true;
    if (this.game.driving) this.game.exitVehicle();
    (pl.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.game.events.emit('banner', banner);
    this.game.events.emit('knockout');
    const cam = this.game.cameras.main;
    cam.fadeOut(1400, rgb[0], rgb[1], rgb[2]);
    cam.once('camerafadeoutcomplete', () => {
      const info = penalty();
      pl.health = 100;
      pl.armor = 0;
      pl.arsenal = { ...pl.arsenal, owned: ['fists'], current: 'fists', ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0 } };
      pl.move = { stamina: 100, exhausted: false };
      pl.dead = false;
      pl.setTexture('player');
      pl.updateLook();
      (pl.body as Phaser.Physics.Arcade.Body).reset((at.x + 0.5) * TILE, (at.y + 0.5) * TILE);
      for (const p of this.peds) if (p.mood === 'fight') p.mood = 'idle';
      cam.fadeIn(900);
      this.game.toast(info);
    });
  }

  // ---------- Věci k sebrání ----------

  addPickup(kind: PickupKind, x: number, y: number, amount: number, respawns: boolean): void {
    const sprite = this.game.add.image(x, y, `pickup-${kind}`).setDepth(4);
    this.game.tweens.add({ targets: sprite, scale: 1.25, duration: 500, yoyo: true, repeat: -1 });
    this.pickups.push({ kind, sprite, amount, respawns, readyAt: 0 });
  }

  private collectPickups(): void {
    if (this.game.driving) return;
    const pl = this.player;
    for (const p of this.pickups) {
      if (!p.sprite.visible) continue;
      if (Phaser.Math.Distance.Between(pl.x, pl.y, p.sprite.x, p.sprite.y) > PICKUP_RANGE) continue;
      if (p.kind === 'medkit' && pl.health >= 100) continue;
      if (p.kind === 'vest' && pl.armor >= 100) continue;
      this.apply(p);
      if (p.respawns) {
        p.sprite.setVisible(false);
        p.readyAt = this.time + PICKUP_RESPAWN;
      } else {
        p.sprite.destroy();
      }
    }
    this.pickups = this.pickups.filter((p) => p.sprite.active);
  }

  private apply(p: Pickup): void {
    const pl = this.player;
    if (p.kind === 'medkit') pl.health = Math.min(100, pl.health + 50);
    else if (p.kind === 'vest') pl.armor = 100;
    else if (p.kind === 'money') pl.money += p.amount;
    else this.setArsenal(pickupWeapon(pl.arsenal, p.kind));
    const text = p.kind === 'money' ? `+${p.amount} ${T.currency}` : T.picked[p.kind];
    if (p.kind === 'money') this.game.floatText(pl.x, pl.y - 10, text, '#6fd16a', 1200);
    else this.game.toast(text);
  }

  private updatePickups(): void {
    const now = this.time;
    for (const p of this.pickups) if (!p.sprite.visible && p.respawns && now > p.readyAt) p.sprite.setVisible(true);
  }
}

function pick<T>(items: readonly T[], rnd: () => number): T {
  return items[Math.floor(rnd() * items.length)];
}

