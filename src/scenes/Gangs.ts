import Phaser from 'phaser';
import { TILE } from '../config';
import { Sound } from '../audio/Sound';
import { Pedestrian } from '../entities/Pedestrian';
import type { Vehicle } from '../entities/Vehicle';
import { darkness, formatClock, GAME_MINUTES_PER_SECOND, isEvening, minuteOfDay } from '../systems/clock';
import { type Point, rayCircleHit } from '../systems/combat';
import {
  applyRespect, attitude, ecoAngryAtVehicle, GROUP_IDS, type GroupId, newRespect, relation, type Respect, type RespectEvent,
} from '../systems/respect';
import { lineOfSight } from '../systems/sight';
import { groupName } from '../world/areas';
import { GROUPS, inZones, type ProjectileKind, spawnTiles, territory } from '../world/gangs';
import type { Zone } from '../world/moravka';
import { CHATTER } from '../texts/chatter';
import { blocksBullets, isSolid } from '../world/tiles';
import type { PedHurtEvent } from './Combat';
import type { GameScene } from './GameScene';

const RESPAWN_EVERY = 3;
const SIGHT = 170;
const GIVE_UP = 360;
const HELP_RANGE = 220;
const ALERT_RANGE = 160;
const SHOUT_COOLDOWN = 8;

interface Projectile {
  kind: ProjectileKind;
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  travelled: number;
  range: number;
  damage: number;
  owner: Pedestrian;
}

interface FireZone {
  x: number;
  y: number;
  until: number;
  gfx: Phaser.GameObjects.Particles.ParticleEmitter;
}

export interface RespectHud {
  respect: Respect;
  names: Record<GroupId, string>;
  clock: string;
  darkness: number;
}

/**
 * Skupiny Morávky: členové na svých územích, respekt hráče, postoj ke hráči
 * („To je on!“), pomoc spřáteleným, bitky mezi rivaly, útoky na policii,
 * vrhané věci a ničení aut Biomatkami. Taky herní čas (večer jsou Štamgasti horší).
 */
export class Gangs {
  respect: Respect = newRespect();
  members: Pedestrian[] = [];
  private territories: Record<GroupId, Zone[]>;
  private spawnSpots: Record<GroupId, Array<[number, number]>>;
  private projectiles: Projectile[] = [];
  private fires: FireZone[] = [];
  private respawnTimer = 0;
  /** Za kolik sekund si zase někdo pokecá. */
  private chatIn = 3;
  private shoutedAt = new Map<GroupId, number>();
  private respectThrottle = new Map<string, number>();
  elapsed = 0;

  constructor(private game: GameScene) {
    const map = game.world;
    this.territories = Object.fromEntries(GROUP_IDS.map((g) => [g, territory(map, g)])) as Record<GroupId, Zone[]>;
    this.spawnSpots = Object.fromEntries(GROUP_IDS.map((g) => [g, spawnTiles(map, g)])) as Record<GroupId, Array<[number, number]>>;
    for (const g of GROUP_IDS) for (let i = 0; i < GROUPS[g].members; i++) this.spawnMember(g, false);
    game.events.on('pedHurt', (e: PedHurtEvent) => this.onPedHurt(e));
  }

  private get now(): number {
    return this.game.time.now / 1000;
  }

  get minute(): number {
    return minuteOfDay(this.elapsed);
  }

  /** Spánek v chatě: posune hodiny o daný počet hodin. */
  skipHours(hours: number): void {
    this.elapsed += (hours * 60) / GAME_MINUTES_PER_SECOND;
  }

  /** Štamgasti jsou večer agresivnější (posun hranic postoje). */
  private aggression(g: GroupId): number {
    return g === 'stamgasti' && isEvening(this.minute) ? 25 : 0;
  }

