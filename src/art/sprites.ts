import Phaser from 'phaser';
import { createRng } from '../systems/rng';
import { type Color, PAL, Painter, shade } from './painter';

/**
 * Sprity ve stylu GTA 2 kreslené po pixelech: auta s lesky, skly a světly,
 * postavy se třemi snímky chůze, mrtvoly, stíny vozidel a stopy na zemi.
 * Všechno je kreslené čelem doprava (úhel 0).
 */

function add(scene: Phaser.Scene, key: string, p: Painter, frames?: { w: number; n: number }): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, p.toCanvas())!;
  if (frames) for (let i = 0; i < frames.n; i++) tex.add(i, 0, i * frames.w, 0, frames.w, p.h);
}

// ================= Vozidla =================

export const CAR_PAINT: Color[] = [0xb8352a, 0x2f5fa8, 0xd8d4c8, 0x8fae3a, 0x7a4a2a, 0x2a2a2e, 0xd8a020, 0x5a7a8a];

interface CarLook {
  body: Color;
  wreck: boolean;
  /** Pruhy a maják (policie). */
  police?: 'car' | 'swat';
  siren?: boolean;
}

/** Kola po stranách (vykukují zpod karoserie). */
function wheels(p: Painter, positions: number[], w: number, len = 4): void {
  for (const x of positions) {
    p.rect(x, 0, len, 2, 0x141414);
    p.rect(x, w - 2, len, 2, 0x141414);
    p.px(x + 1, 0, 0x3a3a3a);
    p.px(x + 1, w - 1, 0x3a3a3a);
  }
}

/** Karoserie: obrys, výplň, lesk shora a zleva, tmavší spodní hrana. */
function body(p: Painter, x: number, y: number, w: number, h: number, c: Color, wreck: boolean): void {
  const base = wreck ? 0x2e2822 : c;
  p.rect(x + 1, y, w - 2, h, shade(base, 0.5));
  p.rect(x, y + 1, w, h - 2, shade(base, 0.5));
  p.rect(x + 1, y + 1, w - 2, h - 2, base);
  p.rect(x + 2, y + 1, w - 4, 1, shade(base, wreck ? 0.9 : 1.35));
  p.rect(x + 1, y + 2, 1, h - 4, shade(base, wreck ? 0.9 : 1.2));
  p.rect(x + 2, y + h - 2, w - 4, 1, shade(base, 0.72));
  if (wreck) {
    p.noise(x + 1, y + 1, w - 2, h - 2, [0x1a1614, 0x5a3a22, 0x6a4a2a, 0x3a2a20], 0.35);
  }
}

function glass(p: Painter, x: number, y: number, w: number, h: number, wreck: boolean): void {
  if (wreck) {
    p.rect(x, y, w, h, 0x141210);
    p.px(x + 1, y + 1, 0x6a6a6a);
    return;
  }
  p.rect(x, y, w, h, 0x2a3a4c);
  p.rect(x, y, w, 1, 0x6a8aa8);
  p.line(x + 1, y + h - 2, x + w - 2, y + 1, 0x9ac0d8);
}

function lights(p: Painter, len: number, w: number, wreck: boolean): void {
  if (wreck) return;
  p.rect(len - 2, 2, 1, 2, 0xfff2b0);
  p.rect(len - 2, w - 4, 1, 2, 0xfff2b0);
  p.rect(1, 2, 1, 2, 0xd02020);
  p.rect(1, w - 4, 1, 2, 0xd02020);
}

function sedan(look: CarLook): Painter {
  const L = 24;
  const W = 12;
  const p = new Painter(L, W, createRng(1));
  const c = look.police ? 0xf2f2f0 : look.body;
  wheels(p, [4, 16], W);
  body(p, 1, 1, L - 2, W - 2, c, look.wreck);
  // Kapota a kufr lehce odlišené, střecha, skla.
  p.rect(17, 2, 1, W - 4, shade(look.wreck ? 0x2e2822 : c, 0.82));
  p.rect(6, 2, 1, W - 4, shade(look.wreck ? 0x2e2822 : c, 0.82));
  glass(p, 14, 2, 3, W - 4, look.wreck);
  glass(p, 6, 3, 2, W - 6, look.wreck);
  p.rect(8, 2, 6, W - 4, shade(look.wreck ? 0x2e2822 : c, 0.92));
  p.rect(8, 2, 6, 1, shade(look.wreck ? 0x2e2822 : c, 1.15));
  // Zrcátka
  p.px(14, 0, shade(c, 0.6));
  p.px(14, W - 1, shade(c, 0.6));
  lights(p, L, W, look.wreck);
  if (look.police && !look.wreck) {
    p.rect(2, 4, L - 4, 1, 0x2050c0);
    p.rect(2, W - 5, L - 4, 1, 0x2050c0);
    p.rect(18, 3, 3, W - 6, 0x2050c0);
    const a = look.siren ? 0xff3030 : 0x3050ff;
    const b = look.siren ? 0x3050ff : 0xff3030;
    p.rect(10, 3, 2, 3, a);
    p.rect(10, W - 6, 2, 3, b);
    p.px(10, 3, 0xffffff);
  }
  return p;
}

