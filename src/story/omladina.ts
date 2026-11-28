import type { Dialog, DialogOption } from './dialog';
import type { NpcId } from './npcs';

/**
 * Omladina s misemi (ADR-037): běžné řeči (Gen Z slang, všichni plnoletí, ADR-018),
 * hlášky lidí, co utíkají před Karlem, a co o nových postavách říkají skupiny.
 */

const end = (text: string): DialogOption => ({ text });

const CHAT: Partial<Record<NpcId, [string, string]>> = {
  prcka: [
    'Yo, {jmeno}. Vidíš to BMW? Moje. Teda máma ho splácí, ale řídím ho já, takže moje. No cap.',
    'Prachy? Bro, já mám aury, ne prachy. Prachy maj boomeři. Já mám BMW a nulu na účtu, to je sigma lifestyle.',
  ],
  awe: [
    'Heyy {jmeno}! Jsem Awe. Jako „aww“, ale s é. Moje vibe je chaotic good. Spíš chaotic.',
    'Karel je… osobní věc. Emoční podpora. Rozumíš. Nebo nerozumíš, to je taky valid.',
  ],
  natala: [
    'No čau. Ja su ta z Chaty aj z Ostravy, šak to víš. Tady na Morávce sa nuda, tak sa bavím jak umím.',
    'U nás v Ostravě by sa to vyřešilo za pět minut. Tady na to potřebuju tebe, Dennyho a bagr. Venkov, no.',
  ],
  miniVesta: [
    'Jsem Mini Vesta. Ne, nejsem Vestova ségra. Ani dcera. Prostě mám taky červenou mikinu. Je to vibe.',
    'Babeta je oldschool, bro. Retro je W. Jen jí chybí karburátor, takže je to zatím spíš lavička.',
  ],
};

/** Běžný rozhovor s člověkem z Omladiny („Radši pokecáme“). */
export function omladinaChat(id: NpcId): Dialog {
  const [a, b] = CHAT[id] ?? ['Bruh.', 'Fr fr.'];
  return {
    id: `chat-${id}`,
    start: 'c0',
    nodes: {
      c0: { speaker: id, text: a, enter: (c) => c.know(id), options: [{ text: 'A dál?', next: 'c1' }, end('Bruh.'), end('Musím jít.')] },
      c1: { speaker: id, text: b, options: [end('Real.'), end('Ok boomer.'), end('Tak čau.')] },
    },
  };
}

/** Co křičí lidi, ke kterým se hráč blíží s Karlem v ruce (černý humor, nic explicitního). */
export const KAREL_FLEE = [
  'Kala do mě nevložíš!',
  'Ne! Ne! Já mám rodinu!',
  'Mami! Ten {punkáč|punkačka} má KARLA!',
  'Na tohle jsem nepodepsal souhlas!',
  'Karla si strč… ne, nikam ho nestrkej!',
  'Ježiši, to je jak hadice od hasičů!',
  'Já se ani neohlídnu! NEOHLÍDNU!',
  'Fízlové! Tady někdo mává Karlem!',
  'S tím ke mně nechoď, já jsem z Raškovic!',
  'Tohle se v Beskydech nedělá!',
  'Na mě ne, já mám hemeroidy!',
  'Pane farář! Pomoc! Karel!',
  'Nééé, ten je větší než můj důchod!',
  'Radši mě přejeď autem!',
];

/** Co si skupiny říkají o nových postavách (doplní se do keců v bublinách). */
export const OMLADINA_CHATTER = {
  omladina: [
    'Přčka zas nemá na benzín, ngl. Má BMW na baterky. Na mámu.',
    'Awe hledá Karla. Nevím, kdo je Karel, a nechci vědět, fr.',
    'Mini Vesta a ta babeta? Retro W, ale jezdí L.',
    'Ta z Chaty aj z Ostravy je lowkey scary. Highkey.',
  ],
  stamgasti: [
    'Přčka chtěl včera platit kartou. V eRku. Prchard se smál do Vánoc.',
    'Ta z Chaty aj z Ostravy vypije víc než Metějka. A Metějka je profík.',
    'Viděl jsem Mini Vestu. Myslel jsem, že už mám dost. Měl jsem dost.',
    'Awe se mě ptala na nějakýho Karla. Já znám jen Karla Gotta a ten nepije.',
  ],
  hasici: [
    'Přčkovo BMW stojí na hřišti. Na trávníku. To je přestupek a navíc ostuda.',
    'Ta z Chaty aj z Ostravy u nás kupovala lopatu. Prej na zahrádku. V listopadu.',
    'Mini Vesta jela na babetě a kouřilo se z ní víc než ze zbrojnice na bále.',
    'Kdo to proboha je ten Karel, co ho všichni hledají? Máme ho v evidenci pohřešovaných?',
  ],
};
