// Playtest v prohlížeči (Playwright + Chromium). Spuštění: npm run build && node scripts/playtest/akt1-uvod.cjs
// Snímky obrazovky jdou do playtest-out/akt1-uvod/ (není v gitu).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest-out', 'akt1-uvod');
require('node:fs').mkdirSync(OUT, { recursive: true });
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const PORT = 4181;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://localhost:${PORT}/`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) break; } catch {} await sleep(200); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const active = (k) => page.evaluate((k) => window.__game.scene.getScene(k)?.sys.isActive() ?? false, k);
  const waitActive = (k, t = 20000) => page.waitForFunction((k) => window.__game?.scene.getScene(k)?.sys.isActive(), k, { timeout: t });
  const dlg = () => page.evaluate(() => { const d = window.__game.scene.getScene('Dialog'); if (!d.sys.isActive()) return null; return { body: d.bodyText?.text, opts: (d.optionTexts || d.options || []).map?.((t) => t.text) }; });
  try {
    await page.goto(url);
    await waitActive('Title');
    await sleep(400);
    await shot('01-title');
    await page.keyboard.press('Enter');
    // Prolog (kamera po malbě) přeskočit.
    await waitActive('Prolog');
    await sleep(500);
    await page.keyboard.press('Space');
    await waitActive('Hero');
    await sleep(300);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('Jarmila Nová');
    await sleep(300);
    await shot('02-hero');
    await page.keyboard.press('Enter');
    await sleep(400);
    await shot('03-post');
    await page.keyboard.press('Enter');
    await waitActive('Game');
    await sleep(2500);
    await shot('04-bus-drive');
    // čekej na zastavení
    await page.waitForFunction(() => { const g = window.__game.scene.getScene('Game'); return g.story.intro?.phase === 'doors' || g.story.intro?.phase === 'exit' || g.story.intro?.phase === 'leave'; }, null, { timeout: 60000 });
    await sleep(600);
    await shot('05-bus-stop');
    await waitActive('Dialog', 30000);
    await sleep(400);
    await shot('06-kobyla');
    console.log('kobyla', JSON.stringify(await dlg()));
    let n = 0;
    while (await active('Dialog') && n++ < 12) { await page.keyboard.press('Digit1'); await sleep(350); }
    await sleep(800);
    await shot('07-after-intro');
    const st = await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); return { story: g.story.state, mission: g.registry.get('mission'), hero: g.progress.hero, female: g.player.female, tex: g.player.texture.key }; });
    console.log('state', JSON.stringify(st));
    // k hospodě
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.player.body.reset(g.story.pubDoor.x, g.story.pubDoor.y + 4); });
    await sleep(500);
    await shot('08-pub-door');
    console.log('prompt', await page.evaluate(() => window.__game.registry.get('prompt')));
    await page.keyboard.press('KeyE');
    await waitActive('Pub');
    await waitActive('Dialog', 5000);
    await sleep(400);
    await shot('09-prchard');
    console.log('prchard', JSON.stringify(await dlg()));
    await page.keyboard.press('Digit2');
    await sleep(500);
    await shot('10-plotkova');
    console.log('plotkova', JSON.stringify(await dlg()));
    await page.keyboard.press('Digit1');
    await sleep(500);
    await shot('11-plotkova-2');
    console.log('plotkova2', JSON.stringify(await dlg()));
    n = 0;
    while (await active('Dialog') && n++ < 15) { await page.keyboard.press('Digit3'); await sleep(350); }
    await sleep(600);
    await shot('12-pub-room');
    const st2 = await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); return { story: g.story.state, money: g.player.money, mission: g.registry.get('mission') }; });
    console.log('state2', JSON.stringify(st2));
    // promluv se štamgasty
    const npcs = await page.evaluate(() => window.__game.scene.getScene('Pub').npcs.map((n) => ({ id: n.id, x: n.sprite?.x ?? n.x, y: n.sprite?.y ?? n.y })));
    console.log('npcs', JSON.stringify(npcs));
    let i = 0;
    for (const npc of npcs) {
      await page.evaluate((p) => { const s = window.__game.scene.getScene('Pub'); s.player.body.reset(p.x, p.y + 14); }, npc);
      await sleep(250);
      await page.keyboard.press('KeyE');
      await sleep(400);
      if (!(await active('Dialog'))) { console.log('retry', npc.id, JSON.stringify(await page.evaluate(() => { const s = window.__game.scene.getScene('Pub'); const g = window.__game.scene.getScene('Game'); return { p: [s.player.x, s.player.y], pl: s.npcs.find((n) => n.id === 'plotkova')?.sprite.x, open: g.story.dialogOpen, prompt: s.prompt.text }; }))); await page.keyboard.press('KeyE'); await sleep(400); }
      const d = await dlg();
      console.log('talk', npc.id, JSON.stringify(d));
      if (i++ < 3) await shot(`13-talk-${npc.id}`);
      n = 0;
      while (await active('Dialog') && n++ < 15) { await page.keyboard.press(['Digit1','Digit2','Digit3'][n % 3]); await sleep(300); }
      await sleep(300);
    }
    // ven
    await page.evaluate(() => { const s = window.__game.scene.getScene('Pub'); s.player.body.reset(8 * 16, 14.2 * 16); });
    await sleep(300);
    await page.keyboard.press('KeyE');
    await sleep(800);
    console.log('afterExit', JSON.stringify({ pub: await active('Pub'), game: await active('Game'), ui: await active('UI') }));
    await sleep(1500);
    await shot('14-outside');
    // Denny u garáže
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.player.body.reset(1400, 1200); let i = 0; while (!(g.gangs.minute >= 18 * 60 && g.gangs.minute < 20 * 60) && i++ < 30) g.gangs.skipHours(1); });
    await sleep(800);
    console.log('hud', JSON.stringify(await page.evaluate(() => ({ mission: window.__game.registry.get('mission'), act: window.__game.registry.get('act'), minute: window.__game.scene.getScene('Game').gangs.minute }))));
    const den = await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); const f = g.townsfolk.folk.find((f) => f.id === 'dennyVysoky'); return f ? { x: f.ped.x, y: f.ped.y } : null; });
    console.log('denny', JSON.stringify(den));
    if (den) {
      await page.evaluate((p) => { const g = window.__game.scene.getScene('Game'); g.player.body.reset(p.x, p.y + 14); }, den);
      await sleep(400);
      await shot('15-denny');
      await page.keyboard.press('KeyE');
      await sleep(500);
      console.log('dennyDlg', JSON.stringify(await dlg()));
      await shot('16-denny-dlg');
      n = 0;
      while (await active('Dialog') && n++ < 10) { await page.keyboard.press('Digit1'); await sleep(300); }
    }
    console.log('save', await page.evaluate(() => localStorage.getItem(Object.keys(localStorage)[0])?.slice(0, 400)));
  } catch (e) {
    console.log('FAIL', e.message);
    await shot('99-fail');
  } finally {
    console.log('errors', JSON.stringify(errors));
    await browser.close();
    server.kill();
  }
})();
