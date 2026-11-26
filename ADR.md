# ADR: rozhodnutí

Záznamy rozhodnutí o hře. Každé má stav: **přijato**, **navrženo** (čeká na souhlas) nebo **otevřeno** (probereme).
Nová rozhodnutí se přidávají na konec; staré se nemažou, jen se označí jako nahrazené.

---

## ADR-001: Příběh místo zakázek
- **Stav:** přijato (zadání, příběhovka)
- **Kontext:** Hra měla 22 nezávislých zakázek od skupin (zadavatelé „!“). Přecházíme na příběhovku.
- **Rozhodnutí:** Zakázky, zadavatelé a jejich katalog se ruší. Kroky zakázek (jdi, dojeď, znič, přežij…) zůstávají a použijí se v misích příběhu. Ostatní mechaniky zůstávají beze změny.
- **Důsledky:** Peníze a skóre ze zakázek odpadnou, dokud je nedá příběh. Staré uložené hry ztratí jen rozehranou zakázku.

## ADR-002: Akty, mise, kroky
- **Stav:** přijato (zadání)
- **Rozhodnutí:** Příběh je rozdělený na Akty (levely). Akt má mise, mise má kroky. Akty, mise i dialogy jsou data v kódu (`src/story/`), ne skripty v editoru.
- **Důsledky:** Nový akt = nový datový soubor a případně nové druhy kroků.

## ADR-003: Dialogy vždy se třemi volbami
- **Stav:** přijato (zadání)
- **Rozhodnutí:** Dialog je strom uzlů. Každý uzel má mluvčího, text a právě 3 volby (klávesy 1–3 nebo myš). Volba může stát peníze, změnit vztah s NPC nebo respekt skupiny, nastavit příznak a vést dál. Během dialogu hra stojí.
- **Důsledky:** Testy hlídají, že každý uzel má 3 volby a každá někam vede.

## ADR-004: Interiéry jako samostatná scéna
- **Stav:** navrženo
- **Rozhodnutí:** Hospoda eRko (a později další budovy) má vlastní malou mapu ve vlastní scéně. Svět venku se mezitím zastaví (provoz, policie, čas). Uvnitř se nebojuje.
- **Proč:** Jednodušší než střechy, které se odkrývají, a svět venku nemusí řešit, co se děje uvnitř.
- **Důsledky:** Policie hráče uvnitř nehledá; hospoda je bezpečné místo (stejně jako dnes chata). Rvačky v hospodě až později (TODO).

## ADR-005: Úvodní scéna jde přeskočit
- **Stav:** navrženo
- **Rozhodnutí:** Autobus k eRku a vystoupení trvají asi 15 s, Mezerník nebo Esc přeskočí. Úvodní scéna se hraje jen u nové hry.

## ADR-006: Volba „S nikým se bavit nechci“ = těžší start
- **Stav:** přijato (fáze P3): štamgasti začínají na vztahu −15 a dokud jsou v minusu, chtějí nejdřív pivo (45 Kč, +20) nebo omluvu (+5); svědci volají policii o čtvrtinu častěji.
- **Původně:** otevřeno
- **Rozhodnutí zatím:** Volba nastaví příznak `refusedTalk`. Hra pokračuje dál, žádné NPC hráče nenasměruje.
- **Nápady na později:** dražší pivo u Prcharda, Plotková nic neprozradí, Štamgasti jsou chladnější (vztah začíná níž), policie víc podezíravá, žádná pomoc v první misi.

## ADR-007: Zjebal bez nenávistných symbolů a hlášek
- **Stav:** navrženo
- **Rozhodnutí:** Zjebal je podle zadání vysmátý přátelský neonácek, ale ve hře nemá žádné symboly, pozdravy, vlajky, tetování ani hlášky proti komukoli. Vtip je na jeho účet (čemu nerozumí, žena ho drží zkrátka), ne na účet jiných.
- **Proč:** Hra je černý humor a nadsázka; nenávistný obsah by ji shodil a nesmí jít ani do veřejné verze na GitHub Pages.

