/** Tutoriál pro novou hru: nápovědy jedna po druhé, každá zmizí, když ji hráč splní. */

export interface TutorialState {
  moved: number;
  sprinted: boolean;
  inCar: boolean;
  drove: number;
  armed: boolean;
  missionStarted: boolean;
  wanted: number;
  /** Jak dlouho už je zobrazená aktuální nápověda (s). */
  shownFor: number;
}

export interface TutorialStep {
  id: string;
  text: string;
  /** Kdy může nápověda přijít na řadu (jinak se přeskočí na později). */
  ready?: (s: TutorialState) => boolean;
  done: (s: TutorialState) => boolean;
}

const READ_TIME = 9;

export const TUTORIAL: TutorialStep[] = [
  { id: 'move', text: 'WASD nebo šipky = chůze, myš = míření. Rozhlédni se po vesnici.', done: (s) => s.moved > 120 },
  { id: 'sprint', text: 'SHIFT = sprint. Dech dojde rychleji než pivo v hospodě.', done: (s) => s.sprinted },
  { id: 'car', text: 'Dojdi k autu a zmáčkni E. Ano, je to krádež. Vítej v Beskydech.', done: (s) => s.inCar },
  {
    id: 'drive',
    text: 'W/S plyn a brzda, A/D zatáčení, MEZERNÍK ruční brzda (drift). R přepíná rádio. E = vystoupit.',
    ready: (s) => s.inCar,
    done: (s) => s.drove > 600 || s.shownFor > 14,
  },
  {
    id: 'weapons',
    text: 'Zbraně leží po vesnici: pistole za hospodou, pálka u školy. Levé tlačítko = útok, 1–5 = zbraň.',
    done: (s) => s.armed || s.shownFor > 20,
  },
  { id: 'missions', text: 'U dveří hospody a u postav zmáčkni E. V rozhovoru vybíráš odpověď klávesami 1–3.', done: (s) => s.missionStarted || s.shownFor > 20 },
  { id: 'respect', text: 'Vlevo je respekt. Komu pomůžeš, ten tě má rád. Jeho nepřátelé už míň.', done: (s) => s.shownFor > READ_TIME },
  {
    id: 'police',
    text: 'Hvězdy = policie. Zmiz z dohledu (v lese to jde rychleji), nebo přelakuj auto v garáži na severu.',
    ready: (s) => s.wanted > 0,
    done: (s) => s.shownFor > READ_TIME,
  },
  { id: 'goal', text: 'Vpravo nahoře je cíl oblasti: skóre a peníze. Pak tě pustí do Raškovic. H = skrýt nápovědy.', done: (s) => s.shownFor > READ_TIME },
];

/**
 * Další nápověda k zobrazení: první nesplněná, jejíž podmínka platí.
 * Splněné se vyřadí rovnou (i když přišly na řadu později).
 */
export function advanceTutorial(done: Set<string>, current: string | null, s: TutorialState): string | null {
  if (current) {
    const step = TUTORIAL.find((t) => t.id === current)!;
    if (!step.done(s)) return current;
    done.add(current);
  }
  for (const t of TUTORIAL) {
    if (done.has(t.id)) continue;
    if (t.done({ ...s, shownFor: 0 })) {
      done.add(t.id);
      continue;
    }
    if (!t.ready || t.ready(s)) return t.id;
  }
  return null;
}
