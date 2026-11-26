import type { Dialog, DialogOption } from '../../story/dialog';
import { jobOf, type JobId } from '../../story/jobs';
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
    case 'metejka-kulecnik': {
      const take = (text: string): DialogOption => ({ text, do: () => story.startJob('metejka-kulecnik'), then: 'pool' });
      return {
        id: 'job-metejka',
        start: 'm0',
        nodes: {
          m0: {
            speaker: 'metejka',
            text: 'Ty! Hasič Pepa mě vyzval na kulečník. O pětistovku. Já vyhraju, jasně. Kulečník je o hlavě. Ale kdyby… kdyby náhodou… pomůžeš mi? Nenápadně.',
            enter: (c) => c.know('metejka'),
            options: [take('Pomůžu. Nenápadně.'), { text: 'Ty přece vždycky vyhráváš.', next: 'm1' }, chat],
          },
          m1: {
            speaker: 'metejka',
            text: 'No jasně, že vyhrávám. Jen to nikdo nevidí. Ani já. Tak pomůžeš, nebo ne?',
            options: [take('Pomůžu.'), end('Ne.'), chat],
          },
        },
      };
    }
    case 'vesta-jerab': {
      const take = (text: string): DialogOption => ({ text, do: () => story.startJob('vesta-jerab'), next: 'ok' });
      return {
        id: 'job-vesta',
        start: 'v0',
        nodes: {
          v0: {
            speaker: 'vesta',
            text: 'Hele, potřebuju jeřáb. Stojí na stavbě v Raškovicích, nikdo ho nehlídá, protože v Raškovicích nikdo nic nehlídá. Dovez ho k mýmu domu. Bez fízlů. Sedm stovek.',
            enter: (c) => c.know('vesta'),
            options: [take('Dovezu.'), { text: 'Na co ti je jeřáb?', next: 'v1' }, chat],
          },
          v1: {
            speaker: 'vesta',
            text: 'Na bazén. Na střechu. Na to, aby sousedi viděli, že mám jeřáb. Já bych ho koupil, ale to by nebyla zábava.',
            options: [take('Tak jo.'), end('Teď ne.'), chat],
          },
          ok: {
            speaker: 'vesta',
            text: 'Výjezd na Raškovice je vlevo nahoře. Budu ti volat, jak to děláš špatně. Neboj, to je služba zdarma.',
            options: [end('Nevolej.'), end('Jasně.'), end('Pěkná mikina, mimochodem.')],
          },
        },
      };
    }
    case 'kibi-schovej': {
      const take = (text: string): DialogOption => ({ text, do: () => story.startJob('kibi-schovej'), next: 'ok' });
      return {
        id: 'job-kibi',
        start: 'k0',
        nodes: {
          k0: {
            speaker: 'kibi',
            text: 'Psst. {jmeno}. Venku jsou tři. Zuzka, Monika a Jarka. Hledají mě. Všechny tři. Najednou. Někdo jim to řekl. Odveď je od eRka, než mě najdou.',
            enter: (c) => c.know('kibi'),
            options: [take('Odvedu je.'), { text: 'Co jsi jim provedl?', next: 'k1' }, chat],
          },
          k1: {
            speaker: 'kibi',
            text: 'Nic! Každé jsem slíbil, že je jediná. Což byla pravda. Každý den jiná.',
            options: [take('Tak jo, pomůžu.'), end('To si vyžer sám.'), chat],
          },
          ok: {
            speaker: 'kibi',
            text: 'Jsem pod stolem. Kdyby se ptaly, nejsem tady. A nikdy jsem tu nebyl. A to s tou Jarkou je pomluva.',
            options: [end('Pod stolem. Jasně.'), end('Která Jarka?'), end('…')],
          },
        },
      };
    }
    case 'plotkova-flasky': {
      const take = (text: string): DialogOption => ({ text, do: () => story.startJob('plotkova-flasky'), next: 'ok' });
      return {
        id: 'job-plotkova',
        start: 'p0',
        nodes: {
          p0: {
            speaker: 'plotkova',
            text: 'Hele, Omladina si objednala flašky. Šest kusů, čtyři místa po vesnici. Prchard to nesmí vědět. Odvezeš to se mnou? Já budu… hlídat zboží.',
            enter: (c) => c.know('plotkova'),
            options: [take('Jedem.'), { text: 'Ty budeš hlídat zboží?', next: 'p1' }, chat],
          },
          p1: {
            speaker: 'plotkova',
            text: 'Jo. Zevnitř. Neboj, já se kontroluju. Teda kontroluju flašky. Jestli nejsou zkažený.',
            options: [take('Tak jedem, rychle.'), end('To nedopadne dobře.'), chat],
          },
          ok: {
            speaker: 'plotkova',
            text: 'Hřiště za školou, školka, náves a Omyx u řeky. Jeď rychle. Čím dýl pojedeš, tím míň toho dovezem. Hehe. Hik.',
            options: [end('Rozumím.'), end('Neotvírej to.'), end('Hik?')],
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
    'metejka-kulecnik': 'Hraje se! Pomáhej. Nenápadně!',
    'vesta-jerab': 'Kde je můj jeřáb? Sousedi se ptají. Teda neptají, ale budou.',
    'kibi-schovej': 'Psst. Jsou pořád venku? Nejsem tady.',
    'plotkova-flasky': 'Hik. Jedem?',
  };
  const giveUp: Record<JobId, string> = {
    'omyx-caj': 'Čaj si nech, na památku. Peníze ti nevrátím, jsem dealer, ne banka.',
    'zjebal-domu': 'Hehe… Ajina mě zabije. Tak nic.',
    'denny-auto': 'Hm.',
    'sochar-leseni': 'Aha. Tak nic. Umění počká. Umění vždycky počká.',
    'metejka-kulecnik': 'Zbabělec. Vyhraju sám. Jako vždycky. Asi.',
    'vesta-jerab': 'Jasně. Řeknu to všem.',
    'kibi-schovej': 'Tak to jsem mrtvej. Pozdravuj mámu. Teda moji. Ne, radši ne.',
    'plotkova-flasky': 'Tak je vypiju tady. Škoda by zkazit.',
  };
  const speaker = jobOf(id)!.giver;
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
