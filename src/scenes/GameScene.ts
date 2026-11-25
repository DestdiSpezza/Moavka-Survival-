import Phaser from 'phaser';
import { TILE, WORLD_ZOOM } from '../config';
import { Player } from '../entities/Player';
import { Vehicle } from '../entities/Vehicle';
import { WEAPONS } from '../systems/combat';
import { explosionDamageAt, EXPLOSION_RADIUS } from '../systems/damage';
import { createRng } from '../systems/rng';
import { isAhead, type Point, steerToward } from '../systems/trafficAi';
import { type DriveInput, surfaceFor, toKmh } from '../systems/vehicleModel';
import { T } from '../texts/cs';
import { buildMoravka, type WorldMap, zoneAt } from '../world/moravka';
import { isSolid, speedFactor, TILE_COUNT } from '../world/tiles';
import { CAR_COLORS } from '../world/tileset';
import { parkedVehicles, trafficPaths, type VehicleKind } from '../world/vehicles';
import { pixelFont } from './BootScene';
import { Combat } from './Combat';
import { Gangs } from './Gangs';
import { Police } from './Police';

export const MINIMAP = { x: 16, y: 16, w: 200, h: 150, zoom: 0.1 };
const ENTER_RANGE = 26;
const TRAFFIC_COUNT = 7;
const CRUISE = 90;

interface Traffic {
  path: Point[];
  idx: number;
  cruise: number;
  waited: number;
  ignoreUntil: number;
  honkedAt: number;
  /** Jak dlouho auto stojí, i když by jet mělo (zaseklé o roh). */
  stuck: number;
  reverseUntil: number;
}

export interface PlayerHud {
  health: number;
  armor: number;
  money: number;
  weapon: string;
  /** null = zbraň bez munice (pěsti, pálka). */
  ammo: number | null;
}

export interface VehicleHud {
  name: string;
  kmh: number;
  hp: number;
  state: string;
}

type DriveKeys = Record<'up' | 'down' | 'left' | 'right' | 'handbrake' | 'enter', Phaser.Input.Keyboard.Key>;

/** Hlavní herní scéna: mapa, hráč, vozidla, provoz, kamera a minimapa. */
export class GameScene extends Phaser.Scene {
  world!: WorldMap;
  player!: Player;
  vehicles: Vehicle[] = [];
  /** Auto, které hráč právě řídí. */
  driving: Vehicle | null = null;
  combat!: Combat;
  police!: Police;
  gangs!: Gangs;
  layer!: Phaser.Tilemaps.TilemapLayer;
  /** Deterministická náhoda pro celou scénu. */
  readonly random = createRng(99);

