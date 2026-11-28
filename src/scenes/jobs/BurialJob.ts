import Phaser from 'phaser';
import { TILE } from '../../config';
import { Sound } from '../../audio/Sound';
import type { Pedestrian } from '../../entities/Pedestrian';
import type { Vehicle } from '../../entities/Vehicle';
import type { Point } from '../../systems/combat';
import { Job, type JobResult } from './Job';

type Phase = 'kill' | 'load' | 'drive' | 'bury';

/** Čím se dá mrtvola vozit (zadání: dodávka nebo traktor). */
const CARRIERS = ['dodavka', 'traktor'];

interface PedHurt {
  ped: Pedestrian;
  killed: boolean;
  byPlayer: boolean;
}

/**
 * Pohřeb v lese (ADR-037) pro Tu z Chaty aj z Ostravy: zabít chodce, naložit ho do dodávky
 * nebo na traktor, odvézt do lesa za Chatou. Tam přijede Vysoký Denny s bagrem
 * a kope. Bez fízlů. Jde až po misi „Auto pro Dennyho“.
 */
export class BurialJob extends Job {
  readonly id = 'natala-pohreb' as const;
  private phase: Phase = 'kill';
  private corpse: Pedestrian | null = null;
  private carrier: Vehicle | null = null;
  private result: JobResult = 'run';
  private warnedAt = -100;
  private props: Phaser.GameObjects.GameObject[] = [];
  private natala: Pedestrian | null = null;

  private readonly onHurt = (e: PedHurt) => {
    if (this.phase !== 'kill' || !e.killed || !e.byPlayer || e.ped.role !== 'civil' || e.ped.scripted) return;
    this.corpse = e.ped;
    // Tahle mrtvola se sama neuklidí, čeká na odvoz.
    this.g.tweens.killTweensOf(e.ped);
    e.ped.setAlpha(1);
    this.phase = 'load';
    this.g.toast('Ta z Chaty aj z Ostravy (SMS): „No vidíš, že to jde. Teď ho nalož do dodávky abo na traktor.“');
  };

  private get grave(): Point {
    // Les za Chatou, kde Ta z Chaty bydlí (u kraje mapy by scénu schovalo HUD).
    const ch = this.g.world.buildings.find((b) => b.name === 'Chata');
    const c = ch ? { x: ch.x + 2, y: ch.y - 3 } : this.g.world.spots.camp;
    return { x: (c.x + 0.5) * TILE, y: (c.y + 0.5) * TILE };
  }

  start(): void {
    this.g.events.on('pedHurt', this.onHurt);
  }

  objective(): string {
    const g = this.g;
    if (this.phase === 'kill') return 'Zabij někoho. Kohokoli. Ta z Chaty aj z Ostravy není vybíravá.';
    if (this.phase === 'load') return 'Přistav dodávku nebo traktor k mrtvole a nalož ho (E)';
    if (this.phase === 'drive') {
      if (g.driving !== this.carrier) return 'Nasedni zpátky do auta s mrtvolou';
      return g.police.wanted.level > 0 ? `Setřes fízly (hvězdy ${g.police.wanted.level}), pak do lesa` : 'Odvez mrtvolu do lesa za Chatou';
    }
    return 'Denny kope. Hm.';
  }

  target(): Point | null {
    if (this.phase === 'load') return this.corpse;
    if (this.phase === 'drive') return this.g.driving === this.carrier ? this.grave : this.carrier;
    return null;
  }

  interact(): boolean {
    const g = this.g;
    const c = this.corpse;
    if (this.phase !== 'load' || !c) return false;
    const near = (o: Point, d: number) => Phaser.Math.Distance.Between(o.x, o.y, c.x, c.y) < d;
    const fits = (v: Vehicle) => CARRIERS.includes(v.spec.kind) && !v.wrecked;
    let v: Vehicle | null = null;
    if (g.driving) {
      if (!fits(g.driving) || !near(g.driving, 44)) return false;
      v = g.driving;
    } else {
      if (!near(g.player, 26)) return false;
      v = g.vehicles.find((o) => fits(o) && near(o, 60)) ?? null;
      if (!v) {
        g.toast('Do kapsy se nevejde. Přistav k němu dodávku nebo traktor.');
        return true;
      }
    }
    c.setVisible(false);
    this.carrier = v;
    this.phase = 'drive';
    g.toast('Naloženo. Nekoukej na to. Teď do lesa.');
    return true;
  }

