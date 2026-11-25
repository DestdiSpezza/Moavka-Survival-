/**
 * Handlování o beskydský čaj (mise Omyxe, ADR-019). Čistá logika bez Phaseru:
 * kupec z Omladiny nejdřív nechce, pak možná, pak se smlouvá. Hráč nabízí
 * argumenty (původ, vzácnost, účinek, diskrétnost, status); každý kupec má
 * jeden, který na něj platí, a jeden, který ho naštve. Kupec mezitím tlačí
 * cenu dolů svými kecy (opačný efekt). Základní cena je 200 Kč za gram.
 *
 * Texty můžou mít mužský i ženský tvar hráče ({brácho|ségra}).
 */

export type ArgId = 'puvod' | 'vzacnost' | 'efekt' | 'diskretnost' | 'status';
export const ARG_IDS: ArgId[] = ['puvod', 'vzacnost', 'efekt', 'diskretnost', 'status'];

/** Plná cena za gram (mise počítá jen prodeje aspoň za ni). */
export const BASE_PRICE = 200;

export type Rng = () => number;

/** Co hráč říká (argumenty). Krátké, ať se vejdou tři do okna. */
export const ARG_LINES: Record<ArgId, string[]> = {
  puvod: [
    'Rostlo na jižním svahu pod Lysou. Zalejvaný z přehrady.',
    'Sušený na půdě nad eRkem. Nasáklý pivem a Prchardovýma ponožkama.',
    'Bio. Hnojený jen tím, co Metějka nechal cestou z hospody.',
    'Lokální pěstitel. Má tři hvězdy. Policejní, ale hvězdy.',
  ],
  vzacnost: [
    'Poslední tři gramy. Další až po festivalu. Za rok. Možná.',
    'Omyx má zbytek zabavenej. Teda „zabavenej“. Teda vykouřenej.',
    'Limitka. Hasiči to zkoušeli uhasit a nešlo to.',
    'Raškovští za to nabízeli traktor. Bez kol, ale traktor.',
  ],
  efekt: [
    'Po tomhle uslyšíš kostelní zvony i v úterý.',
    'Divočák na tebe mrkne. A ty mu to oplatíš.',
    'Jeden šluk a pochopíš, proč Zjebal pořád říká „hehe“.',
    'Bude ti chutnat i jídlo z Foopu. I to prošlý.',
  ],
  diskretnost: [
    'Zabalím ti to do obalu od Kofoly. Fízl uvidí Kofolu.',
    'Předávka za kostelem. Farář tam nic neviděl od osmdesátýho devátýho.',
    'Nikomu nic neřeknu. Ani Kobyle. A to je výkon.',
  ],
  status: [
    'Dáš to na Insta a máš víc lajků než Vesta za nový auto.',
    'S tímhle seš main character celý Morávky. No cap.',
    'Tohle kouřil Metějka, když vyhrál kulečník. Proto je to tak vzácný.',
  ],
};

export interface BuyerType {
  id: string;
  /** Jméno v dialogu (všichni z Omladiny jsou plnoletí, ADR-018). */
  name: string;
  /** Argument, který na něj platí. */
  weak: ArgId;
  /** Argument, který ho naštve. */
  hates: ArgId;
  /** Kolik nejvýš dá (rozsah, konkrétní strop se losuje). */
  max: [number, number];
  patience: number;
  refuse: string[];
  interested: string;
  /** Jeho kecy proti ceně ({offer} = jeho nabídka). */
  tactics: string[];
  /** Na něco, co nesnáší. */
  hate: string;
  /** Na stropu ({max}). */
  atMax: string;
  walk: string;
  deal: string[];
}

