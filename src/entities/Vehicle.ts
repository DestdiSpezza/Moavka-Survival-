import Phaser from 'phaser';
import { damageState, type DamageState, FIRE_BURN_FRACTION, impactDamage } from '../systems/damage';
import { type DriveInput, type DriveState, forwardSpeed, stepDrive, type Surface } from '../systems/vehicleModel';
import type { GroupId } from '../systems/respect';
import { isPoliceKind, VEHICLE_TYPES, type VehicleKind, type VehicleType } from '../world/vehicles';

export type Driver = 'none' | 'npc' | 'player' | 'police';

/**
 * Vozidlo: sprite s fyzikálním tělem, jízdní model a poškození.
 * Fyzika Phaseru řeší posun a kolize; jízdní model určuje, jakou rychlost
 * má auto mít. Rozdíl mezi rychlostí, kterou jsme autu dali, a tou, kterou
 * má po kolizích, je síla nárazu.
 */
export class Vehicle extends Phaser.Physics.Arcade.Sprite {
  readonly spec: VehicleType;
  driver: Driver = 'none';
  /** Hráč ho už jednou ukradl (krádež se hlásí jen poprvé). */
  stolen = false;
  /** Skupina, které vozidlo patří. */
  owner: GroupId | null = null;
  /** Kdy ho naposledy poškodil hráč (herní čas v s); podle toho se pozná, kdo ho zničil. */
  playerHitAt = -100;
  hp: number;
  state: DamageState = 'ok';
  drive: DriveState;
  /** Nastaví se, když stav přejde do nového (pro hlášky a efekty). */
  onStateChange?: (v: Vehicle, from: DamageState, to: DamageState) => void;

  private lastVx = 0;
  private lastVy = 0;
  private smoke?: Phaser.GameObjects.Particles.ParticleEmitter;
  private fire?: Phaser.GameObjects.Particles.ParticleEmitter;
  private sirenTimer = 0;
  private variant: number;
  private shadow: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, kind: VehicleKind, x: number, y: number, angle: number, variant = 0) {
    const key = kind === 'osobak' ? `osobak-${variant}` : `${kind}-0`;
    super(scene, x, y, key);
    this.variant = variant;
    this.spec = VEHICLE_TYPES[kind];
    this.hp = this.spec.maxHp;
    this.drive = { angle, vx: 0, vy: 0 };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Arcade tělo se neotáčí, takže auto je v kolizích kruh přes jeho střed.
    // Poloměr podle šířky, aby se auta v sousedních pruzích (16 px) nedotýkala.
    const r = Math.floor(this.spec.width / 2);
    body.setCircle(r, this.spec.length / 2 - r, this.spec.width / 2 - r);
    body.setMass(this.spec.maxHp / 50);
    body.setCollideWorldBounds(true);
    body.setDrag(0, 0);
    this.setRotation(angle).setDepth(8);
    // Stín pod autem, posunutý od slunce (zleva shora).
    this.shadow = scene.add.image(x + 2, y + 3, `shadow-${kind}`).setDepth(7.9).setRotation(angle);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.shadow.setPosition(this.x + 2, this.y + 3).setRotation(this.rotation);
  }

  get speed(): number {
    return forwardSpeed(this.drive);
  }

  get isPolice(): boolean {
    return isPoliceKind(this.spec.kind);
  }

  get wrecked(): boolean {
    return this.state === 'wrecked';
  }

  /**
   * Jeden snímek: přečte, co s autem udělaly kolize, spočítá poškození,
   * pak posune jízdní model a předá novou rychlost fyzice.
   */
  tick(input: DriveInput, surface: Surface, dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.wrecked) return;

    const touching = !body.blocked.none || !body.touching.none;
    if (touching) {
      const dv = Math.hypot(body.velocity.x - this.lastVx, body.velocity.y - this.lastVy);
      this.damage(impactDamage(dv));
    }
    if (this.state === 'fire') this.damage(FIRE_BURN_FRACTION * this.spec.maxHp * dt);
    if (this.wrecked) return;

    this.drive = stepDrive({ ...this.drive, vx: body.velocity.x, vy: body.velocity.y }, input, this.spec.params, surface, dt);
    body.setVelocity(this.drive.vx, this.drive.vy);
    this.lastVx = this.drive.vx;
    this.lastVy = this.drive.vy;
    this.setRotation(this.drive.angle);

    if (this.isPolice && (this.driver === 'player' || this.driver === 'police')) {
      this.sirenTimer += dt;
      this.setTexture(`${this.spec.kind}-${Math.floor(this.sirenTimer * 4) % 2}`);
    }
  }

  /** Oprava v garáži: plné životy, pryč kouř i oheň. */
  repair(): void {
    if (this.wrecked) return;
    this.hp = this.spec.maxHp;
    this.state = 'ok';
    this.smoke?.destroy();
    this.fire?.destroy();
    this.smoke = undefined;
    this.fire = undefined;
  }

  damage(amount: number): void {
    if (amount <= 0 || this.wrecked) return;
    this.hp = Math.max(0, this.hp - amount);
    const next = damageState(this.hp, this.spec.maxHp);
    if (next !== this.state) {
      const prev = this.state;
      this.state = next;
      this.updateEffects();
      this.onStateChange?.(this, prev, next);
    }
  }

  private updateEffects(): void {
    const scene = this.scene;
    if ((this.state === 'smoke' || this.state === 'fire') && !this.smoke) {
      this.smoke = scene.add.particles(0, 0, 'puff', {
        follow: this,
        lifespan: 900,
        speed: { min: 5, max: 20 },
        scale: { start: 0.6, end: 1.6 },
        alpha: { start: 0.5, end: 0 },
        tint: 0x555555,
        frequency: 90,
      });
      this.smoke.setDepth(9);
    }
    if (this.state === 'fire' && !this.fire) {
      this.fire = scene.add.particles(0, 0, 'puff', {
        follow: this,
        lifespan: 400,
        speed: { min: 10, max: 30 },
        scale: { start: 0.8, end: 0.1 },
        tint: [0xffd23f, 0xff7a1a, 0xe03a1a],
        blendMode: 'ADD',
        frequency: 40,
      });
      this.fire.setDepth(9);
    }
    if (this.state === 'wrecked') {
      this.fire?.destroy();
      this.fire = undefined;
      this.smoke?.setConfig({
        lifespan: 1600, speed: { min: 3, max: 12 }, scale: { start: 0.8, end: 2 },
        alpha: { start: 0.4, end: 0 }, tint: 0x222222, frequency: 160,
      });
      this.smoke?.startFollow(this);
      this.setTexture(`${this.spec.kind}-wreck`);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      body.setImmovable(true);
      body.pushable = false;
    }
  }

  /** Původní textura (po krádeži policejního auta, když hráč vystoupí). */
  resetTexture(): void {
    if (this.wrecked) return;
    this.setTexture(this.spec.kind === 'osobak' ? `osobak-${this.variant}` : `${this.spec.kind}-0`);
  }

  destroy(fromScene?: boolean): void {
    this.shadow?.destroy();
    this.smoke?.destroy();
    this.fire?.destroy();
    super.destroy(fromScene);
  }
}
