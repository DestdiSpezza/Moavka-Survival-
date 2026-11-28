import Phaser from 'phaser';
import type { Dialog, DialogOption } from '../../story/dialog';
import type { NpcId } from '../../story/npcs';
import type { Point } from '../../systems/combat';
import { Job, type JobResult } from './Job';
import { doorOf } from './route';

const end = (text: string): DialogOption => ({ text });
const OMLADINA_FRAME = 0x9a4ad0;

/**
 * Nákup v Raškovicích pro Omladinu (ADR-037): dojet do Raškovic, koupit věc za svoje,
 * dovézt zpátky. Co má hráč koupené, je příznak v příběhu, takže to přežije přejezd.
 */
abstract class FetchJob extends Job {
  protected abstract readonly item: string;
  protected abstract readonly itemName: string;
  protected abstract readonly price: number;
  /** Budova v Raškovicích, kde se kupuje. */
  protected abstract readonly shop: string;
  protected abstract readonly shopName: string;
  protected result: JobResult = 'run';
  private sign: Phaser.GameObjects.GameObject[] = [];

  protected get has(): boolean {
    return this.story.has(this.item);
  }

  private get shopDoor(): Point | null {
    const b = this.g.area.id === 'raskovice' ? this.g.world.buildings.find((x) => x.name === this.shop) : null;
    return b ? doorOf(b, 1.2) : null;
  }

  start(): void {
    const door = this.shopDoor;
    if (!door) return;
    const g = this.g;
    const label = g.add.text(door.x, door.y - 26, this.shopName.toUpperCase(), { fontFamily: 'monospace', fontSize: '8px', color: '#ffd23f' }).setOrigin(0.5).setDepth(40);
    this.sign.push(label);
    if (this.item === 'item:nafta') this.sign.push(g.add.image(door.x + 18, door.y - 6, 'pumpa').setDepth(5));
    for (const o of this.sign) g.cameras.getCamera('minimap')?.ignore(o);
  }

  /** Kam to dovézt v Morávce (BMW, Mini Vesta). */
  protected abstract dropAt(): Point | null;
  protected abstract dropText(): string;

  objective(): string {
    const inRask = this.g.area.id === 'raskovice';
    if (!this.has) return inRask ? `Kup ${this.itemName}: ${this.shopName} (E u dveří, ${this.price} Kč)` : 'Dojeď do Raškovic (výjezd vlevo nahoře)';
    return inRask ? 'Vrať se do Morávky (výjezd dole)' : this.dropText();
  }

  target(): Point | null {
    const ex = this.g.world.exits;
    if (this.g.area.id === 'raskovice') return this.has ? ex.prev?.at ?? null : this.shopDoor;
    return this.has ? this.dropAt() : ex.next.at;
  }

  interact(): boolean {
    const door = this.shopDoor;
    const g = this.g;
    if (!door || this.has || g.driving || Phaser.Math.Distance.Between(g.player.x, g.player.y, door.x, door.y) > 26) return false;
    this.story.talk(this.buyDialog());
    return true;
  }

  protected abstract buyDialog(): Dialog;

  protected buyOption(text: string): DialogOption {
    return { text: `${text} (${this.price} Kč)`, cost: this.price, do: (c) => c.flag(this.item) };
  }

  update(): JobResult {
    return this.result;
  }

  cleanup(): void {
    const flags = this.story.state.flags;
    if (flags.includes(this.item)) flags.splice(flags.indexOf(this.item), 1);
    for (const o of this.sign) o.destroy();
  }
}

/** Přčka: kanystr nafty z benzínky v Raškovicích do BMW. Na prachy nemá, má aury. */
export class NaftaJob extends FetchJob {
  readonly id = 'prcka-nafta' as const;
  protected readonly item = 'item:nafta';
  protected readonly itemName = 'kanystr nafty';
  protected readonly price = 500;
  protected readonly shop = 'Obchod';
  protected readonly shopName = 'Benzína u obchodu';
  private pouring = false;

  protected dropAt(): Point | null {
    return this.g.townsfolk.bmw;
  }

  protected dropText(): string {
    return 'Dones kanystr k Přčkovu BMW u hřiště (E u auta)';
  }

  protected buyDialog(): Dialog {
    return {
      id: 'buy-nafta',
      start: 'b',
      nodes: {
        b: {
          speaker: 'narrator',
          text: 'Pumpař kouká do telefonu. „Nafta? Kanystr je za pět stovek, i s naftou. Bez nafty taky za pět, kanystr je drahej.“',
          options: [this.buyOption('Beru.'), end('To je zlodějna.'), end('Ještě se vrátím.')],
        },
      },
    };
  }