export const BUYERS: BuyerType[] = [
  {
    id: 'influencer',
    name: 'Ondra s ring lightem',
    weak: 'status',
    hates: 'diskretnost',
    max: [260, 320],
    patience: 4,
    refuse: ['Čaj? {Brácho|Ségra}, já piju jen matchu. Na fotky.', 'Nekouřím. Teda ne na kameru.'],
    interested: 'Počkej… to by šlo na story. Kolik?',
    tactics: [
      'Dám {offer} a označím tě na Instáči. To je reklama, to se platí.',
      'Influenceři maj slevu. To je zákon. Asi. {offer}.',
      'Mám osm tisíc followerů. Tři jsou skuteční. {offer}.',
    ],
    hate: 'Diskrétně? Já žiju z toho, že všichni všechno vidí. {offer}.',
    atMax: 'Víc fakt ne. {max} a story s tebou. Bez filtru, slibuju.',
    walk: 'Tohle je cringe. Jdu natáčet západ slunce nad přehradou.',
    deal: ['Ideální. Dám to na story s hashtagem #čaj.', 'Tohle bude virál. Teda já. Ty ne.'],
  },
  {
    id: 'znalec',
    name: 'Tadeáš, co byl v Amsterdamu',
    weak: 'puvod',
    hates: 'status',
    max: [230, 280],
    patience: 4,
    refuse: ['Beru jen kvalitu. Byl jsem v Amsterdamu. Jednou. Na dva dny.', 'Hm. Vypadá to jak seno od Kobyly.'],
    interested: 'No… ukaž. Hm. Hm. Odkud to je?',
    tactics: [
      'V Amsterdamu by za tohle dali {offer}. Eur. Teda korun.',
      'Trichomy jsou takový… unavený. {offer}.',
      'Sativa, nebo indika? Nevíš? Tak {offer}.',
    ],
    hate: 'Insta? Ty jsi typ, co si fotí jídlo, že jo. {offer}.',
    atMax: '{max}. Víc ti nedám, ani kdyby to rostlo v Holandsku.',
    walk: 'Promiň, tohle je amatérismus. Jdu si to přečíst na fóru.',
    deal: ['Terroir, chápeš. Konečně někdo, kdo rozumí.', 'Pod Lysou, jo? Cítím tam tu přehradu.'],
  },
  {
    id: 'skrblik',
    name: 'Kuba Drobák',
    weak: 'vzacnost',
    hates: 'efekt',
    max: [190, 240],
    patience: 4,
    refuse: ['Nemám prachy. Mám jen drobný a lístek na bus.', 'Čaj? Doma mám heřmánek. Zadarmo.'],
    interested: 'Počkej. Kolik to stojí? Jen se ptám. Hypoteticky.',
    tactics: [
      'Mám {offer} v pětikorunách. Spočítej si to, já počkám.',
      'Ve Frýdku je to za stovku a dají ti k tomu fízla zdarma. {offer}.',
      'Dám {offer} a vrátím ti sáček.',
    ],
    hate: 'Účinek? Účinek mám i z Kofoly. {offer}.',
    atMax: '{max}. To je všechno. Vysypal jsem i prasátko.',
    walk: 'Za tolik si koupím tři Kofoly a budu mít stejnej pocit.',
    deal: ['Tak jo. Ale účtenku chci.', 'Dobře. Drobný si přepočítej, některý jsou možná polský.'],
  },
  {
    id: 'paranoik',
    name: 'Šimon VPN',
    weak: 'diskretnost',
    hates: 'status',
    max: [210, 260],
    patience: 3,
    refuse: ['Psst. Ne. Fízlové mají drony. I tady. Hlavně tady.', 'Kdo tě poslal? Kobyla? Já to věděl.'],
    interested: 'Dobře. Ale rychle. A dívej se jinam. Kolik?',
    tactics: [
      'Vypadáš jak fízl v civilu. Takže sleva za riziko. {offer}.',
      'Za {offer}. Rizikovej příplatek si odečítám já.',
      'Ten divočák támhle nás sleduje. {offer} a jdem.',
    ],
    hate: 'INSTA?! Fízlové čtou Insta! Teď už jen {offer}.',
    atMax: '{max}. A teď se tvař, že se neznáme. Neznáme se?',
    walk: 'Ne ne ne. Tohle je past. Mizím. {Neviděl|Neviděla} jsi mě.',
    deal: ['Nikdy jsme se neviděli. Kdo jsi? Nevím.', 'Obal od Kofoly. Geniální. Fakt geniální.'],
  },
  {
    id: 'vibe',
    name: 'Bára Vibe',
    weak: 'efekt',
    hates: 'puvod',
    max: [220, 280],
    patience: 4,
    refuse: ['Já jsem high na životě, {brácho|ségra}. Fakt.', 'Nepotřebuju. Mám vibe.'],
    interested: 'Ale jo, vibe check. Kolik?',
    tactics: [
      'Pošli dobrou energii a já pošlu {offer}.',
      'Peníze jsou jen iluze. Ale {offer} jich mám.',
      'Za {offer} ti dám i objetí. Objetí je zdarma, ale počítá se.',
    ],
    hate: 'Zalejvaný z přehrady? Tam se koupe Metějka. {offer}.',
    atMax: '{max}, víc mi vesmír nedovolí.',
    walk: 'Tohle má špatnou energii. Jdu obejmout strom za hospodou.',
    deal: ['Cítím to. Bude to hezký.', 'Vesmír ti to vrátí. Teda já ti to nevrátím.'],
  },
];

