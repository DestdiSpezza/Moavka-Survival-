import Phaser from 'phaser';
import type { Pedestrian } from '../../entities/Pedestrian';
import type { Vehicle } from '../../entities/Vehicle';
import type { Dialog, DialogOption } from '../../story/dialog';
import { carriesPassenger, rideTimeLimit } from '../../story/jobs';
import type { Point } from '../../systems/combat';
import { Job, type JobResult } from './Job';
import { ajinaHouse, doorOf, roadRoute, routeLength } from './route';

type Phase = 'pickup' | 'ride' | 'arrive' | 'talk' | 'after' | 'chase' | 'end';
type Outcome = 'truth' | 'truthLate' | 'lie' | 'silent';

const CHASE_TIME = 60;

const RIDE_LINES = [
  'Hehe, dobrý, dobrý!',
  'Tady doprava! Ne, doleva! Ne, rovně, rovně!',
  'Kdyby se ptala, byli jsme na rybách.',
  'Jeď, jeď! Ajina počítá minuty. Pak počítá rány.',
  'Hehe, jak ty řídíš, to by Ajina nepřežila. Já taky ne.',
  'Neboj, já jsem střízlivej. Skoro. Hehe.',
];
const CHASE_LINES = ['Tohle je za ty fernety!', 'A tohle za Prcharda!', 'Domů se chodí v deset, ne v jedenáct!', 'Mlčet umíš, tak teď utíkej!', 'Vylez z toho auta!'];

/**
 * Zjebal domů (ADR-021): Zjebal čeká před eRkem, hráč pro něj přijede autem a odveze ho
 * k Ajině v časovém limitu (trasa po silnici + 10 %). U domu vyletí Ajina a vyptává se:
 * pravda, lež, nebo mlčení. Kdo mlčí, toho minutu honí s baseballkou po vesnici.
 */
export class ZjebalJob extends Job {
  readonly id = 'zjebal-domu' as const;
  private phase: Phase = 'pickup';
  private zjebal: Pedestrian | null = null;
  private ajina: Pedestrian | null = null;
  private car: Vehicle | null = null;
  private home: Point = { x: 0, y: 0 };
  private door: Point = { x: 0, y: 0 };
  private left = 0;
  private limit = 0;
  private timer = 0;
  private lineAt = 0;
  private hitAt = 0;
  private outcome: Outcome | null = null;
  private nagged = false;
  /** Měřítková trasa (podle ní je časový limit; hráč může jet jinudy). */
  route: Point[] = [];

  start(): void {
    const g = this.g;
    const house = ajinaHouse(g.world);
    if (house) {
      this.door = doorOf(house, 0.2);
      this.home = doorOf(house, 1.4);
    }
    const d = this.story.pubDoor;
    this.zjebal = g.townsfolk.spawn('zjebal', d.x + 18, d.y + 10);
    this.story.setDynamic('ajina', () => this.ajinaDialog());
  }

  objective(): string {
    switch (this.phase) {
      case 'pickup':
        return 'Přistav auto před eRko pro Zjebala';
      case 'ride':
        return `Odvez Zjebala domů k Ajině: ${this.clock(this.left)}`;
      case 'chase':
        return `Uteč Ajině s baseballkou! ${this.clock(this.left)}`;
      default:
        return 'Zjebal je doma. Skoro.';
    }
  }

  target(): Point | null {
    if (this.phase === 'pickup') return this.zjebal;
    if (this.phase === 'ride') return this.home;
    return null;
  }

