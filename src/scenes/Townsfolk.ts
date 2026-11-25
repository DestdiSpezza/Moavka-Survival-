import Phaser from 'phaser';
import { TILE } from '../config';
import { Pedestrian } from '../entities/Pedestrian';
import type { Dialog, DialogOption } from '../story/dialog';
import { NPCS, type NpcId } from '../story/npcs';
import { pixelFont } from './BootScene';
import type { GameScene } from './GameScene';

interface Folk {
  id: NpcId;
  ped: Pedestrian;
  label: Phaser.GameObjects.Text;
  home: { x: number; y: number };
  /** Postava mise: kam jde a co dělá, řídí mise (Zjebal, Ajina, Denny sochař). */
  free?: boolean;
}

const TALK_RANGE = 22;

/**
 * Postavy příběhu venku: Slečna Kobyla na zastávce před eRkem a Vysoký Denny
 * před garáží (mimo 13–17 h, kdy sedí v eRku). Jméno nad hlavou svítí,
 * až ho hráč zná; do té doby „???“.
 */
export class Townsfolk {
  private folk: Folk[] = [];
  /** Denny už hráči garáž nabídl (znovu až po odjezdu). */
  private dennyOffered = false;
  private closedToastAt = -100;

  constructor(private game: GameScene) {
    const s = game.world.spots;
    if (s.kobyla) this.add('kobyla', (s.kobyla.x) * TILE, (s.kobyla.y) * TILE);
    if (s.denny) this.add('dennyVysoky', (s.denny.x) * TILE, (s.denny.y) * TILE);
  }

  get denny(): Pedestrian | null {
    return this.folk.find((f) => f.id === 'dennyVysoky')?.ped ?? null;
  }

  get kobyla(): Pedestrian | null {
    return this.folk.find((f) => f.id === 'kobyla')?.ped ?? null;
  }

  /** Postava pro misi: stojí, kde ji mise postaví, a mise ji zase odklidí (`remove`). */
  spawn(id: NpcId, x: number, y: number, hp = 200): Pedestrian {
    const f = this.add(id, x, y, hp);
    f.free = true;
    return f.ped;
  }

  remove(ped: Pedestrian): void {
    const f = this.folk.find((x) => x.ped === ped);
    if (!f) return;
    this.folk = this.folk.filter((x) => x !== f);
    f.label.destroy();
    const peds = this.game.combat.peds;
    if (peds.includes(ped)) peds.splice(peds.indexOf(ped), 1);
    ped.destroy();
  }

  private add(id: NpcId, x: number, y: number, hp = 200): Folk {
    const g = this.game;
    const ped = new Pedestrian(g, x, y, 0, true, NPCS[id].sprite, hp);
    ped.scripted = true;
    ped.setRotation(Math.PI / 2);
    g.cameras.getCamera('minimap')?.ignore(ped);
    g.combat.peds.push(ped);
    const label = g.add.text(x, y - 13, '', pixelFont(14, NPCS[id].css)).setOrigin(0.5).setScale(0.5).setStroke('#000', 3).setDepth(44);
    g.cameras.getCamera('minimap')?.ignore(label);
    const f: Folk = { id, ped, label, home: { x, y } };
    this.folk.push(f);
    return f;
  }

  /** Postava, se kterou jde zrovna mluvit (pěšky, kousek od ní). */
  nearby(): Folk | null {
    const g = this.game;
    if (g.driving || g.player.dead || g.story.inputBlocked) return null;
    return this.folk.find((f) => !f.free && f.ped.active && f.ped.alive && f.ped.visible && Phaser.Math.Distance.Between(f.ped.x, f.ped.y, g.player.x, g.player.y) < TALK_RANGE) ?? null;
  }

  talkTo(f: Folk): void {
    const story = this.game.story;
    if (f.id === 'kobyla') story.talk('kobyla2');
    else if (f.id === 'dennyVysoky') story.talkNpc('dennyVysoky', 'Game', this.garageDialog());
  }

