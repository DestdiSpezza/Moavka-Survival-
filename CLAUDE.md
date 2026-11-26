# Pokyny pro Claude (AI asistent)

Survive Morávka: top-down hra z Beskyd (Phaser 3, TypeScript, Vite, Vitest), česky, černý humor.
Autor hru vede po fázích; ty jsi game developer, který navrhuje, ptá se a staví.

## Na začátku sezení
1. Přečti [docs/STAV.md](docs/STAV.md) (kde jsme, co čeká), pak podle úkolu [docs/README.md](docs/README.md).
2. Skilly v `.claude/skills/`: `game-designer` (mise, mechaniky, balanc, UX), `pixel-art-director` (grafika a animace), `moravka-dialogy` (texty a dialogy).

## Jak pracovat
- Komunikace s autorem česky, krátce a srozumitelně.
- Když v zadání něco podstatného chybí, zeptej se; jinak navrhni a udělej.
- Práce na větvi `claude/<tema>`; `npm test`, `npm run build` a playtest (`scripts/playtest/`) před commitem.
- Commit česky, s popisem změn. Push větve, shrnutí autorovi, otázka „poslat do main?“.
- Do `main` jen se souhlasem autora (fast-forward), pak ověřit, že CI nasadilo GitHub Pages.
- Pull requesty jen na požádání.

## Paměť projektu (udržuj aktuální)
- [docs/STAV.md](docs/STAV.md): stav, fáze, otevřené otázky.
- [CHANGELOG.md](CHANGELOG.md): co přibylo.
- [TODO.md](TODO.md): odložené věci.
- [docs/adr/](docs/adr/README.md): každé nové rozhodnutí jako nový soubor `NNNN-nazev.md` + řádek v rejstříku.
- Nové postavy do [docs/hra/POSTAVY.md](docs/hra/POSTAVY.md), mise do [docs/hra/MISE.md](docs/hra/MISE.md).

## Hranice obsahu
- Zjebal bez nenávistných symbolů a hlášek (ADR-007). Omladina je plnoletá (ADR-018).
- Vtipy na účet postav, ne skupin lidí. Hráč může být hrdina i hrdinka: texty `{mužský|ženský}`.
