import Phaser from 'phaser';
import { tap, touch } from '../input/touch';
import { pixelFont } from './BootScene';

interface Button {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  /** Drží se (true), nebo jen ťukne. */
  hold: boolean;
  circle: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
}

const STICK_R = 62;

/**
 * Dotykové ovladače přes hru (ADR-024): vlevo plovoucí joystick (kde se dotkneš,
 * tam vznikne), vpravo tlačítka. Při rozhovoru, pauze a v menu se schovají;
 * v obchodě se objeví čísla 1–5, v úvodní scéně „Přeskočit“.
 */
export class TouchScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private stickBase!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  private stickId = -1;
  private stickAt = { x: 0, y: 0 };
  private held = new Map<number, Button>();
  private numbers: Button[] = [];
  private skip!: Button;

  constructor() {
    super('Touch');
  }

  create(): void {
    const { width, height } = this.scale;
    this.input.addPointer(3);
    this.buttons = [];
    this.numbers = [];
    this.held.clear();
    this.stickId = -1;
    this.stickBase = this.add.circle(130, height - 120, STICK_R, 0xffffff, 0.08).setStrokeStyle(3, 0xffffff, 0.35);
    this.stickKnob = this.add.circle(130, height - 120, 26, 0xffffff, 0.3).setStrokeStyle(2, 0x000000, 0.4);
    const b = (id: string, x: number, y: number, r: number, label: string, hold: boolean, color = 0xffffff) => {
      const circle = this.add.circle(x, y, r, color, 0.18).setStrokeStyle(3, 0xffffff, 0.5);
      const text = this.add.text(x, y, label, pixelFont(r > 30 ? 18 : 14)).setOrigin(0.5).setStroke('#000', 4);
      const btn: Button = { id, x, y, r, label, hold, circle, text };
      return btn;
    };
    this.buttons.push(
      b('fire', width - 95, height - 95, 50, 'ÚTOK', true, 0xd83a3a),
      b('action', width - 205, height - 60, 38, 'E', false, 0xffd23f),
      b('sprint', width - 80, height - 215, 36, 'SPRINT', true),
      b('cycle', width - 190, height - 165, 32, 'ZBRAŇ', false),
      b('pause', width - 32, 214, 22, 'II', false),
    );
    for (let i = 0; i < 5; i++) this.numbers.push(b(String(i + 1), width / 2 - 160 + i * 80, height - 70, 30, String(i + 1), false, 0xffd23f));
    this.skip = b('skip', width - 110, height - 40, 30, 'PŘESKOČIT', false);
    this.skip.text.setFontSize(12);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.reset());
  }

  /** Co je teď vidět a dá se mačkat. */
  private mode(): 'hidden' | 'play' | 'menu' | 'cutscene' {
    const sm = this.scene.manager;
    const on = (k: string) => sm.isActive(k);
    if (on('Dialog') || on('Pause') || on('Settings') || on('Controls') || on('Title') || on('Hero')) return 'hidden';
    if (!on('Game') && !on('Pub')) return 'hidden';
    const cut = this.registry.get('cutscene') as { hint: string } | null | undefined;
    if (cut) return cut.hint ? 'cutscene' : 'hidden';
    if (on('Game') && this.registry.get('menu')) return 'menu';
    return 'play';
  }

  private visibleButtons(): Button[] {
    const m = this.mode();
    if (m === 'play') return this.buttons;
    if (m === 'cutscene') return [this.skip];
    if (m === 'menu') {
      const menu = this.registry.get('menu') as { lines: string[] } | null;
      return [...this.buttons.filter((x) => x.id !== 'fire' && x.id !== 'cycle'), ...this.numbers.slice(0, menu?.lines.length ?? 0)];
    }
    return [];
  }

  private down(p: Phaser.Input.Pointer): void {
    const btn = this.visibleButtons().find((x) => Phaser.Math.Distance.Between(p.x, p.y, x.x, x.y) < x.r * 1.25);
    if (btn) {
      if (btn.hold) {
        this.held.set(p.id, btn);
        this.setHold(btn.id, true);
      } else tap(btn.id);
      btn.circle.setFillStyle(btn.circle.fillColor, 0.45);
      this.time.delayedCall(120, () => btn.circle.setFillStyle(btn.circle.fillColor, 0.18));
      return;
    }
    const m = this.mode();
    if ((m === 'play' || m === 'menu') && this.stickId < 0 && p.x < this.scale.width * 0.45 && p.y > 180) {
      this.stickId = p.id;
      this.stickAt = { x: p.x, y: p.y };
      this.move(p);
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (p.id !== this.stickId) return;
    const dx = p.x - this.stickAt.x;
    const dy = p.y - this.stickAt.y;
    const len = Math.hypot(dx, dy);
    const k = len > STICK_R ? STICK_R / len : 1;
    touch.stickX = (dx * k) / STICK_R;
    touch.stickY = (dy * k) / STICK_R;
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id === this.stickId) {
      this.stickId = -1;
      touch.stickX = 0;
      touch.stickY = 0;
    }
    const btn = this.held.get(p.id);
    if (btn) {
      this.held.delete(p.id);
      this.setHold(btn.id, false);
    }
  }

  private setHold(id: string, on: boolean): void {
    if (id === 'fire') touch.fire = on;
    else if (id === 'sprint') touch.sprint = on;
  }

  private reset(): void {
    touch.stickX = 0;
    touch.stickY = 0;
    touch.fire = false;
    touch.sprint = false;
    this.held.clear();
    this.stickId = -1;
  }

  update(): void {
    // Ovladače musí být vždy nad hospodou i dialogem (ty se spouštějí později).
    const sm = this.scene.manager;
    if (sm.getIndex('Touch') !== sm.scenes.length - 1) this.scene.bringToTop();
    const m = this.mode();
    if (m === 'hidden' && (this.stickId >= 0 || this.held.size)) this.reset();
    const vis = new Set(this.visibleButtons());
    for (const btn of [...this.buttons, ...this.numbers, this.skip]) {
      btn.circle.setVisible(vis.has(btn));
      btn.text.setVisible(vis.has(btn));
    }
    // Sprint pěšky, ruční brzda v autě.
    const driving = !!this.registry.get('vehicle');
    const sprint = this.buttons.find((x) => x.id === 'sprint')!;
    sprint.text.setText(driving ? 'BRZDA' : 'SPRINT');
    const showStick = m === 'play' || m === 'menu';
    const { height } = this.scale;
    const cx = this.stickId >= 0 ? this.stickAt.x : 130;
    const cy = this.stickId >= 0 ? this.stickAt.y : height - 120;
    this.stickBase.setVisible(showStick).setPosition(cx, cy).setAlpha(this.stickId >= 0 ? 1 : 0.6);
    this.stickKnob.setVisible(showStick).setPosition(cx + touch.stickX * STICK_R, cy + touch.stickY * STICK_R);
  }
}
