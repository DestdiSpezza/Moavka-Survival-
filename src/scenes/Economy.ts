import Phaser from 'phaser';
import { TILE } from '../config';
import { Sound } from '../audio/Sound';
import { pickupWeapon, type WeaponId } from '../systems/combat';
import {
  canAfford, HIDEOUT_PRICE, repairCost, RESPRAY_MAX_LEVEL, resprayCost, sellPrice, SHOP,
} from '../systems/economy';
import { newWanted } from '../systems/wanted';
import { findFreeTile } from '../world/pickups';
import { pixelFont } from './BootScene';
import type { GameScene } from './GameScene';

type PlaceKind = 'garage' | 'shop' | 'hideout';

interface Place {
  kind: PlaceKind;
  at: { x: number; y: number };
  marker: Phaser.GameObjects.Container;
}

interface Option {
  label: string;
  enabled: boolean;
  run: () => void;
}

export interface MenuHud {
  title: string;
  css: string;
  lines: string[];
  hint: string;
}

const RANGE = 20;

/**
 * Kde utrácet: garáž (oprava, přelakování, prodej auta), obchod „pod pultem“
 * (zbraně, vesta, lékárnička) a chata v lese (koupě, uložení hry, spánek).
 */
export class Economy {
  menuOpen = false;
  private places: Place[] = [];
  private keys: Phaser.Input.Keyboard.Key[];

