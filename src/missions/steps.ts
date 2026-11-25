import Phaser from 'phaser';
import { TILE } from '../config';
import type { Pedestrian } from '../entities/Pedestrian';
import type { Vehicle } from '../entities/Vehicle';
import type { Point } from '../systems/combat';
import { findPath } from '../systems/pathfind';
import type { GameScene } from '../scenes/GameScene';
import { isSolid } from '../world/tiles';

export type StepResult = 'run' | 'done' | 'fail';

/** Jeden krok zakázky (dojdi, ukradni, znič…). */
export abstract class Step {
  /** Důvod neúspěchu, když update vrátí 'fail'. */
  failReason = '';
  abstract objective(): string;
  /** Kam ukazuje šipka a značka (nebo nikam). */
  target(): Point | null {
    return null;
  }
  start(_game: GameScene): void {}
  abstract update(game: GameScene, dt: number): StepResult;
  cleanup(_game: GameScene): void {}
}

const near = (a: Point, b: Point, r: number) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) < r;
const focus = (g: GameScene): Point => g.driving ?? g.player;

/** Dojdi nebo dojeď na místo. */
export class GotoStep extends Step {
  constructor(private text: string, private point: Point, private radius = 22) {
    super();
  }
  objective() {
    return this.text;
  }
  target() {
    return this.point;
  }
  update(g: GameScene): StepResult {
    return near(focus(g), this.point, this.radius) ? 'done' : 'run';
  }
}

/** Vyzvedni věc (balík) na zemi. */
export class PickupStep extends Step {
  private sprite?: Phaser.GameObjects.Image;
  constructor(private text: string, private point: Point, private icon: string) {
    super();
  }
  objective() {
    return this.text;
  }
  target() {
    return this.point;
  }
  start(g: GameScene) {
    this.sprite = g.add.image(this.point.x, this.point.y, this.icon).setDepth(4);
    g.tweens.add({ targets: this.sprite, scale: 1.3, duration: 400, yoyo: true, repeat: -1 });
  }
  update(g: GameScene): StepResult {
    return near(focus(g), this.point, 14) ? 'done' : 'run';
  }
  cleanup() {
    this.sprite?.destroy();
  }
}

/** Nastup do konkrétního vozidla. */
export class EnterVehicleStep extends Step {
  constructor(private text: string, private vehicle: () => Vehicle) {
    super();
  }
  objective() {
    return this.text;
  }
  target() {
    return this.vehicle();
  }
  update(g: GameScene): StepResult {
    const v = this.vehicle();
    if (v.wrecked || !v.active) {
      this.failReason = 'Vozidlo je na šrot.';
      return 'fail';
    }
    return g.driving === v ? 'done' : 'run';
  }
}

/** Doveď vozidlo na místo (musíš v něm sedět). */
export class DeliverVehicleStep extends Step {
  constructor(private text: string, private vehicle: () => Vehicle, private point: Point) {
    super();
  }
  objective() {
    return this.text;
  }
  target(): Point {
    return this.point;
  }
  update(g: GameScene): StepResult {
    const v = this.vehicle();
    if (v.wrecked || !v.active) {
      this.failReason = 'Vozidlo je na šrot.';
      return 'fail';
    }
    return g.driving === v && near(v, this.point, 30) ? 'done' : 'run';
  }
}

/** Zabij cíle (šéfa). Strážci se do tebe pustí, když se přiblížíš. */
export class KillStep extends Step {
  constructor(private text: string, private targets: Pedestrian[], private guards: Pedestrian[]) {
    super();
  }
  objective() {
    const left = this.targets.filter((t) => t.alive).length;
    return left > 1 ? `${this.text} (zbývá ${left})` : this.text;
  }
  target() {
    return this.targets.find((t) => t.alive) ?? null;
  }
  update(g: GameScene): StepResult {
    const f = focus(g);
    for (const m of [...this.targets, ...this.guards]) {
      if (m.alive && !m.foe && near(m, f, 140)) g.gangs.engage(m, 'player', true);
    }
    return this.targets.every((t) => !t.alive) ? 'done' : 'run';
  }
}

/** Znič vozidla. Když konvoj dojede do cíle, je pozdě. */
export class DestroyStep extends Step {
  constructor(private text: string, private vehicles: Vehicle[]) {
    super();
  }
  objective() {
    const left = this.vehicles.filter((v) => !v.wrecked).length;
    return left > 1 ? `${this.text} (zbývá ${left})` : this.text;
  }
  target() {
    return this.vehicles.find((v) => !v.wrecked) ?? null;
  }
  update(g: GameScene): StepResult {
    if (this.vehicles.some((v) => !v.wrecked && g.trafficArrived(v))) {
      this.failReason = 'Dodávky dojely. Konkurence slaví.';
      return 'fail';
    }
    return this.vehicles.every((v) => v.wrecked) ? 'done' : 'run';
  }
}

/** Naber pasažéra: přijeď k němu autem. */
export class PickupPassengerStep extends Step {
  constructor(private text: string, private ped: Pedestrian, private onBoard: (v: Vehicle) => void) {
    super();
  }
  objective() {
    return this.text;
  }
  target() {
    return this.ped;
  }
  update(g: GameScene): StepResult {
    if (!this.ped.alive) {
      this.failReason = 'Pasažér to nepřežil.';
      return 'fail';
    }
    const v = g.driving;
    if (v && near(v, this.ped, 38) && Math.abs(v.speed) < 25) {
      this.ped.destroy();
      this.onBoard(v);
      return 'done';
    }
    return 'run';
  }
}

