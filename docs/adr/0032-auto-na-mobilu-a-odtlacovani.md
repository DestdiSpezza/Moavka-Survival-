# ADR-032: Auto na mobilu tlačítky a odtlačování aut

- **Stav:** přijato
- **Proč:** Autor: řízení joystickem (ADR-031) je „furt na prd“; chce vlevo volant a vpravo plyn, brzdu a ručku, jen v autě. A fízlové se o hráče zasekávají; silnější auto (dodávka, traktor) má odtlačit slabší, osobák ne.
- **Rozhodnutí – ovládání:**
  - Pěšky zůstává analogový joystick (ADR-031).
  - V autě zmizí joystick a tlačítka pro chůzi. Vlevo **volant**: ◀ ▶, prst kdekoli v levé části, rejd podle vzdálenosti od středu (dá se po něm přejet). Vpravo **PLYN**, **BRZDA** (zastaví, pak couvá), **RUČKA** (drift), **ÚTOK** a **E** (vystoupit). Při nastoupení a vystoupení se všechno pustí.
- **Rozhodnutí – srážky:**
  - Každé vozidlo má váhu (osobák 1, fízlové 1,2, teréňák 1,6, dodávka 2,4, traktor a zásahovka 3, jeřáb 6, skútr 0,35, kolo 0,25).
  - Kdo je aspoň **1,8× těžší**, odsune lehčí o celý překryv a skoro nezpomalí; jinak se překryv dělí podle váhy.
  - **Stojící auto drží na brzdě:** lehčí nebo stejně těžké ho nepohne (osobák stojícího fízla neodtlačí, dodávka ano).
  - Vrak se nehne. Platí pro srážky s hráčovým autem nebo s policií; ostatní provoz se sráží jako dřív (soak: s pravidlem pro všechny přibylo bouraček a přejetých chodců).
  - Čistá logika v `src/systems/push.ts` (testy), napojení v `pushApart` (`entities/Vehicle.ts`).
- **Důsledky:** Ve větším autě se dá z obklíčení fízlů vytlačit; v osobáku ne. Playtest `mobil.cjs` hlídá tlačítka v autě, jízdu, couvání a odtlačení fízla dodávkou (osobákem ne).
