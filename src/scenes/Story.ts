import Phaser from 'phaser';
import { TILE } from '../config';
import { Sound } from '../audio/Sound';
import { Step, type StepResult } from '../missions/steps';
import { actOf, missionOf, nextMission } from '../story/acts';
import type { Dialog, DialogCtx } from '../story/dialog';
import { DIALOGS, RANDOM_STAMGAST, randomStamgast } from '../story/dialogs';
import { inPub, type NpcId } from '../story/npcs';
import type { Point } from '../systems/combat';
import type { StoryState } from '../systems/save';
import type { DialogData } from './DialogScene';
import type { GameScene } from './GameScene';
import { Intro } from './Intro';

export interface MissionHud {
  title: string;
  objective: string;
  target: Point | null;
}

/** Mise „Do hospody“: ukazatel na dveře eRka; splní ji první rozhovor s Prchardem. */
class PubStep extends Step {
  constructor(private story: Story) {
    super();
  }
  objective(): string {
    return 'Dojdi do hospody eRko (E u dveří)';
  }
  target(): Point {
    return this.story.pubDoor;
  }
  update(): StepResult {
    return this.story.has('pubEntryDone') ? 'done' : 'run';
  }
}

/**
 * Příběh po aktech (ADR-001, ADR-002): běží aktuální mise, otevírá dialogy,
 * pouští do hospody a drží stav příběhu (příznaky, vztahy, koho hráč zná),
 * který se ukládá s hrou.
 */
export class Story {
  readonly state: StoryState;
  readonly pubDoor: Point;
  /** Úvodní scéna: hráč postavu neovládá. */
  cutscene = false;
  dialogOpen = false;
  private steps: Step[] = [];
  private index = 0;
  private intro: Intro | null = null;
  private marker: Phaser.GameObjects.Arc;
  private miniMarker: Phaser.GameObjects.Arc;
  /** Oznámení, které počká, až bude hráč zase venku (z hospody se banner neukáže). */
  private pending: { banner: string; toast: string } | null = null;

  constructor(private game: GameScene) {
    this.state = game.progress.story;
    const pub = game.world.buildings.find((b) => b.name === 'Hospoda')!;
    this.pubDoor = { x: (pub.x + pub.w / 2) * TILE, y: (pub.y + pub.h) * TILE + 7 };
    this.marker = game.add.circle(0, 0, 10, 0xffd23f, 0.25).setStrokeStyle(2, 0xffd23f).setDepth(6).setVisible(false);
    game.tweens.add({ targets: this.marker, scale: 1.5, duration: 600, yoyo: true, repeat: -1 });
    this.miniMarker = game.add.circle(0, 0, 50, 0xffd23f).setDepth(21).setVisible(false);
    game.cameras.main.ignore(this.miniMarker);
    game.cameras.getCamera('minimap')?.ignore(this.marker);
    this.startMission();
  }

  get hero() {
    return this.game.progress.hero;
  }

  get money(): number {
    return this.game.player.money;
  }

  get inputBlocked(): boolean {
    return this.cutscene || this.dialogOpen;
  }

  /** Festival na začátku Aktu 1: v eRku sedí všichni, dokud hráč poprvé nepromluví s Prchardem. */
  get festival(): boolean {
    return !this.has('pubEntryDone');
  }

  has(flag: string): boolean {
    return this.state.flags.includes(flag);
  }

  flag(flag: string): void {
    if (!this.has(flag)) this.state.flags.push(flag);
  }

  knows(id: NpcId): boolean {
    return this.state.known.includes(id);
  }

  /** Je postava teď v eRku? */
  inPub(id: NpcId): boolean {
    return inPub(id, this.game.gangs.minute, this.festival);
  }

  /** Smí hráč do dané oblasti? Raškovice odemyká příběh (ADR-011). */
  areaOpen(area: string): boolean {
    return this.has(`open:${area}`);
  }

  /** Co smí dialog udělat se hrou. */
  ctx(): DialogCtx {
    const s = this.state;
    const g = this.game;
    return {
      hero: g.progress.hero,
      money: () => g.player.money,
      pay: (n) => {
        if (g.player.money < n) return false;
        g.player.money -= n;
        return true;
      },
      rel: (npc, d) => {
        s.rel[npc] = Phaser.Math.Clamp((s.rel[npc] ?? 0) + d, -100, 100);
      },
      relOf: (npc) => s.rel[npc] ?? 0,
      flag: (f) => this.flag(f),
      has: (f) => this.has(f),
      know: (...ids) => {
        for (const id of ids) if (!s.known.includes(id)) s.known.push(id);
      },
      count: (name, d = 0) => (s.counts[name] = (s.counts[name] ?? 0) + d),
    };
  }

