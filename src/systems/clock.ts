/** Herní čas: 1 reálná sekunda = 2 herní minuty, den trvá 12 minut. Hra začíná v 16:00. */
export const GAME_MINUTES_PER_SECOND = 2;
export const START_MINUTE = 16 * 60;

export function minuteOfDay(elapsedSeconds: number): number {
  return Math.floor(START_MINUTE + elapsedSeconds * GAME_MINUTES_PER_SECOND) % (24 * 60);
}

export function formatClock(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Večer a noc (18:00–4:00): Štamgasti jsou agresivnější. */
export function isEvening(minute: number): boolean {
  const h = minute / 60;
  return h >= 18 || h < 4;
}

/** Jak moc ztmavit obraz (0 = den, 0.5 = hluboká noc), plynule přes soumrak a svítání. */
export function darkness(minute: number): number {
  const h = minute / 60;
  if (h >= 7 && h < 18) return 0;
  if (h >= 18 && h < 21) return ((h - 18) / 3) * 0.5;
  if (h >= 5 && h < 7) return ((7 - h) / 2) * 0.5;
  return 0.5;
}