## ADR-008: Postup příběhu v uložené hře
- **Stav:** navrženo
- **Rozhodnutí:** Uložení dostane novou verzi: aktuální akt a mise, příznaky, vztahy s NPC. Staré uložení se převede (příběh začne Aktem 1 bez úvodní animace, peníze a výbava zůstanou).

## ADR-009: Vesta je Veseta
- **Stav:** přijato
- **Kontext:** Štamgast se jmenuje Vesta, dealer u úřadu Veseta a neprůstřelná výbava v HUDu taky „Vesta“.
- **Rozhodnutí:** Vesta a Veseta jsou jedna postava: bohatý Štamgast Vesta, který zároveň prodává zbraně, vestu a lékárničky pod pultem. Jméno Veseta ze hry zmizí (budova u úřadu bude Vestova).
- **Otevřené:** Neprůstřelná výbava v HUDu se pořád jmenuje „Vesta“; návrh je přejmenovat ji na „Neprůstřelná vesta“, ať se to neplete s postavou.

## ADR-010: Kde je Omyx
- **Stav:** přijato
- **Kontext:** Omyx dnes stojí u řeky a prodává trávu. Podle zadání je zároveň Štamgast v eRku.
- **Rozhodnutí:** Přes den stojí u řeky, večer sedí v eRku. V Aktu 1 je v hospodě.

## ADR-011: Raškovice odemyká příběh
- **Stav:** přijato
- **Kontext:** Výjezd do Raškovic se dosud otevřel po splnění cíle oblasti (skóre 1 500 a 2 500 Kč), hlavně ze zakázek.
- **Rozhodnutí:** Výjezd zůstane zavřený, dokud ho neotevře některý akt. Skóre a peníze se sbírají dál (obchody, garáž, chata).

## ADR-012: Hrdina nebo hrdinka
- **Stav:** přijato
- **Rozhodnutí:** Na začátku nové hry si hráč vybere hrdinu, nebo hrdinku (později to bude v příběhu důležité) a napíše jméno. Texty, které hráče oslovují, mají mužský i ženský tvar.
- **Důvod příjezdu:** Na Instagramu vyskočila akce: v eRku na Morávce je super festival.

## ADR-013: Neprůstřelná vesta
- **Stav:** přijato
- **Rozhodnutí:** Výbava „Vesta“ se přejmenuje na „Neprůstřelná vesta“ (v HUDu „Nepr. vesta“), ať se neplete se Štamgastem Vestou.

## ADR-014: Vysoký Denny je garáž
- **Stav:** přijato
- **Rozhodnutí:** Autoúpravy Dan patří Vysokému Dennymu (Dan = Denny). Garáž se ovládá rozhovorem s ním (oprava, přelakování, výkup), Denny stojí před garáží. Mezi 13:00 a 17:00 sedí v eRku a garáž je zavřená.

## ADR-015: Denny sochař se dá vyhodit
- **Stav:** hotovo (fáze P3): občas se po odchodu z eRka přidá sám jako parťák, každých 40 s si „půjčí“ stovku; po třech ranách pěstí odejde.
- **Rozhodnutí:** Když Dennyho sochaře nechceš, musí dostat pár ran pěstí, pak odejde pryč.

## ADR-016: Dřevaři jsou Hasiči
- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Skupina Dřevaři se mění na Hasiče (SDH Morávka). Sídlí u hasičské zbrojnice u návsi, nosí zásahové obleky s reflexními pruhy a červené přilby, bijí sekerou. Kecají o hasičském bálu, požárním útoku a pivu ve zbrojnici. Stará pila je volná (ateliér Dennyho sochaře). V Raškovicích jsou to Raškovští hasiči (generovaná mapa má místo pily zbrojnici).
- **Vztahy:** Hasiči a Štamgasti jsou přátelé (pijou spolu v eRku), oba nesnáší Omladinu (petardy v popelnicích).
- **Uložení:** respekt u Dřevařů přejde na Hasiče.

## ADR-017: Biomatky zmizely
- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Skupina Biomatky (v Raškovicích Chalupáři) je ze hry úplně pryč: členové, chování (ničení aut), hlášky, kola u obchodu už nikomu nepatří. Zůstávají tři skupiny: Hasiči, Štamgasti, Omladina. Respekt u Biomatek se ze starých uložení zahodí.

