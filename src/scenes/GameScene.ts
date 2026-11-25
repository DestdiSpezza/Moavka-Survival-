import Phaser from 'phaser';
import { TILE, WORLD_ZOOM } from '../config';
import { Player } from '../entities/Player';
import type { Pedestrian } from '../entities/Pedestrian';
import { Sound } from '../audio/Sound';
import { paintGround } from '../art/ground';
import { paintWater } from '../art/water';
import { Vehicle } from '../entities/Vehicle';
import { WEAPONS } from '../systems/combat';
import { explosionDamageAt, EXPLOSION_RADIUS } from '../systems/damage';
import { findPath } from '../systems/pathfind';
import { createRng } from '../systems/rng';
import { lineOfSight } from '../systems/sight';
import { isAhead, type Point, steerToward } from '../systems/trafficAi';
import { type DriveInput, lateralSpeed, surfaceFor, toKmh } from '../systems/vehicleModel';
import { T } from '../texts/cs';
import { type AreaDef, type AreaId, AREAS, placeLabel } from '../world/areas';
import { type WorldMap, zoneAt } from '../world/moravka';
import { buildWorld } from '../world/world';
import { newProgress, type Progress, respectIn, writeSave } from '../systems/save';
import { isSolid, speedFactor, TILE_COUNT } from '../world/tiles';
import { CAR_PAINT as CAR_COLORS } from '../art/sprites';
import { type ParkedVehicle, parkedVehicles, trafficPaths, type VehicleKind } from '../world/vehicles';
import { pixelFont } from './BootScene';
import { Combat } from './Combat';
import { Gangs } from './Gangs';
import { Economy } from './Economy';
import { Missions } from './Missions';
import { Progression } from './Progression';
import { Tutorial } from './Tutorial';
import { Animals } from './Animals';
import { Announcer } from './Announcer';
import { Incidents } from './Incidents';
import { Witnesses } from './Witnesses';
import { EventLog, SYSTEM_NAMES, type SystemTag, validCause } from '../systems/eventLog';
import { CRASH_SPEED, type Driver, drunkDriver, HARD_BRAKE, reactToObstacle, rollDriver } from '../systems/drivers';
import { isEvening } from '../systems/clock';
import type { Appearance } from '../systems/witness';
import { Police } from './Police';

export const MINIMAP = { x: 16, y: 16, w: 200, h: 150, zoom: 0.1 };
const ENTER_RANGE = 26;
const TRAFFIC_COUNT = 7;
/** Po kolika sekundách odtáhnout vrak (jen když ho hráč nevidí). */
const WRECK_TOW_AFTER = 90;
/** Rychlost, kterou se auto protahuje kolem překážky (pod hranicí nárazu). */
const CREEP_SPEED = 32;
const CRUISE = 90;

interface Traffic {
  path: Point[];
  /** Auto zakázky (konvoj): na konci trasy zastaví a nezmizí. */
  noRespawn?: boolean;
  arrived?: boolean;
  idx: number;
  cruise: number;
  waited: number;
  ignoreUntil: number;
  honkedAt: number;
  /** Jak dlouho auto stojí, i když by jet mělo (zaseklé o roh). */
  stuck: number;
  reverseUntil: number;
  /** Řidič: typ, rychlost, reakční doba. */
  driver: Driver;
  /** Odkdy řidič vidí překážku před sebou (reakční doba). */
  seenSince: number;
  /** Stojí (hádka, nehoda, zatýkání) do tohoto času. */
  hold: number;
  /** Ujíždí (od nehody, před policií). */
  flee: boolean;
  prevSpeed: number;
  lastBrakeLog: number;
  /** Co má řidič před sebou (pro řetězení příčin: divočák → brzda). */
  obstacle: { lastEventId: number | null; lastEventAt: number } | null;
  /** Opilce už policie viděla. */
  drunkSeen?: boolean;
  /** Auto, kvůli kterému teď stojí (k rozpoznání zácpy, kde čeká každý na každého). */
  blocker: Vehicle | null;
  /** Jak dlouho auto stojí v koloně (dlouhá zácpa mimo dohled se rozpustí). */
  jam: number;
  /** Na konci trasy mizí z dohledu. */
  leaving?: boolean;
}

export interface PlayerHud {
  health: number;
  armor: number;
  money: number;
  weapon: string;
  score: number;
  /** null = zbraň bez munice (pěsti, pálka). */
  ammo: number | null;
}

export interface VehicleHud {
  name: string;
  kmh: number;
  hp: number;
  state: string;
}