const HIT = ['…to je fakt silný. Tak jo, {offer}.', 'Hm. HM. Dobře, {offer}.', 'Okay, tohle mě dostalo. {offer}.'];
const MEH = ['A? Furt {offer}.', 'Hezký. {offer}.', 'To říká každej. {offer}.'];

export type Phase = 'nechce' | 'mozna' | 'handl' | 'strop' | 'konec';
export type Result = 'deal' | 'walk' | 'quit';

export interface Bargain {
  type: BuyerType;
  /** Kolik nejvýš dá (hráč to neví). */
  max: number;
  /** Jeho aktuální nabídka. */
  offer: number;
  patience: number;
  phase: Phase;
  /** Co kupec právě říká. */
  line: string;
  /** Dva argumenty, které má hráč teď na jazyku. */
  args: [ArgId, ArgId];
  /** Řádek textu pro každý z nich. */
  argLines: [string, string];
  /** Kolik kol handlování proběhlo (slabina se objeví nejpozději ve třetím). */
  round: number;
  result: Result | null;
  price: number;
}

const pick = <T>(list: readonly T[], rnd: Rng): T => list[Math.floor(rnd() * list.length) % list.length];
const r10 = (n: number) => Math.round(n / 10) * 10;
const fmt = (s: string, b: { offer: number; max: number }) => s.replace(/\{offer\}/g, `${b.offer} Kč`).replace(/\{max\}/g, `${b.max} Kč`);

/** Typ kupce podle člena Omladiny (stejný člen = pořád stejný typ). */
export function buyerFor(seed: number): BuyerType {
  return BUYERS[Math.abs(Math.floor(seed)) % BUYERS.length];
}

/** Dva různé argumenty na kolo; slabina kupce padne aspoň v každém třetím kole. */
function deal2(b: Pick<Bargain, 'type' | 'round'>, rnd: Rng): Pick<Bargain, 'args' | 'argLines'> {
  const pool = [...ARG_IDS];
  const first = b.round % 3 === 2 || rnd() < 0.45 ? b.type.weak : pick(pool.filter((a) => a !== b.type.weak), rnd);
  const second = pick(pool.filter((a) => a !== first), rnd);
  const args: [ArgId, ArgId] = rnd() < 0.5 ? [first, second] : [second, first];
  return { args, argLines: [pick(ARG_LINES[args[0]], rnd), pick(ARG_LINES[args[1]], rnd)] };
}

export function startBargain(type: BuyerType, rnd: Rng): Bargain {
  const max = r10(type.max[0] + rnd() * (type.max[1] - type.max[0]));
  const b: Bargain = {
    type,
    max,
    offer: Math.max(60, r10(max * 0.45)),
    patience: type.patience,
    phase: 'nechce',
    line: pick(type.refuse, rnd),
    args: ['puvod', 'vzacnost'],
    argLines: ['', ''],
    round: 0,
    result: null,
    price: 0,
  };
  return { ...b, ...deal2(b, rnd) };
}

/** Kupec odejde (došla trpělivost). */
function walk(b: Bargain): Bargain {
  return { ...b, phase: 'konec', result: 'walk', line: b.type.walk };
}

/** Nechce: argument ho má navnadit. Slabina zabere vždy, nenáviděný nikdy, jinak napůl. */
export function hook(b: Bargain, which: 0 | 1, rnd: Rng): Bargain {
  const arg = b.args[which];
  const next = { ...b, round: b.round + 1 };
  if (arg === b.type.weak || (arg !== b.type.hates && rnd() < 0.55)) {
    const bonus = arg === b.type.weak ? 20 : 0;
    return { ...next, phase: 'mozna', offer: Math.min(b.max, b.offer + bonus), line: b.type.interested, ...deal2(next, rnd) };
  }
  const patience = b.patience - (arg === b.type.hates ? 2 : 1);
  if (patience <= 0) return walk({ ...next, patience });
  return { ...next, patience, line: arg === b.type.hates ? fmt(b.type.hate, b) : pick(b.type.refuse, rnd), ...deal2(next, rnd) };
}

