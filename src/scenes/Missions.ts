import Phaser from 'phaser';
import { TILE } from '../config';
import { Sound } from '../audio/Sound';
import type { Pedestrian } from '../entities/Pedestrian';
import type { Vehicle } from '../entities/Vehicle';
import { MISSIONS, type MissionInfo, TIER_NAMES, type Tier } from '../missions/catalog';
import { type ComplicationPlan, offersFor, refusesWork, type Reward, rewardFor, rollComplication } from '../missions/logic';
import {
  DeliverVehicleStep, DestroyStep, DropPassengerStep, EnterVehicleStep, EscortStep, EvadeStep, GotoStep, KillStep,
  PickupPassengerStep, PickupStep, PlantStep, type Step, SurviveStep,
} from '../missions/steps';
import type { Point } from '../systems/combat';
import { GROUP_IDS, type GroupId, relation, type RespectEvent } from '../systems/respect';
import { groupName } from '../world/areas';
import { GROUPS, standable } from '../world/gangs';
import { findFreeTile } from '../world/pickups';
import { findParkingSpot } from '../world/vehicles';
import { pixelFont } from './BootScene';
import type { GameScene } from './GameScene';

const GIVER_RANGE = 18;

interface Giver {
  group: GroupId;
  at: Point;
  marker: Phaser.GameObjects.Container;
}

interface Active {
  info: MissionInfo;
  steps: Step[];
  index: number;
  reward: Reward;
  complication: ComplicationPlan | null;
  stepTime: number;
  vehicleMission: boolean;
  /** Postavy s cedulkou se jménem (šéf, Franta, Jarda). */
  labels: Array<{ ped: Pedestrian; text: Phaser.GameObjects.Text }>;
}

export interface BoardHud {
  group: string;
  css: string;
  refuse: boolean;
  offers: Array<{ tier: Tier; tierName: string; title: string; brief: string; done: boolean }>;
}

export interface MissionHud {
  title: string;
  tier: Tier;
  objective: string;
  target: Point | null;
}

const TIER_EVENT: Record<Tier, RespectEvent> = { green: 'missionGreen', yellow: 'missionYellow', red: 'missionRed' };

/**
 * Zakázky: zadavatelé u skupin, nabídka podle respektu, průběh po krocích,
 * náhodné komplikace, odměny (peníze, skóre, respekt) a selhání.
 */
export class Missions {
  active: Active | null = null;
  done = new Set<string>();
  /** Je otevřená nabídka (klávesy 1–3 vybírají zakázku, ne zbraň). */
  boardOpen = false;
  private givers: Giver[] = [];
  private board: { group: GroupId; offers: MissionInfo[] } | null = null;
  private marker: Phaser.GameObjects.Arc;
  private miniMarker: Phaser.GameObjects.Arc;
  private keys: Phaser.Input.Keyboard.Key[];
  private abandonKey: Phaser.Input.Keyboard.Key;
  private places: Record<string, Point>;
  private pendingLabels: Active['labels'] = [];

  constructor(private game: GameScene) {
    this.places = this.findPlaces();
    for (const g of GROUP_IDS) this.addGiver(g);
    this.marker = game.add.circle(0, 0, 10, 0xffd23f, 0.25).setStrokeStyle(2, 0xffd23f).setDepth(6).setVisible(false);
    game.tweens.add({ targets: this.marker, scale: 1.5, duration: 600, yoyo: true, repeat: -1 });
    this.miniMarker = game.add.circle(0, 0, 50, 0xffd23f).setDepth(21).setVisible(false);
    game.cameras.main.ignore(this.miniMarker);
    game.cameras.getCamera('minimap')?.ignore(this.marker);
    const kb = game.input.keyboard!;
    this.keys = ['ONE', 'TWO', 'THREE'].map((k) => kb.addKey(k));
    this.abandonKey = kb.addKey('X');
    game.events.on('knockout', () => this.fail('Zakázka propadla.'));
  }

  // ---------- Místa na mapě ----------

