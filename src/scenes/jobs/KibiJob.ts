import Phaser from 'phaser';
import { Pedestrian } from '../../entities/Pedestrian';
import type { Dialog, DialogOption } from '../../story/dialog';
import type { Point } from '../../systems/combat';
import { pixelFont } from '../BootScene';
import { Job, type JobResult } from './Job';

interface Woman {
  name: string;
  ped: Pedestrian;
  label: Phaser.GameObjects.Text;
  /** Hledá, jde pryč (odvedená), sedí v autě. */
  state: 'search' | 'gone' | 'car';
  /** Po odhalené lži už nevěří a jde rychleji. */
  angry: boolean;
  delay: number;
}

const WOMEN = [
  { name: 'Zuzka', look: 'npc-plotkova', line: 'Kde je Kibi?! Slíbil mi Lysou horu!' },
  { name: 'Monika', look: 'npc-kobyla', line: 'Kibiii! Vím, že jsi v hospodě!' },
  { name: 'Jarka', look: 'npc-ajina', line: 'Až ho najdu, bude si přát, aby byl v Raškovicích!' },
];

/**
 * Schovej Kibiho (fáze P3): tři naštvané ženské jdou z různých stran k eRku. Hráč je
 * musí odvést dřív, než dojdou ke dveřím: lží (nemusí vyjít), panákem (jistota za 60 Kč),
 * nebo je odveze autem daleko od hospody.
 */
export class KibiJob extends Job {
  readonly id = 'kibi-schovej' as const;
  private women: Woman[] = [];
  private talking: Woman | null = null;
  private time = 0;

  start(): void {
    const g = this.g;
    const d = this.story.pubDoor;
    const from: Point[] = [
      { x: d.x + 620, y: d.y - 60 },
      { x: d.x + 260, y: d.y + 520 },
      { x: d.x - 220, y: d.y + 420 },
    ];
    WOMEN.forEach((w, i) => {
      const p = from[i];
      const ped = new Pedestrian(g, p.x, p.y, 0, true, w.look, 9999);
      ped.scripted = true;
      ped.setVisible(false);
      g.cameras.getCamera('minimap')?.ignore(ped);
      const label = g.add.text(p.x, p.y - 13, w.name, pixelFont(14, '#ff7ab0')).setOrigin(0.5).setScale(0.5).setStroke('#000', 3).setDepth(44).setVisible(false);
      g.cameras.getCamera('minimap')?.ignore(label);
      this.women.push({ name: w.name, ped, label, state: 'search', angry: false, delay: i * 9 });
    });
    this.story.setDynamic('kibi-woman', () => this.womanDialog());
  }

  private left(): Woman[] {
    return this.women.filter((w) => w.state !== 'gone');
  }

  objective(): string {
    return `Odveď Kibiho ženský od eRka, než ho najdou (zbývá ${this.left().length})`;
  }

  target(): Point | null {
    const pl = this.g.driving ?? this.g.player;
    const active = this.women.filter((w) => w.state === 'search' && w.ped.visible);
    if (!active.length) return this.story.pubDoor;
    return active.reduce((a, b) => (Phaser.Math.Distance.Between(a.ped.x, a.ped.y, pl.x, pl.y) < Phaser.Math.Distance.Between(b.ped.x, b.ped.y, pl.x, pl.y) ? a : b)).ped;
  }