  attitudeOf(g: GroupId) {
    return attitude(this.respect[g], this.aggression(g));
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.respawnTimer += dt;
    if (this.respawnTimer > RESPAWN_EVERY) {
      this.respawnTimer = 0;
      for (const g of GROUP_IDS) {
        const alive = this.members.filter((m) => m.alive && m.group === g).length;
        if (alive < GROUPS[g].members) this.spawnMember(g, true);
      }
    }
    for (const m of this.members) this.updateMember(m, dt);
    this.chatter(dt);
    for (let i = this.members.length - 1; i >= 0; i--) if (!this.members[i].active || !this.members[i].alive) this.members.splice(i, 1);
    this.updateProjectiles(dt);
    this.updateFires(dt);

    this.game.registry.set('gangs', { respect: this.respect, names: Object.fromEntries(GROUP_IDS.map((g) => [g, groupName(this.game.area.id, g)])) as Record<GroupId, string>, clock: formatClock(this.minute), darkness: darkness(this.minute) } satisfies RespectHud);
  }

  // ---------- Členové ----------

  /** Člen skupiny na daném místě (pro zakázky: šéfové, strážci, přepadení). */
  spawnAt(g: GroupId, x: number, y: number, hpMul = 1): Pedestrian {
    const spec = GROUPS[g];
    const m = new Pedestrian(this.game, x, y, 0, true, `gang-${g}`, Math.round(spec.hp * hpMul));
    m.role = 'gang';
    m.group = g;
    m.home = { x, y };
    m.mood = 'idle';
    m.setOrigin(8 / m.width, 0.5);
    this.game.cameras.getCamera('minimap')?.ignore(m);
    this.game.combat.peds.push(m);
    this.members.push(m);
    return m;
  }

  private spawnMember(g: GroupId, offscreen: boolean): void {
    const spots = this.spawnSpots[g];
    for (let tries = 0; tries < 30; tries++) {
      const [tx, ty] = spots[Math.floor(this.game.random() * spots.length)];
      const x = (tx + 0.5) * TILE;
      const y = (ty + 0.5) * TILE;
      if (offscreen && this.game.inView(x, y)) continue;
      this.spawnAt(g, x, y);
      return;
    }
  }

  private playerTarget(): (Point & { driving: Vehicle | null }) | null {
    const pl = this.game.player;
    if (pl.dead) return null;
    const d = this.game.driving;
    return d ? { x: d.x, y: d.y, driving: d } : { x: pl.x, y: pl.y, driving: null };
  }

  private sees(m: Point, p: Point, range = SIGHT): boolean {
    return Phaser.Math.Distance.Between(m.x, m.y, p.x, p.y) < range && lineOfSight(this.game.world.tiles, TILE, m, p, blocksBullets);
  }

  private foePos(m: Pedestrian): Point | null {
    const f = m.foe;
    if (!f) return null;
    if (f === 'player') {
      const t = this.playerTarget();
      return t ? { x: t.x, y: t.y } : null;
    }
    if (!f.active) return null;
    if (f instanceof Pedestrian && !f.alive) return null;
    if ('wrecked' in f && (f as Vehicle).wrecked) return null;
    return { x: f.x, y: f.y };
  }

  private updateMember(m: Pedestrian, dt: number): void {
    if (!m.alive || !m.active || !m.group || m.scripted) return;
    const g = m.group;
    const spec = GROUPS[g];
    const now = this.now;
    const body = m.body as Phaser.Physics.Arcade.Body;
    const evening = g === 'stamgasti' && isEvening(this.minute);
    const speed = spec.speed * (evening ? 1.3 : 1);

    // Útěk (Omladina a Biomatky při malém zdraví).
    if (now < m.fleeUntil) {
      const from = this.foePos(m) ?? this.playerTarget() ?? m;
      const t = m.fleeTarget;
      if (!t || Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) < 10 || now - m.fleeTargetAt > 2) {
        m.fleeTarget = this.game.fleeSpot(m, from, 110);
        m.fleeTargetAt = now;
      }
      this.game.walkTo(m, m.fleeTarget!, speed * 1.2);
      return;
    }

    this.chooseFoe(m);
    const pos = this.foePos(m);
    if (!pos || now > m.foeUntil) {
      m.foe = null;
      m.attacksPolice = false;
      this.loiter(m, dt);
      return;
    }

