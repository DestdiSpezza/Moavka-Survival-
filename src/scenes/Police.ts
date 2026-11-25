import Phaser from 'phaser';
import { TILE } from '../config';
import { Pedestrian } from '../entities/Pedestrian';
import { Vehicle } from '../entities/Vehicle';
import { type Point, rayCircleHit } from '../systems/combat';
import { findPath } from '../systems/pathfind';
import { lineOfSight } from '../systems/sight';
import { angleDiff, steerToward } from '../systems/trafficAi';
import type { DriveInput } from '../systems/vehicleModel';
import {
  addCrime, arrestFine, type CrimeKind, LEVEL_HEAT, newWanted, responseFor, swapCar, tickWanted, type Wanted,
} from '../systems/wanted';
import { T } from '../texts/cs';
import { findFreeTile } from '../world/pickups';
import { blocksBullets, isSolid, Tile } from '../world/tiles';
import { trafficPaths } from '../world/vehicles';
import type { CrimeEvent } from './Combat';
import type { GameScene } from './GameScene';

const SIGHT = 230;
const CLOSE_SIGHT = 50;
const DEPLOY_RANGE = 70;
const COP_SPEED = 80;
const COP_HP = 60;
const SWAT_HP = 110;
const ARREST_RANGE = 15;
const ARREST_TIME = 1.2;
/** Stejný druh zločinu se počítá nejvýš jednou za tolik sekund (dávka ze samopalu není 20 zločinů). */
const CRIME_THROTTLE = 1;

type UnitMode = 'pursuit' | 'deployed' | 'leave';

interface Unit {
  car: Vehicle;
  /** Policisté v autě. */
  crew: number;
  fullCrew: number;
  swat: boolean;
  mode: UnitMode;
  stuck: number;
  reverseUntil: number;
  nextShot: number;
  search: Point | null;
  /** Naplánovaná trasa po dlaždicích a kam vede. */
  path: Array<[number, number]> | null;
  pathIdx: number;
  pathGoal: Point | null;
  pathAt: number;
}

interface Cop {
  ped: Pedestrian;
  unit: Unit | null;
  /** Hlídka u zátarasu se nevzdaluje od svého místa. */
  post: Point | null;
  smg: boolean;
  nextShot: number;
  burst: number;
  leaving: boolean;
}

interface Roadblock {
  at: Point;
  cars: Vehicle[];
  cops: Cop[];
}

/**
 * Policie: hledanost, spawn hlídek mimo obrazovku, pronásledování autem,
 * policisté pěšky, střelba, zátarasy, zásahovka a zatýkání.
 */
export class Police {
  wanted: Wanted = newWanted();
  /** Vidí hráče právě teď nějaký policista? */
  seen = false;
  private units: Unit[] = [];
  private cops: Cop[] = [];
  private roadblocks: Roadblock[] = [];
  private roadPoints: Array<{ p: Point; angle: number }> = [];
  private spawnTimer = 0;
  private lastCrime = new Map<CrimeKind, number>();
  private arrestTimer = 0;
  private station: Point;
  private lastCar: Vehicle | null = null;
  /** Cena průjezdu dlaždicí pro policejní auta: silnice nejlevnější, u zdí dráž (aby nezadrhávala o rohy). */
  private driveCost: number[][];

  constructor(private game: GameScene) {
    for (const path of trafficPaths(game.world)) {
      for (let i = 0; i < path.length - 1; i += 2) {
        this.roadPoints.push({ p: path[i], angle: Math.atan2(path[i + 1].y - path[i].y, path[i + 1].x - path[i].x) });
      }
    }
    const tiles = game.world.tiles;
    this.driveCost = tiles.map((row, y) =>
      row.map((t, x) => {
        if (isSolid(t)) return Infinity;
        let c = t === Tile.Road || t === Tile.Bridge || t === Tile.Dam ? 1 : t === Tile.Dirt ? 2 : t === Tile.ForestFloor ? 6 : 2.5;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isSolid(tiles[y + dy]?.[x + dx] ?? Tile.Rock)) c += 4;
        return c;
      }),
    );
    const office = game.world.buildings.find((b) => b.name === 'Obecní úřad')!;
    const spot = findFreeTile(game.world, office.x + Math.floor(office.w / 2), office.y + office.h + 1, new Set());
    this.station = { x: spot.tx, y: spot.ty };