function van(look: CarLook): Painter {
  const L = 28;
  const W = 13;
  const p = new Painter(L, W, createRng(2));
  const swat = look.police === 'swat';
  const c = swat ? 0x1c2433 : look.body;
  wheels(p, [4, 20], W);
  body(p, 1, 1, L - 2, W - 2, c, look.wreck);
  const base = look.wreck ? 0x2e2822 : c;
  // Nákladní skříň s žebrováním střechy, kabina vpředu.
  for (let i = 3; i < 19; i += 3) p.rect(i, 2, 1, W - 4, shade(base, 0.85));
  p.rect(19, 1, 1, W - 2, shade(base, 0.6));
  glass(p, 21, 2, 3, W - 4, look.wreck);
  p.rect(24, 2, 2, W - 4, shade(base, 1.08));
  p.px(21, 0, shade(base, 0.6));
  p.px(21, W - 1, shade(base, 0.6));
  lights(p, L, W, look.wreck);
  if (!look.wreck) {
    if (swat) {
      p.rect(3, 5, 15, 3, 0x2a5fd0);
      const a = look.siren ? 0xff3030 : 0x3050ff;
      const b = look.siren ? 0x3050ff : 0xff3030;
      p.rect(16, 2, 2, 3, a);
      p.rect(16, W - 5, 2, 3, b);
    } else {
      // Firemní pruh (řeznictví, pivovar…)
      p.rect(4, 5, 13, 3, 0x3f7d3a);
      p.rect(4, 5, 13, 1, 0x5a9a52);
    }
  }
  return p;
}

function offroad(look: CarLook): Painter {
  const L = 26;
  const W = 13;
  const p = new Painter(L, W, createRng(3));
  const c = look.body;
  wheels(p, [4, 18], W, 5);
  body(p, 2, 1, L - 4, W - 2, c, look.wreck);
  const base = look.wreck ? 0x2e2822 : c;
  glass(p, 16, 2, 2, W - 4, look.wreck);
  p.rect(6, 2, 10, W - 4, shade(base, 0.9));
  // Střešní nosič
  if (!look.wreck) for (let j = 3; j < W - 3; j += 3) p.rect(7, j, 8, 1, 0x1a1a1a);
  // Rezerva vzadu, nárazník vpředu
  p.ellipse(1, W / 2, 1, 3, 0x141414);
  p.rect(L - 2, 2, 2, W - 4, 0x3a3a3a);
  p.px(L - 1, 3, 0x6a6a6a);
  p.px(L - 1, W - 4, 0x6a6a6a);
  lights(p, L - 1, W, look.wreck);
  return p;
}

function tractor(look: CarLook): Painter {
  const L = 22;
  const W = 14;
  const p = new Painter(L, W, createRng(4));
  const c = look.wreck ? 0x2e2822 : 0x2f7d3a;
  // Velká zadní kola s dezénem, malá přední.
  for (const y of [0, W - 4]) {
    p.rect(1, y, 8, 4, 0x141414);
    for (let i = 1; i < 9; i += 2) p.px(i, y + (y ? 3 : 0), 0x3a3a3a);
    p.rect(15, y + (y ? 1 : 0), 4, 3, 0x141414);
  }
  // Kapota s mřížkou a výfukem
  p.rect(10, 4, 10, W - 8, c);
  p.rect(10, 4, 10, 1, shade(c, 1.3));
  p.rect(10, W - 5, 10, 1, shade(c, 0.7));
  for (let j = 5; j < W - 5; j += 2) p.rect(19, j, 1, 1, 0x1a1a1a);
  p.px(13, 6, 0x111111);
  // Kabina se střechou
  p.rect(2, 3, 8, W - 6, look.wreck ? 0x1a1614 : 0xd8d8d0);
  p.frame(2, 3, 8, W - 6, look.wreck ? 0x111 : 0x6a6a64);
  if (!look.wreck) p.rect(3, 4, 6, 1, 0xffffff);
  if (look.wreck) p.noise(1, 1, L - 2, W - 2, [0x1a1614, 0x5a3a22], 0.3);
  return p;
}