## ADR-018: Omladina je plnoletá
- **Stav:** přijato (fáze P2)
- **Kontext:** Omladina vznikla ze skupiny „Škola“ a hráč jí v misi Omyxe prodává beskydský čaj.
- **Rozhodnutí:** Omladina jsou mladí po maturitě (všichni mají občanku, Omyx to sám zmiňuje). Drží se u hřiště za školou, ale texty o nich nikdy nemluví jako o dětech ani žácích. Prodej dětem ve hře není a nebude.

## ADR-019: Beskydský čaj a handlování
- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Čaj je věc ve výbavě (klávesa 6 nebo Q, počet jako náboje). „Útok“ s ním na člena Omladiny otevře handlování v dialogu: kupec nejdřív nechce, pak možná, pak se smlouvá. Hráč nabízí argumenty (původ, vzácnost, účinek, diskrétnost, status); každý z pěti typů kupců má jeden, který na něj platí, a jeden, který ho naštve. Kupec tlačí cenu dolů svými kecy a má omezenou trpělivost. Do mise se počítá jen prodej aspoň za 200 Kč (plná cena). Dohodu zakončí předávka: kamera se přiblíží, sáček letí ke kupci, bankovka zpátky.
- **Logika:** `src/story/bargain.ts` (čistá, testovaná), dialog a předávka v `src/scenes/jobs/TeaJob.ts`.

## ADR-020: Mise od štamgastů
- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Po vstupu do eRka dávají misi štamgasti v rozhovoru (Omyx, Zjebal, Vysoký Denny, Denny sochař). Hráč má najednou jen jednu; běžící jde u zadavatele vzdát. Nabídka má vždy tři volby a jedna z nich vede na běžný rozhovor („Radši pokecáme“). Odměny: peníze, vztah s postavou, respekt skupiny. Lešení (Denny sochař) jde až po odvozu Zjebala. Po všech čtyřech misích Akt 1 pokračuje a čeká na další obsah.
- **Uložení:** splněné mise jsou příznaky `job:<id>`. Rozdělaný prodej čaje po načtení pokračuje (čaj je v kapse), ostatní rozdělané mise se zruší a dají se vzít znovu.

## ADR-021: Zjebal domů a Ajina
- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Zjebal čeká před eRkem, hráč pro něj přijede autem (ne kolo ani skútr) a veze ho k Ajině na jihovýchod k řece. Limit = délka nejlepší trasy po silnici / (62 % nejvyšší rychlosti auta) + 10 %, nejméně 12 s. U domu vyletí Ajina (nová postava, růžový župan, natáčky) a ptá se, kde byl a kolik toho měl: pravda (stovka na benzín), lež (bačkora), mlčení (minutu tě honí s baseballkou po vesnici, bije i auto). Ajina je nezničitelná.

## ADR-022: Auto pro Dennyho
- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Jakékoli nepolicejní auto, aspoň 90 % zdraví, žádná hvězda. Před garáží hráč vystoupí, auto samo vjede dovnitř (co je za vraty, se ořízne) a vrata spadnou. Denny platí 600 Kč. Mezi 13 a 17 h je garáž zavřená.

## ADR-023: Traktor s vlečkou
- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Traktor před eRkem (kus vlevo od dveří, nikomu nepatří) má vlečku. Vlečka nemá vlastní fyziku: drží se za hákem a natáčí se k němu, s ničím nekoliduje. Lešení se nakládá u kostela a vykládá na staré pile; kusy lešení létají mezi hromadou a vlečkou. Traktor od Zjebala se nehlásí jako krádež.

