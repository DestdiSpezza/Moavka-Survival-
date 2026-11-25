# Příběhovka: plán po fázích

Survive Morávka přechází ze zakázek na příběh. Příběh je rozdělený na **Akty** (levely),
každý akt má **mise** a mise se skládají z **kroků** (jdi, dojeď, promluv, přežij…).
Dosavadní herní mechaniky zůstávají: chůze a řízení, boj, policie se svědky, skupiny
a respekt, provoz, nehody, divočáci, rozhlas, garáž, Veseta, Omyx, chata, den a noc.

Rozhodnutí jsou v [ADR.md](../ADR.md), postavy v [NPC.md](../NPC.md), odložené věci v [TODO.md](../TODO.md).
Po dokončení každé fáze se zastavíme, probereme ji a teprve pak jde další.

---

## Co už ve hře je a použije se

| Hotové | K čemu v příběhu |
|---|---|
| Kroky zakázek (`src/missions/steps.ts`: jdi, vyzvedni, dojeď, znič, doprovoď, přežij, uteč policii…) | Kroky misí v aktech, beze změny |
| Ukazatel cíle na mapě i minimapě, text úkolu v HUDu | Cíl mise („Dojdi do hospody“) |
| Rozhlas a rádio (`Announcer`), bubliny nad hlavou (`Speech`) | Hlášky NPC venku, úvodní scéna |
| Nabídky na klávesy 1–3 (`Economy`, nabídka zakázek) | Základ dialogového okna |
| Ukládání do prohlížeče (`save.ts`) | Postup v příběhu, vztahy s NPC |
| Mapa Morávky s hospodou eRko u křižovatky | Zastávka před eRkem, vchod do interiéru |

Co se zruší: zadavatelé „!“ u skupin, nabídky a katalog 22 zakázek (Morávka i Raškovice),
krok tutoriálu o zakázkách. Respekt skupin zůstává (mění ho boj a příběh).
Výjezd do Raškovic otevře až příběh (ADR-011). Dealer Veseta je od teď Vesta ze Štamgastů (ADR-009),
Omyx je přes den u řeky a večer v eRku (ADR-010).

---

## Harmonogram

| Fáze | Obsah | Stav |
|---|---|---|
| **P1** | **Akt 1: Příjezd** – zrušení zakázek, příběhový systém, autobus a úvodní scéna, NPC na zastávce, mise „Do hospody“, interiér eRka, dialogy se 3 volbami, Plotková a Štamgasti | **hotovo, čeká na schválení** |
| P2 | Štamgasti v praxi: výhody a nevýhody postav jako mechaniky, vztahy s NPC, následky volby „s nikým se nebavím“ (těžší start), Denny sochař a pár ran (ADR-015) | další na řadě |
| P3 | Akt 1 pokračuje: další mise aktu (obsah dodáš ty), konec aktu, přechod do Aktu 2 | čeká na příběh |
| P4+ | Další akty (Raškovice, Krásná, Lysá hora), každý jako samostatná fáze | čeká na příběh |
| průběžně | Ladění, testy hraním, ukládání, dokumentace | – |

---

## Fáze P1: Akt 1 – Příjezd

### 0. Hrdina nebo hrdinka
- Nová hra začne volbou: hrdina, nebo hrdinka (jiná postavička, texty v mužském nebo ženském tvaru) a jméno, které si hráč napíše (ADR-012).
- Pak telefon s příspěvkem jako z Instagramu: „Super festival v eRku na Morávce!“. Proto hrdina jede.

### 1. Zrušení zakázek
- Pryč: zadavatelé „!“, nabídky, katalog zakázek, odměny a komplikace zakázek, krok tutoriálu o zakázkách.
- Zůstává: kroky (`steps.ts`), ukazatel cíle, text úkolu v HUDu. Z `Missions` se stane `Story` (běh aktu a misí).
- Staré uložené hry: postup, peníze a výbava zůstanou, rozehraná zakázka se zahodí. Příběh v nich začne od Aktu 1 bez úvodní animace.
- Výjezd do Raškovic se zavře (otevře ho až některý akt). Budova Veseta se přejmenuje na Vestovu (obchod pod pultem zůstává).
- Neprůstřelná výbava se přejmenuje na „Neprůstřelná vesta“ (ADR-013).
- Garáž Autoúpravy Dan ovládá Vysoký Denny rozhovorem; mezi 13 a 17 hodinou je v eRku a garáž je zavřená (ADR-014). Omyx je přes den u řeky, večer v eRku.

