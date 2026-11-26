/**
 * Dotykové ovládání (mobil, ADR-024). Stav sdílí TouchScene (kreslí joystick a tlačítka)
 * a hra (hráč, auto, boj, menu). Klávesnice a myš fungují dál; dotyk se jen přidává.
 */

export interface TouchState {
  /** Ovládání je zapnuté (dotykové zařízení nebo ?touch=1). */
  enabled: boolean;
  /** Joystick: -1..1, y dolů kladně. */
  stickX: number;
  stickY: number;
  /** Tlačítka, která se drží. */
  fire: boolean;
  sprint: boolean;
  /** V autě (ADR-032): plyn, brzda a couvání, ruční brzda, volant -1..1. */
  gas: boolean;
  brake: boolean;
  handbrake: boolean;
  steer: number;
  /** Zařazená zpátečka (PLYN couvá). */
  reverse: boolean;
}

export const touch: TouchState = { enabled: false, stickX: 0, stickY: 0, fire: false, sprint: false, gas: false, brake: false, handbrake: false, steer: 0, reverse: false };

/** Jednorázová ťuknutí (akce, zbraň, pauza, přeskočit, 1–5) a kdy přišla. */
const taps = new Map<string, number>();

export function tap(name: string): void {
  taps.set(name, performance.now());
}

/** Bylo ťuknuto (v posledních 300 ms)? Ťuknutí se tím spotřebuje. */
export function took(name: string): boolean {
  const at = taps.get(name);
  if (at === undefined) return false;
  taps.delete(name);
  return performance.now() - at < 300;
}

export function detectTouch(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('touch');
    if (q === '1') return true;
    if (q === '0') return false;
    // Hlavní ukazatel je prst (telefon, tablet); notebook s dotykovou obrazovkou a myší zůstane u myši.
    return matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * Celá obrazovka na mobilu: zkusí se při každém ťuknutí, dokud v ní hra není
 * (telefon ji ruší při zadávání jména, přepnutí aplikace nebo otočení). iPhone
 * v prohlížeči neumí; tam pomůže „Přidat na plochu“ (manifest s display: fullscreen).
 */
export function keepFullscreen(): void {
  const d = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  const isFull = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
  const go = () => {
    if (!touch.enabled || isFull()) return;
    try {
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
      void Promise.resolve(p)
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
        .catch(() => {});
    } catch {
      // Prohlížeč celou obrazovku neumí; hra jede i tak.
    }
  };
  window.addEventListener('pointerup', go, { passive: true });
  window.addEventListener('touchend', go, { passive: true });
}
