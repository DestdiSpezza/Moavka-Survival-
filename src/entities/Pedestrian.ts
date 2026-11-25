import Phaser from 'phaser';
import { PED_HP, TOUGH_PED_HP } from '../systems/crowd';

export type PedState = 'idle' | 'wander' | 'flee' | 'fight' | 'dead';

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

  constructor(scene: Phaser.Scene, x: number, y: number, look: number, tough: boolean) {
    super(scene, x, y, `ped-${look}`);
    this.tough = tough;
    this.hp = tough ? TOUGH_PED_HP : PED_HP;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(5, 3, 3);
    body.setCollideWorldBounds(true);
    this.setDepth(9);
  }

  get alive(): boolean {
    return this.mood !== 'dead';
  }
}
