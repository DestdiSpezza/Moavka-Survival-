# ADR-036: Upozornění po logu

- **Stav:** přijato
- **Proč:** Autor chce po logu studia klasické filmové upozornění s pointou.
- **Rozhodnutí:** Po logu (ADR-028) tři obrazovky na černé, pak titulní obrazovka:
  1. „Všechny postavy jsou smyšlené.“
  2. „Všechny hlasy jsou imitace. Všechna podobnost se skutečnými osobami, živými či zesnulými, je čistě náhodná.“
  3. „Takže se neposerte. Bude to sranda.“ a v pozadí pixelový fakáč (kreslený kódem, tlumeně).
- Každá obrazovka se sama přepne (2,8 s; 4,2 s; 3,2 s); ťuknutí nebo klávesa přeskočí na další. Celý úvod do menu trvá asi 16 s.
- **Důsledky:** Playtesty čekají na menu až 40 s; `logo-prolog.cjs` fotí všechny tři obrazovky.
