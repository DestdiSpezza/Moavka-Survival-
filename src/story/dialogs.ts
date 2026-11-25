import type { Dialog, DialogCtx, DialogOption } from './dialog';
import { STAMGASTI } from './npcs';

/**
 * Dialogy Aktu 1. Každý uzel má tři volby (ADR-003). Texty hráče mají mužský
 * a ženský tvar „{Vypil|Vypila}“, {jmeno} je jméno hrdiny nebo hrdinky.
 * Postavy a jejich povahy: NPC.md.
 */

export const BEER = 45;
export const SHOT = 60;
export const LOAN = 100;

/** Volba, která dialog ukončí (a případně něco udělá). */
const end = (text: string, effect?: (c: DialogCtx) => void): DialogOption => ({ text, do: effect });

export const DIALOGS: Record<string, Dialog> = {
  // ---------- Venku ----------
  kobyla: {
    id: 'kobyla',
    start: 'k1',
    nodes: {
      k1: {
        speaker: 'kobyla',
        text: 'Další na festival, co? Vypadáš žíznivě. Nejbližší hospoda je eRko, támhle. Nejvzdálenější taky, jiná tu není.',
        options: [
          { text: 'Díky, paní.', next: 'k2' },
          { text: 'Festival? Kde jsou všichni?', next: 'k3' },
          { text: 'Já žízeň nemám.', next: 'k4' },
        ],
      },
      k2: {
        speaker: 'kobyla',
        text: 'SLEČNO! Slečna Kobyla. Paní je moje máma a ta už je na hřbitově. Dobrou žízeň.',
        enter: (c) => c.know('kobyla'),
        options: [end('Pardon, slečno.'), { text: 'Kobyla? Fakt?', next: 'k5' }, end('Jdu do eRka.')],
      },
      k3: {
        speaker: 'kobyla',
        text: 'V eRku, kde jinde. Festival je, když Prchard narazí druhej sud. Kapela je Metějka s kytarou. Bez strun.',
        options: [end('To zní skvěle.'), end('To zní strašně.'), end('Hlavně že je pivo.')],
      },
      k4: {
        speaker: 'kobyla',
        text: 'Ty nemáš žízeň? Tak to jsi v Morávce omylem. Autobus zpátky jede ve čtvrtek. Příští rok.',
        options: [end('Tak jo, jdu na jedno.'), end('Ve čtvrtek?!'), end('Kde je to eRko?')],
      },
      k5: {
        speaker: 'kobyla',
        text: 'Kobyla. Po tátovi. Ohon mám po mámě. Ještě nějakej dotaz, {hříbě|klisničko}?',
        options: [end('Ne, díky.'), end('Hříbě?!'), end('Jdu radši do hospody.')],
      },
    },
  },

  kobyla2: {
    id: 'kobyla2',
    start: 'k21',
    nodes: {
      k21: {
        speaker: 'kobyla',
        text: 'Ještě jsi tady? eRko je pořád támhle. Nikam neuteklo, na rozdíl od tvýho autobusu.',
        enter: (c) => c.know('kobyla'),
        options: [end('Už jdu.'), { text: 'Je tu i něco jinýho?', next: 'k22' }, end('Slečno, vy jste krásná.', (c) => c.rel('kobyla', 5))],
      },
      k22: {
        speaker: 'kobyla',
        text: 'Jinýho? Kostel, ten má zavřeno. A Omyx u řeky, ten má otevřeno pořád. Vyber si.',
        options: [end('Kostel.'), end('Omyx.'), end('eRko.')],
      },
    },
  },

  // ---------- eRko: Prchard ----------
  prchardEntry: {
    id: 'prchardEntry',
    start: 'p1',
    nodes: {
      p1: {
        speaker: 'prchard',
        text: 'Zavři, táhne. Další z Instagramu, co? Festival je tady. Tohle je on. Co to bude?',
        options: [
          { text: 'S nikým se bavit nechci.', next: 'p2', do: (c) => c.flag('refusedTalk') },
          { text: 'Sednu si k baru.', next: 'p3' },
          { text: 'Přisednu si ke štamgastům.', next: 'p4' },
        ],
      },
      p2: {
        speaker: 'prchard',
        text: 'Jak chceš. Pivo za čtyřicet pět, ticho zdarma. Ale tady ticho dlouho nevydrží.',
        options: [
          { text: `Pivo. (${BEER} Kč)`, cost: BEER, do: (c) => c.rel('prchard', 2) },
          end('Ticho.'),
          end('Dívej se jinam.', (c) => c.rel('prchard', -3)),
        ],
      },
      p3: {
        speaker: 'prchard',
        text: 'Plotková, máš tu zákazníka! …Plotková! Neboj, ona přijde. Někdy.',
        options: [
          { text: 'Počkám.', then: 'plotkova' },
          { text: `Dám si zatím pivo. (${BEER} Kč)`, cost: BEER, then: 'plotkova', do: (c) => c.rel('prchard', 2) },
          { text: 'Plotková?', then: 'plotkova' },
        ],
      },
      p4: {
        speaker: 'prchard',
        text: 'Jak chceš. Ke komukoli. Ale za ty, co si k nim přisedneš, neručím.',
        options: [
          { text: 'K tomu nejbližšímu.', then: 'stamgast' },
          { text: 'Ke komukoli.', then: 'stamgast' },
          { text: 'Riskni to za mě.', then: 'stamgast' },
        ],
      },
    },
  },
  prchard: {
    id: 'prchard',
    start: 'r1',
    nodes: {
      r1: {
        speaker: 'prchard',
        text: 'Co to bude, {jmeno}?',
        enter: (c) => c.know('prchard'),
        options: [
          { text: `Pivo. (${BEER} Kč)`, next: 'r2', cost: BEER, do: (c) => c.rel('prchard', 2) },
          { text: 'Kdo tady všechno sedí?', next: 'r3' },
          end('Nic, jen koukám.'),
        ],
      },
      r2: {
        speaker: 'prchard',
        text: 'Na. A neříkej Metějkovi, že je narazenej novej sud. To by se šel hádat se sudem.',
        options: [end('Na zdraví.'), end('Neřeknu.'), end('Metějkovi to řeknu hned.', (c) => c.rel('metejka', -2))],
      },
      r3: {
        speaker: 'prchard',
        text: 'Znám každýho od Frýdku po Lysou. U stolů Vesta, Omyx, Metějka, Zjebal, oba Denny a Kibi. A Plotková, ta nesedí, ta obsluhuje. Teda leží, když je pozdě.',
        enter: (c) => c.know('vesta', 'omyx', 'metejka', 'zjebal', 'dennyVysoky', 'dennySochar', 'kibi', 'plotkova'),
        options: [end('Díky.'), end('To je teda sestava.'), end('A ty jsi Prchard?')],
      },
    },
  },

  // ---------- eRko: Plotková ----------
  plotkova: {
    id: 'plotkova',
    start: 'pl1',
    nodes: {
      pl1: {
        speaker: 'plotkova',
        text: 'Čau, {fešáku|kočko}. Plotková. Neříkej mi Plotičko, to smí jen Kibi. Co ti nesu?',
        enter: (c) => {
          c.know('plotkova');
          c.flag('metPlotkova');
        },
        options: [
          { text: `Dáš si se mnou panáka? (${SHOT} Kč)`, next: 'pl2', cost: SHOT, do: (c) => { c.rel('plotkova', 10); c.count('shots', 1); } },
          { text: 'Co tady dělá taková princezna?', next: 'pl3' },
          { text: 'Kdo jsou ti chlapi u stolu?', next: 'pl4' },
        ],
      },
      pl2: {
        speaker: 'plotkova',
        text: 'Panáka? S tebou? No jasně! …Ještě jednoho? Tak dva. Já jsem po třetím mnohem chytřejší.',
        options: [
          { text: `Ještě jeden. (${SHOT} Kč)`, next: 'pl2b', cost: SHOT, do: (c) => { c.rel('plotkova', 5); c.count('shots', 1); } },
          { text: 'Máš krásný oči.', next: 'pl5' },
          { text: 'Kdo jsou ti chlapi u stolu?', next: 'pl4' },
        ],
      },
      pl2b: {
        speaker: 'plotkova',
        text: (c) => (c.count('shots') >= 3 ? 'Na zdraví! …Kolik to bylo? Neříkej Prchardovi. Píšu je na Metějku. Teda na tebe. Teda… na zdraví!' : 'Na zdraví! Vidíš, už jsem chytřejší. Skoro jako Vesta. Ne, to jsem přehnala.'),
        options: [
          end('Na Metějku!', (c) => c.rel('metejka', -1)),
          { text: 'Kdo jsou ti chlapi u stolu?', next: 'pl4' },
          end('Musím jít.'),
        ],
      },
      pl3: {
        speaker: 'plotkova',
        text: 'Princezna? Hele, to mi naposled řekl Zjebal a pak si spletl dveře od záchodu. Ale pokračuj.',
        options: [
          { text: 'Máš krásný oči.', next: 'pl5', do: (c) => c.rel('plotkova', 3) },
          { text: 'Ty tady obsluhuješ, nebo vládneš?', next: 'pl6', do: (c) => c.rel('plotkova', 5) },
          { text: 'Kdo jsou ti chlapi u stolu?', next: 'pl4' },
        ],
      },
      pl5: {
        speaker: 'plotkova',
        text: 'Oči mám po mámě. Ta je taky měla dvě. Dáš panáka, nebo jen koukáš?',
        options: [
          { text: `Dám panáka. (${SHOT} Kč)`, next: 'pl2', cost: SHOT, do: (c) => { c.rel('plotkova', 8); c.count('shots', 1); } },
          end('Jen koukám.', (c) => c.rel('plotkova', -2)),
          { text: 'Kdo jsou ti chlapi u stolu?', next: 'pl4' },
        ],
      },
      pl6: {
        speaker: 'plotkova',
        text: 'Vládnu. Prchard si myslí, že on, ale klíče od sklepa mám já. A od jeho auta taky.',
        options: [
          { text: 'Klíče od auta?', next: 'pl7' },
          end('Vládneš krásně.', (c) => c.rel('plotkova', 3)),
          { text: 'Kdo jsou ti chlapi u stolu?', next: 'pl4' },
        ],
      },
      pl7: {
        speaker: 'plotkova',
        text: 'Neptej se. Teda ptej, ale až po druhým panákovi.',
        options: [
          { text: `Tak panáka. (${SHOT} Kč)`, next: 'pl2', cost: SHOT, do: (c) => { c.rel('plotkova', 8); c.count('shots', 1); } },
          { text: 'Kdo jsou ti chlapi u stolu?', next: 'pl4' },
          end('Radši ne.'),
        ],
      },
      pl4: {
        speaker: 'plotkova',
        text: 'Tak hele. Vesta, ten v saku, má prachy a kecy. Omyx, ten hlasitej, prodává… čaj. Metějka u kulečníku je čurák, policajti se mu vyhýbaj. Já taky.',
        enter: (c) => {
          c.know('vesta', 'omyx', 'metejka');
          c.flag('plotkovaWho');
        },
        options: [
          { text: 'A ten vysmátej u baru?', next: 'pl8' },
          { text: 'A ti dva Denny?', next: 'pl9' },
          { text: 'A ten v růžovým?', next: 'pl10' },
        ],
      },
      pl8: {
        speaker: 'plotkova',
        text: 'Zjebal. Hodnej, dokud nezačne mluvit o politice. Naštěstí v deset musí domů, žena mu jinak zamkne. Řídí všechno, co má víc kol než rozumu.',
        enter: (c) => c.know('zjebal'),
        options: [{ text: 'A ti dva Denny?', next: 'pl9' }, { text: 'A ten v růžovým?', next: 'pl10' }, end('Díky, Plotková.', (c) => c.rel('plotkova', 2))],
      },
      pl9: {
        speaker: 'plotkova',
        text: 'Vysokej Denny ti spraví auto, přelakuje, a kdyby bylo potřeba, tak i zmizí. Na všechno řekne „hm“. Denny sochař sochá hlavně dluhy. Nepůjčuj mu.',
        enter: (c) => c.know('dennyVysoky', 'dennySochar'),
        options: [{ text: 'A ten vysmátej u baru?', next: 'pl8' }, { text: 'A ten v růžovým?', next: 'pl10' }, end('Díky, Plotková.', (c) => c.rel('plotkova', 2))],
      },
      pl10: {
        speaker: 'plotkova',
        text: 'Kibi. Nevím, co na něm ženský vidí. Teda vím. Neřeknu. A Prchard za barem je šéf, zná každýho.',
        enter: (c) => c.know('kibi', 'prchard'),
        options: [{ text: 'A ten vysmátej u baru?', next: 'pl8' }, { text: 'A ti dva Denny?', next: 'pl9' }, end('Díky, Plotková.', (c) => c.rel('plotkova', 2))],
      },
    },
  },

  // ---------- Štamgasti ----------
  vesta: {
    id: 'vesta',
    start: 'v1',
    nodes: {
      v1: {
        speaker: 'vesta',
        text: 'Nová tvář! Já jsem Vesta. Tohle sako stálo víc než tvoje auto. Jaký máš auto? Aha, žádný. To je mi líto.',
        enter: (c) => c.know('vesta'),
        options: [
          { text: 'Pěkný sako.', next: 'v2', do: (c) => c.rel('vesta', 5) },
          { text: 'Nikdo se tě neptal.', next: 'v3', do: (c) => c.rel('vesta', -5) },
          { text: 'Prý prodáváš věci pod pultem.', next: 'v4' },
        ],
      },
      v2: {
        speaker: 'vesta',
        text: 'Viď? Italský. Teda z Frýdku, ale šil ho Ital. Kdybys něco {potřeboval|potřebovala}, pomůžu. Vždycky. Ale řeknu to všem.',
        options: [end('Díky, Vesto.'), end('To nemusíš všem.'), { text: 'Tak mi pomoz s pivem.', next: 'v5' }],
      },
      v3: {
        speaker: 'vesta',
        text: 'Mě se nikdo ptát nemusí, já to řeknu sám. Stejně ti pomůžu, až budeš potřebovat. Abych to pak mohl vyprávět.',
        options: [end('Jak myslíš.'), end('Nepotřebuju.'), end('Hlavně to nevyprávěj.')],
      },
      v4: {
        speaker: 'vesta',
        text: 'Pod pultem? Já? Jen pro přátele. U obecního úřadu, přes den. Zbraně, vesty, lékárničky. Účtenky nedávám, to by bylo moc chudý.',
        options: [end('Zastavím se.'), end('Jsem tvůj přítel?'), end('To zní nelegálně.')],
      },
      v5: {
        speaker: 'vesta',
        text: 'Prcharde, pivo na mě! …Všichni slyšeli? Na MĚ. Na zdraví, {kamaráde|kamarádko}. Tohle ti budu připomínat do smrti.',
        enter: (c) => {
          c.rel('vesta', 3);
          c.flag('vestaBeer');
        },
        options: [end('Na zdraví, Vesto.'), end('Díky. Asi.'), end('Do smrti?')],
      },
    },
  },
  omyx: {
    id: 'omyx',
    start: 'o1',
    nodes: {
      o1: {
        speaker: 'omyx',
        text: 'ČAU! OMYX! Já jsem Omyx! Nekřičím, to je tady taková akustika!',
        enter: (c) => c.know('omyx'),
        options: [{ text: 'Co prodáváš?', next: 'o2' }, { text: 'Jak to tady chodí?', next: 'o3' }, { text: 'Prý se rád pereš.', next: 'o4' }],
      },
      o2: {
        speaker: 'omyx',
        text: 'Čaj. Bylinkovej. Z Beskyd. Přes den u řeky, večer tady. Prvních pět vteřin zdarma!',
        enter: (c) => c.flag('omyxTalked'),
        options: [end('Zastavím se.', (c) => c.rel('omyx', 3)), end('Čaj, jasně.'), end('Ne, díky.')],
      },
      o3: {
        speaker: 'omyx',
        text: 'Na Metějku jdi zezadu, zepředu má ústa. Prchardovi neutíkej z účtu. Plotkový neříkej Plotičko. A Kibimu nevěř nic, co řekne ženská.',
        enter: (c) => c.flag('omyxAdvice'),
        options: [end('Díky, Omyxi.', (c) => c.rel('omyx', 3)), end('To si zapíšu.'), { text: 'A tobě věřit můžu?', next: 'o5' }],
      },
      o4: {
        speaker: 'omyx',
        text: 'Kdo říkal, že se peru? Já se jen hlasitě objímám. Občas pěstí.',
        options: [end('Jasně.'), end('Tak mě neobjímej.'), end('Na zdraví, Omyxi.', (c) => c.rel('omyx', 2))],
      },
      o5: {
        speaker: 'omyx',
        text: 'Mně? Jasně! Já nikdy nelžu. Teda jednou. Ale to byla pravda.',
        options: [end('To mi stačí.'), end('Aha.'), end('Jdu za Plotkovou.')],
      },
    },
  },
  metejka: {
    id: 'metejka',
    start: 'm1',
    nodes: {
      m1: {
        speaker: 'metejka',
        text: 'Kde je moje pivo? Ty! Nevypil{|a} jsi mi pivo?',
        options: [
          { text: 'Nevypil{|a}.', next: 'm2' },
          { text: 'Vypil{|a}. Bylo teplý.', next: 'm3', do: (c) => c.rel('metejka', -10) },
          { text: 'Zahrajem si kulečník?', next: 'm4' },
        ],
      },
      m2: {
        speaker: 'metejka',
        text: 'Tak kdo?! …Metějka, mimochodem. Policajti mě znaj a radši přejdou na druhou stranu. Ty taky přejdeš?',
        enter: (c) => c.know('metejka'),
        options: [end('Nepřejdu.', (c) => c.rel('metejka', 3)), end('Přejdu.'), end('Tvoje pivo má Plotková.', (c) => c.rel('plotkova', -2))],
      },
      m3: {
        speaker: 'metejka',
        text: 'Teplý?! Moje pivo není teplý, moje pivo je VYZRÁLÝ! Pojď ven, vyřešíme to! …Teda ne, venku je festival. Příště.',
        enter: (c) => c.know('metejka'),
        options: [end('Příště.'), end('Kdykoli.'), end('Já jen žertoval{|a}.', (c) => c.rel('metejka', 3))],
      },
      m4: {
        speaker: 'metejka',
        text: 'Kulečník je o hlavě. Já mám hlavu. Prohrál jsem jen proto, že byl stůl křivej. Všech dvacet her.',
        enter: (c) => c.know('metejka'),
        options: [end('Stůl je rovnej.', (c) => c.rel('metejka', -3)), end('Určitě to byl stůl.', (c) => c.rel('metejka', 3)), end('Tak jindy.')],
      },
    },
  },
  zjebal: {
    id: 'zjebal',
    start: 'z1',
    nodes: {
      z1: {
        speaker: 'zjebal',
        text: 'Hehe, nazdar! Zjebal! Dobrý, dobrý! Dáš si se mnou? Jen jedno, v deset musím domů, žena.',
        enter: (c) => c.know('zjebal'),
        options: [
          { text: `Dám si. (${BEER} Kč)`, next: 'z2', cost: BEER, do: (c) => c.rel('zjebal', 8) },
          { text: 'Proč zrovna Zjebal?', next: 'z3' },
          { text: 'Ty umíš řídit náklaďák?', next: 'z4' },
        ],
      },
      z2: {
        speaker: 'zjebal',
        text: 'Na zdraví! Hehe! …Ještě jedno a jdu. Ne, fakt. Žena.',
        options: [end('Na zdraví!'), end('Ještě jedno?'), end('Pozdravuj ženu.')],
      },
      z3: {
        speaker: 'zjebal',
        text: 'Hehe, to ti řekne každej jinak. Žena říká, že kvůli tomu, jak parkuju. Já si myslím, že kvůli tomu, jak tancuju.',
        options: [end('Hehe, dobrý.'), end('Ukaž, jak tancuješ.'), end('Asi kvůli obojímu.')],
      },
      z4: {
        speaker: 'zjebal',
        text: 'Náklaďák, bagr, kombajn, cokoli. Zaparkuju ti ho i do kurníku. Ale do deseti, pak mě žena zabije.',
        enter: (c) => c.flag('zjebalDriver'),
        options: [end('To se může hodit.', (c) => c.rel('zjebal', 3)), end('Do kurníku?'), end('Do deseti, rozumím.')],
      },
    },
  },
  dennyVysoky: {
    id: 'dennyVysoky',
    start: 'd1',
    nodes: {
      d1: {
        speaker: 'dennyVysoky',
        text: 'Hm. Denny.',
        enter: (c) => c.know('dennyVysoky'),
        options: [{ text: 'Ty spravuješ auta?', next: 'd2' }, { text: 'Ty jsi Dan z Autoúprav?', next: 'd3' }, { text: 'Prý umíš zmizet auto.', next: 'd4' }],
      },
      d2: {
        speaker: 'dennyVysoky',
        text: 'Hm. Dovez ho. Udělám. Od jedný do pěti jsem tady.',
        options: [end('Díky.', (c) => c.rel('dennyVysoky', 2)), end('A jinak?'), end('Hm.')],
      },
      d3: {
        speaker: 'dennyVysoky',
        text: 'Hm. Dan. Denny. Je to jedno.',
        options: [end('Jasně.'), end('Hm.'), end('Tak teda Denny.')],
      },
      d4: {
        speaker: 'dennyVysoky',
        text: 'Co auto? Jaký auto?',
        options: [end('Žádný auto.'), end('Rozumím.'), end('Hm.', (c) => c.rel('dennyVysoky', 3))],
      },
    },
  },
  dennySochar: {
    id: 'dennySochar',
    start: 's1',
    nodes: {
      s1: {
        speaker: 'dennySochar',
        text: 'Nazdar… nemáš stovku? Vrátím. Fakt. Asi. Jsem Denny, sochař.',
        enter: (c) => c.know('dennySochar'),
        options: [
          { text: `Na, tady máš. (${LOAN} Kč)`, next: 's2', cost: LOAN, do: (c) => { c.rel('dennySochar', 10); c.count('lentSochar', LOAN); } },
          { text: 'Nemám.', next: 's3', do: (c) => c.rel('dennySochar', -3) },
          { text: 'Co sochaříš?', next: 's4' },
        ],
      },
      s2: {
        speaker: 'dennySochar',
        text: 'Díky! Vrátím ti to, až prodám sochu. Zatím je to kámen.',
        options: [end('Nemusíš.'), end('Vrátíš, viď?'), end('Kámen?')],
      },
      s3: {
        speaker: 'dennySochar',
        text: 'Nikdo nemá. Umění v Beskydech nikoho nezajímá. Tak aspoň dvacku? Ne? Tak nic.',
        options: [end('Tak nic.'), end('Zkus Vestu.'), end('Zkus pracovat.')],
      },
      s4: {
        speaker: 'dennySochar',
        text: 'Sochu Lysé hory v životní velikosti. Zatím je to kámen. Velkej. Nemáš stovku na dláto?',
        options: [
          { text: `Na dláto. (${LOAN} Kč)`, next: 's2', cost: LOAN, do: (c) => { c.rel('dennySochar', 10); c.count('lentSochar', LOAN); } },
          end('Na dláto ne.'),
          end('Ta hora už stojí.'),
        ],
      },
    },
  },
  kibi: {
    id: 'kibi',
    start: 'ki1',
    nodes: {
      ki1: {
        speaker: 'kibi',
        text: 'Ahoj, já jsem Kibi. Kdyby se někdo ptal, nejsem tady. Hlavně kdyby se ptala nějaká… dáma.',
        enter: (c) => c.know('kibi'),
        options: [
          { text: 'Proč za tebou chodí ženský?', next: 'ki2' },
          { text: 'Pomůžeš mi tady?', next: 'ki3', do: (c) => c.rel('kibi', 5) },
          { text: 'Zahrajem si šipky?', next: 'ki4' },
        ],
      },
      ki2: {
        speaker: 'kibi',
        text: 'Šarm, {kámo|kočko}. A to, že poslouchám. Většinou ani nevím, co říkaj, ale kývám.',
        options: [end('To je celý?'), end('Naučíš mě to?'), end('Kývám.')],
      },
      ki3: {
        speaker: 'kibi',
        text: 'Jasně, pomůžu. Kibi pomůže každýmu. Jen kdyby přišla Plotková, řekni, že jsem na záchodě.',
        options: [end('Platí.'), end('Proč Plotková?'), end('Na záchodě, jasně.')],
      },
      ki4: {
        speaker: 'kibi',
        text: 'Šipky jsou jako láska. Většinou se netrefíš, a když jo, bolí to.',
        options: [end('Hluboký.'), end('Tak jindy.'), end('To sis vymyslel.')],
      },
    },
  },
};

/** „Přisednu si ke štamgastům“: náhodný Štamgast. */
export const RANDOM_STAMGAST = 'stamgast';

export function randomStamgast(rnd: () => number): string {
  return STAMGASTI[Math.floor(rnd() * STAMGASTI.length)];
}
