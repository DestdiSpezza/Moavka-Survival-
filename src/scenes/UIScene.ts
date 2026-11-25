import Phaser from 'phaser';
import { STAMINA_MAX } from '../systems/movement';
import { T } from '../texts/cs';
import { Tile } from '../world/tiles';
import { pixelFont } from './BootScene';
import { GROUP_IDS } from '../systems/respect';
import { GROUPS } from '../world/gangs';
import type { RespectHud } from './Gangs';
import type { AnnounceHud } from './Announcer';
import type { MenuHud } from './Economy';
import type { BoardHud, MissionHud } from './Missions';
import type { GoalHud } from './Progression';
import { type GameScene, MINIMAP, type PlayerHud, type VehicleHud } from './GameScene';

const HP_COLORS: Record<string, number> = { ok: 0x6fd16a, smoke: 0xe0b23a, fire: 0xe0442a };

/** HUD přes hru: minimapa, místo, dech, vozidlo (rychlost, stav), nápovědy a hlášky. */
export class UIScene extends Phaser.Scene {
  private zoneText!: Phaser.GameObjects.Text;
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private toastText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private carPanel!: Phaser.GameObjects.Container;
  private carName!: Phaser.GameObjects.Text;
  private carSpeed!: Phaser.GameObjects.Text;
  private carHp!: Phaser.GameObjects.Rectangle;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private armorBar!: Phaser.GameObjects.Rectangle;
  private moneyText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private crosshair!: Phaser.GameObjects.Graphics;
  private deathText!: Phaser.GameObjects.Text;
  private stars: Phaser.GameObjects.Text[] = [];
  private wantedText!: Phaser.GameObjects.Text;
  private announceText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private respectBars: Phaser.GameObjects.Rectangle[] = [];
  private respectValues: Phaser.GameObjects.Text[] = [];
  private respectNames: Phaser.GameObjects.Text[] = [];
  private clockText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private boardBox!: Phaser.GameObjects.Container;
  private boardTitle!: Phaser.GameObjects.Text;
  private boardPanel!: Phaser.GameObjects.Rectangle;
  private boardBody!: Phaser.GameObjects.Text;
  private missionTitle!: Phaser.GameObjects.Text;
  private missionObjective!: Phaser.GameObjects.Text;
  private arrow!: Phaser.GameObjects.Triangle;
  private hintText!: Phaser.GameObjects.Text;
  private lastZone = '';
  private wasExhausted = false;
  private wasInForest = false;

  constructor() {
    super('UI');
  }

