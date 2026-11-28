import Phaser from 'phaser';
import { TILE } from '../../config';
import { Sound } from '../../audio/Sound';
import type { Dialog, DialogOption } from '../../story/dialog';
import { KAREL_RIVAL_PRICE, karelPlan, type KarelPlan } from '../../story/jobs';
import { NPCS, type NpcId } from '../../story/npcs';
import type { Point } from '../../systems/combat';
import { T } from '../../texts/cs';
import { Job, type JobResult } from './Job';
import { doorOf } from './route';

const ITEM = 'item:karel';
const RIVAL_MET = 'karel:rival';
const end = (text: string): DialogOption => ({ text });

/**
 * Kde je Karel (ADR-037): Awe ztratila Karla. Skrýš a štamgast, který ho chce taky,
 * se losují jednou za hru (semínko v příběhu). Donést Awe = Karel jako zbraň;
 * prodat soupeři = víc peněz, Awe naštvaná.
 */
export class KarelJob extends Job {
  readonly id = 'awe-karel' as const;
  private plan: KarelPlan = karelPlan(this.story.state.counts.karelSeed ?? 1);
  private img: Phaser.GameObjects.Image | null = null;
  private result: JobResult = 'run';

  private get has(): boolean {
    return this.story.has(ITEM);
  }

  /** Místo skrýše v px (v Morávce). */
  private get spot(): Point | null {
    const g = this.g;
    if (g.area.id !== 'moravka') return null;
    if (this.plan.spot === 'Přehrada') return { x: g.world.spots.damParking.x * TILE, y: (g.world.spots.damParking.y - 1) * TILE };
    const b = g.world.buildings.find((x) => x.name === this.plan.spot);
    return b ? doorOf(b, 1.5) : null;
  }

  start(): void {
    const at = this.spot;
    if (!at || this.has) return;
    this.img = this.g.add.image(at.x + 10, at.y + 4, 'karel').setDepth(4).setAngle(-20);
    this.g.cameras.getCamera('minimap')?.ignore(this.img);
  }

  objective(): string {
    if (!this.has) return `Najdi Karla (${this.plan.code}). Awe ho naposled viděla: ${this.plan.spot}`;
    return `Dones Karla Awe k hřišti. (${NPCS[this.plan.rival].name} by za něj dal ${KAREL_RIVAL_PRICE} Kč)`;
  }

  target(): Point | null {
    // Karla se hledá: šipka až na Awe.
    return this.has && this.g.area.id === 'moravka' ? this.g.townsfolk.ped('awe') : null;
  }

  interact(): boolean {
    const g = this.g;
    const img = this.img;
    if (!img || this.has || g.driving || Phaser.Math.Distance.Between(g.player.x, g.player.y, img.x, img.y) > 22) return false;
    this.story.flag(ITEM);
    img.destroy();
    this.img = null;
    g.toast(`{Našel|Našla} jsi Karla. Je těžší, než vypadá. A vypadá těžce.`);
    Sound.jingle(true);
    return true;
  }

  update(): JobResult {
    const g = this.g;
    // Karel z dálky není vidět, zblízka nepřehlédnutelný.
    if (this.img) this.img.setVisible(Phaser.Math.Distance.Between(g.player.x, g.player.y, this.img.x, this.img.y) < 110);
    return this.result;
  }

  dialogFor(npc: NpcId, base: string): Dialog | null {
    if (npc === 'awe' && this.has) return this.aweDialog();
    if (npc === this.plan.rival && (this.has || !this.story.has(RIVAL_MET))) return this.rivalDialog(base);
    return null;
  }

  private rivalDialog(base: string): Dialog {
    const r = this.plan.rival;
    const pitch: Partial<Record<NpcId, string>> = {
      vesta: 'Slyšel jsem, že hledáš Karla. Já ho chci taky. Ne pro sebe. Pro sousedy. Ať vidí, že mám i Karla.',
      omyx: 'HELE! KAREL! Slyšel jsem o Karlovi. Já bych ho bral, jako dekoraci. Na stůl. K čaji.',
      metejka: 'Karel? Kulečníkový tágo to není, ale já bych s ním vyhrál. Jako… psychologicky.',
      zjebal: 'Hehe… Karel. Hehe. Ajina by z něj měla radost. Nebo by mě s ním zabila. Hehe. Dobrý.',
      kibi: 'Psst. Karel. Ten bych potřeboval. Zuzka, Monika a Jarka by se přestaly hádat, kdo je jediná.',
    };
    return {
      id: 'karel-rival',
      start: this.has ? 's' : 'p',
      nodes: {
        p: {
          speaker: r,
          text: `${pitch[r]} Kdo ho přinese mně, má ${KAREL_RIVAL_PRICE} Kč. Awe dává míň, to vím.`,
          enter: (c) => (c.flag(RIVAL_MET), c.know(r)),
          options: [end('Uvidíme.'), end('Awe ho chce víc.'), { text: 'Radši pokecáme.', then: base }],
        },
        s: {
          speaker: r,
          text: `To je on? Karel? ${KAREL_RIVAL_PRICE} Kč, hned. Awe to nemusí vědět. Teda bude to vědět, Awe ví všechno.`,
          options: [{ text: `Prodám ti ho. (${KAREL_RIVAL_PRICE} Kč)`, do: (c) => this.sell(c.rel) }, end('Ne, je pro Awe.'), { text: 'Radši pokecáme.', then: base }],
        },
      },
    };
  }

