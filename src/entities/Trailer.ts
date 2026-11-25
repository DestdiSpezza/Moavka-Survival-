import Phaser from 'phaser';
import type { Vehicle } from './Vehicle';

/**
 * Vlečka za traktorem (ADR-023). Nemá vlastní fyziku: drží se za tažným zařízením
 * a natáčí se k němu (klasický „tažený bod“), takže v zatáčce zatáčí s kousek zpožděním
 * a při couvání se lomí. S ničím nekoliduje, jen jede za traktorem.
 */
export class Trailer {
  readonly sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  /** Vzdálenost středu vlečky od háku. */
  private readonly reach = 15;
  loaded = false;

  constructor(scene: Phaser.Scene, readonly tractor: Vehicle) {
    const hitch = this.hitch();
    const a = tractor.rotation;
    const x = hitch.x - Math.cos(a) * this.reach;
    const y = hitch.y - Math.sin(a) * this.reach;
    this.shadow = scene.add.image(x + 2, y + 3, 'shadow-vlecka').setDepth(7.85).setRotation(a);
    this.sprite = scene.add.image(x, y, 'vlecka').setDepth(7.9).setRotation(a);
  }

  /** Hák vzadu na traktoru. */
  hitch(): { x: number; y: number } {
    const t = this.tractor;
    const back = t.spec.length / 2 + 1;
    return { x: t.x - Math.cos(t.rotation) * back, y: t.y - Math.sin(t.rotation) * back };
  }

  /** Kde je ložná plocha (kam padá náklad). */
  get center(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setLoaded(on: boolean): void {
    this.loaded = on;
    this.sprite.setTexture(on ? 'vlecka-plna' : 'vlecka');
  }

  update(): void {
    const h = this.hitch();
    const s = this.sprite;
    // Vlečka se natočí k háku a drží od něj stálou vzdálenost.
    const a = Math.atan2(h.y - s.y, h.x - s.x);
    s.setPosition(h.x - Math.cos(a) * this.reach, h.y - Math.sin(a) * this.reach).setRotation(a);
    this.shadow.setPosition(s.x + 2, s.y + 3).setRotation(a);
    const alive = this.tractor.active && !this.tractor.wrecked;
    s.setVisible(alive);
    this.shadow.setVisible(alive);
  }

  ignoreOn(camera: Phaser.Cameras.Scene2D.Camera | undefined): void {
    camera?.ignore([this.sprite, this.shadow]);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
