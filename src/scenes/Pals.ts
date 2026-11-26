import Phaser from 'phaser';
import { Pedestrian } from '../entities/Pedestrian';
import type { Dialog } from '../story/dialog';
import { NPCS } from '../story/npcs';
import { pixelFont } from './BootScene';
import type { GameScene } from './GameScene';

/** Štamgasti, které jde vzít s sebou (Prchard zůstává za barem, ADR-025). */
export type PalId = 'metejka' | 'plotkova' | 'kibi' | 'vesta' | 'omyx' | 'zjebal' | 'dennyVysoky' | 'dennySochar';
export const PAL_IDS: PalId[] = ['metejka', 'plotkova', 'kibi', 'vesta', 'omyx', 'zjebal', 'dennyVysoky', 'dennySochar'];

/** Co parťák umí a co otravuje (krátce, ukáže se při odchodu z eRka). */
export const PAL_INFO: Record<PalId, { plus: string; minus: string }> = {
  metejka: { plus: 'Fízlové se ti vyhnou (nikdo nechce mít s Metějkou nic společného).', minus: 'Každou chvíli chce pivo z tvých. Když nemáš, odejde naštvaný.' },
  plotkova: { plus: 'Ukazuje cestu: každou chvíli řekne, kterým směrem je cíl mise.', minus: 'Chce panáky. Šedesát korun, pořád dokola.' },
  kibi: { plus: 'Pere se za tebe s každým, kdo tě napadne.', minus: 'Chodí za ním ženský. Naštvaný. A facky dostáváš ty.' },
  vesta: { plus: 'Pomůže vždycky: lékárnička, když ti je zle, a zaplatí pokutu.', minus: 'Blbý kecy do očí. Lidi se naštvou, skupiny tě mají míň rády.' },
  omyx: { plus: 'Při handlování ti pošeptá, na co kupec slyší.', minus: 'Furt mluvíš o hulení. A chodíš pomaleji.' },
  zjebal: { plus: 'Těžké stroje (traktor, dodávka) „zná majitele“: krádež se nehlásí.', minus: 'Ve deset musí domů. Ajina.' },
  dennyVysoky: { plus: 'Za jízdy ti opravuje auto.', minus: 'Moc neporadí: úkol mise ukazuje jen „Hm.“' },
  dennySochar: { plus: 'Jde se ho zbavit: pár ran pěstí a odejde.', minus: 'Pořád si půjčuje. Stovku. Pořád.' },
};

const NEAR = 150;
const ARG_NAME: Record<string, string> = { puvod: 'původ', vzacnost: 'vzácnost', efekt: 'účinek', diskretnost: 'diskrétnost', status: 'Insta a lajky' };

/**
 * Parťák (fáze P3, ADR-025): jednoho štamgasta si vezmeš z eRka s sebou. Chodí za tebou,
 * sedá k tobě do auta a dokud je poblíž, platí jeho výhoda i nevýhoda.
 * Denny sochař se umí přidat i sám (a zbavíš se ho jen pěstí).
 */
export class Pals {
  id: PalId | null = null;
  ped: Pedestrian | null = null;
  private label: Phaser.GameObjects.Text | null = null;
  private timer = 0;
  private helpAt = -100;
  private shieldToastAt = -100;
  private punches = 0;
  private kibiHitAt = 0;
  private ex: Pedestrian | null = null;
  private wasDriving = false;
  private navAt = 15;

  constructor(private game: GameScene) {}

  is(id: PalId): boolean {
    return this.id === id;
  }

  /** Je parťák u hráče (ne někde vzadu)? */
  near(id?: PalId): boolean {
    if (!this.id || (id && this.id !== id) || !this.ped) return false;
    const g = this.game;
    if (g.driving) return true;
    return Phaser.Math.Distance.Between(this.ped.x, this.ped.y, g.player.x, g.player.y) < NEAR;
  }

  /** V hospodě: „Pojď se mnou.“ Objeví se venku u dveří, až hráč vyjde. */
  take(id: PalId): void {
    this.dismiss(true);
    this.id = id;
    this.timer = 0;
    this.punches = 0;
  }

