import type { Point } from '../../systems/combat';
import type { Dialog } from '../../story/dialog';
import type { JobId } from '../../story/jobs';
import type { NpcId } from '../../story/npcs';
import type { GameScene } from '../GameScene';
import type { Story } from '../Story';

export type JobResult = 'run' | 'done' | 'fail';

/**
 * Běžící mise od štamgasta (ADR-020). Story ji spustí po rozhovoru, každý snímek
 * zavolá update a podle výsledku ji splní, nebo zruší s důvodem.
 */
export abstract class Job {
  /** Proč to nevyšlo (ukáže se hráči). */
  failReason = '';
  /** Co se ukáže po splnění (SMS, hláška). */
  doneText = '';

  constructor(protected g: GameScene, protected story: Story) {}

  abstract readonly id: JobId;
  abstract objective(): string;
  /** Kam ukazuje šipka a značka (nebo nikam). */
  target(): Point | null {
    return null;
  }
  /** `resume` = mise pokračuje po načtení hry. */
  start(_resume = false): void {}
  abstract update(dt: number): JobResult;
  /** E u něčeho, co patří k misi (ženská hledající Kibiho). Vrátí true, když to zpracovala. */
  interact(): boolean {
    return false;
  }
  /** Rozhovor s postavou, který mise přebírá (předání věci, soupeř o Karla); null = běžný. */
  dialogFor(_npc: NpcId, _base: string): Dialog | null {
    return null;
  }

  /** Krátká animace: hráč stojí, kroky jdou po sobě (čekání v ms, co se stane), pak `then`. */
  protected cutscene(steps: Array<[number, () => void]>, then: () => void): void {
    this.story.cutscene = true;
    let at = 0;
    for (const [ms, fn] of steps) this.g.time.delayedCall((at += ms), fn);
    this.g.time.delayedCall(at + 400, () => {
      this.story.cutscene = false;
      then();
    });
  }

  cleanup(): void {}
}
