import Phaser from 'phaser';
import { computeMove, type MoveState, STAMINA_MAX } from '../systems/movement';

type Keys = Record<'up' | 'down' | 'left' | 'right' | 'sprint', Phaser.Input.Keyboard.Key>;

/** Hráč pěšky: pohyb WASD, sprint SHIFT, otáčí se za myší. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  move: MoveState = { stamina: STAMINA_MAX, exhausted: false };
  sprinting = false;
  private keys: Keys;
  private arrows: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(5, 3, 3);
    body.setCollideWorldBounds(true);
    this.setDepth(10);

    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', sprint: 'SHIFT' }) as Keys;
    this.arrows = kb.createCursorKeys(); // šipky jako alternativa k WASD
  }

  /** dt v sekundách, terrainFactor podle dlaždice pod hráčem. */
  tick(dt: number, terrainFactor: number, pointer: Phaser.Input.Pointer): void {
    const k = this.keys;
    const a = this.arrows;
    const r = computeMove(
      {
        up: k.up.isDown || a.up.isDown,
        down: k.down.isDown || a.down.isDown,
        left: k.left.isDown || a.left.isDown,
        right: k.right.isDown || a.right.isDown,
        sprint: k.sprint.isDown || a.shift.isDown,
      },
      this.move,
      dt,
      terrainFactor,
    );
    this.move = r.state;
    this.sprinting = r.sprinting;
    this.setVelocity(r.vx, r.vy);

    const cam = this.scene.cameras.main;
    const target = pointer.positionToCamera(cam) as Phaser.Math.Vector2;
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y));
  }
}
