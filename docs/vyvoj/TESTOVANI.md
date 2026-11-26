# Testování

Tři vrstvy: jednotkové testy logiky, playtesty v prohlížeči a dlouhý běh bez hráče (soak).
Před každým commitem musí projít `npm test` a `npm run build` (CI to kontroluje znovu).

## Jednotkové testy (Vitest)

```bash
npm test
```

Testy leží vedle kódu (`*.test.ts`). Hlídají hlavně:
- **logika:** pohyb, jízdní model, poškození, boj, hledanost, respekt, svědci, provoz,
- **příběh:** každý dialog má v každém uzlu tři volby, aspoň jedna jde vybrat vždycky a všechny odkazy vedou na existující uzly,
- **texty:** všechny mají po doplnění mužského i ženského tvaru čisto (žádné `{`, `|`),
- **handlování:** chytrý hráč prodá za plnou cenu častěji než náhodný,
- **mise:** pořadí, podmínky, časový limit,
- **mapa:** budovy jsou dostupné, skupiny mají kde stát, auta neparkují na silnici,
- **uložení:** převod starých verzí.

## Playtesty v prohlížeči

Playwright s Chromiem (v cloudovém prostředí je předinstalovaný). Skripty si samy spustí
`vite preview`, hrají přes klávesy, myš nebo dotyk a ukládají snímky do `playtest-out/` (není v gitu).

```bash
npm run build
node scripts/playtest/akt1-uvod.cjs     # nová hra, autobus, Kobyla, eRko, štamgasti, garáž
node scripts/playtest/mise-p2.cjs       # Omyx (čaj), Zjebal (autopilot + Ajina), Denny, lešení
node scripts/playtest/mise-p3.cjs       # kulečník, Kibi, flašky, jeřáb přes Raškovice
node scripts/playtest/partaci.cjs       # parťáci, Denny sochař a pěsti, těžší start
node scripts/playtest/mobil.cjs         # telefon na šířku: joystick, tlačítka, ťukání
node scripts/playtest/logo-prolog.cjs   # logo, titulní obrazovka, prolog
```

Skripty začínají většinou z připravené uložené hry v `localStorage` (bez úvodu), aby se
dostaly rovnou k tomu, co testují. `window.__game` (Phaser) a `window.__touch` (dotyk) jsou
schválně dostupné z konzole.

## Soak: vesnice bez hráče

```bash
npm run build
npm run soak -- 6              # 6 herních minut (každá 60 s simulace)
SOAK_DETAIL=1 npm run soak -- 6  # vypíše i jednotlivé nehody a sražené chodce
```

Hráč stojí v lese a vesnice žije sama. Na konci se vypíše, kolik čeho se stalo (bouračky,
hádky, sražení chodci, policie) a kolik řetězců událostí propojilo aspoň tři systémy.
Měřítko z ADR-027: zhruba 5 bouraček a 1–2 sražení chodci za 6 herních minut.

## Ruční kontrola

- Na počítači: `npm run dev`, hra na http://localhost:5173.
- Na mobilu: nasazená verze na GitHub Pages, nebo `?touch=1` v adrese na počítači (dotykové ovladače).