function scooter(look: CarLook): Painter {
  const p = new Painter(14, 7, createRng(5));
  const c = look.wreck ? 0x2e2822 : 0xc04ad0;
  p.rect(0, 2, 3, 3, 0x141414);
  p.rect(11, 2, 3, 3, 0x141414);
  p.rect(2, 1, 9, 5, shade(c, 0.6));
  p.rect(3, 1, 7, 5, c);
  p.rect(3, 1, 7, 1, shade(c, 1.3));
  p.rect(4, 2, 4, 3, 0x1e1e1e);
  p.rect(10, 0, 1, 7, 0x8a8a8a);
  if (!look.wreck) p.px(13, 3, 0xfff2b0);
  return p;
}

function bicycle(look: CarLook): Painter {
  const p = new Painter(14, 6, createRng(6));
  p.ellipse(2, 3, 2, 2, 0x141414);
  p.ellipse(11, 3, 2, 2, 0x141414);
  p.rect(2, 2, 10, 2, look.wreck ? 0x2e2822 : 0x3aa04a);
  p.rect(11, 0, 1, 6, 0x9a9a9a);
  p.rect(4, 2, 3, 2, 0x2a2a2a);
  return p;
}

/** Stín vozidla (podle obrysu, poloprůhledný). */
/**
 * Autobus shora (čelem doprava): bílá karoserie s modrým pruhem, okna po stranách,
 * klimatizace a poklopy na střeše; dveře vpravo (dole ve sprite), otevřené svítí.
 */
function bus(open: boolean): Painter {
  const L = 46;
  const W = 16;
  const p = new Painter(L, W, createRng(5));
  wheels(p, [6, 34], W, 5);
  body(p, 1, 1, L - 2, W - 2, 0xe8e6dc, false);
  // Okna po obou stranách (pruh těsně u okraje střechy).
  for (let x = 4; x < L - 7; x += 5) {
    p.rect(x, 2, 4, 1, 0x3a5a7a);
    p.rect(x, W - 3, 4, 1, 0x3a5a7a);
  }
  // Modrý pruh přes střechu a čelní sklo.
  p.rect(3, 6, L - 10, 1, 0x2f5fa8);
  p.rect(3, 9, L - 10, 1, 0x2f5fa8);
  glass(p, L - 5, 2, 3, W - 4, false);
  p.rect(L - 2, 4, 1, W - 8, 0xf2f0e8);
  // Klimatizace a poklopy.
  p.rect(16, 5, 9, 6, 0xb8b8b0);
  p.frame(16, 5, 9, 6, 0x8a8a84);
  p.rect(18, 7, 5, 2, 0x6a6a66);
  p.rect(6, 6, 4, 4, 0xc8c8c0);
  p.rect(31, 6, 4, 4, 0xc8c8c0);
  // Zadní motor a zpětná zrcátka.
  p.rect(1, 4, 2, W - 8, 0x4a4a4a);
  p.px(L - 4, 0, 0x2a2a2a);
  p.px(L - 4, W - 1, 0x2a2a2a);
  // Dveře vpravo (dole): přední a zadní.
  for (const x of [11, L - 12]) {
    p.rect(x, W - 2, 5, 2, open ? 0xffe8a0 : 0x6a6a64);
    if (open) p.rect(x + 1, W - 1, 3, 1, 0xfff6d0);
  }
  lights(p, L, W, false);
  return p;
}

function carShadow(len: number, w: number): Painter {
  const p = new Painter(len, w, createRng(7));
  p.rect(1, 0, len - 2, w, 0x000000, 0.45);
  p.rect(0, 1, len, w - 2, 0x000000, 0.45);
  return p;
}