/** Doruč pasažéra: zastav s jeho autem v cíli. */
export class DropPassengerStep extends Step {
  constructor(private text: string, private vehicle: () => Vehicle, private point: Point, private onArrive: (g: GameScene) => void) {
    super();
  }
  objective() {
    return this.text;
  }
  target() {
    return this.point;
  }
  update(g: GameScene): StepResult {
    const v = this.vehicle();
    if (v.wrecked || !v.active) {
      this.failReason = 'Pasažér to nepřežil.';
      return 'fail';
    }
    if (g.driving === v && near(v, this.point, 32) && Math.abs(v.speed) < 20) {
      this.onArrive(g);
      return 'done';
    }
    return 'run';
  }
}

/** Doprovoď člena: jde k cíli, jen když jsi poblíž. Nesmí umřít. */
export class EscortStep extends Step {
  private path: Point[] = [];
  private idx = 0;
  private ambushed = false;
  constructor(private text: string, private ped: Pedestrian, private dest: Point, private ambush: (g: GameScene, at: Point) => void) {
    super();
  }
  objective() {
    return this.text;
  }
  target() {
    return this.ped;
  }
  start(g: GameScene) {
    const tiles = g.world.tiles;
    const p = findPath(tiles, [Math.floor(this.ped.x / TILE), Math.floor(this.ped.y / TILE)], [Math.floor(this.dest.x / TILE), Math.floor(this.dest.y / TILE)], (t) => (isSolid(t) ? Infinity : 1));
    this.path = (p ?? []).map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
  }
  update(g: GameScene): StepResult {
    const m = this.ped;
    if (!m.alive) {
      this.failReason = 'Franta to nezvládl.';
      return 'fail';
    }
    const body = m.body as Phaser.Physics.Arcade.Body;
    if (near(m, this.dest, 20)) {
      body.setVelocity(0, 0);
      return 'done';
    }
    // V půlce cesty na něj čekají.
    if (!this.ambushed && this.idx > this.path.length / 2) {
      this.ambushed = true;
      this.ambush(g, m);
    }
    if (!near(m, focus(g), 90)) {
      body.setVelocity(0, 0);
      return 'run';
    }
    while (this.idx < this.path.length - 1 && near(m, this.path[this.idx], 8)) this.idx++;
    const to = this.path[this.idx] ?? this.dest;
    const angle = Phaser.Math.Angle.Between(m.x, m.y, to.x, to.y);
    m.setRotation(angle);
    g.physics.velocityFromRotation(angle, 42, body.velocity);
    return 'run';
  }
}

/** Polož nálož: drž E u cíle, pak uteč, než to bouchne. */
export class PlantStep extends Step {
  private progress = 0;
  private fuse = -1;
  private objectSprite?: Phaser.GameObjects.Image;
  private key?: Phaser.Input.Keyboard.Key;
  constructor(private text: string, private point: Point, private objectKey: string | null) {
    super();
  }
  objective() {
    if (this.fuse >= 0) return `Uteč! Bouchne to za ${Math.ceil(this.fuse)} s`;
    if (this.progress > 0) return `Pokládám nálož… ${Math.round(this.progress * 100)} %`;
    return this.text;
  }
  target() {
    return this.point;
  }
  start(g: GameScene) {
    this.key = g.input.keyboard!.addKey('E');
    if (this.objectKey) this.objectSprite = g.add.image(this.point.x, this.point.y, this.objectKey).setDepth(4);
  }
  update(g: GameScene, dt: number): StepResult {
    if (this.fuse >= 0) {
      this.fuse -= dt;
      if (this.fuse <= 0) {
        g.explodeAt(this.point.x, this.point.y);
        this.objectSprite?.setTint(0x2a2420);
        return 'done';
      }
      return 'run';
    }
    const holding = !g.driving && !g.player.dead && !!this.key?.isDown && near(g.player, this.point, 22);
    this.progress = holding ? this.progress + dt / 2.5 : Math.max(0, this.progress - dt);
    if (this.progress >= 1) {
      this.fuse = 5;
      g.toast('Nálož položena. Utíkej!');
    }
    return 'run';
  }
}

/** Přežij útok vln nepřátel. */
export class SurviveStep extends Step {
  private left: number;
  private waveIn = 0;
  constructor(private text: string, duration: number, private point: Point, private wave: (g: GameScene) => void, private every = 12) {
    super();
    this.left = duration;
  }
  objective() {
    return `${this.text}: ${Math.ceil(this.left)} s`;
  }
  target() {
    return this.point;
  }
  update(g: GameScene, dt: number): StepResult {
    this.left -= dt;
    this.waveIn -= dt;
    if (this.waveIn <= 0) {
      this.waveIn = this.every;
      this.wave(g);
    }
    return this.left <= 0 ? 'done' : 'run';
  }
}

/** Uteč policii: začíná s hledaností a končí, až tě ztratí. */
export class EvadeStep extends Step {
  private elapsed = 0;
  constructor(private text: string, private level: number) {
    super();
  }
  objective() {
    return this.text;
  }
  start(g: GameScene) {
    g.police.raiseTo(this.level, focus(g));
  }
  update(g: GameScene, dt: number): StepResult {
    this.elapsed += dt;
    return this.elapsed > 5 && g.police.wanted.level === 0 ? 'done' : 'run';
  }
}
