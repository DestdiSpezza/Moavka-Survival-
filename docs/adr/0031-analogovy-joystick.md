# ADR-031: Analogový joystick

- **Stav:** přijato (nahrazuje řízení auta z ADR-024)
- **Proč:** Autor: ovládání na mobilu „bere to jako klávesnici, ne jako joystick“. Chůze se převáděla na čtyři klávesy (jen 8 směrů, pořád plná rychlost) a auto se řídilo jako na klávesnici (nahoru plyn, do stran volant), takže jet dolů po obrazovce znamenalo držet joystick nahoru a točit.
- **Rozhodnutí:**
  - **Pěšky:** postava jde přesně tam, kam joystick ukazuje; rychlost podle vychýlení (35–100 % chůze, mrtvá zóna 20 %). Sprint dál tlačítkem.
  - **Auto:** joystick ukazuje, kam má auto jet (směr na obrazovce). Auto se tam samo stáčí, plyn podle vychýlení. Ostrá otočka ve vyšší rychlosti ubere plyn. Úplně dozadu (víc než ~150°) ze stání nebo při couvání = couvání, auto se natáčí zádí. BRZDA dál ruční brzda.
  - Výpočet je čistá logika v `src/systems/stick.ts` (testy včetně jízdního modelu); klávesnice se nemění.
- **Důsledky:** Na klávesnici nic. Playtest `mobil.cjs` hlídá šikmou chůzi a natočení auta po joysticku.