  private clock(s: number): string {
    const t = Math.max(0, Math.ceil(s));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  update(dt: number): JobResult {
    switch (this.phase) {
      case 'pickup':
        return this.pickup();
      case 'ride':
        return this.ride(dt);
      case 'arrive':
        this.timer += dt;
        return this.arrive();
      case 'after':
        this.timer += dt;
        return this.afterTalk();
      case 'chase':
        return this.chase(dt);
      case 'end':
        return 'done';
      default:
        return 'run';
    }
  }

  private pickup(): JobResult {
    const g = this.g;
    const z = this.zjebal;
    if (!z || !z.alive) {
      this.failReason = 'Zjebal to nepřežil. Ajina to nepřežije taky. Teda ty.';
      return 'fail';
    }
    const v = g.driving;
    const dist = Phaser.Math.Distance.Between((v ?? g.player).x, (v ?? g.player).y, z.x, z.y);
    z.setRotation(Phaser.Math.Angle.Between(z.x, z.y, (v ?? g.player).x, (v ?? g.player).y));
    if (dist > 40) {
      this.nagged = false;
      return 'run';
    }
    if (!v) {
      if (!this.nagged) g.speech.say(z, 'Pěšky ne. Auto, {jmeno}! Hehe.', 0x3a3a3a);
      this.nagged = true;
      return 'run';
    }
    if (!carriesPassenger(v.spec.kind)) {
      if (!this.nagged) g.speech.say(z, 'Na tohle si nesednu. Devadesát kilo a osm piv.', 0x3a3a3a);
      this.nagged = true;
      return 'run';
    }
    if (Math.abs(v.speed) > 25) return 'run';
    // Nastoupí: zmizí v autě.
    this.car = v;
    g.tweens.add({ targets: z, x: v.x, y: v.y, alpha: 0, duration: 350, onComplete: () => g.townsfolk.remove(z) });
    this.zjebal = null;
    this.route = roadRoute(g.world, v, this.home);
    this.limit = rideTimeLimit(routeLength(this.route, v, this.home), v.spec.params.maxSpeed);
    this.left = this.limit;
    this.lineAt = 1;
    this.phase = 'ride';
    g.speech.say(v, 'Hehe! Jedem! Na jihovýchod, k řece!', 0x3a3a3a);
    return 'run';
  }

  private ride(dt: number): JobResult {
    const g = this.g;
    const v = this.car!;
    if (v.wrecked || !v.active) {
      this.failReason = 'Auto je na šrot. Zjebal přežil, hehe. Domů dojde pěšky. Za tři dny.';
      return 'fail';
    }
    this.left -= dt;
    if (this.left <= 0) {
      this.failReason = 'Je po desáté. Zjebal: „Jsem mrtvej muž.“ Vystoupil a jde to Ajině vysvětlit sám.';
      return 'fail';
    }
    this.lineAt -= dt;
    if (this.lineAt <= 0) {
      this.lineAt = 4.5;
      g.speech.say(v, RIDE_LINES[Math.floor(g.random() * RIDE_LINES.length)], 0x3a3a3a, 2400);
    }
    if (g.driving === v && Phaser.Math.Distance.Between(v.x, v.y, this.home.x, this.home.y) < 34 && Math.abs(v.speed) < 25) this.startArrival();
    return 'run';
  }

  /** U domu: Zjebal vystoupí a z domu vyletí Ajina. */
  private startArrival(): void {
    const g = this.g;
    const v = this.car!;
    this.phase = 'arrive';
    this.timer = 0;
    this.story.cutscene = true;
    g.registry.set('cutscene', { title: '', hint: '' });
    (v.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    v.drive = { ...v.drive, vx: 0, vy: 0 };
    this.zjebal = g.townsfolk.spawn('zjebal', v.x + 10, v.y + 12);
    g.speech.say(this.zjebal, 'Hehe… jsme tady. Potichu, jo?', 0x3a3a3a, 1600);
  }

  private arrive(): JobResult {
    const g = this.g;
    if (this.timer > 0.9 && !this.ajina) {
      // Dveře se rozletí, Ajina vyletí.
      this.ajina = g.townsfolk.spawn('ajina', this.door.x, this.door.y, 99999);
      if (!this.story.knows('ajina')) this.story.state.known.push('ajina');
      const to = this.car ?? g.player;
      g.tweens.add({ targets: this.ajina, x: (this.door.x + to.x) / 2, y: (this.door.y + to.y) / 2 - 6, duration: 260, ease: 'Quad.out' });
      g.cameras.main.shake(180, 0.006);
      g.speech.say(this.ajina, 'KDE JSTE BYLI?!', 0xd83a6a, 1800);
    }
    if (this.timer > 2.2) {
      this.phase = 'talk';
      this.story.talk('ajina', 'Game', () => {
        this.phase = 'after';
        this.timer = 0;
      });
    }
    return 'run';
  }

  private ajinaDialog(): Dialog {
    const set = (o: Outcome): DialogOption['do'] => () => {
      this.outcome = o;
    };
    const end = (text: string): DialogOption => ({ text });
    return {
      id: 'ajina',
      start: 'a0',
      nodes: {
        a0: {
          speaker: 'ajina',
          text: 'Já jsem Ajina. Z práce od Vesty je to domů pět minut. Pěšky. Po čtyřech deset. Je skoro deset večer. Byl v eRku, že jo? Kolik toho měl?',
          options: [
            { text: 'Byl. Osm piv a dva fernety. Možná tři.', do: set('truth'), next: 'truth' },
            { text: 'Ale vůbec, pomáhal mi s autem. Je to zlatej chlap.', next: 'lie' },
            { text: '…', do: set('silent'), next: 'silent' },
          ],
        },
        truth: {
          speaker: 'ajina',
          text: 'OSM?! Mně říkal tři. TŘI! Zjebale, domů! … Děkuju, {jmeno}. Aspoň někdo je tady upřímnej. Na, za benzín.',
          options: [end('Rádo se stalo.'), end('Dobrou noc.'), end('On za to nemůže, Prchard točí moc rychle.')],
        },
        lie: {
          speaker: 'ajina',
          text: 'S autem. V deset večer. A proč z něj táhne jak z pivovaru?',
          options: [
            { text: 'Autu teklo pivo z chladiče. Stará škodovka.', do: set('lie'), next: 'lie2' },
            { text: 'Dobře. Byl v eRku.', do: set('truthLate'), next: 'truth2' },
            { text: '…', do: set('silent'), next: 'silent' },
          ],
        },
        lie2: {
          speaker: 'ajina',
          text: 'Pivo z chladiče. To mi řekl i minulej tejden. A taky jsem mu nevěřila. *hodí po tobě bačkoru*',
          options: [end('Au.'), end('To byla bačkora?'), end('Dobrou noc.')],
        },
        truth2: {
          speaker: 'ajina',
          text: 'No vidíš, že to jde. Zjebale, domů! A ty, {jmeno}, příště lži líp. Nebo vůbec.',
          options: [end('Jasně.'), end('Dobrou noc.'), end('Promiň.')],
        },
        silent: {
          speaker: 'ajina',
          text: 'Mlčíš? TAK MLČÍŠ?! Počkej, já ti dám mlčet! Kde mám pálku…',
          options: [end('…'), end('Ajino, počkej…'), end('Utíkám.')],
        },
      },
    };
  }

  /** Po rozhovoru: podle odpovědi peníze, bačkora, nebo honička. */
  private afterTalk(): JobResult {
    const g = this.g;
    const s = this.story;
    const z = this.zjebal;
    const a = this.ajina;
    if (this.timer < 0.05) {
      this.story.cutscene = false;
      g.registry.set('cutscene', null);
      // Zjebal se šourá domů.
      if (z) g.tweens.add({ targets: z, x: this.door.x, y: this.door.y, alpha: 0, duration: 1400, onComplete: () => g.townsfolk.remove(z) });
      this.zjebal = null;
      const rel = (npc: 'ajina' | 'zjebal', d: number) => (s.state.rel[npc] = Phaser.Math.Clamp((s.state.rel[npc] ?? 0) + d, -100, 100));
      switch (this.outcome) {
        case 'truth':
          g.player.money += 100;
          rel('ajina', 10);
          rel('zjebal', -5);
          this.doneText = 'Ajina ti dala stovku na benzín. Zjebal ti to nezapomene. Do zítřka.';
          break;
        case 'truthLate':
          g.player.money += 50;
          rel('ajina', 3);
          this.doneText = 'Ajina dala padesát. Za pravdu na druhý pokus.';
          break;
        case 'lie':
          g.combat.damagePlayer(5);
          rel('ajina', -10);
          rel('zjebal', 10);
          this.doneText = 'Bačkora trefila. Zjebal: „Kryl{|a} jsi mě, kámo. Hehe.“';
          break;
        default:
          rel('ajina', -20);
          rel('zjebal', 5);
          if (a) {
            a.setTexture('npc-ajina-bat');
            this.phase = 'chase';
            this.left = CHASE_TIME;
            this.hitAt = 0.8;
            this.doneText = 'Ajina to vzdala. Zjebal byl doma dřív než ty. Hehe.';
            return 'run';
          }
      }
    }
    if (this.timer > 0.4) {
      // Ajina se vrátí domů a zabouchne.
      if (a && a.active) g.tweens.add({ targets: a, x: this.door.x, y: this.door.y, alpha: 0, duration: 700, onComplete: () => g.townsfolk.remove(a) });
      this.ajina = null;
      this.phase = 'end';
    }
    return 'run';
  }

  /** Ajina s pálkou: minutu hráče honí, kde ho dostihne, tam bije (i auto). */
  private chase(dt: number): JobResult {
    const g = this.g;
    const a = this.ajina!;
    this.left -= dt;
    this.hitAt -= dt;
    if (this.left <= 0 || g.player.dead) {
      g.speech.say(a, g.player.dead ? 'Tak. A příště mluv.' : 'A ať tě tu už nevidím!', 0xd83a6a);
      g.tweens.add({ targets: a, x: this.door.x, y: this.door.y, alpha: 0, duration: 2500, onComplete: () => g.townsfolk.remove(a) });
      this.ajina = null;
      this.phase = 'end';
      return 'run';
    }
    const focus = g.driving ?? g.player;
    const d = Phaser.Math.Distance.Between(a.x, a.y, focus.x, focus.y);
    a.hp = a.maxHp;
    if (d > 16) g.walkTo(a, focus, 96);
    else (a.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    a.setRotation(Phaser.Math.Angle.Between(a.x, a.y, focus.x, focus.y));
    if (d < (g.driving ? 22 : 18) && this.hitAt <= 0) {
      this.hitAt = 1;
      if (g.driving) g.driving.damage(6);
      else g.combat.damagePlayer(9);
      g.speech.say(a, CHASE_LINES[Math.floor(g.random() * CHASE_LINES.length)], 0xd83a6a, 1600);
    }
    return 'run';
  }

  cleanup(): void {
    const g = this.g;
    if (this.story.cutscene) {
      this.story.cutscene = false;
      g.registry.set('cutscene', null);
    }
    if (this.zjebal) g.townsfolk.remove(this.zjebal);
    if (this.ajina) g.townsfolk.remove(this.ajina);
  }
}