export function generateVehicleSprites(scene: Phaser.Scene): void {
  CAR_PAINT.forEach((c, i) => add(scene, `osobak-${i}`, sedan({ body: c, wreck: false })));
  add(scene, 'osobak-wreck', sedan({ body: 0, wreck: true }));
  add(scene, 'policie-0', sedan({ body: 0, wreck: false, police: 'car', siren: false }));
  add(scene, 'policie-1', sedan({ body: 0, wreck: false, police: 'car', siren: true }));
  add(scene, 'policie-wreck', sedan({ body: 0, wreck: true }));
  add(scene, 'dodavka-0', van({ body: 0xe8e4da, wreck: false }));
  add(scene, 'dodavka-wreck', van({ body: 0, wreck: true }));
  add(scene, 'zasahovka-0', van({ body: 0, wreck: false, police: 'swat', siren: false }));
  add(scene, 'zasahovka-1', van({ body: 0, wreck: false, police: 'swat', siren: true }));
  add(scene, 'zasahovka-wreck', van({ body: 0, wreck: true }));
  add(scene, 'terenak-0', offroad({ body: 0x4f5a2a, wreck: false }));
  add(scene, 'terenak-wreck', offroad({ body: 0, wreck: true }));
  add(scene, 'traktor-0', tractor({ body: 0, wreck: false }));
  add(scene, 'traktor-wreck', tractor({ body: 0, wreck: true }));
  add(scene, 'skutr-0', scooter({ body: 0, wreck: false }));
  add(scene, 'skutr-wreck', scooter({ body: 0, wreck: true }));
  add(scene, 'kolo-0', bicycle({ body: 0, wreck: false }));
  add(scene, 'kolo-wreck', bicycle({ body: 0, wreck: true }));
  add(scene, 'autobus', bus(false));
  add(scene, 'autobus-open', bus(true));
  add(scene, 'shadow-autobus', carShadow(46, 16));
  const sizes: Record<string, [number, number]> = {
    osobak: [24, 12], policie: [24, 12], dodavka: [28, 13], zasahovka: [28, 13], terenak: [26, 13], traktor: [22, 14], skutr: [14, 7], kolo: [14, 6],
  };
  for (const [k, [l, w]] of Object.entries(sizes)) add(scene, `shadow-${k}`, carShadow(l, w));
}

// ================= Postavy =================

export type Hair = 'short' | 'long' | 'bald' | 'mohawk' | 'cap' | 'helmet' | 'beanie' | 'gray' | 'ponytail' | 'punkf';
export type Tool = 'none' | 'bat' | 'pistol' | 'long' | 'axe' | 'bottle' | 'sling' | 'knife';

export interface HumanLook {
  jacket: Color;
  pants: Color;
  hair: Hair;
  hairColor: Color;
  skin: Color;
  tool: Tool;
  /** Vzor na bundě: kostka (flanel), pruhy (tepláky), nášivky (punk). */
  pattern?: 'plaid' | 'stripes' | 'patches' | 'belly' | 'reflex';
}

const FW = 24;
const FH = 16;

/** Jeden snímek postavy shora (střed ramen v 8,8; čelem doprava). */
function human(p: Painter, ox: number, look: HumanLook, frame: number): void {
  const cx = ox + 8;
  const cy = 8;
  const belly = look.pattern === 'belly';
  p.ellipse(cx + 1, cy + 2, 4, 6, 0x000000, 0.28);
  // Nohy: při chůzi jedna noha vpředu a druhá vzadu (boty vykouknou zpod ramen).
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const shoe = 0x1a1410;
  for (const [side, dir] of [[-2, step], [2, -step]] as const) {
    const fx = cx - 1 + dir * 4;
    p.rect(fx, cy + side - 1, 3, 2, look.pants);
    if (dir !== 0) p.rect(fx + (dir > 0 ? 2 : 0), cy + side - 1, 1, 2, shoe);
  }
  // Trup: úzký zepředu dozadu, široký přes ramena.
  const rx = belly ? 4 : 3;
  p.ellipse(cx, cy, rx + 1, 6, shade(look.jacket, 0.45));
  p.ellipse(cx, cy, rx, 5, look.jacket);
  p.rect(cx - rx + 1, cy - 4, 2, 4, shade(look.jacket, 1.22));
  p.rect(cx + rx - 1, cy + 1, 1, 3, shade(look.jacket, 0.75));
  if (look.pattern === 'plaid') {
    for (let j = -4; j <= 4; j += 2) p.rect(cx - rx, cy + j, rx * 2 + 1, 1, 0x1a1a1a, 0.65);
    for (let i = -rx; i <= rx; i += 2) p.rect(cx + i, cy - 5, 1, 10, 0x1a1a1a, 0.45);
  } else if (look.pattern === 'stripes') {
    p.rect(cx - 1, cy - 5, 1, 10, 0xf2f2f2);
    p.rect(cx + 1, cy - 5, 1, 10, 0xf2f2f2, 0.6);
  } else if (look.pattern === 'reflex') {
    // Zásahový oblek: reflexní pruhy přes ramena.
    p.rect(cx - 2, cy - 5, 1, 10, 0xe8e040);
    p.rect(cx + 1, cy - 5, 1, 10, 0xd0d0c8);
  } else if (look.pattern === 'patches') {
    p.px(cx - 2, cy - 3, 0xd93f6a);
    p.px(cx - 1, cy + 3, 0xd93f6a);
    p.px(cx + 1, cy - 4, 0xe8e6da);
    p.px(cx, cy + 4, 0xc8c8c8);
  } else if (belly) {
    p.ellipse(cx + 2, cy, 2, 3, shade(look.jacket, 1.08));
  }
  // Ruce na koncích ramen: houpou se proti nohám; s nástrojem je přední ruka natažená.
  const swing = -step * 2;
  const sleeve = shade(look.jacket, 0.85);
  if (look.tool === 'none') {
    p.rect(cx - 1 + swing, cy - 7, 3, 2, sleeve);
    p.px(cx + 2 + swing, cy - 7, look.skin);
    p.rect(cx - 1 - swing, cy + 5, 3, 2, sleeve);
    p.px(cx + 2 - swing, cy + 6, look.skin);
  } else {
    p.rect(cx - 1, cy - 7, 3, 2, sleeve);
    p.px(cx + 2, cy - 7, look.skin);
    p.rect(cx + 1, cy + 2, 4, 2, sleeve);
    p.rect(cx + 5, cy + 2, 2, 2, look.skin);
    tool(p, cx + 6, cy + 2, look.tool);
  }
  // Hlava (menší než ramena) a vlasy
  p.ellipse(cx, cy, 2, 2, shade(look.skin, 0.7));
  p.rect(cx - 1, cy - 2, 3, 5, look.skin);
  p.rect(cx - 2, cy - 1, 5, 3, look.skin);
  p.px(cx - 1, cy - 1, shade(look.skin, 1.15));
  p.px(cx + 2, cy, shade(look.skin, 0.8));
  hair(p, cx, cy, look);
}

