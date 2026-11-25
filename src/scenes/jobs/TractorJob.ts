import Phaser from 'phaser';
import type { Pedestrian } from '../../entities/Pedestrian';
import type { Point } from '../../systems/combat';
import { Job, type JobResult } from './Job';
import { doorOf } from './route';

type Phase = 'board' | 'toChurch' | 'loading' | 'toPila' | 'unloading' | 'end';

const PIECES = 8;

/**
 * Lešení pro Dennyho sochaře (ADR-023): traktorem s vlečkou od eRka ke kostelu,
 * naložit lešení (kusy létají do vlečky), odvézt na starou pilu do „ateliéru“ a vyložit.
 * Jde až po misi se Zjebalem (od něj jsou klíčky).
 */
export class TractorJob extends Job {
  readonly id = 'sochar-leseni' as const;
  private phase: Phase = 'board';
  private load: Point = { x: 0, y: 0 };
  private unload: Point = { x: 0, y: 0 };
  private pile: Phaser.GameObjects.Image | null = null;
  private dropPile: Phaser.GameObjects.Image | null = null;
  private sochar: Pedestrian | null = null;
  private timer = 0;
  private thrown = 0;
  private greeted = false;

  start(): void {
    const g = this.g;
    const kostel = g.world.buildings.find((b) => b.name === 'Kostel');
    const pila = g.world.buildings.find((b) => b.name === 'Pila');
    if (kostel) this.load = doorOf(kostel, 2);
    if (pila) this.unload = doorOf(pila, 2.2);
    this.pile = g.add.image(this.load.x + 22, this.load.y - 4, 'leseni-hromada').setDepth(4);
    g.cameras.getCamera('minimap')?.ignore(this.pile);
    this.sochar = g.townsfolk.spawn('dennySochar', this.unload.x + 24, this.unload.y - 6);
    this.story.trailer?.setLoaded(false);
    // Klíčky má hráč od Zjebala: traktor se nehlásí jako krádež.
    if (this.tractor) this.tractor.stolen = true;
  }

  private get tractor() {
    return this.story.trailer?.tractor ?? null;
  }

  private inTractor(): boolean {
    return !!this.tractor && this.g.driving === this.tractor;
  }

  objective(): string {
    switch (this.phase) {
      case 'board':
        return 'Nasedni do traktoru s vlečkou před eRkem';
      case 'toChurch':
        return this.inTractor() ? 'Dojeď traktorem ke kostelu pro lešení' : 'Lešení se veze traktorem. Vrať se do traktoru.';
      case 'toPila':
        return this.inTractor() ? 'Odvez lešení Dennymu sochaři na starou pilu' : 'Lešení je ve vlečce. Vrať se do traktoru.';
      default:
        return 'Nakládá se. Pomalu, jako na faře.';
    }
  }

  target(): Point | null {
    if (this.phase === 'board') return this.tractor;
    if (this.phase === 'toChurch') return this.inTractor() ? this.load : this.tractor;
    if (this.phase === 'toPila') return this.inTractor() ? this.unload : this.tractor;
    return null;
  }

  update(dt: number): JobResult {
    const g = this.g;
    const t = this.tractor;
    if (!t || !t.active || t.wrecked) {
      this.failReason = 'Traktor je na šrot. Farář se bude modlit. Za tebe ne.';
      return 'fail';
    }
    if (this.sochar && !this.greeted && Phaser.Math.Distance.Between(t.x, t.y, this.sochar.x, this.sochar.y) < 90 && this.phase === 'toPila') {
      this.greeted = true;
      g.speech.say(this.sochar, 'Paráda! Sem s tím! Opatrně, je to umění. Budoucí.', 0x5a4a3a);
    }
    switch (this.phase) {
      case 'board':
        if (this.inTractor()) this.phase = 'toChurch';
        return 'run';
      case 'toChurch':
        if (this.arrived(this.load)) this.startMoving('loading');
        return 'run';
      case 'toPila':
        if (this.arrived(this.unload)) this.startMoving('unloading');
        return 'run';
      case 'loading':
      case 'unloading':
        return this.moving(dt);
      case 'end':
        return 'done';
    }
  }

