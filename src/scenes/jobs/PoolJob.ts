import type { Dialog, DialogOption } from '../../story/dialog';
import { type PoolMove, poolRound } from '../../story/jobs';
import { Job, type JobResult } from './Job';

const ROUNDS = [
  'Metějka míří na bílou. Hasič Pepa se opírá o tágo a chechtá se. Plotková nese pivo.',
  'Pepa vede. Metějka tvrdí, že je to taktika. Tágo drží jak vidle.',
  'Poslední koule. Kdo ji dá, vyhrává pětistovku. Metějka se potí. Pepa si objednává rundu na Metějkovy.',
];

/**
 * Kulečník (Metějka, fáze P3): tři kola, Metějka potřebuje dvě. Hráč tajně „pomáhá“:
 * rada, strčit Hasiči do tága, nebo posunout kouli. Když Metějka prohraje, rozbije
 * tágo o hráče a svede to na Plotkovou, že neumí točit pivo.
 */
export class PoolJob extends Job {
  readonly id = 'metejka-kulecnik' as const;
  private round = 0;
  private wins = 0;
  private losses = 0;
  private last = '';
  private result: 'win' | 'lose' | null = null;

  start(): void {
    this.story.setDynamic('pool', () => this.dialog());
  }

  objective(): string {
    return 'Pomoz Metějkovi vyhrát kulečník (v eRku)';
  }

  private move(m: PoolMove): void {
    const g = this.g;
    const r = poolRound(m, g.random(), g.random());
    this.round++;
    if (r.caught) {
      this.losses++;
      g.gangs.mission('hasici', 'hurtMember');
      this.last = 'Pepa: „HEJ! Já to viděl! Tohle kolo je moje a ty mi dlužíš pivo.“';
    } else if (r.won) {
      this.wins++;
      this.last = ['Koule zapadla. Metějka: „Viděli jste to? Čistá technika.“', 'Metějka trefil. Sám je z toho v šoku.', 'Bum. Metějka zvedá ruce, jako by vyhrál Ligu mistrů.'][this.round % 3];
    } else {
      this.losses++;
      this.last = ['Koule se odrazila a zastavila se o Metějkovo pivo.', 'Metějka minul. „To bylo schválně. Psychologie.“', 'Tágo sklouzlo. Metějka obviňuje křídu.'][this.round % 3];
    }
  }

  private dialog(): Dialog {
    const end = (text: string): DialogOption => ({ text });
    const play = (text: string, m: PoolMove): DialogOption => ({ text, do: () => this.move(m), then: 'pool' });
    if (this.wins >= 2 || this.losses >= 2) {
      const win = this.wins >= 2;
      return {
        id: 'pool',
        start: 'end',
        nodes: {
          end: {
            speaker: 'metejka',
            text: win
              ? `${this.last} VYHRÁL JSEM! Kulečník je o hlavě. Já mám hlavu. Tady máš něco z výhry, žes koukal{|a}.`
              : `${this.last} PROHRÁL JSEM?! To pivo! Plotková neumí točit pivo, proto jsem prohrál! *rozbije tágo o tvoje záda*`,
            enter: () => this.finish(win),
            options: win ? [end('Gratuluju.'), end('Čistá technika.'), end('Hlava, jasně.')] : [end('Au!'), end('Za co mě?!'), end('Plotková za nic nemůže.')],
          },
        },
      };
    }
    return {
      id: 'pool',
      start: 'r',
      nodes: {
        r: {
          speaker: 'narrator',
          text: `${this.last ? `${this.last}\n` : ''}${ROUNDS[Math.min(this.round, 2)]} (Metějka ${this.wins} : ${this.losses} Pepa)`,
          options: [
            play('Pošeptat Metějkovi: „Míř na kouli, ne na Plotkovou.“', 'rada'),
            play('Strčit Pepovi do tága, když míří.', 'strcit'),
            play('Posunout kouli, když se nikdo nedívá.', 'koule'),
          ],
        },
      },
    };
  }

  private finish(win: boolean): void {
    if (this.result) return;
    this.result = win ? 'win' : 'lose';
    const g = this.g;
    if (win) {
      this.doneText = 'Metějka vyhrál. Bude to vyprávět deset let. Ty jsi v tom příběhu nebyl{|a}.';
    } else {
      g.player.health = Math.max(5, g.player.health - 15);
      this.failReason = 'Metějka prohrál, tágo je o tvoje záda. Plotková: „Já ti točím dvacet let, Metějko. A dvacet let prohráváš.“';
    }
  }

  update(): JobResult {
    if (this.result === 'win') return 'done';
    if (this.result === 'lose') return 'fail';
    return 'run';
  }
}
