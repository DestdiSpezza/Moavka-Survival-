import { Sound } from '../audio/Sound';
import { AnnouncerQueue, type Channel, ROZHLAS_FILLER } from '../systems/announcer';
import type { GameScene } from './GameScene';

export interface AnnounceHud {
  channel: Channel;
  text: string;
  until: number;
}

const SHOW_SECONDS = 7;

/**
 * Vesnický rozhlas (slyší ho hráč všude ve vsi) a rádio (jen v autě).
 * Hlásí skutečné události ze světa, aby se hráč dozvěděl, co se děje jinde.
 */
export class Announcer {
  private queue = new AnnouncerQueue();
  private fillerAt: number;

  constructor(private game: GameScene) {
    this.fillerAt = this.now + 100 + game.random() * 80;
  }

  private get now(): number {
    return this.game.time.now / 1000;
  }

  say(channel: Channel, text: string, key: string, cooldown = 90): void {
    this.queue.push({ channel, text, key }, this.now, cooldown);
  }

  update(): void {
    const now = this.now;
    if (now > this.fillerAt) {
      const i = Math.floor(this.game.random() * ROZHLAS_FILLER.length);
      this.say('rozhlas', ROZHLAS_FILLER[i], `filler-${i}`, 900);
      this.fillerAt = now + 170 + this.game.random() * 120;
    }
    const a = this.queue.next(now, SHOW_SECONDS);
    if (!a) return;
    // Rádio slyší hráč jen v autě; rozhlas po celé vsi.
    if (a.channel === 'radio' && !this.game.driving) return;
    if (a.channel === 'rozhlas') Sound.gong();
    else Sound.blip();
    this.game.registry.set('announce', { channel: a.channel, text: a.text, until: now + SHOW_SECONDS } satisfies AnnounceHud);
  }
}