  /** Hráč vyšel z eRka: parťák jde s ním ven. */
  spawnAt(x: number, y: number): void {
    if (!this.id || this.ped) return;
    const g = this.game;
    const ped = new Pedestrian(g, x, y, 0, true, NPCS[this.id].sprite, 400);
    ped.scripted = true;
    g.combat.peds.push(ped);
    g.cameras.getCamera('minimap')?.ignore(ped);
    this.ped = ped;
    this.label = g.add.text(x, y - 13, NPCS[this.id].name, pixelFont(14, NPCS[this.id].css)).setOrigin(0.5).setScale(0.5).setStroke('#000', 3).setDepth(44);
    g.cameras.getCamera('minimap')?.ignore(this.label);
    const info = PAL_INFO[this.id];
    g.toast(`${NPCS[this.id].name} jde s tebou. + ${info.plus} − ${info.minus}`);
  }

  /** Parťák jde zpátky do eRka (nebo domů). */
  dismiss(silent = false, line?: string): void {
    const g = this.game;
    const ped = this.ped;
    if (ped && line) g.speech.say(ped, line, 0x3a3a3a, 2200);
    if (ped) {
      const peds = g.combat.peds;
      if (peds.includes(ped)) peds.splice(peds.indexOf(ped), 1);
      g.tweens.add({ targets: ped, alpha: 0, delay: line ? 1200 : 0, duration: 900, onComplete: () => ped.destroy() });
    }
    this.label?.destroy();
    this.label = null;
    this.ped = null;
    if (this.id && !silent && !line) g.toast(`${NPCS[this.id].name} jde zpátky do eRka.`);
    this.id = null;
    this.ex?.destroy();
    this.ex = null;
  }

  /** E u parťáka venku. */
  talkable(): boolean {
    const g = this.game;
    return !!this.ped && !g.driving && this.ped.visible && Phaser.Math.Distance.Between(this.ped.x, this.ped.y, g.player.x, g.player.y) < 24;
  }

  talkDialog(): Dialog {
    const id = this.id!;
    const end = (text: string) => ({ text });
    return {
      id: 'pal',
      start: 'p',
      nodes: {
        p: {
          speaker: id,
          text: id === 'dennySochar' ? 'Co? Já tu jen tak jdu. Nemáš stovku?' : id === 'dennyVysoky' ? 'Hm?' : 'Co je? Jdem dál, ne?',
          options: [
            id === 'dennySochar' ? end('Vypadni.') : { text: 'Běž zpátky do eRka.', do: () => this.dismiss() },
            end('Jdem dál.'),
            end('Nic.'),
          ],
        },
      },
    };
  }

  /** Metějka u hráče: hlášení o zločinu se ztratí (fízl radši odjede na svačinu). */
  shieldsFromPolice(): boolean {
    if (!this.near('metejka')) return false;
    const g = this.game;
    const now = g.time.now / 1000;
    if (now - this.shieldToastAt > 20) {
      this.shieldToastAt = now;
      g.toast('Fízl uviděl Metějku a radši odjel na svačinu.');
    }
    return true;
  }

  /** Vesta zaplatí pokutu při zatčení. */
  paysFine(): boolean {
    return this.near('vesta');
  }

  /** Zjebal „zná majitele“ těžkých strojů. */
  knowsOwner(kind: string): boolean {
    return this.near('zjebal') && (kind === 'traktor' || kind === 'dodavka');
  }

  /** Omyx šeptá slabinu kupce. */
  whisper(weak: string): string {
    return this.near('omyx') ? `\n(Omyx šeptá: na tohohle platí ${ARG_NAME[weak] ?? weak}.)` : '';
  }

  /** Úder pěstí do Dennyho sochaře: po třetí ráně odejde. */
  onHit(p: Pedestrian): void {
    if (p !== this.ped || this.id !== 'dennySochar') return;
    this.punches++;
    p.hp = p.maxHp;
    if (this.punches >= 3) this.dismiss(false, 'Dobře, dobře! Jdu! Umělce nikdo nechápe!');
    else this.game.speech.say(p, ['Au! To je za co?', 'Ty mě biješ? Mě, umělce?'][this.punches - 1], 0x5a4a3a, 1600);
  }

