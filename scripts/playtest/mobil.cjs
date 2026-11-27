// Playtest v prohlížeči (Playwright + Chromium). Spuštění: npm run build && node scripts/playtest/mobil.cjs
// Snímky obrazovky jdou do playtest-out/mobil/ (není v gitu).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest-out', 'mobil');
require('node:fs').mkdirSync(OUT, { recursive: true });
// Hra na telefonu: dotyk, joystick (CDP multi-touch), tlačítka.
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4185', '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://localhost:4185/')).ok) break; } catch {} await sleep(200); }
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack));
  page.on('dialog', (d) => d.accept('Šárka'));
  const cdp = await ctx.newCDPSession(page);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const G = (fn, a) => page.evaluate(fn, a);
  const active = (k) => G((k) => window.__game.scene.getScene(k)?.sys.isActive() ?? false, k);
  // Herní souřadnice (960×540) → obrazovka.
  const scr = async (x, y) => G(([x, y]) => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left + x * r.width / 960, y: r.top + y * r.height / 540 }; }, [x, y]);
  const tapAt = async (x, y) => { const p = await scr(x, y); await page.touchscreen.tap(p.x, p.y); await sleep(250); };
  const touchPts = (pts) => pts.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i }));
  const tdown = async (pts) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPts(pts) });
  const tmove = async (pts) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPts(pts) });
  const tup = async () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  /** Joystick: prst vlevo dole, posun o (dx,dy) herních px, drží ms. */
  const stick = async (dx, dy, ms) => {
    const a = await scr(160, 400);
    const b = await scr(160 + dx, 400 + dy);
    await tdown([{ ...a, id: 1 }]);
    await sleep(60);
    await tmove([{ ...b, id: 1 }]);
    await sleep(ms);
    await tup();
    await sleep(100);
  };
  try {
    await page.goto('http://localhost:4185/');
    await page.waitForFunction(() => window.__game?.scene.getScene('Title')?.sys.isActive(), null, { timeout: 40000 });
    await sleep(600);
    console.log('touch enabled', await G(() => window.__game.scene.getScene('Touch')?.sys.isActive()));
    await shot('01-title');
    await tapAt(480, 250); // Nová hra
    await page.waitForFunction(() => window.__game.scene.getScene('Prolog')?.sys.isActive());
    await sleep(500);
    await tapAt(480, 270); // přeskočit prolog
    await page.waitForFunction(() => window.__game.scene.getScene('Hero')?.sys.isActive());
    await tapAt(610, 200); // hrdinka
    await tapAt(480, 392); // jméno → prompt
    await sleep(300);
    await shot('02-hero');
    await tapAt(480, 450); // pokračovat
    await sleep(600);
    await tapAt(480, 300); // post → jedeme
    await page.waitForFunction(() => window.__game.scene.getScene('Game')?.sys.isActive());
    await sleep(2000);
    await shot('03-intro');
    await tapAt(850, 500); // přeskočit
    await page.waitForFunction(() => window.__game.scene.getScene('Dialog')?.sys.isActive(), null, { timeout: 8000 });
    await shot('04-kobyla');
    for (let i = 0; i < 6 && (await active('Dialog')); i++) {
      const y = await G(() => { const d = window.__game.scene.getScene('Dialog'); return d.optionTexts[0].y + 8; });
      await tapAt(300, y);
      await sleep(250);
    }
    await sleep(800);
    const hero = await G(() => window.__game.scene.getScene('Game').progress.hero);
    console.log('hero', JSON.stringify(hero));
    await shot('05-hra');
    // Chůze joystickem doprava a nahoru.
    const p0 = await G(() => { const g = window.__game.scene.getScene('Game'); return { x: g.player.x, y: g.player.y }; });
    console.log('before stick', await G(() => { const t = window.__game.scene.getScene('Touch'); return JSON.stringify({ active: window.__game.scene.scenes.filter((s) => s.sys.isActive()).map((s) => s.sys.settings.key), cut: window.__game.registry.get('cutscene'), intro: window.__game.scene.getScene('Game').story.intro?.phase, mode: t.mode(), stickId: t.stickId, held: t.held.size, t: window.__touch, ptrs: window.__game.input.pointers.filter((p) => p.isDown).map((p) => p.id) }); }));
    await stick(55, 0, 900);
    const p1 = await G(() => { const g = window.__game.scene.getScene('Game'); return { x: g.player.x, y: g.player.y, rot: g.player.rotation }; });
    console.log('walk', JSON.stringify({ p0, p1 }));
    // Šikmo (ne v osmi směrech): doprava dolů pod mělkým úhlem.
    await stick(55, 18, 900);
    const p2 = await G(() => { const g = window.__game.scene.getScene('Game'); return { x: g.player.x, y: g.player.y }; });
    const walkAng = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    console.log('walk analog', JSON.stringify({ deg: Math.round((walkAng * 180) / Math.PI), want: Math.round((Math.atan2(18, 55) * 180) / Math.PI) }));
    // K autu a nastoupit tlačítkem E.
    await G(() => { const g = window.__game.scene.getScene('Game'); const v = g.vehicles.find((v) => v.spec.kind === 'osobak' && v.driver === 'none' && !v.wrecked); v.body.reset(g.player.x + 30, g.player.y + 40); g.player.body.reset(v.x, v.y + 16); });
    await sleep(400);
    await tapAt(960 - 205, 540 - 60); // E
    await sleep(500);
    console.log('driving', await G(() => !!window.__game.scene.getScene('Game').driving));
    await shot('06-v-aute');
    const c0 = await G(() => { const v = window.__game.scene.getScene('Game').driving; return { x: v.x, y: v.y }; });
    const deg = () => G(() => Math.round((window.__game.scene.getScene('Game').driving.drive.angle * 180) / Math.PI));
    const car = () => G(() => { const v = window.__game.scene.getScene('Game').driving; return { x: Math.round(v.x), y: Math.round(v.y), speed: Math.round(v.speed) }; });
    /** V autě: PLYN (vpravo) drží, volant (půlkruh vlevo) otočený o deg stupňů, drží ms. */
    const driveTouch = async (deg, ms, btn = { x: 960 - 95, y: 540 - 115 }) => {
      const g = await scr(btn.x, btn.y);
      const at = (d) => scr(170 + Math.sin((d * Math.PI) / 180) * 100, 552 - Math.cos((d * Math.PI) / 180) * 100);
      const w0 = await at(0);
      const w1 = await at(deg);
      await tdown([{ ...g, id: 7 }, { ...w0, id: 8 }]);
      await sleep(50);
      await tmove([{ ...g, id: 7 }, { ...w1, id: 8 }]);
      await sleep(ms);
      await tup();
      await sleep(150);
    };
    console.log('car buttons', await G(() => { const t = window.__game.scene.getScene('Touch'); return t.visibleButtons().map((b) => b.id).join(','); }));
    await shot('06b-ovladani-auto');
    const a0 = await deg();
    await driveTouch(0, 1200);
    const c1 = await car();
    console.log('gas straight', JSON.stringify({ c0, c1, a0, a1: await deg() }));
    await driveTouch(70, 1000);
    console.log('gas + right', JSON.stringify({ c: await car(), angle: await deg() }));
    await driveTouch(-70, 1000);
    console.log('gas + left', JSON.stringify({ c: await car(), angle: await deg() }));
    // Volant: prst držený na 45° vpravo → rejd ~0,64, volant natočený.
    {
      const p0 = await scr(170, 452);
      const p1 = await scr(170 + 70.7, 552 - 70.7);
      await tdown([{ ...p0, id: 9 }]);
      await sleep(50);
      await tmove([{ ...p1, id: 9 }]);
      await sleep(400);
      console.log('wheel 45°', JSON.stringify(await G(() => ({ steer: Math.round(window.__touch.steer * 100) / 100, rot: Math.round(window.__game.scene.getScene('Touch').wheel.rotation * 100) / 100 }))));
      await shot('06d-volant');
      await tup();
      await sleep(400);
      console.log('wheel released', await G(() => window.__touch.steer));
    }
    // Volant v jízdě na volném místě: auto se otočí.
    await G((c) => { const v = window.__game.scene.getScene('Game').driving; v.body.reset(c.x, c.y - 60); v.drive = { angle: -Math.PI / 2, vx: 0, vy: 0 }; v.setRotation(-Math.PI / 2); for (const o of window.__game.scene.getScene('Game').vehicles) if (o !== v && Math.hypot(o.x - c.x, o.y - c.y) < 150) o.body.reset(o.x + 3000, o.y); }, c0);
    await driveTouch(60, 1300);
    console.log('turn on open road', JSON.stringify({ c: await car(), angle: await deg() }));
    // Zpátečka: ťuknout R, pak PLYN couvá; BRZDA zastaví.
    await tapAt(960 - 345, 540 - 160);
    console.log('reverse on', await G(() => window.__game.scene.getScene('Touch').car.find((b) => b.id === 'reverse').text.text));
    await driveTouch(0, 1200);
    console.log('reverse gas', JSON.stringify(await car()));
    await driveTouch(0, 800, { x: 960 - 235, y: 540 - 70 });
    console.log('brake after reverse', JSON.stringify(await car()));
    await shot('06c-zpatecka');
    await tapAt(960 - 345, 540 - 160);
    // Odtlačování: hráč v autě na volné silnici, fízl stojí před ním.
    const pushTest = async (kind) => {
      await G((kind) => {
        const g = window.__game.scene.getScene('Game');
        const v = g.driving;
        const others = g.vehicles.filter((o) => o !== v);
        const cop = others.find((o) => o.isPolice) ?? others[0];
        for (const o of others) if (o !== cop && Math.hypot(o.x - 300, o.y - 200) < 200) o.body.reset(o.x + 2000, o.y);
        v.spec = { ...v.spec, kind, weight: kind === 'dodavka' ? 2.4 : 1 };
        v.body.reset(300, 200); v.drive = { angle: 0, vx: 0, vy: 0 }; v.setRotation(0);
        cop.body.reset(330, 200); cop.drive = { angle: Math.PI / 2, vx: 0, vy: 0 }; cop.setRotation(Math.PI / 2);
        cop.spec = { ...cop.spec, weight: 1.2 };
        cop.driver = 'none';
        window.__cop = cop;
      }, kind);
      await driveTouch(0, 1500);
      return G(() => ({ cop: Math.round(window.__cop.x - 330), car: Math.round(window.__game.scene.getScene('Game').driving.x - 300) }));
    };
    console.log('push dodavka', JSON.stringify(await pushTest('dodavka')));
    console.log('push osobak', JSON.stringify(await pushTest('osobak')));
    await tapAt(960 - 345, 540 - 55); // vystoupit (E v autě)
    await sleep(500);
    // Útok tlačítkem: chodec vedle hráče.
    const hit = await G(() => { const g = window.__game.scene.getScene('Game'); const p = g.combat.peds.find((p) => p.alive && p.role === 'civil'); p.body.reset(g.player.x + 12, g.player.y); p.scripted = true; return { hp: p.hp, id: g.combat.peds.indexOf(p) }; });
    const f = await scr(960 - 95, 540 - 95);
    await tdown([{ ...f, id: 5 }]);
    await sleep(150);
    await tup();
    await sleep(300);
    const after = await G((i) => window.__game.scene.getScene('Game').combat.peds[i].hp, hit.id);
    console.log('punch', JSON.stringify({ before: hit.hp, after }));
    // Pauza tlačítkem II a zpět ťuknutím.
    await tapAt(960 - 32, 214);
    await sleep(400);
    console.log('pause', await active('Pause'));
    await shot('07-pauza');
    await tapAt(480, 220);
    await sleep(400);
    console.log('resumed', !(await active('Pause')));
    // Do hospody tlačítkem E a ťuknutí na volbu.
    await G(() => { const g = window.__game.scene.getScene('Game'); g.player.body.reset(g.story.pubDoor.x, g.story.pubDoor.y + 4); });
    await sleep(300);
    await tapAt(960 - 205, 540 - 60);
    await sleep(1200);
    console.log('pub', await active('Pub'), 'dialog', await active('Dialog'));
    await shot('08-hospoda');
  } catch (e) {
    console.log('FAIL', e.message);
    await shot('99-fail');
  } finally {
    console.log('errors', JSON.stringify(errors));
    await browser.close();
    server.kill();
  }
})();