/** Možná: hráč řekne cenu (pevná 200, „limitka“ 300), nebo se zeptá, kolik dá on. */
export function askPrice(b: Bargain, how: 'pevna' | 'limitka' | 'kolik', rnd: Rng): Bargain {
  let { offer, patience } = b;
  let line: string;
  if (how === 'pevna') {
    line = `Dvě stovky? To jsou dvě piva v eRku. Teda tři. Dám ${offer} Kč.`;
  } else if (how === 'limitka') {
    // Vysoká kotva zabere na ty, co chtějí status nebo vzácnost; ostatní urazí.
    if (b.type.weak === 'status' || b.type.weak === 'vzacnost') {
      offer = Math.min(b.max, offer + 40);
      line = `Tři stovky… to zní jako něco. Ale ne tři. ${offer} Kč.`;
    } else {
      offer = Math.max(50, offer - 10);
      patience -= 1;
      line = `Tři stovky? Za to koupím Metějkův kulečník. I s Metějkou. ${offer} Kč.`;
    }
  } else {
    patience += 1;
    line = `Hm. ${offer} Kč. A jsme kámoši.`;
  }
  const next = { ...b, offer, patience, phase: 'handl' as Phase, line, round: b.round + 1 };
  if (patience <= 0) return walk(next);
  return { ...next, ...deal2(next, rnd) };
}

/**
 * Handlování: argument zvedne nabídku (slabina hodně, jiný trochu, nenáviděný ji srazí)
 * a kupec odpoví svými kecy, kterými zase tlačí dolů.
 */
export function pitch(b: Bargain, which: 0 | 1, rnd: Rng): Bargain {
  const arg = b.args[which];
  const next = { ...b, round: b.round + 1 };
  let { offer, patience } = b;
  let line: string;
  if (arg === b.type.weak) {
    offer = Math.min(b.max, offer + r10(45 + rnd() * 25));
    line = fmt(pick(HIT, rnd), { offer, max: b.max });
  } else if (arg === b.type.hates) {
    offer = Math.max(50, offer - 20);
    patience -= 2;
    line = fmt(b.type.hate, { offer, max: b.max });
  } else {
    // Hezky řečeno, ale kupec si to hned vezme zpátky svými kecy.
    offer = Math.min(b.max, offer + r10(rnd() * 20));
    patience -= 1;
    const reply = rnd() < 0.5 ? pick(MEH, rnd) : pick(b.type.tactics, rnd);
    line = fmt(reply, { offer, max: b.max });
  }
  if (patience <= 0) return walk({ ...next, offer, patience });
  if (offer >= b.max) return { ...next, offer, patience, phase: 'strop', line: fmt(b.type.atMax, { offer, max: b.max }) };
  return { ...next, offer, patience, line, ...deal2(next, rnd) };
}

/** Plácnout si za aktuální nabídku. */
export function strike(b: Bargain, rnd: Rng): Bargain {
  return { ...b, phase: 'konec', result: 'deal', price: b.offer, line: pick(b.type.deal, rnd) };
}

/** Na stropu ještě přitlačit: napůl kývne (+20), napůl odejde. */
export function push(b: Bargain, rnd: Rng): Bargain {
  if (rnd() < 0.5) {
    const price = b.offer + 20;
    return { ...b, phase: 'konec', result: 'deal', price, offer: price, line: `Tak jo, ${price} Kč. Ale dlužíš mi kebab.` };
  }
  return walk(b);
}

/** Hráč to vzdá (čaj si nechá). */
export function quit(b: Bargain): Bargain {
  return { ...b, phase: 'konec', result: 'quit', line: 'Tak nic. Hezký den. Teda večer. Teda co je teď?' };
}

/** Počítá se prodej do mise (aspoň plná cena)? */
export function fullPrice(price: number): boolean {
  return price >= BASE_PRICE;
}
