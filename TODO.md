# TODO: odložené věci

Co se nevešlo do fáze 9 (Živá vesnice) z dokumentu Game Update 1, ze starších plánů a co čeká příběhovku.
U každé položky je důvod, proč teď ne, a co ji podmiňuje.

## Příběh (plán v docs/PRIBEH.md, rozhodnutí v ADR.md, postavy v NPC.md)

- [x] **Fáze P1: Akt 1 – Příjezd** (zrušení zakázek, autobus a úvodní scéna, NPC na zastávce, mise do hospody, interiér eRka, dialogy se 3 volbami, Plotková a Štamgasti).
- [x] **Fáze P2: Akt 1 – Mise v eRku** (Hasiči místo Dřevařů, bez Biomatek, mise Omyxe, Zjebala, Vysokého Dennyho a Dennyho sochaře).
- [x] Fáze P3: výhody a nevýhody Štamgastů jako mechaniky (parťáci, ADR-025) (Metějka odpuzuje policii, Vysoký Denny opravuje a přelakuje, Omyx a touha hulit, Zjebal řídí náklaďák a musí domů, Denny sochař si půjčuje, Prchard určuje cenu piva, Kibi a ženy, Vesta pomáhá s kecama, Plotková naviguje a chce panáky).
- [x] Fáze P3: následky volby „s nikým se bavit nechci“ (těžší start, ADR-006).
- [ ] Fáze P3: mise od Metějky, Vesty, Kibiho a Plotkové (zadání dodáš).
- [x] Fáze P3: Denny sochař musí dostat pár ran pěstí, než odejde (ADR-015).
- [ ] Omyx je v eRku jen večer (17–5); přes den u řeky zatím misi nenabízí.
- [ ] Vlečka s ničím nekoliduje (projede zdí); fyzika vlečky a padající náklad v ostrých zatáčkách.
- [ ] Hospoda v Raškovicích otevírá interiér eRka (do Raškovic se zatím nedá, ADR-011).
- [ ] Skloňování jména hrdiny v oslovení (5. pád). Teď se jméno v dialozích píše tak, jak ho hráč zadal (např. „Co to bude, Jarmila?“).
- [ ] Rozhovor s Kobylou a Dennym venku má zatím jen pár vět; rozšířit, až bude jasné, co po hráči chtějí.
- [ ] Nové vozidlo náklaďák (pro Zjebala) a autobus jako běžné vozidlo s jízdním řádem.
- [ ] Kulečník a šipky v eRku jako minihry (Metějka neumí kulečník).
- [ ] Rvačky v hospodě (zatím se uvnitř nebojuje, ADR-004).
- [ ] Interiéry dalších budov (Vesta, obecní úřad, Autoúpravy Dan).
- [ ] Další akty: obsah dodá zadání (fáze P3 a dál).

## Mapa (podmínka pro velkou část zbytku)

- [x] Morávka podle skutečné vesnice, se smyčkou (jih → hráz → silnice podél řeky → silnice na Raškovice). Autoúpravy (Dan) a fotbalové hřiště s oválem jsou.
- [ ] Silniční síť se smyčkami i v dalších oblastech (Raškovice jsou zatím generované údolí s jednou křižovatkou). Bez alternativních tras nejdou objížďky, uzavírky, IZS hledající cestu ani autobus objíždějící přes pole.
- [ ] Nová místa: benzínka, stodola, pastviny, pole s kukuřicí, kontejnery.
- [ ] Hladší okraj přehrady (jezero je zatím po dlaždicích, potoky a silnice už jsou hladké).
- [ ] Krajnice nebo výhybny, aby měla kam uhnout auta před sanitkou a hasiči.
- [ ] Objíždění: auto v provozu umí jen čekat, protáhnout se krokem, nebo odjet na konec trasy. Objížďka kolem nehody nebo hádky potřebuje silniční síť se smyčkami.
- [ ] Oblasti Krásná a Lysá hora.
- [ ] Ručně kreslený tileset v editoru místo grafiky kreslené kódem.

## Policie

- [ ] **Fyzické zatýkání s dveřmi** (doběhne, otevře dveře, vytáhne, povalí, pouta, reakční okno na plyn). Potřebuje rotující kolize a animace postav; současná fyzika umí jen neotočené kruhy, takže by to znamenalo přechod na Matter.js.
- [ ] Hřebíkové pásy, vytlačování ze silnice (PIT). S kruhovými kolizemi vypadá jako kulečník.
- [ ] Policejní pes a pěší pátrání ve větší oblasti.
- [ ] Konkrétní policisté s osobností (líný, nováček, zkušený velitel) a se vztahem k hráči. Ve fázi 9 je jen omezený počet policistů bez osobnosti.
- [ ] Hledaná osoba a hledané vozidlo jako dva oddělené pátrací záznamy (fáze 9 má jeden popis s autem a osobou).
- [ ] Výměna registrační značky, převlečení, schování auta ve stodole nebo garáži.
- [ ] Kamery a jiné systémy identifikující vozidlo.
- [ ] Dechové kontroly.

