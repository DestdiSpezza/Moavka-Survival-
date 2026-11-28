import type Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;

/**
 * Rekvizity misí v eRku: sáček beskydského čaje, bankovka, vlečka za traktor
 * (prázdná a naložená), kusy lešení a vrata garáže.
 */
export function generateStoryProps(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: G) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  // Papírový sáček se zeleným lístkem.
  make('caj-balicek', 8, 9, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 2, 7, 7);
    g.fillStyle(0xc8a46a).fillRect(0, 1, 7, 7);
    g.fillStyle(0xa8844a).fillRect(0, 1, 7, 2);
    g.fillStyle(0x3fbf4a).fillRect(2, 4, 3, 2).fillRect(3, 3, 1, 4);
  });
  // Bankovka (dvoustovka, zelenkavá).
  make('bankovka', 10, 6, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 1, 10, 5);
    g.fillStyle(0x8ac07a).fillRect(0, 0, 10, 5);
    g.fillStyle(0x5a8a4a).fillRect(1, 1, 3, 3);
    g.fillStyle(0xe8f2d8).fillRect(6, 2, 3, 1);
  });
  // Vlečka shora, oj vlevo (k traktoru), čelem doprava jako vozidla.
  const trailer = (g: G, loaded: boolean) => {
    g.fillStyle(0x000000, 0.3).fillRect(5, 2, 24, 14);
    g.fillStyle(0x4a4a4a).fillRect(0, 7, 6, 2); // oj
    g.fillStyle(0x7a3a2a).fillRect(5, 1, 22, 14); // korba
    g.fillStyle(0x5a2a1a).fillRect(5, 1, 22, 2).fillRect(5, 13, 22, 2).fillRect(5, 1, 2, 14).fillRect(25, 1, 2, 14);
    g.fillStyle(0x1a1a1a).fillRect(12, 0, 6, 1).fillRect(12, 15, 6, 1); // kola
    if (loaded) {
      // Trubky a prkna lešení.
      g.fillStyle(0xb8b8c0);
      for (let y = 3; y <= 11; y += 2) g.fillRect(7, y, 18, 1);
      g.fillStyle(0xc89a5a).fillRect(8, 4, 16, 2).fillRect(9, 9, 15, 2);
      g.fillStyle(0xe8e040).fillRect(7, 7, 2, 2); // spojky
    }
  };
  make('vlecka', 28, 16, (g) => trailer(g, false));
  make('vlecka-plna', 28, 16, (g) => trailer(g, true));
  make('shadow-vlecka', 24, 14, (g) => g.fillStyle(0x000000, 0.35).fillRect(0, 0, 22, 14));
  // Kusy lešení (letí do vlečky): trubka a prkno.
  make('leseni-trubka', 14, 3, (g) => {
    g.fillStyle(0xb8b8c0).fillRect(0, 0, 14, 2);
    g.fillStyle(0xe8e8f0).fillRect(0, 0, 14, 1);
  });
  make('leseni-prkno', 12, 4, (g) => {
    g.fillStyle(0xc89a5a).fillRect(0, 0, 12, 3);
    g.fillStyle(0x9a6a3a).fillRect(0, 2, 12, 1);
  });
  // Hromada lešení u kostela.
  make('leseni-hromada', 20, 14, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 2, 19, 12);
    g.fillStyle(0xb8b8c0);
    for (let y = 1; y <= 11; y += 2) g.fillRect(0, y, 18, 1);
    g.fillStyle(0xc89a5a).fillRect(2, 3, 14, 2).fillRect(1, 8, 16, 2);
    g.fillStyle(0xe8e040).fillRect(15, 5, 2, 2).fillRect(3, 10, 2, 2);
  });
  // Autojeřáb shora (čelem doprava): žlutá kabina vpředu, rameno přes celou délku.
  make('jerab-0', 34, 15, (g) => {
    g.fillStyle(0x151515).fillRect(3, 0, 5, 2).fillRect(3, 13, 5, 2).fillRect(12, 0, 5, 2).fillRect(12, 13, 5, 2).fillRect(25, 0, 5, 2).fillRect(25, 13, 5, 2);
    g.fillStyle(0xd8b020).fillRect(1, 2, 32, 11);
    g.fillStyle(0xa88010).fillRect(1, 2, 32, 1).fillRect(1, 12, 32, 1);
    g.fillStyle(0x3a4a5a).fillRect(28, 4, 4, 7); // okno kabiny
    g.fillStyle(0x5a5a5a).fillRect(6, 6, 24, 3); // rameno
    g.fillStyle(0xe8e040).fillRect(6, 6, 24, 1);
    g.fillStyle(0x2a2a2a).fillRect(4, 5, 5, 5); // točna
    g.fillStyle(0xd83a3a).fillRect(1, 2, 2, 2).fillRect(1, 11, 2, 2);
  });
  make('jerab-wreck', 34, 15, (g) => {
    g.fillStyle(0x2a2420).fillRect(1, 2, 32, 11);
    g.fillStyle(0x1a1410).fillRect(6, 6, 24, 3);
  });
  make('shadow-jerab', 34, 15, (g) => g.fillStyle(0x000000, 0.35).fillRect(0, 1, 34, 14));

  // Vrata garáže (lamely).
  make('garaz-vrata', 32, 8, (g) => {
    g.fillStyle(0x8a8a90).fillRect(0, 0, 32, 8);
    g.fillStyle(0x6a6a70);
    for (let y = 1; y < 8; y += 2) g.fillRect(0, y, 32, 1);
  });

  // ---------- Mise Omladiny (ADR-037) ----------
  // Přčkovo BMW shora (čelem doprava): tmavě modré, ledvinky vpředu, modrobílé kolečko na kapotě.
  make('bmw', 26, 13, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(2, 2, 24, 11);
    g.fillStyle(0x111111).fillRect(4, 0, 4, 1).fillRect(17, 0, 4, 1).fillRect(4, 12, 4, 1).fillRect(17, 12, 4, 1);
    g.fillStyle(0x1e2a44).fillRect(1, 1, 24, 11);
    g.fillStyle(0x2a3a5a).fillRect(1, 1, 24, 1);
    g.fillStyle(0x6a8ab0).fillRect(15, 2, 3, 9).fillRect(5, 2, 2, 9); // skla
    g.fillStyle(0x3a4a6a).fillRect(7, 2, 8, 9); // střecha
    g.fillStyle(0xe8e8e8).fillCircle(21, 6.5, 1.5);
    g.fillStyle(0x3a7ad0).fillRect(20, 5, 1, 1).fillRect(21, 6, 1, 1);
    g.fillStyle(0x111111).fillRect(25, 4, 1, 2).fillRect(25, 7, 1, 2); // ledvinky
    g.fillStyle(0xfff2b0).fillRect(24, 1, 1, 2).fillRect(24, 10, 1, 2);
  });
  // Babeta Mini Vesty: červený moped bez jedné součástky.
  make('babeta', 14, 7, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 1, 13, 6);
    g.fillStyle(0x1a1a1a).fillRect(0, 2, 3, 3).fillRect(11, 2, 3, 3);
    g.fillStyle(0xc8302a).fillRect(3, 2, 8, 3);
    g.fillStyle(0xe8e8e8).fillRect(10, 1, 1, 5); // řídítka
    g.fillStyle(0x2a2a2a).fillRect(4, 2, 3, 3); // sedlo
  });
  // Zelený kanystr na naftu.
  make('kanystr', 7, 9, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 1, 7, 8);
    g.fillStyle(0x2a7a2a).fillRect(0, 1, 6, 8);
    g.fillStyle(0x1a5a1a).fillRect(1, 3, 4, 1).fillRect(1, 6, 4, 1);
    g.fillStyle(0xd8d040).fillRect(4, 0, 2, 2);
  });
  // Karel na zemi (skrýš): černý, lesklý, nepřehlédnutelný.
  make('karel', 13, 6, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 2, 13, 4);
    g.fillStyle(0x141418).fillRect(0, 1, 10, 3).fillRect(9, 0, 3, 5);
    g.fillStyle(0x4a4a58).fillRect(1, 1, 8, 1);
  });
  // Součástka na babetu (karburátor v igelitce).
  make('soucastka', 8, 7, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 1, 8, 6);
    g.fillStyle(0xe8e8f0, 0.8).fillRect(0, 0, 7, 6);
    g.fillStyle(0x8a8a90).fillRect(2, 2, 3, 2);
  });
  // Benzínka u obchodu v Raškovicích: stojan.
  make('pumpa', 8, 12, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(1, 2, 8, 10);
    g.fillStyle(0xd83a3a).fillRect(0, 0, 7, 11);
    g.fillStyle(0xe8e8e8).fillRect(1, 1, 5, 3);
    g.fillStyle(0x1a1a1a).fillRect(6, 5, 2, 1).fillRect(7, 5, 1, 5);
  });
  // Bagr Vysokého Dennyho shora (čelem doprava): pásy, žlutá kabina; rameno zvlášť.
  make('bagr', 26, 18, (g) => {
    g.fillStyle(0x000000, 0.35).fillRect(2, 2, 24, 16);
    g.fillStyle(0x2a2a2a).fillRect(0, 0, 24, 4).fillRect(0, 14, 24, 4);
    g.fillStyle(0x4a4a4a);
    for (let x = 1; x < 24; x += 3) g.fillRect(x, 1, 1, 2).fillRect(x, 15, 1, 2);
    g.fillStyle(0xe8b020).fillRect(3, 3, 18, 12);
    g.fillStyle(0xb88010).fillRect(3, 3, 18, 1);
    g.fillStyle(0x3a4a5a).fillRect(15, 5, 4, 4); // okno
    g.fillStyle(0x1a1a1a).fillRect(4, 11, 3, 3); // výfuk
  });
  // Rameno s lžící (otáčí se kolem levého konce).
  make('bagr-rameno', 26, 8, (g) => {
    g.fillStyle(0xd8a018).fillRect(0, 2, 20, 4);
    g.fillStyle(0x8a6a10).fillRect(0, 5, 20, 1);
    g.fillStyle(0x3a3a3a).fillRect(19, 0, 6, 8); // lžíce
    g.fillStyle(0x6a6a6a).fillRect(24, 0, 2, 8);
  });
  // Hrob: díra a hromada hlíny vedle; po zahrabání mohyla s křížkem z klacků.
  make('hrob', 20, 12, (g) => {
    g.fillStyle(0x5a3a1a).fillEllipse(10, 6, 20, 12);
    g.fillStyle(0x1a0e06).fillEllipse(10, 6, 14, 7);
  });
  make('hlina', 10, 8, (g) => {
    g.fillStyle(0x6a4a2a).fillEllipse(5, 4, 10, 8);
    g.fillStyle(0x8a6a3a).fillEllipse(4, 3, 5, 3);
  });
  make('mohyla', 20, 14, (g) => {
    g.fillStyle(0x000000, 0.3).fillEllipse(11, 8, 20, 11);
    g.fillStyle(0x6a4a2a).fillEllipse(10, 7, 20, 11);
    g.fillStyle(0x8a6a3a).fillEllipse(8, 5, 9, 4);
    g.fillStyle(0x5a3a1a).fillRect(15, 1, 2, 9).fillRect(12, 3, 8, 2); // křížek z klacků
  });
}