function hair(p: Painter, cx: number, cy: number, look: HumanLook): void {
  const c = look.hairColor;
  switch (look.hair) {
    case 'short':
      p.rect(cx - 2, cy - 1, 2, 3, c);
      p.rect(cx - 1, cy - 2, 2, 5, c);
      p.px(cx - 1, cy - 1, shade(c, 1.35));
      break;
    case 'long':
      p.rect(cx - 2, cy - 2, 3, 5, c);
      p.rect(cx - 4, cy - 2, 2, 5, c);
      p.px(cx - 4, cy + 3, shade(c, 0.8));
      p.px(cx - 1, cy - 1, shade(c, 1.35));
      break;
    case 'gray':
      p.rect(cx - 2, cy - 2, 2, 5, 0x9a9a9a);
      p.px(cx - 1, cy - 2, 0xc8c8c8);
      break;
    case 'mohawk':
      p.rect(cx - 3, cy, 6, 1, c);
      p.rect(cx - 3, cy - 1, 5, 1, shade(c, 1.35));
      p.px(cx - 4, cy, shade(c, 0.7));
      break;
    case 'cap':
      p.rect(cx - 2, cy - 2, 4, 5, c);
      p.rect(cx + 2, cy - 1, 2, 3, shade(c, 0.65));
      p.px(cx - 1, cy - 1, shade(c, 1.6));
      break;
    case 'helmet':
      p.rect(cx - 2, cy - 2, 5, 5, c);
      p.px(cx - 1, cy - 2, shade(c, 2));
      p.rect(cx + 2, cy - 1, 1, 3, 0x0a0a0a);
      break;
    case 'beanie':
      p.rect(cx - 2, cy - 2, 4, 5, c);
      p.px(cx - 3, cy, shade(c, 1.5));
      p.px(cx - 1, cy - 1, shade(c, 1.3));
      break;
    case 'bald':
      p.px(cx - 1, cy - 1, shade(look.skin, 1.3));
      break;
    case 'ponytail':
      // Vlasy sčesané dozadu a ohon (Slečna Kobyla).
      p.rect(cx - 2, cy - 2, 3, 5, c);
      p.rect(cx - 6, cy, 4, 1, c);
      p.px(cx - 7, cy, shade(c, 0.75));
      p.px(cx - 1, cy - 1, shade(c, 1.35));
      break;
    case 'punkf':
      // Číro a delší vlasy vzadu (hrdinka).
      p.rect(cx - 3, cy, 6, 1, c);
      p.rect(cx - 3, cy - 1, 5, 1, shade(c, 1.35));
      p.rect(cx - 5, cy - 1, 2, 3, c);
      p.px(cx - 5, cy + 2, shade(c, 0.7));
      break;
  }
}