  private dialogById(id: string): Dialog | null {
    return DIALOGS[id === RANDOM_STAMGAST ? randomStamgast(this.game.random) : id] ?? null;
  }

  /** Otevře dialog; scéna `caller` mezitím stojí. */
  talk(dialog: string | Dialog, caller = 'Game', onDone?: () => void): void {
    const d = typeof dialog === 'string' ? this.dialogById(dialog) : dialog;
    if (!d || this.dialogOpen) return;
    this.dialogOpen = true;
    const sm = this.game.scene;
    const data: DialogData = {
      dialog: d,
      ctx: this.ctx(),
      caller,
      resolve: (id) => this.dialogById(id),
      onEnd: () => {
        this.dialogOpen = false;
        onDone?.();
      },
    };
    sm.launch('Dialog', data);
    sm.bringToTop('Dialog');
    sm.pause(caller);
  }

  // ---------- Mise ----------

  private startMission(): void {
    for (const s of this.steps) s.cleanup(this.game);
    this.steps = [];
    this.index = 0;
    switch (this.state.mission) {
      case 'a1-prijezd':
        if (this.state.introDone) {
          this.completeMission();
          return;
        }
        this.intro = new Intro(this.game, this, () => {
          this.intro = null;
          this.state.introDone = true;
          this.completeMission();
        });
        break;
      case 'a1-hospoda':
        this.steps = [new PubStep(this)];
        break;
      default:
        break;
    }
    this.steps[0]?.start(this.game);
  }

  private completeMission(): void {
    const done = missionOf(this.state.mission);
    this.state.mission = nextMission(this.state.mission);
    if (done && !this.state.mission) {
      this.pending = { banner: `AKT ${this.state.act} POKRAČUJE…`, toast: 'Festival v eRku jede naplno. Rozhlédni se po Morávce.' };
      Sound.jingle(true);
    }
    this.startMission();
    this.game.saveGame(false);
  }

  update(dt: number): void {
    const g = this.game;
    this.intro?.update(dt);
    if (this.pending && !this.cutscene) {
      g.events.emit('banner', this.pending.banner);
      g.toast(this.pending.toast);
      this.pending = null;
    }
    const step = this.steps[this.index];
    if (step) {
      const r = step.update(g, dt);
      if (r === 'done') {
        step.cleanup(g);
        this.index++;
        if (this.index >= this.steps.length) this.completeMission();
        else this.steps[this.index].start(g);
      }
    }
    this.publishHud();
  }

  private publishHud(): void {
    const g = this.game;
    const step = this.steps[this.index];
    const m = missionOf(this.state.mission);
    const target = step?.target() ?? null;
    const act = actOf(this.state.act);
    g.registry.set('act', `Akt ${act.num}: ${act.title}`);
    g.registry.set('mission', m && step ? ({ title: `AKT ${act.num} · ${m.title.toUpperCase()}`, objective: step.objective(), target } satisfies MissionHud) : null);
    this.marker.setVisible(!!target);
    this.miniMarker.setVisible(!!target);
    if (target) {
      this.marker.setPosition(target.x, target.y);
      this.miniMarker.setPosition(target.x, target.y);
    }
  }

  // ---------- Hospoda ----------

  nearPubDoor(): boolean {
    const g = this.game;
    return !this.inputBlocked && !g.driving && !g.player.dead && Phaser.Math.Distance.Between(g.player.x, g.player.y, this.pubDoor.x, this.pubDoor.y) < 20;
  }

  enterPub(): void {
    const g = this.game;
    this.flag('enteredPub');
    (g.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    g.scene.launch('Pub', { story: this });
    g.scene.bringToTop('Pub');
    g.scene.sleep('UI');
    g.scene.pause();
  }

  /** Hospoda se otevřela: poprvé přivítá hráče Prchard (tři volby). */
  onPubOpened(): void {
    if (this.has('pubEntryDone')) return;
    this.talk('prchardEntry', 'Pub', () => {
      this.flag('pubEntryDone');
      if (this.state.mission === 'a1-hospoda') this.completeMission();
    });
  }

  exitPub(): void {
    const g = this.game;
    g.scene.stop('Pub');
    g.scene.wake('UI');
    g.scene.resume('Game');
    (g.player.body as Phaser.Physics.Arcade.Body).reset(this.pubDoor.x, this.pubDoor.y + 10);
  }
}
