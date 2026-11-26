import Phaser from 'phaser';
import { tap, touch } from '../input/touch';
import { wheelSteer } from '../systems/stick';
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
/** Volant vlevo dole (v autě, ADR-033): střed pod okrajem obrazovky, je vidět horní půlka. */
const WHEEL_X = 170;
const WHEEL_R = 125;
/** Jak moc se nakreslený volant otočí při plném rejdu. */
const WHEEL_TURN = 1.6;

/**
 * Dotykové ovladače přes hru (ADR-024): vlevo plovoucí joystick (kde se dotkneš,
 * tam vznikne), vpravo tlačítka. V autě (ADR-032) je vlevo volant (◀ ▶, jde po něm
 * přejet prstem) a vpravo PLYN, BRZDA, RUČKA. Při rozhovoru, pauze a v menu se schovají;
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
  private car: Button[] = [];
  private wheel!: Phaser.GameObjects.Container;
  private wheelId = -1;
  private wasDriving = false;
  private skip!: Button;

  constructor() {
    super('Touch');
  }

  create(): void {
    const { width, height } = this.scale;
    this.input.addPointer(3);
    this.buttons = [];
    this.numbers = [];
    this.car = [];
    this.wheelId = -1;
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
    this.car.push(
      b('gas', width - 95, height - 115, 60, 'PLYN', true, 0x3ad83a),
      b('brake', width - 235, height - 70, 46, 'BRZDA', true, 0xd83a3a),
      b('handbrake', width - 225, height - 195, 36, 'RUČKA', true),
      b('fire', width - 85, height - 270, 34, 'ÚTOK', true, 0xd83a3a),
      b('action', width - 345, height - 55, 32, 'E', false, 0xffd23f),
      b('reverse', width - 345, height - 160, 32, 'R', false, 0xff9a3a),
    );
    this.car[3].text.setFontSize(13);
    this.wheel = this.add.container(WHEEL_X, height + 12, [drawWheel(this)]).setVisible(false);
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
    if (on('Dialog') || on('Pause') || on('Settings') || on('Controls') || on('Title') || on('Hero') || on('Splash') || on('Prolog')) return 'hidden';
    if (!on('Game') && !on('Pub')) return 'hidden';
    const cut = this.registry.get('cutscene') as { hint: string } | null | undefined;
    if (cut) return cut.hint ? 'cutscene' : 'hidden';
    if (on('Game') && this.registry.get('menu')) return 'menu';
    return 'play';
  }

  private driving(): boolean {
    return !!this.registry.get('vehicle') && this.scene.manager.isActive('Game');
  }

  private visibleButtons(): Button[] {
    const m = this.mode();
    if (m === 'play') return this.driving() ? [...this.car, this.buttons.find((x) => x.id === 'pause')!] : this.buttons;
    if (m === 'cutscene') return [this.skip];
    if (m === 'menu') {
      const menu = this.registry.get('menu') as { lines: string[] } | null;
      return [...this.buttons.filter((x) => x.id !== 'fire' && x.id !== 'cycle'), ...this.numbers.slice(0, menu?.lines.length ?? 0)];
    }
    return [];
  }

  private down(p: Phaser.Input.Pointer): void {
    const btn = this.visibleButtons().find((x) => Phaser.Math.Distance.Between(p.x, p.y, x.x, x.y) < x.r * 1.25);
    if (btn?.id === 'reverse') {
      touch.reverse = !touch.reverse;
      return;
    }
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
    // Volant: prst kdekoli vlevo dole, rejd podle vzdálenosti od středu.
    if (m === 'play' && this.driving()) {
      if (this.wheelId < 0 && p.x < this.scale.width * 0.45 && p.y > 180) {
        this.wheelId = p.id;
        this.move(p);
      }
      return;
    }
    if ((m === 'play' || m === 'menu') && this.stickId < 0 && p.x < this.scale.width * 0.45 && p.y > 180) {
      this.stickId = p.id;
      this.stickAt = { x: p.x, y: p.y };
      this.move(p);
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (p.id === this.wheelId) {
      touch.steer = wheelSteer(p.x - WHEEL_X, p.y - (this.scale.height + 12));
      return;
    }
    if (p.id !== this.stickId) return;
    const dx = p.x - this.stickAt.x;
    const dy = p.y - this.stickAt.y;
    const len = Math.hypot(dx, dy);
    const k = len > STICK_R ? STICK_R / len : 1;
    touch.stickX = (dx * k) / STICK_R;
    touch.stickY = (dy * k) / STICK_R;
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id === this.wheelId) {
      this.wheelId = -1;
      touch.steer = 0;
    }
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
    else if (id === 'gas') touch.gas = on;
    else if (id === 'brake') touch.brake = on;
    else if (id === 'handbrake') touch.handbrake = on;
  }

  private reset(): void {
    touch.stickX = 0;
    touch.stickY = 0;
    touch.fire = false;
    touch.sprint = false;
    touch.gas = false;
    touch.brake = false;
    touch.handbrake = false;
    touch.steer = 0;
    touch.reverse = false;
    this.held.clear();
    this.stickId = -1;
    this.wheelId = -1;
  }

  update(): void {
    // Ovladače musí být vždy nad hospodou i dialogem (ty se spouštějí později).
    const sm = this.scene.manager;
    if (sm.getIndex('Touch') !== sm.scenes.length - 1) this.scene.bringToTop();
    const m = this.mode();
    const driving = this.driving();
    // Nastoupil/vystoupil nebo se ovladače schovaly: pustit všechno, ať auto nejede samo.
    if (driving !== this.wasDriving || (m === 'hidden' && (this.stickId >= 0 || this.wheelId >= 0 || this.held.size))) this.reset();
    this.wasDriving = driving;
    const vis = new Set(this.visibleButtons());
    for (const btn of [...this.buttons, ...this.numbers, ...this.car, this.skip]) {
      btn.circle.setVisible(vis.has(btn));
      btn.text.setVisible(vis.has(btn));
    }
    const showWheel = m === 'play' && driving;
    // Volant se otáčí s prstem a pomalu se vrací, zpátečka svítí, když je zařazená.
    this.wheel.setVisible(showWheel);
    const target = touch.steer * WHEEL_TURN;
    this.wheel.rotation += (target - this.wheel.rotation) * (this.wheelId >= 0 ? 0.5 : 0.2);
    this.wheel.setAlpha(this.wheelId >= 0 ? 0.95 : 0.7);
    const rev = this.car.find((x) => x.id === 'reverse')!;
    rev.circle.setFillStyle(rev.circle.fillColor, touch.reverse ? 0.75 : 0.18);
    rev.text.setText(touch.reverse ? 'R' : 'D');
    const showStick = (m === 'play' && !driving) || m === 'menu';
    const { height } = this.scale;
    const cx = this.stickId >= 0 ? this.stickAt.x : 130;
    const cy = this.stickId >= 0 ? this.stickAt.y : height - 120;
    this.stickBase.setVisible(showStick).setPosition(cx, cy).setAlpha(this.stickId >= 0 ? 1 : 0.6);
    this.stickKnob.setVisible(showStick).setPosition(cx + touch.stickX * STICK_R, cy + touch.stickY * STICK_R);
  }
}

/** Volant shora: věnec, tři ramena, střed s logem a značka nahoře. */
function drawWheel(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const R = WHEEL_R;
  g.lineStyle(26, 0x1a1a1a, 0.55).strokeCircle(0, 0, R);
  g.lineStyle(18, 0x3a3a3a, 0.7).strokeCircle(0, 0, R);
  g.lineStyle(2, 0xffffff, 0.35).strokeCircle(0, 0, R + 9);
  // Ramena: doleva, doprava a dolů (dolní půlka je pod okrajem).
  g.lineStyle(14, 0x2a2a2a, 0.65);
  for (const a of [Math.PI, 0, Math.PI / 2]) g.lineBetween(0, 0, Math.cos(a) * R, Math.sin(a) * R);
  g.fillStyle(0x2a2a2a, 0.8).fillCircle(0, 0, 34);
  g.fillStyle(0xd83a3a, 0.9).fillCircle(0, 0, 14);
  // Značka „rovně“ nahoře na věnci.
  g.fillStyle(0xffd23f, 0.95).fillRect(-6, -R - 11, 12, 22);
  return g;
}
