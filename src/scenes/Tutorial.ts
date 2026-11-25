import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { advanceTutorial, TUTORIAL, type TutorialState } from '../systems/tutorial';
import type { GameScene } from './GameScene';

/** Nápovědy pro novou hru. Splněné kroky se ukládají s postupem, H je skryje všechny. */
export class Tutorial {
  private current: string | null = null;
  private shownFor = 0;
  private done: Set<string>;
  private state: TutorialState = { moved: 0, sprinted: false, inCar: false, drove: 0, armed: false, missionStarted: false, wanted: 0, shownFor: 0 };
  private last: { x: number; y: number } | null = null;
  private hideKey: Phaser.Input.Keyboard.Key;

  constructor(private game: GameScene) {
    this.done = new Set(game.progress.tutorial);
    if (!Sound.settings.tutorial) for (const t of TUTORIAL) this.done.add(t.id);
    this.hideKey = game.input.keyboard!.addKey('H');
  }

  update(dt: number): void {
    const g = this.game;
    if (Phaser.Input.Keyboard.JustDown(this.hideKey)) {
      for (const t of TUTORIAL) this.done.add(t.id);
      this.current = null;
    }
    const f = g.driving ?? g.player;
    if (this.last) {
      const d = Phaser.Math.Distance.Between(this.last.x, this.last.y, f.x, f.y);
      if (d < 50) {
        if (g.driving) this.state.drove += d;
        else this.state.moved += d;
      }
    }
    this.last = { x: f.x, y: f.y };
    const s = this.state;
    s.sprinted ||= g.player.sprinting;
    s.inCar ||= !!g.driving;
    s.armed ||= g.player.arsenal.owned.length > 1;
    s.missionStarted ||= !!g.missions.active;
    s.wanted = g.police.wanted.level;

    this.shownFor += dt;
    s.shownFor = this.shownFor;
    const next = advanceTutorial(this.done, this.current, s);
    if (next !== this.current) {
      this.current = next;
      this.shownFor = 0;
      g.progress.tutorial = [...this.done];
    }
    g.registry.set('hint', this.current ? TUTORIAL.find((t) => t.id === this.current)!.text : null);
  }
}
