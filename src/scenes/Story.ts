import Phaser from 'phaser';
import { TILE } from '../config';
import { Sound } from '../audio/Sound';
import { Step, type StepResult } from '../missions/steps';
import { actOf, missionOf, nextMission } from '../story/acts';
import type { Dialog, DialogCtx } from '../story/dialog';
import { DIALOGS, RANDOM_STAMGAST, randomStamgast } from '../story/dialogs';
import { allJobsDone, doneFlag, jobBy, jobOf, jobStatus, type JobId } from '../story/jobs';
import { inPub, type NpcId } from '../story/npcs';
import { Trailer } from '../entities/Trailer';
import type { Point } from '../systems/combat';
import type { StoryState } from '../systems/save';
import type { DialogData } from './DialogScene';
import type { GameScene } from './GameScene';
import { Intro } from './Intro';
import { createJob } from './jobs';
import type { Job } from './jobs/Job';
import { jobActiveDialog, jobOfferDialog } from './jobs/offers';
import { PAL_IDS, PAL_INFO, type PalId } from './Pals';
import { STAMGASTI } from '../story/npcs';

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
  /** Oznámení, která počkají, až bude hráč zase venku (z hospody se banner neukáže). */
  private pending: Array<{ banner: string; toast: string }> = [];
  /** Rozdělaná mise od štamgasta. */
  job: Job | null = null;
  /** Vlečka za traktorem před eRkem (mise Dennyho sochaře). */
  trailer: Trailer | null = null;
  /** Dialogy, které vznikají za běhu (handlování, garáž, nabídky misí). */
  private dynamic = new Map<string, () => Dialog | null>();

  constructor(private game: GameScene) {
    this.state = game.progress.story;
    const pub = game.world.buildings.find((b) => b.name === 'Hospoda')!;
    this.pubDoor = { x: (pub.x + pub.w / 2) * TILE, y: (pub.y + pub.h) * TILE + 7 };
    this.marker = game.add.circle(0, 0, 10, 0xffd23f, 0.25).setStrokeStyle(2, 0xffd23f).setDepth(6).setVisible(false);
    game.tweens.add({ targets: this.marker, scale: 1.5, duration: 600, yoyo: true, repeat: -1 });
    this.miniMarker = game.add.circle(0, 0, 50, 0xffd23f).setDepth(21).setVisible(false);
    game.cameras.main.ignore(this.miniMarker);
    game.cameras.getCamera('minimap')?.ignore(this.marker);
    this.attachTrailer();
    this.startMission();
    this.resumeJob();
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

  /** Je postava teď v eRku? (Zjebal čeká venku na odvoz, Denny sochař v ateliéru na lešení.) */
  inPub(id: NpcId): boolean {
    if (id === 'zjebal' && this.state.job === 'zjebal-domu') return false;
    if (id === 'dennySochar' && this.state.job === 'sochar-leseni') return false;
    if (this.game.pals.id === id) return false;
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
    const dyn = this.dynamic.get(id);
    if (dyn) return dyn();
    return DIALOGS[id === RANDOM_STAMGAST ? randomStamgast(this.game.random) : id] ?? null;
  }

  /** Dialog, který vzniká až za běhu (navazuje se na něj přes `then: id`). */
  setDynamic(id: string, make: () => Dialog | null): void {
    this.dynamic.set(id, make);
  }

  /**
   * Rozhovor s postavou: když má pro hráče misi, nejdřív ji nabídne (nebo se zeptá,
   * jak to jde); „Radši pokecáme“ vede na její běžný dialog `base`.
   */
  talkNpc(npc: NpcId, caller = 'Game', base?: Dialog, onDone?: () => void): void {
    let baseId: string = npc;
    if (base) {
      baseId = `base:${npc}`;
      this.setDynamic(baseId, () => base);
    }
    this.hardStart();
    const def = jobBy(npc);
    const status = def ? jobStatus(def.id, this.state.job, this.state.flags) : 'done';
    // Těžší start (ADR-006): kdo se s nikým nebavil, musí štamgastům nejdřív koupit pivo.
    if (this.has('refusedTalk') && (this.state.rel[npc] ?? 0) < 0 && (STAMGASTI as string[]).includes(npc)) {
      this.talk(this.makeUpDialog(npc, baseId), caller, onDone);
      return;
    }
    if (def && status === 'open') this.talk(jobOfferDialog(this, def.id, baseId), caller, onDone);
    else if (def && status === 'active') this.talk(jobActiveDialog(this, def.id, baseId), caller, onDone);
    else if (caller === 'Pub' && (PAL_IDS as string[]).includes(npc)) this.talk(this.palDialog(npc as PalId, baseId), caller, onDone);
    else this.talk(baseId, caller, onDone);
  }

  /** „Pojď se mnou“: štamgast jde s hráčem ven jako parťák (ADR-025). */
  private palDialog(npc: PalId, base: string): Dialog {
    const info = PAL_INFO[npc];
    return {
      id: 'pal-offer',
      start: 'p',
      nodes: {
        p: {
          speaker: npc,
          text: npc === 'dennyVysoky' ? 'Hm?' : npc === 'dennySochar' ? 'Jo? Nemáš stovku? Nebo něco?' : 'Co potřebuješ, {jmeno}?',
          options: [
            { text: 'Pojď se mnou ven.', next: 'info' },
            { text: 'Radši pokecáme.', then: base },
            { text: 'Nic, jen jsem tě {pozdravil|pozdravila}.' },
          ],
        },
        info: {
          speaker: npc,
          text: `S tebou? Proč ne. (+ ${info.plus} − ${info.minus})`,
          options: [
            { text: 'Jdem.', do: () => this.game.pals.take(npc) },
            { text: 'Ještě ne.' },
            { text: 'Radši pokecáme.', then: base },
          ],
        },
      },
    };
  }

  /** Smír po „s nikým se bavit nechci“: pivo, nebo omluva. */
  private makeUpDialog(npc: NpcId, base: string): Dialog {
    return {
      id: 'make-up',
      start: 'm',
      nodes: {
        m: {
          speaker: npc,
          text: npc === 'dennyVysoky' ? 'Hm. Ty ses s nikým nebavil{|a}. Hm.' : 'Á, {ten|ta}, co se s nikým nebaví. Teď by ses bavil{|a}, co? Nejdřív pivo.',
          options: [
            { text: 'Dám ti pivo. (45 Kč)', cost: 45, do: (c) => c.rel(npc, 20), then: base },
            { text: 'Promiň, byl{|a} jsem unavená z cesty.', do: (c) => c.rel(npc, 5) },
            { text: 'Tak nic.' },
          ],
        },
      },
    };
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
      this.announce(`AKT ${this.state.act} POKRAČUJE…`, 'Festival v eRku jede naplno. Štamgasti mají pro tebe práci.');
      Sound.jingle(true);
    }
    this.startMission();
    this.game.saveGame(false);
  }

  /** Traktor před eRkem dostane vlečku. */
  private attachTrailer(): void {
    const g = this.game;
    const tractor = g.vehicles
      .filter((v) => v.spec.kind === 'traktor' && !v.owner && Phaser.Math.Distance.Between(v.x, v.y, this.pubDoor.x, this.pubDoor.y) < 160)
      .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, this.pubDoor.x, this.pubDoor.y) - Phaser.Math.Distance.Between(b.x, b.y, this.pubDoor.x, this.pubDoor.y))[0];
    if (!tractor) return;
    this.trailer = new Trailer(g, tractor);
    this.trailer.ignoreOn(g.cameras.getCamera('minimap') ?? undefined);
  }

  /** Těžší start (ADR-006): po „s nikým se bavit nechci“ štamgasti začínají naštvaní. */
  private hardStart(): void {
    if (!this.has('refusedTalk') || this.has('hardStart')) return;
    this.flag('hardStart');
    for (const id of STAMGASTI) this.state.rel[id] = Math.min(this.state.rel[id] ?? 0, -15);
  }

  /** Banner a hláška; když je hráč v hospodě, počkají, až vyjde ven. */
  announce(banner: string, toast: string): void {
    this.pending.push({ banner, toast });
  }

  // ---------- Mise od štamgastů ----------

  /** Hráč misi přijal v rozhovoru. */
  startJob(id: JobId): void {
    if (this.job) return;
    this.state.job = id;
    const job = createJob(id, this.game, this);
    this.job = job;
    job.start();
    Sound.jingle(true);
    this.game.saveGame(false);
  }

  /** Po načtení hry: rozprodávání čaje pokračuje (čaj je v kapse), ostatní mise se zruší. */
  private resumeJob(): void {
    const id = this.state.job as JobId;
    if (!id) return;
    if (id === 'omyx-caj' && this.game.player.arsenal.ammo.caj > 0) {
      const job = createJob(id, this.game, this);
      this.job = job;
      job.start(true);
      return;
    }
    this.state.job = '';
    if (jobOf(id)) this.announce('', `Rozdělaná mise „${jobOf(id)!.title}“ se po načtení zrušila. Vezmi si ji znovu.`);
  }

  private finishJob(ok: boolean, reason = ''): void {
    const job = this.job;
    if (!job) return;
    const def = jobOf(job.id)!;
    job.cleanup();
    this.job = null;
    this.state.job = '';
    if (ok) {
      this.flag(doneFlag(def.id));
      if (def.reward.money) this.game.player.money += def.reward.money;
      this.state.rel[def.giver] = Phaser.Math.Clamp((this.state.rel[def.giver] ?? 0) + def.reward.rel, -100, 100);
      const pay = def.reward.money ? ` +${def.reward.money} Kč.` : '';
      this.announce(`MISE SPLNĚNA: ${def.title.toUpperCase()}`, `${job.doneText}${pay}`.trim());
      Sound.jingle(true);
      if (allJobsDone(this.state.flags) && !this.has('a1-jobsDone')) {
        this.flag('a1-jobsDone');
        this.announce(`AKT ${this.state.act} POKRAČUJE…`, 'Všichni štamgasti jsou spokojení. Teda na jejich poměry.');
      }
    } else {
      this.announce('MISE NEVYŠLA', reason || job.failReason);
      Sound.jingle(false);
    }
    this.game.saveGame(false);
  }

  /** Hráč to vzdal v rozhovoru s tím, kdo misi dal. */
  abandonJob(): void {
    this.finishJob(false, 'Vzdáno. Štamgasti si to budou pamatovat. Do zítřka, pak zapomenou.');
  }

  update(dt: number): void {
    const g = this.game;
    this.intro?.update(dt);
    this.hardStart();
    this.trailer?.update();
    if (this.pending.length && !this.cutscene && !this.dialogOpen) {
      const p = this.pending.shift()!;
      if (p.banner) g.events.emit('banner', p.banner);
      if (p.toast) g.toast(p.toast);
    }
    if (this.job && !this.dialogOpen) {
      const r = this.job.update(dt);
      if (r === 'done') this.finishJob(true);
      else if (r === 'fail') this.finishJob(false);
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
    const job = !step && this.job ? this.job : null;
    const target = step?.target() ?? job?.target() ?? null;
    const act = actOf(this.state.act);
    g.registry.set('act', `Akt ${act.num}: ${act.title}`);
    let hud: MissionHud | null = null;
    if (m && step) hud = { title: `AKT ${act.num} · ${m.title.toUpperCase()}`, objective: step.objective(), target };
    else if (job) hud = { title: `AKT ${act.num} · ${jobOf(job.id)!.title.toUpperCase()}`, objective: job.objective(), target };
    // Vysoký Denny jako parťák moc neporadí.
    if (hud && g.pals.near('dennyVysoky')) hud.objective = 'Hm.';
    g.registry.set('mission', hud);
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
    // Denny sochař se občas přidá sám (zbavíš se ho jen pěstí, ADR-015).
    if (this.has('pubEntryDone') && this.state.job !== 'sochar-leseni' && g.pals.maybeSocharTagsAlong(0.2)) g.toast('Denny sochař: „Jdu s tebou, stejně nemám co dělat.“ (Zbavíš se ho pár ranami pěstí.)');
    g.pals.spawnAt(this.pubDoor.x + 14, this.pubDoor.y + 14);
  }
}
