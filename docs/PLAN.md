# Survive Morávka: plán vývoje po fázích

Hra s pohledem shora (2D) z obce Morávka v Beskydech a jejího okolí. Hráč chodí pěšky, krade a řídí auta, bojuje, plní zakázky pro soupeřící skupiny a utíká policii. Do další oblasti postoupí, když v té současné vydělá dost peněz a nasbírá cílové skóre. Splnit všechny mise k tomu není potřeba.

Každá fáze končí **hratelným stavem**. Hra se tak dá zkoušet po každém kroku a nic se nestaví naslepo.

---

## Technologie (návrh)

| Oblast | Volba | Proč |
|---|---|---|
| Jazyk | TypeScript | Typy ohlídají chyby, až systémů (skupiny, policie, mise) přibude. |
| Herní engine | Phaser 3 | Ověřený 2D engine pro prohlížeč: tilemapy, kamera, fyzika a kolize už v sobě má. |
| Build | Vite | Rychlý vývojový server a jednoduchý build. |
| Mapa | Zatím generovaná kódem, později Tiled (`.tmj`) | Kód se rychle ladí; Tiled přijde pro ruční detaily. |
| Testy | Vitest | Pro herní logiku (respekt, hledanost, skóre) nezávisle na vykreslování. |
| Nasazení | GitHub Pages přes GitHub Actions | Každá verze hratelná v prohlížeči přes odkaz. |

Hra poběží v prohlížeči na PC, ovládání klávesnice + myš. Gamepad a mobil až v pozdější fázi.

---

## Fáze 0: Kostra projektu ✅

- Projekt Vite + TypeScript + Phaser, složky `src/scenes`, `src/systems`, `src/entities`, `assets/`.
- Prázdná scéna, herní smyčka, načítání assetů.
- Lint, formátování, Vitest.
- GitHub Actions: build + testy u každého pushe, nasazení na GitHub Pages.

**Hotovo, když:** hra se otevře v prohlížeči z odkazu na GitHub Pages a CI je zelené.

## Fáze 1: Hráč a svět Morávky ✅

- Hráč pěšky: pohyb WASD, míření myší, chůze a sprint.
- První mapa: střed Morávky, hlavní silnice, řeka Morávka, přehrada, domy, les, kopce jako neprůchozí terén.
  Mapa se zatím generuje kódem (`src/world/moravka.ts`), což se při ladění rozložení upravuje rychleji než v Tiled. Na Tiled přejdeme, až bude potřeba ruční detail.
- Kolize se stěnami, vodou a stromy; les zpomaluje.
- Kamera sleduje hráče, minimapa v rohu.
- Jednoduché placeholder grafiky (barevné tvary), aby šlo hru hrát hned.

**Hotovo, když:** se dá volně procházet celou první mapou a nikde se nejde projít zdí.

## Fáze 2: Vozidla ✅

- Nástup a výstup (klávesa E), krádež zaparkovaného auta i vyhození řidiče.
- Jízdní model shora: zrychlení, brzda, smyk, ruční brzda, rozdílné chování na silnici, šotolině a v trávě.
- Typy vozidel: osobák, dodávka, terénní auto, traktor, policejní auto.
- Poškození vozidel: kouř, oheň, výbuch.
- NPC doprava jezdí po silnicích.

**Hotovo, když:** hráč ukradne auto, projede vesnici, nabourá a auto se dá zničit.

## Fáze 3: Boj a zdraví ✅

- Zbraně: pěsti, pálka, pistole, brokovnice, samopal; střelba ve směru myši, munice.
- Zdraví a vesta hráče, zdraví NPC.
- Chodci reagují: utíkají, volají policii.
- Smrt hráče: probuzení u zdravotního střediska, doktor si vezme 30 % peněz, zbraně propadnou.
- Zbraně, vesta a lékárničky leží na mapě a po minutě se obnoví; mrtví chodci občas upustí peníze.
- Drsní chodci se brání pěstmi; panikařící chodci volají policii (událost `crime`, kterou ve fázi 4 převezme policie).

**Hotovo, když:** jde bojovat pěšky i z auta a smrt má jasný a férový následek.

## Fáze 4: Policie a hledanost

- Trestné činy (krádež auta, napadení, střelba, ničení) zvyšují hledanost.
- 5 úrovní hledanosti:
  1. běžná hlídka,
  2. více policejních vozidel,
  3. zátarasy a intenzivní pronásledování,
  4. ozbrojené jednotky,
  5. kompletní hon na hráče.
- Policie hráče hledá podle toho, kde ho viděla naposledy. Mimo dohled hledanost postupně klesá; úkryt v lese nebo převlečení auta pomáhá.
- Zatčení: ztráta zbraní a pokuta.
- Hvězdičky hledanosti na HUDu.

**Hotovo, když:** krádež auta spustí honičku, která se umí vyhrotit až na úroveň 5 i zase uklidnit.

## Fáze 5: Skupiny a respekt (hlavní mechanika)