## ADR-024: Ovládání na mobilu
- **Stav:** přijato
- **Rozhodnutí:** Na dotykovém zařízení (hlavní ukazatel je prst, nebo `?touch=1` v adrese) se přes hru ukážou ovladače (`TouchScene`): vlevo plovoucí joystick (vznikne, kde se dotkneš), vpravo ÚTOK, E (akce), SPRINT (v autě BRZDA = ruční brzda), ZBRAŇ a pauza II. Klávesnice a myš fungují dál; notebook s dotykovou obrazovkou a myší zůstává u myši.
- **Auto:** joystick nahoru plyn, dolů brzda a couvání, do stran zatáčení (plynule).
- **Míření:** ÚTOK míří sám na nejbližšího, kdo jde po hráči (policajt, rváč, naštvaná skupina); zblízka pěstí na toho, kdo je před tebou; jinak rovně. Čaj se nabídne nejbližšímu.
- **Menu a rozhovory:** ťuknutí na položku nebo celý řádek volby; v obchodě tlačítka 1–5; v úvodu PŘESKOČIT; jméno hrdiny přes klávesnici telefonu.
- **Obrazovka:** na výšku se ukáže „Otoč telefon na šířku“; po prvním ťuknutí hra zkusí celou obrazovku (iPhone to neumí, hra jede i tak). Tutoriál s klávesami a nápověda kláves se na mobilu neukazují; ovládání je popsané v menu Ovládání.

## ADR-025: Štamgasti jako parťáci
- **Stav:** přijato (fáze P3)
- **Rozhodnutí:** V eRku jde štamgastovi říct „Pojď se mnou ven“ (Prchard zůstává za barem). Parťák je jeden, chodí za hráčem, sedá do auta; venku ho E pošle zpátky. Výhoda i nevýhoda platí, dokud je u hráče (do 150 px nebo v autě):
  - Metějka: hlášení o zločinech se ztratí (fízl radši odjede) · každých 50 s pivo za 45 Kč, jinak odejde.
  - Plotková: každých 25 s řekne směr k cíli mise · každou minutu panák za 60 Kč, jinak odejde.
  - Kibi: pere se s každým, kdo jde po hráči · občas přijde jeho naštvaná bejvalka a facku dostane hráč.
  - Vesta: lékárnička, když je hráči zle (jednou za 90 s), zaplatí pokutu při zatčení · urážky, skupiny ztrácí respekt.
  - Omyx: při handlování šeptá slabinu kupce · hráč pořád mluví o hulení.
  - Zjebal: traktor a dodávka se nehlásí jako krádež · ve 22:00 jde domů.
  - Vysoký Denny: za jízdy opravuje auto · úkol mise ukazuje jen „Hm.“
  - Denny sochař: jde se ho zbavit pěstí · půjčuje si stovky.
- **Uložení:** parťák se neukládá (po načtení je v eRku).

## ADR-026: Mise Metějky, Vesty, Kibiho a Plotkové
- **Stav:** přijato (fáze P3, podle zadání)
- **Metějka – Kulečník:** v eRku proti Hasiči Pepovi, tři kola, Metějka potřebuje dvě. Hráč tajně pomáhá: rada (55 %, bezpečná), strčit Pepovi do tága (70 %, 20 % chycen), posunout kouli (90 %, 35 % chycen; chycení = kolo pro Pepu, Hasiči mají hráče míň rádi). Výhra 250 Kč. Prohra: Metějka rozbije tágo o hráče (−15 zdraví) a svede to na Plotkovou, že neumí točit pivo. Jde zkusit znovu.
- **Vesta – Jeřáb:** autojeřáb (nové vozidlo, pomalé a těžké) stojí na stavbě u hráze v Raškovicích. Mise otevře výjezd do Raškovic (ADR-011), přežije přejezd mezi oblastmi. Dovézt k Vestovu domu bez hvězd; Vesta celou cestu volá, jak to hráč dělá špatně. 700 Kč.
- **Vesta má červenou mikinu** místo saka (postavička i dialog).
- **Kibi – Schovej mě:** Zuzka, Monika a Jarka jdou z různých stran k eRku. Odvést je dřív, než dojdou ke dveřím: lež (60 %, když nevyjde, už nevěří a zrychlí), panák za 60 Kč (jistota), nebo je odvézt autem dál než 420 px od eRka. 300 Kč.
- **Plotková – Flašky pro Omladinu:** šest flašek na čtyři místa (hřiště, školka, náves, Omyx) za 110 s. Plotková jede s hráčem a každých 18 s jednu vypije (−1 flaška, −8 s). Když flašek zbude míň než zastávek, konec. 400 Kč.