  constructor(private game: GameScene) {
    const map = game.world;
    const taken = new Set<string>();
    const door = (name: string, dx = 0) => {
      const b = map.buildings.find((x) => x.name === name)!;
      const t = findFreeTile(map, b.x + Math.floor(b.w / 2) + dx, b.y + b.h, taken);
      return { x: (t.tx + 0.5) * TILE, y: (t.ty + 0.5) * TILE };
    };
    this.addPlace('garage', door('Garáž'), 'GARÁŽ', 0x8a8a9a);
    this.addPlace('shop', door('Obchod', -2), 'POD PULTEM', 0xd8b030);
    this.addPlace('hideout', door('Chata'), 'CHATA', 0x7a5236);
    const kb = game.input.keyboard!;
    this.keys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].map((k) => kb.addKey(k));
  }

  private addPlace(kind: PlaceKind, at: { x: number; y: number }, name: string, color: number): void {
    const g = this.game;
    const ring = g.add.rectangle(0, 0, 16, 16, color, 0.35).setStrokeStyle(2, color);
    const label = g.add.text(0, -16, name, pixelFont(14, '#f2e9d0')).setOrigin(0.5).setScale(0.5).setStroke('#000', 4);
    const marker = g.add.container(at.x, at.y, [ring, label]).setDepth(5);
    g.tweens.add({ targets: ring, angle: 90, duration: 2000, repeat: -1 });
    g.cameras.getCamera('minimap')?.ignore(marker);
    this.places.push({ kind, at, marker });
  }

  update(): void {
    const g = this.game;
    const focus = g.driving ?? g.player;
    const here = g.player.dead || g.missions.active
      ? undefined
      : this.places.find((p) => Phaser.Math.Distance.Between(focus.x, focus.y, p.at.x, p.at.y) < RANGE + (g.driving ? 10 : 0));
    const menu = here ? this.menuFor(here.kind) : null;
    this.menuOpen = !!menu;
    if (!menu) {
      g.registry.set('menu', null);
      return;
    }
    g.registry.set('menu', {
      title: menu.title, css: '#ffd23f', hint: menu.hint,
      lines: menu.options.map((o, i) => `[${i + 1}] ${o.label}${o.enabled ? '' : '  ✗'}`),
    } satisfies MenuHud);
    this.keys.forEach((k, i) => {
      const o = menu.options[i];
      if (Phaser.Input.Keyboard.JustDown(k) && o) {
        if (o.enabled) o.run();
        else g.toast('To teď nejde (peníze, hvězdy, nebo nejsi ve správném autě).');
      }
    });
  }

  private menuFor(kind: PlaceKind): { title: string; hint: string; options: Option[] } | null {
    const g = this.game;
    const pl = g.player;
    if (kind === 'garage') {
      const v = g.driving;
      if (!v) return { title: 'Garáž', hint: 'Přijeď autem: oprava, přelakování, výkup.', options: [] };
      const repair = repairCost(v.hp, v.spec.maxHp);
      const level = g.police.wanted.level;
      const respray = resprayCost(level);
      const price = sellPrice(v.spec.kind, v.hp / v.spec.maxHp);
      return {
        title: `Garáž: ${v.spec.name}`,
        hint: g.police.seen ? 'Fízlové koukají, přelakovat teď nejde.' : 'Mechanik se na nic neptá.',
        options: [
          { label: repair ? `Opravit (${repair} Kč)` : 'Opravit (není co)', enabled: repair > 0 && canAfford(pl.money, repair), run: () => this.repair(repair) },
          {
            label: `Přelakovat a zmizet (${respray} Kč, do ${RESPRAY_MAX_LEVEL} hvězd)`,
            enabled: level > 0 && level <= RESPRAY_MAX_LEVEL && !g.police.seen && canAfford(pl.money, respray),
            run: () => this.respray(respray),
          },
          { label: `Prodat auto (${price} Kč)`, enabled: !v.wrecked, run: () => this.sell(price) },
        ],
      };
    }
    if (g.driving) return null;
    if (kind === 'shop') {
      return {
        title: 'Obchod: pod pultem',
        hint: 'Prodavačka: „Já nic, já muzikant.“',
        options: SHOP.map((item) => ({
          label: `${item.name} (${item.price} Kč)`,
          enabled: canAfford(pl.money, item.price),
          run: () => this.buy(item.id, item.price, item.name),
        })),
      };
    }
    const owned = g.progress.hideouts.includes(g.area.id);
    if (!owned) {
      return {
        title: 'Chata v lese',
        hint: 'Klid, krb, žádný signál. Ideální úkryt.',
        options: [{ label: `Koupit chatu (${HIDEOUT_PRICE} Kč)`, enabled: canAfford(pl.money, HIDEOUT_PRICE), run: () => this.buyHideout() }],
      };
    }
    return {
      title: 'Tvoje chata',
      hint: 'Tady tě nikdo nenajde. Snad.',
      options: [
        { label: 'Uložit hru', enabled: true, run: () => g.saveGame(true) },
        { label: 'Vyspat se (zdraví, +8 hodin, uloží)', enabled: g.police.wanted.level === 0, run: () => this.sleep() },
      ],
    };
  }

  private repair(cost: number): void {
    const v = this.game.driving!;
    this.game.player.money -= cost;
    v.repair();
    this.game.toast('Opraveno. Mechanik našel v kufru tři ježky.');
  }

  private respray(cost: number): void {
    const g = this.game;
    g.player.money -= cost;
    g.driving!.setTint(Phaser.Display.Color.RandomRGB(80, 230).color);
    g.police.clear();
    g.police.wanted = newWanted();
    g.toast('Přelakováno. Fízlové hledají úplně jiné auto.');
  }

  private sell(price: number): void {
    const g = this.game;
    const v = g.driving!;
    g.exitVehicle();
    g.removeVehicle(v);
    g.player.money += price;
    g.toast(`Garáž vykoupila auto za ${price} Kč. Bez papírů, bez otázek.`);
  }

  private buy(id: WeaponId | 'vest' | 'medkit', price: number, name: string): void {
    const pl = this.game.player;
    pl.money -= price;
    Sound.pickup();
    if (id === 'vest') pl.armor = 100;
    else if (id === 'medkit') pl.health = Math.min(100, pl.health + 50);
    else {
      pl.arsenal = pickupWeapon(pl.arsenal, id);
      pl.updateLook();
    }
    this.game.toast(`Koupeno: ${name}.`);
  }

  private buyHideout(): void {
    const g = this.game;
    g.player.money -= HIDEOUT_PRICE;
    g.progress.hideouts.push(g.area.id);
    g.saveGame(false);
    g.toast('Chata je tvoje. Tady můžeš ukládat hru a spát.');
  }

  private sleep(): void {
    const g = this.game;
    g.player.health = 100;
    g.gangs.skipHours(8);
    g.cameras.main.fadeOut(400, 0, 0, 0);
    g.cameras.main.once('camerafadeoutcomplete', () => g.cameras.main.fadeIn(800));
    g.saveGame(false);
    g.toast('Vyspal ses. Hlava třeští méně než obvykle.');
  }
}
