# ADR-019: Beskydský čaj a handlování

- **Stav:** přijato (fáze P2)
- **Rozhodnutí:** Čaj je věc ve výbavě (klávesa 6 nebo Q, počet jako náboje). „Útok“ s ním na člena Omladiny otevře handlování v dialogu: kupec nejdřív nechce, pak možná, pak se smlouvá. Hráč nabízí argumenty (původ, vzácnost, účinek, diskrétnost, status); každý z pěti typů kupců má jeden, který na něj platí, a jeden, který ho naštve. Kupec tlačí cenu dolů svými kecy a má omezenou trpělivost. Do mise se počítá jen prodej aspoň za 200 Kč (plná cena). Dohodu zakončí předávka: kamera se přiblíží, sáček letí ke kupci, bankovka zpátky.
- **Logika:** `src/story/bargain.ts` (čistá, testovaná), dialog a předávka v `src/scenes/jobs/TeaJob.ts`.
