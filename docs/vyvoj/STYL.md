# Styl: kód a texty

## Texty ve hře

- **Česky, černý humor, sarkasmus, beskydské reálie.** Krátce, pointa na konci.
- Postup a pravidla psaní dialogů jsou ve skillu [`.claude/skills/moravka-dialogy`](../../.claude/skills/moravka-dialogy/SKILL.md): tón, hlasy postav, tři volby, oba tvary hráče, vzor handlování.
- **Hráč je hrdina, nebo hrdinka:** všechno, co ho oslovuje, má tvar `{mužský|ženský}`.
- **Hranice:** Zjebal bez symbolů a nenávistných hlášek (ADR-007), Omladina je plnoletá (ADR-018). Vtip je na účet postavy, nikdy na účet skupiny lidí.

## Kód

- TypeScript, přísné typy (`tsc --noEmit` je součást buildu).
- Čistá logika bez Phaseru do `src/systems/` a `src/story/`, k ní testy.
- Komentáře česky: proč to tak je, ne co dělá řádek.
- Data (postavy, mise, texty) odděleně od scén.
- Nové rozhodnutí o hře nebo architektuře = nový soubor v [docs/adr/](../adr/README.md).

## Dokumentace

- Vše v Markdownu, česky.
- Po každé větší změně aktualizuj [docs/STAV.md](../STAV.md), [CHANGELOG.md](../../CHANGELOG.md) a [TODO.md](../../TODO.md).
