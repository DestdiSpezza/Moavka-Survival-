# Herní mechaniky

Co ve hře funguje a kde to hledat. Původní technické fáze 0–9 jsou popsané v
[PLAN-ZAKLAD.md](../vyvoj/PLAN-ZAKLAD.md).

## Ovládání

| | Klávesnice a myš | Mobil (ADR-024) |
|---|---|---|
| Chůze | WASD / šipky, SHIFT sprint | joystick vlevo (analogově: směr i rychlost), SPRINT |
| Míření a útok | myš, levé tlačítko | ÚTOK (míří sám na nepřítele) |
| Zbraně | 1–5, 6 čaj, Q / kolečko | ZBRAŇ |
| Auto | E nastoupit/vystoupit, W/S, A/D, MEZERNÍK ruční brzda, R rádio | E, vlevo volant ◀ ▶, vpravo PLYN, BRZDA (i couvání), RUČKA |
| Rozhovor | E u postavy, 1–3 nebo myš | E, ťuknout na řádek volby |
| Pauza | Esc | II |

## Hráč

- **Hrdina, nebo hrdinka** (ADR-012): jiná postavička, texty v mužském nebo ženském tvaru, vlastní jméno.
- **Zdraví a neprůstřelná vesta**, dech na sprint. Smrt znamená zdravotní středisko, zatčení služebnu a pokutu.
- **Výbava:** pěsti, pálka, pistole, brokovnice, samopal a beskydský čaj (věc v ruce, ADR-019).

## Vozidla a provoz

- **Druhy:** osobák, dodávka, teréňák, traktor (s vlečkou u eRka), policie, zásahovka, skútr, kolo a jeřáb (mise Vesty).
- **Poškození:** kouř, oheň, výbuch. Krádež je zločin, pokud to někdo vidí.
- **Provoz:** řidiči s povahou (normální, spěchá, mobil, opilý). Zpomalí u chodců a křižujících aut a hádají se po nehodách (ADR-027).

## Chodci a vesnice

- Chodci chodí po chodnících a silnici přejdou jen nakrátko (ADR-027). Utíkají před střelbou a nehodami.
- **Živá vesnice:** divočáci, opilci, hádky a rvačky řidičů. Obecní rozhlas a rádio hlásí, co se stalo.
- **Den a noc:** večer jsou Štamgasti agresivnější.

## Skupiny a respekt

Hasiči (zbrojnice), Štamgasti (eRko), Omladina (hřiště za školou, plnoletí). Respekt od −100 do 100
určuje postoj skupiny: od spojence až po „honí tě všude“. Hasiči se Štamgasty jsou kamarádi,
oba nesnáší Omladinu (ADR-016, ADR-017).

## Policie

Pět hvězd hledanosti. Svědci volají policii a popisují pachatele i auto. Přibývají hlídky,
zátarasy a zásahovka. Policie řeší i zločiny ostatních postav (nehoda, opilec, rvačka).

## Štamgasti

- **V eRku:** rozhovory se třemi volbami, vztahy, mise (viz [MISE.md](MISE.md)).
- **Parťák** (ADR-025): jednoho si vezmeš ven, každý má výhodu i nevýhodu.
- **Těžší start** (ADR-006): po „s nikým se bavit nechci“ chtějí štamgasti nejdřív pivo a svědci jsou podezíravější.

## Obchod a služby

- **Vesta:** pod pultem prodává zbraně, vestu a lékárničky.
- **Vysoký Denny:** garáž jako rozhovor (oprava, lak, výkup), 13–17 sedí v eRku.
- **Omyx:** tráva u řeky.
- **Chata:** koupě, spánek a uložení hry.

## Oblasti

Morávka podle skutečné vesnice ([MAPA.md](MAPA.md)). Raškovice (generované údolí) otevře příběh
(mise Vesty, ADR-011). Krásná a Lysá hora zatím nejsou.