  private findPlaces(): Record<string, Point> {
    const map = this.game.world;
    const taken = new Set<string>();
    const b = (name: string) => map.buildings.find((x) => x.name === name)!;
    const free = (tx: number, ty: number): Point => {
      const t = findFreeTile(map, tx, ty, taken);
      return { x: (t.tx + 0.5) * TILE, y: (t.ty + 0.5) * TILE };
    };
    const below = (name: string, dx = 0) => {
      const x = b(name);
      return free(x.x + Math.floor(x.w / 2) + dx, x.y + x.h + 1);
    };
    const s = map.spots;
    const skola = b('Škola');
    // Jardův dům: nejsevernější dům ve vesnici.
    const house = map.buildings.filter((x) => x.name === 'Dům').sort((a, c) => a.y - c.y)[0];
    return {
      giverDrevari: below('Pila', -2),
      giverStamgasti: below('Hospoda', 2),
      giverEkologove: free(s.ecoGiver.x, s.ecoGiver.y),
      giverSkola: free(skola.x + 3, skola.y + skola.h + 1),
      pila: below('Pila', 3),
      hospoda: below('Hospoda', -2),
      obchod: below('Obchod'),
      hriste: free(s.hriste.x, s.hriste.y),
      dam: free(s.dam.x, s.dam.y),
      camp: free(s.camp.x, s.camp.y),
      katr: free(b('Pila').x + b('Pila').w + 2, b('Pila').y + 1),
      jardaHome: free(house.x + 1, house.y + house.h + 1),
      urad: below('Obecní úřad'),
      skolaFront: free(skola.x + 2, skola.y + skola.h + 1),
    };
  }

  private addGiver(group: GroupId): void {
    const at = this.places[`giver${group[0].toUpperCase()}${group.slice(1)}`];
    const spec = GROUPS[group];
    const ring = this.game.add.circle(0, 0, 9, spec.color, 0.35).setStrokeStyle(2, spec.color);
    const mark = this.game.add.text(0, 0, '!', pixelFont(28, '#ffffff')).setOrigin(0.5).setScale(0.5).setStroke('#000', 5);
    const label = this.game.add.text(0, -16, groupName(this.game.area.id, group), pixelFont(14, spec.css)).setOrigin(0.5).setScale(0.5).setStroke('#000', 3);
    const marker = this.game.add.container(at.x, at.y, [ring, mark, label]).setDepth(5);
    this.game.tweens.add({ targets: ring, scale: 1.3, duration: 700, yoyo: true, repeat: -1 });
    this.game.cameras.getCamera('minimap')?.ignore(marker);
    this.givers.push({ group, at, marker });
  }

  // ---------- Každý snímek ----------

  update(dt: number): void {
    if (this.active) this.runActive(dt);
    else this.updateBoard();
    this.publishHud();
  }

  private updateBoard(): void {
    const pl = this.game.player;
    const here = !this.game.driving && !pl.dead ? this.givers.find((g) => Phaser.Math.Distance.Between(pl.x, pl.y, g.at.x, g.at.y) < GIVER_RANGE) : undefined;
    if (!here) {
      this.board = null;
      this.boardOpen = false;
      return;
    }
    const respect = this.game.gangs.respect[here.group];
    this.board = { group: here.group, offers: refusesWork(respect) ? [] : offersFor(here.group, respect, this.done, this.game.area.id) };
    this.boardOpen = true;
    this.keys.forEach((k, i) => {
      if (Phaser.Input.Keyboard.JustDown(k) && this.board?.offers[i]) this.start(this.board.offers[i]);
    });
  }

  private publishHud(): void {
    const reg = this.game.registry;
    if (this.board && !this.active) {
      const spec = GROUPS[this.board.group];
      reg.set('board', {
        group: groupName(this.game.area.id, this.board.group), css: spec.css, refuse: this.board.offers.length === 0,
        offers: this.board.offers.map((m) => ({ tier: m.tier, tierName: TIER_NAMES[m.tier], title: m.title, brief: m.brief, done: this.done.has(m.id) })),
      } satisfies BoardHud);
    } else reg.set('board', null);

    const a = this.active;
    const step = a?.steps[a.index];
    const target = step?.target() ?? null;
    reg.set('mission', a && step ? ({ title: a.info.title, tier: a.info.tier, objective: step.objective(), target: target ? { x: target.x, y: target.y } : null } satisfies MissionHud) : null);
    this.marker.setVisible(!!target);
    this.miniMarker.setVisible(!!target);
    if (target) {
      this.marker.setPosition(target.x, target.y);
      this.miniMarker.setPosition(target.x, target.y);
    }
    for (const g of this.givers) g.marker.setVisible(!a);
    if (a) for (const l of a.labels) l.ped.active ? l.text.setPosition(l.ped.x, l.ped.y - 12) : l.text.setVisible(false);
  }

  // ---------- Průběh zakázky ----------

  /** Spustí zakázku podle id (ladění z konzole prohlížeče a automatické testy). */
  startById(id: string): void {
    const info = MISSIONS.find((m) => m.id === id);
    if (info && !this.active) this.start(info);
  }

