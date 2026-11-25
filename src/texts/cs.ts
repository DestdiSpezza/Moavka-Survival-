/** Všechny texty hry na jednom místě. */
export const T = {
  title: 'SURVIVE MORÁVKA',
  subtitle: 'Beskydy. Hospoda. Chaos.',
  loading: 'Načítám Morávku…',
  pressStart: 'Stiskni MEZERNÍK',
  controls: 'WASD pohyb · SHIFT sprint · myš míření · E nastoupit',
  controlsCar: 'W/S plyn a brzda · A/D zatáčení · MEZERNÍK ruční brzda · E vystoupit',
  steal: 'E: ukrást',
  carjack: 'E: vyhodit řidiče',
  driverBails: 'Řidič vyskočil z hořícího auta. Chytrej.',
  kmh: 'km/h',
  /** Co křičí řidič, když ho vyhodíš z auta. */
  yanked: [
    'Hej! Ještě jsem nesplatil leasing!',
    'Vole, to je auto po dědovi!',
    'Já jel jen pro rohlíky!',
    'Zavolám na tebe fízly!',
    'Aspoň mi vrať tu klobásu ze sedačky!',
  ],
  stolePolice: 'Ukradls policajtům auto. To si zapamatují.',
  smoke: 'Z motoru se kouří. To bude drahé.',
  fire: 'HOŘÍ! Vypadni z toho auta!',
  explodedInside: 'Bum. Přežils to. Zázrak, nebo pivo?',
  honk: 'TÚÚÚ!',
  stamina: 'Dech',
  /** Hlášky, když hráč vleze do lesa nebo se zadýchá. */
  forest: 'Les. Klíšťata tě vítají.',
  exhausted: 'Zadýchal ses. Moc piva, málo kardia.',
} as const;
