// Playtest v prohlížeči (Playwright + Chromium). Spuštění: npm run build && node scripts/playtest/logo-prolog.cjs
// Snímky obrazovky jdou do playtest-out/logo-prolog/ (není v gitu).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest-out', 'logo-prolog');
require('node:fs').mkdirSync(OUT, { recursive: true });
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4189', '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://localhost:4189/')).ok) break; } catch {} await sleep(200); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack));
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const active = (k) => page.evaluate((k) => window.__game.scene.getScene(k)?.sys.isActive() ?? false, k);
  await page.goto('http://localhost:4189/');
  await page.waitForFunction(() => window.__game?.scene.getScene('Splash')?.sys.isActive(), null, { timeout: 20000 });
  await sleep(1800); await shot('01-logo');
  // Tři obrazovky s upozorněním (ADR-036).
  await sleep(2900); await shot('01a-postavy');
  await sleep(3400); await shot('01b-hlasy');
  await sleep(4300); await shot('01c-neposerte');
  await page.waitForFunction(() => window.__game.scene.getScene('Title')?.sys.isActive(), null, { timeout: 12000 });
  await sleep(1200); await shot('02-titul');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.getScene('Prolog')?.sys.isActive(), null, { timeout: 5000 });
  for (let i = 0; i < 6; i++) { await sleep(3400); await shot(`03-prolog-${i}`); }
  await page.waitForFunction(() => window.__game.scene.getScene('Hero')?.sys.isActive(), null, { timeout: 8000 });
  console.log('hero ok', await active('Hero'), 'errors', JSON.stringify(errors));
  await browser.close(); server.kill();
})();