  private arrived(p: Point): boolean {
    const t = this.tractor!;
    return this.inTractor() && Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y) < 44 && Math.abs(t.speed) < 15;
  }

  private startMoving(phase: 'loading' | 'unloading'): void {
    this.phase = phase;
    this.timer = 0;
    this.thrown = 0;
    this.story.cutscene = true;
    this.g.registry.set('cutscene', { title: '', hint: '' });
    if (phase === 'unloading') {
      this.dropPile = this.g.add.image(this.unload.x + 6, this.unload.y + 18, 'leseni-hromada').setDepth(4).setScale(0.2).setAlpha(0);
      this.g.cameras.getCamera('minimap')?.ignore(this.dropPile);
    }
  }

  /** Kusy lešení létají jeden po druhém: z hromady do vlečky, nebo z vlečky na hromadu. */
  private moving(dt: number): JobResult {
    const g = this.g;
    const trailer = this.story.trailer!;
    this.timer += dt;
    const loading = this.phase === 'loading';
    if (this.thrown < PIECES && this.timer > 0.4 + this.thrown * 0.35) {
      const from = loading ? { x: this.pile!.x, y: this.pile!.y } : trailer.center;
      const to = loading ? trailer.center : { x: this.dropPile!.x, y: this.dropPile!.y };
      const piece = g.add.image(from.x, from.y, this.thrown % 2 ? 'leseni-prkno' : 'leseni-trubka').setDepth(46).setRotation(g.random() * Math.PI);
      g.cameras.getCamera('minimap')?.ignore(piece);
      g.tweens.add({ targets: piece, x: to.x + (g.random() - 0.5) * 8, y: to.y + (g.random() - 0.5) * 6, rotation: piece.rotation + Math.PI, duration: 420, ease: 'Sine.inOut', onComplete: () => piece.destroy() });
      g.tweens.add({ targets: piece, scale: 1.8, duration: 210, yoyo: true });
      this.thrown++;
      const share = this.thrown / PIECES;
      if (loading) {
        this.pile!.setScale(1 - share * 0.8).setAlpha(1 - share * 0.7);
        if (this.thrown === PIECES / 2) trailer.setLoaded(true);
      } else {
        this.dropPile!.setScale(0.2 + share * 0.8).setAlpha(Math.min(1, share * 1.5));
        if (this.thrown === PIECES) trailer.setLoaded(false);
      }
    }
    if (this.timer > 0.9 + PIECES * 0.35) {
      this.story.cutscene = false;
      g.registry.set('cutscene', null);
      if (loading) {
        this.pile?.destroy();
        this.pile = null;
        g.toast('Naloženo. Farář žehnal. Nebo mával, že máš jet.');
        this.phase = 'toPila';
      } else {
        if (this.sochar) g.speech.say(this.sochar, 'Lešení jako metafora. Nebo ho prodám. Uvidíme, co dřív.', 0x5a4a3a, 3200);
        this.doneText = 'Denny sochař: „Půlka z farářových pěti stovek je tvoje. Druhou jsem… investoval.“';
        this.phase = 'end';
      }
    }
    return 'run';
  }

  cleanup(): void {
    const g = this.g;
    if (this.story.cutscene) {
      this.story.cutscene = false;
      g.registry.set('cutscene', null);
    }
    this.pile?.destroy();
    const drop = this.dropPile;
    if (drop) g.tweens.add({ targets: drop, alpha: 0, delay: 8000, duration: 1000, onComplete: () => drop.destroy() });
    const s = this.sochar;
    if (s) g.time.delayedCall(4000, () => g.townsfolk.remove(s));
    this.story.trailer?.setLoaded(false);
  }
}