  create(): void {
    const { width, height } = this.scale;
    const { x, y, w, h } = MINIMAP;
    // Tmavé panely pod HUDem (čitelnost na pestré mapě).
    const hudPanel = (px: number, py: number, pw: number, ph: number) =>
      this.add.rectangle(px, py, pw, ph, 0x0a0a10, 0.5).setOrigin(0).setStrokeStyle(1, 0x000000, 0.8);
    hudPanel(x - 6, y + h + 6, 262, 194);
    hudPanel(width - 232, 8, 224, 172);
    // Noc: tmavý závoj pod HUDem (HUD se kreslí až po něm, takže zůstane čitelný).
    this.add.rectangle(x - 2, y - 2, w + 4, h + 4).setOrigin(0).setStrokeStyle(3, 0xf2e9d0);
    this.zoneText = this.add.text(x, y + h + 10, '', pixelFont(18, '#ffd23f')).setStroke('#000', 3);

    this.add.text(x, y + h + 38, T.stamina, pixelFont(14)).setStroke('#000', 3);
    this.add.rectangle(x + 70, y + h + 41, 124, 12, 0x000000, 0.6).setOrigin(0);
    this.staminaBar = this.add.rectangle(x + 72, y + h + 43, 120, 8, 0x6fd16a).setOrigin(0);

    // Zdraví a vesta pod dechem.
    const bar = (label: string, row: number, color: number) => {
      this.add.text(x, y + h + 38 + row * 20, label, pixelFont(14)).setStroke('#000', 3);
      this.add.rectangle(x + 70, y + h + 41 + row * 20, 124, 12, 0x000000, 0.6).setOrigin(0);
      return this.add.rectangle(x + 72, y + h + 43 + row * 20, 120, 8, color).setOrigin(0);
    };
    this.healthBar = bar(T.health, 1, 0xd94040);
    this.armorBar = bar(T.armor, 2, 0x4a7ad9);

    // Peníze a zbraň vpravo nahoře.
    this.moneyText = this.add.text(width - 16, 16, '', pixelFont(24, '#6fd16a')).setOrigin(1, 0).setStroke('#000', 5);
    this.weaponText = this.add.text(width - 16, 50, '', pixelFont(18, '#f2e9d0')).setOrigin(1, 0).setStroke('#000', 3);
    this.ammoText = this.add.text(width - 16, 74, '', pixelFont(16, '#ffd23f')).setOrigin(1, 0).setStroke('#000', 3);
    this.scoreText = this.add.text(width - 16, 96, '', pixelFont(14, '#c8c0a8')).setOrigin(1, 0).setStroke('#000', 3);
    this.goalText = this.add.text(width - 16, 116, '', { ...pixelFont(13, '#c8c0a8'), align: 'right' }).setOrigin(1, 0).setStroke('#000', 3);

    // Zakázka: název a úkol pod hodinami, šipka k cíli na okraji obrazovky.
    this.missionTitle = this.add.text(width / 2, 70, '', pixelFont(16, '#ffd23f')).setOrigin(0.5, 0).setStroke('#000', 3);
    this.missionObjective = this.add.text(width / 2, 92, '', pixelFont(15, '#ffffff')).setOrigin(0.5, 0).setStroke('#000', 3);
    this.arrow = this.add.triangle(0, 0, 0, -9, 18, 0, 0, 9, 0xffd23f).setStrokeStyle(2, 0x000000).setVisible(false);

    // Nápovědy tutoriálu vlevo dole.
    this.hintText = this.add
      .text(16, height - 150, '', { ...pixelFont(15, '#ffffff'), wordWrap: { width: 330 }, backgroundColor: '#1a2a1acc', padding: { x: 10, y: 8 } })
      .setStroke('#000', 3);

    // Nabídka zakázek u zadavatele.
    const panel = this.add.rectangle(0, 0, 520, 250, 0x111111, 0.88).setOrigin(0.5, 0).setStrokeStyle(2, 0xf2e9d0);
    this.boardPanel = panel;
    this.boardTitle = this.add.text(0, 12, '', pixelFont(20, '#ffd23f')).setOrigin(0.5, 0).setStroke('#000', 3);
    this.boardBody = this.add.text(-245, 46, '', { ...pixelFont(14), wordWrap: { width: 490 }, lineSpacing: 4 });
    // Vpravo od panelu respektu, aby ho nezakrývala.
    this.boardBox = this.add.container(width / 2 + 110, 130, [panel, this.boardTitle, this.boardBody]).setVisible(false);

    this.crosshair = this.add.graphics().setDepth(100);
    this.deathText = this.add.text(width / 2, height / 2 - 40, T.died, pixelFont(64, '#d94040')).setOrigin(0.5).setStroke('#000', 8).setVisible(false);

    // Respekt u skupin: středová čárka = 0, doprava plus, doleva mínus.
    this.respectBars = [];
    this.respectValues = [];
    this.respectNames = [];
    const ry = y + h + 108;
    GROUP_IDS.forEach((id, i) => {
      const spec = GROUPS[id];
      const rowY = ry + i * 20;
      this.respectNames.push(this.add.text(x, rowY - 3, spec.name, pixelFont(14, spec.css)).setStroke('#000', 3));
      this.add.rectangle(x + 100, rowY, 124, 12, 0x000000, 0.6).setOrigin(0);
      this.add.rectangle(x + 162, rowY - 1, 2, 14, 0xf2e9d0).setOrigin(0.5, 0);
      this.respectBars.push(this.add.rectangle(x + 162, rowY + 2, 0, 8, spec.color).setOrigin(0, 0));
      this.respectValues.push(this.add.text(x + 230, rowY - 3, '0', pixelFont(14)).setStroke('#000', 3));
    });
    this.clockText = this.add.text(width / 2, 46, '', pixelFont(16, '#f2e9d0')).setOrigin(0.5, 0).setStroke('#000', 3);
    // Co policie ví (vpravo od hvězdiček).
    this.wantedText = this.add.text(width / 2 + 82, 22, '', pixelFont(14, '#9fc4ff')).setOrigin(0, 0.5).setStroke('#000', 3);
    // Obecní rozhlas a rádio: rámeček pod úkolem zakázky.
    this.announceText = this.add
      .text(width / 2, 122, '', { ...pixelFont(15, '#ffe9a0'), wordWrap: { width: 400 }, align: 'center', backgroundColor: '#1a1408d8', padding: { x: 12, y: 7 } })
      .setOrigin(0.5, 0)
      .setVisible(false);
    // Ladicí překryv F9: řetězce událostí.
    this.debugText = this.add
      .text(width - 16, 190, '', { ...pixelFont(12, '#c8ffc8'), wordWrap: { width: 470 }, backgroundColor: '#000000b0', padding: { x: 8, y: 6 } })
      .setOrigin(1, 0)
      .setVisible(false);

    // Hvězdičky hledanosti nahoře uprostřed.
    this.stars = [];
    for (let i = 0; i < 5; i++) {
      this.stars.push(this.add.text(width / 2 + (i - 2) * 30, 22, '★', pixelFont(26, '#ffd23f')).setOrigin(0.5).setStroke('#000', 3));
    }

    // Panel vozidla vpravo dole.
    const px = width - 220;
    const py = height - 110;
    this.carName = this.add.text(0, 0, '', pixelFont(16, '#ffd23f')).setStroke('#000', 3);
    this.carSpeed = this.add.text(0, 22, '', pixelFont(28)).setStroke('#000', 5);
    const hpBack = this.add.rectangle(0, 62, 204, 12, 0x000000, 0.6).setOrigin(0);
    this.carHp = this.add.rectangle(2, 64, 200, 8, 0x6fd16a).setOrigin(0);
    this.carPanel = this.add.container(px, py, [this.carName, this.carSpeed, hpBack, this.carHp]).setVisible(false);

    this.controlsText = this.add.text(width - 12, height - 12, T.controls, pixelFont(14, '#f2e9d0')).setOrigin(1).setStroke('#000', 3).setAlpha(0.8);
    this.promptText = this.add.text(width / 2, height / 2 + 40, '', pixelFont(16, '#ffffff')).setOrigin(0.5).setStroke('#000', 3);
    this.toastText = this.add.text(width / 2, height - 60, '', pixelFont(18, '#ffffff')).setOrigin(0.5).setStroke('#000', 3);

    const game = this.scene.get('Game');
    game.events.on('toast', (text: string) => this.say(text));
    game.events.on('banner', (text: string) => {
      this.deathText.setText(text).setColor(text === T.died ? '#d94040' : text === T.busted ? '#6a9aff' : '#ffd23f');
      this.deathText.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.deathText, alpha: 1, duration: 500, hold: 900, yoyo: true, onComplete: () => this.deathText.setVisible(false) });
    });
    this.events.once('shutdown', () => {
      game.events.off('toast');
      game.events.off('banner');
    });
  }

  update(): void {
    const game = this.scene.get('Game') as GameScene;
    const p = game.player;
    if (!p) return;

    const zone = (this.registry.get('zone') as string) ?? '';
    if (zone !== this.lastZone) {
      this.lastZone = zone;
      this.zoneText.setText(zone);
    }

    this.staminaBar.width = 120 * (p.move.stamina / STAMINA_MAX);
    this.staminaBar.fillColor = p.move.exhausted ? 0xd9534f : 0x6fd16a;
    if (p.move.exhausted && !this.wasExhausted) this.say(T.exhausted);
    this.wasExhausted = p.move.exhausted;

    const inForest = this.registry.get('tile') === Tile.ForestFloor;
    if (inForest && !this.wasInForest) this.say(T.forest);
    this.wasInForest = inForest;

    const car = this.registry.get('vehicle') as VehicleHud | null;
    this.carPanel.setVisible(!!car);
    this.controlsText.setText(car ? T.controlsCar : T.controls);
    if (car) {
      this.carName.setText(car.name);
      this.carSpeed.setText(`${car.kmh} ${T.kmh}`);
      this.carHp.width = 200 * car.hp;
      this.carHp.fillColor = HP_COLORS[car.state] ?? 0x6fd16a;
    }
    this.promptText.setText((this.registry.get('prompt') as string) ?? '');

    const me = this.registry.get('player') as PlayerHud | undefined;
    if (me) {
      this.healthBar.width = 120 * (me.health / 100);
      this.armorBar.width = 120 * (me.armor / 100);
      this.moneyText.setText(`${me.money.toLocaleString('cs-CZ')} ${T.currency}`);
      this.weaponText.setText(me.weapon);
      this.ammoText.setText(me.ammo === null ? '' : String(me.ammo));
    }

    if (me) this.scoreText.setText(`Skóre ${me.score.toLocaleString('cs-CZ')}`);
    this.updateMissionHud();
    const hint = this.registry.get('hint') as string | null;
    this.hintText.setVisible(!!hint && !this.boardBox.visible);
    if (hint) this.hintText.setText(`💡 ${hint}`).setY(this.scale.height - 95 - this.hintText.height);

    const gangs = this.registry.get('gangs') as RespectHud | undefined;
    if (gangs) {
      GROUP_IDS.forEach((id, i) => {
        const r = gangs.respect[id];
        this.respectNames[i].setText(gangs.names[id]);
        const bar = this.respectBars[i];
        // Záporný respekt roste doleva od středu.
        bar.width = Math.abs(r) * 0.6;
        bar.x = r >= 0 ? MINIMAP.x + 163 : MINIMAP.x + 162 - bar.width;
        this.respectValues[i].setText(`${r > 0 ? '+' : ''}${Math.round(r)}`).setColor(r <= -30 ? '#ff7a6a' : r >= 50 ? '#9fffa0' : '#f2e9d0');
      });
      this.clockText.setText(gangs.clock);
    }

    const wanted = this.registry.get('wanted') as { level: number; searching: boolean; desc?: string } | undefined;
    this.wantedText.setText(wanted?.desc ? `Hledají: ${wanted.desc}` : '');
    const ann = this.registry.get('announce') as AnnounceHud | null | undefined;
    const gameNow = (this.scene.get('Game') as GameScene).time.now / 1000;
    if (ann && gameNow < ann.until) {
      const prefix = ann.channel === 'rozhlas' ? '📢 Obecní rozhlas: ' : '📻 Rádio: ';
      this.announceText.setText(prefix + ann.text).setVisible(true).setColor(ann.channel === 'rozhlas' ? '#ffe9a0' : '#a0e4ff');
    } else {
      this.announceText.setVisible(false);
    }
    const dbg = this.registry.get('eventChains') as { lines: string[]; chains3: number; total: number } | undefined;
    const showDbg = !!this.registry.get('debugEvents') && !!dbg;
    this.debugText.setVisible(showDbg);
    if (showDbg && dbg) {
      this.debugText.setText(`UDÁLOSTI (F9) · záznamů ${dbg.total} · řetězců se 3+ systémy bez hráče: ${dbg.chains3}\n\n${dbg.lines.join('\n')}`);
    }
    const level = wanted?.level ?? 0;
    // Když tě policie zrovna nevidí, hvězdy blikají.
    const blink = wanted?.searching && Math.floor(this.time.now / 300) % 2 === 0;
    this.stars.forEach((s, i) => {
      const on = i < level;
      s.setColor(on ? '#ffd23f' : '#3a3a3a').setAlpha(on ? (blink ? 0.35 : 1) : level > 0 ? 0.7 : 0.25);
    });

    // Zaměřovač místo kurzoru.
    const ptr = this.input.activePointer;
    this.crosshair.clear().lineStyle(2, 0x000000, 0.8);
    this.crosshair.strokeCircle(ptr.x, ptr.y, 7);
    this.crosshair.lineStyle(1, 0xffffff, 1).strokeCircle(ptr.x, ptr.y, 7);
    this.crosshair.fillStyle(0xffffff).fillRect(ptr.x - 1, ptr.y - 1, 2, 2);
  }

  private updateMissionHud(): void {
    const goal = this.registry.get('goal') as GoalHud | undefined;
    if (goal) {
      this.goalText.setText(
        goal.met
          ? `${goal.area}: cíl splněn ✓${goal.next ? `\n→ ${goal.next} na severu` : ''}`
          : `Cíl ${goal.area}:\nskóre ${goal.score.toLocaleString('cs-CZ')} / ${goal.scoreGoal.toLocaleString('cs-CZ')}\npeníze ${goal.money.toLocaleString('cs-CZ')} / ${goal.moneyGoal.toLocaleString('cs-CZ')} Kč`,
      ).setColor(goal.met ? '#9fffa0' : '#c8c0a8');
    }

    const board = this.registry.get('board') as BoardHud | null;
    const menu = this.registry.get('menu') as MenuHud | null;
    this.boardBox.setVisible(!!board || !!menu);
    if (menu && !board) {
      this.boardTitle.setText(menu.title).setColor(menu.css);
      this.boardBody.setText(`${menu.lines.join('\n')}${menu.lines.length ? '\n\n' : ''}${menu.hint}`);
    }
    if (board) {
      this.boardTitle.setText(`${board.group}: zakázky`).setColor(board.css);
      this.boardBody.setText(
        board.refuse
          ? 'Táhni. S tebou nemluvíme. (Respekt pod −30)'
          : board.offers
              .map((o, i) => `[${i + 1}] ${o.tierName}: ${o.title}${o.done ? ' (už splněno)' : ''}\n    ${o.brief}`)
              .join('\n\n') + '\n\nVyber klávesou 1–3. Během zakázky ji X vzdá.',
      );
    }

    // Výška panelu podle textu (ať nezakrývá panel auta dole).
    if (this.boardBox.visible) this.boardPanel.setSize(520, this.boardBody.height + 64);

    const m = this.registry.get('mission') as MissionHud | null;
    const tierColor = { green: '#6fd16a', yellow: '#ffd23f', red: '#ff6a5a' };
    this.missionTitle.setText(m ? `ZAKÁZKA: ${m.title}` : '').setColor(m ? tierColor[m.tier] : '#ffd23f');
    this.missionObjective.setText(m?.objective ?? '');

    // Šipka na okraji obrazovky, když je cíl mimo záběr.
    const game = this.scene.get('Game') as GameScene;
    const cam = game.cameras.main;
    if (!m?.target) {
      this.arrow.setVisible(false);
      return;
    }
    const sx = (m.target.x - cam.worldView.x) * cam.zoom;
    const sy = (m.target.y - cam.worldView.y) * cam.zoom;
    const { width, height } = this.scale;
    const margin = 40;
    const inside = sx > margin && sx < width - margin && sy > margin && sy < height - margin;
    this.arrow.setVisible(!inside);
    if (!inside) {
      const cx = width / 2;
      const cy = height / 2;
      const angle = Math.atan2(sy - cy, sx - cx);
      const t = Math.min((width / 2 - margin) / Math.abs(Math.cos(angle) || 1e-6), (height / 2 - margin) / Math.abs(Math.sin(angle) || 1e-6));
      this.arrow.setPosition(cx + Math.cos(angle) * t, cy + Math.sin(angle) * t).setRotation(angle);
    }
  }

  private say(text: string): void {
    this.toastText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2200, duration: 600 });
  }
}
