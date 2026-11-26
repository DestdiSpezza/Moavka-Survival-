# Paleta

Barvy jsou v kódu (`PAL` v `src/art/painter.ts`, `CAR_PAINT` a `SKIN` v `src/art/sprites.ts`).
Tady jsou hlavní hodnoty, ať nové věci ladí.

## Terén (`PAL`)
| Co | Barvy |
|---|---|
| Tráva | `#4c7a34 #56863a #436d2e #5f9142 #3b6129`, tmavá `#355a26` |
| Květiny | `#e8d24a #f2f0e8 #d86a8a #9a8ad8` |
| Hlína | `#8a6a44 #7d5f3c #967650 #6f5435 #a3845c` |
| Les | `#2f4f26 #284520 #36592b #4a3a22 #223d1c` |
| Asfalt | `#4a4a4f #45454a #515157 #3f3f44 #57575d` |
| Chodník | `#9a968e #8f8b83 #a5a198`, spára `#75716a`, obrubník `#c2beb4` |
| Voda | `#2a5f93 #2f6aa1 #24557f`, pěna `#b8d8ec` |
| Prkna | `#7a5a3a #6d4f32 #86643f` |
| Čáry na silnici | bílá `#e8e6da`, žlutá `#d8b838` |

## Auta (`CAR_PAINT`)
`#b8352a` červená, `#2f5fa8` modrá, `#d8d4c8` bílá, `#8fae3a` zelená, `#7a4a2a` hnědá,
`#2a2a2e` černá, `#d8a020` žlutá, `#5a7a8a` šedomodrá. Jeřáb `#d8b020`, traktor `#2f7d3a`.
Barva laku má i jméno pro svědky (`systems/witness.ts`, `ColorId`).

## Kůže (`SKIN`)
`#e8c39a #d8a878 #f0d0b0 #c89068`

## Identita postav a skupin
| Kdo | Poznávací znak |
|---|---|
| Hráč | černá bunda s nášivkami `#1c1c1f`, zelené čiro `#3fbf4a` |
| Hasiči | zásahový oblek `#2a3552`, reflexní pruhy `#e8e040`, červená přilba `#c8302a` |
| Štamgasti | světlé triko `#e8e0c0`, šedé vlasy, láhev, břicho |
| Omladina | fialová `#9a4ad0`, kšiltovka, pruhy na teplákovce |
| Vesta | **červená mikina** `#c8302a` |
| Ajina | růžový župan `#e07aa8`, natáčky |
| Kobyla | fialová `#8a6a9a`, ohon `#7a4a22` |

## UI
Nadpisy a cíle `#ffd23f` (žlutá), text `#f2e9d0` (krémová), varování `#d94040`, policie `#6a9aff`,
peníze plus `#9fffa0`, minus `#ff9a6a`. Panely `#0a0a10` s průhledností 0,5–0,75. Písmo Jersey 10, černý obrys 3–8 px.

## Stínování
- Světlo zleva shora: světlejší hrana vlevo nahoře (`shade(c, 1.2)`), tmavší vpravo dole (`shade(c, 0.75)`).
- Stín objektu černý, průhlednost 0,28–0,35, posun +2 px vpravo, +3 px dolů.
- Šum (`noise`) 0,3–0,6 hustoty z 3–5 odstínů, aby plochy nebyly ploché.