function tool(p: Painter, x: number, y: number, t: Tool): void {
  switch (t) {
    case 'bat':
      p.rect(x, y, 9, 2, 0xb88a4a);
      p.rect(x + 6, y, 3, 2, 0xd0a060);
      break;
    case 'pistol':
      p.rect(x, y, 4, 2, 0x222222);
      p.px(x + 3, y, 0x555555);
      break;
    case 'long':
      p.rect(x - 2, y, 3, 2, 0x6a4a2a);
      p.rect(x + 1, y, 9, 2, 0x2a2a2a);
      p.px(x + 9, y, 0x555555);
      break;
    case 'axe':
      p.rect(x, y, 8, 1, 0x7a5a3a);
      p.rect(x + 6, y - 2, 3, 5, 0xc8c8c8);
      p.px(x + 8, y - 2, 0xffffff);
      break;
    case 'bottle':
      p.rect(x, y, 4, 2, 0x3a8a3a);
      p.px(x + 4, y, 0x9ad09a);
      break;
    case 'sling':
      p.rect(x, y - 1, 1, 4, 0x8a5a2a);
      p.rect(x + 1, y - 2, 3, 1, 0x8a5a2a);
      p.rect(x + 1, y + 2, 3, 1, 0x8a5a2a);
      break;
    case 'knife':
      p.rect(x, y, 2, 2, 0x3a2a1a);
      p.rect(x + 2, y, 3, 1, 0xd8d8d8);
      break;
    default:
  }
}

function sheet(look: HumanLook): Painter {
  const p = new Painter(FW * 3, FH, createRng(9));
  for (let f = 0; f < 3; f++) human(p, f * FW, look, f);
  return p;
}

const SKIN = [0xe8c39a, 0xd8a878, 0xf0d0b0, 0xc89068];

export const PLAYER_LOOK: HumanLook = { jacket: 0x1c1c1f, pants: 0x2a2a3a, hair: 'mohawk', hairColor: 0x3fbf4a, skin: SKIN[0], tool: 'none', pattern: 'patches' };

/** Civilisté: různé bundy, vlasy, pohlaví. Poslední dva jsou drsoni. */
export const CIVILIANS: HumanLook[] = [
  { jacket: 0x4a6a8a, pants: 0x2a3a4a, hair: 'short', hairColor: 0x5a3a22, skin: SKIN[0], tool: 'none' },
  { jacket: 0x8a4a6a, pants: 0x3a2a3a, hair: 'long', hairColor: 0x2a1a10, skin: SKIN[2], tool: 'none' },
  { jacket: 0xc8a040, pants: 0x4a4a3a, hair: 'gray', hairColor: 0x9a9a9a, skin: SKIN[1], tool: 'none' },
  { jacket: 0x5a7a3a, pants: 0x3a3a2a, hair: 'long', hairColor: 0xd8c070, skin: SKIN[2], tool: 'none' },
  { jacket: 0x6a3a2a, pants: 0x2a2a2a, hair: 'bald', hairColor: 0, skin: SKIN[3], tool: 'none' },
  { jacket: 0x2a2a2a, pants: 0x1a1a2a, hair: 'beanie', hairColor: 0x3a3a4a, skin: SKIN[1], tool: 'none' },
];

/** Postavy příběhu: každá jinak, ať se v hospodě poznají. */
const NPC_LOOKS: Record<string, HumanLook> = {
  kobyla: { jacket: 0x8a6a9a, pants: 0x4a3a5a, hair: 'ponytail', hairColor: 0x7a4a22, skin: SKIN[2], tool: 'none' },
  // Ajina, Zjebalova žena: růžový župan, natáčky; s pálkou, když hráč mlčí.
  ajina: { jacket: 0xe07aa8, pants: 0xe07aa8, hair: 'beanie', hairColor: 0xe8e0d0, skin: SKIN[1], tool: 'none', pattern: 'belly' },
  'ajina-bat': { jacket: 0xe07aa8, pants: 0xe07aa8, hair: 'beanie', hairColor: 0xe8e0d0, skin: SKIN[1], tool: 'bat', pattern: 'belly' },
  prchard: { jacket: 0xe8e4da, pants: 0x2a2a2a, hair: 'bald', hairColor: 0, skin: SKIN[1], tool: 'none', pattern: 'belly' },
  plotkova: { jacket: 0xc83a4a, pants: 0x1a1a1a, hair: 'long', hairColor: 0xe8c070, skin: SKIN[2], tool: 'bottle' },
  // Vesta: červená mikina (inside joke).
  vesta: { jacket: 0xc8302a, pants: 0x2a2a3a, hair: 'short', hairColor: 0x2a1a10, skin: SKIN[0], tool: 'none' },
  metejka: { jacket: 0xd8a020, pants: 0x3a3a4a, hair: 'short', hairColor: 0x1a1a1a, skin: SKIN[0], tool: 'none' },
  zjebal: { jacket: 0x2a2a2e, pants: 0x4a5a3a, hair: 'bald', hairColor: 0, skin: SKIN[2], tool: 'bottle' },
  dennyVysoky: { jacket: 0x3a5a8a, pants: 0x3a5a8a, hair: 'cap', hairColor: 0x8a2a1a, skin: SKIN[1], tool: 'none' },
  dennySochar: { jacket: 0x7a6a5a, pants: 0x5a4a3a, hair: 'long', hairColor: 0x5a5a5a, skin: SKIN[3], tool: 'none', pattern: 'patches' },
  kibi: { jacket: 0xe86ab0, pants: 0x1a1a3a, hair: 'short', hairColor: 0xd8c070, skin: SKIN[0], tool: 'none', pattern: 'stripes' },
};

