---
name: moravka-dialogy
description: Píše a upravuje dialogy, hlášky, nabídky misí a handlování pro hru Grand Theft Morávka (černý humor, sarkasmus, beskydské reálie, vždy tři volby, mužský i ženský tvar hráče). Použij vždy, když v tomhle repu přidáváš nebo měníš cokoli, co postavy říkají – src/story/dialogs.ts, nabídky misí v src/scenes/jobs/, hlášky skupin a rádia v src/texts/, kupce v src/story/bargain.ts, bubliny a toasty – i když uživatel neřekne „dialog“, ale třeba „ať Zjebal něco řekne“, „vymysli hlášky“ nebo „nová mise od Vesty“.
---

# Dialogy po morávsku

Hra je top-down chaos z Beskyd. Texty dělají polovinu zábavy: krátké, drzé, s pointou
na konci a s místními reáliemi. Tenhle skill drží styl a technická pravidla, aby nové
texty seděly ke starým a prošly testy.

## Nejdřív si přečti

- `docs/hra/POSTAVY.md` – kdo je kdo, jak mluví, výhody a nevýhody, mise.
- `docs/adr/` – rozhodnutí, která texty omezují (hlavně ADR-007, ADR-012, ADR-018, ADR-019).
- Blízký existující dialog stejné postavy v `src/story/dialogs.ts` nebo `src/scenes/jobs/offers.ts`,
  ať navážeš na její hlas, ne na obecný „vtipný“ tón.

## Tón

- **Černý humor a sarkasmus, ne krutost vůči skupinám lidí.** Vtip je na účet postavy
  (Zjebal nerozumí, Metějka hledá pivo, Denny sochař chce stovku), nikdy ne na národnost,
  etnikum, víru nebo podobně. Proto Zjebal nemá žádné symboly ani nenávistné hlášky (ADR-007).
- **Omladina jsou plnoletí** (ADR-018). Nikdy o nich nepiš jako o dětech nebo žácích;
  hlavně ne kolem beskydského čaje.
- **Pointa na konci věty.** „Nejbližší hospoda je eRko. Nejvzdálenější taky, jiná tu není.“
- **Krátce.** Hospodská řeč, ne slohovka. Dvě až tři věty na uzel.
- **Reálie, které hra používá:** eRko a Prchard, Lysá hora, přehrada Morávka, Frýdek,
  rivalita s Raškovicemi („Kdo nepřijde, je Raškovák“), Foop obchod, Kofola, slivovice,
  fernet, hasičský bál a požární útok, kůrovec, divočáci, Kobyla, která všechno vidí,
  fízlové a jejich svačina.
- **Hlas postav** (stručně; víc v docs/hra/POSTAVY.md):
  - Prchard: úsečně, ceny piva („Čtyřicet pět. Pro tebe padesát.“)
  - Plotková: opilá, upřímná, chce panáky, „Plotičko“ smí jen Kibi
  - Vysoký Denny: „Hm.“ a co nejmíň slov
  - Omyx: KŘIČÍ (části vět velkými písmeny), dealer s morálkou („jsem dealer, ne zrůda“)
  - Zjebal: „Hehe, dobrý, dobrý!“, žena Ajina, náklaďák
  - Metějka: pivo, kulečník, hádky; Vesta: prachy a chlubení; Kibi: ženské, „nejsem tu“
  - Denny sochař: stovka, „umění“; Kobyla: sarkasmus, „SLEČNO!“; Ajina: výslech, pálka
  - Omladina: zkratky generace Z (bruh, no cap, fr fr, yk, sus) míchané s beskydštinou
  - Hasiči: bál, výjezdy, pivo ve zbrojnici, Lakatoš a hadice

## Technická pravidla (hlídají je testy)

1. **Každý uzel má přesně tři volby** (`DialogNode.options` je trojice). Když nemáš co
   říct, třetí volba může být „…“, „Hm.“ nebo „Radši pokecáme.“ s `then: base`.
2. **Aspoň jedna volba bez podmínky** (`when` ani `cost`), jinak hráč v rozhovoru uvízne.
   `validateDialog` to kontroluje.