  /** Prodej soupeři: dohromady 800 Kč (300 hned + 500 odměna mise), Awe ztratí důvěru. */
  private sell(rel: (npc: NpcId, d: number) => void): void {
    this.g.player.money += KAREL_RIVAL_PRICE - 500;
    rel('awe', -40);
    this.story.state.flags.splice(this.story.state.flags.indexOf(ITEM), 1);
    this.doneText = `${NPCS[this.plan.rival].name} má Karla. Awe se to dozví do pěti minut. Nebo do dvou.`;
    this.result = 'done';
  }

  private aweDialog(): Dialog {
    return {
      id: 'karel-awe',
      start: 'a',
      nodes: {
        a: {
          speaker: 'awe',
          text: 'KARLE?! To je Karel! {Našel|Našla} jsi ho! Bestie, slay! Dej ho sem. A otoč se. Ne, radši se dívej jinam úplně.',
          options: [{ text: 'Tady je.', do: () => this.reunion() }, end('Ještě chvíli ho pohlídám.'), end('Kdo vlastně je Karel?')],
        },
      },
    };
  }

  /** Shledání Awe s Karlem: přes celé to jde cenzura, třese se obraz, pak Karel zpátky hráči. */
  private reunion(): void {
    const g = this.g;
    const awe = g.townsfolk.ped('awe');
    if (!awe) return;
    const say = (t: string, ms = 2200) => g.speech.say(awe, t, 0x9a4ad0, ms);
    const box = g.add.graphics().setDepth(47);
    g.cameras.getCamera('minimap')?.ignore(box);
    const mosaic = () => {
      box.clear();
      for (let y = -14; y < 14; y += 4) for (let x = -18; x < 18; x += 4) box.fillStyle([0xe060d0, 0x141418, 0xf0d0b0, 0x40e0e0][Math.floor(g.random() * 4)], 1).fillRect(awe.x + x, awe.y + y, 4, 4);
    };
    let ticker: Phaser.Time.TimerEvent | null = null;
    const label = g.add.text(awe.x, awe.y - 22, 'CENZUROVÁNO', { fontFamily: 'monospace', fontSize: '8px', color: '#ff3a3a', backgroundColor: '#000' }).setOrigin(0.5).setDepth(48).setVisible(false);
    g.cameras.getCamera('minimap')?.ignore(label);
    this.cutscene(
      [
        [200, () => (awe.setTexture('npc-awe-karel'), say('Karle… ty jeden… kde ses toulal?'))],
        [2200, () => {
          ticker = g.time.addEvent({ delay: 90, loop: true, callback: mosaic });
          label.setVisible(true);
          g.cameras.main.shake(2600, 0.006);
          Sound.hit();
        }],
        [700, () => g.floatText(awe.x - 12, awe.y - 16, '*vrz vrz*', '#ffffff', 1200)],
        [800, () => (Sound.hit(), g.floatText(awe.x + 12, awe.y - 20, 'ÁÁÁÁ!', '#ff9ad0', 1200))],
        [800, () => g.floatText(awe.x, awe.y - 26, '*sousedi volají faráře*', '#ffd23f', 1500)],
        [900, () => (Sound.hit(), g.cameras.main.flash(200, 255, 200, 240))],
        [700, () => {
          ticker?.remove();
          box.destroy();
          label.destroy();
          awe.setTexture('npc-awe');
          say('Ok. To bylo… intenzivní. Nech si ho. Já mám zážitek na celej život. Karel tě má rád, fr.', 3200);
        }],
      ],
      () => {
        this.story.state.flags.splice(this.story.state.flags.indexOf(ITEM), 1);
        g.combat.setItem('karel', 1);
        g.toast(T.picked.karel);
        this.doneText = 'Awe: „Karel je teď tvůj parťák. Lidi před ním utíkají. To je jeho love language.“';
        this.result = 'done';
      },
    );
  }

  cleanup(): void {
    this.img?.destroy();
    const flags = this.story.state.flags;
    if (flags.includes(ITEM)) flags.splice(flags.indexOf(ITEM), 1);
  }
}