  /** Zrovna vyšel z eRka bez parťáka: Denny sochař se občas přidá sám. */
  maybeSocharTagsAlong(chance: number): boolean {
    if (this.id) return false;
    if (this.game.random() >= chance) return false;
    this.take('dennySochar');
    return true;
  }

  update(dt: number): void {
    const g = this.game;
    const ped = this.ped;
    if (!this.id || !ped) return;
    if (!ped.active) {
      this.dismiss(true);
      return;
    }
    // Chodí za hráčem; v autě sedí s ním.
    const pl = g.player;
    const body = ped.body as Phaser.Physics.Arcade.Body;
    if (g.driving) {
      ped.setVisible(false);
      body.enable = false;
      ped.setPosition(g.driving.x, g.driving.y);
      this.wasDriving = true;
    } else {
      if (this.wasDriving || !ped.visible) {
        this.wasDriving = false;
        ped.setVisible(true);
        body.enable = true;
        body.reset(pl.x + 14, pl.y + 10);
      }
      const d = Phaser.Math.Distance.Between(ped.x, ped.y, pl.x, pl.y);
      if (d > 500) body.reset(pl.x + 14, pl.y + 10);
      else if (d > 28) g.walkTo(ped, pl, d > 90 ? 120 : 80);
      else body.setVelocity(0, 0);
      if (d < 120) ped.setRotation(Phaser.Math.Angle.Between(ped.x, ped.y, pl.x, pl.y));
    }
    this.label?.setVisible(ped.visible).setPosition(Math.round(ped.x), Math.round(ped.y - 13));
    if (this.id !== 'dennySochar') ped.hp = ped.maxHp;
    this.timer += dt;
    this.perks(dt);
  }

  private say(text: string, ms = 2400): void {
    const g = this.game;
    g.speech.say(g.driving ?? this.ped!, text, 0x3a3a3a, ms);
  }

  /** Výhody a nevýhody, co se dějí samy (pivo, panáky, facky, opravy…). */
  private perks(dt: number): void {
    const g = this.game;
    const pl = g.player;
    const every = (s: number) => {
      if (this.timer < s) return false;
      this.timer = 0;
      return true;
    };
    const pay = (n: number, what: string, leave: string): void => {
      if (pl.money >= n) {
        pl.money -= n;
        g.floatText(pl.x, pl.y - 14, `−${n} Kč (${what})`, '#ff9a6a', 1400);
      } else this.dismiss(false, leave);
    };
    const now = g.time.now / 1000;
    switch (this.id) {
      case 'metejka':
        if (every(50)) {
          this.say('Kde je moje pivo?! Kdo mi vypil pivo? TY?');
          pay(45, 'Metějkovo pivo', 'Bez piva s tebou nikam nejdu. Hádat se nechci, ale máš blbě.');
        }
        break;
      case 'plotkova':
        this.navAt += dt;
        if (this.navAt > 25) {
          this.navAt = 0;
          this.navigate();
        }
        if (every(60)) {
          this.say('Dáš panáka? Tak dva.');
          pay(60, 'panák pro Plotkovou', 'Bez panáka nenaviguju. Jdu zpátky, tam mi nalejou.');
        }
        break;
      case 'vesta':
        if (pl.health < 35 && now - this.helpAt > 90) {
          this.helpAt = now;
          pl.health = Math.min(100, pl.health + 45);
          this.say('Na, lékárnička. Ať tu neumřeš, to by se špatně fotilo.');
        } else if (every(40)) {
          const victim = g.combat.peds.find((p) => p.alive && p !== this.ped && p.role !== 'cop' && Phaser.Math.Distance.Between(p.x, p.y, pl.x, pl.y) < 120);
          this.say(['Tobě to sako sluší. Teda slušelo. V devadesátkách.', 'Hezký auto. Na Raškovice.', 'Já bych to koupil, ale nechci, aby ses {cítil chudej|cítila chudá}.'][Math.floor(g.random() * 3)]);
          if (victim?.group) g.gangs.mission(victim.group, 'hurtMember');
        }
        break;
      case 'omyx':
        if (every(35)) g.speech.say(g.driving ?? pl, ['Hele… nešli bysme za Omyxem?', 'Chci hulit. Jen trošku. Jako čaj.', 'Omyxi, máš ještě ten beskydskej?'][Math.floor(g.random() * 3)], 0x2a5a2a, 2200);
        break;
      case 'zjebal':
        if (g.gangs.minute >= 22 * 60 || g.gangs.minute < 5 * 60) this.dismiss(false, 'Hehe… kolik je? DESET?! Ajina! Já jdu! Dobrý, dobrý!');
        else if (every(45)) this.say('Hehe, dobrý, dobrý!');
        break;
      case 'dennyVysoky': {
        const v = g.driving;
        if (v && !v.wrecked && v.hp < v.spec.maxHp) v.hp = Math.min(v.spec.maxHp, v.hp + 3 * dt);
        if (every(60)) this.say('Hm.');
        break;
      }
      case 'dennySochar':
        if (every(40)) {
          this.say('Nemáš stovku? Vrátím. Fakt. Asi.');
          if (pl.money >= 100) {
            pl.money -= 100;
            g.floatText(pl.x, pl.y - 14, '−100 Kč (půjčka, navždy)', '#ff9a6a', 1600);
          }
        }
        break;
      case 'kibi':
        this.kibi(dt, now);
        break;
    }
  }

