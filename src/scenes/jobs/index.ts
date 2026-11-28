import type { JobId } from '../../story/jobs';
import type { GameScene } from '../GameScene';
import type { Story } from '../Story';
import { BottlesJob } from './BottlesJob';
import { BurialJob } from './BurialJob';
import { BabetaJob, NaftaJob } from './FetchJob';
import { KarelJob } from './KarelJob';
import { DennyJob } from './DennyJob';
import { KibiJob } from './KibiJob';
import { PoolJob } from './PoolJob';
import { VestaJob } from './VestaJob';
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
    case 'metejka-kulecnik':
      return new PoolJob(game, story);
    case 'vesta-jerab':
      return new VestaJob(game, story);
    case 'kibi-schovej':
      return new KibiJob(game, story);
    case 'plotkova-flasky':
      return new BottlesJob(game, story);
    case 'prcka-nafta':
      return new NaftaJob(game, story);
    case 'awe-karel':
      return new KarelJob(game, story);
    case 'natala-pohreb':
      return new BurialJob(game, story);
    case 'minivesta-babeta':
      return new BabetaJob(game, story);
  }
}