- Data skupin: název, barva/symbol, území na mapě, členové, typická vozidla, vztahy k ostatním skupinám.
- 4 skupiny v první oblasti (viz [Skupiny Morávky](#skupiny-morávky)).
- Respekt u každé skupiny: od -100 do +100, start kolem 0.
  - **Roste:** splněná mise, pomoc členům, škoda nepřátelům skupiny.
  - **Klesá:** zabití členů, zničení majetku, selhání v důležité zakázce.
  - Pomoc jedné skupině automaticky snižuje respekt u jejích nepřátel.
- Chování podle respektu: vysoký respekt znamená, že tě nechají být nebo ti pomůžou; hluboko v mínusu na jejich území zazní „To je on!“ a zaútočí.
- Skupiny reagují i na policii a na sebe navzájem. Tím vzniká řetězový chaos: honička → spřátelená skupina napadne policii → přijedou posily.
- HUD: respekt u skupin v aktuální oblasti.

**Hotovo, když:** se dá situace „ukradnu auto → policie → vjedu ke spřáteleným → oni střílí na policii“ odehrát sama od sebe, bez skriptu.

## Fáze 6: Mise a zakázky

- Místa se zakázkami na mapě (u každé skupiny).
- Obtížnosti podle respektu: 🟢 zelená (vždy), 🟡 žlutá (respekt od cca +30), 🔴 červená (od cca +60).
- Typy misí jako šablony: ukradni vozidlo, doprav člověka, zlikviduj bosse, znič vozidlo, dovez zásilku, přepadni konvoj, sabotuj objekt, ukradni náklad, ochraň člena, uteč policii, přežij útok.
- Komplikace, které se náhodně spustí během mise (majitel volá policii, nepřátelská skupina přepadne, auto se rozbije). Mise se tak nedrží jednoho plánu: „Dovez dodávku z Raškovic“ může skončit honičkou, útěkem do lesa a návratem pro dodávku.
- Odměny: peníze, respekt, skóre.

**Hotovo, když:** je v první oblasti aspoň 10 zakázek napříč všemi barvami a skupinami a komplikace se objevují bez ručního skriptování.

## Fáze 7: Skóre, peníze a postup oblastmi

- Skóre za mise, chaos, honičky, styl (dlouhý únik, zničené vozidlo, přežití hledanosti 5).
- Peníze: odměny z misí, kradení, prodej aut; útrata za zbraně, opravy, úkryty.
- Cíl oblasti: dané skóre + peníze. Po splnění se otevře další oblast.
- Návrh oblastí: **Morávka** → **Raškovice** → **Krásná** → **Lysá hora** (každá s vlastními skupinami).
- Ukládání a načítání hry.

**Hotovo, když:** jde splnit cíl Morávky a přejít do Raškovic s uloženým postupem.

## Fáze 8: Obsah a vyladění

- Vlastní grafika místo placeholderů (budovy, auta, postavy v pixel-artu).
- Zvuky a hudba, rádio v autě.
- Hlavní menu, nastavení, tutoriál.
- Vyvážení obtížnosti, výkon, oprava chyb.
- Volitelně: gamepad, mobilní ovládání.

**Hotovo, když:** se dá hra pustit někomu cizímu a zvládne ji bez vysvětlování.

---

## Styl hry

- **Grafika:** rastrový pixel-art (dlaždice 16×16 px, zvětšené bez vyhlazování).
- **Jazyk:** čeština (všechny texty v jednom souboru, aby šlo později přidat další jazyk).
- **Tón:** černý humor, nadsázka, trochu punk. Hlášky chodců a skupin, absurdní komplikace v misích, policejní vysílačka s komentáři.

## Skupiny Morávky

Všechny skupiny jsou smyšlené.

| Skupina | Povaha | Kde je najdeš | Zbraně | Vozidla |
|---|---|---|---|---|
| **Dřevaři** | Drsní, málomluvní, řeší věci sekerou | Pila, hospoda | Sekery, motorové pily, palice | Traktory, lesní nákladáky, valníky |
| **Štamgasti** | Opilci s velkým srdcem a krátkým fitilem | Hospoda (od rána do noci) | Láhve, molotovy, stará brokovnice | Rozbitá stará auta, mopedy |
| **Ekologové** | Všudypřítomní, nesnáší auta | Všude: les, přehrada, náves | Spreje, praky, zápalné bomby na auta | Kola, koloběžky, pěšky |
| **Škola** | Vesnický „sídlištní“ gang školáků a mlaďochů | Škola, hřiště, autobusová zastávka | Pálky, nože, petardy | Skútry, kradená auta |

### Vztahy mezi skupinami (výchozí)

| | Dřevaři | Štamgasti | Ekologové | Škola |
|---|---|---|---|---|
| **Dřevaři** | — | 🙂 sdílejí hospodu | 💀 nepřátelé (kácení lesa) | 😐 neutrální |
| **Štamgasti** | 🙂 | — | 😐 neutrální | 😠 rivalové (kluci jim kradou pivo) |
| **Ekologové** | 💀 | 😐 | — | 😠 rivalové (skútry a petardy) |
| **Škola** | 😐 | 😠 | 😠 | — |

Hospoda je sdílené území Dřevařů a Štamgastů: kdo si tam rozhádá jedny, má problém i s druhými.

### Zvláštní chování

- **Ekologové** útočí na hráče, když řídí auto (hlavně nákladní nebo kouřící), a ničí zaparkovaná vozidla. Pěšky nebo na kole tě nechají být.
- **Štamgasti** jsou přes den pomalí a nepřesní, večer agresivnější.
- **Dřevaři** jsou pomalí, ale vydrží nejvíc a jejich vozidla jsou těžká a ničivá.
- **Škola** je rychlá, útočí ve skupinkách a rychle utíká.
