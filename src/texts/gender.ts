import { DEFAULT_HERO, type Hero } from '../systems/save';

/**
 * Texty, které oslovují hráče, mají mužský i ženský tvar: „{Ukradls|Ukradlas}“.
 * {jmeno} se nahradí jménem hrdiny nebo hrdinky.
 */

let current: Hero = DEFAULT_HERO;

export function setHero(hero: Hero): void {
  current = hero;
}

export function currentHero(): Hero {
  return current;
}

/** Doplní jméno a vybere tvar podle pohlaví („{fešáku|kočko}“ → „kočko“). */
export function fillText(text: string, hero: Hero = current): string {
  return text.replace(/\{jmeno\}/g, hero.name).replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_m, male: string, female: string) => (hero.gender === 'f' ? female : male));
}
