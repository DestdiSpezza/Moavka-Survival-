# Balanc: skutečná čísla

Zdroj pravdy je kód; tady jsou hodnoty k 2026-11-26, ať nové věci držíš ve stejném řádu.
Když číslo měníš, uprav i tenhle soubor.

## Peníze
| Co | Kolik | Kde |
|---|---|---|
| Start | 500 Kč | `systems/save.ts` |
| Pistole / brokovnice / samopal | 200 / 450 / 900 Kč | `systems/economy.ts` SHOP |
| Neprůstřelná vesta / lékárnička | 300 / 120 Kč | tamtéž |
| Chata | 1000 Kč | `HIDEOUT_PRICE` |
| Tráva u Omyxe | 150 Kč | `scenes/Dealer.ts` |
| Pivo pro štamgasta (smír), panák | 45 / 60 Kč | dialogy, `Pals.ts` |

## Odměny misí (`story/jobs.ts`)
| Mise | Kč |
|---|---|
| Beskydský čaj | zisk z prodeje (3 × 200–320 Kč, nákup 450) |
| Zjebal domů | 0 (od Ajiny 100 / 50) |
| Auto pro Dennyho | 600 |
| Lešení | 250 |
| Kulečník | 250 |
| Jeřáb pro Vestu | 700 (nejtěžší: přejezd oblastí, bez hvězd) |
| Schovej Kibiho | 300 |
| Flašky pro Omladinu | 400 |
Vztah se zadavatelem: +10 až +20. Respekt skupiny za pomoc: `helpMember` +3.

## Časy a šance
- **Zjebal:** limit = trasa / (62 % max. rychlosti auta) × 1,1, min. 12 s (autopilot bez provozu: 13 s ze 17).
- **Flašky:** 110 s, Plotková pije každých 18 s (−1 flaška, −8 s), 6 flašek na 4 zastávky.
- **Kulečník:** rada 55 %, strčit 70 % (20 % chycen), koule 90 % (35 % chycen); Metějka potřebuje 2 ze 3.
- **Handlování:** plná cena 200 Kč; strop kupce 190–320 podle typu; trpělivost 3–4 kroky (`story/bargain.ts`). Chytrý hráč prodá za plnou cenu u většiny kupců, náhodný výrazně méně.
- **Kibi:** lež 60 %, panák jistota, auto > 420 px od eRka.
- **Denny:** auto aspoň 90 % zdraví, 0 hvězd.

## Pohyb a boj
- **Chůze:** hráč 70 / sprint 125 px/s; chodci 30 / útěk 85 px/s.
- **Zdraví:** chodec 40 (drsňák 70) HP.
- **Auto:** osobák max. 190 px/s, traktor 75, jeřáb 80; náraz od 45 px/s; výbuch 35 dmg v okruhu 48 px.

## Hledanost (`systems/wanted.ts`)
- **Žár za čin:** krádež 8, napadení 15, střelba 10, vražda 40, napadení policisty 45, zabití policisty 110, krádež policejního auta 60.
- **Hranice hvězd:** 1 / 60 / 170 / 330 / 540.

## Skóre (`systems/score.ts`)
Vrak 25 (+40 za každé další auto v řetězu), drift 15/s, útěk 50 × úroveň², přežití 30 s na 5 hvězdách 500.

## Provoz (ADR-027)
Cíl soaku: ~5 bouraček a 1–2 sražení chodci za 6 herních minut. Po změně provozu změř (`npm run soak -- 6`).
