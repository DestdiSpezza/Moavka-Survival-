# Nasazení a větve

## GitHub Pages

Hra běží na https://destdispezza.github.io/Moavka-Survival-/.

CI (`.github/workflows/ci.yml`) při každém pushi:
1. `npm ci`, `npm test`, `npm run build`,
2. jen na `main`: nahraje `dist/` a nasadí ho na GitHub Pages.

Build má relativní cesty (`base: './'` ve `vite.config.ts`), takže funguje pod `/<repo>/`.
Obrázky z `public/` se kopírují do `dist/` beze změny.

## Postup změn

1. Nová práce na vlastní větvi (`claude/<tema>`), nikdy rovnou na `main`.
2. Testy, build a playtest; commit s popisem v češtině.
3. Push větve, shrnutí autorovi a otázka, jestli to poslat do `main`.
4. Na „ano / dej do main“: fast-forward `main` na větev (`git push origin <vetev>:main`),
   počkat na CI a ověřit, že nasazení prošlo.

Na `main` se pushuje jen se souhlasem autora. Pull requesty se dělají jen na požádání.

## Mobil

`public/manifest.webmanifest` (celá obrazovka, na šířku) umožní „Přidat na plochu“. Na iPhonu
je to jediná cesta k celé obrazovce; Android ji dostane i v prohlížeči po ťuknutí.