  private start(info: MissionInfo): void {
    const steps = this.build(info);
    const vehicleMission = ['stealVehicle', 'stealCargo', 'transportPerson', 'robConvoy'].includes(info.type);
    this.active = {
      info, steps, index: 0, reward: rewardFor(info.tier, this.game.random),
      complication: rollComplication(info.tier, steps.length, vehicleMission, this.game.random),
      stepTime: 0, vehicleMission, labels: this.pendingLabels,
    };
    this.pendingLabels = [];
    this.board = null;
    this.boardOpen = false;
    steps[0].start(this.game);
    this.game.events.emit('banner', info.title.toUpperCase());
    this.game.toast(info.brief);
  }

  private runActive(dt: number): void {
    const a = this.active!;
    if (Phaser.Input.Keyboard.JustDown(this.abandonKey)) {
      this.fail('Zakázku jsi vzdal.');
      return;
    }
    a.stepTime += dt;
    const c = a.complication;
    if (c && c.step === a.index && a.stepTime > c.delay) {
      a.complication = null;
      this.complicate(c.kind);
    }
    const step = a.steps[a.index];
    const r = step.update(this.game, dt);
    if (r === 'fail') this.fail(step.failReason || 'Zakázka se nepovedla.');
    else if (r === 'done') {
      step.cleanup(this.game);
      a.index++;
      a.stepTime = 0;
      if (a.index >= a.steps.length) this.succeed();
      else a.steps[a.index].start(this.game);
    }
  }

  private succeed(): void {
    const a = this.active!;
    this.finish();
    const pl = this.game.player;
    pl.money += a.reward.money;
    this.game.addScore(a.reward.score, null);
    this.done.add(a.info.id);
    this.game.gangs.mission(a.info.group, TIER_EVENT[a.info.tier]);
    this.game.saveGame(false);
    this.game.events.emit('banner', 'SPLNĚNO');
    Sound.jingle(true);
    this.game.toast(`${groupName(this.game.area.id, a.info.group)} platí ${a.reward.money} Kč. Skóre +${a.reward.score}.`);
  }

  private fail(reason: string): void {
    const a = this.active;
    if (!a) return;
    this.finish();
    // Selhání v důležité (žluté nebo červené) zakázce skupinu naštve.
    if (a.info.tier !== 'green') this.game.gangs.mission(a.info.group, 'missionFailed');
    this.game.events.emit('banner', 'NEVYŠLO TO');
    Sound.jingle(false);
    this.game.toast(reason);
  }

  private finish(): void {
    const a = this.active!;
    a.steps[a.index]?.cleanup(this.game);
    for (const l of a.labels) l.text.destroy();
    this.active = null;
  }

  // ---------- Komplikace ----------

  private complicate(kind: ComplicationPlan['kind']): void {
    const g = this.game;
    const a = this.active!;
    if (kind === 'breakdown' && g.driving) {
      const v = g.driving;
      if (v.hp > v.spec.maxHp * 0.45) v.damage(v.hp - v.spec.maxHp * 0.45);
      g.toast('Motor chrčí. Kdo tankoval naftu do benzínu?');
      return;
    }
    if (kind === 'ownerCalls' && g.driving) {
      g.police.raiseTo(2, g.driving);
      g.toast('Majitel volá policii! A zní fakt naštvaně.');
      return;
    }
    if (kind === 'ambush' || kind === 'breakdown') {
      const enemy = [...GROUP_IDS].filter((x) => x !== a.info.group).sort((x, y) => relation(a.info.group, x) - relation(a.info.group, y))[0];
      const spawned = this.spawnNear(enemy, g.driving ?? g.player, 3, 150);
      for (const m of spawned) g.gangs.engage(m, 'player', false);
      g.toast(`Přepadení! O zakázce se dozvěděla parta: ${groupName(g.area.id, enemy)}.`);
      return;
    }
    g.police.raiseTo(Math.max(1, g.police.wanted.level), g.driving ?? g.player);
    g.toast('Někdo to vyžvanil fízlům.');
  }

  /** Členové skupiny kousek od bodu, mimo obrazovku, kde to jde. */
  private spawnNear(group: GroupId, at: Point, count: number, dist: number): Pedestrian[] {
    const out: Pedestrian[] = [];
    for (let tries = 0; tries < 60 && out.length < count; tries++) {
      const angle = this.game.random() * Math.PI * 2;
      const d = dist + this.game.random() * 60;
      const x = at.x + Math.cos(angle) * d;
      const y = at.y + Math.sin(angle) * d;
      if (!standable(this.game.tileAt(x, y))) continue;
      out.push(this.game.gangs.spawnAt(group, x, y));
    }
    return out;
  }

