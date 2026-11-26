# ADR-003: Dialogy vždy se třemi volbami

- **Stav:** přijato (zadání)
- **Rozhodnutí:** Dialog je strom uzlů. Každý uzel má mluvčího, text a právě 3 volby (klávesy 1–3 nebo myš). Volba může stát peníze, změnit vztah s NPC nebo respekt skupiny, nastavit příznak a vést dál. Během dialogu hra stojí.
- **Důsledky:** Testy hlídají, že každý uzel má 3 volby a každá někam vede.