const GANG_LOOKS: Record<string, HumanLook> = {
  hasici: { jacket: 0x2a3552, pants: 0x2a3552, hair: 'helmet', hairColor: 0xc8302a, skin: SKIN[1], tool: 'axe', pattern: 'reflex' },
  stamgasti: { jacket: 0xe8e0c0, pants: 0x4a4a4a, hair: 'gray', hairColor: 0x9a9a9a, skin: SKIN[3], tool: 'bottle', pattern: 'belly' },
  omladina: { jacket: 0x9a4ad0, pants: 0x6a2a9a, hair: 'cap', hairColor: 0x1a1a1a, skin: SKIN[0], tool: 'bat', pattern: 'stripes' },
};

export function generateHumanSprites(scene: Phaser.Scene): void {
  const sh = (key: string, look: HumanLook) => add(scene, key, sheet(look), { w: FW, n: 3 });
  sh('player', PLAYER_LOOK);
  sh('player-bat', { ...PLAYER_LOOK, tool: 'bat' });
  sh('player-pistol', { ...PLAYER_LOOK, tool: 'pistol' });
  sh('player-long', { ...PLAYER_LOOK, tool: 'long' });
  CIVILIANS.forEach((l, i) => sh(`ped-${i}`, l));
  sh('driver', CIVILIANS[0]);
  sh('cop', { jacket: 0x2a4a9a, pants: 0x1a2a5a, hair: 'cap', hairColor: 0x1a2a5a, skin: SKIN[0], tool: 'pistol' });
  sh('cop-swat', { jacket: 0x1a1a1e, pants: 0x1a1a1e, hair: 'helmet', hairColor: 0x2a2a2e, skin: SKIN[1], tool: 'long' });
  for (const [g, look] of Object.entries(GANG_LOOKS)) sh(`gang-${g}`, look);
  // Hrdinka: stejný punk, číro s delšími vlasy vzadu.
  const HEROINE: HumanLook = { ...PLAYER_LOOK, hair: 'punkf', jacket: 0x2a1c24 };
  sh('player-f', HEROINE);
  sh('player-f-bat', { ...HEROINE, tool: 'bat' });
  sh('player-f-pistol', { ...HEROINE, tool: 'pistol' });
  sh('player-f-long', { ...HEROINE, tool: 'long' });
  // Postavy příběhu (NPC.md).
  for (const [id, look] of Object.entries(NPC_LOOKS)) sh(`npc-${id}`, look);
  // Dealer Omyx: zelená mikina s pruhy, čepice.
  sh('dealer', { jacket: 0x2f6a2a, pants: 0x3a3a3a, hair: 'beanie', hairColor: 0xd8b030, skin: SKIN[1], tool: 'none', pattern: 'stripes' });

  // Divočák: tmavé štětinaté tělo, světlejší rypák s kly, nožky při běhu.
  const boar = new Painter(FW * 3, FH, createRng(13));
  for (let f = 0; f < 3; f++) {
    const cx = f * FW + 8;
    const step = f === 1 ? 1 : f === 2 ? -1 : 0;
    boar.ellipse(cx + 1, 10, 7, 4, 0x000000, 0.3);
    for (const [lx, side] of [[-4, -1], [4, 1]] as const) {
      boar.rect(cx + lx + step * 2 * side, 3, 2, 2, 0x2a1e16);
      boar.rect(cx + lx - step * 2 * side, 11, 2, 2, 0x2a1e16);
    }
    boar.ellipse(cx, 8, 7, 4, 0x3a2a1e);
    boar.ellipse(cx - 1, 7, 6, 3, 0x5a4230);
    boar.rect(cx - 6, 7, 11, 1, 0x2a1e16);
    boar.noise(cx - 6, 5, 12, 6, [0x6a5038, 0x2a1e16], 0.25);
    boar.rect(cx + 6, 6, 4, 4, 0x7a5a42);
    boar.px(cx + 9, 7, 0x2a1a12);
    boar.px(cx + 9, 8, 0x2a1a12);
    boar.px(cx + 8, 5, 0xf2eee0);
    boar.px(cx + 8, 10, 0xf2eee0);
    boar.px(cx + 5, 5, 0x1a1410);
    boar.px(cx + 5, 10, 0x1a1410);
    boar.px(cx - 7, 8, 0x3a2a1e);
  }
  add(scene, 'boar', boar, { w: FW, n: 3 });
  const deadBoar = new Painter(FW, FH, createRng(14));
  deadBoar.ellipse(10, 9, 9, 5, 0x6a0a0a, 0.7);
  deadBoar.ellipse(9, 8, 7, 4, 0x3a2a1e);
  deadBoar.rect(3, 4, 2, 3, 0x2a1e16);
  deadBoar.rect(10, 12, 2, 3, 0x2a1e16);
  deadBoar.rect(15, 6, 4, 4, 0x7a5a42);
  add(scene, 'boar-dead', deadBoar);

  // Mrtvola: tělo rozhozené na zemi v kaluži krve.
  const c = new Painter(FW, FH, createRng(11));
  c.ellipse(10, 9, 8, 5, 0x6a0a0a, 0.75);
  c.ellipse(12, 8, 5, 3, 0x8a1010, 0.8);
  c.ellipse(8, 8, 5, 3, 0x3a3a44);
  c.rect(4, 3, 4, 2, 0x3a3a44);
  c.rect(5, 12, 5, 2, 0x3a3a44);
  c.ellipse(14, 8, 3, 3, SKIN[0]);
  c.ellipse(13, 8, 2, 3, 0x4a3a2a);
  c.rect(1, 6, 3, 2, 0x2a2a3a);
  c.rect(1, 9, 3, 2, 0x2a2a3a);
  add(scene, 'corpse', c);
}

