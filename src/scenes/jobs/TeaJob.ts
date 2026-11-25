import Phaser from 'phaser';
import { TILE } from '../../config';
import type { Pedestrian } from '../../entities/Pedestrian';
import { askPrice, type Bargain, BASE_PRICE, buyerFor, fullPrice, hook, pitch, push, quit, startBargain, strike } from '../../story/bargain';
import type { Dialog, DialogOption } from '../../story/dialog';
import { inMeleeArc, type Point } from '../../systems/combat';
import { Job, type JobResult } from './Job';

const GOAL = 3;
const COUNT = 'cajPlna';

/** Co řeknou ostatní, když jim hráč nabídne čaj. */
const REFUSE_CIVIL = [
  'Ne, díky, já mám svůj.',
  'Čaj? Já jsem z Raškovic, my pijem rum.',
  '{Mladej|Mladá}, já pamatuju komunisty. Nekupuju nic bez razítka.',
  'Beskydskej? Ten mi prodával už Omyx. Pak jsem tři dny hledal auto.',
];
const REFUSE_GROUP: Record<string, string[]> = {
  hasici: ['Čaj? My pijem jen to, co hasíme. A to je pivo.', 'Hasič si čaj nekupuje. Hasič ho zabaví.'],
  stamgasti: ['Čaj? To se pije, když dojde pivo? To se nestane.', 'Hospodo! Tady {nějakej|nějaká} nabízí čaj!'],
};

/**
 * Omyxova mise (ADR-019): tři gramy beskydského čaje prodat Omladině aspoň za plnou cenu.
 * Čaj je věc v ruce (klávesa 6 nebo Q): „útok“ na člena Omladiny otevře handlování,
 * dohoda skončí viditelnou předávkou sáčku a bankovky.
 */
export class TeaJob extends Job {
  readonly id = 'omyx-caj' as const;
  private served = new WeakSet<Pedestrian>();
  private seeds = new WeakMap<Pedestrian, number>();
  private nextSeed = Math.floor(Math.random() * 1000);
  private buyer: Pedestrian | null = null;
  private bargain: Bargain | null = null;
  /** Probíhá předávka (s). */
  private handover = 0;
  private readonly onUse = (id: string) => this.use(id);

  private get sold(): number {
    return this.story.state.counts[COUNT] ?? 0;
  }

  private get tea(): number {
    return this.g.player.arsenal.ammo.caj ?? 0;
  }

  start(resume = false): void {
    if (!resume) {
      this.story.state.counts[COUNT] = 0;
      this.g.combat.setItem('caj', this.tea + GOAL);
      this.g.toast('Beskydský čaj v ruce (6 nebo Q). Nabídni ho Omladině jako ránu, jen bez rány.');
    }
    this.g.events.on('useItem', this.onUse);
    this.story.setDynamic('bargain', () => this.bargainDialog());
  }

  objective(): string {
    return `Prodej Omladině beskydský čaj aspoň za ${BASE_PRICE} Kč (${this.sold}/${GOAL}, v kapse ${this.tea} g)`;
  }

  target(): Point | null {
    const h = this.g.world.spots.hriste;
    return { x: h.x * TILE, y: h.y * TILE };
  }

