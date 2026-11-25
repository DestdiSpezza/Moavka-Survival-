import Phaser from 'phaser';
import { Sound } from '../audio/Sound';
import { choose, type Dialog, type DialogCtx, type DialogNode, optionEnabled, resolve } from '../story/dialog';
import { NPCS } from '../story/npcs';
import { fillText } from '../texts/gender';
import { pixelFont } from './BootScene';

export interface DialogData {
  dialog: Dialog;
  ctx: DialogCtx;
  /** Scéna, která během dialogu stojí (a po něm zase běží). */
  caller: string;
  /** Navazující dialog podle id (Prchard → Plotková, „ke štamgastům“ → náhodný Štamgast). */
  resolve: (id: string) => Dialog | null;
  onEnd: () => void;
}

const PANEL_H = 176;

/**
 * Dialogové okno: dole přes celou šířku, vlevo postavička mluvčího, jméno v barvě,
 * text a vždy tři volby (klávesy 1–3 nebo myš). Hra za ním stojí.
 */
export class DialogScene extends Phaser.Scene {
  private dlg!: DialogData;
  private node!: DialogNode;
  private portrait!: Phaser.GameObjects.Sprite;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private shownAt = 0;

  constructor() {
    super('Dialog');
  }

  init(data: DialogData): void {
    this.dlg = data;
  }

  create(): void {
    this.optionTexts = [];
    const { width, height } = this.scale;
    const top = height - PANEL_H - 10;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.25).setOrigin(0);
    this.add.rectangle(12, top, width - 24, PANEL_H, 0x14100c, 0.94).setOrigin(0).setStrokeStyle(2, 0xf2e9d0);
    // Postavička mluvčího ve čtverečku.
    this.add.rectangle(28, top + 16, 112, 112, 0x2a2218).setOrigin(0).setStrokeStyle(2, 0x6a5a44);
    this.portrait = this.add.sprite(84, top + 72, 'player').setScale(4).setOrigin(0.5).setRotation(Math.PI / 2);
    this.nameText = this.add.text(160, top + 14, '', pixelFont(20, '#ffd23f')).setStroke('#000', 4);
    this.bodyText = this.add.text(160, top + 42, '', { ...pixelFont(17, '#f2e9d0'), wordWrap: { width: width - 200 }, lineSpacing: 2 });
    for (let i = 0; i < 3; i++) {
      const t = this.add
        .text(176, 0, '', { ...pixelFont(16, '#ffffff'), wordWrap: { width: width - 220 } })
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setStroke('#ffd23f', 2));
      t.on('pointerout', () => t.setStroke('#000000', 0));
      t.on('pointerdown', () => this.pick(i));
      this.optionTexts.push(t);
    }
    const kb = this.input.keyboard!;
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => kb.on(`keydown-${k}`, () => this.pick(i)));
    ['NUMPAD_ONE', 'NUMPAD_TWO', 'NUMPAD_THREE'].forEach((k, i) => kb.on(`keydown-${k}`, () => this.pick(i)));
    this.show(resolve(this.dlg.dialog.start, this.dlg.ctx));
  }

  private show(id: string): void {
    const { ctx } = this.dlg;
    const node = this.dlg.dialog.nodes[id];
    this.node = node;
    node.enter?.(ctx);
    const top = this.scale.height - PANEL_H - 10;
    if (node.speaker === 'hero' || node.speaker === 'narrator') {
      this.portrait.setTexture(ctx.hero.gender === 'f' ? 'player-f' : 'player').setVisible(node.speaker === 'hero');
      this.nameText.setText(node.speaker === 'hero' ? ctx.hero.name : '').setColor('#9fffa0');
    } else {
      const npc = NPCS[node.speaker];
      this.portrait.setTexture(npc.sprite).setVisible(true);
      this.nameText.setText(npc.name).setColor(npc.css);
    }
    this.bodyText.setText(fillText(resolve(node.text, ctx), ctx.hero));
    let y = Math.max(top + 92, this.bodyText.y + this.bodyText.height + 10);
    node.options.forEach((o, i) => {
      const t = this.optionTexts[i];
      const enabled = optionEnabled(o, ctx);
      const cost = o.cost === undefined ? 0 : resolve(o.cost, ctx);
      const note = enabled ? '' : cost > ctx.money() ? '  (nemáš peníze)' : '  (teď ne)';
      t.setText(`[${i + 1}] ${fillText(resolve(o.text, ctx), ctx.hero)}${note}`).setColor(enabled ? '#ffffff' : '#7a7468').setY(y);
      y += t.height + 4;
    });
    this.shownAt = this.time.now;
  }

  private pick(i: number): void {
    // Krátká pauza proti omylem dvojitému stisku.
    if (this.time.now - this.shownAt < 180) return;
    const o = this.node.options[i];
    if (!o) return;
    const r = choose(o, this.dlg.ctx);
    if (!r) {
      this.cameras.main.shake(120, 0.004);
      return;
    }
    Sound.blip();
    if (r.next) {
      this.show(r.next);
      return;
    }
    // Navazující dialog jede ve stejném okně.
    const follow = r.then ? this.dlg.resolve(r.then) : null;
    if (follow) {
      this.dlg.dialog = follow;
      this.show(resolve(follow.start, this.dlg.ctx));
      return;
    }
    this.close();
  }

  private close(): void {
    const { caller, onEnd } = this.dlg;
    this.input.keyboard!.removeAllListeners();
    this.scene.stop();
    this.scene.resume(caller);
    onEnd();
  }
}
