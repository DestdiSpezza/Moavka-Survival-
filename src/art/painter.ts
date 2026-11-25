/**
 * Pixelový štětec nad Canvas 2D: kreslí po jednotlivých pixelech a obdélnících
 * v celých souřadnicích, se seedovanou náhodou (stejná mapa = stejný obrázek).
 */
export type Color = number;

export function css(c: Color, alpha = 1): string {
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Zesvětlení (f > 1) nebo ztmavení (f < 1) barvy. */
export function shade(c: Color, f: number): Color {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (ch((c >> 16) & 0xff) << 16) | (ch((c >> 8) & 0xff) << 8) | ch(c & 0xff);
}

/** Míchání dvou barev (t = 0 → a, t = 1 → b). */
export function mix(a: Color, b: Color, t: number): Color {
  const ch = (s: number) => Math.round(((a >> s) & 0xff) * (1 - t) + ((b >> s) & 0xff) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Deterministický hash dvou souřadnic na číslo 0–1 (pro variace dlaždic). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class Painter {
  readonly data: Uint8ClampedArray<ArrayBuffer>;

  /** Kreslí do vlastního pixelového bufferu w×h; výsledek přenese `toCanvas()`. */
  constructor(
    readonly w: number,
    readonly h: number,
    readonly rnd: () => number,
  ) {
    this.data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  }

  px(x: number, y: number, c: Color, a = 1): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    const r = (c >> 16) & 0xff;
    const g = (c >> 8) & 0xff;
    const b = c & 0xff;
    if (a >= 1 || d[i + 3] === 0) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = Math.max(d[i + 3], Math.round(a * 255));
      if (a >= 1) d[i + 3] = 255;
      return;
    }
    d[i] = r * a + d[i] * (1 - a);
    d[i + 1] = g * a + d[i + 1] * (1 - a);
    d[i + 2] = b * a + d[i + 2] * (1 - a);
    d[i + 3] = Math.min(255, d[i + 3] + a * 255);
  }

  /** Vymaže pixel na průhledný (voda pod ním je vidět z animované vrstvy). */
  clear(x: number, y: number, w: number, h: number): void {
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) {
      this.data.fill(0, (j * this.w + Math.max(0, x)) * 4, (j * this.w + Math.min(this.w, x + w)) * 4);
    }
  }

  rect(x: number, y: number, w: number, h: number, c: Color, a = 1): void {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = 0; j < Math.round(h); j++) for (let i = 0; i < Math.round(w); i++) this.px(x + i, y + j, c, a);
  }

  /** Obrys obdélníku o tloušťce 1 px. */
  frame(x: number, y: number, w: number, h: number, c: Color, a = 1): void {
    this.rect(x, y, w, 1, c, a);
    this.rect(x, y + h - 1, w, 1, c, a);
    this.rect(x, y + 1, 1, h - 2, c, a);
    this.rect(x + w - 1, y + 1, 1, h - 2, c, a);
  }

  /** Plocha s náhodným šumem z palety. */
  noise(x: number, y: number, w: number, h: number, colors: readonly Color[], density: number, a = 1): void {
    const n = Math.round(w * h * density);
    for (let i = 0; i < n; i++) {
      this.px(x + Math.floor(this.rnd() * w), y + Math.floor(this.rnd() * h), colors[Math.floor(this.rnd() * colors.length)], a);
    }
  }

  /** Šachovnicový dithering (přechod mezi barvami v pixel artu). */
  dither(x: number, y: number, w: number, h: number, c: Color, a = 1): void {
    for (let j = 0; j < h; j++) for (let i = (j + x + y) & 1; i < w; i += 2) this.px(x + i, y + j, c, a);
  }

  /** Vyplněná elipsa po pixelech. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color, a = 1): void {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const half = Math.round(rx * Math.sqrt(t));
      this.rect(cx - half, cy + y, half * 2 + 1, 1, c, a);
    }
  }

  /** Nepravidelná kapka (koruna stromu, keř). */
  blob(cx: number, cy: number, r: number, c: Color, wobble: number, a = 1): void {
    const R = Math.ceil(r + 2);
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        const ang = Math.atan2(y, x);
        const rr = r + Math.sin(ang * 5 + wobble) * 1.1 + Math.cos(ang * 3 - wobble) * 0.7;
        if (x * x + y * y <= rr * rr) this.px(cx + x, cy + y, c, a);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color, a = 1): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
  }

  /** Výsledek jako canvas (pro Phaser textury). */
  toCanvas(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(this.w, this.h);
    ctx.putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return canvas;
  }
}

/** Nové plátno dané velikosti. */
export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Paleta: tlumené, mírně špinavé barvy středoevropské vesnice. */
export const PAL = {
  grass: [0x4c7a34, 0x56863a, 0x436d2e, 0x5f9142, 0x3b6129],
  grassDark: 0x355a26,
  flower: [0xe8d24a, 0xf2f0e8, 0xd86a8a, 0x9a8ad8],
  dirt: [0x8a6a44, 0x7d5f3c, 0x967650, 0x6f5435, 0xa3845c],
  forest: [0x2f4f26, 0x284520, 0x36592b, 0x4a3a22, 0x223d1c],
  asphalt: [0x4a4a4f, 0x45454a, 0x515157, 0x3f3f44, 0x57575d],
  pavement: [0x9a968e, 0x8f8b83, 0xa5a198],
  pavementSeam: 0x75716a,
  curb: 0xc2beb4,
  rock: [0x76726b, 0x6a665f, 0x827e76, 0x5e5a54, 0x8e8a82],
  water: [0x2a5f93, 0x2f6aa1, 0x24557f],
  foam: 0xb8d8ec,
  plank: [0x7a5a3a, 0x6d4f32, 0x86643f],
  concrete: [0xa29e94, 0x96928a, 0xaeaa9f],
  lineWhite: 0xe8e6da,
  lineYellow: 0xd8b838,
  shadow: 0x000000,
} as const;
