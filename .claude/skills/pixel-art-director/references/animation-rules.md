# Pravidla animací

## Chůze
- `animateWalk` (`src/entities/walk.ts`): cyklus snímků [1, 0, 2, 0] podle ujeté vzdálenosti (krok každých 5 px), pod 6 px/s stoj (snímek 0). Nové postavy potřebují 3 snímky.

## Vozidla
- Bez snímkových animací; pohyb, natočení a stín řeší `Vehicle`. Policie střídá textury majáku (`-0` / `-1`).
- Poškození: kouř a oheň částicemi, vrak = textura `-wreck`.
- Vlečka se natáčí k háku traktoru (`entities/Trailer.ts`).

## Efekty a předávky
- **Tweeny Phaseru, krátké:** 250–750 ms, `Sine.inOut`, oblouk zvětšením (scale yoyo 2–3×).
- **Předávka čaje:** kamera `cinemaZoom = 1.6`, sáček letí 750 ms, bankovka zpátky 650 ms s rotací 360°, pak `+X Kč` (floatText).
- **Vjezd do garáže:** auto jede 1,8 s, přední část se ořezává (`setCrop`) za hranou vrat, vrata spadnou (`Bounce.out`).
- **Lešení:** 8 kusů po 0,35 s, let 420 ms s rotací, hromada se zmenšuje a vlečka mění texturu.
- **Ajina:** vyletí ze dveří tweenem 260 ms (`Quad.out`) a kamera se lehce otřese (180 ms).
- **Výbuch, krev, jiskry:** částice v `generateEffectSprites`.

## Scény a kamera
- **Filmové chvíle:** černé pruhy 56–58 px, HUD schovaný, titulky po písmenech (28 ms na znak).
- **Prolog:** záběry po 3,4 s, pan a zoom 1,4 s `Sine.easeInOut`.
- **Logo:** fade 1,2 s a „uvádí“ s 0,9 s zpožděním.
- **Za jízdy** se kamera oddálí podle rychlosti (`WORLD_ZOOM − 0,5 × rychlost/200`).

## Bubliny a texty
- Bubliny `Speech.say` 1,4–2,8 s, barva rámečku podle mluvčího (policie modrá, Ajina růžová, Omladina fialová).
- Plovoucí text (`floatText`) 0,9–1,6 s, nahoru a zmizí.
