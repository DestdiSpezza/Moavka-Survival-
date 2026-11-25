# Survive Morávka

2D hra s pohledem shora z obce Morávka v Beskydech. Volný pohyb, krádeže aut, soupeřící skupiny (Dřevaři, Štamgasti, Ekologové, Škola), respekt, policejní hledanost a pořádný chaos. Postupuješ, když vyděláš dost peněz a získáš cílové skóre v oblasti.

Černý humor, nadsázka, trochu punk. Pixel-art. Česky.

Plán vývoje po fázích: [docs/PLAN.md](docs/PLAN.md)

## Spuštění

Potřebuješ Node.js 22+.

```bash
npm install
npm run dev      # vývojový server, hra na http://localhost:5173
npm test         # testy herní logiky
npm run build    # produkční build do dist/
```

## Struktura

- `src/scenes/` – herní scény (načítání, menu, hra)
- `src/systems/` – herní logika bez vykreslování (respekt, hledanost, skóre…), testovaná Vitestem
- `src/entities/` – hráč, vozidla, NPC
- `src/texts/cs.ts` – všechny texty hry
- `assets/` – grafika, mapy, zvuky