type DriveKeys = Record<'up' | 'down' | 'left' | 'right' | 'handbrake' | 'enter' | 'radio' | 'pause', Phaser.Input.Keyboard.Key>;

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
  missions!: Missions;
  economy!: Economy;
  progression!: Progression;
  tutorial!: Tutorial;
  witnesses!: Witnesses;
  incidents!: Incidents;
  animals!: Animals;
  announcer!: Announcer;
  /** Deník událostí světa (řetězce příčin, ladicí překryv F9, automatické testy). */
  eventLog = new EventLog();
  private debugKey!: Phaser.Input.Keyboard.Key;
  private debugTimer = 0;
  private trafficRefill = 0;
  /** Auta k odtažení (vraky, zabavená a opuštěná auta) a kdy nejdřív. */
  private towQueue = new Map<Vehicle, number>();
  /** Parkovací místa ze startu a auto, které na nich teď stojí. */
  private parkedSpots: Array<{ spot: ParkedVehicle; car: Vehicle }> = [];
  private night!: Phaser.GameObjects.Rectangle;
  private water!: Phaser.GameObjects.TileSprite;
  private decals!: Phaser.GameObjects.RenderTexture;
  private nightLights!: Phaser.GameObjects.Image;
  private chimneySmoke: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private skidTick = 0;
  private headlights = new Map<Vehicle, Phaser.GameObjects.Image>();
  /** Postup celé hry (sdílený mezi oblastmi, ukládá se). */
  progress!: Progress;
  area!: AreaDef;
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
    // Při přechodu do jiné oblasti se scéna spouští znovu: staré posluchače pryč.
    for (const ev of ['crime', 'knockout', 'pedHurt', 'toast', 'banner']) this.events.removeAllListeners(ev);
    this.vehicles = [];
    this.eventLog = new EventLog();
    this.trafficRefill = 0;
    this.towQueue = new Map();
    this.chimneySmoke = null;
    this.traffic.clear();
    this.driving = null;
    this.progress = (this.registry.get('progress') as Progress | undefined) ?? newProgress();
    this.registry.set('progress', this.progress);
    this.area = AREAS[this.progress.area];
    this.world = buildWorld(this.area.id);
    const map = this.make.tilemap({ data: this.world.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, tileset, 0, 0)!;
    this.layer.setCollision(Array.from({ length: TILE_COUNT }, (_, i) => i).filter(isSolid));
    // Vrstva dlaždic slouží jen pro kolize; vidět je malba mapy a pod ní plynoucí voda.
    this.layer.setVisible(false);

    const wPx = this.world.width * TILE;
    const hPx = this.world.height * TILE;
    this.physics.world.setBounds(0, 0, wPx, hPx);
    if (!this.textures.exists('water')) this.textures.addCanvas('water', paintWater());
    this.water = this.add.tileSprite(0, 0, wPx, hPx, 'water').setOrigin(0).setDepth(0);
    const groundKey = `ground-${this.area.id}`;
    const lightsKey = `lights-${this.area.id}`;
    let chimneys = this.registry.get(`chimneys-${this.area.id}`) as Array<{ x: number; y: number }> | undefined;
    if (!this.textures.exists(groundKey) || !chimneys) {
      const art = paintGround(this.world, this.area.seed);
      if (this.textures.exists(groundKey)) this.textures.remove(groundKey);
      if (this.textures.exists(lightsKey)) this.textures.remove(lightsKey);
      this.textures.addCanvas(groundKey, art.ground);
      this.textures.addCanvas(lightsKey, art.lights);
      chimneys = art.chimneys;
      this.registry.set(`chimneys-${this.area.id}`, chimneys);
    }
    this.add.image(0, 0, groundKey).setOrigin(0).setDepth(0.5);
    // Noční světla (lampy, okna) svítí přes tmu; ve dne jsou neviditelná.
    this.nightLights = this.add.image(0, 0, lightsKey).setOrigin(0).setDepth(41).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    // Kouř z komínů: jeden emitor, obláček pokaždé z náhodného komína.
    if (chimneys.length) {
      const pts = chimneys;
      const smoke = this.add.particles(0, 0, 'puff', {
        lifespan: 2600, speedX: { min: 4, max: 10 }, speedY: { min: -8, max: -3 }, scale: { start: 0.4, end: 1.6 },
        alpha: { start: 0.35, end: 0 }, tint: 0xc8c8c8, frequency: 70,
        emitZone: { type: 'random', source: { getRandomPoint: (pt: Phaser.Types.Math.Vector2Like) => Object.assign(pt, pts[Math.floor(Math.random() * pts.length)]) } as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      }).setDepth(13);
      this.chimneySmoke = smoke;
    }
    // Trvalé stopy na zemi: smyky, krev, ohořelá místa (jako v GTA 2 zůstávají).
    this.decals = this.add.renderTexture(0, 0, wPx, hPx).setOrigin(0).setDepth(0.6);

    const labels = this.world.buildings
      .filter((b) => b.name !== 'Dům')
      .map((b) =>
        this.add
          .text((b.x + b.w / 2) * TILE, (b.y + b.h / 2) * TILE, placeLabel(this.area.id, b.name).toUpperCase(), pixelFont(14, '#fff4d6'))
          .setOrigin(0.5)
          .setScale(1 / WORLD_ZOOM)
          .setStroke('#2a1d12', 4)
          .setAlpha(0.8)
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
      // Síla nárazu: rozdíl rychlostí před srážkou.
      const la = va.lastVelocity;
      const lb = vb.lastVelocity;
      const impact = Math.hypot(la.x - lb.x, la.y - lb.y);
      if (impact < CRASH_SPEED) return;
      if (va.driver === 'npc' && vb.driver === 'npc') this.incidents.onCrash(va, vb, impact);
      else if (other && other.driver === 'npc') this.incidents.onPlayerCrash(other, impact);
    });
    this.physics.add.collider(this.player, this.vehicles);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', handbrake: 'SPACE', enter: 'E', radio: 'R', pause: 'ESC' }) as DriveKeys;
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
    if (this.chimneySmoke) mini.ignore(this.chimneySmoke);
    const dot = this.add.circle(0, 0, 40, 0xffd23f).setDepth(20);
    cam.ignore(dot);
    const follow = () => {
      const target = this.driving ?? this.player;
      dot.setPosition(target.x, target.y);
    };
    this.events.on('postupdate', follow);
    this.events.once('shutdown', () => this.events.off('postupdate', follow));

    this.combat = new Combat(this);
    this.police = new Police(this);
    this.gangs = new Gangs(this);
    this.missions = new Missions(this);
    this.economy = new Economy(this);
    this.progression = new Progression(this);
    this.tutorial = new Tutorial(this);
    this.announcer = new Announcer(this);
    this.witnesses = new Witnesses(this);
    this.incidents = new Incidents(this);
    this.animals = new Animals(this);
    this.debugKey = this.input.keyboard!.addKey('F9');
    this.applyProgress();
    this.input.setDefaultCursor('none');
    this.night = this.add.rectangle(0, 0, 10, 10, 0x0a1030, 1).setOrigin(0).setDepth(40).setAlpha(0);
    this.cameras.getCamera('minimap')?.ignore(this.night);
    this.headlights = new Map();
    this.scene.launch('UI');
  }

  /** Ladicí překryv (F9): poslední řetězce událostí a počet řetězců bez hráče. */
  private updateDebugOverlay(dt: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) this.registry.set('debugEvents', !this.registry.get('debugEvents'));
    this.debugTimer += dt;
    if (!this.registry.get('debugEvents') || this.debugTimer < 1) return;
    this.debugTimer = 0;
    const lines = this.eventLog
      .leaves()
      .slice(-40)
      .map((e) => this.eventLog.chain(e.id))
      .filter((c) => c.length >= 2)
      .slice(-7)
      .map((c) => {
        const systems = [...new Set(c.flatMap((e) => e.systems))].map((s) => SYSTEM_NAMES[s]).join(', ');
        return `${c.map((e) => e.text).join(' → ')}  [${systems}]`;
      });
    this.registry.set('eventChains', {
      lines,
      chains3: this.eventLog.countChains(3, true),
      total: this.eventLog.all.length,
    });
  }

  /** Otisk na zem (krev, smyk, spálenina). */
  stampDecal(key: string, x: number, y: number, angle = 0, alpha = 1): void {
    this.decals.stamp(key, undefined, x, y, { angle, alpha, originX: 0.5, originY: 0.5 });
  }

  /** Smyky: auta ve smyku nebo při prudkém brzdění nechávají černé stopy zadních kol. */
  private paintSkids(): void {
    this.skidTick++;
    if (this.skidTick % 2) return;
    for (const v of this.vehicles) {
      if (v.wrecked || v.driver === 'none' || v.spec.kind === 'kolo') continue;
      const lat = Math.abs(lateralSpeed(v.drive));
      const braking = v === this.driving && this.keys.handbrake.isDown && Math.abs(v.speed) > 40;
      if (lat < 40 && !braking) continue;
      const a = v.rotation;
      const back = -v.spec.length / 2 + 4;
      const side = v.spec.width / 2 - 2;
      for (const s of [-1, 1]) {
        const x = v.x + Math.cos(a) * back - Math.sin(a) * side * s;
        const y = v.y + Math.sin(a) * back + Math.cos(a) * side * s;
        this.stampDecal('skid', x, y, 0, Math.min(0.6, 0.2 + lat / 300));
      }
    }
  }

  /** Noc: tmavý závoj přes svět; auta s řidičem svítí reflektory nad ním. */
  private updateNight(): void {
    const dark = (this.registry.get('gangs') as { darkness: number } | undefined)?.darkness ?? 0;
    const view = this.cameras.main.worldView;
    this.night.setPosition(view.x - 20, view.y - 20).setSize(view.width + 40, view.height + 40).setAlpha(dark);
    this.nightLights.setAlpha(Math.min(1, dark * 2.2));
    for (const [v, img] of this.headlights) {
      if (!v.active || v.wrecked || v.driver === 'none' || dark < 0.08) {
        img.destroy();
        this.headlights.delete(v);
      }
    }
    if (dark < 0.08) return;
    for (const v of this.vehicles) {
      if (v.wrecked || v.driver === 'none' || v.spec.kind === 'kolo') continue;
      let img = this.headlights.get(v);
      if (!img) {
        img = this.add.image(0, 0, 'headlight').setOrigin(0, 0.5).setDepth(41).setBlendMode(Phaser.BlendModes.ADD);
        this.cameras.getCamera('minimap')?.ignore(img);
        this.headlights.set(v, img);
      }
      const a = v.rotation;
      img.setPosition(v.x + Math.cos(a) * (v.spec.length / 2), v.y + Math.sin(a) * (v.spec.length / 2)).setRotation(a).setAlpha(Math.min(1, dark * 2));
    }
  }

  /** Nastaví hráče, skupiny a zakázky podle uloženého postupu; příjezd z jiné oblasti. */
  private applyProgress(): void {
    const p = this.progress;
    const pl = this.player;
    pl.money = p.money;
    pl.score = p.score;
    pl.health = p.health;
    pl.armor = p.armor;
    pl.arsenal = { ...p.arsenal, ammo: { ...p.arsenal.ammo }, owned: [...p.arsenal.owned] };
    pl.updateLook();
    this.gangs.respect = { ...respectIn(p, this.area.id) };
    this.gangs.elapsed = p.clock;
    this.missions.done = new Set(p.missionsDone[this.area.id] ?? []);

    const arrival = this.registry.get('arrival') as { from: AreaId; vehicle: { kind: VehicleKind; hp: number } | null } | null;
    this.registry.set('arrival', null);
    const at = arrival ? this.progression.arrivalFrom(arrival.from) : null;
    if (at) {
      (pl.body as Phaser.Physics.Arcade.Body).reset(at.x, at.y);
      if (arrival?.vehicle) {
        const v = this.addVehicle(arrival.vehicle.kind, at.x, at.y, -Math.PI / 2, 0);
        v.hp = arrival.vehicle.hp;
        v.stolen = true;
        this.enterVehicle(v);
      }
    }
    this.time.delayedCall(300, () => this.events.emit('banner', this.area.name.toUpperCase()));
  }

  get areaScore(): number {
    return this.progress.areaScore[this.area.id] ?? 0;
  }

  /** Připíše skóre (celkové i za oblast) a ukáže ho nad hráčem. */
  addScore(points: number, reason: string | null): void {
    if (points <= 0) return;
    this.player.score += points;
    this.progress.areaScore[this.area.id] = this.areaScore + points;
    if (reason) {
      const f = this.driving ?? this.player;
      this.floatText(f.x, f.y - 22, `${reason} +${points}`, '#ffd23f', 1500);
    }
  }

  /** Hlasitost zvuku podle vzdálenosti od středu kamery (0–1). */
  audioVol(at: Point): number {
    const c = this.cameras.main.midPoint;
    return Math.max(0, 1 - Phaser.Math.Distance.Between(c.x, c.y, at.x, at.y) / 500);
  }

  /** Motor, siréna blízkých policejních aut a přepínání rádia. */
  private updateAudio(): void {
    const v = this.driving;
    Sound.setEngine(v ? v.speed : null, !!v && (v.spec.kind === 'traktor' || v.spec.kind === 'dodavka' || v.spec.kind === 'zasahovka'));
    if (v && Phaser.Input.Keyboard.JustDown(this.keys.radio)) this.toast(Sound.radioNextStation());
    let siren = 0;
    if (this.police.wanted.level > 0) {
      for (const o of this.vehicles) if (o.driver === 'police' && !o.wrecked) siren = Math.max(siren, this.audioVol(o));
    }
    Sound.setSiren(siren);
  }

  /** Pauza: zastaví hru a ukáže menu. */
  openPause(): void {
    Sound.silence();
    this.scene.pause();
    this.scene.pause('UI');
    this.scene.launch('Pause');
  }

  /** Návrat z pauzy. */
  resumeFromPause(): void {
    // Esc, kterým se pauza zavřela, nesmí hned otevřít další.
    this.keys.pause.reset();
    this.scene.resume('UI');
    this.scene.resume();
    if (this.driving) Sound.radioStart();
  }

  /** Zapíše stav hry do postupu (před uložením nebo přechodem). */
  private syncProgress(): void {
    const p = this.progress;
    const pl = this.player;
    p.area = this.area.id;
    p.money = pl.money;
    p.score = pl.score;
    p.health = Math.max(1, pl.health);
    p.armor = pl.armor;
    p.arsenal = { ...pl.arsenal, ammo: { ...pl.arsenal.ammo }, owned: [...pl.arsenal.owned] };
    p.respect[this.area.id] = { ...this.gangs.respect };
    p.missionsDone[this.area.id] = [...this.missions.done];
    p.clock = this.gangs.elapsed;
  }

  saveGame(announce: boolean): void {
    this.syncProgress();
    const ok = writeSave(this.progress);
    if (announce) this.toast(ok ? 'Hra uložena.' : 'Uložit nešlo: prohlížeč nepovoluje úložiště.');
  }

  /** Odjezd do jiné oblasti: uložit a spustit scénu znovu s novou mapou. */
  travel(to: AreaId): void {
    const v = this.driving;
    this.registry.set('arrival', { from: this.area.id, vehicle: v ? { kind: v.spec.kind, hp: v.hp } : null });
    this.syncProgress();
    this.progress.area = to;
    writeSave(this.progress);
    Sound.silence();
    this.scene.stop('UI');
    this.scene.restart();
  }

  removeVehicle(v: Vehicle): void {
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
    this.traffic.delete(v);
    v.destroy();
  }

  private spawnVehicles(): void {
    this.parkedSpots = parkedVehicles(this.world).map((spot) => ({ spot, car: this.parkCar(spot) }));
    this.paths = trafficPaths(this.world);
    const kinds: VehicleKind[] = ['osobak', 'osobak', 'dodavka', 'osobak', 'traktor', 'osobak', 'osobak'];
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const path = this.paths[i % this.paths.length];
      const idx = (4 + i * 7) % (path.length - 2);
      const from = path[idx];
      const to = path[idx + 1];
      const v = this.addVehicle(kinds[i], from.x, from.y, Math.atan2(to.y - from.y, to.x - from.x), i % CAR_COLORS.length);
      v.driver = 'npc';
      this.traffic.set(v, this.newTraffic(v, path, idx + 1, rollDriver(this.random, false), false));
    }
  }

  /** Auto v provozu na zadané trase (zakázky: konvoj). */
  addTrafficVehicle(kind: VehicleKind, pathIndex: number, idx: number, noRespawn: boolean): Vehicle {
    const path = this.paths[pathIndex];
    const from = path[idx];
    const to = path[idx + 1];
    const v = this.addVehicle(kind, from.x, from.y, Math.atan2(to.y - from.y, to.x - from.x), 0);
    v.driver = 'npc';
    this.traffic.set(v, { ...this.newTraffic(v, path, idx + 1, rollDriver(this.random, false), false), noRespawn, driver: { trait: 'normal', cruise: CRUISE, reaction: 0.15, swerve: 0 } });
    return v;
  }

  private newTraffic(v: Vehicle, path: Point[], idx: number, driver: Driver, noRespawn: boolean): Traffic {
    return {
      path, idx, cruise: Math.min(driver.cruise, v.spec.params.maxSpeed * 0.85), waited: 0, ignoreUntil: 0, honkedAt: -10, stuck: 0, reverseUntil: 0,
      noRespawn, driver, seenSince: 0, hold: 0, flee: false, prevSpeed: 0, lastBrakeLog: -100, obstacle: null, blocker: null, jam: 0,
    };
  }

  // ---------- Události a řetězení příčin ----------

  /** Platná příčina z posledního záznamu entity (auto, postava, hráč). */
  causeOf(e: { lastEventId: number | null; lastEventAt: number } | null | undefined): number | null {
    if (!e) return null;
    return validCause(e.lastEventId, e.lastEventAt, this.time.now / 1000);
  }

  /**
   * Zapíše událost do deníku. Příčinou je první platná z `causes`;
   * entity v `attach` si událost zapamatují jako svou poslední.
   */
  logEvent(kind: string, text: string, at: Point, systems: SystemTag[], causes: Array<number | null | undefined> = [], attach: Array<{ lastEventId: number | null; lastEventAt: number }> = []): number {
    const now = this.time.now / 1000;
    const cause = causes.find((c): c is number => typeof c === 'number') ?? null;
    const id = this.eventLog.add({ t: now, kind, text, x: at.x, y: at.y, systems, cause });
    for (const e of attach) {
      e.lastEventId = id;
      e.lastEventAt = now;
    }
    return id;
  }

  /** Jak hráč právě vypadá (pro svědky a policii). */
  playerAppearance(): Appearance {
    const v = this.driving;
    return { vehicle: v ? { kind: v.spec.kind, color: v.paint } : null };
  }

  isSolidAt(x: number, y: number): boolean {
    return isSolid(this.tileAt(x, y));
  }

  // ---------- Provoz: rozhraní pro nehody a policii ----------

  /** Auto v provozu zastaví (hádka, nehoda) na daný počet sekund. */
  holdTraffic(v: Vehicle, seconds: number): void {
    const t = this.traffic.get(v);
    if (t) t.hold = this.elapsed + seconds;
  }

  /** Auto pokračuje (flee = ujíždí; empty = řidič nevrátil, auto zůstane stát prázdné). */
  releaseTraffic(v: Vehicle, flee: boolean, empty = false): void {
    if (empty) {
      this.removeFromTraffic(v);
      v.driver = 'none';
      this.scheduleTow(v, 60);
      return;
    }
    const t = this.traffic.get(v);
    if (!t) return;
    t.hold = 0;
    t.flee = flee;
    if (flee) t.cruise = Math.min(165, v.spec.params.maxSpeed * 0.9);
  }

  isFleeing(v: Vehicle): boolean {
    return !!this.traffic.get(v)?.flee;
  }

  removeFromTraffic(v: Vehicle): void {
    this.traffic.delete(v);
  }

  /** Opilci v provozu, které policie ještě neviděla. */
  drunkDrivers(): Vehicle[] {
    return [...this.traffic.entries()].filter(([v, t]) => t.driver.trait === 'drunk' && !t.drunkSeen && !v.wrecked).map(([v]) => v);
  }

  markDrunkSeen(v: Vehicle): void {
    const t = this.traffic.get(v);
    if (t) t.drunkSeen = true;
  }

  /** Opilý řidič vyrazí (mimo dohled hráče) od začátku některé trasy. */
  addDrunkDriver(): Vehicle | null {
    if (this.traffic.size >= TRAFFIC_COUNT + 2) return null;
    return this.spawnTrafficCar('osobak', 4, drunkDriver(this.random));
  }

  /** Nové auto v provozu na začátku některé trasy mimo dohled hráče. */
  private spawnTrafficCar(kind: VehicleKind, variant: number, driver: Driver): Vehicle | null {
    const free = this.paths.filter((path) => !this.inView(path[0].x, path[0].y) && this.vehicles.every((o) => Phaser.Math.Distance.Between(o.x, o.y, path[0].x, path[0].y) > 40));
    if (!free.length) return null;
    const path = free[Math.floor(this.random() * free.length)];
    const v = this.addVehicle(kind, path[0].x, path[0].y, Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x), variant);
    v.driver = 'npc';
    this.traffic.set(v, this.newTraffic(v, path, 1, driver, false));
    return v;
  }

  private parkCar(p: ParkedVehicle): Vehicle {
    const v = this.addVehicle(p.kind, p.x, p.y, p.angle, Math.floor(this.random() * CAR_COLORS.length));
    v.owner = p.owner;
    return v;
  }

  /** Prázdné parkovací místo (auto odtáhli nebo ho někdo ukradl) mimo dohled zase zaplní nové auto. */
  private refillParking(): void {
    for (const slot of this.parkedSpots) {
      const { spot, car } = slot;
      if (car.active && !car.wrecked && Phaser.Math.Distance.Between(car.x, car.y, spot.x, spot.y) < 40) continue;
      if (this.inView(spot.x, spot.y) || this.vehicles.some((o) => Phaser.Math.Distance.Between(o.x, o.y, spot.x, spot.y) < 24)) continue;
      slot.car = this.parkCar(spot);
      return;
    }
  }

  /** Doplnění provozu: auta zadržená policií, ukradená nebo ve vraku nahradí nová. */
  private refillTraffic(): void {
    const regular = [...this.traffic.entries()].filter(([, t]) => !t.noRespawn);
    if (regular.length > TRAFFIC_COUNT) {
      // Opilci a náhradní auta navíc: jedno klidné mimo dohled zmizí.
      const spare = regular.find(([v, t]) => !this.inView(v.x, v.y) && !t.flee && this.elapsed > t.hold && !this.incidents.involves(v) && !this.police.isSuspect(v));
      if (spare) this.removeVehicle(spare[0]);
      return;
    }
    if (regular.length === TRAFFIC_COUNT) return;
    const kinds: VehicleKind[] = ['osobak', 'osobak', 'osobak', 'dodavka', 'traktor'];
    const kind = kinds[Math.floor(this.random() * kinds.length)];
    this.spawnTrafficCar(kind, Math.floor(this.random() * CAR_COLORS.length), rollDriver(this.random, isEvening(this.gangs.minute)));
  }

  /** Překážka v pruhu před autem (vozidla, chodci, hráč) – pro hlídky na obchůzce. */
  obstacleAhead(v: Vehicle, range = 34): boolean {
    for (const o of this.vehicles) if (o !== v && isAhead(v, v.drive.angle, o, range, 9)) return true;
    if (!this.driving && !this.player.dead && isAhead(v, v.drive.angle, this.player, range, 9)) return true;
    for (const p of this.combat.peds) if (p.alive && Math.abs(p.x - v.x) < 40 && Math.abs(p.y - v.y) < 40 && isAhead(v, v.drive.angle, p, range, 9)) return true;
    return false;
  }

  /** Dojelo auto zakázky na konec trasy? */
  trafficArrived(v: Vehicle): boolean {
    return !!this.traffic.get(v)?.arrived;
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
    this.trafficRefill += dt;
    if (this.trafficRefill > 6) {
      this.trafficRefill = 0;
      this.refillTraffic();
      this.towVehicles();
      this.refillParking();
    }

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
      if (v.driver === 'npc') this.detectHardBraking(v, dt);
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
    // Mimo pojmenovaná místa se ukazuje jméno oblasti.
    const zone = zoneAt(this.world, tx, ty);
    this.registry.set('zone', zone === 'Morávka' ? this.area.name : placeLabel(this.area.id, zone));
    this.registry.set('tile', this.driving ? -1 : this.world.tiles[ty]?.[tx]);
    this.registry.set('vehicle', this.driving ? this.vehicleHud(this.driving) : null);
    this.registry.set('prompt', this.driving || this.player.dead ? '' : this.enterPrompt());
    this.combat.update(dt);
    this.police.update(dt);
    this.gangs.update(dt);
    this.missions.update(dt);
    this.economy.update();
    this.progression.update(dt);
    this.tutorial.update(dt);
    this.witnesses.update();
    this.incidents.update(dt);
    this.animals.update(dt);
    this.announcer.update();
    this.updateDebugOverlay(dt);
    this.updateNight();
    this.paintSkids();
    // Voda pomalu plyne a třpytí se.
    this.water.tilePositionY += dt * 6;
    this.water.tilePositionX = Math.sin(this.time.now / 1500) * 2;
    this.updateAudio();
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) && !this.player.dead) this.openPause();
    const a = this.player.arsenal;
    const def = WEAPONS[a.current];
    this.registry.set('player', {
      health: this.player.health,
      armor: this.player.armor,
      money: this.player.money,
      score: this.player.score,
      weapon: def.name,
      ammo: def.melee ? null : a.ammo[a.current],
    } satisfies PlayerHud);
  }

  /**
   * Chůze k cíli: když je cesta volná, jde přímo; jinak si naplánuje cestu
   * kolem domů a řeky (přepočítá ji, když se cíl pohne nebo uplyne chvíle).
   */
  walkTo(p: Pedestrian, to: Point, speed: number): void {
    const now = this.time.now / 1000;
    let target: Point = to;
    if (!lineOfSight(this.world.tiles, TILE, p, to, isSolid)) {
      const stale = !p.navPath || now - p.navAt > 1.5 || !p.navGoal || Phaser.Math.Distance.Between(p.navGoal.x, p.navGoal.y, to.x, to.y) > 32;
      if (stale) {
        const path = findPath(
          this.world.tiles,
          [Math.floor(p.x / TILE), Math.floor(p.y / TILE)],
          [Math.floor(to.x / TILE), Math.floor(to.y / TILE)],
          (t) => (isSolid(t) ? Infinity : 1),
          4000,
        );
        p.navPath = path ? path.map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE })) : null;
        p.navIdx = 0;
        p.navGoal = { x: to.x, y: to.y };
        p.navAt = now;
      }
      const path = p.navPath;
      if (path?.length) {
        while (p.navIdx < path.length - 1 && Phaser.Math.Distance.Between(p.x, p.y, path[p.navIdx].x, path[p.navIdx].y) < 8) p.navIdx++;
        target = path[Math.min(p.navIdx + 1, path.length - 1)];
      }
    } else {
      p.navPath = null;
    }
    const angle = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
    p.setRotation(angle);
    this.physics.velocityFromRotation(angle, speed, (p.body as Phaser.Physics.Arcade.Body).velocity);
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
    else if (!v.stolen) this.events.emit('crime', { x: v.x, y: v.y, kind: v.isPolice ? 'policeTheft' : 'theft', vehicle: v });
    if (v.isPolice && !v.stolen) this.toast(T.stolePolice);
    if (!v.stolen) this.gangs.onSteal(v);
    v.stolen = true;
    this.police.onEnterVehicle(v);
    this.enterVehicle(v);
  }

  /** Posadí hráče do auta (bez krádeže: při příjezdu z jiné oblasti). */
  private enterVehicle(v: Vehicle): void {
    this.traffic.delete(v);
    v.driver = 'player';
    this.driving = v;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.player.setVisible(false);
    Sound.radioStart();
    if (Sound.stationName) this.toast(`♪ ${Sound.stationName} (R = přepnout)`);
    this.cameras.main.startFollow(v, true, 0.15, 0.15);
    this.cameras.getCamera('minimap')?.startFollow(v);
  }

  exitVehicle(): void {
    const v = this.driving;
    if (!v) return;
    Sound.radioStop();
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
    this.events.emit('crime', { x: v.x, y: v.y, kind: 'assault', vehicle: v });
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
    // Stojí kvůli nehodě nebo hádce.
    if (this.elapsed < t.hold) return { throttle: Math.abs(v.speed) > 5 ? -1 : 0, steer: 0, handbrake: true };

    let target = t.path[t.idx];
    if (target && Phaser.Math.Distance.Between(v.x, v.y, target.x, target.y) < 14) {
      t.idx++;
      target = t.path[t.idx];
    }
    if (!target) {
      if (t.noRespawn) {
        t.arrived = true;
        return { throttle: -1, steer: 0, handbrake: true };
      }
      // Konec trasy: auto „odjede“ z vesnice a objeví se jinde (na očích hráče se rozplyne).
      if (!this.inView(v.x, v.y)) this.respawnTraffic(v, t);
      else if (!t.leaving) {
        t.leaving = true;
        this.tweens.add({ targets: v, alpha: 0, duration: 600, onComplete: () => {
          if (!v.active || this.traffic.get(v) !== t) return;
          this.respawnTraffic(v, t);
          v.setAlpha(1);
        } });
      }
      return { throttle: -1, steer: 0, handbrake: false };
    }

    let blocked = false;
    // Kdo ujíždí, brzdí pozdě (ale přece jen brzdí, jinak by ujel jen do prvního auta).
    if (this.elapsed > t.ignoreUntil) {
      // Dívá se tím dál, čím rychleji jede; pozornému řidiči to na zastavení stačí.
      const look = 34 + Math.max(0, v.speed) * 0.35;
      const obstacles: Array<Point & { lastEventId: number | null; lastEventAt: number }> = this.vehicles.filter((o) => o !== v);
      if (!this.driving && !this.player.dead) obstacles.push(this.player);
      for (const p of this.combat.peds) if (p.alive && Math.abs(p.x - v.x) < look + 6 && Math.abs(p.y - v.y) < look + 6) obstacles.push(p);
      const ahead = obstacles.find((o) => isAhead(v, v.drive.angle, o, look, 9)) ?? null;
      // Řidič brzdí až po své reakční době (mobil, opilost → náraz zezadu).
      const r = reactToObstacle(!!ahead, t.seenSince, this.elapsed, t.flee ? Math.max(0.5, t.driver.reaction) : t.driver.reaction);
      t.seenSince = r.seenSince;
      blocked = r.brake;
      if (ahead) t.obstacle = ahead;
      t.blocker = blocked && ahead instanceof Vehicle ? ahead : null;
      // Zácpa do kruhu (křižovatka, kde čeká každý na každého): jede ten s nejvyšším pořadím.
      if (blocked && t.blocker && this.yieldCycleWinner(v)) {
        blocked = false;
        t.blocker = null;
        t.ignoreUntil = this.elapsed + 0.8;
      }
    } else {
      t.blocker = null;
    }
    if (blocked) {
      t.waited += dt;
      if (t.waited > 1.5 && this.elapsed - t.honkedAt > 3) {
        t.honkedAt = this.elapsed;
        if (this.inView(v.x, v.y)) {
          this.floatText(v.x, v.y - 12, T.honk, '#ffd23f', 900);
          Sound.horn(this.audioVol(v) * 0.6);
        }
      }
      // Ať se provoz nezasekne navždy: po chvíli to řidič zkusí objet.
      // Auto stojící u nehody řidič neobjede: čeká a troubí.
      if (t.waited > 4) {
        if (!this.isStaticBlocker(t.blocker)) t.ignoreUntil = this.elapsed + 1.5;
        t.waited = 0;
      }
    } else {
      t.waited = 0;
    }

    // Zaseklé auto: chvíli couvá s protočeným volantem; mimo dohled se rovnou přesune.
    if (this.elapsed < t.reverseUntil) return { throttle: -1, steer: -0.6, handbrake: false };
    t.jam = Math.abs(v.speed) < 8 ? t.jam + dt : 0;
    if (t.jam > 15 && !this.inView(v.x, v.y)) {
      this.respawnTraffic(v, t);
      return { throttle: 0, steer: 0, handbrake: true };
    }
    t.stuck = !blocked && Math.abs(v.speed) < 8 ? t.stuck + dt : 0;
    if (t.stuck > 2.5) {
      t.stuck = 0;
      if (!this.inView(v.x, v.y)) this.respawnTraffic(v, t);
      else t.reverseUntil = this.elapsed + 0.8;
    }
    // Když se protahuje kolem překážky, jede krokem (ťuknutí není nehoda).
    const creeping = this.elapsed < t.ignoreUntil && !t.flee;
    const input = steerToward(v, v.drive.angle, v.speed, target, creeping ? CREEP_SPEED : t.cruise, blocked);
    // Opilec kličkuje.
    if (t.driver.swerve > 0) input.steer = Math.max(-1, Math.min(1, input.steer + Math.sin(this.elapsed * 1.4 + v.x * 0.01) * t.driver.swerve));
    return input;
  }

  /** Kdo řídí (pro deník událostí): typ řidiče v provozu, policie, hráč. */
  driverLabel(v: Vehicle): string {
    return this.traffic.get(v)?.driver.trait ?? (v === this.driving ? 'hráč' : v.driver);
  }

  /**
   * Auto zastavené u nehody nebo hádky: kolem něj se nikdo necpe, řidiči čekají a troubí.
   * (Vrak nebo prázdné auto se krokem odstrčí, to je pod hranicí nárazu.)
   */
  private isStaticBlocker(b: Vehicle | null): boolean {
    if (!b || b.wrecked || b.driver === 'none') return false;
    const bt = this.traffic.get(b);
    return !!bt && this.elapsed < bt.hold;
  }

  /** Stojí auto v kruhu čekajících (A čeká na B, B na A…) a má v něm přednost? */
  private yieldCycleWinner(v: Vehicle): boolean {
    const rank = (x: Vehicle) => this.vehicles.indexOf(x);
    let best = rank(v);
    let cur = this.traffic.get(v)?.blocker ?? null;
    for (let i = 0; i < 8 && cur; i++) {
      if (cur === v) return rank(v) === best;
      best = Math.max(best, rank(cur));
      cur = this.traffic.get(cur)?.blocker ?? null;
    }
    return false;
  }

  /** Prudké brzdění v provozu se zapíše jako událost (příčina: co měl řidič před sebou). */
  private detectHardBraking(v: Vehicle, dt: number): void {
    const t = this.traffic.get(v);
    if (!t) return;
    const speed = Math.abs(v.speed);
    const decel = (t.prevSpeed - speed) / Math.max(dt, 0.001);
    if (decel > HARD_BRAKE && t.prevSpeed > 50 && this.elapsed - t.lastBrakeLog > 3) {
      t.lastBrakeLog = this.elapsed;
      const playerAhead = (t.obstacle as unknown) === this.player || t.obstacle === this.driving;
      this.logEvent('brake', `prudké brzdění (${t.driver.trait})`, v, playerAhead ? ['traffic', 'player'] : ['traffic'], [this.causeOf(t.obstacle)], [v]);
    }
    t.prevSpeed = speed;
  }

  private respawnTraffic(v: Vehicle, t: Traffic): void {
    // Kdo odjel z vesnice, tomu policie už nestačí.
    this.police.suspectGone(v);
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
    const driver = rollDriver(this.random, isEvening(this.gangs.minute));
    Object.assign(t, { path, idx: 1, waited: 0, ignoreUntil: 0, stuck: 0, reverseUntil: 0, driver, cruise: Math.min(driver.cruise, v.spec.params.maxSpeed * 0.85), hold: 0, flee: false, seenSince: 0, drunkSeen: false, obstacle: null, blocker: null, jam: 0, leaving: false });
    v.lastEventId = null;
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
    if (to === 'wrecked') {
      this.scheduleTow(v, WRECK_TOW_AFTER);
      this.explode(v);
    }
  }

  /** Auto odtáhne odtahovka nejdřív za `after` sekund, a jen když se hráč nedívá. */
  scheduleTow(v: Vehicle, after: number): void {
    this.towQueue.set(v, this.elapsed + after);
  }

  /** Vraky, zabavená a opuštěná auta mizí mimo dohled (jinak by z vesnice bylo vrakoviště). */
  private towVehicles(): void {
    for (const [v, due] of this.towQueue) {
      // Kdo si opuštěné auto vzal (hráč, řidič), tomu ho nikdo neodtáhne.
      if (!v.active || (!v.wrecked && (v.driver !== 'none' || v === this.driving))) this.towQueue.delete(v);
      else if (this.elapsed >= due && !this.inView(v.x, v.y)) {
        this.towQueue.delete(v);
        this.removeVehicle(v);
      } else if (this.elapsed >= due + 120) {
        // Hráč se dívá pořád: vrak se po dlouhé době rozplyne (jinak by navždy blokoval silnici).
        this.towQueue.delete(v);
        this.tweens.add({ targets: v, alpha: 0, duration: 1200, onComplete: () => {
          if (v.active && v !== this.driving) this.removeVehicle(v);
          else v.setAlpha(1);
        } });
      }
    }
  }

  private explode(v: Vehicle): void {
    const { x, y } = v;
    const wasInside = v === this.driving;
    const byPlayer = wasInside || this.time.now / 1000 - v.playerHitAt < 6;
    this.gangs.onWrecked(v, byPlayer);
    if (byPlayer) this.progression.onWreck(v);
    if (wasInside) this.exitVehicle();
    v.driver = 'none';
    this.traffic.delete(v);
    this.logEvent('explosion', 'auto vybouchlo', v, byPlayer ? ['traffic', 'player'] : ['traffic'], [this.causeOf(v)]);
    this.explodeAt(x, y, v, byPlayer);
    if (wasInside && !this.player.dead) this.toast(T.explodedInside);
  }

  /**
   * Výbuch na místě (auto, nálož): efekt, zranění lidí a řetězová reakce aut.
   * byPlayer: výbuch způsobil hráč (jinak to není jeho zločin, třeba vrak po nehodě v provozu).
   */
  explodeAt(x: number, y: number, source?: Vehicle, byPlayer = true): void {
    Sound.explosion(this.audioVol({ x, y }));
    if (!this.anims.exists('boom')) {
      this.anims.create({ key: 'boom', frames: this.anims.generateFrameNumbers('fireball', { start: 0, end: 5 }), frameRate: 14 });
    }
    const ball = this.add.sprite(x, y, 'fireball').setDepth(16).setScale(1.4).setRotation(this.random() * Math.PI * 2);
    this.cameras.getCamera('minimap')?.ignore(ball);
    ball.play('boom');
    ball.once('animationcomplete', () => ball.destroy());
    this.stampDecal('scorch', x, y, this.random() * 360, 0.9);
    const flash = this.add.circle(x, y, EXPLOSION_RADIUS * 0.35, 0xfff0a0, 0.5).setDepth(15).setBlendMode('ADD');
    this.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
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

    this.combat.explosionAt(x, y, byPlayer);

    // Řetězová reakce: výbuch poškodí auta okolo (zpožděně, ať to bouchá postupně).
    this.time.delayedCall(120, () => {
      for (const o of this.vehicles) {
        if (o === source || o.wrecked) continue;
        const dmg = explosionDamageAt(Phaser.Math.Distance.Between(x, y, o.x, o.y));
        // Kdo odpálil první auto, ten má na svědomí i další v řadě.
        if (byPlayer && dmg > 0) o.playerHitAt = this.time.now / 1000;
        o.damage(dmg);
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
      .setStroke('#000', 3)
      .setDepth(45);
    this.cameras.getCamera('minimap')?.ignore(t);
    this.tweens.add({ targets: t, y: y - 10, alpha: 0, delay: ms * 0.6, duration: ms * 0.4, onComplete: () => t.destroy() });
  }
}
