---
name: game-designer
description: Herní design hry Survive Morávka – navrhuje a posuzuje mise, mechaniky, postavy, balanc (ceny, odměny, obtížnost, časy), UX a ovládání (počítač i mobil) v souladu s vizí hry. Použij vždy, když v tomhle repu vymýšlíš nebo měníš, co hráč dělá a proč: nová mise, akt, mechanika, parťák, úprava obtížnosti nebo odměn, ovládání, menu, HUD, tutoriál – i když uživatel řekne jen „vymysli misi pro Kibiho“, „je to moc těžké“, „přidej mechaniku“ nebo „pokračuj další fází“.
---

# Game designer: Survive Morávka

Pomáhá navrhovat hru tak, aby seděla k tomu, co už je: krátké, drzé, beskydské a hratelné
i na telefonu. Design je tady vždycky kompromis mezi vtipem, srozumitelností a tím, co jde
postavit z existujících kusů (kroky misí, dialogy, joby, parťáci).

## Než začneš

1. Přečti `docs/STAV.md` (kde je projekt, co čeká na autora) a příslušné části `docs/hra/`.
2. Podle úkolu otevři reference:
   - [references/game-vision.md](references/game-vision.md): o čem hra je, pro koho, co nikdy (vždy, když vymýšlíš obsah).
   - [references/balance.md](references/balance.md): skutečná čísla ze hry (ceny, odměny, limity, hledanost).
   - [references/ux-rules.md](references/ux-rules.md): ovládání, HUD, dialogy, mobil.
   - [references/art-style.md](references/art-style.md): jak má věc vypadat (pro detail kreslení použij skill `pixel-art-director`).
3. Texty a dialogy piš podle skillu `moravka-dialogy`.

## Postup návrhu

1. **Shrň zadání vlastními slovy** a řekni, co z existující hry to využije (job, dialog, parťák, vozidlo, mapa).
2. **Chybí-li podstatné rozhodnutí** (co je cíl, jak se prohrává, co z toho hráč má), zeptej se. Jedna nejdůležitější otázka, nebo 2–3 konkrétní varianty s doporučením.
3. **Navrhni misi nebo mechaniku podle šablony** níže. Čísla ber z `balance.md` a drž je v podobném řádu.
4. **Ověř proti vizi:** je to vtipné? Dá se to hrát prstem? Má to jasný cíl na HUD? Nedá se v tom uvíznout (vždy existuje cesta ven)?
5. **Zapiš rozhodnutí** jako nový soubor `docs/adr/NNNN-…md` a doplň `docs/hra/MISE.md` a `docs/hra/POSTAVY.md`.

## Šablona mise

```
Název:            (2–3 slova, pro HUD velkými písmeny)
Kdo dává:         (štamgast / postava, kde a kdy je k zastižení)
Háček:            (jedna vtipná věta, proč to chce)
Cíl na HUD:       („Dovez … (stav 96 %, hvězdy 0)“ – měřitelný, s čísly)
Kroky:            (2–4 kroky; každý má cíl na mapě nebo jasnou akci)
Mechanika navíc:  (co je nového, max jedna věc na misi)
Prohra:           (jak se dá prohrát a co se stane – vždy jde zkusit znovu)
Odměna:           (Kč + vztah; viz balance.md)
Animace / scéna:  (jedna viditelná chvíle, např. předávka, vjezd do garáže)
Mobil:            (jak se to hraje prstem; žádné klávesy navíc)
Hranice:          (nic proti skupinám lidí; Omladina plnoletá)
```

## Zásady

- **Jedna nová věc na misi.** Zbytek staví na tom, co hráč zná.
- **Vždy cesta ven:** dialog má volbu bez podmínky, mise jde vzdát u zadavatele a po prohře se dá zopakovat.
- **Prohra je vtipná:** tágo o záda, bačkora, „Plotková dopila zbytek z lítosti“.
- **Viditelný moment:** každá mise má jednu chvíli, kterou je vidět (kamera se přiblíží, věc letí, vrata spadnou).
- **Čitelný cíl:** ukazatel na mapě a text s čísly (čas, kusy, procenta, hvězdy).
- **Balanc měř:** odvozené limity (čas, šance) ověř simulací nebo testem, jako u handlování a časového limitu Zjebala.