    game.events.on('crime', (e: CrimeEvent) => this.onCrime(e));
    game.events.on('knockout', () => this.clear());
  }

  private get now(): number {
    return this.game.time.now / 1000;
  }

  /** Kde hráč je (pěšky nebo v autě). */
  private get focus(): Phaser.GameObjects.Components.Transform & Point {
    return this.game.driving ?? this.game.player;
  }

  // ---------- Zločiny a hledanost ----------

  onCrime(e: CrimeEvent): void {
    if (this.game.player.dead) return;
    const last = this.lastCrime.get(e.kind) ?? -10;
    if (this.now - last < CRIME_THROTTLE) return;
    this.lastCrime.set(e.kind, this.now);
    const before = this.wanted.level;
    this.wanted = addCrime(this.wanted, e.kind, e);
    if (this.wanted.level > before) this.game.toast(T.radio[this.wanted.level]);
  }

  /** Zvedne hledanost aspoň na danou úroveň (zakázky, komplikace). */
  raiseTo(level: number, at: Point): void {
    if (this.wanted.level >= level) return;
    const heat = LEVEL_HEAT[level];
    this.wanted = { heat, level, unseen: -10, lastSeen: { x: at.x, y: at.y } };
    this.game.toast(T.radio[level]);
  }

  /** Hráč přesedl do jiného auta: když ho zrovna nikdo nevidí, policie ztrácí stopu. */
  onEnterVehicle(v: Vehicle): void {
    if (this.lastCar && this.lastCar !== v && this.wanted.level > 0 && !this.seen) {
      this.wanted = swapCar(this.wanted);
      this.game.toast(T.radioSwap);
    }
    this.lastCar = v;
    // Policejní auto, které hráč ukradl, už není policejní jednotka.
    const unit = this.units.find((u) => u.car === v);
    if (unit) this.units = this.units.filter((u) => u !== unit);
    for (const rb of this.roadblocks) rb.cars = rb.cars.filter((c) => c !== v);
  }

  /** Smrt nebo zatčení: hledanost zmizí a policie se stáhne. */
  clear(): void {
    this.wanted = newWanted();
    this.arrestTimer = 0;
    for (const u of this.units) u.mode = 'leave';
    for (const c of this.cops) c.leaving = true;
  }

  update(dt: number): void {
    const before = this.wanted.level;
    const player = this.game.player;
    this.seen = !player.dead && this.wanted.level > 0 && this.canSeePlayer();
    const hide = this.game.tileAt(this.focus.x, this.focus.y) === Tile.ForestFloor ? 2 : 1;
    const r = tickWanted(this.wanted, dt, this.seen ? { x: this.focus.x, y: this.focus.y } : null, hide);
    this.wanted = r.wanted;
    if (r.evaded && before > 0) {
      this.game.toast(T.radioLost);
      this.game.progression.onEvaded(before);
      this.clear();
    }

    this.spawnTimer += dt;
    if (this.spawnTimer > 1) {
      this.spawnTimer = 0;
      this.manageForces();
    }
    for (const c of this.cops) this.updateCop(c, dt);
    this.cops = this.cops.filter((c) => c.ped.active && c.ped.alive);
    for (const rb of this.roadblocks) rb.cops = rb.cops.filter((c) => c.ped.active && c.ped.alive);
    this.checkArrest(dt);

    this.game.registry.set('wanted', { level: this.wanted.level, searching: this.wanted.level > 0 && !this.seen });
  }

  private canSeePlayer(): boolean {
    const f = this.focus;
    const looks = (p: Point) => {
      const d = Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y);
      if (d < CLOSE_SIGHT) return true;
      return d < SIGHT && lineOfSight(this.game.world.tiles, TILE, p, f, blocksBullets);
    };
    return this.units.some((u) => u.crew > 0 && !u.car.wrecked && looks(u.car)) || this.cops.some((c) => c.ped.alive && looks(c.ped));
  }

  // ---------- Nasazení sil ----------

  private manageForces(): void {
    const level = this.wanted.level;
    const resp = responseFor(level);
    // Zničené jednotky a ty, co odjely z dohledu, ukliď.
    for (const u of this.units) {
      if (u.car.wrecked && u.mode !== 'leave') u.mode = 'leave';
      if (u.mode === 'leave' && !this.game.inView(u.car.x, u.car.y) && !u.car.wrecked) this.removeVehicle(u.car);
    }
    this.units = this.units.filter((u) => u.car.active && !u.car.wrecked);

    const active = this.units.filter((u) => u.mode !== 'leave').length;
    if (active < resp.cars) {
      const swatOut = this.units.some((u) => u.swat && u.mode !== 'leave');
      this.spawnUnit(resp.swat && !swatOut);
    }

    // Zátarasy: postavit před hráčem, zrušit staré a vzdálené.
    for (const rb of this.roadblocks) {
      const far = Phaser.Math.Distance.Between(rb.at.x, rb.at.y, this.focus.x, this.focus.y) > 1000;
      if ((far || level < 3) && !this.game.inView(rb.at.x, rb.at.y)) this.removeRoadblock(rb);
    }
    this.roadblocks = this.roadblocks.filter((rb) => rb.cars.length || rb.cops.length);
    if (this.roadblocks.length < resp.roadblocks) this.placeRoadblock();
  }

  /** Bod na silnici mimo obrazovku v dané vzdálenosti od hráče; když je hráč v pohybu, raději před ním. */
  private pickRoadPoint(minD: number, maxD: number, ahead: boolean): { p: Point; angle: number } | null {
    const f = this.focus;
    const vel = this.game.driving ? { x: this.game.driving.drive.vx, y: this.game.driving.drive.vy } : { x: 0, y: 0 };
    let best: { p: Point; angle: number } | null = null;
    let bestScore = Infinity;
    for (const rp of this.roadPoints) {
      const d = Phaser.Math.Distance.Between(rp.p.x, rp.p.y, f.x, f.y);
      if (d < minD || d > maxD || this.game.inView(rp.p.x, rp.p.y)) continue;
      if (this.game.vehicles.some((v) => Phaser.Math.Distance.Between(v.x, v.y, rp.p.x, rp.p.y) < 30)) continue;
      const dot = (rp.p.x - f.x) * vel.x + (rp.p.y - f.y) * vel.y;
      const score = d - (ahead && dot > 0 ? 400 : 0) + this.game.random() * 60;
      if (score < bestScore) {
        bestScore = score;
        best = rp;
      }
    }
    return best;
  }

  private spawnUnit(swat: boolean): void {
    const spot = this.pickRoadPoint(300, 1100, false);
    if (!spot) return;
    const car = this.game.addVehicle(swat ? 'zasahovka' : 'policie', spot.p.x, spot.p.y, spot.angle, 0);
    car.driver = 'police';
    const crew = swat ? 4 : 2;
    this.units.push({ car, crew, fullCrew: crew, swat, mode: 'pursuit', stuck: 0, reverseUntil: 0, nextShot: 0, search: null, path: null, pathIdx: 0, pathGoal: null, pathAt: 0 });
  }

  private placeRoadblock(): void {
    const spot = this.pickRoadPoint(260, 650, true);
    if (!spot) return;
    const across = spot.angle + Math.PI / 2;
    const cars: Vehicle[] = [];
    for (const side of [-1, 1]) {
      const x = spot.p.x + Math.cos(across) * side * 9 + Math.cos(spot.angle) * side * 4;
      const y = spot.p.y + Math.sin(across) * side * 9 + Math.sin(spot.angle) * side * 4;
      const car = this.game.addVehicle('policie', x, y, across, 0);
      car.driver = 'none';
      // Stejně těžká jako osobák: v plné rychlosti jde zátaras prorazit.
      (car.body as Phaser.Physics.Arcade.Body).setMass(2);
      cars.push(car);
    }
    const rb: Roadblock = { at: spot.p, cars, cops: [] };
    // Policisté stojí za auty (z pohledu hráče).
    const away = Math.atan2(spot.p.y - this.focus.y, spot.p.x - this.focus.x);
    for (const side of [-1, 1]) {
      const post = { x: spot.p.x + Math.cos(away) * 22 + Math.cos(across) * side * 12, y: spot.p.y + Math.sin(away) * 22 + Math.sin(across) * side * 12 };
      if (isSolid(this.game.tileAt(post.x, post.y))) continue;
      const cop = this.spawnCop(post.x, post.y, false, null);
      cop.post = post;
      rb.cops.push(cop);
    }
    this.roadblocks.push(rb);
  }

  private removeRoadblock(rb: Roadblock): void {
    for (const c of rb.cars) if (!c.wrecked && c.driver === 'none') this.removeVehicle(c);
    for (const c of rb.cops) if (c.ped.alive) c.ped.destroy();
    rb.cars = [];
    rb.cops = [];
  }

  private removeVehicle(v: Vehicle): void {
    const list = this.game.vehicles;
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    v.destroy();
  }

  private spawnCop(x: number, y: number, swat: boolean, unit: Unit | null): Cop {
    const ped = new Pedestrian(this.game, x, y, 0, false, swat ? 'cop-swat' : 'cop', swat ? SWAT_HP : COP_HP);
    ped.role = 'cop';
    ped.setOrigin(8 / ped.width, 0.5);
    ped.mood = 'fight';
    this.game.cameras.getCamera('minimap')?.ignore(ped);
    this.game.combat.peds.push(ped);
    const cop: Cop = { ped, unit, post: null, smg: swat, nextShot: this.now + 0.8, burst: 0, leaving: false };
    this.cops.push(cop);
    return cop;
  }

  // ---------- Řízení policejních aut ----------

  /** Vstup pro policejní auto (volá GameScene pro auta s řidičem 'police'). */
  driveInput(v: Vehicle, dt: number): DriveInput {
    const u = this.units.find((x) => x.car === v);
    if (!u || u.crew === 0) return { throttle: 0, steer: 0, handbrake: true };
    const now = this.now;
    const resp = responseFor(Math.max(1, this.wanted.level));
    const f = this.focus;
    const player = this.game.player;

    if (now < u.reverseUntil) return { throttle: -1, steer: 0.7, handbrake: false };

    let target: Point;
    let cruise = resp.cruise;
    if (u.mode === 'leave') {
      target = this.farthestRoadPoint(v);
      cruise = 120;
    } else if (this.seen || !this.wanted.lastSeen) {
      target = { x: f.x, y: f.y };
      // Při pronásledování auta míří kousek před něj, aby ho nabral.
      if (this.game.driving && resp.ram) target = { x: f.x + this.game.driving.drive.vx * 0.4, y: f.y + this.game.driving.drive.vy * 0.4 };
      u.search = null;
    } else {
      // Hráč zmizel: dojet na místo, kde byl naposledy, a pak to tam pročesat.
      const last = this.wanted.lastSeen;
      if (!u.search && Phaser.Math.Distance.Between(v.x, v.y, last.x, last.y) < 50) u.search = this.searchPoint(last);
      if (u.search && Phaser.Math.Distance.Between(v.x, v.y, u.search.x, u.search.y) < 40) u.search = this.searchPoint(last);
      target = u.search ?? last;
      cruise *= 0.7;
    }

    const dist = Phaser.Math.Distance.Between(v.x, v.y, f.x, f.y);
    if (u.mode === 'pursuit' && !this.game.driving && !player.dead && this.seen && dist < DEPLOY_RANGE) {
      this.deploy(u);
      return { throttle: -1, steer: 0, handbrake: true };
    }

    // Střelba z okna (od 3. úrovně).
    if (u.mode === 'pursuit' && this.game.driving && resp.shoot === 'always' && dist < 170 && now > u.nextShot && this.seen) {
      u.nextShot = now + (u.swat ? 0.35 : 0.8);
      this.copShoot(v, f, u.swat ? 0.2 : 0.25, u.swat ? 6 : 8, v);
    }

    // Zaseklé auto couvne a naplánuje trasu znovu.
    u.stuck = Math.abs(v.speed) < 10 && dist > 60 ? u.stuck + dt : 0;
    if (u.stuck > 1.8) {
      u.stuck = 0;
      u.reverseUntil = now + 0.9;
      u.path = null;
    }
    // Když hráč stojí autem a nejsou střelecké podmínky, nezajíždět na něj.
    const blocked = !resp.ram && dist < 40;
    const waypoint = this.navigate(u, target);
    // V zatáčkách trasy zpomalit, ať auto nevyletí do plotu.
    const slow = waypoint !== target ? Math.min(cruise, 140) : cruise;
    return steerToward(v, v.drive.angle, v.speed, waypoint, slow, blocked);
  }

  /**
   * Další bod trasy k cíli. Na krátkou vzdálenost s volným výhledem jede přímo
   * (aby mohlo narazit do hráče), jinak po naplánované cestě kolem domů.
   */
  private navigate(u: Unit, target: Point): Point {
    const v = u.car;
    const d = Phaser.Math.Distance.Between(v.x, v.y, target.x, target.y);
    if (d < 60 && lineOfSight(this.game.world.tiles, TILE, v, target, isSolid)) return target;
    const now = this.now;
    const goalMoved = !u.pathGoal || Phaser.Math.Distance.Between(u.pathGoal.x, u.pathGoal.y, target.x, target.y) > 48;
    if (!u.path || goalMoved || now - u.pathAt > 1.5) {
      const from: [number, number] = [Math.floor(v.x / TILE), Math.floor(v.y / TILE)];
      const to: [number, number] = [Math.floor(target.x / TILE), Math.floor(target.y / TILE)];
      u.path = findPath(this.game.world.tiles, from, to, (_t, x, y) => this.driveCost[y][x]);
      u.pathIdx = 0;
      u.pathGoal = { x: target.x, y: target.y };
      u.pathAt = now;
    }
    if (!u.path) return target;
    const center = (i: number) => ({ x: (u.path![i][0] + 0.5) * TILE, y: (u.path![i][1] + 0.5) * TILE });
    while (u.pathIdx < u.path.length - 1 && Phaser.Math.Distance.Between(v.x, v.y, center(u.pathIdx).x, center(u.pathIdx).y) < 22) u.pathIdx++;
    return center(Math.min(u.pathIdx + 1, u.path.length - 1));
  }

  private searchPoint(around: Point): Point {
    for (let i = 0; i < 10; i++) {
      const p = { x: around.x + (this.game.random() - 0.5) * 300, y: around.y + (this.game.random() - 0.5) * 300 };
      if (!isSolid(this.game.tileAt(p.x, p.y))) return p;
    }
    return around;
  }

  private farthestRoadPoint(from: Point): Point {
    let best = this.roadPoints[0].p;
    let bestD = -1;
    for (const rp of this.roadPoints) {
      const d = Phaser.Math.Distance.Between(rp.p.x, rp.p.y, from.x, from.y);
      if (d > bestD) {
        bestD = d;
        best = rp.p;
      }
    }
    return best;
  }

  /** Policisté vyskočí z auta a jdou po hráči pěšky. */
  private deploy(u: Unit): void {
    u.mode = 'deployed';
    const a = u.car.rotation;
    for (let i = 0; i < u.crew; i++) {
      const side = i % 2 ? 1 : -1;
      const off = u.car.spec.width / 2 + 7 + Math.floor(i / 2) * 8;
      const x = u.car.x + Math.cos(a + (side * Math.PI) / 2) * off;
      const y = u.car.y + Math.sin(a + (side * Math.PI) / 2) * off;
      const cop = this.spawnCop(isSolid(this.game.tileAt(x, y)) ? u.car.x : x, isSolid(this.game.tileAt(x, y)) ? u.car.y : y, u.swat, u);
      if (i === 0) this.game.floatText(cop.ped.x, cop.ped.y - 10, pick(T.copShout, this.game.random), '#9fc4ff', 1600);
    }
    u.crew = 0;
  }

  // ---------- Policisté pěšky ----------

  private updateCop(c: Cop, dt: number): void {
    const p = c.ped;
    // Policista mezitím mohl nastoupit do auta nebo odejít (sprite je zničený).
    if (!p.active || !p.alive) return;
    const body = p.body as Phaser.Physics.Arcade.Body;
    const f = this.focus;
    const player = this.game.player;
    const resp = responseFor(this.wanted.level);

    // Konec akce: vrátit se do auta, nebo odejít mimo obrazovku.
    if (c.leaving || this.wanted.level === 0 || player.dead) {
      c.leaving = true;
      if (c.unit && c.unit.car.active && !c.unit.car.wrecked) {
        if (this.walkTo(p, c.unit.car, COP_SPEED * 0.7) < 18) this.reboard(c);
      } else {
        this.walkTo(p, { x: p.x + (p.x - f.x), y: p.y + (p.y - f.y) }, COP_SPEED * 0.6);
        if (!this.game.inView(p.x, p.y)) p.destroy();
      }
      return;
    }

    // Člen skupiny, který napadl policii, má přednost.
    const thug = this.nearestThug(p);
    if (thug) {
      body.setVelocity(0, 0);
      p.setRotation(Phaser.Math.Angle.Between(p.x, p.y, thug.x, thug.y));
      if (this.now > c.nextShot) {
        c.nextShot = this.now + (c.smg ? 0.15 : 0.8);
        this.copShoot(p, thug, c.smg ? 0.28 : 0.2, c.smg ? 5 : 7);
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y);
    const visible = dist < SIGHT && lineOfSight(this.game.world.tiles, TILE, p, f, blocksBullets);
    const holdsGun = this.game.player.arsenal.current !== 'fists' && this.game.player.arsenal.current !== 'bat';
    const mayShoot = resp.shoot === 'always' || (resp.shoot === 'armed' && (holdsGun || !!this.game.driving));
    const range = c.smg ? 170 : 190;

    // Hráč ujíždí autem: posádka se vrací do svého auta.
    if (this.game.driving && c.unit && c.unit.car.active && !c.unit.car.wrecked && dist > 140) {
      if (this.walkTo(p, c.unit.car, COP_SPEED) < 18) this.reboard(c);
      return;
    }

    if (visible && mayShoot && dist < range) {
      body.setVelocity(0, 0);
      p.setRotation(Phaser.Math.Angle.Between(p.x, p.y, f.x, f.y));
      this.copFire(c);
      return;
    }

    if (c.post) {
      // Hlídka u zátarasu: drží pozici.
      if (Phaser.Math.Distance.Between(p.x, p.y, c.post.x, c.post.y) > 6) this.walkTo(p, c.post, COP_SPEED * 0.6);
      else body.setVelocity(0, 0);
      return;
    }

    const target = visible || !this.wanted.lastSeen ? f : this.wanted.lastSeen;
    if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) > (resp.arrest ? 10 : 30)) this.walkTo(p, target, c.smg ? COP_SPEED * 1.1 : COP_SPEED);
    else body.setVelocity(0, 0);
    void dt;
  }

  private nearestThug(cop: Pedestrian): Pedestrian | null {
    let best: Pedestrian | null = null;
    let bestD = 180;
    for (const m of this.game.combat.peds) {
      if (!m.alive || !m.active || m.role !== 'gang' || !m.attacksPolice) continue;
      const d = Phaser.Math.Distance.Between(cop.x, cop.y, m.x, m.y);
      if (d < bestD && lineOfSight(this.game.world.tiles, TILE, cop, m, blocksBullets)) {
        best = m;
        bestD = d;
      }
    }
    return best;
  }

  private walkTo(p: Pedestrian, to: Point, speed: number): number {
    this.game.walkTo(p, to, speed);
    return Phaser.Math.Distance.Between(p.x, p.y, to.x, to.y);
  }

  private reboard(c: Cop): void {
    const u = c.unit!;
    u.crew++;
    c.ped.destroy();
    if (u.crew >= u.fullCrew || !this.cops.some((o) => o !== c && o.unit === u && o.ped.alive)) u.mode = c.leaving ? 'leave' : 'pursuit';
  }

  private copFire(c: Cop): void {
    const now = this.now;
    if (now < c.nextShot) return;
    if (c.smg) {
      c.burst++;
      c.nextShot = now + (c.burst % 4 === 0 ? 1.1 : 0.12);
    } else {
      c.nextShot = now + 0.9 + this.game.random() * 0.3;
    }
    this.copShoot(c.ped, this.focus, c.smg ? 0.28 : 0.2, c.smg ? 5 : 7);
  }

  /** Výstřel policisty: zasáhne hráče, jeho auto, nebo chodce, který se připlete. */
  private copShoot(from: Point, at: Point, spread: number, damage: number, own?: Vehicle): void {
    const base = Math.atan2(at.y - from.y, at.x - from.x);
    const angle = base + (this.game.random() - 0.5) * spread * 2;
    const range = 240;
    const start = { x: from.x + Math.cos(angle) * 9, y: from.y + Math.sin(angle) * 9 };
    let wall = range;
    for (let d = 0; d < range; d += 4) {
      if (blocksBullets(this.game.tileAt(start.x + Math.cos(angle) * d, start.y + Math.sin(angle) * d))) {
        wall = d;
        break;
      }
    }
    let best = wall;
    let hit: (() => void) | null = null;
    const driving = this.game.driving;
    const player = this.game.player;
    if (driving) {
      const d = rayCircleHit(start, angle, best, driving, driving.spec.width / 2 + 2);
      if (d !== null) {
        best = d;
        hit = () => {
          driving.damage(damage * 0.7);
          // Část kulek projde plechem.
          if (this.game.random() < 0.25) this.game.combat.damagePlayer(damage * 0.5);
        };
      }
    } else if (!player.dead) {
      const d = rayCircleHit(start, angle, best, player, 6);
      if (d !== null) {
        best = d;
        hit = () => this.game.combat.damagePlayer(damage);
      }
    }
    for (const p of this.game.combat.peds) {
      if (!p.alive || p.role === 'cop') continue;
      const d = rayCircleHit(start, angle, best, p, 6);
      if (d !== null && d < best) {
        best = d;
        hit = () => this.game.combat.hurtPed(p, damage * 2, from, false);
      }
    }
    for (const v of this.game.vehicles) {
      if (v === own || v === driving || v.wrecked) continue;
      const d = rayCircleHit(start, angle, best, v, v.spec.width / 2 + 2);
      if (d !== null && d < best) {
        best = d;
        hit = () => v.damage(damage * 0.4);
      }
    }
    const end = { x: start.x + Math.cos(angle) * best, y: start.y + Math.sin(angle) * best };
    const tracer = this.game.add.line(0, 0, start.x, start.y, end.x, end.y, 0x9fc4ff, 0.8).setOrigin(0).setLineWidth(1).setDepth(14);
    this.game.cameras.getCamera('minimap')?.ignore(tracer);
    this.game.tweens.add({ targets: tracer, alpha: 0, duration: 90, onComplete: () => tracer.destroy() });
    hit?.();
    void angleDiff;
  }

  // ---------- Zatčení ----------

  private checkArrest(dt: number): void {
    const player = this.game.player;
    const resp = responseFor(this.wanted.level);
    if (!resp.arrest || player.dead) {
      this.arrestTimer = 0;
      return;
    }
    const f = this.focus;
    const driving = this.game.driving;
    // Pěšky stačí, když tě policista chytí; v autě jen když stojíš.
    const reach = driving ? (Math.abs(driving.speed) < 8 ? ARREST_RANGE + 8 : -1) : ARREST_RANGE;
    const caught = this.cops.some((c) => c.ped.active && c.ped.alive && !c.leaving && Phaser.Math.Distance.Between(c.ped.x, c.ped.y, f.x, f.y) < reach);
    this.arrestTimer = caught ? this.arrestTimer + dt : Math.max(0, this.arrestTimer - dt);
    if (this.arrestTimer >= ARREST_TIME) {
      this.arrestTimer = 0;
      this.game.combat.arrest(arrestFine(player.money), this.station);
    }
  }
}

function pick<T>(items: readonly T[], rnd: () => number): T {
  return items[Math.floor(rnd() * items.length)];
}
