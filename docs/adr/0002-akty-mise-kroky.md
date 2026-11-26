# ADR-002: Akty, mise, kroky

- **Stav:** přijato (zadání)
- **Rozhodnutí:** Příběh je rozdělený na Akty (levely). Akt má mise, mise má kroky. Akty, mise i dialogy jsou data v kódu (`src/story/`), ne skripty v editoru.
- **Důsledky:** Nový akt = nový datový soubor a případně nové druhy kroků.
