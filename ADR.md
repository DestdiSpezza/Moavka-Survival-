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
- **Stav:** otevřeno, probereme ve fázi P2
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
- **Stav:** přijato (mechanika ve fázi P2)
- **Rozhodnutí:** Když Dennyho sochaře nechceš, musí dostat pár ran pěstí, pak odejde pryč.
