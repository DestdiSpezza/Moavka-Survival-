# Architektura

Hra je Phaser 3 + TypeScript, sestavuje ji Vite, testy pouští Vitest. Všechna grafika
kromě loga a titulní malby se kreslí kódem (pixel-art „malíř“), zvuky generuje WebAudio.
Nic se nestahuje za běhu, jen písmo Jersey 10 z Google Fonts.

## Složky

| Složka | Co v ní je |
|---|---|
| `src/main.ts` | Založení hry Phaser, seznam scén, detekce mobilu. |
| `src/config.ts` | Velikost obrazovky (960×540), dlaždice (16 px), přiblížení. |
| `src/scenes/` | Scény a „manažery“ herního světa (viz níže). |
| `src/scenes/jobs/` | Mise od štamgastů: jedna třída na misi, nabídky (dialogy), trasy. |
| `src/story/` | Data a čistá logika příběhu: akty, postavy, dialogy, mise, handlování. |
| `src/systems/` | Čistá logika bez Phaseru (testovaná): pohyb, auta, boj, policie, respekt, uložení… |
| `src/world/` | Mapy (skutečná Morávka, generované Raškovice), dlaždice, skupiny, vozidla, věci k sebrání. |
| `src/entities/` | Herní objekty: hráč, chodec, vozidlo, vlečka. |
| `src/art/` | Kreslení grafiky kódem: terén, silnice, voda, postavy, auta, rekvizity. |
| `src/audio/` | Zvuky a rádio (generované). |
| `src/texts/` | Texty hry (`cs.ts`), kecy skupin (`chatter.ts`), mužský/ženský tvar (`gender.ts`). |
| `src/input/` | Dotykové ovládání (stav joysticku a tlačítek). |
| `src/missions/steps.ts` | Kroky misí (dojdi, nastup, doruč…), používá je příběh. |
| `public/img/` | Logo studia a titulní malba (jediné obrázky ze souborů). |
| `scripts/` | Soak test a playtesty v prohlížeči. |

## Scény (pořadí v `main.ts`)

| Scéna | Úloha |
|---|---|
| `Boot` | Nakreslí grafiku, načte logo a malbu, počká na písmo. |
| `Splash` | Logo Grand Morávka Game Studios. |
| `Title` | Hlavní menu nad malbou Morávky. |
| `Prolog` | Kamera po malbě s titulky (nová hra). |
| `Hero` | Hrdina nebo hrdinka, jméno, příspěvek z Instagramu. |
| `Game` | Svět: mapa, hráč, auta, chodci, skupiny, policie, příběh. |
| `UI` | HUD nad hrou (minimapa, zdraví, respekt, mise, hlášení). |
| `Pub` | Interiér eRka (běží místo světa, svět mezitím stojí). |
| `Dialog` | Okno rozhovoru se třemi volbami (svět nebo hospoda stojí). |
| `Pause`, `Settings`, `Controls` | Překryvná menu. |
| `Touch` | Dotykové ovladače (jen na mobilu, vždy navrchu). |

## Svět (`GameScene` a jeho pomocníci)

`GameScene` drží mapu, vozidla a hráče a každý snímek volá pomocníky. Každý má vlastní soubor
v `src/scenes/`:

- `Combat`: zbraně, chodci, zranění, smrt a zatčení.
- `Police` a `Witnesses`: hledanost, hlídky, svědci, popis pachatele.
- `Gangs`: tři skupiny (Hasiči, Štamgasti, Omladina), respekt, kecy v bublinách.
- `Incidents`: nehody, hádky řidičů, opilci, sražení chodci.
- `Animals`: divočáci.
- `Economy`: obchod pod pultem (Vesta), chata a garáž (jako rozhovor s Vysokým Dennym).
- `Dealer`: Omyx u řeky.
- `Progression`: skóre, výjezdy do dalších oblastí.
- `Announcer` a `Speech`: obecní rozhlas, rádio, bubliny.
- `Tutorial`: nápovědy.
- `Story`: běh příběhu (akty a mise), dialogy, hospoda, mise od štamgastů (`job`), vlečka.
- `Townsfolk`: postavy příběhu venku (Slečna Kobyla, Vysoký Denny, postavy misí).
- `Pals`: parťák (štamgast, který chodí s hráčem).
- `Intro`: úvod s autobusem.

## Příběh

- **Akty a mise** (`src/story/acts.ts`): Akt 1 má hlavní mise „Příjezd“ a „Do hospody“. Pak běží volná hra a mise od štamgastů.
- **Mise od štamgastů** (`src/story/jobs.ts` a `src/scenes/jobs/`): data (kdo misi dává, odměna, podmínky) jsou oddělená od běhu. Běh je třída odvozená z `Job` s metodami `objective`, `target`, `update` a `interact`. Nabídky jsou v `offers.ts`.
- **Dialogy** (`src/story/dialog.ts`): strom uzlů, každý se třemi volbami. Dynamické dialogy (handlování, výslech u Ajiny, kulečník) vznikají za běhu přes `story.setDynamic(id, …)` a navazuje se na ně přes `then: id`.
- **Texty pro hrdinu i hrdinku:** `{mužský|ženský}` a `{jmeno}`, doplňuje je `fillText` (`src/texts/gender.ts`).

## Uložení

`localStorage`, klíč `survive-moravka-save-v1`, formát verze 2 (`src/systems/save.ts`):
- **postup:** oblast, peníze, skóre, respekt podle oblastí, výbava (včetně čaje), čas,
- **hrdina:** pohlaví a jméno,
- **příběh:** akt, mise, příznaky, vztahy, koho hráč zná, počítadla, rozdělaná mise.

Starší uložení převede `deserialize`/`fixUp`: verze 1 bez příběhu, Dřevaři → Hasiči, chybějící čaj.

## Pravidla kódu

- Logiku, která nepotřebuje Phaser, piš do `src/systems/` nebo `src/story/` a testuj ji.
- Scény a pomocníky drž tenké; data (texty, mise, postavy) patří do `src/story/` a `src/texts/`.
- Komentáře česky, krátce: proč, ne co.
- Viz [STYL.md](STYL.md).
