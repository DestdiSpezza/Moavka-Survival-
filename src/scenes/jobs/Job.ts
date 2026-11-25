import type { Point } from '../../systems/combat';
import type { JobId } from '../../story/jobs';
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
  cleanup(): void {}
}
