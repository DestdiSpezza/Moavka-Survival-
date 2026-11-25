import type { JobId } from '../../story/jobs';
import type { GameScene } from '../GameScene';
import type { Story } from '../Story';
import { DennyJob } from './DennyJob';
import type { Job } from './Job';
import { TeaJob } from './TeaJob';
import { TractorJob } from './TractorJob';
import { ZjebalJob } from './ZjebalJob';

export function createJob(id: JobId, game: GameScene, story: Story): Job {
  switch (id) {
    case 'omyx-caj':
      return new TeaJob(game, story);
    case 'zjebal-domu':
      return new ZjebalJob(game, story);
    case 'denny-auto':
      return new DennyJob(game, story);
    case 'sochar-leseni':
      return new TractorJob(game, story);
  }
}
