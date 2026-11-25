/** Vesnický rozhlas a rádio: fronta hlášení s rozestupy, aby se nepřekřikovala. */

export type Channel = 'rozhlas' | 'radio';

export interface Announcement {
  channel: Channel;
  text: string;
  /** Stejný klíč se nesmí opakovat dřív než po cooldownu. */
  key: string;
}

export class AnnouncerQueue {
  private queue: Announcement[] = [];
  private lastByKey = new Map<string, number>();
  private busyUntil = 0;

  /** Přidá hlášení; vrátí false, když stejné téma zaznělo nedávno. */
  push(a: Announcement, now: number, cooldown: number): boolean {
    const last = this.lastByKey.get(a.key);
    if (last !== undefined && now - last < cooldown) return false;
    if (this.queue.some((q) => q.key === a.key)) return false;
    this.lastByKey.set(a.key, now);
    this.queue.push(a);
    if (this.queue.length > 4) this.queue.shift();
    return true;
  }

  /** Další hlášení k přehrání (nebo null, když ještě dobíhá předchozí). */
  next(now: number, duration: number): Announcement | null {
    if (now < this.busyUntil || !this.queue.length) return null;
    this.busyUntil = now + duration;
    return this.queue.shift()!;
  }

  get pending(): number {
    return this.queue.length;
  }
}

/** Obecní hlášení „pro radost“, když se zrovna nic neděje. */
export const ROZHLAS_FILLER = [
  'Obecní úřad oznamuje, že v obchodě je čerstvá dršťková. Kdo dřív přijde, ten dřív jí.',
  'Ztratil se pes Rex. Slyší na jméno Rex a na otevírání piva.',
  'Upozorňujeme občany, že tráva na hřišti se seká v sobotu. Mrtvoly prosíme odklidit předem.',
  'Pan starosta děkuje neznámému dobrodinci za opravu autobusové zastávky. Vraťte prosím tu lavičku.',
  'Hospoda U Kapra hledá brigádníka na mytí sklenic. Podmínka: nemít řidičák.',
  'Žádáme majitele traktoru, aby neprodleně odstranil vozidlo z kostela.',
  'Hasiči zvou na tradiční soutěž v pití piva na čas. Vítěz dostane hasicí přístroj.',
  'Připomínáme, že střelba na návsi je po 22. hodině zakázána. Před 22. hodinou se doporučuje.',
];
