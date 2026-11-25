# Survive Morávka

2D hra s pohledem shora z obce Morávka v Beskydech. Volný pohyb, krádeže aut, soupeřící skupiny (Dřevaři, Štamgasti, Ekologové, Škola), respekt, policejní hledanost a pořádný chaos. Postupuješ, když vyděláš dost peněz a získáš cílové skóre v oblasti.

Černý humor, nadsázka, trochu punk. Pixel-art. Česky.

Plán vývoje po fázích: [docs/PLAN.md](docs/PLAN.md)

Hraj v prohlížeči: https://destdispezza.github.io/Moavka-Survival-/

## Ovládání

| | |
|---|---|
| Pěšky | WASD / šipky, SHIFT sprint, myš míření, levé tlačítko útok |
| Zbraně | 1–5 výběr, Q nebo kolečko další |
| Auto | E nastoupit / ukrást / vystoupit, W/S plyn a brzda, A/D zatáčení, MEZERNÍK ruční brzda, R rádio, levé tlačítko střelba z okna |
| Zakázky | dojdi k „!“ skupiny, 1–3 výběr, X vzdát |
| Garáž, obchod, chata | dojdi (do garáže dojeď), 1–5 výběr |
| Hra | Esc pauza, H skryje tutoriál, F9 deník událostí (ladění) |

## Co ve hře je

- Dvě oblasti: Morávka a Raškovice. Do Raškovic tě pustí po splnění cíle Morávky (skóre a peníze).
- Čtyři skupiny v každé oblasti, respekt, zakázky se zelenou, žlutou a červenou obtížností a náhodnými komplikacemi.
- Policie s pěti úrovněmi hledanosti, zátarasy a zásahovkou. Hledanost roste, jen když tě někdo viděl: svědci volají policii a podle jejich popisu tě hledají.
- Živá vesnice: nehody v provozu, hádky a rvačky řidičů, opilci, divočáci na silnici, policie honí i NPC, obecní rozhlas hlásí, co se právě stalo.
- Auta, krádeže, poškození, provoz, zbraně, chodci, den a noc, rádio.
- Ukládání do prohlížeče (automaticky a v chatě).

## Spuštění

Potřebuješ Node.js 22+.

```bash
npm install
npm run dev      # vývojový server, hra na http://localhost:5173
npm test         # testy herní logiky
npm run build    # produkční build do dist/
npm run soak     # 30 minut hry bez hráče: kolik vznikne řetězců událostí (potřebuje Playwright, po buildu)
```

Odložené nápady a co jim chybí: [TODO.md](TODO.md)

## Struktura

- `src/scenes/` – herní scény (načítání, menu, hra)
- `src/systems/` – herní logika bez vykreslování (respekt, hledanost, skóre…), testovaná Vitestem
- `src/entities/` – hráč, vozidla, NPC
- `src/texts/cs.ts` – všechny texty hry
- `assets/` – grafika, mapy, zvuky