// ================= Efekty a stopy =================

export function generateEffectSprites(scene: Phaser.Scene): void {
  // Záblesk z hlavně
  const f = new Painter(9, 9, createRng(12));
  f.ellipse(4, 4, 4, 2, 0xffd23f, 0.9);
  f.ellipse(4, 4, 2, 4, 0xffd23f, 0.9);
  f.ellipse(4, 4, 2, 2, 0xffffff);
  add(scene, 'flash', f);
  // Krvavé skvrny (tři tvary)
  for (let i = 0; i < 3; i++) {
    const b = new Painter(12, 12, createRng(20 + i));
    b.blob(6, 6, 3 + i, 0x6a0808, i * 2, 0.85);
    for (let k = 0; k < 6; k++) b.px(Math.floor(b.rnd() * 12), Math.floor(b.rnd() * 12), 0x7a0a0a, 0.8);
    add(scene, `blood-${i}`, b);
  }
  // Ohnivá koule výbuchu: 6 snímků 40×40 (záblesk → oheň → kouř).
  const fb = new Painter(40 * 6, 40, createRng(40));
  for (let f = 0; f < 6; f++) {
    const cx = f * 40 + 20;
    const r = 6 + f * 3;
    const t = f / 5;
    if (f < 4) {
      fb.blob(cx, 20, r + 2, 0x5a2a1a, f * 1.7, 0.6 + 0.3 * (1 - t));
      fb.blob(cx, 20, r, 0xe0581a, f * 1.3);
      fb.blob(cx - 1, 19, r * 0.7, 0xffa030, f * 2.1);
      fb.blob(cx - 2, 18, r * 0.4, f < 2 ? 0xffffff : 0xfff2a0, f);
    } else {
      fb.blob(cx, 20, r, 0x3a3634, f * 1.1, 0.75 - (f - 4) * 0.25);
      fb.blob(cx - 2, 18, r * 0.6, 0x5a5654, f, 0.6 - (f - 4) * 0.2);
    }
    fb.noise(cx - r, 20 - r, r * 2, r * 2, [0xffd23f, 0x2a2420], 0.04);
  }
  add(scene, 'fireball', fb, { w: 40, n: 6 });

  // Stopa pneumatiky
  const s = new Painter(3, 3, createRng(30));
  s.rect(0, 0, 3, 3, 0x141414, 0.5);
  add(scene, 'skid', s);
  // Ohořelé místo po výbuchu
  const sc = new Painter(40, 40, createRng(31));
  sc.blob(20, 20, 14, 0x141210, 1.3, 0.55);
  sc.blob(20, 20, 9, 0x0a0806, 2.1, 0.6);
  sc.noise(4, 4, 32, 32, [0x2a2420, 0x3a2e24], 0.12, 0.6);
  add(scene, 'scorch', sc);
  void PAL;
}