## Vozidla

- [ ] Dveře (otevřené, utržené, zachycené). Stejný problém jako fyzické zatýkání.
- [ ] Poškození po komponentách, nejvýš 4: pneumatiky, motor, světla, dveře nebo karoserie. Zavěšení, baterie a chladič shora nejsou vidět.
- [ ] Palivo, kanystry, startovací kabely, mechanik s otvírací dobou. Je to hodně nového rozhraní a v honičce to spíš frustruje.
- [ ] Náklad na korbách a vlečkách (balíky, sudy, dřevo), který vypadává. Potřebuje strop počtu objektů a jejich úklid.
- [ ] Nová vozidla s fiktivními názvy místo skutečných značek (Favorín, Áva, Multikára, kombajn, autobus, popelářské auto, sanitka, hasiči, pohřební vůz, silniční válec, cisterna s hnojem, Babeta, motorka).
- [ ] Kombajn sklízející pole (posekaná stopa jako stopa na zemi, až bude pole).
- [ ] Náhodný obsah kufrů.

## NPC a společnost

- [ ] Denní režim NPC (práce, nákupy, hospoda, domů).
- [ ] Odvaha a temperament jako trvalé vlastnosti každého NPC (fáze 9 má jen typy řidičů a ochotu svědků).
- [ ] Paměť NPC (pozná hráče, odmítne obchod, hospodský zdraží). Navíc chybí dialogové rozhraní.
- [ ] Šest nových reputací (policie, obyvatelé, zemědělci, hospoda, podsvětí, hasiči). Rozhodnuto: zatím zůstává respekt čtyř skupin.
- [ ] Alkohol u hráče (jak pije, efekty bez obráceného řízení, které frustruje).

## Události

- [ ] IZS: sanitka, hasiči, odtahovka, uzavírání silnic. Podmínka: silniční síť a uhýbání majákům.
- [ ] Autobus s jízdním řádem a cestujícími.
- [ ] Svatba, pohřeb, fotbal, pouť. Podmínka: předjíždění v umělé inteligenci provozu.
- [ ] Krávy na silnici, pes honící motorku (fáze 9 má divočáka).
- [ ] Hospodské rvačky po 22:00 se židlemi.
- [ ] Vzácné události. Při délce dne 12 minut je 0,1 % za den prakticky nikdy; je potřeba jiné škálování (např. šance za hodinu hraní).
- [ ] Výpadek proudu na části mapy (noční světla jsou jedna vrstva, rozdělit na čtvrti).
- [ ] Šíření požáru.
- [ ] Zemědělský provoz (orba, sklizeň, převoz sena a hnoje).

## Počasí

- [ ] Déšť (přilnavost, bláto), bouřka, mlha (omezí výhled policie, napojit na výhled), sníh a náledí.

## Dealeři a kontraband

- [x] Dealer Omyx u řeky prodává trávu (čitelný efekt bez falešných sirén). Veseta prodává „pod pultem“ (zbraně, vesta, lékárničky).
- [ ] Víc druhů zboží u Omyxe a jeho vztah s ostatními (Štamgasti mu nevěří, Hasiči „na výcvik“).
- [ ] Efekty trávy. Pozor: falešné sirény a zátarasy jdou proti pravidlu „chaos musí být čitelný“ a okamžité +1★ proti systému svědků.
- [ ] Těžké zbraně (bazuka, minigun) a granáty. Pozor na měřítko vesnice: policie na 1–3★ by neměla šanci.

## Ostatní

- [ ] Členové skupin za volantem.
- [ ] Gamepad a ovládání na mobilu.
- [ ] Ukládání stavu světa (vraky, paměti NPC, uzávěry). Určit, co přežije načtení hry.

## Mobil (ADR-024)

- [ ] Tutoriál pro dotykové ovládání (teď se na mobilu tutoriál s klávesami schová).
- [ ] Rádio (R) a nápověda „R = přepnout“ nemají na mobilu tlačítko.
- [ ] Hra je 16:9; na širokých telefonech jsou po stranách černé pruhy.
