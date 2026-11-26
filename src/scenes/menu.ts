import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { pixelFont } from './BootScene';

export interface MenuItem {
  label: () => string;
  /** Enter / mezerník. */
  action?: () => void;
  /** A/D nebo šipky do stran (např. hlasitost). */
  adjust?: (dir: 1 | -1) => void;
}

/**
 * Svislé menu ovládané klávesnicí: W/S nebo šipky vybírají, Enter/mezerník potvrdí,
 * A/D mění hodnotu. Vybraná položka je žlutá se šipkou.
 */
export function createMenu(scene: Phaser.Scene, x: number, y: number, items: MenuItem[], gap = 34): () => void {
  let index = 0;
  const texts = items.map((_, i) => scene.add.text(x, y + i * gap, '', pixelFont(20)).setOrigin(0.5).setStroke('#000', 5));
  const render = () =>
    texts.forEach((t, i) => {
      const on = i === index;
      t.setText(`${on ? '▶ ' : ''}${items[i].label()}${on ? ' ◀' : ''}`).setColor(on ? '#ffd23f' : '#f2e9d0');
    });
  render();
  // Ťuknutí (mobil) i klik myší: vybere položku a potvrdí ji; u nastavitelných
  // hodnot levá polovina ubere, pravá přidá.
  texts.forEach((t, i) => {
    t.setInteractive({ useHandCursor: true });
    t.on('pointerdown', (p: Phaser.Input.Pointer) => {
      Sound.unlock();
      index = i;
      const it = items[i];
      if (it.adjust && !it.action) it.adjust(p.x < t.x ? -1 : 1);
      else it.action?.();
      if (scene.sys.isActive()) render();
    });
  });
  const kb = scene.input.keyboard!;
  const move = (d: number) => {
    index = (index + d + items.length) % items.length;
    Sound.blip();
    render();
  };
  const handler = (e: KeyboardEvent) => {
    Sound.unlock();
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') move(-1);
    else if (k === 'arrowdown' || k === 's') move(1);
    else if (k === 'arrowleft' || k === 'a') items[index].adjust?.(-1);
    else if (k === 'arrowright' || k === 'd') items[index].adjust?.(1);
    else if (k === 'enter' || k === ' ') items[index].action?.();
    else return;
    render();
  };
  kb.on('keydown', handler);
  scene.events.once('shutdown', () => kb.off('keydown', handler));
  return render;
}

/** Tmavý podklad přes celou obrazovku pro překryvná menu. */
export function dim(scene: Phaser.Scene, alpha = 0.75): void {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, 0x0a0a10, alpha).setOrigin(0);
}