### 2. Příběhový systém
- `src/story/`: akty jako data (akt → mise → kroky), stav příběhu (aktuální akt a mise, příznaky typu `metPlotkova`, `refusedTalk`), vztahy s NPC (−100 až 100).
- Ukládá se do hry (nová verze uložení s převodem ze staré).
- Kroky, které přibudou: **cutscéna** (scéna řízená skriptem), **dialog**, **vstup do budovy**.

### 3. Úvodní scéna: autobus k eRku
- Nové vozidlo **autobus** (pixel art, delší než dodávka, dveře uprostřed).
- Nová hra začne černou obrazovkou s titulkem „Akt 1: Příjezd“, pak filmové pruhy nahoře a dole.
- Autobus přijede od Raškovic po silnici ze severozápadu (levý horní roh), projede křižovatkou a zastaví na zastávce před eRkem. Kamera ho sleduje.
- Dveře se otevřou, hráč (punkáč s čírem) vystoupí, autobus odjede. Celé to trvá asi 15 s; Mezerník nebo Esc přeskočí.
- Na zastávce před eRkem přibude přístřešek a cedule (nová zastávka „Morávka, eRko“).

### 4. NPC na zastávce
- Na zastávce stojí **Slečna Kobyla** (viz NPC.md), otočí se a sarkasticky poradí, kde je hospoda. Bublina nad hlavou, pak dialogové okno se 3 odpověďmi.
- Návrhy hlášek (vybereme jednu nebo se budou střídat):
  - „Vypadáš žíznivě. Nejbližší hospoda je eRko. Nejvzdálenější taky, jiná tu není.“
  - „S takovým čírem tě do kostela nepustí. Do eRka jo, tam pustí i prase.“
  - „Hledáš hospodu? Jdi po čuchu, eRko smrdí pivem až do Frýdku.“

### 5. Akt 1, Mise 1: Do hospody
- Úkol „Dojdi do hospody eRko“, ukazatel na dveřích. Zbraně a auta fungují jako dřív (kdo chce, může cestou krást).
- U dveří: „E: vejít do eRka“.

### 6. Interiér hospody eRko
- Samostatná scéna s vlastní malou mapou (svět venku se mezitím zastaví).
- Návrh rozložení (shora):

```
┌───────────────────────────────────────────┐
│  WC   │      kulečník         │  šipky (o) │
│───────┘      [══════]          │            │
│                                           │
│  ═══════ BAR ═══════      ┌───┐   ┌───┐   │
│  pípa  Prchard  ▒ Plotková│stůl│  │stůl│   │
│  židle × 4 u baru         └───┘   └───┘   │
│                           Štamgasti        │
│  věšák        stůl s mapou Morávky         │
└──────────────────[dveře]──────────────────┘
```

- Uvnitř: Prchard za barem, Plotková obsluhuje mezi stoly, osm Štamgastů u dvou stolů a u kulečníku (Metějka „hraje“).
- Pohyb WASD; u postavy „E: promluvit“. Uvnitř se nestřílí ani nebojuje (rvačky v hospodě až později, viz TODO).
- Ven dveřmi, hráč se objeví před eRkem.

### 7. Dialogový systém
- Okno dole přes celou šířku: jméno mluvčího v barvě, zvětšená pixelová postavička, text, vždy **3 volby** (klávesy 1–3 nebo myš).
- Dialogy jsou data (strom uzlů); volba může stát peníze, změnit vztah s NPC nebo respekt skupiny, nastavit příznak, poslat dál.
- Hra se během dialogu zastaví.

### 8. První dialog po vstupu (Prchard za barem)
> Prchard: „Zavři, táhne. Co to bude?“

