---
name: pixel-art-director
description: Pixel-art hry Survive Morávka – jak kódem kreslit postavy, vozidla, rekvizity, budovy, terén a efekty (Painter, Phaser Graphics), jaké barvy, velikosti, stíny a animace používat, aby nové věci seděly ke stávající grafice. Použij vždy, když v tomhle repu přidáváš nebo měníš cokoli, co je vidět: nová postava nebo NPC, vozidlo, předmět, budova, interiér, decor na mapě, efekt, animace, UI prvek, obrázek do public/img – i když uživatel řekne jen „přidej jeřáb“, „ať má Vesta červenou mikinu“ nebo „udělej parkoviště“.
---

# Pixel-art director: Survive Morávka

Skoro všechna grafika ve hře se kreslí kódem při startu (`BootScene`): žádné spritesheety,
jen malíř pixel po pixelu. Díky tomu jde postavu přebarvit jedním řádkem, ale každá nová věc
musí dodržet stejné velikosti, světlo a paletu, jinak bude koukat ven.

## Než začneš kreslit

1. **Najdi nejbližší podobnou věc** a vyjdi z ní (postava → `NPC_LOOKS` v `src/art/sprites.ts`, vozidlo → `car()/tractor()` tamtéž, rekvizita → `src/art/props.ts`, terén a decor → `src/art/ground.ts` a `roads.ts`).
2. **Otevři reference:**
   - [references/palette.md](references/palette.md): barvy (terén, auta, kůže, UI) a pravidla stínování.
   - [references/sprite-rules.md](references/sprite-rules.md): velikosti, orientace, stíny, kde co registrovat.
   - [references/animation-rules.md](references/animation-rules.md): chůze, efekty, tweeny, scény.
3. Design věci (k čemu je, co má hráč poznat) řeší skill `game-designer`.

## Nástroje

- **`Painter`** (`src/art/painter.ts`): pixelový buffer s metodami `px`, `rect`, `frame`, `noise`, `dither`, `ellipse`, `blob`, `line`. Na texturu ho převedeš přes `add(scene, key, painter, frames?)` v `sprites.ts`.
- **Phaser Graphics** (`make(key, w, h, draw)` v `tileset.ts` / `props.ts`): rychlé rekvizity z obdélníků. `props.ts` nepřepisuje existující klíče.
- **Pořadí v `BootScene`:** tileset → hráč → auta → chodci → boj → rekvizity → pixel-art sprity (přepíšou starší verze se stejným klíčem) → efekty.

## Postup

1. Nakresli ve správné velikosti a orientaci (čelem **doprava**, světlo zleva shora).
2. Přidej stín (`shadow-<druh>` u aut, elipsa pod postavou).
3. Zaregistruj texturu a použij klíč (`npc-<id>`, `gang-<skupina>`, `<druh>-0` / `<druh>-wreck`, `shadow-<druh>`).
4. Na minimapě objekt schovej (`cameras.getCamera('minimap')?.ignore(obj)`), pokud to není značka.
5. Ověř snímkem v prohlížeči (playtest nebo `npm run dev`) na 2× zvětšení a zkontroluj čitelnost proti trávě i asfaltu.

## Zásady

- **Čitelnost před detailem:** v 16 px musí být poznat, kdo to je (barva bundy, účes, nástroj).
- **Žádné rozmazání:** hra má `pixelArt: true`. Celé pixely, žádné zlomky pozic u statických věcí.
- **Paleta:** nové barvy jen s důvodem (identita postavy); stíny a světla z odstínu (`shade()`).
- **Obrázky ze souborů** (logo, malba) do `public/img/`, zmenšené (logo 512 px, malba JPG ~85 %).