  update(dt: number): JobResult {
    const g = this.g;
    this.time += dt;
    const door = this.story.pubDoor;
    for (const w of this.women) {
      const p = w.ped;
      w.label.setPosition(Math.round(p.x), Math.round(p.y - 13)).setVisible(p.visible && w.state !== 'car');
      if (w.state === 'gone') continue;
      if (w.state === 'car') {
        const v = g.driving;
        if (!v) {
          // Vystoupila: je dost daleko od eRka?
          w.state = Phaser.Math.Distance.Between(g.player.x, g.player.y, door.x, door.y) > 420 ? 'gone' : 'search';
          p.setVisible(true);
          (p.body as Phaser.Physics.Arcade.Body).enable = true;
          (p.body as Phaser.Physics.Arcade.Body).reset(g.player.x + 12, g.player.y);
          g.speech.say(p, w.state === 'gone' ? 'Tady? Dobře, tady ho budu hledat. Kibiii!' : 'To je pořád u hospody! Myslíš, že jsem blbá?', 0xd83a6a, 2200);
          if (w.state === 'gone') this.leave(w);
        } else p.setPosition(v.x, v.y);
        continue;
      }
      if (this.time < w.delay) continue;
      if (!p.visible) {
        p.setVisible(true);
        g.speech.say(p, WOMEN[this.women.indexOf(w)].line, 0xd83a6a, 2600);
      }
      if (this.talking === w) {
        (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        continue;
      }
      if (Phaser.Math.Distance.Between(p.x, p.y, door.x, door.y) < 22) {
        this.failReason = `${w.name} našla Kibiho pod stolem. Kibi má monokl. Ty taky, za to, žes lhal{|a}.`;
        return 'fail';
      }
      g.walkTo(p, door, w.angry ? 46 : 32);
    }
    return this.left().length ? 'run' : 'done';
  }

  private leave(w: Woman): void {
    const g = this.g;
    w.state = 'gone';
    g.tweens.add({ targets: [w.ped, w.label], alpha: 0, delay: 1800, duration: 900, onComplete: () => {
      w.ped.destroy();
      w.label.destroy();
    } });
    if (!this.left().length) this.doneText = 'Kibi: „Všechny pryč? Jsi borec. Teda borkyně. Teda… nejsem tady.“';
  }

  /** E u ženské: rozhovor; z auta (zastavený vedle ní) ji nabídne svézt. */
  interact(): boolean {
    const g = this.g;
    const f = g.driving ?? g.player;
    const w = this.women.find((x) => x.state === 'search' && x.ped.visible && Phaser.Math.Distance.Between(x.ped.x, x.ped.y, f.x, f.y) < (g.driving ? 40 : 24));
    if (!w) return false;
    if (g.driving) {
      if (Math.abs(g.driving.speed) > 20) return false;
      w.state = 'car';
      w.ped.setVisible(false);
      (w.ped.body as Phaser.Physics.Arcade.Body).enable = false;
      g.toast(`${w.name} nasedla: „Ty víš, kde je? Tak jeď!“ Odvez ji daleko od eRka.`);
      return true;
    }
    this.talking = w;
    this.story.talk('kibi-woman', 'Game', () => (this.talking = null));
    return true;
  }

  private womanDialog(): Dialog | null {
    const w = this.talking;
    if (!w) return null;
    const g = this.g;
    const end = (text: string): DialogOption => ({ text });
    const lie = (text: string, chance: number): DialogOption => ({
      text,
      when: () => !w.angry,
      next: 'lie',
      do: () => {
        if (g.random() < chance) {
          this.leave(w);
          this.lieOk = true;
        } else {
          w.angry = true;
          this.lieOk = false;
        }
      },
    });
    return {
      id: 'kibi-woman',
      start: 'w',
      guest: { name: w.name, css: '#ff7ab0', sprite: w.ped.texture.key },
      nodes: {
        w: {
          speaker: 'guest',
          text: w.angry ? 'Ty zase? Lháři mi nemluvte. KDE JE KIBI?' : 'Neviděl{|a} jsi Kibiho? Takovej… divnej. Hezkej. Divnej.',
          options: [
            lie('Kibi? Ten odjel do Raškovic. Za jinou.', 0.6),
            { text: 'Pojď, dám ti panáka. Na zlost. (60 Kč)', cost: 60, next: 'shot', do: () => this.leave(w) },
            end('Nevím. {Neviděl|Neviděla} jsem ho. Kdo je Kibi?'),
          ],
        },
        lie: {
          speaker: 'guest',
          text: () => (this.lieOk ? 'Za jinou?! Tak to jedu za ní! Teda za nima!' : 'Hm. Lžeš. Jdu se podívat do hospody sama. A rychle.'),
          options: [end('Hodně štěstí.'), end('…'), end('Já nic.')],
        },
        shot: {
          speaker: 'guest',
          text: 'Na zlost? To beru. Na Kibiho se vykašlu. Do zítřka.',
          options: [end('Na zdraví.'), end('Do zítřka.'), end('…')],
        },
      },
    };
  }

  private lieOk = false;

  cleanup(): void {
    for (const w of this.women) {
      if (w.ped.active) w.ped.destroy();
      if (w.label.active) w.label.destroy();
    }
  }
}