  update(dt: number): JobResult {
    if (this.handover > 0) {
      this.handover -= dt;
      if (this.buyer) (this.buyer.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (this.handover <= 0 && this.buyer) {
        this.buyer.scripted = false;
        this.buyer = null;
      }
      return 'run';
    }
    if (this.sold >= GOAL) {
      this.doneText = 'Omyx (SMS): „DOBRÁ PRÁCE. Teď nebuď u toho, až to začnou kouřit.“';
      return 'done';
    }
    if (this.tea <= 0 && !this.bargain) {
      this.failReason = this.g.player.dead
        ? 'Čaj je pryč. Kdo ho sebral, ten si užije.'
        : `Došel čaj. Za plnou cenu prodáno ${this.sold}/${GOAL}. Omyx: „Příště míň slev.“`;
      return 'fail';
    }
    return 'run';
  }

  cleanup(): void {
    this.g.cinemaZoom = 1;
    this.g.events.off('useItem', this.onUse);
    if (this.buyer) this.buyer.scripted = false;
  }

  // ---------- Nabídka ----------

  private use(id: string): void {
    if (id !== 'caj' || this.bargain || this.handover > 0 || this.tea <= 0) return;
    const g = this.g;
    const pl = g.player;
    const who = g.combat.peds
      .filter((p) => p.alive && p.active && p.visible && inMeleeArc(pl, pl.rotation, p, 30, Math.PI / 2))
      .sort((a, b) => Phaser.Math.Distance.Between(pl.x, pl.y, a.x, a.y) - Phaser.Math.Distance.Between(pl.x, pl.y, b.x, b.y))[0];
    if (!who) {
      g.toast('Čaj se nabízí z ruky do ruky. Dojdi k někomu z Omladiny (hřiště za školou).');
      return;
    }
    const pick = (list: string[]) => list[Math.floor(g.random() * list.length)];
    if (who.role === 'cop') {
      g.speech.say(who, 'Beskydskej čaj? Pojď se mnou na služebnu. Na čaj.', 0x2a4a8a);
      g.police.raiseTo(1, pl);
      return;
    }
    if (who.group !== 'omladina') {
      g.speech.say(who, pick(who.group ? REFUSE_GROUP[who.group] ?? REFUSE_CIVIL : REFUSE_CIVIL));
      return;
    }
    if (this.served.has(who)) {
      g.speech.say(who, pick(['Už jsem řekl. Fakt.', 'Bruh, už ne.', 'Podruhý ne. Mám zásady. Jednu.']), 0x5a2a7a);
      return;
    }
    if (who.foe === 'player') {
      g.speech.say(who, 'Teď ne, teď tě mlátíme.', 0x5a2a7a);
      return;
    }
    const cops = g.combat.peds.some((p) => p.alive && p.role === 'cop' && Phaser.Math.Distance.Between(p.x, p.y, pl.x, pl.y) < 170)
      || g.vehicles.some((v) => v.isPolice && !v.wrecked && Phaser.Math.Distance.Between(v.x, v.y, pl.x, pl.y) < 170);
    if (cops) {
      g.speech.say(who, 'Ty vole, fízlové. Pak.', 0x5a2a7a);
      return;
    }
    if (!this.seeds.has(who)) this.seeds.set(who, this.nextSeed++);
    this.buyer = who;
    who.scripted = true;
    (who.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    who.setRotation(Phaser.Math.Angle.Between(who.x, who.y, pl.x, pl.y));
    pl.setRotation(Phaser.Math.Angle.Between(pl.x, pl.y, who.x, who.y));
    this.bargain = startBargain(buyerFor(this.seeds.get(who)!), () => g.random());
    this.story.talk('bargain', 'Game', () => this.afterBargain());
  }

  /** Handlování jako dialog: každá volba posune stav a otevře další kolo. */
  private bargainDialog(): Dialog | null {
    const b = this.bargain;
    if (!b) return null;
    const rnd = () => this.g.random();
    const step = (text: string, act: (b: Bargain) => Bargain): DialogOption => ({
      text,
      do: () => {
        this.bargain = act(this.bargain!);
      },
      then: 'bargain',
    });
    const end = (text: string): DialogOption => ({ text });
    let options: [DialogOption, DialogOption, DialogOption];
    let text = b.line;
    switch (b.phase) {
      case 'nechce':
        options = [step(b.argLines[0], (x) => hook(x, 0, rnd)), step(b.argLines[1], (x) => hook(x, 1, rnd)), step('Tak nic.', quit)];
        break;
      case 'mozna':
        options = [
          step('Dvě stovky gram. Pevná cena, jak v Lidlu.', (x) => askPrice(x, 'pevna', rnd)),
          step('Tři stovky. Je to limitka.', (x) => askPrice(x, 'limitka', rnd)),
          step('Kolik dáš ty?', (x) => askPrice(x, 'kolik', rnd)),
        ];
        break;
      case 'handl':
        text = `${b.line}\n(Nabízí ${b.offer} Kč. Plná cena je ${BASE_PRICE} Kč.)`;
        options = [step(b.argLines[0], (x) => pitch(x, 0, rnd)), step(b.argLines[1], (x) => pitch(x, 1, rnd)), step(`Plácnem si za ${b.offer} Kč.`, (x) => strike(x, rnd))];
        break;
      case 'strop':
        text = `${b.line}\n(Nabízí ${b.offer} Kč.)`;
        options = [step(`Plácnem si za ${b.offer} Kč.`, (x) => strike(x, rnd)), step('Ještě dvacku!', (x) => push(x, rnd)), step('Tak nic.', quit)];
        break;
      default:
        options = b.result === 'deal' ? [end('Platí.'), end('Užij si to.'), end('A neříkej, odkud to máš.')] : [end('Tak čau.'), end('Jeho škoda.'), end('…')];
    }
    return {
      id: 'bargain',
      start: 'n',
      guest: { name: b.type.name, css: '#c07af0', sprite: 'gang-omladina' },
      nodes: { n: { speaker: 'guest', text, options } },
    };
  }

  private afterBargain(): void {
    const b = this.bargain;
    const who = this.buyer;
    this.bargain = null;
    if (!b || !who) return;
    this.served.add(who);
    if (b.result !== 'deal') {
      who.scripted = false;
      this.buyer = null;
      return;
    }
    this.handOver(who, b.price);
  }

  /** Předávka: sáček letí k Omladině, bankovka zpátky. Teprve pak jsou peníze v kapse. */
  private handOver(who: Pedestrian, price: number): void {
    const g = this.g;
    const pl = g.player;
    this.handover = 2.2;
    // Kamera se přiblíží, ať je předávka vidět: sáček letí obloukem, bankovka se vrací.
    g.cinemaZoom = 1.6;
    const bag = g.add.image(pl.x, pl.y, 'caj-balicek').setDepth(46).setScale(1.6);
    const cash = g.add.image(who.x, who.y, 'bankovka').setDepth(46).setScale(1.5).setVisible(false);
    g.cameras.getCamera('minimap')?.ignore([bag, cash]);
    g.tweens.add({ targets: bag, x: who.x, y: who.y, duration: 750, delay: 250, ease: 'Sine.inOut' });
    g.tweens.add({ targets: bag, scale: 3, duration: 375, delay: 250, yoyo: true, ease: 'Sine.out', onComplete: () => bag.destroy() });
    g.time.delayedCall(1050, () => {
      cash.setVisible(true);
      g.speech.say(who, 'Díky. Neviděli jsme se.', 0x5a2a7a, 1400);
      g.tweens.add({ targets: cash, x: pl.x, y: pl.y, angle: 360, duration: 650, ease: 'Sine.inOut', onComplete: () => cash.destroy() });
      g.tweens.add({ targets: cash, scale: 2.6, duration: 325, yoyo: true });
    });
    g.time.delayedCall(2000, () => (g.cinemaZoom = 1));
    g.time.delayedCall(1700, () => {
      pl.money += price;
      g.combat.setItem('caj', this.tea - 1);
      g.floatText(pl.x, pl.y - 14, `+${price} Kč`, '#9fffa0', 1400);
      g.gangs.mission('omladina', 'helpMember');
      if (fullPrice(price)) this.story.state.counts[COUNT] = this.sold + 1;
      else g.toast(`Prodáno se slevou za ${price} Kč. Do mise se to nepočítá. Omyx by plakal.`);
    });
  }
}
