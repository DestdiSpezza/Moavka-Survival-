// Dlouhý běh bez hráče (fáze 9): N minut herního času zrychleně v prohlížeči.
// Počítá řetězce událostí, které propojí aspoň 3 systémy a hráč v nich nefiguruje.
//
// Použití: npm run build && npm run soak [-- minut]
// Potřebuje Playwright s Chromiem (npm i -g playwright && npx playwright install chromium).

const { spawn } = require('node:child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Chybí Playwright: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

const MINUTES = Number(process.argv[2] || 30);
const PORT = 4179;

async function waitForServer(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // ještě neběží
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server se nerozběhl: ' + url);
}

(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  const url = `http://localhost:${PORT}/`;
  let browser;
  try {
    await waitForServer(url, 20000);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive(), null, { timeout: 20000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game?.scene.getScene('Game')?.sys.isActive(), null, { timeout: 20000 });

    await page.evaluate(() => {
      const game = window.__game;
      const g = game.scene.getScene('Game');
      g.tutorial.update = () => g.registry.set('hint', null);
      // Vlastní smyčka: 60 kroků za herní sekundu, bez vykreslování.
      game.loop.sleep();
      game.scene.render = () => {};
      const soak = { t: performance.now(), chains: new Map(), kinds: {}, seen: new Set() };
      window.__soak = soak;
      // Hráč stojí v lese mimo dění, nesmrtelný; kamera ho sleduje.
      soak.park = () => {
        g.player.health = 100;
        g.player.body.reset(60, 500);
        g.player.body.setVelocity(0, 0);
        g.cameras.main.centerOn(60, 500);
        g.cameras.main.preRender();
      };
      soak.collect = () => {
        const log = g.eventLog;
        for (const e of log.all) {
          if (soak.seen.has(e.id)) continue;
          soak.seen.add(e.id);
          soak.kinds[e.kind] = (soak.kinds[e.kind] || 0) + 1;
        }
        for (const leaf of log.leaves()) {
          const chain = log.chain(leaf.id);
          if (chain.length < 2) continue;
          const systems = log.systemsOf(leaf.id);
          if (systems.has('player') || systems.size < 3) continue;
          const prev = soak.chains.get(chain[0].id);
          if (!prev || prev.length < chain.length) soak.chains.set(chain[0].id, { length: chain.length, systems: [...systems], kinds: chain.map((c) => c.kind) });
        }
      };
    });

    for (let m = 0; m < MINUTES; m++) {
      const r = await page.evaluate(() => {
        const game = window.__game;
        const g = game.scene.getScene('Game');
        const soak = window.__soak;
        for (let i = 0; i < 3600; i++) {
          if (i % 60 === 0) soak.park();
          soak.t += 1000 / 60;
          game.step(soak.t, 1000 / 60);
          if (i % 600 === 0) soak.collect();
        }
        soak.collect();
        return { clock: g.registry.get('gangs')?.clock ?? '', traffic: g.traffic.size, vehicles: g.vehicles.length, chains: soak.chains.size };
      });
      console.log(`minuta ${String(m + 1).padStart(2)}  ${r.clock}  provoz ${r.traffic}  aut ${r.vehicles}  řetězců ${r.chains}`);
    }

    const res = await page.evaluate(() => ({ kinds: window.__soak.kinds, chains: [...window.__soak.chains.values()] }));
    console.log('\nUdálosti:', JSON.stringify(res.kinds));
    console.log(`\nŘetězce se 3+ systémy bez hráče: ${res.chains.length}`);
    for (const c of res.chains.sort((a, b) => b.length - a.length).slice(0, 8)) {
      console.log(`  ${c.length}× [${c.systems.join(', ')}] ${c.kinds.join(' → ')}`);
    }
    if (errors.length) console.log('\nChyby:', errors.slice(0, 5));
    const ok = res.chains.length >= 1 && errors.length === 0;
    console.log(ok ? '\nOK' : '\nNESPLNĚNO');
    process.exitCode = ok ? 0 : 1;
  } finally {
    await browser?.close();
    server.kill();
  }
})();
