# Survive Morávka

2D hra s pohledem shora z obce Morávka v Beskydech. Příběh po aktech, volný pohyb, krádeže aut, soupeřící skupiny (Dřevaři, Štamgasti, Biomatky, Omladina), respekt, policejní hledanost a pořádný chaos. Hraješ za hrdinu, nebo hrdinku, kterou na Morávku vytáhl příspěvek o festivalu v eRku.

Černý humor, nadsázka, trochu punk. Pixel-art. Česky.

Plán vývoje po fázích: [docs/PLAN.md](docs/PLAN.md), příběh: [docs/PRIBEH.md](docs/PRIBEH.md), postavy: [NPC.md](NPC.md), rozhodnutí: [ADR.md](ADR.md)

Hraj v prohlížeči: https://destdispezza.github.io/Moavka-Survival-/

## Ovládání

| | |
|---|---|
| Pěšky | WASD / šipky, SHIFT sprint, myš míření, levé tlačítko útok |
| Zbraně | 1–5 výběr, Q nebo kolečko další |
| Auto | E nastoupit / ukrást / vystoupit, W/S plyn a brzda, A/D zatáčení, MEZERNÍK ruční brzda, R rádio, levé tlačítko střelba z okna |
| Rozhovor | E u postavy, 1–3 nebo myš volba (vždy tři možnosti) |
| Hospoda eRko | E u dveří vejít, uvnitř E u dveří ven |
| Garáž | přijeď autem k Vysokému Dennymu (mimo 13–17 h, to sedí v eRku) |
| Vesta, chata | dojdi, 1–5 výběr |
| Hra | Esc pauza, H skryje tutoriál, F9 deník událostí (ladění) |

## Co ve hře je

- Příběh po aktech. Akt 1 (Příjezd): autobus tě vysadí před eRkem, Slečna Kobyla tě pošle do hospody, uvnitř Prchard, servírka Plotková a osm štamgastů, se kterými jde mluvit.
- Dvě oblasti: Morávka a Raškovice. Do Raškovic tě pustí až příběh. Mapa Morávky vychází ze skutečné vesnice ([náhled](docs/mapa-moravka.jpg)).
- Čtyři skupiny v každé oblasti a respekt.
- Policie s pěti úrovněmi hledanosti, zátarasy a zásahovkou. Hledanost roste, jen když tě někdo viděl: svědci volají policii a podle jejich popisu tě hledají.
- Živá vesnice: nehody v provozu, hádky a rvačky řidičů, opilci, divočáci na silnici, policie honí i NPC, obecní rozhlas hlásí, co se právě stalo. Členové skupin spolu kecají v bublinách, chodci chodí po chodnících.
- Omyx prodává trávu (přes den u řeky, večer v eRku), Vesta zbraně a neprůstřelnou vestu pod pultem.
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
