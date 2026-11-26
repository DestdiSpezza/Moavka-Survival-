# Pravidla spritů

## Měřítko a orientace
- **Dlaždice:** 16 px. **Obrazovka:** 960×540, svět zvětšený 2× (`WORLD_ZOOM`).
- Vše kreslené **shora, čelem doprava** (úhel 0); rotace řeší Phaser.
- Statické věci na celé pixely.

## Postavy
- **Snímek 24×16 px**, 3 snímky vedle sebe (stoj, krok levou, krok pravou); střed ramen v bodě (8, 8), origin `8/24, 0.5`.
- **Skládají se z `HumanLook`:** `jacket`, `pants`, `hair` (`short`, `long`, `bald`, `mohawk`, `cap`, `helmet`, `beanie`, `gray`, `ponytail`, `punkf`), `hairColor`, `skin`, `tool` (`none`, `bat`, `pistol`, `long`, `axe`, `bottle`, `sling`, `knife`), `pattern` (`plaid`, `stripes`, `patches`, `belly`, `reflex`).
- **Nová postava:** přidej `NPC_LOOKS['<id>']` (vznikne `npc-<id>`). Varianta s nástrojem jako samostatný klíč (`ajina-bat`).
- **Hráč:** `player` / `player-f`, s nástroji `-bat`, `-pistol`, `-long`.
- Pod postavou elipsa stínu (průhlednost 0,28).

## Vozidla
- Délka × šířka v px podle `VEHICLE_TYPES` (osobák 24×12, dodávka 28×13, traktor 22×14, jeřáb 34×15, skútr 14×7, kolo 14×6).
- Klíče `<druh>-0` (osobák `osobak-<varianta>`), `<druh>-wreck` (ohořelý vrak), `shadow-<druh>`.
- Kola tmavá `#151515` po stranách, kabina/okna `#3a4a5a`, výrazný detail pro poznání (rameno jeřábu, maják policie).
- Nový druh: `VehicleKind`, `VEHICLE_TYPES`, svědci (`KIND_NOUN`, `DEFAULT_COLOR`), výkup (`SELL_BASE`), textury a stín.

## Rekvizity a předměty
- **Malé věci** (sáček čaje 8×9, bankovka 10×6, kusy lešení) kresli tak, aby byly vidět i při letu (zvětšují se tweenem na 2–3×).
- **Větší** (vlečka 28×16, hromada lešení 20×14, vrata garáže 32×8) v `props.ts`.
- **Ikony k sebrání** v `tileset.ts`.

## Budovy, terén, decor
- Budovy jsou dlaždice střech (`RoofRed/Gray/Brown`) + malba v `art/ground.ts` (zdi, okna, komíny, noční světla).
- Decor na mapě (`Decor` v `world/moravka.ts`: `oval`, `court`, `playground`, `parking`) se maluje v `art/roads.ts` → `paintDecor`. Parkoviště: asfalt, bílé čáry stání po 16 px.
- Interiér eRka se maluje celý v `PubScene` (`paintInterior`): prkna, bar, kulečník, stoly.

## Obrázky ze souborů
- Jen logo (`public/img/logo.png`, 512 px) a titulní malba (`public/img/keyart.jpg`, 1376×768). Načítá je `BootScene.preload`.