  update(): void {
    const g = this.game;
    for (const f of this.folk) {
      const p = f.ped;
      if (!p.active) continue;
      // Denny je mezi 13 a 17 v eRku: před garáží ho není vidět.
      const away = f.id === 'dennyVysoky' && g.story.inPub('dennyVysoky');
      if (away !== !p.visible && !g.inView(f.home.x, f.home.y)) {
        p.setVisible(!away);
        (p.body as Phaser.Physics.Arcade.Body).enable = !away;
      }
      f.label.setVisible(p.visible && p.alive).setText(g.story.knows(f.id) ? NPCS[f.id].name : '???').setPosition(Math.round(p.x), Math.round(p.y - 13));
      if (!p.alive || f.free) continue;
      const body = p.body as Phaser.Physics.Arcade.Body;
      if (Phaser.Math.Distance.Between(p.x, p.y, f.home.x, f.home.y) > 6) g.walkTo(p, f.home, 40);
      else body.setVelocity(0, 0);
      const focus = g.driving ?? g.player;
      if (Phaser.Math.Distance.Between(p.x, p.y, focus.x, focus.y) < 80) p.setRotation(Phaser.Math.Angle.Between(p.x, p.y, focus.x, focus.y));
    }
    this.garage();
  }

  /** Kdo přijede k Dennymu (autem a zastaví, nebo dojde pěšky), tomu nabídne garáž. */
  private garage(): void {
    const g = this.game;
    const f = this.folk.find((x) => x.id === 'dennyVysoky');
    // Při misi „Auto pro Dennyho“ řeší příjezd k garáži mise.
    if (!f || g.story.inputBlocked || g.story.state.job === 'denny-auto') return;
    const focus = g.driving ?? g.player;
    const d = Phaser.Math.Distance.Between(focus.x, focus.y, f.home.x, f.home.y);
    if (d > 70) this.dennyOffered = false;
    if (!f.ped.visible || !f.ped.alive) {
      const now = g.time.now / 1000;
      if (d < 40 && g.driving && now - this.closedToastAt > 10) {
        this.closedToastAt = now;
        g.toast(g.story.festival ? 'Zavřeno. Vysoký Denny je na festivalu v eRku. Hm.' : 'Zavřeno. Vysoký Denny je v eRku (13–17). Hm.');
      }
      return;
    }
    if (g.driving && !this.dennyOffered && d < 40 && Math.abs(g.driving.speed) < 25) {
      this.dennyOffered = true;
      g.story.talk(this.garageDialog());
    }
  }

  /** Garáž jako rozhovor s Dennym (ADR-014): oprava, přelakování, výkup. */
  private garageDialog(): Dialog {
    const g = this.game;
    const q = g.economy.garageQuote();
    const end = (text: string): DialogOption => ({ text });
    if (!q || !g.driving) {
      return {
        id: 'garage',
        start: 'g0',
        nodes: {
          g0: { speaker: 'dennyVysoky', text: 'Hm. Přijeď autem.', enter: (c) => c.know('dennyVysoky'), options: [end('Dobře.'), { text: 'Co umíš?', next: 'g1' }, end('Hm.')] },
          g1: { speaker: 'dennyVysoky', text: 'Opravím. Přelakuju. Koupím. Hm.', options: [end('To stačí.'), end('Přijedu.'), end('Hm.')] },
        },
      };
    }
    const v = g.driving;
    return {
      id: 'garage',
      start: 'g',
      nodes: {
        g: {
          speaker: 'dennyVysoky',
          text: `Hm. ${v.spec.name}. Co s ním?`,
          enter: (c) => c.know('dennyVysoky'),
          options: [
            { text: 'Oprav ho, nebo přelakuj.', next: 'fix' },
            { text: `Kup ho. (${q.price} Kč)`, when: () => !v.wrecked, do: () => g.economy.sell(q.price) },
            end('Nic, jen jedu kolem.'),
          ],
        },
        fix: {
          speaker: 'dennyVysoky',
          text: q.repair ? 'Hm. Oprava, nebo lak?' : 'Hm. Opravovat není co. Lak?',
          options: [
            { text: q.repair ? `Oprav ho. (${q.repair} Kč)` : 'Oprav ho. (není co)', cost: q.repair, when: () => q.repair > 0, do: () => g.economy.repair(0) },
            { text: `Přelakuj ho, ať zmizí. (${q.respray} Kč)`, cost: q.respray, when: () => q.resprayOk, do: () => g.economy.respray(0) },
            end('Nech to být.'),
          ],
        },
      },
    };
  }
}
