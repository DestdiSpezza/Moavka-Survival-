// Playtest v prohlížeči (Playwright + Chromium). Spuštění: npm run build && node scripts/playtest/mise-p3.cjs
// Snímky obrazovky jdou do playtest-out/mise-p3/ (není v gitu).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest-out', 'mise-p3');
require('node:fs').mkdirSync(OUT, { recursive: true });
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4188', '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://localhost:4188/')).ok) break; } catch {} await sleep(200); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack));
  const G = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const active = (k) => G((k) => window.__game.scene.getScene(k)?.sys.isActive() ?? false, k);
  const press = async (k, ms = 320) => { await page.keyboard.press(k); await sleep(ms); };
  const dlg = () => G(() => { const d = window.__game.scene.getScene('Dialog'); return d.sys.isActive() ? { body: d.bodyText.text, opts: d.optionTexts.map((t) => t.text) } : null; });
  const st = () => G(() => { const g = window.__game.scene.getScene('Game'); return { area: g.area.id, job: g.story.state.job, done: g.story.state.flags.filter((f) => f.startsWith('job:')), money: g.player.money, obj: window.__game.registry.get('mission')?.objective }; });
  const load = async () => {
    await G(() => localStorage.setItem('survive-moravka-save-v1', JSON.stringify({ version: 2, area: 'moravka', unlocked: ['moravka'], money: 3000, score: 0, areaScore: {}, respect: {}, hideouts: [], health: 100, armor: 0, clock: 60, tutorial: [],
      arsenal: { owned: ['fists'], current: 'fists', ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0, caj: 0 } }, hero: { gender: 'm', name: 'Pepan' },
      story: { act: 1, mission: '', introDone: true, flags: ['enteredPub', 'pubEntryDone'], rel: {}, known: [], counts: {}, job: '' } })));
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive());
    await sleep(300); await press('KeyS', 150); await press('Enter', 150);
    await page.waitForFunction(() => window.__game.scene.getScene('Game')?.sys.isActive());
    await sleep(1200);
    await G(() => { const g = window.__game.scene.getScene('Game'); g.pals.maybeSocharTagsAlong = () => false; g.police.update = () => {}; });
  };
  const toPub = async () => { await G(() => { const g = window.__game.scene.getScene('Game'); if (g.driving) g.exitVehicle(); g.player.body.reset(g.story.pubDoor.x, g.story.pubDoor.y + 4); }); await sleep(300); await press('KeyE', 700); };
  const pubTalk = async (id) => { await G((id) => { const s = window.__game.scene.getScene('Pub'); const n = s.npcs.find((x) => x.id === id); s.player.body.reset(n.sprite.x, n.sprite.y + 15); }, id); await sleep(250); await press('KeyE', 450); };
  const leave = async () => { await G(() => { const s = window.__game.scene.getScene('Pub'); s.player.body.reset(8 * 16, 14.2 * 16); }); await sleep(250); await press('KeyE', 900); };
  const close = async (k = 'Digit1') => { for (let i = 0; i < 12 && (await active('Dialog')); i++) await press(k); };
  try {
    await page.goto('http://localhost:4188/');
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive());
    await load();
    // ---- Metějka: kulečník ----
    await toPub(); await pubTalk('metejka');
    console.log('metejka', JSON.stringify(await dlg()));
    await press('Digit1');
    console.log('pool r1', JSON.stringify(await dlg()));
    await shot('10-kulecnik');
    for (let i = 0; i < 6 && (await active('Dialog')); i++) {
      const d = await dlg();
      if (d.opts[0].includes('Pošeptat')) await press('Digit1'); else { console.log('pool end', JSON.stringify(d.body)); await shot('11-kulecnik-konec'); await close(); }
    }
    await leave(); await sleep(800);
    console.log('after pool', JSON.stringify(await st()));
    // ---- Kibi ----
    await toPub(); await pubTalk('kibi');
    console.log('kibi', JSON.stringify(await dlg()));
    await press('Digit1'); await close(); await leave(); await sleep(600);
    for (let w = 0; w < 3; w++) {
      await page.waitForFunction((w) => { const j = window.__game.scene.getScene('Game').story.job; return j && j.women[w].ped.visible; }, w, { timeout: 30000 });
      await G((w) => { const g = window.__game.scene.getScene('Game'); const p = g.story.job.women[w].ped; g.player.body.reset(p.x + 12, p.y); }, w);
      await sleep(300); await press('KeyE', 500);
      if (w === 0) { console.log('woman', JSON.stringify(await dlg())); await shot('20-kibi-zenska'); }
      await press('Digit2', 400); await close();
    }
    await sleep(1500);
    console.log('after kibi', JSON.stringify(await st()));
    // ---- Plotková ----
    await toPub(); await pubTalk('plotkova');
    await press('Digit1'); await close(); await leave(); await sleep(600);
    console.log('bottles', JSON.stringify(await st()));
    for (let i = 0; i < 4; i++) {
      await G((i) => { const g = window.__game.scene.getScene('Game'); const s = g.story.job.stops[i]; g.player.body.reset(s.at.x, s.at.y); }, i);
      await sleep(500);
      if (i === 1) await shot('30-flasky');
    }
    await sleep(800);
    console.log('after bottles', JSON.stringify(await st()));
    // ---- Vesta: jeřáb ----
    await toPub(); await pubTalk('vesta');
    console.log('vesta', JSON.stringify(await dlg()));
    await press('Digit1'); await close(); await leave(); await sleep(600);
    console.log('vesta job', JSON.stringify(await st()));
    await G(() => { const g = window.__game.scene.getScene('Game'); const e = g.world.exits.next.at; g.player.body.reset(e.x, e.y); });
    await page.waitForFunction(() => window.__game.scene.getScene('Game')?.area?.id === 'raskovice' && window.__game.scene.getScene('Game').sys.isActive(), null, { timeout: 15000 });
    await sleep(1500);
    await G(() => { const g = window.__game.scene.getScene('Game'); g.police.update = () => {}; });
    console.log('raskovice', JSON.stringify(await st()));
    await G(() => { const g = window.__game.scene.getScene('Game'); const c = g.story.job.crane; g.player.body.reset(c.x, c.y + 18); });
    await sleep(500); await shot('40-jerab'); await press('KeyE', 600);
    console.log('in crane', await G(() => window.__game.scene.getScene('Game').driving?.spec.kind));
    await G(() => { const g = window.__game.scene.getScene('Game'); const e = g.world.exits.prev.at; g.driving.body.reset(e.x, e.y); });
    await page.waitForFunction(() => window.__game.scene.getScene('Game')?.area?.id === 'moravka' && window.__game.scene.getScene('Game').sys.isActive(), null, { timeout: 15000 });
    await sleep(1500);
    console.log('back', JSON.stringify(await st()), await G(() => window.__game.scene.getScene('Game').driving?.spec.kind));
    await G(() => { const g = window.__game.scene.getScene('Game'); g.police.update = () => {}; g.police.wanted.level = 0; const h = g.story.job.home; g.driving.body.reset(h.x, h.y); g.driving.drive = { ...g.driving.drive, vx: 0, vy: 0 }; });
    await sleep(800); await shot('41-jerab-u-vesty');
    await sleep(1500);
    console.log('after vesta', JSON.stringify(await st()));
  } catch (e) { console.log('FAIL', e.message); await shot('99'); }
  finally { console.log('errors', JSON.stringify(errors)); await browser.close(); server.kill(); }
})();