  interact(): boolean {
    if (super.interact()) return true;
    const g = this.g;
    const bmw = g.townsfolk.bmw;
    if (!this.has || this.pouring || !bmw || g.driving || g.area.id !== 'moravka') return false;
    if (Phaser.Math.Distance.Between(g.player.x, g.player.y, bmw.x, bmw.y) > 28) return false;
    this.pour();
    return true;
  }

  /** Tankování: kanystr nad nádrží, glo glo, a Přčka vysvětluje, proč nemá prachy. */
  private pour(): void {
    const g = this.g;
    const bmw = g.townsfolk.bmw!;
    const prcka = g.townsfolk.ped('prcka');
    this.pouring = true;
    const can = g.add.image(bmw.x - 8, bmw.y - 9, 'kanystr').setDepth(12);
    g.cameras.getCamera('minimap')?.ignore(can);
    g.tweens.add({ targets: can, angle: 70, duration: 600 });
    const say = (t: string) => prcka && g.speech.say(prcka, t, OMLADINA_FRAME, 2600);
    const glug = () => g.floatText(bmw.x - 6, bmw.y - 14, 'glo glo glo', '#a0e0a0', 1200);
    this.cutscene(
      [
        [200, () => say('Konečně. Myslel jsem, že jedeš pro naftu do Ostravy, bro.')],
        [2600, glug],
        [900, () => say('Hele, ty prachy… Mám je na Revolutu. Teda měl jsem. Teda máma.')],
        [2700, glug],
        [900, () => say('Karta mi nejde, protože jsem ji dal do pračky. Spolu s výplatou.')],
        [2700, () => say('Ok ok, máma mi poslala pětistovku a padesát. To je tvoje. Zbytek ti dlužím v aurách.')],
      ],
      () => {
        can.destroy();
        this.doneText = 'Přčka: „BMW jede na naftu a na vibe. Na tvoji naftu. Vibe je můj.“';
        this.result = 'done';
      },
    );
  }
}

/** Mini Vesta: karburátor na babetu z garáže v Raškovicích. */
export class BabetaJob extends FetchJob {
  readonly id = 'minivesta-babeta' as const;
  protected readonly item = 'item:karburator';
  protected readonly itemName = 'karburátor na babetu';
  protected readonly price = 300;
  protected readonly shop = 'Garáž';
  protected readonly shopName = 'Garáž v Raškovicích';

  protected dropAt(): Point | null {
    return this.g.townsfolk.ped('miniVesta');
  }

  protected dropText(): string {
    return 'Dones karburátor Mini Vestě k hřišti (E u ní)';
  }

  protected buyDialog(): Dialog {
    return {
      id: 'buy-karburator',
      start: 'b',
      nodes: {
        b: {
          speaker: 'narrator',
          text: 'Mechanik z Raškovic vytáhne z bedny karburátor. „Na babetu? Poslední kus. Říkám to každýmu. Tři stovky.“',
          options: [this.buyOption('Beru.'), end('Za tři stovky? Je to šrot.'), end('Rozmyslím si to.')],
        },
      },
    };
  }

  dialogFor(npc: NpcId): Dialog | null {
    if (npc !== 'miniVesta' || !this.has || this.g.area.id !== 'moravka') return null;
    return {
      id: 'babeta-drop',
      start: 'd',
      nodes: {
        d: {
          speaker: 'miniVesta',
          text: 'Yo, máš to? Babeta už tři dny dělá lavičku. Lidi si na ni sedaj. Bruh.',
          options: [{ text: 'Tady je karburátor.', do: () => this.fix() }, end('Ještě ne.'), end('Co je babeta?')],
        },
      },
    };
  }

  /** Mini Vesta to tam narve, babeta zakašle, kouří a jede. */
  private fix(): void {
    const g = this.g;
    const mv = g.townsfolk.ped('miniVesta');
    const bab = g.townsfolk.babeta;
    const say = (t: string) => mv && g.speech.say(mv, t, OMLADINA_FRAME, 2400);
    this.cutscene(
      [
        [300, () => say('Ok, tohle sem a tohle… taky sem. Zbylo mi šroubek. To je normální.')],
        [2400, () => bab && (g.tweens.add({ targets: bab, x: bab.x + 1, duration: 60, yoyo: true, repeat: 8 }), g.floatText(bab.x, bab.y - 8, 'PRR PRR PRRRR', '#e8e8e8', 1400))],
        [1600, () => say('Jede! Main character energy! Vesta zezelená. Teda zčervená. Má mikinu.')],
      ],
      () => {
        this.doneText = 'Mini Vesta: „Babeta je zpátky. Retro W. Tady máš prachy, fr.“';
        this.result = 'done';
      },
    );
  }
}
