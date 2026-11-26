import { describe, expect, it } from 'vitest';
import { choose, type DialogCtx, optionEnabled, resolve, validateDialog } from './dialog';
import { DIALOGS, RANDOM_STAMGAST, randomStamgast } from './dialogs';
import { inPub, NPCS, type NpcId, STAMGASTI } from './npcs';
import { fillText } from '../texts/gender';

function ctx(money = 500): DialogCtx & { state: { money: number; rel: Record<string, number>; flags: Set<string>; known: Set<string>; counts: Record<string, number> } } {
  const state = { money, rel: {} as Record<string, number>, flags: new Set<string>(), known: new Set<string>(), counts: {} as Record<string, number> };
  return {
    state,
    hero: { gender: 'f', name: 'Jarmila' },
    money: () => state.money,
    pay: (n) => (state.money >= n ? ((state.money -= n), true) : false),
    rel: (npc, d) => (state.rel[npc] = (state.rel[npc] ?? 0) + d),
    relOf: (npc) => state.rel[npc] ?? 0,
    flag: (f) => state.flags.add(f),
    has: (f) => state.flags.has(f),
    know: (...n: NpcId[]) => n.forEach((x) => state.known.add(x)),
    count: (name, d = 0) => (state.counts[name] = (state.counts[name] ?? 0) + d),
  };
}

describe('dialogy', () => {
  const ids = new Set([...Object.keys(DIALOGS), RANDOM_STAMGAST]);

  it.each(Object.values(DIALOGS).map((d) => [d.id, d] as const))('%s: každý uzel má tři volby a vede na existující uzel', (_id, d) => {
    expect(validateDialog(d, ids)).toEqual([]);
  });

  it('každý Štamgast a obsluha mají dialog a jméno', () => {
    for (const id of [...STAMGASTI, 'plotkova', 'prchard', 'kobyla'] as NpcId[]) {
      expect(DIALOGS[id], id).toBeDefined();
      expect(NPCS[id].name).toBeTruthy();
    }
  });

  it('volby za peníze: zašedlé, když hráč nemá, jinak zaplatí a provedou efekt', () => {
    const c = ctx(50);
    const shot = DIALOGS.plotkova.nodes.pl1.options[0];
    expect(optionEnabled(shot, c)).toBe(false);
    expect(choose(shot, c)).toBeNull();
    const rich = ctx(500);
    expect(choose(shot, rich)).toEqual({ next: 'pl2', then: null });
    expect(rich.state.money).toBe(440);
    expect(rich.state.rel.plotkova).toBe(10);
  });

  it('„S nikým se bavit nechci“ si hra zapamatuje (těžší start)', () => {
    const c = ctx();
    choose(DIALOGS.prchardEntry.nodes.p1.options[0], c);
    expect(c.state.flags.has('refusedTalk')).toBe(true);
  });

  it('Plotková řekne, kdo je kdo: hráč pak zná všechny Štamgasty', () => {
    const c = ctx();
    for (const n of ['pl4', 'pl8', 'pl9', 'pl10']) DIALOGS.plotkova.nodes[n].enter?.(c);
    for (const id of STAMGASTI) expect(c.state.known.has(id), id).toBe(true);
  });

  it('texty pro hrdinku a hrdinu', () => {
    expect(fillText('Nevypil{|a} jsi mi pivo, {jmeno}?', { gender: 'f', name: 'Jarmila' })).toBe('Nevypila jsi mi pivo, Jarmila?');
    expect(fillText('Čau, {fešáku|kočko}.', { gender: 'm', name: 'Pepa' })).toBe('Čau, fešáku.');
    const c = ctx();
    expect(resolve(DIALOGS.plotkova.nodes.pl1.text, c)).toContain('{fešáku|kočko}');
  });

  it('náhodný Štamgast je vždycky někdo ze Štamgastů', () => {
    for (const r of [0, 0.3, 0.99]) expect(STAMGASTI).toContain(randomStamgast(() => r));
  });

  it('kdo sedí v eRku: při festivalu všichni, potom Vysoký Denny 13–17, Omyx večer', () => {
    expect(inPub('dennyVysoky', 10 * 60, true)).toBe(true);
    expect(inPub('dennyVysoky', 14 * 60, false)).toBe(true);
    expect(inPub('dennyVysoky', 18 * 60, false)).toBe(false);
    expect(inPub('omyx', 12 * 60, false)).toBe(false);
    expect(inPub('omyx', 22 * 60, false)).toBe(true);
    expect(inPub('omyx', 2 * 60, false)).toBe(true);
    expect(inPub('kobyla', 12 * 60, true)).toBe(false);
  });
});

describe('akty', () => {
  it('Akt 1: příjezd autobusem, pak do hospody, pak volná hra', async () => {
    const { actOf, nextMission, missionOf } = await import('./acts');
    expect(actOf(1).title).toBe('Příjezd');
    expect(nextMission('a1-prijezd')).toBe('a1-hospoda');
    expect(nextMission('a1-hospoda')).toBe('');
    expect(missionOf('a1-hospoda')?.title).toBe('Do hospody');
  });
});

describe('hrdina a hrdinka', () => {
  it('všechny texty mají po doplnění obou tvarů čisto (žádné „|“ ani rozbitá závorka)', async () => {
    const { T } = await import('../texts/cs');
    const { GROUPS } = await import('../world/gangs');
    const strings: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(T);
    walk(GROUPS);
    for (const s of strings) {
      for (const gender of ['m', 'f'] as const) {
        const out = fillText(s, { gender, name: 'Xena' });
        expect(out, s).not.toContain('|');
        expect(out, s).not.toMatch(/\{[^{}]*\|/);
      }
    }
    expect(fillText(T.busted, { gender: 'f', name: 'X' })).toBe('ZATČENA');
    expect(fillText(T.stolePolice, { gender: 'f', name: 'X' })).toContain('Ukradlas');
  });
});

describe('nabídky misí', () => {
  it('každá nabídka a „jak to jde“ mají v každém uzlu tři volby a vedou, kam mají', async () => {
    const { jobOfferDialog, jobActiveDialog } = await import('../scenes/jobs/offers');
    const { JOBS } = await import('./jobs');
    const fake = { startJob: () => {}, abandonJob: () => {} } as never;
    const ids = new Set(['base', 'pool']);
    for (const j of JOBS) {
      for (const d of [jobOfferDialog(fake, j.id, 'base'), jobActiveDialog(fake, j.id, 'base')]) {
        expect(validateDialog(d, ids), d.id).toEqual([]);
        for (const n of Object.values(d.nodes)) {
          for (const gender of ['m', 'f'] as const) {
            const text = typeof n.text === 'string' ? n.text : '';
            expect(fillText(text, { gender, name: 'X' }), text).not.toMatch(/[{}|]/);
          }
        }
      }
    }
  });
});