3. **Hráč je hrdina, nebo hrdinka.** Všechno, co hráče oslovuje nebo popisuje, piš v obou
   tvarech `{mužský|ženský}`:
   - minulý čas: `{Ukradls|Ukradlas}`, `Odvezl{|a} jsi`, `{Neviděl|Neviděla} jsi mě`
   - oslovení a popis: `{punkáči|punkačko}`, `{brácho|ségra}`, `{Mladej|Mladá}`
   - `{jmeno}` je jméno, jak ho hráč napsal (nesklání se, takže ho nedávej do 5. pádu
     tam, kde by to drhlo; „Hele, {jmeno}.“ je v pohodě)
   - uvnitř závorek nesmí být další `{`, `}` ani `|`; po doplnění nesmí nic zbýt
     (testy procházejí oba tvary všech textů)
4. **Délka:** volba do ~75 znaků (tři se musí vejít pod text), text uzlu do ~250 znaků.
5. **Ceny a podmínky:** `cost` zašedí volbu „(nemáš peníze)“, `when` „(teď ne)“. Cena patří
   do textu volby: „Beru. (450 Kč)“.
6. **Kdo mluví:** `speaker` je `NpcId`, `'hero'`, `'narrator'`, nebo `'guest'` s
   `Dialog.guest = { name, css, sprite }` pro postavu jen na jeden rozhovor (kupec).
7. **Navazování:** `next` = další uzel ve stejném dialogu, `then` = jiný dialog po id.
   Dialog, který vzniká za běhu, zaregistruj přes `story.setDynamic(id, () => dialog)`.
   Mise se nabízí přes `story.talkNpc(npc, caller, base)`; viz `src/scenes/jobs/offers.ts`.

## Handlování (vzor z mise Omyxe)

Logika je v `src/story/bargain.ts`, testy v `bargain.test.ts`. Když přidáváš kupce nebo
argumenty, drž se struktury:

- Fáze: **nechce → možná → handl → strop → konec.** Kupec nejdřív odmítá, správný argument
  ho navnadí, pak hráč řekne cenu (pevná / „limitka“ / „kolik dáš ty?“) a smlouvá se.
- Každý typ kupce má `weak` (argument, který zabere) a `hates` (který ho naštve) z pěti:
  původ, vzácnost, účinek, diskrétnost, status. Ať se slabina dá uhodnout z jeho
  `refuse` a `tactics` (influencer mluví o followerech → zabere status).
- `tactics` jsou jeho kecy proti ceně („opačný efekt“): s `{offer}`, vtipné, krátké.
- Nový kupec potřebuje: `name`, `weak`, `hates`, `max` (rozsah stropu), `patience`,
  `refuse` (2+), `interested`, `tactics` (3), `hate`, `atMax`, `walk`, `deal` (2).
- Argumenty (`ARG_LINES`) říká hráč: první osoba, bez minulého času, nebo s `{|a}`.

## Postup

1. Přečti docs/hra/POSTAVY.md, ADR a sousední dialogy postavy.
2. Napiš uzly: nejdřív pointy, pak volby. Každá volba má jinou „náladu“ (slušně / drze /
   zvídavě), ať je výběr skutečný.
3. Projdi checklist: tři volby, jedna bez podmínky, oba tvary, délky, nikdo neútočí na
   skupinu lidí, Omladina plnoletá.
4. Spusť testy: `npx vitest run src/story` (validace dialogů, oba tvary, handlování).
5. Nové postavy nebo mise zapiš do docs/hra/POSTAVY.md, rozhodnutí jako nový soubor v docs/adr/.

## Příklad

Dobře:

```ts
z0: {
  speaker: 'zjebal',
  text: 'Hehe, {jmeno}! Ajina mě zabije. V deset mám bejt doma a jsem tady od čtyř. Hodíš mě domů?',
  options: [take('Hodím tě.'), { text: 'Prej umíš řídit náklaďák.', next: 'z1' }, { text: 'Radši pokecáme.', then: base }],
},
```

Špatně: dlouhý odstavec bez pointy, dvě volby, „Odvezl jsi“ bez ženského tvaru,
vtip postavený na tom, odkud kdo je.