  update(): JobResult {
    const g = this.g;
    if (this.phase !== 'drive' || !this.carrier) return this.result;
    const v = this.carrier;
    if (v.wrecked) {
      this.failReason = 'Auto s mrtvolou je na šrot. Ta z Chaty: „Teď jsou mrtvoly dvě. Teda jedna a půl.“';
      return 'fail';
    }
    if (g.driving !== v || Phaser.Math.Distance.Between(v.x, v.y, this.grave.x, this.grave.y) > 70 || Math.abs(v.speed) > 20) return 'run';
    if (g.police.wanted.level > 0) {
      const now = g.time.now / 1000;
      if (now - this.warnedAt > 6) g.toast('Ta z Chaty: „S fízlama za prdelí? Denny před publikem nekope.“');
      this.warnedAt = now;
      return 'run';
    }
    this.bury();
    return 'run';
  }

  /** Denny přijede bagrem, třikrát nabere, Natala hodí tělo, zahrabat, mohyla s křížkem. */
  private bury(): void {
    const g = this.g;
    this.phase = 'bury';
    const gr = this.grave;
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      g.cameras.getCamera('minimap')?.ignore(o);
      this.props.push(o);
      return o;
    };
    const hole = keep(g.add.image(gr.x, gr.y, 'hrob').setDepth(3).setScale(0.2));
    const from = { x: gr.x + 34, y: gr.y + 190 };
    const park = { x: gr.x + 34, y: gr.y + 2 };
    const bagr = keep(g.add.image(from.x, from.y, 'bagr').setDepth(11).setFlipX(true));
    const arm = keep(g.add.image(from.x - 6, from.y, 'bagr-rameno').setOrigin(0, 0.5).setDepth(12).setRotation(Math.PI));
    const name = keep(g.add.text(from.x, from.y - 16, 'Vysoký Denny', { fontFamily: 'monospace', fontSize: '7px', color: '#7ab0e8' }).setOrigin(0.5).setDepth(44));
    this.natala = g.townsfolk.spawn('natala', gr.x - 22, gr.y - 10);
    const nat = this.natala;
    const say = (t: string) => g.speech.say(nat, t, 0x9a4ad0, 2600);
    const denny = (t: string) => g.floatText(bagr.x, bagr.y - 14, t, '#7ab0e8', 1400);
    const dig = (n: number) => {
      g.tweens.add({ targets: arm, rotation: Math.PI + 0.5, duration: 350, yoyo: true });
      g.tweens.add({ targets: hole, scale: 0.4 + n * 0.2, duration: 500 });
      keep(g.add.image(park.x - 10 + n * 4, gr.y - 14 + n * 3, 'hlina').setDepth(4));
      g.cameras.main.shake(150, 0.003);
      Sound.hit();
    };
    this.cutscene(
      [
        [200, () => {
          g.tweens.add({ targets: [bagr, name], x: `-=${from.x - park.x}`, y: `-=${from.y - park.y}`, duration: 2400 });
          g.tweens.add({ targets: arm, x: park.x - 6, y: park.y, duration: 2400 });
          say('Šak su tu. Denny, kopej, ať to nesmrdí až do Ostravy.');
        }],
        [2600, () => denny('Hm.')],
        [500, () => dig(1)],
        [900, () => dig(2)],
        [900, () => (dig(3), say('Hlubší, Denny. U nás v Ostravě by sa to dělalo lopatou a za pivo.'))],
        [1800, () => denny('Hm. Bagr.')],
        [900, () => {
          const c = this.corpse;
          if (!c) return;
          c.setPosition(this.carrier!.x, this.carrier!.y).setVisible(true).setDepth(13);
          g.tweens.add({ targets: c, x: gr.x, y: gr.y, angle: 360, duration: 700, onComplete: () => c.setVisible(false) });
        }],
        [1000, () => {
          g.tweens.add({ targets: arm, rotation: Math.PI - 0.4, duration: 400, yoyo: true, repeat: 1 });
          hole.setTexture('mohyla').setScale(1);
          say('No a je to. Žádný farář, žádný kafe, žádný řeči. Jak v Ostravě v pondělí.');
        }],
        [2800, () => {
          denny('Hm hm.');
          g.tweens.add({ targets: [bagr, name, arm], x: `+=${from.x - park.x}`, y: `+=${from.y - park.y}`, duration: 2400 });
        }],
      ],
      () => {
        this.corpse?.destroy();
        this.corpse = null;
        this.doneText = 'Ta z Chaty aj z Ostravy: „Nikomu nic, jasný? Ani Kobyle. Hlavně ne Kobyle.“';
        this.result = 'done';
      },
    );
  }

  cleanup(): void {
    const g = this.g;
    g.events.off('pedHurt', this.onHurt);
    // Mohyla s hlínou zůstane, bagr odjel.
    for (const o of this.props) if ((o as Phaser.GameObjects.Image).texture?.key !== 'mohyla' && (o as Phaser.GameObjects.Image).texture?.key !== 'hlina') o.destroy();
    if (this.natala) g.townsfolk.remove(this.natala);
    if (this.corpse && !this.corpse.visible) this.corpse.setVisible(true);
  }
}
