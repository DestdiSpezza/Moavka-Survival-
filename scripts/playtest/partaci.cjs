// Playtest v prohlížeči (Playwright + Chromium). Spuštění: npm run build && node scripts/playtest/partaci.cjs
// Snímky obrazovky jdou do playtest-out/partaci/ (není v gitu).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest-out', 'partaci');
require('node:fs').mkdirSync(OUT, { recursive: true });
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4187', '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://localhost:4187/')).ok) break; } catch {} await sleep(200); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack));
  const G = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const active = (k) => G((k) => window.__game.scene.getScene(k)?.sys.isActive() ?? false, k);
  const press = async (k, ms = 300) => { await page.keyboard.press(k); await sleep(ms); };
  const dlg = () => G(() => { const d = window.__game.scene.getScene('Dialog'); return d.sys.isActive() ? { body: d.bodyText.text, opts: d.optionTexts.map((t) => t.text) } : null; });
  const load = async (flags, money = 2000) => {
    await G(([flags, money]) => localStorage.setItem('survive-moravka-save-v1', JSON.stringify({ version: 2, area: 'moravka', unlocked: ['moravka'], money, score: 0, areaScore: {}, respect: {}, hideouts: [], health: 100, armor: 0, clock: 60, tutorial: [],
      arsenal: { owned: ['fists'], current: 'fists', ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0, caj: 0 } }, hero: { gender: 'f', name: 'Jarmila' },
      story: { act: 1, mission: '', introDone: true, flags, rel: {}, known: [], counts: {}, job: '' } })), [flags, money]);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive());
    await sleep(300); await press('KeyS', 150); await press('Enter', 150);
    await page.waitForFunction(() => window.__game.scene.getScene('Game')?.sys.isActive());
    await sleep(1200);
    await G(() => { const g = window.__game.scene.getScene('Game'); g.pals.maybeSocharTagsAlong = () => false; });
  };
  const toPub = async () => { await G(() => { const g = window.__game.scene.getScene('Game'); g.player.body.reset(g.story.pubDoor.x, g.story.pubDoor.y + 4); }); await sleep(300); await press('KeyE', 700); };
  const pubTalk = async (id) => { await G((id) => { const s = window.__game.scene.getScene('Pub'); const n = s.npcs.find((x) => x.id === id); s.player.body.reset(n.sprite.x, n.sprite.y + 15); }, id); await sleep(250); await press('KeyE', 450); };
  const leave = async () => { await G(() => { const s = window.__game.scene.getScene('Pub'); s.player.body.reset(8 * 16, 14.2 * 16); }); await sleep(250); await press('KeyE', 800); };
  try {
    await page.goto('http://localhost:4187/');
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive());
    // Metějka jako parťák.
    await load(['enteredPub', 'pubEntryDone', 'job:omyx-caj', 'job:zjebal-domu', 'job:denny-auto', 'job:sochar-leseni']);
    await toPub();
    await pubTalk('metejka');
    console.log('pal offer', JSON.stringify(await dlg()));
    await press('Digit1');
    console.log('pal info', JSON.stringify(await dlg()));
    await shot('01-metejka-nabidka');
    await press('Digit1');
    console.log('in pub?', await G(() => window.__game.scene.getScene('Pub').npcs.find((n) => n.id === 'metejka').sprite.visible));
    await leave();
    await sleep(600);
    await G(() => { const g = window.__game.scene.getScene('Game'); g.player.body.reset(g.player.x + 60, g.player.y + 40); });
    await sleep(1500);
    console.log('follow', JSON.stringify(await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.pals.ped; return { id: g.pals.id, d: Math.round(Math.hypot(p.x - g.player.x, p.y - g.player.y)), near: g.pals.near() }; })));
    await shot('02-metejka-venku');
    const w = await G(() => { const g = window.__game.scene.getScene('Game'); g.police.report({ kind: 'assault', at: { x: g.player.x, y: g.player.y }, seen: true, description: g.police.wanted.description }); return g.police.wanted.level; });
    console.log('wanted with Metějka', w);
    const m0 = await G(() => window.__game.scene.getScene('Game').player.money);
    await G(() => { window.__game.scene.getScene('Game').pals.timer = 49.9; });
    await sleep(600);
    console.log('beer', m0, await G(() => window.__game.scene.getScene('Game').player.money));
    // Řeč s parťákem venku: poslat zpátky.
    await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.pals.ped; g.player.body.reset(p.x + 10, p.y); });
    await sleep(300); await press('KeyE', 500);
    console.log('pal talk', JSON.stringify(await dlg()));
    await press('Digit1', 600);
    console.log('dismissed', await G(() => window.__game.scene.getScene('Game').pals.id));

    // Denny sochař: tři rány.
    await G(() => { const g = window.__game.scene.getScene('Game'); g.police.wanted.level = 0; g.pals.take('dennySochar'); g.pals.spawnAt(g.player.x + 12, g.player.y); });
    await sleep(500);
    for (let i = 0; i < 3; i++) {
      await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.pals.ped; if (p) { g.player.body.reset(p.x - 10, p.y); g.combat.hurtPed(p, 10, g.player, true); } });
      await sleep(400);
    }
    console.log('sochar gone', await G(() => window.__game.scene.getScene('Game').pals.id));
    // Těžší start: štamgast chce nejdřív pivo.
    await load(['enteredPub', 'pubEntryDone', 'refusedTalk']);
    await toPub();
    await pubTalk('omyx');
    console.log('make up', JSON.stringify(await dlg()));
    await shot('03-smir');
    await press('Digit1', 400);
    console.log('after beer', JSON.stringify(await dlg()), await G(() => window.__game.scene.getScene('Game').story.state.rel.omyx));
  } catch (e) { console.log('FAIL', e.message); await shot('99'); }
  finally { console.log('errors', JSON.stringify(errors)); await browser.close(); server.kill(); }
})();
