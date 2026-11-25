import { describe, expect, it } from 'vitest';
import { createRng } from '../systems/rng';
import { fillText } from '../texts/gender';
import { ARG_LINES, askPrice, type Bargain, BASE_PRICE, BUYERS, type BuyerType, buyerFor, fullPrice, hook, pitch, push, quit, startBargain, strike } from './bargain';

/** Odehraje jedno handlování; `smart` = hráč pozná slabinu kupce a ví, kdy si plácnout. */
function play(type: BuyerType, seed: number, smart: boolean): Bargain {
  const rnd = createRng(seed);
  let b = startBargain(type, rnd);
  for (let guard = 0; guard < 40 && b.phase !== 'konec'; guard++) {
    const choice = (smart ? (b.args[0] === type.weak ? 0 : b.args[1] === type.weak ? 1 : b.args[0] === type.hates ? 1 : 0) : Math.floor(rnd() * 2)) as 0 | 1;
    if (b.phase === 'nechce') b = hook(b, choice, rnd);
    else if (b.phase === 'mozna') b = askPrice(b, smart ? (type.weak === 'status' || type.weak === 'vzacnost' ? 'limitka' : 'kolik') : 'pevna', rnd);
    else if (b.phase === 'handl') {
      // Chytrý hráč si plácne, až když je nabídka aspoň plná cena; jinak tlačí argumenty.
      if (smart && b.offer >= BASE_PRICE && b.args.every((a) => a !== type.weak)) b = strike(b, rnd);
      else if (!smart && rnd() < 0.25) b = strike(b, rnd);
      else b = pitch(b, choice, rnd);
    } else if (b.phase === 'strop') b = b.offer >= BASE_PRICE ? strike(b, rnd) : push(b, rnd);
  }
  return b;
}

describe('handlování o beskydský čaj', () => {
  it('nabídka nikdy nepřeleze strop kupce a trpělivost dojde', () => {
    for (const type of BUYERS) {
      for (let s = 1; s < 60; s++) {
        const rnd = createRng(s);
        let b = startBargain(type, rnd);
        expect(b.offer).toBeLessThan(b.max);
        b = askPrice({ ...b, phase: 'mozna' }, 'pevna', rnd);
        for (let i = 0; i < 20 && b.phase === 'handl'; i++) {
          b = pitch(b, 0, rnd);
          expect(b.offer).toBeLessThanOrEqual(b.max);
        }
        expect(b.phase === 'strop' || b.phase === 'konec').toBe(true);
      }
    }
  });

  it('slabina kupce zvedá cenu, nenáviděný argument ji sráží', () => {
    const type = BUYERS[0];
    const rnd = createRng(7);
    const b0 = askPrice({ ...startBargain(type, rnd), phase: 'mozna' }, 'kolik', rnd);
    const withWeak: Bargain = { ...b0, args: [type.weak, type.hates] };
    expect(pitch(withWeak, 0, rnd).offer).toBeGreaterThan(b0.offer);
    expect(pitch(withWeak, 1, rnd).offer).toBeLessThan(b0.offer);
  });

  it('chytrý hráč většinou prodá za plnou cenu, náhodný hůř', () => {
    for (const type of BUYERS) {
      let smartFull = 0;
      let randomFull = 0;
      for (let s = 1; s <= 200; s++) {
        const a = play(type, s, true);
        const r = play(type, s * 7919, false);
        if (a.result === 'deal' && fullPrice(a.price)) smartFull++;
        if (r.result === 'deal' && fullPrice(r.price)) randomFull++;
      }
      // Kuba Drobák má strop i pod dvěma stovkami: s ním to jde jen napůl.
      expect(smartFull, type.id).toBeGreaterThan(type.id === 'skrblik' ? 60 : 150);
      expect(randomFull, type.id).toBeLessThan(smartFull);
    }
  });

  it('kupec, plácnutí a vzdání', () => {
    const rnd = createRng(3);
    const b = startBargain(buyerFor(12), rnd);
    expect(strike(b, rnd)).toMatchObject({ result: 'deal', price: b.offer, phase: 'konec' });
    expect(quit(b)).toMatchObject({ result: 'quit', phase: 'konec' });
    expect(buyerFor(12)).toBe(buyerFor(12));
    expect(fullPrice(199)).toBe(false);
    expect(fullPrice(200)).toBe(true);
  });

  it('texty: oba tvary bez závorek, argumenty se vejdou do okna', () => {
    const all = [...Object.values(ARG_LINES).flat(), ...BUYERS.flatMap((t) => [...t.refuse, t.interested, ...t.tactics, t.hate, t.atMax, t.walk, ...t.deal])];
    for (const s of all) {
      for (const gender of ['m', 'f'] as const) expect(fillText(s.replace(/\{(offer|max)\}/g, '1'), { gender, name: 'X' }), s).not.toMatch(/[{}|]/);
    }
    for (const s of Object.values(ARG_LINES).flat()) expect(s.length, s).toBeLessThanOrEqual(75);
  });
});