  /** Plotková ukáže směr k cíli mise („Na sever, za kostel!“). */
  private navigate(): void {
    const g = this.game;
    const m = g.registry.get('mission') as { target: { x: number; y: number } | null } | null;
    const f = g.driving ?? g.player;
    if (!m?.target) {
      this.say('Kam jdem? Já bych šla zpátky do eRka.');
      return;
    }
    const dx = m.target.x - f.x;
    const dy = m.target.y - f.y;
    if (Math.hypot(dx, dy) < 60) {
      this.say('Tady to je! Teda myslím. Točí se mi to.');
      return;
    }
    const dirs = ['na východ', 'na jihovýchod', 'na jih', 'na jihozápad', 'na západ', 'na severozápad', 'na sever', 'na severovýchod'];
    const i = Math.round(((Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8;
    this.say(`Tudy! ${dirs[i][0].toUpperCase()}${dirs[i].slice(1)}! Věř mi, vím, kde je hospoda. A všechno ostatní je kolem.`);
  }

  /** Kibi se pere za hráče; občas přijde jeho naštvaná bejvalka a facku dostane hráč. */
  private kibi(_dt: number, now: number): void {
    const g = this.game;
    const k = this.ped!;
    if (!g.driving) {
      const foe = g.combat.peds.find((p) => p.alive && p !== k && (p.foe === 'player' || p.mood === 'fight') && Phaser.Math.Distance.Between(p.x, p.y, g.player.x, g.player.y) < 130);
      if (foe) {
        const d = Phaser.Math.Distance.Between(k.x, k.y, foe.x, foe.y);
        if (d > 16) g.walkTo(k, foe, 120);
        else if (now > this.kibiHitAt) {
          this.kibiHitAt = now + 0.8;
          g.combat.hurtPed(foe, 14, k, false);
          if (g.random() < 0.3) g.speech.say(k, 'Kibi tady! Teda nejsem tady.', 0x8a3a6a, 1200);
        }
      }
    }
    if (!this.ex && this.timer > 70) {
      this.timer = 0;
      const pl = g.player;
      const ex = new Pedestrian(g, pl.x + 140, pl.y - 60, 0, true, 'npc-plotkova', 50);
      ex.scripted = true;
      g.cameras.getCamera('minimap')?.ignore(ex);
      this.ex = ex;
      g.speech.say(ex, 'KIBI! Ty parchante! A ty taky!', 0xd83a6a, 2200);
    }
    const ex = this.ex;
    if (ex) {
      const target = g.driving ?? g.player;
      const d = Phaser.Math.Distance.Between(ex.x, ex.y, target.x, target.y);
      if (d > 18) g.walkTo(ex, target, 110);
      else {
        if (!g.driving) g.combat.damagePlayer(5);
        g.speech.say(ex, 'Tak. A pozdravuj ho.', 0xd83a6a, 1800);
        g.tweens.add({ targets: ex, alpha: 0, delay: 1500, duration: 800, onComplete: () => ex.destroy() });
        this.ex = null;
      }
    }
  }
}
