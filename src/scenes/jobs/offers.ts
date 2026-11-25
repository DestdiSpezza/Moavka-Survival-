import type { Dialog, DialogOption } from '../../story/dialog';
import type { JobId } from '../../story/jobs';
import type { Story } from '../Story';

/**
 * Nabídky misí od štamgastů (ADR-020). Každý uzel má tři volby; „Radši pokecáme“
 * vede na běžný dialog postavy (`base`). Texty: černý humor, Morávka, oba tvary hráče.
 */

const end = (text: string): DialogOption => ({ text });

export const TEA_PRICE = 450;

export function jobOfferDialog(story: Story, id: JobId, base: string): Dialog {
  const chat: DialogOption = { text: 'Radši pokecáme.', then: base };
  switch (id) {
    case 'omyx-caj': {
      const take = (text: string): DialogOption => ({ text: `${text} (${TEA_PRICE} Kč)`, cost: TEA_PRICE, do: () => story.startJob('omyx-caj'), next: 'ok' });
      return {
        id: 'job-omyx',
        start: 'o0',
        nodes: {
          o0: {
            speaker: 'omyx',
            text: 'Hele, {jmeno}. MÁM PRO TEBE KŠEFT! Beskydskej čaj. Se slevou. Tři gramy za čtyři stovky padesát, normálně je to dvě stovky gram. Prodáš to Omladině za plnou a rozdíl je tvůj. Jednoduchý jak Metějka.',
            enter: (c) => c.know('omyx'),
            options: [take('Beru.'), { text: 'Proč to neprodáš sám?', next: 'o1' }, chat],
          },
          o1: {
            speaker: 'omyx',
            text: 'Omladina mi nevěří. Prej jsem boomer. JÁ! Je mi třicet osm. A všichni maj občanku, žádný děcka, to si hlídám. Jsem dealer, ne zrůda.',
            options: [take('Tak jo, beru.'), { text: 'Jak se jim to prodává?', next: 'o2' }, end('Teď ne.')],
          },
          o2: {
            speaker: 'omyx',
            text: 'Vem čaj do ruky (šestka nebo Q) a nabídni ho, jako bys někoho praštil{|a}. Jen nepraštíš. Nejdřív nechtěj, pak možná, pak handluj. Každej má slabinu: lajky, původ, strach, že to dojde. Pod dvě stovky neprodávej, to bych plakal.',
            options: [take('Beru.'), end('Ještě si to rozmyslím.'), chat],
          },
          ok: {
            speaker: 'omyx',
            text: 'Tady máš, tři gramy. Omladina se drží u hřiště za školou. A kdyby se ptali fízlové, je to heřmánek.',
            options: [end('Heřmánek. Jasně.'), end('Za školou. Jasně.'), end('Kdo je Heřmánek?')],
          },
        },
      };
    }
    case 'zjebal-domu': {
      const take = (text: string): DialogOption => ({ text, do: () => story.startJob('zjebal-domu'), next: 'ok' });
      return {
        id: 'job-zjebal',
        start: 'z0',
        nodes: {
          z0: {
            speaker: 'zjebal',
            text: 'Hehe, {jmeno}! Hele… kolik je hodin? Ajina mě zabije. V deset mám bejt doma a jsem tady od čtyř. Hodíš mě domů? Autem. Pěšky to nedám, nohy mi jdou každá jinam.',
            enter: (c) => c.know('zjebal'),
            options: [take('Hodím tě. Kde bydlíš?'), { text: 'Proč nejedeš sám? Prej umíš řídit náklaďák.', next: 'z1' }, chat],
          },
          z1: {
            speaker: 'zjebal',
            text: 'Náklaďák jo. Ale po osmi pivech vidím dva náklaďáky a nevím, do kterýho nasednout. Hehe. Dobrý, dobrý.',
            options: [take('Tak jo, hodím tě.'), { text: 'Kdo je Ajina?', next: 'z2' }, end('Teď ne.')],
          },
          z2: {
            speaker: 'zjebal',
            text: 'Moje žena. Hodná. Fakt. Jen má u dveří baseballku. Na zloděje. A na mě.',
            options: [take('Hodím tě.'), end('To radši ne.'), chat],
          },
          ok: {
            speaker: 'zjebal',
            text: 'Hehe, dobrý! Počkám venku před eRkem, přistav auto. Normální auto, na skútr si nesednu, mám devadesát kilo a osm piv. A jeď rychle, Ajina počítá minuty.',
            options: [end('Jasně.'), end('Normální auto. Rozumím.'), end('Hehe, dobrý.')],
          },
        },
      };
    }
    case 'denny-auto': {
      const take = (text: string): DialogOption => ({ text, do: () => story.startJob('denny-auto'), next: 'ok' });
      return {
        id: 'job-denny',
        start: 'd0',
        nodes: {
          d0: {
            speaker: 'dennyVysoky',
            text: 'Hm. Potřebuju auto. Celý. Bez fízlů.',
            enter: (c) => c.know('dennyVysoky'),
            options: [{ text: 'Jaký auto?', next: 'd1' }, take('Seženu.'), chat],
          },
          d1: {
            speaker: 'dennyVysoky',
            text: 'Hm. Jakýkoli. Jen ne policejní. Nenabouraný. A ať za tebou nejede nikdo s modrým světlem. Šest stovek.',
            options: [take('Seženu.'), { text: 'Proč nekradeš sám?', next: 'd2' }, end('Teď ne.')],
          },
          d2: {
            speaker: 'dennyVysoky',
            text: 'Hm. Já opravuju. Kradou jiní. Dělba práce.',
            options: [take('Seženu.'), end('Teď ne.'), end('Hm.')],
          },
          ok: {
            speaker: 'dennyVysoky',
            text: 'Hm. Přijeď před garáž. Otevřu.',
            options: [end('Hm.'), end('Jasně.'), end('Hm hm.')],
          },
        },
      };
    }
    case 'sochar-leseni': {
      const take = (text: string): DialogOption => ({ text, do: () => story.startJob('sochar-leseni'), next: 'ok' });
      return {
        id: 'job-sochar',
        start: 's0',
        nodes: {
          s0: {
            speaker: 'dennySochar',
            text: 'Hele… nemáš… ne, počkej, tentokrát nechci prachy. Teda chci, ale jinak. U kostela zůstalo lešení po opravě věže. Farář řekl, že si ho můžu vzít, když si ho odvezu. Do ateliéru na starý pile.',
            enter: (c) => c.know('dennySochar'),
            options: [{ text: 'Čím to mám vozit?', next: 's1' }, take('Odvezu.'), chat],
          },
          s1: {
            speaker: 'dennySochar',
            text: 'Traktorem. Stojí před eRkem i s vlečkou. Zjebal říkal, že ti klíčky dá, žes ho odvezl{|a} domů. Teda Ajina říkala. Teda křičela.',
            options: [take('Odvezu.'), { text: 'Co z toho budu mít?', next: 's2' }, end('Teď ne.')],
          },
          s2: {
            speaker: 'dennySochar',
            text: 'Farář mi dal na odvoz pět stovek. Půlku máš ty. Druhou půlku jsem už… investoval. Do umění. V eRku.',
            options: [take('Tak jo.'), end('Teď ne.'), chat],
          },
          ok: {
            speaker: 'dennySochar',
            text: 'Paráda. Počkám na tebe v ateliéru. Teda na pile. Teda pod tou částí střechy, kde neteče.',
            options: [end('Jasně.'), end('Na pile.'), end('Kde neteče. Jasně.')],
          },
        },
      };
    }
  }
}