    const dist = Phaser.Math.Distance.Between(m.x, m.y, pos.x, pos.y);
    if (dist > GIVE_UP) {
      m.foe = null;
      m.attacksPolice = false;
      return;
    }
    if (spec.fleeAt > 0 && m.hp < m.maxHp * spec.fleeAt) {
      m.fleeUntil = now + 4;
      return;
    }

    const angle = Phaser.Math.Angle.Between(m.x, m.y, pos.x, pos.y);
    const melee = spec.melee;
    const ranged = spec.ranged;
    const canSee = lineOfSight(this.game.world.tiles, TILE, m, pos, blocksBullets);
    const cooldownMul = evening ? 0.6 : g === 'stamgasti' ? 1.3 : 1;

    if (melee && dist <= melee.range + 6) {
      body.setVelocity(0, 0);
      m.setRotation(angle);
      if (now > m.nextAttack) {
        m.nextAttack = now + melee.cooldown * cooldownMul;
        this.hit(m, melee.damage);
      }
      return;
    }
    if (ranged && canSee && dist <= ranged.range && (!melee || dist > melee.range + 30)) {
      body.setVelocity(0, 0);
      m.setRotation(angle);
      if (now > m.nextAttack) {
        m.nextAttack = now + ranged.cooldown * cooldownMul;
        // Večer Štamgasti občas hodí molotov místo láhve.
        const kind: ProjectileKind = ranged.kind === 'bottle' && evening && this.game.random() < 0.35 ? 'molotov' : ranged.kind;
        // Štamgasti přes den míří hůř.
        const spread = g === 'stamgasti' && !evening ? 0.35 : 0.15;
        this.throw(m, pos, kind, ranged.damage, ranged.range, spread);
      }
      return;
    }
    this.game.walkTo(m, pos, speed);
  }

  /** Rozhodne, na koho člen půjde (pokud zrovna na nikoho nejde). */
  private chooseFoe(m: Pedestrian): void {
    if (m.foe && this.foePos(m)) return;
    const g = m.group!;
    const now = this.now;
    const t = this.playerTarget();
    const att = this.attitudeOf(g);
    const wanted = this.game.police.wanted.level;

    if (t) {
      // Biomatky: auto je nepřítel, chodec ne (dokud je nenaštveš úplně).
      if (g === 'ekologove') {
        const angryCar = t.driving && ecoAngryAtVehicle(this.respect.ekologove, t.driving.spec.kind, t.driving.state !== 'ok');
        if ((angryCar && this.sees(m, t, 140)) || (att === 'hunt' && this.sees(m, t))) {
          this.engage(m, 'player', true);
          return;
        }
      } else {
        const inTerritory = inZones(this.territories[g], Math.floor(t.x / TILE), Math.floor(t.y / TILE));
        if ((att === 'hunt' || (att === 'hostile' && inTerritory)) && this.sees(m, t)) {
          this.engage(m, 'player', true);
          return;
        }
      }

      // Spřátelená skupina: když tě honí policie poblíž, pustí se do policajtů.
      if (att === 'ally' && wanted > 0 && Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) < HELP_RANGE) {
        const cop = this.nearest(m, (p) => p.role === 'cop', 200);
        const car = cop ? null : this.nearestPoliceCar(m, 200);
        const foe = cop ?? car;
        if (foe) {
          m.foe = foe;
          m.foeUntil = now + 20;
          m.attacksPolice = true;
          this.shout(m, GROUPS[g].helping, '#9fffa0');
          // Útok na policii řeší policisté na místě (vidí ho a střílí); hráči to hledanost nepřidá.
          this.game.logEvent('gang-vs-police', `útok na policii: ${GROUPS[g].name}`, m, ['gangs', 'police'], [this.game.causeOf(m)], [m]);
          return;
        }
      }
    }

    // Rivalové se občas porvou, když se potkají.
    const rival = this.nearest(m, (p) => p.role === 'gang' && !!p.group && relation(g, p.group) < 0, 60);
    if (rival && this.game.random() < (relation(g, rival.group!) === -2 ? 0.02 : 0.008)) {
      this.engage(m, rival, false);
      if (!rival.foe) this.engage(rival, m, false);
      return;
    }

    // Biomatky ničí zaparkovaná auta.
    if (g === 'ekologove' && this.game.random() < 0.004) {
      const car = this.game.vehicles.find(
        (v) => v.driver === 'none' && !v.wrecked && v.state === 'ok' && v.owner !== 'ekologove' && v.spec.kind !== 'kolo' &&
          Phaser.Math.Distance.Between(v.x, v.y, m.x, m.y) < 140,
      );
      if (car) {
        m.foe = car;
        m.foeUntil = now + 10;
      }
    }
  }

  /** Člen jde na cíl; na hráče s výkřikem „To je on!“ a přidají se kamarádi okolo. */
  engage(m: Pedestrian, foe: Pedestrian | 'player', alertFriends: boolean): void {
    m.foe = foe;
    m.foeUntil = this.now + 25;
    // Nápřah: první rána nepřijde okamžitě, hráč má šanci reagovat.
    m.nextAttack = Math.max(m.nextAttack, this.now + 0.8);
    if (foe === 'player') this.shout(m, GROUPS[m.group!].spotted, GROUPS[m.group!].css);
    if (!alertFriends) return;
    for (const o of this.members) {
      if (o !== m && o.alive && o.group === m.group && !o.foe && Phaser.Math.Distance.Between(o.x, o.y, m.x, m.y) < ALERT_RANGE) {
        o.foe = foe;
        o.foeUntil = this.now + 25;
      }
    }
  }

  private shout(m: Pedestrian, lines: string[], color: string): void {
    const g = m.group!;
    if (this.now - (this.shoutedAt.get(g) ?? -100) < SHOUT_COOLDOWN || !this.game.inView(m.x, m.y)) return;
    this.shoutedAt.set(g, this.now);
    this.game.floatText(m.x, m.y - 10, lines[Math.floor(this.game.random() * lines.length)], color, 2200);
  }

  private nearest(m: Pedestrian, pred: (p: Pedestrian) => boolean, range: number): Pedestrian | null {
    let best: Pedestrian | null = null;
    let bestD = range;
    for (const p of this.game.combat.peds) {
      if (p === m || !p.alive || !p.active || !pred(p)) continue;
      const d = Phaser.Math.Distance.Between(m.x, m.y, p.x, p.y);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  private nearestPoliceCar(m: Pedestrian, range: number): Vehicle | null {
    let best: Vehicle | null = null;
    let bestD = range;
    for (const v of this.game.vehicles) {
      if (!v.isPolice || v.wrecked || v.driver !== 'police') continue;
      const d = Phaser.Math.Distance.Between(m.x, m.y, v.x, v.y);
      if (d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * Bez nepřítele: postává a popochází kolem svého místa, rád k někomu ze své party
   * (ať je s kým kecat). Cíl je vždycky místo, kam se dá dojít.
   */
  private loiter(m: Pedestrian, dt: number): void {
    const body = m.body as Phaser.Physics.Arcade.Body;
    const now = this.now;
    if (m.target && Phaser.Math.Distance.Between(m.x, m.y, m.target.x, m.target.y) > 6 && now < m.until) {
      m.stuckFor = body.speed < 5 ? m.stuckFor + dt : 0;
      if (m.stuckFor < 2.5) {
        this.game.walkTo(m, m.target, GROUPS[m.group!].speed * 0.45);
        return;
      }
    }
    body.setVelocity(0, 0);
    if (now > m.until) {
      const home = m.home ?? m;
      const rnd = this.game.random;
      const buddies = this.members.filter((o) => o !== m && o.alive && o.group === m.group && !o.foe && Phaser.Math.Distance.Between(o.x, o.y, home.x, home.y) < 150);
      const buddy = buddies.length && rnd() < 0.6 ? buddies[Math.floor(rnd() * buddies.length)] : null;
      const base = buddy ?? home;
      const spread = buddy ? 36 : 120;
      for (let tries = 0; tries < 8; tries++) {
        const x = base.x + (rnd() - 0.5) * spread;
        const y = base.y + (rnd() - 0.5) * spread;
        if (isSolid(this.game.tileAt(x, y))) continue;
        m.target = { x, y };
        break;
      }
      m.stuckFor = 0;
      m.until = now + 3 + rnd() * 4;
    }
  }

  // ---------- Kecy ----------

  /** Dva ze stejné party u sebe: jeden něco plácne, druhý odpoví (jen když to hráč vidí). */
  private chatter(dt: number): void {
    this.chatIn -= dt;
    if (this.chatIn > 0) return;
    this.chatIn = 2 + this.game.random() * 3;
    const g = this.game;
    const rnd = g.random;
    const idle = this.members.filter((m) => m.alive && m.active && !m.scripted && !m.foe && this.now > m.fleeUntil && g.inView(m.x, m.y));
    for (let i = idle.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idle[i], idle[j]] = [idle[j], idle[i]];
    }
    for (const a of idle) {
      const b = idle.find((o) => o !== a && o.group === a.group && Phaser.Math.Distance.Between(a.x, a.y, o.x, o.y) < 80);
      if (!b) continue;
      const talk = CHATTER[a.group!];
      const frame = GROUPS[a.group!].color;
      for (const [p, q] of [[a, b], [b, a]] as const) {
        (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        p.setRotation(Phaser.Math.Angle.Between(p.x, p.y, q.x, q.y));
        p.until = this.now + 4;
        p.target = null;
      }
      g.speech.say(a, talk.lines[Math.floor(rnd() * talk.lines.length)], frame);
      g.time.delayedCall(1900, () => {
        if (b.active && b.alive && !b.foe) g.speech.say(b, talk.replies[Math.floor(rnd() * talk.replies.length)], frame, 2200);
      });
      this.chatIn = 4 + rnd() * 4;
      return;
    }
  }

  /** Úder zblízka do cíle (hráč, jeho auto, postava nebo auto). */
  private hit(m: Pedestrian, damage: number): void {
    const f = m.foe;
    const swing = this.game.add.graphics().setDepth(14);
    swing.lineStyle(2, 0xffffff, 0.6).beginPath().arc(m.x, m.y, 14, m.rotation - 0.7, m.rotation + 0.7).strokePath();
    this.game.cameras.getCamera('minimap')?.ignore(swing);
    this.game.tweens.add({ targets: swing, alpha: 0, duration: 150, onComplete: () => swing.destroy() });
    if (f === 'player') {
      if (this.game.driving) this.game.driving.damage(damage * 0.5);
      else this.game.combat.damagePlayer(damage);
    } else if (f instanceof Pedestrian) {
      this.game.combat.hurtPed(f, damage, m, false);
    } else if (f && 'damage' in f) {
      (f as Vehicle).damage(damage * 0.5);
    }
  }

  // ---------- Vrhané věci ----------

  private throw(m: Pedestrian, at: Point, kind: ProjectileKind, damage: number, range: number, spread: number): void {
    const angle = Phaser.Math.Angle.Between(m.x, m.y, at.x, at.y) + (this.game.random() - 0.5) * spread * 2;
    const speed = kind === 'rock' ? 260 : 170;
    const sprite = this.game.add.image(m.x, m.y, `proj-${kind}`).setDepth(13).setRotation(angle);
    this.game.cameras.getCamera('minimap')?.ignore(sprite);
    const dist = Phaser.Math.Distance.Between(m.x, m.y, at.x, at.y);
    this.projectiles.push({
      kind, sprite, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, travelled: 0,
      // Láhve a petardy dopadnou tam, kam míří; kámen letí dál.
      range: kind === 'rock' ? range : Math.min(range, dist + 8), damage, owner: m,
    });
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      const s = p.sprite;
      const step = Math.hypot(p.vx, p.vy) * dt;
      const angle = Math.atan2(p.vy, p.vx);
      const from = { x: s.x, y: s.y };
      s.x += p.vx * dt;
      s.y += p.vy * dt;
      s.rotation += p.kind === 'rock' ? 0 : 12 * dt;
      p.travelled += step;

      let done = p.travelled >= p.range || blocksBullets(this.game.tileAt(s.x, s.y));
      // Zásah postavy nebo auta na dráze letu.
      if (!done) done = this.projectileHit(p, from, angle, step);
      if (done) {
        this.impact(p);
        s.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.sprite.active);
  }

  private projectileHit(p: Projectile, from: Point, angle: number, step: number): boolean {
    const t = this.playerTarget();
    if (t && p.owner.foe === 'player') {
      const r = t.driving ? t.driving.spec.width / 2 + 2 : 6;
      if (rayCircleHit(from, angle, step, t, r) !== null) {
        if (p.kind === 'bottle' || p.kind === 'rock') {
          if (t.driving) t.driving.damage(p.damage * 0.6);
          else this.game.combat.damagePlayer(p.damage);
        }
        return true;
      }
    }
    for (const ped of this.game.combat.peds) {
      if (!ped.alive || ped === p.owner || ped.group === p.owner.group) continue;
      if (rayCircleHit(from, angle, step, ped, 6) !== null) {
        if (p.kind === 'bottle' || p.kind === 'rock') this.game.combat.hurtPed(ped, p.damage, p.owner, false);
        return true;
      }
    }
    for (const v of this.game.vehicles) {
      if (v.wrecked || v === t?.driving) continue;
      if (rayCircleHit(from, angle, step, v, v.spec.width / 2 + 2) !== null) {
        if (p.kind === 'bottle' || p.kind === 'rock') v.damage(p.damage * 0.6);
        return true;
      }
    }
    return false;
  }

  private impact(p: Projectile): void {
    const { x, y } = p.sprite;
    const vol = this.game.audioVol({ x, y });
    if (p.kind === 'firework') {
      Sound.explosion(vol, true);
      this.blast(x, y, p.damage, p.owner);
    } else if (p.kind === 'molotov') {
      Sound.glass(vol);
      this.ignite(x, y);
    } else if (p.kind === 'bottle') {
      Sound.glass(vol);
      const glass = this.game.add.particles(x, y, 'spark', {
        lifespan: 250, speed: { min: 20, max: 60 }, tint: [0x9ad09a, 0xffffff], scale: { start: 1, end: 0 }, emitting: false,
      }).setDepth(12);
      glass.explode(6);
      this.game.cameras.getCamera('minimap')?.ignore(glass);
      this.game.time.delayedCall(400, () => glass.destroy());
    }
  }

  /** Petarda: malý výbuch, zraní všechny okolo (i Omladinu) a vyděsí chodce. */
  private blast(x: number, y: number, damage: number, owner: Pedestrian): void {
    const radius = 24;
    const flash = this.game.add.circle(x, y, radius * 0.6, 0xfff0a0, 0.9).setDepth(15).setBlendMode('ADD');
    this.game.cameras.getCamera('minimap')?.ignore(flash);
    this.game.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
    const hurt = (d: number) => (d >= radius ? 0 : damage * (1 - d / radius));
    const t = this.playerTarget();
    if (t && !t.driving) this.game.combat.damagePlayer(hurt(Phaser.Math.Distance.Between(x, y, t.x, t.y)));
    for (const ped of this.game.combat.peds) {
      if (ped.alive) this.game.combat.hurtPed(ped, hurt(Phaser.Math.Distance.Between(x, y, ped.x, ped.y)), owner, false);
    }
    for (const v of this.game.vehicles) if (!v.wrecked) v.damage(hurt(Phaser.Math.Distance.Between(x, y, v.x, v.y)) * 0.4);
  }

  /** Molotov: hořící louže na pár sekund. */
  private ignite(x: number, y: number): void {
    const gfx = this.game.add.particles(x, y, 'puff', {
      lifespan: 500, speed: { min: 5, max: 25 }, scale: { start: 0.9, end: 0.1 }, tint: [0xffd23f, 0xff7a1a, 0xe03a1a],
      blendMode: 'ADD', frequency: 40, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 14), quantity: 1 },
    }).setDepth(11);
    this.game.cameras.getCamera('minimap')?.ignore(gfx);
    this.fires.push({ x, y, until: this.now + 3.5, gfx });
  }

  private updateFires(dt: number): void {
    const now = this.now;
    for (const f of this.fires) {
      if (now > f.until) {
        f.gfx.destroy();
        continue;
      }
      const t = this.playerTarget();
      if (t && !t.driving && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < 18) this.game.combat.damagePlayer(14 * dt);
      for (const v of this.game.vehicles) {
        if (!v.wrecked && Phaser.Math.Distance.Between(f.x, f.y, v.x, v.y) < 18) v.damage(10 * dt);
      }
    }
    this.fires = this.fires.filter((f) => now <= f.until);
  }

  // ---------- Respekt ----------

  /** Zásah postavy: respekt (útok na člena, pomoc členovi) a odveta. */
  private onPedHurt(e: PedHurtEvent): void {
    const v = e.ped;
    if (e.byPlayer && v.role === 'gang' && v.group) this.change(v.group, e.killed ? 'killMember' : 'hurtMember', `hurt-${v.group}`, e.killed ? 0 : 1);

    // Pomoc: hráč zranil nebo zabil někoho, kdo útočil na člena skupiny.
    if (e.byPlayer && v.foe instanceof Pedestrian && v.foe.role === 'gang' && v.foe.group && v.foe.group !== v.group) {
      this.change(v.foe.group, e.killed ? 'killAttacker' : 'helpMember', `help-${v.foe.group}`, e.killed ? 0 : 2);
    }

    // Odveta: zraněný člen a jeho kamarádi jdou po útočníkovi.
    if (!e.killed && v.role === 'gang' && v.alive) {
      const foe = e.byPlayer ? 'player' : e.attacker;
      if (foe && foe !== v) {
        v.foe = foe;
        v.foeUntil = this.now + 25;
        if (foe instanceof Pedestrian && foe.role === 'cop') v.attacksPolice = true;
        for (const o of this.members) {
          if (o !== v && o.alive && o.group === v.group && Phaser.Math.Distance.Between(o.x, o.y, v.x, v.y) < 150) {
            o.foe = foe;
            o.foeUntil = this.now + 25;
            if (v.attacksPolice) o.attacksPolice = true;
          }
        }
      }
    }
  }

  /** Hráč ukradl vozidlo skupiny. */
  onSteal(v: Vehicle): void {
    if (v.owner) this.change(v.owner, 'stealProperty', `steal-${v.owner}-${v.x | 0}`, 0);
  }

  /** Vozidlo skupiny shořelo: vadí to, pokud ho zničil hráč. */
  onWrecked(v: Vehicle, byPlayer: boolean): void {
    if (v.owner && byPlayer) this.change(v.owner, 'destroyProperty', '', 0);
  }

  /** Splněná nebo nesplněná zakázka (fáze 6). */
  mission(g: GroupId, event: RespectEvent): void {
    this.change(g, event, '', 0);
  }

  private change(g: GroupId, event: RespectEvent, throttleKey: string, throttle: number): void {
    if (throttleKey && throttle > 0) {
      const last = this.respectThrottle.get(throttleKey) ?? -100;
      if (this.now - last < throttle) return;
      this.respectThrottle.set(throttleKey, this.now);
    }
    const before = this.respect;
    this.respect = applyRespect(this.respect, g, event);
    // Ukázat změny u hráče: „-25 Biomatky, +10 Dřevaři“.
    const pl = this.game.driving ?? this.game.player;
    let row = 0;
    for (const id of GROUP_IDS) {
      const d = Math.round(this.respect[id] - before[id]);
      if (Math.abs(d) < 2) continue;
      this.game.floatText(pl.x, pl.y - 14 - row * 8, `${d > 0 ? '+' : ''}${d} ${groupName(this.game.area.id, id)}`, GROUPS[id].css, 1600);
      row++;
    }
  }
}
