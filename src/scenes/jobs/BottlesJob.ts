import Phaser from 'phaser';
import { TILE } from '../../config';
import { Pedestrian } from '../../entities/Pedestrian';
import { BOTTLES, bottlesEnough } from '../../story/jobs';
import type { Point } from '../../systems/combat';
import { Job, type JobResult } from './Job';

const DRINK = ['Glo glo… tahle byla stejně načatá.', 'Jen ochutnám, jestli není zkažená. Není. Byla.', 'Hik. Kolik jich bylo? Šest? Teď už ne.', 'Na Prcharda! Teda za Prcharda. Teda místo Prcharda.'];
const THANKS = ['Bruh, flaška! W!', 'No cap, tohle je servis.', 'Plotková? Ta je fakt based.', 'Fr fr, díky. A kde je zbytek?'];

/**
 * Flašky pro Omladinu (Plotková, fáze P3): šest flašek na čtyři místa po vesnici
 * v časovém limitu. Plotková jede s hráčem a každou chvíli jednu vypije: flaška ubude
 * a čas se zkrátí. Když flašek zbude míň než zastávek, je konec.
 */
export class BottlesJob extends Job {
  readonly id = 'plotkova-flasky' as const;
  private bottles = BOTTLES.start;
  private left = BOTTLES.time;
  private drinkIn = BOTTLES.drinkEvery;
  private stops: Array<{ at: Point; name: string; done: boolean; ped: Pedestrian | null }> = [];

  start(): void {
    const g = this.g;
    const s = g.world.spots;
    const zone = (n: string) => g.world.zones.find((z) => z.name === n);
    const at = (x: number, y: number): Point => ({ x: x * TILE, y: y * TILE });
    const naves = zone('Náves');
    const skolka = zone('Školka');
    const list: Array<[Point, string]> = [
      [at(s.hriste.x, s.hriste.y), 'hřiště za školou'],
      [skolka ? at(skolka.x + skolka.w / 2, skolka.y + skolka.h + 1) : at(s.hriste.x - 10, s.hriste.y), 'u školky'],
      [naves ? at(naves.x + naves.w / 2, naves.y + naves.h / 2) : at(30, 30), 'na návsi'],
      [s.dealer ? at(s.dealer.x + 2, s.dealer.y + 2) : at(80, 12), 'u Omyxe u řeky'],
    ];
    for (const [p, name] of list) {
      const ped = new Pedestrian(g, p.x + 10, p.y, 0, true, 'gang-omladina', 9999);
      ped.scripted = true;
      g.cameras.getCamera('minimap')?.ignore(ped);
      this.stops.push({ at: p, name, done: false, ped });
    }
  }

  private next(): Point | null {
    const f = this.g.driving ?? this.g.player;
    const open = this.stops.filter((s) => !s.done);
    if (!open.length) return null;
    return open.reduce((a, b) => (Phaser.Math.Distance.Between(a.at.x, a.at.y, f.x, f.y) < Phaser.Math.Distance.Between(b.at.x, b.at.y, f.x, f.y) ? a : b)).at;
  }

  objective(): string {
    const left = this.stops.filter((s) => !s.done).length;
    return `Rozvez flašky Omladině (zbývá ${left} míst, flašek ${this.bottles}, čas ${Math.max(0, Math.ceil(this.left))} s)`;
  }

  target(): Point | null {
    return this.next();
  }

  update(dt: number): JobResult {
    const g = this.g;
    const f = g.driving ?? g.player;
    this.left -= dt;
    // Plotková „hlídá zboží“.
    this.drinkIn -= dt;
    if (this.drinkIn <= 0) {
      this.drinkIn = BOTTLES.drinkEvery;
      this.bottles--;
      this.left -= BOTTLES.drinkPenalty;
      g.speech.say(f, `Plotková: ${DRINK[Math.floor(g.random() * DRINK.length)]}`, 0x8a3a5a, 2600);
      g.floatText(f.x, f.y - 16, `−1 flaška, −${BOTTLES.drinkPenalty} s`, '#ff9a6a', 1600);
    }
    for (const s of this.stops) {
      if (s.done || Phaser.Math.Distance.Between(s.at.x, s.at.y, f.x, f.y) > 34) continue;
      s.done = true;
      this.bottles--;
      if (s.ped) g.speech.say(s.ped, THANKS[Math.floor(g.random() * THANKS.length)], 0x5a2a7a, 2200);
      g.floatText(f.x, f.y - 16, `Flaška doručena (${s.name})`, '#9fffa0', 1600);
      g.gangs.mission('omladina', 'helpMember');
    }
    const left = this.stops.filter((s) => !s.done).length;
    if (!left) {
      this.doneText = 'Plotková: „Všechno doručeno! Skoro všechno. Hik. Prchardovi ani muk.“';
      return 'done';
    }
    if (!bottlesEnough(this.bottles, left)) {
      this.failReason = 'Došly flašky. Plotková: „To nebylo pití, to byla kontrola kvality.“';
      return 'fail';
    }
    if (this.left <= 0) {
      this.failReason = 'Došel čas. Omladina si objednala jinde. Plotková dopila zbytek z lítosti.';
      return 'fail';
    }
    return 'run';
  }

  cleanup(): void {
    const g = this.g;
    for (const s of this.stops) {
      const p = s.ped;
      if (p?.active) g.tweens.add({ targets: p, alpha: 0, delay: 3000, duration: 800, onComplete: () => p.destroy() });
    }
  }
}