  // ---------- Sestavení zakázek ----------

  private label(ped: Pedestrian, name: string, css: string): void {
    const text = this.game.add.text(ped.x, ped.y - 12, name, pixelFont(14, css)).setOrigin(0.5, 1).setScale(0.5).setStroke('#000', 3).setDepth(20);
    this.game.cameras.getCamera('minimap')?.ignore(text);
    this.pendingLabels.push({ ped, text });
  }

  private parked(kind: Parameters<GameScene['addVehicle']>[0], near: Point, owner: GroupId | null): Vehicle {
    const spot = findParkingSpot(this.game.world, Math.floor(near.x / TILE), Math.floor(near.y / TILE), new Set(this.game.vehicles.map((v) => `${Math.floor(v.x / TILE)},${Math.floor(v.y / TILE)}`)));
    const v = this.game.addVehicle(kind, (spot.tx + 1) * TILE, (spot.ty + 0.5) * TILE, 0, 0);
    v.owner = owner;
    return v;
  }

  private boss(group: GroupId, at: Point, name: string, guards: number): { boss: Pedestrian; guards: Pedestrian[] } {
    const boss = this.game.gangs.spawnAt(group, at.x, at.y, 3);
    boss.setScale(1.3);
    this.label(boss, name, GROUPS[group].css);
    return { boss, guards: this.spawnNear(group, at, guards, 20) };
  }

