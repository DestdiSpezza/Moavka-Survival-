// Playtest misí Omladiny (ADR-037). Spuštění: npm run build && node scripts/playtest/mise-omladina.cjs
// Snímky jdou do playtest-out/mise-omladina/ (není v gitu).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest-out', 'mise-omladina');
require('node:fs').mkdirSync(OUT, { recursive: true });
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4189', '--strictPort'], { cwd: ROOT, stdio: 'ignore', shell: true });
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://localhost:4189/')).ok) break; } catch {} await sleep(200); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack));
  const G = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const active = (k) => G((k) => window.__game.scene.getScene(k)?.sys.isActive() ?? false, k);
  const press = async (k, ms = 320) => { await page.keyboard.press(k); await sleep(ms); };
  const dlg = () => G(() => { const d = window.__game.scene.getScene('Dialog'); return d.sys.isActive() ? { body: d.bodyText.text, opts: d.optionTexts.map((t) => t.text) } : null; });
  const st = () => G(() => { const g = window.__game.scene.getScene('Game'); return { area: g.area.id, job: g.story.state.job, done: g.story.state.flags.filter((f) => f.startsWith('job:')).length, money: g.player.money, weapon: g.player.arsenal.current, obj: window.__game.registry.get('mission')?.objective }; });
  const close = async () => { for (let i = 0; i < 12 && (await active('Dialog')); i++) await press('Digit1'); };
  const waitGame = async () => { await page.waitForFunction(() => window.__game.scene.getScene('Game')?.sys.isActive() && window.__game.scene.getScene('Game').story); await sleep(1200); await G(() => { const g = window.__game.scene.getScene('Game'); g.pals.maybeSocharTagsAlong = () => false; g.police.update = () => {}; }); };
  const goTo = (p) => G((p) => { const g = window.__game.scene.getScene('Game'); if (g.driving) g.exitVehicle(); g.player.body.reset(p.x, p.y); }, p);
  const toNpc = async (id) => { const p = await G((id) => { const f = window.__game.scene.getScene('Game').townsfolk.ped(id); return { x: f.x, y: f.y + 12 }; }, id); await goTo(p); await sleep(250); };
  const doneJob = (id) => page.waitForFunction((id) => window.__game.scene.getScene('Game').story.state.flags.includes(`job:${id}`), id, { timeout: 40000 });
  const travel = async (to) => { await G((to) => window.__game.scene.getScene('Game').travel(to), to); await sleep(1500); await waitGame(); };
  try {
    await page.goto('http://localhost:4189/');
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive());
    await G(() => localStorage.setItem('survive-moravka-save-v1', JSON.stringify({ version: 2, area: 'moravka', unlocked: ['moravka', 'raskovice'], money: 3000, score: 0, areaScore: {}, respect: {}, hideouts: [], health: 100, armor: 0, clock: 60, tutorial: [],
      arsenal: { owned: ['fists'], current: 'fists', ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0, caj: 0 } }, hero: { gender: 'f', name: 'Pepa' },
      story: { act: 1, mission: '', introDone: true, flags: ['enteredPub', 'pubEntryDone', 'job:vesta-jerab', 'job:denny-auto', 'open:raskovice'], rel: {}, known: [], counts: { karelSeed: 4242 }, job: '' } })));
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive());
    await sleep(300); await press('KeyS', 150); await press('Enter', 150);
    await waitGame();

    // ---- Awe: Karel ----
    await toNpc('awe'); await shot('01-hriste');
    await press('KeyE', 500);
    console.log('awe', JSON.stringify(await dlg()));
    await close();
    console.log('karel start', JSON.stringify(await st()));
    const kp = await G(() => { const j = window.__game.scene.getScene('Game').story.job; return { x: j.img.x, y: j.img.y }; });
    await goTo(kp); await sleep(300); await shot('02-karel-nalez');
    await press('KeyE', 500);
    console.log('karel found', JSON.stringify(await st()));
    await toNpc('awe'); await press('KeyE', 500);
    console.log('awe drop', JSON.stringify(await dlg()));
    await press('Digit1', 200); await close();
    await sleep(3500); await shot('03-awe-cenzura');
    await doneJob('awe-karel');
    console.log('karel done', JSON.stringify(await st()));
    // S Karlem mezi lidi: kolik jich uteče.
    const ped = await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.combat.peds.find((x) => x.alive && x.role === 'civil' && !x.scripted); return p ? { x: p.x, y: p.y + 20 } : null; });
    if (ped) { await goTo(ped); await sleep(1200); await shot('04-karel-utek'); }
    console.log('fleeing', await G(() => window.__game.scene.getScene('Game').combat.peds.filter((p) => p.mood === 'flee').length));

    // ---- Ta z Chaty: pohřeb ----
    await toNpc('natala'); await press('KeyE', 500);
    console.log('natala', JSON.stringify(await dlg()));
    await close();
    await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.combat.peds.find((x) => x.alive && x.role === 'civil' && !x.scripted); g.combat.hurtPed(p, 999, g.player); g.police.wanted.level = 0; });
    console.log('killed', JSON.stringify(await st()));
    await G(() => { const g = window.__game.scene.getScene('Game'); const c = g.story.job.corpse; const v = g.addVehicle('dodavka', c.x + 20, c.y, 0, 0); g.enterVehicle(v); });
    await sleep(300); await press('KeyE', 400);
    console.log('loaded', JSON.stringify(await st()));
    await G(() => { const g = window.__game.scene.getScene('Game'); const gr = g.story.job.grave; const v = g.driving; v.body.reset(gr.x + 10, gr.y + 30); v.speed = 0; g.police.wanted.level = 0; });
    await sleep(4500); await shot('05-bagr-prijezd');
    await sleep(4000); await shot('06-bagr-kope');
    await doneJob('natala-pohreb');
    await shot('07-mohyla');
    console.log('pohreb done', JSON.stringify(await st()));

    // ---- Přčka: nafta ----
    await toNpc('prcka'); await press('KeyE', 500);
    console.log('prcka', JSON.stringify(await dlg()));
    await close();
    await travel('raskovice');
    console.log('rask', JSON.stringify(await st()));
    await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.story.job.target(); g.player.body.reset(p.x, p.y); });
    await sleep(300); await shot('08-benzina'); await press('KeyE', 500);
    console.log('pumpa', JSON.stringify(await dlg()));
    await close();
    console.log('koupeno', JSON.stringify(await st()));
    await travel('moravka');
    console.log('zpet', JSON.stringify(await st()));
    const bmw = await G(() => { const b = window.__game.scene.getScene('Game').townsfolk.bmw; return { x: b.x, y: b.y - 12 }; });
    await goTo(bmw); await sleep(300); await press('KeyE', 500);
    await sleep(4000); await shot('09-tankovani');
    await doneJob('prcka-nafta');
    console.log('nafta done', JSON.stringify(await st()));

    // ---- Mini Vesta: babeta ----
    await toNpc('miniVesta'); await press('KeyE', 500); await close();
    await travel('raskovice');
    await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.story.job.target(); g.player.body.reset(p.x, p.y); });
    await sleep(300); await press('KeyE', 500); await close();
    await travel('moravka');
    await toNpc('miniVesta'); await press('KeyE', 500);
    console.log('babeta drop', JSON.stringify(await dlg()));
    await press('Digit1', 200); await close();
    await sleep(2800); await shot('10-babeta');
    await doneJob('minivesta-babeta');
    console.log('babeta done', JSON.stringify(await st()));
  } catch (e) {
    console.log('FAIL', e.message);
    await shot('99-fail');
  } finally {
    console.log('errors', errors.length ? errors : 'none');
    await browser.close();
    server.kill();
    process.exit(0);
  }
})();