1. **„S nikým se bavit nechci.“** → Prchard: „Jak chceš. Pivo za čtyřicet pět, ticho zdarma.“ Nastaví `refusedTalk` = **těžší start** (co přesně znamená, probereme ve fázi P2; viz ADR-006).
2. **„Sednu si k baru.“** → dialog s Plotkovou.
3. **„Přisednu si ke štamgastům.“** → náhodný Štamgast a jeho dialog.

### 9. Plotková na baru
Plotková se představí („Plotková. Neříkej mi Plotičko, to smí jen Kibi.“) a nabídne tři cesty:
1. **Pozvat ji na panáka** (stojí peníze) → vztah +, rozpovídá se, chce další (její nevýhoda).
2. **Lichotky a flirt** („Máš krásný oči.“, „Co tady dělá taková princezna?“, „Ty tady obsluhuješ, nebo vládneš?“) → reaguje podle toho, kolik vypila.
3. **„Kdo jsou ti chlapi u stolu?“** → popíše Štamgasty jednoho po druhém (obsah podle NPC.md). Po tomhle u každého Štamgasta svítí jméno.

### 10. Štamgasti
- Náhodný Štamgast z osmi (Vesta, Omyx, Metějka, Zjebal, Vysoký Denny, Denny sochař, Kibi; Prchard je za barem) má vlastní krátký dialog podle povahy, vždy 3 volby.
- V P1 jde jen o seznámení a vztah (+/−). Výhody a nevýhody postav se zapnou ve fázi P2.

### 11. Po dialogu
- Text „Akt 1 pokračuje…“ a volná hra s dosavadními mechanikami, dokud nepřidáme další mise (fáze P3).

### Jak to dopadlo (P1 hotová)
- Nová hra: volba hrdina / hrdinka, jméno (max. 14 znaků), telefon s příspěvkem `erko_moravka` o festivalu (`HeroScene`).
- Úvod (`Intro`): autobus jede od Raškovic, zastaví před eRkem, otevře dveře, hráč vystoupí, autobus odjede. Během úvodu jsou černé pruhy, titulek „AKT 1: PŘÍJEZD“ a žádné HUD. Mezerník nebo Esc přeskočí na rozhovor se Slečnou Kobylou.
- Mise „Do hospody“: ukazatel ke dveřím eRka, E vejde (`PubScene`). Při prvním vstupu Prchard nabídne 3 volby; splněním se mise uzavře a objeví se „Akt 1 pokračuje…“.
- V eRku: Prchard za barem, Plotková chodí mezi barem a stoly, osm štamgastů na svých místech. Dokud hráč nepromluví s Prchardem, je festival a sedí tam všichni; pak platí rozvrh (Vysoký Denny 13–17, Omyx večer).
- Venku stojí Slečna Kobyla u zastávky a Vysoký Denny před Autoúpravami Dan. Garáž = rozhovor (oprava nebo lak, výkup, nic).
- Texty, které oslovují hráče, mají mužský i ženský tvar (`{Ukradls|Ukradlas}`, `src/texts/gender.ts`), včetně policie, skupin, svědků a rádia.
- Uložení verze 2 (hrdina, příběh, vztahy, koho hráč zná). Stará uložení se převedou: Akt 1 bez úvodu, rovnou mise do hospody, peníze a výbava zůstanou.
- Testy: data dialogů (3 volby, odkazy, vždy aspoň jedna volba bez podmínky), rozvrh postav, akty, převod uložení, oba tvary všech textů. Hraním ověřeno v prohlížeči: celý průchod Aktem 1, garáž autem i pěšky, Vesta, pokračování ze starého uložení.

### Hotovo, když
- Nová hra: autobus přijede k eRku, hráč vystoupí, místní ho pošle do hospody, mise ho dovede ke dveřím.
- Do eRka jde vejít a z něj vyjít; uvnitř jde mluvit s Prchardem, Plotkovou a se všemi Štamgasty.
- Všechny tři volby úvodního dialogu fungují a jejich následek se uloží.
- Zakázky ani „!“ ve hře nejsou; zbytek mechanik funguje jako předtím (ověří testy hraním).
- Testy: data dialogů (každá volba někam vede, nikde nechybí text), stav příběhu, převod starého uložení.
