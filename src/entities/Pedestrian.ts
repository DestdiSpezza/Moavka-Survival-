import Phaser from 'phaser';
import { PED_HP, TOUGH_PED_HP } from '../systems/crowd';
import { animateWalk } from './walk';
import type { GroupId } from '../systems/respect';

export type PedState = 'idle' | 'wander' | 'flee' | 'fight' | 'dead';
export type PedRole = 'civil' | 'cop' | 'gang' | 'animal';

/** Na koho člen skupiny nebo policista útočí. */
export type Foe = Pedestrian | 'player' | Phaser.GameObjects.Sprite | null;

/** Chodec: bloumá po vesnici, při nebezpečí utíká; drsoň se brání. */
export class Pedestrian extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  readonly tough: boolean;
  mood: PedState = 'idle';
  /** Do kdy trvá aktuální stav. */
  until = 0;
  target: { x: number; y: number } | null = null;
  heading = 0;
  attackReadyAt = 0;
  stuckFor = 0;
  role: PedRole = 'civil';
  maxHp: number;
  /** Člen skupiny: ke které patří, kde má „doma“ a na koho jde. */
  group: GroupId | null = null;
  home: { x: number; y: number } | null = null;
  foe: Foe = null;
  foeUntil = 0;
  nextAttack = 0;
  fleeUntil = 0;
  /** Útočí na policii (policisté pak střílí po něm). */
  attacksPolice = false;
  /** Postavu řídí zakázka (Franta, Jarda), ne běžné chování skupiny. */
  scripted = false;
  /** Naplánovaná cesta pěšky kolem domů (body v px), kam vede a kdy byla spočítaná. */
  navPath: Array<{ x: number; y: number }> | null = null;
  navIdx = 0;
  navGoal: { x: number; y: number } | null = null;
  navAt = -100;
  /** Hlídání zaseknutí: kde postava byla při poslední kontrole a kdy. */
  walkX = 0;
  walkY = 0;
  walkAt = -100;
  stuckHits = 0;
  /** Krok stranou od překážky (strom, roh domu) do tohoto času, tímto směrem. */
  sideUntil = 0;
  sideAngle = 0;
  /** Kam utíká (bod, kam se dá doběhnout). */
  fleeTarget: { x: number; y: number } | null = null;
  fleeTargetAt = -100;
  /** Poslední událost, které se postava účastnila (pro řetězení příčin). */
  lastEventId: number | null = null;
  lastEventAt = -100;

  constructor(scene: Phaser.Scene, x: number, y: number, look: number, tough: boolean, texture?: string, hp?: number) {
    super(scene, x, y, texture ?? `ped-${look}`);
    this.tough = tough;
    this.hp = hp ?? (tough ? TOUGH_PED_HP : PED_HP);
    this.maxHp = this.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(5, 3, 3);
    body.setCollideWorldBounds(true);
    // Všechny postavy mají snímky 24×16 s rameny v bodě (8, 8).
    this.setOrigin(8 / 24, 0.5);
    this.setDepth(9);
  }

  private walkPhase = 0;

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.alive) this.walkPhase = animateWalk(this, this.walkPhase, delta / 1000);
  }

  get alive(): boolean {
    return this.mood !== 'dead';
  }
}
