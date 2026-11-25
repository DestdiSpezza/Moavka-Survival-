import { createRng } from '../systems/rng';
import { PAL, Painter } from './painter';

/** Bezešvá textura vody 32×32: hloubka, vlnky a odlesky (opakuje se, posouvá se po proudu). */
export function paintWater(): HTMLCanvasElement {
  const S = 32;
  const p = new Painter(S, S, createRng(5));
  p.rect(0, 0, S, S, PAL.water[0]);
  // Tmavší skvrny hloubky
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(p.rnd() * S);
    const y = Math.floor(p.rnd() * S);
    for (let k = 0; k < 4; k++) p.px((x + k) % S, y, PAL.water[2]);
  }
  p.noise(0, 0, S, S, [PAL.water[1], PAL.water[2]], 0.25);
  // Vlnky: krátké světlé čárky s tmavou spodní hranou (s přetečením přes okraj = bez švu).
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(p.rnd() * S);
    const y = Math.floor(p.rnd() * S);
    const len = 3 + Math.floor(p.rnd() * 4);
    for (let k = 0; k < len; k++) {
      p.px((x + k) % S, y, 0x6a9ccc);
      p.px((x + k) % S, (y + 1) % S, 0x1e4a74);
    }
    if (i % 3 === 0) p.px((x + 1) % S, (y + S - 1) % S, 0xc8e4f4);
  }
  return p.toCanvas();
}
