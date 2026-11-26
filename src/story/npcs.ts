/**
 * Postavy příběhu (podrobnosti v NPC.md): jméno, barva v dialogu,
 * postavička a kde jsou podle hodin.
 */

export type NpcId = 'kobyla' | 'prchard' | 'plotkova' | 'vesta' | 'omyx' | 'metejka' | 'zjebal' | 'dennyVysoky' | 'dennySochar' | 'kibi' | 'ajina';

export interface NpcDef {
  id: NpcId;
  name: string;
  /** Barva jména v dialogu. */
  css: string;
  /** Postavička (sprite). */
  sprite: string;
}

export const NPCS: Record<NpcId, NpcDef> = {
  kobyla: { id: 'kobyla', name: 'Slečna Kobyla', css: '#d8a0e0', sprite: 'npc-kobyla' },
  prchard: { id: 'prchard', name: 'Prchard', css: '#ffd23f', sprite: 'npc-prchard' },
  plotkova: { id: 'plotkova', name: 'Plotková', css: '#ff8a9a', sprite: 'npc-plotkova' },
  vesta: { id: 'vesta', name: 'Vesta', css: '#ff7a6a', sprite: 'npc-vesta' },
  omyx: { id: 'omyx', name: 'Omyx', css: '#7fe07a', sprite: 'dealer' },
  metejka: { id: 'metejka', name: 'Metějka', css: '#e8b040', sprite: 'npc-metejka' },
  zjebal: { id: 'zjebal', name: 'Zjebal', css: '#c8c8c8', sprite: 'npc-zjebal' },
  dennyVysoky: { id: 'dennyVysoky', name: 'Vysoký Denny', css: '#7ab0e8', sprite: 'npc-dennyVysoky' },
  dennySochar: { id: 'dennySochar', name: 'Denny sochař', css: '#b8a890', sprite: 'npc-dennySochar' },
  kibi: { id: 'kibi', name: 'Kibi', css: '#ff8ad0', sprite: 'npc-kibi' },
  ajina: { id: 'ajina', name: 'Ajina', css: '#ff7ab0', sprite: 'npc-ajina' },
};

/** Štamgasti (Prchard je za barem, Plotková obsluhuje). */
export const STAMGASTI: NpcId[] = ['vesta', 'omyx', 'metejka', 'zjebal', 'dennyVysoky', 'dennySochar', 'kibi'];

/** Vysoký Denny sedí v eRku od 13:00 do 17:00, jinak stojí před garáží. */
export const DENNY_PUB = { from: 13 * 60, to: 17 * 60 };
/** Omyx je večer a v noci v eRku (17:00–5:00), přes den u řeky. */
export const OMYX_PUB = { from: 17 * 60, to: 5 * 60 };

function within(minute: number, span: { from: number; to: number }): boolean {
  return span.from <= span.to ? minute >= span.from && minute < span.to : minute >= span.from || minute < span.to;
}

/**
 * Je postava teď v eRku? Při festivalu na začátku Aktu 1 (dokud hráč poprvé nepromluví
 * s Prchardem) tam sedí všichni; potom podle hodin.
 */
export function inPub(id: NpcId, minute: number, festival: boolean): boolean {
  if (id === 'kobyla' || id === 'ajina') return false;
  if (festival) return true;
  if (id === 'dennyVysoky') return within(minute, DENNY_PUB);
  if (id === 'omyx') return within(minute, OMYX_PUB);
  return true;
}