  private traffic = new Map<Vehicle, Traffic>();
  private paths: Point[][] = [];
  private keys!: DriveKeys;
  private arrows!: Phaser.Types.Input.Keyboard.CursorKeys;
  private elapsed = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.vehicles = [];
    this.traffic.clear();
    this.driving = null;
    this.world = buildMoravka();
    const map = this.make.tilemap({ data: this.world.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, tileset, 0, 0)!;
    this.layer.setCollision(Array.from({ length: TILE_COUNT }, (_, i) => i).filter(isSolid));

    const wPx = this.world.width * TILE;
    const hPx = this.world.height * TILE;
    this.physics.world.setBounds(0, 0, wPx, hPx);

    const labels = this.world.buildings
      .filter((b) => b.name !== 'Dům')
      .map((b) =>
        this.add
          .text((b.x + b.w / 2) * TILE, (b.y + b.h / 2) * TILE, b.name.toUpperCase(), pixelFont(14, '#fff4d6'))
          .setOrigin(0.5)
          .setScale(1 / WORLD_ZOOM)
          .setStroke('#2a1d12', 4)
          .setDepth(5),
      );

    const { x, y } = this.world.spawn;
    this.player = new Player(this, (x + 0.5) * TILE, (y + 0.5) * TILE);
    this.physics.add.collider(this.player, this.layer);

    this.spawnVehicles();
    this.physics.add.collider(this.vehicles, this.layer);
    this.physics.add.collider(this.vehicles, this.vehicles, (a, b) => {
      // Naražení do policejního auta je útok na policii.
      const va = a as Vehicle;
      const vb = b as Vehicle;
      const other = va === this.driving ? vb : vb === this.driving ? va : null;
      if (other && Math.abs(this.driving!.speed) > 40) {
        other.playerHitAt = this.time.now / 1000;
        if (other.isPolice) this.events.emit('crime', { x: this.driving!.x, y: this.driving!.y, kind: 'rammedCop' });
      }
    });
    this.physics.add.collider(this.player, this.vehicles);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', handbrake: 'SPACE', enter: 'E' }) as DriveKeys;
    this.arrows = kb.createCursorKeys();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, wPx, hPx);
    cam.setZoom(WORLD_ZOOM);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);

    const mini = this.cameras
      .add(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h)
      .setZoom(MINIMAP.zoom)
      .setBounds(0, 0, wPx, hPx)
      .setBackgroundColor(0x000000)
      .startFollow(this.player);
    mini.setName('minimap');
    mini.ignore(labels);
    const dot = this.add.circle(0, 0, 40, 0xffd23f).setDepth(20);
    cam.ignore(dot);
    this.events.on('postupdate', () => {
      const target = this.driving ?? this.player;
      dot.setPosition(target.x, target.y);
    });

    this.combat = new Combat(this);
    this.police = new Police(this);
    this.gangs = new Gangs(this);
    this.input.setDefaultCursor('none');
    this.scene.launch('UI');
  }

  private spawnVehicles(): void {
    for (const p of parkedVehicles(this.world)) {
      const v = this.addVehicle(p.kind, p.x, p.y, p.angle, Math.floor(this.random() * CAR_COLORS.length));
      v.owner = p.owner;
    }
    this.paths = trafficPaths();
    const kinds: VehicleKind[] = ['osobak', 'osobak', 'dodavka', 'osobak', 'traktor', 'osobak', 'osobak'];
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const path = this.paths[i % this.paths.length];
      const idx = (4 + i * 7) % (path.length - 2);
      const from = path[idx];
      const to = path[idx + 1];
      const v = this.addVehicle(kinds[i], from.x, from.y, Math.atan2(to.y - from.y, to.x - from.x), i % CAR_COLORS.length);
      v.driver = 'npc';
      this.traffic.set(v, { path, idx: idx + 1, cruise: Math.min(CRUISE, v.spec.params.maxSpeed * 0.85), waited: 0, ignoreUntil: 0, honkedAt: -10, stuck: 0, reverseUntil: 0 });
    }
  }

  addVehicle(kind: VehicleKind, x: number, y: number, angle: number, variant: number): Vehicle {
    const v = new Vehicle(this, kind, x, y, angle, variant);
    v.onStateChange = (veh, _from, to) => this.onVehicleState(veh, to);
    this.vehicles.push(v);
    return v;
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.elapsed += dt;

    if (Phaser.Input.Keyboard.JustDown(this.keys.enter) && !this.player.dead) {
      if (this.driving) this.exitVehicle();
      else this.tryEnterVehicle();
    }

    for (const v of this.vehicles) {
      if (v.wrecked) continue;
      const tile = this.tileAt(v.x, v.y);
      const surface = surfaceFor(tile, v.spec.params.offroad);
      let input: DriveInput;
      if (v === this.driving) input = this.playerDriveInput();
      else if (v.driver === 'npc') input = this.trafficInput(v, dt);
      else if (v.driver === 'police') input = this.police.driveInput(v, dt);
      else input = { throttle: 0, steer: 0, handbrake: true };
      v.tick(input, surface, dt);
    }

    if (this.driving) {
      this.player.setPosition(this.driving.x, this.driving.y);
      // V hořícím autě se peče i řidič.
      if (this.driving.state === 'fire') this.combat.damagePlayer(10 * dt);
    } else if (this.player.dead) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else {
      const tile = this.tileAt(this.player.x, this.player.y);
      this.player.tick(dt, speedFactor(tile), this.input.activePointer);
    }

    // Za jízdy se kamera trochu oddálí, ať je vidět, kam se řítíš.
    const cam = this.cameras.main;
    const speed = this.driving ? Math.abs(this.driving.speed) : 0;
    const zoom = WORLD_ZOOM - 0.5 * Math.min(1, speed / 200);
    cam.setZoom(Phaser.Math.Linear(cam.zoom, zoom, 0.04));

    const focus = this.driving ?? this.player;
    const tx = Math.floor(focus.x / TILE);
    const ty = Math.floor(focus.y / TILE);
    this.registry.set('zone', zoneAt(this.world, tx, ty));
    this.registry.set('tile', this.driving ? -1 : this.world.tiles[ty]?.[tx]);
    this.registry.set('vehicle', this.driving ? this.vehicleHud(this.driving) : null);
    this.registry.set('prompt', this.driving || this.player.dead ? '' : this.enterPrompt());
    this.combat.update(dt);
    this.police.update(dt);
    this.gangs.update(dt);
    const a = this.player.arsenal;
    const def = WEAPONS[a.current];
    this.registry.set('player', {
      health: this.player.health,
      armor: this.player.armor,
      money: this.player.money,
      weapon: def.name,
      ammo: def.melee ? null : a.ammo[a.current],
    } satisfies PlayerHud);
  }

  tileAt(x: number, y: number): number {
    return this.world.tiles[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? 0;
  }

  private playerDriveInput(): DriveInput {
    const k = this.keys;
    const a = this.arrows;
    const up = k.up.isDown || a.up.isDown;
    const down = k.down.isDown || a.down.isDown;
    const left = k.left.isDown || a.left.isDown;
    const right = k.right.isDown || a.right.isDown;
    return { throttle: (up ? 1 : 0) - (down ? 1 : 0), steer: (right ? 1 : 0) - (left ? 1 : 0), handbrake: k.handbrake.isDown };
  }

  // ---------- Nastupování a krádeže ----------

  private nearestVehicle(): Vehicle | null {
    let best: Vehicle | null = null;
    let bestD = ENTER_RANGE;
    for (const v of this.vehicles) {
      if (v.wrecked || v.driver === 'police') continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, v.x, v.y);
      if (d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  private enterPrompt(): string {
    const v = this.nearestVehicle();
    if (!v) return '';
    return `${v.driver === 'npc' ? T.carjack : T.steal} (${v.spec.name})`;
  }

  private tryEnterVehicle(): void {
    const v = this.nearestVehicle();
    if (!v) return;
    if (v.driver === 'npc') this.yankDriver(v);
    else if (!v.stolen) this.events.emit('crime', { x: v.x, y: v.y, kind: v.isPolice ? 'policeTheft' : 'theft' });
    if (v.isPolice && !v.stolen) this.toast(T.stolePolice);
    if (!v.stolen) this.gangs.onSteal(v);
    v.stolen = true;
    this.police.onEnterVehicle(v);
    this.traffic.delete(v);
    v.driver = 'player';
    this.driving = v;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.player.setVisible(false);
    this.cameras.main.startFollow(v, true, 0.15, 0.15);
    this.cameras.getCamera('minimap')?.startFollow(v);
  }

  exitVehicle(): void {
    const v = this.driving;
    if (!v) return;
    this.placePlayerBeside(v);
    v.driver = 'none';
    v.resetTexture();
    this.driving = null;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(this.player.x, this.player.y);
    this.player.setVisible(true);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.getCamera('minimap')?.startFollow(this.player);
  }

  /** Vystoupit vlevo, a když tam je zeď nebo voda, zkusit vpravo, za a před autem. */
  private placePlayerBeside(v: Vehicle): void {
    const a = v.rotation;
    const side = v.spec.width / 2 + 9;
    const end = v.spec.length / 2 + 9;
    const options = [
      [Math.cos(a - Math.PI / 2) * side, Math.sin(a - Math.PI / 2) * side],
      [Math.cos(a + Math.PI / 2) * side, Math.sin(a + Math.PI / 2) * side],
      [-Math.cos(a) * end, -Math.sin(a) * end],
      [Math.cos(a) * end, Math.sin(a) * end],
    ];
    for (const [dx, dy] of options) {
      if (!isSolid(this.tileAt(v.x + dx, v.y + dy))) {
        this.player.setPosition(v.x + dx, v.y + dy);
        return;
      }
    }
    this.player.setPosition(v.x, v.y);
  }

  private yankDriver(v: Vehicle): void {
    const lines = T.yanked;
    this.spawnFleeingDriver(v.x, v.y, lines[Math.floor(this.random() * lines.length)]);
    this.events.emit('crime', { x: v.x, y: v.y, kind: 'assault' });
  }

  private spawnFleeingDriver(x: number, y: number, line: string): void {
    const d = this.physics.add.sprite(x, y, 'driver').setDepth(10);
    (d.body as Phaser.Physics.Arcade.Body).setCircle(5, 3, 3);
    this.physics.add.collider(d, this.layer);
    const away = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y) + (this.random() - 0.5) * 0.8;
    d.setRotation(away);
    this.physics.velocityFromRotation(away, 85, (d.body as Phaser.Physics.Arcade.Body).velocity);
    this.floatText(x, y - 10, line, '#ffffff', 2600);
    this.tweens.add({ targets: d, alpha: 0, delay: 3200, duration: 600, onComplete: () => d.destroy() });
  }

  // ---------- Provoz ----------

  private trafficInput(v: Vehicle, dt: number): DriveInput {
    const t = this.traffic.get(v);
    if (!t) return { throttle: 0, steer: 0, handbrake: true };

    let target = t.path[t.idx];
    if (target && Phaser.Math.Distance.Between(v.x, v.y, target.x, target.y) < 14) {
      t.idx++;
      target = t.path[t.idx];
    }
    if (!target) {
      // Konec trasy: když to hráč nevidí, auto „odjede“ a objeví se jinde.
      if (!this.inView(v.x, v.y)) this.respawnTraffic(v, t);
      return { throttle: -1, steer: 0, handbrake: false };
    }

    let blocked = false;
    if (this.elapsed > t.ignoreUntil) {
      const obstacles: Point[] = this.vehicles.filter((o) => o !== v);
      if (!this.driving && !this.player.dead) obstacles.push(this.player);
      for (const p of this.combat.peds) if (p.alive && Math.abs(p.x - v.x) < 40 && Math.abs(p.y - v.y) < 40) obstacles.push(p);
      blocked = obstacles.some((o) => isAhead(v, v.drive.angle, o, 34, 9));
    }
    if (blocked) {
      t.waited += dt;
      if (t.waited > 1.5 && this.elapsed - t.honkedAt > 3) {
        t.honkedAt = this.elapsed;
        if (this.inView(v.x, v.y)) this.floatText(v.x, v.y - 12, T.honk, '#ffd23f', 900);
      }
      // Ať se provoz nezasekne navždy: po chvíli to řidič zkusí objet.
      if (t.waited > 4) {
        t.ignoreUntil = this.elapsed + 1.5;
        t.waited = 0;
      }
    } else {
      t.waited = 0;
    }

    // Zaseklé auto: chvíli couvá s protočeným volantem; mimo dohled se rovnou přesune.
    if (this.elapsed < t.reverseUntil) return { throttle: -1, steer: -0.6, handbrake: false };
    t.stuck = !blocked && Math.abs(v.speed) < 8 ? t.stuck + dt : 0;
    if (t.stuck > 2.5) {
      t.stuck = 0;
      if (!this.inView(v.x, v.y)) this.respawnTraffic(v, t);
      else t.reverseUntil = this.elapsed + 0.8;
    }
    return steerToward(v, v.drive.angle, v.speed, target, t.cruise, blocked);
  }

  private respawnTraffic(v: Vehicle, t: Traffic): void {
    const candidates = this.paths.filter((p) => {
      const s = p[0];
      return !this.inView(s.x, s.y) && this.vehicles.every((o) => o === v || Phaser.Math.Distance.Between(o.x, o.y, s.x, s.y) > 40);
    });
    if (!candidates.length) return;
    const path = candidates[Math.floor(this.random() * candidates.length)];
    const angle = Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x);
    (v.body as Phaser.Physics.Arcade.Body).reset(path[0].x, path[0].y);
    v.drive = { angle, vx: 0, vy: 0 };
    v.setRotation(angle);
    Object.assign(t, { path, idx: 1, waited: 0, ignoreUntil: 0, stuck: 0, reverseUntil: 0 });
  }

  inView(x: number, y: number): boolean {
    return Phaser.Geom.Rectangle.Contains(Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(this.cameras.main.worldView), 40, 40), x, y);
  }

  // ---------- Poškození a výbuchy ----------

  private onVehicleState(v: Vehicle, to: string): void {
    if (v === this.driving) {
      if (to === 'smoke') this.toast(T.smoke);
      if (to === 'fire') this.toast(T.fire);
    } else if (to === 'fire' && v.driver === 'npc') {
      this.traffic.delete(v);
      v.driver = 'none';
      this.spawnFleeingDriver(v.x, v.y, T.driverBails);
    }
    if (to === 'wrecked') this.explode(v);
  }

  private explode(v: Vehicle): void {
    const { x, y } = v;
    const wasInside = v === this.driving;
    this.gangs.onWrecked(v, wasInside || this.time.now / 1000 - v.playerHitAt < 6);
    if (wasInside) this.exitVehicle();
    v.driver = 'none';
    this.traffic.delete(v);

    const flash = this.add.circle(x, y, EXPLOSION_RADIUS * 0.6, 0xfff0a0, 0.9).setDepth(15).setBlendMode('ADD');
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
    const burst = this.add.particles(x, y, 'puff', {
      lifespan: 700,
      speed: { min: 40, max: 160 },
      scale: { start: 1.4, end: 0 },
      tint: [0xffd23f, 0xff7a1a, 0xe03a1a, 0x333333],
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(15);
    burst.explode(36);
    this.time.delayedCall(900, () => burst.destroy());

    const cam = this.cameras.main;
    if (Phaser.Math.Distance.Between(cam.midPoint.x, cam.midPoint.y, x, y) < 300) cam.shake(250, 0.006);

    this.combat.explosionAt(x, y);
    if (wasInside && !this.player.dead) this.toast(T.explodedInside);

    // Řetězová reakce: výbuch poškodí auta okolo (zpožděně, ať to bouchá postupně).
    this.time.delayedCall(120, () => {
      for (const o of this.vehicles) {
        if (o === v || o.wrecked) continue;
        o.damage(explosionDamageAt(Phaser.Math.Distance.Between(x, y, o.x, o.y)));
      }
    });
  }

  // ---------- HUD ----------

  private vehicleHud(v: Vehicle): VehicleHud {
    return { name: v.spec.name, kmh: toKmh(v.speed), hp: v.hp / v.spec.maxHp, state: v.state };
  }

  toast(text: string): void {
    this.events.emit('toast', text);
  }

  floatText(x: number, y: number, text: string, color: string, ms: number): void {
    const t = this.add
      .text(x, y, text, pixelFont(14, color))
      .setOrigin(0.5, 1)
      .setScale(1 / WORLD_ZOOM)
      .setStroke('#000', 4)
      .setDepth(30);
    this.cameras.getCamera('minimap')?.ignore(t);
    this.tweens.add({ targets: t, y: y - 10, alpha: 0, delay: ms * 0.6, duration: ms * 0.4, onComplete: () => t.destroy() });
  }
}
