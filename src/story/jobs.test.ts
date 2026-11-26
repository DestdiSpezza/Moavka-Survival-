import { describe, expect, it } from 'vitest';
import { allJobsDone, bottlesEnough, carriesPassenger, poolRound, dennyAccepts, doneFlag, jobBy, JOBS, jobStatus, rideTimeLimit } from './jobs';

describe('mise v eRku', () => {
  it('osm misí, každou dává jiný štamgast', () => {
    expect(JOBS.map((j) => j.giver)).toEqual(['omyx', 'zjebal', 'dennyVysoky', 'dennySochar', 'metejka', 'vesta', 'kibi', 'plotkova']);
    expect(new Set(JOBS.map((j) => j.giver)).size).toBe(JOBS.length);
    expect(jobBy('omyx')?.id).toBe('omyx-caj');
    expect(jobBy('kibi')?.id).toBe('kibi-schovej');
    expect(jobBy('prchard')).toBeNull();
  });

  it('kulečník: rada je bezpečná, posunutá koule riskantní; flašky musí stačit na zastávky', () => {
    expect(poolRound('rada', 0.5, 0)).toEqual({ won: true, caught: false });
    expect(poolRound('rada', 0.6, 0)).toEqual({ won: false, caught: false });
    expect(poolRound('koule', 0.1, 0.3)).toEqual({ won: false, caught: true });
    expect(poolRound('koule', 0.85, 0.5)).toEqual({ won: true, caught: false });
    expect(bottlesEnough(3, 3)).toBe(true);
    expect(bottlesEnough(2, 3)).toBe(false);
  });

  it('lešení až po Zjebalovi, najednou jen jedna mise', () => {
    expect(jobStatus('sochar-leseni', '', [])).toBe('locked');
    expect(jobStatus('sochar-leseni', '', [doneFlag('zjebal-domu')])).toBe('open');
    expect(jobStatus('omyx-caj', 'denny-auto', [])).toBe('busy');
    expect(jobStatus('denny-auto', 'denny-auto', [])).toBe('active');
    expect(jobStatus('omyx-caj', '', [doneFlag('omyx-caj')])).toBe('done');
  });

  it('všechny hotové', () => {
    expect(allJobsDone(JOBS.slice(1).map((j) => doneFlag(j.id)))).toBe(false);
    expect(allJobsDone(JOBS.map((j) => doneFlag(j.id)))).toBe(true);
  });

  it('Zjebal: čas na trasu +10 %, pomalejší auto má víc času', () => {
    const car = rideTimeLimit(1800, 190);
    const tractor = rideTimeLimit(1800, 75);
    expect(car).toBe(Math.ceil((1800 / (190 * 0.62)) * 1.1));
    expect(tractor).toBeGreaterThan(car);
    expect(rideTimeLimit(100, 190)).toBe(12);
    expect(carriesPassenger('osobak')).toBe(true);
    expect(carriesPassenger('skutr')).toBe(false);
    expect(carriesPassenger('kolo')).toBe(false);
  });

  it('Denny bere jen celé auto bez hvězd a ne policejní', () => {
    expect(dennyAccepts(1, 0, 'osobak')).toBe('ok');
    expect(dennyAccepts(0.89, 0, 'osobak')).toBe('damaged');
    expect(dennyAccepts(1, 1, 'osobak')).toBe('wanted');
    expect(dennyAccepts(1, 0, 'policie')).toBe('police');
  });
});
