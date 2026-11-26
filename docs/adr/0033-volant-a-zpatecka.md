# ADR-033: Volant jako půlkruh a zpátečka

- **Stav:** přijato (mění ovládání auta z ADR-032, srážky platí dál)
- **Proč:** Autor: šipky ◀ ▶ jsou „divný“, chce volant jako půlkruh a zpátečku.
- **Rozhodnutí:**
  - Vlevo dole je **volant**: kruh se středem pod okrajem obrazovky, vidět je horní půlka (věnec, ramena, žlutá značka nahoře). Rejd = úhel prstu od svislice (nahoře rovně, 70° do strany = plný rejd); volant se kreslí natočený a po puštění se vrátí.
  - Vpravo **D/R** (zpátečka): ťuknutí přepne; s R jede PLYN dozadu. Při vystoupení se vrátí na D.
  - **BRZDA** jen brzdí proti směru jízdy a ve stání drží auto (už necouvá). RUČKA dál drift.
  - Logika v `src/systems/stick.ts` (`wheelSteer`, `carPedals`) s testy; klávesnice beze změny.
- **Důsledky:** Playtest `mobil.cjs` hlídá rejd volantu, návrat, otočku v jízdě, couvání se zpátečkou a brzdu.
