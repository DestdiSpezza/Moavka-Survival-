import type Phaser from 'phaser';

/** Snímky chůze: stoj, krok levou, stoj, krok pravou. */
const CYCLE = [1, 0, 2, 0];

/**
 * Animace chůze podle ujeté vzdálenosti (rychlejší běh = rychlejší kroky).
 * Vrací novou fázi; sprite musí mít texturu se snímky 0, 1, 2.
 */
export function animateWalk(sprite: Phaser.Physics.Arcade.Sprite, phase: number, dt: number): number {
  const body = sprite.body as Phaser.Physics.Arcade.Body | null;
  if (!body || !body.enable) return phase;
  const speed = body.speed;
  if (speed < 6) {
    if (sprite.frame.name !== '0' && sprite.texture.has('0')) sprite.setFrame(0);
    return 0;
  }
  const next = phase + speed * dt;
  const f = CYCLE[Math.floor(next / 5) % CYCLE.length];
  if (sprite.texture.has(String(f))) sprite.setFrame(f);
  return next;
}
