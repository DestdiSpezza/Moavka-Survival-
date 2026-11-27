# Stav projektu (paměť)

> Tenhle soubor je „paměť“ projektu: kde jsme skončili, co je rozdělané, co čeká na autora.
> Aktualizuj ho na konci každé větší práce (spolu s [CHANGELOG.md](../CHANGELOG.md) a [TODO.md](../TODO.md)).

**Poslední aktualizace:** 2026-11-27

## Kde jsme

- Hra je nasazená na https://destdispezza.github.io/Moavka-Survival-/ z větve `main`.
- **Akt 1** je hratelný celý: úvod (logo, prolog, hrdina, autobus), hospoda eRko, osm misí od štamgastů, parťáci, těžší start.
- Po všech osmi misích se ukáže „Akt 1 pokračuje…“: **konec Aktu 1 a přechod do Aktu 2 čeká na zadání příběhu.**
- Hra jde hrát na počítači i na mobilu (na šířku).

## Fáze

| Fáze | Obsah | Stav |
|---|---|---|
| 0–9 | Základ mechanik | hotovo |
| P1 | Akt 1: Příjezd | hotovo |
| P2 | Mise v eRku, Hasiči, bez Biomatek | hotovo |
| P3 | Štamgasti v praxi: parťáci, těžší start, další čtyři mise | hotovo |
| P4 | Konec Aktu 1, přechod do Aktu 2 | **čeká na příběh od autora** |
| P5+ | Další akty (Raškovice, Krásná, Lysá hora) | čeká |

Podrobný plán příběhu: [hra/PRIBEH.md](hra/PRIBEH.md).

## Otevřené otázky pro autora

- Jak skončí Akt 1 a o čem bude Akt 2?
- Příjezdová cesta k parkovišti u eRka (zatím se vyjíždí přes trávu)?
- Tutoriál pro ovládání prstem (teď se na mobilu tutoriál schovává)?

## Jak pracujeme

- Autor zadá fázi nebo úkol → návrh a otázky (když něco chybí) → práce na větvi `claude/<tema>` → testy, playtest → shrnutí a otázka „poslat do main?“ → na souhlas fast-forward `main`, kontrola nasazení.
- Pravidla pro AI sezení: [CLAUDE.md](../CLAUDE.md).

## Kde co je

- Dokumentace: [README.md](README.md) (rozcestník).
- Rozhodnutí: [adr/](adr/README.md).
- Odložené věci: [TODO.md](../TODO.md).