/** Mise běží: postava se zeptá, jak to jde; jde ji vzdát. */
export function jobActiveDialog(story: Story, id: JobId, base: string): Dialog {
  const ask: Record<JobId, string> = {
    'omyx-caj': 'TAK CO, PRODÁNO? Omladina je u hřiště za školou. Neříkej, že ses ztratil{|a}, Morávka má tři ulice.',
    'zjebal-domu': 'Hehe. Auto?',
    'denny-auto': 'Hm. Auto?',
    'sochar-leseni': 'Lešení? Traktor? Já tu jen tak sedím. Nemáš stovku?',
  };
  const giveUp: Record<JobId, string> = {
    'omyx-caj': 'Čaj si nech, na památku. Peníze ti nevrátím, jsem dealer, ne banka.',
    'zjebal-domu': 'Hehe… Ajina mě zabije. Tak nic.',
    'denny-auto': 'Hm.',
    'sochar-leseni': 'Aha. Tak nic. Umění počká. Umění vždycky počká.',
  };
  const speaker = ({ 'omyx-caj': 'omyx', 'zjebal-domu': 'zjebal', 'denny-auto': 'dennyVysoky', 'sochar-leseni': 'dennySochar' } as const)[id];
  return {
    id: `job-active-${id}`,
    start: 'a0',
    nodes: {
      a0: {
        speaker,
        text: ask[id],
        options: [end('Makám na tom.'), { text: 'Vzdávám to.', do: () => story.abandonJob(), next: 'a1' }, { text: 'Radši pokecáme.', then: base }],
      },
      a1: { speaker, text: giveUp[id], options: [end('No jo.'), end('Promiň.'), end('…')] },
    },
  };
}
