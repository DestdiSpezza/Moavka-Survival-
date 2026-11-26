import Phaser from 'phaser';
import { TILE } from '../../config';
import type { Vehicle } from '../../entities/Vehicle';
import type { Point } from '../../systems/combat';
import { Job, type JobResult } from './Job';
import { doorOf } from './route';

const CALLS = [
  'Telefon – Vesta: „Jedeš jak důchodce. Já bych tam byl dvakrát.“',
  'Telefon – Vesta: „Neber to přes náves, uvidí tě Kobyla. Teda už tě viděla.“',
  'Telefon – Vesta: „Jestli bude jeřáb poškrábanej, strhnu ti to z odměny. Dělám si srandu. Asi.“',
  'Telefon – Vesta: „Proč tě slyším troubit? Netrub. Já slyším všechno.“',
  'Telefon – Vesta: „Ten jeřáb stál víc než celý Raškovice. Mikina taky.“',
  'Telefon – Vesta: „Zatáčej dřív. Ne, ještě dřív. Ne, teď už pozdě.“',
];

/**
 * Jeřáb pro Vestu (fáze P3): v Raškovicích na stavbě stojí autojeřáb; ukrást, přejet
 * do Morávky a dovézt k Vestovu domu bez hvězd. Vesta celou cestu volá, jak to hráč
 * dělá špatně. Mise otevře výjezd do Raškovic (ADR-011) a přežije přejezd oblastí.
 */
export class VestaJob extends Job {
  readonly id = 'vesta-jerab' as const;
  private crane: Vehicle | null = null;
  private callIn = 8;
  private warnedAt = -100;

  start(): void {
    const g = this.g;
    this.story.flag('open:raskovice');
    if (g.area.id === 'raskovice') {
      // Na stavbě (u hráze) stojí jeřáb, pokud s ním hráč zrovna nepřijel.
      if (g.driving?.spec.kind !== 'jerab') {
        const s = g.world.spots.damParking;
        this.crane = g.addVehicle('jerab', (s.x + 6) * TILE, (s.y + 0.5) * TILE, 0, 0);
        const sign = g.add.text(this.crane.x, this.crane.y - 22, 'STAVBA', { fontFamily: 'monospace', fontSize: '8px', color: '#ffd23f' }).setOrigin(0.5).setDepth(40);
        g.cameras.getCamera('minimap')?.ignore(sign);
      } else this.crane = g.driving;
    } else if (g.driving?.spec.kind === 'jerab') this.crane = g.driving;
  }

  private get home(): Point | null {
    const b = this.g.world.buildings.find((x) => x.name === 'Vesta');
    return b ? doorOf(b, 1.6) : null;
  }

  private inCrane(): boolean {
    const v = this.g.driving;
    return !!v && v.spec.kind === 'jerab';
  }

  objective(): string {
    const g = this.g;
    if (g.area.id === 'raskovice') return this.inCrane() ? 'Odvez jeřáb do Morávky (výjezd dole)' : 'Ukradni jeřáb na stavbě u hráze';
    if (!this.inCrane()) return this.crane && !this.crane.wrecked ? 'Nasedni zpátky do jeřábu' : 'Dojeď do Raškovic pro jeřáb (výjezd vlevo nahoře)';
    return `Dovez jeřáb k Vestovu domu bez hvězd (hvězdy ${g.police.wanted.level})`;
  }

  target(): Point | null {
    const g = this.g;
    const ex = g.world.exits;
    if (g.area.id === 'raskovice') return this.inCrane() ? ex.prev?.at ?? null : this.crane;
    if (!this.inCrane()) return this.crane && !this.crane.wrecked ? this.crane : ex.next.at;
    return this.home;
  }

  update(dt: number): JobResult {
    const g = this.g;
    if (this.inCrane()) this.crane = g.driving;
    if (this.crane && this.crane.wrecked) {
      this.failReason = 'Jeřáb je na šrot. Vesta: „Řeknu to všem.“';
      return 'fail';
    }
    // Vesta volá, jak to hráč dělá špatně.
    this.callIn -= dt;
    if (this.callIn <= 0) {
      this.callIn = 22 + g.random() * 10;
      g.toast(CALLS[Math.floor(g.random() * CALLS.length)]);
    }
    const home = this.home;
    const v = g.driving;
    if (g.area.id !== 'moravka' || !home || !v || v.spec.kind !== 'jerab') return 'run';
    if (Phaser.Math.Distance.Between(v.x, v.y, home.x, home.y) > 44 || Math.abs(v.speed) > 20) return 'run';
    if (g.police.wanted.level > 0) {
      const now = g.time.now / 1000;
      if (now - this.warnedAt > 6) g.toast('Telefon – Vesta: „S fízlama za zadkem? Ne. Zbav se jich a pak přijeď.“');
      this.warnedAt = now;
      return 'run';
    }
    g.exitVehicle();
    v.driver = 'none';
    this.doneText = 'Vesta: „Jeřáb! Sousedi zezelenají. Tady máš sedm stovek. A řeknu to všem.“';
    return 'done';
  }
}
