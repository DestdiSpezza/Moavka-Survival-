/** Omezí hodnotu do rozsahu <min, max>. Použije se mj. pro respekt (-100..100) a hledanost (0..5). */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new Error(`clamp: min (${min}) > max (${max})`);
  return Math.min(max, Math.max(min, value));
}