  private build(info: MissionInfo): Step[] {
    const p = this.places;
    const g = this.game;
    switch (info.id) {
      case 'drevari-pila':
        return [
          new PickupStep('Vyzvedni motorovou pilu u obchodu', p.obchod, 'pickup-bat'),
          new GotoStep('Dones pilu Dřevařům na pilu', p.pila),
        ];
      case 'drevari-pepa': {
        const { boss, guards } = this.boss('ekologove', p.dam, 'Zelený Pepa', 3);
        return [new KillStep('Zlikviduj Zeleného Pepu u hráze', [boss], guards)];
      }
      case 'drevari-franta': {
        const franta = g.gangs.spawnAt('drevari', p.hospoda.x, p.hospoda.y, 1.5);
        franta.scripted = true;
        this.label(franta, 'Franta', GROUPS.drevari.css);
        return [
          new GotoStep('Vyzvedni Frantu u hospody', p.hospoda, 30),
          new EscortStep('Doprovoď Frantu na pilu (jde, jen když jsi u něj)', franta, p.pila, (game, at) => {
            for (const m of this.spawnNear('ekologove', at, 3, 110)) game.gangs.engage(m, franta, false);
            game.toast('Biomatky! Chtějí Frantu!');
          }),
        ];
      }
      case 'drevari-tabor': {
        const guards = this.spawnNear('ekologove', p.camp, 6, 30);
        for (const m of guards) m.home = p.camp;
        return [
          new GotoStep('Najdi tábor Biomatek v lese', p.camp, 90),
          new PlantStep('Drž E u tábora a polož nálož', p.camp, 'tent'),
        ];
      }
      case 'stamgasti-jarda': {
        const jarda = g.gangs.spawnAt('stamgasti', p.hospoda.x + 10, p.hospoda.y, 1);
        jarda.scripted = true;
        this.label(jarda, 'Jarda (spí)', GROUPS.stamgasti.css);
        let car: Vehicle | null = null;
        return [
          new PickupPassengerStep('Přijeď autem pro Jardu k hospodě', jarda, (v) => {
            car = v;
            g.toast('Jarda: Hik… kam to jedem? Domů? Ještě jedno…');
          }),
          new DropPassengerStep('Odvez Jardu domů a zastav', () => car!, p.jardaHome, (game) => {
            game.toast('Jarda: Díky, kámo… hik. Řekni ženě, že jsem byl v kostele.');
          }),
        ];
      }
      case 'stamgasti-pivo': {
        const van = this.parked('dodavka', p.obchod, null);
        return [
          new EnterVehicleStep('Ukradni dodávku s pivem u obchodu', () => van),
          new DeliverVehicleStep('Dovez pivo k hospodě', () => van, p.hospoda),
        ];
      }
      case 'stamgasti-konvoj': {
        const vans = [g.addTrafficVehicle('dodavka', 0, 2, true), g.addTrafficVehicle('dodavka', 0, 0, true)];
        g.addTrafficVehicle('policie', 0, 4, true);
        g.toast('Konvoj jede od Raškovic. Doprovází ho policie!');
        return [new DestroyStep('Znič dodávky konkurenčního pivovaru', vans)];
      }
      case 'ekologove-traktor': {
        const tractor = g.vehicles.find((v) => v.spec.kind === 'traktor' && v.owner === 'drevari' && !v.wrecked && v.driver === 'none') ?? this.parked('traktor', p.pila, 'drevari');
        return [new DestroyStep('Znič smradlavý traktor Dřevařů', [tractor])];
      }
      case 'ekologove-pila':
        return [new PlantStep('Drž E u katru na pile a polož nálož', p.katr, null)];
      case 'ekologove-kazimir': {
        const { boss, guards } = this.boss('drevari', p.pila, 'Mistr Kazimír', 4);
        return [new KillStep('Zlikviduj mistra Kazimíra na pile', [boss], guards)];
      }
      case 'skola-auto': {
        const car = this.parked('osobak', p.hospoda, 'stamgasti');
        return [
          new EnterVehicleStep('Ukradni auto před hospodou', () => car),
          new DeliverVehicleStep('Přivez auto na školní hřiště', () => car, p.hriste),
        ];
      }
      case 'skola-honicka':
        return [new EvadeStep('Utíkej! Setřes policii (3 hvězdy)', 3)];
      case 'skola-utok':
        return [
          new GotoStep('Běž na školní hřiště', p.hriste, 40),
          new SurviveStep('Ubraň hřiště', 60, p.hriste, (game) => {
            for (const m of this.spawnNear('stamgasti', p.hriste, 3, 170)) game.gangs.engage(m, 'player', false);
          }),
        ];
      // ---------- Raškovice ----------
      case 'r-vorari-terenak': {
        const car = this.parked('terenak', p.dam, 'ekologove');
        return [new DestroyStep('Znič teréňák Chalupářů u jezu', [car])];
      }
      case 'r-vorari-konvoj': {
        const vans = [g.addTrafficVehicle('dodavka', 2, 2, true), g.addTrafficVehicle('dodavka', 2, 0, true)];
        g.toast('Dodávky jedou po příčné silnici od západu!');
        return [new DestroyStep('Znič dodávky cizí pily', vans)];
      }
      case 'r-rybari-pruty':
        return [
          new PickupStep('Vyzvedni pruty u obchodu', p.obchod, 'pickup-bat'),
          new GotoStep('Dones pruty do hospody U Kapra', p.hospoda),
        ];
      case 'r-rybari-lojza': {
        const lojza = g.gangs.spawnAt('stamgasti', p.hospoda.x + 10, p.hospoda.y, 1);
        lojza.scripted = true;
        this.label(lojza, 'Lojza s kaprem', GROUPS.stamgasti.css);
        let car: Vehicle | null = null;
        return [
          new PickupPassengerStep('Přijeď autem pro Lojzu k hospodě', lojza, (v) => {
            car = v;
            g.toast('Lojza: Opatrně, kapr je ještě živej. Teda… byl.');
          }),
          new DropPassengerStep('Odvez Lojzu na obecní úřad a zastav', () => car!, p.urad, (game) => {
            game.toast('Lojza: Pane starosto, tady je ten kapr… kde je kapr?');
          }),
        ];
      }
      case 'r-chalupari-skutr': {
        const scooter = g.vehicles.find((v) => v.spec.kind === 'skutr' && v.owner === 'skola' && !v.wrecked && v.driver === 'none') ?? this.parked('skutr', p.hriste, 'skola');
        return [new DestroyStep('Znič skútr Učňáků', [scooter])];
      }
      case 'r-chalupari-zdenek': {
        const { boss, guards } = this.boss('skola', p.skolaFront, 'Mistr Zdeněk', 4);
        return [new KillStep('Zlikviduj mistra Zdeňka u učiliště', [boss], guards)];
      }
      case 'r-ucnaci-dodavka': {
        const van = this.parked('dodavka', p.obchod, null);
        return [
          new EnterVehicleStep('Ukradni dodávku u obchodu', () => van),
          new DeliverVehicleStep('Přivez dodávku k učilišti', () => van, p.hriste),
        ];
      }
      case 'r-ucnaci-honicka':
        return [new EvadeStep('Setřes policii (2 hvězdy)', 2)];
      case 'r-ucnaci-obrana':
        return [
          new GotoStep('Běž k učilišti', p.hriste, 40),
          new SurviveStep('Ubraň dílny', 50, p.hriste, (game) => {
            for (const m of this.spawnNear('stamgasti', p.hriste, 3, 170)) game.gangs.engage(m, 'player', false);
          }),
        ];
      default:
        return [new GotoStep('?', p.hospoda)];
    }
  }
}

export const MISSION_COUNT = MISSIONS.length;
