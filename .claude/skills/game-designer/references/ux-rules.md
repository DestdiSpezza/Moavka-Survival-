# UX pravidla

## Ovládání
- Každá akce musí jít **klávesnicí i prstem** (ADR-024). Nové akce mapuj na existující tlačítka (E = akce, ÚTOK = použít věc v ruce), ne na nové klávesy.
- E je univerzální akce: vejít, promluvit, nastoupit, interakce mise (`Job.interact`). Pořadí priorit: dveře eRka → postava mise → postava → parťák → auto.
- Věc v ruce (čaj) se „použije útokem“, na mobilu se otočí k nejbližší postavě.

## Rozhovory
- Vždy **tři volby**, aspoň jedna bez ceny a podmínky (ADR-003). Volba s cenou má cenu v textu.
- Na mobilu se ťuká na celý řádek volby.
- Hra během rozhovoru stojí.

## HUD a cíle
- Mise má nahoře název (VELKÝMI) a úkol s čísly; šipka a značka ukazují cíl.
- Hlášky (toast) krátce, jedna věta; dlouhé věci patří do rozhovoru.
- Banner jen na začátek/konec mise a aktu.
- Na mobilu se tutoriál s klávesami a nápověda kláves schovává; ovládání je v menu Ovládání.

## Scény
- Každá filmová chvíle (úvod, prolog, logo) jde **přeskočit** (mezerník / Enter / ťuknutí, ADR-005).
- Během scény černé pruhy a schované HUD.

## Mobil
- Hra je na šířku; na výšku hláška „Otoč telefon“.
- Celá obrazovka se obnovuje po ťuknutí; iPhone: „Přidat na plochu“.
- Joystick vlevo (plovoucí), tlačítka vpravo; nic důležitého vpravo dole pod ÚTOKEM a E (panel auta je dole uprostřed).

## Uložení
- Hra ukládá sama (po misi, přejezdu, v chatě). Rozdělaná mise po načtení buď pokračuje (čaj, jeřáb), nebo se zruší s hláškou.
