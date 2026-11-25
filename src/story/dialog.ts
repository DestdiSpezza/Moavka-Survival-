import type { Hero } from '../systems/save';
import type { NpcId } from './npcs';

/**
 * Dialogy: strom uzlů, každý uzel má mluvčího, text a právě tři volby (ADR-003).
 * Texty můžou mít mužský i ženský tvar („{Vypil|Vypila} jsi“) a jméno ({jmeno}).
 */

/** 'guest' = postava jen pro tenhle rozhovor (kupec z Omladiny), viz Dialog.guest. */
export type Speaker = NpcId | 'hero' | 'narrator' | 'guest';

/** Co dialog smí se hrou udělat. */
export interface DialogCtx {
  hero: Hero;
  money(): number;
  /** Zaplatí, když na to hráč má (jinak false a nic se nestane). */
  pay(amount: number): boolean;
  rel(npc: NpcId, delta: number): void;
  relOf(npc: NpcId): number;
  flag(name: string): void;
  has(name: string): boolean;
  /** Hráč zná jméno postavy (svítí nad ní). */
  know(...npcs: NpcId[]): void;
  /** Počítadlo (např. kolik panáků vypila Plotková). */
  count(name: string, delta?: number): number;
}

type Dyn<T> = T | ((c: DialogCtx) => T);

export interface DialogOption {
  text: Dyn<string>;
  /** Další uzel; bez něj dialog skončí. */
  next?: string;
  /** Po skončení začne jiný dialog (Prchard → Plotková). */
  then?: string;
  /** Stojí peníze; když na ně hráč nemá, volba je zašedlá. */
  cost?: Dyn<number>;
  /** Jinak je volba zašedlá. */
  when?: (c: DialogCtx) => boolean;
  do?: (c: DialogCtx) => void;
}

export interface DialogNode {
  speaker: Speaker;
  text: Dyn<string>;
  options: [DialogOption, DialogOption, DialogOption];
  /** Při vstupu do uzlu (třeba „hráč teď zná Vestu“). */
  enter?: (c: DialogCtx) => void;
}

export interface Dialog {
  id: string;
  start: Dyn<string>;
  nodes: Record<string, DialogNode>;
  /** Mluvčí 'guest': jméno, barva a postavička. */
  guest?: { name: string; css: string; sprite: string };
}

export function resolve<T>(v: Dyn<T>, c: DialogCtx): T {
  return typeof v === 'function' ? (v as (c: DialogCtx) => T)(c) : v;
}

/** Jde volbu vybrat (peníze, podmínka)? */
export function optionEnabled(o: DialogOption, c: DialogCtx): boolean {
  const cost = o.cost === undefined ? 0 : resolve(o.cost, c);
  return c.money() >= cost && (!o.when || o.when(c));
}

/**
 * Vybere volbu: zaplatí, provede efekt a vrátí, kam dál
 * (id dalšího uzlu, nebo null = konec; `then` = navazující dialog).
 */
export function choose(o: DialogOption, c: DialogCtx): { next: string | null; then: string | null } | null {
  if (!optionEnabled(o, c)) return null;
  const cost = o.cost === undefined ? 0 : resolve(o.cost, c);
  if (cost > 0 && !c.pay(cost)) return null;
  o.do?.(c);
  return { next: o.next ?? null, then: o.then ?? null };
}

/** Kontrola dat: každý uzel má 3 volby, každý odkaz vede na existující uzel nebo dialog. */
export function validateDialog(d: Dialog, dialogIds: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const ids = new Set(Object.keys(d.nodes));
  if (typeof d.start === 'string' && !ids.has(d.start)) errors.push(`${d.id}: začátek ${d.start} neexistuje`);
  for (const [id, n] of Object.entries(d.nodes)) {
    if (n.options.length !== 3) errors.push(`${d.id}/${id}: ${n.options.length} voleb místo 3`);
    if (typeof n.text === 'string' && !n.text.trim()) errors.push(`${d.id}/${id}: prázdný text`);
    // Aspoň jedna volba musí jít vybrat vždycky, jinak by hráč v rozhovoru uvízl.
    if (!n.options.some((o) => !o.when && !o.cost)) errors.push(`${d.id}/${id}: žádná volba bez podmínky (nejde odejít)`);
    n.options.forEach((o, i) => {
      if (typeof o.text === 'string' && !o.text.trim()) errors.push(`${d.id}/${id}[${i}]: prázdná volba`);
      if (o.next && !ids.has(o.next)) errors.push(`${d.id}/${id}[${i}]: uzel ${o.next} neexistuje`);
      if (o.then && !dialogIds.has(o.then)) errors.push(`${d.id}/${id}[${i}]: dialog ${o.then} neexistuje`);
    });
  }
  return errors;
}
