# Mise

Přehled všech misí ve hře. Podrobnosti a důvody jsou v ADR (odkazy), postavy v [POSTAVY.md](POSTAVY.md),
příběh a fáze v [PRIBEH.md](PRIBEH.md).

## Akt 1: Příjezd – hlavní linka

| Mise | Co se děje | Kód |
|---|---|---|
| Příjezd | Autobus od Raškovic zastaví před eRkem, hráč vystoupí, Slečna Kobyla ho pošle do hospody. Jde přeskočit. | `scenes/Intro.ts` |
| Do hospody | Ukazatel ke dveřím eRka; uvnitř Prchard a tři volby (s nikým / k baru za Plotkovou / ke štamgastům). | `scenes/Story.ts`, `story/dialogs.ts` |

Po „Do hospody“ běží volná hra a mise od štamgastů. Hráč má najednou jen jednu; nabídku dá
štamgast v rozhovoru, rozdělanou misi jde u něj vzdát (ADR-020).

## Mise od štamgastů

| Mise | Kdo dává | Úkol | Odměna | ADR |
|---|---|---|---|---|
| Beskydský čaj | Omyx | 3 g se slevou za 450 Kč, prodat Omladině aspoň za 200 Kč/g; handlování v rozhovoru, viditelná předávka. | zisk z prodeje, vztah | 019 |
| Zjebal domů | Zjebal | Odvézt ho autem k Ajině v limitu (trasa + 10 %); výslech: pravda / lež / mlčení (honička s pálkou). | 100 / 50 Kč nebo bačkora | 021 |
| Auto pro Dennyho | Vysoký Denny | Ukrást nepolicejní auto, dovézt nenabourané (90 %) a bez hvězd; auto samo vjede do garáže. | 600 Kč | 022 |
| Lešení | Denny sochař (až po Zjebalovi) | Traktor s vlečkou: kostel (naložit) → stará pila (vyložit). | 250 Kč | 023 |
| Kulečník | Metějka | Tři kola proti Hasiči Pepovi, tajně pomáhat; při prohře tágo o hráče a vina na Plotkovou. | 250 Kč | 026 |
| Jeřáb pro Vestu | Vesta | Ukrást autojeřáb v Raškovicích, dovézt k Vestovu domu bez hvězd; Vesta volá, co děláš špatně. Otevře Raškovice. | 700 Kč | 026 |
| Schovej Kibiho | Kibi | Tři ženské jdou k eRku; odvést je lží, panákem nebo autem. | 300 Kč | 026 |
| Flašky pro Omladinu | Plotková | 6 flašek na 4 místa za 110 s; Plotková cestou pije a krátí čas. | 400 Kč | 026 |

Po všech osmi: „Akt 1 pokračuje…“ (konec aktu čeká na zadání).

## Jak přidat misi

1. Do `src/story/jobs.ts` přidat `JobId` a záznam v `JOBS` (kdo dává, název, podmínky, odměna).
2. Nabídku a „jak to jde“ do `src/scenes/jobs/offers.ts` (vždy tři volby, viz skill `moravka-dialogy`).
3. Běh mise jako třídu odvozenou z `Job` v `src/scenes/jobs/` a přidat ji do `createJob` v `index.ts`.
4. Testy (`jobs.test.ts`, `story.test.ts` validuje nabídky) a playtest.
5. ADR, tenhle soubor, [POSTAVY.md](POSTAVY.md), [STAV.md](../STAV.md), [CHANGELOG.md](../../CHANGELOG.md).
