// Playtest v prohlížeči (Playwright + Chromium). Spuštění: npm run build && node scripts/playtest/mise-p2.cjs
// Snímky obrazovky jdou do playtest-out/mise-p2/ (není v gitu).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest-out', 'mise-p2');
require('node:fs').mkdirSync(OUT, { recursive: true });
// Průchod misemi v eRku (fáze P2): Omyx, Zjebal, Denny, Denny sochař.
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const PORT = 4183;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ARG = process.argv[2] || 'all';
const ONLY = ARG.includes(',') ? 'multi' : ARG;
const want = (k) => ARG === 'all' || ARG.split(',').includes(k);

(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://localhost:${PORT}/`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) break; } catch {} await sleep(200); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack));
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const G = (fn, arg) => page.evaluate(fn, arg);
  const active = (k) => G((k) => window.__game.scene.getScene(k)?.sys.isActive() ?? false, k);
  const waitActive = (k, t = 20000) => page.waitForFunction((k) => window.__game?.scene.getScene(k)?.sys.isActive(), k, { timeout: t });
  const dlg = () => G(() => { const d = window.__game.scene.getScene('Dialog'); if (!d.sys.isActive()) return null; return { name: d.nameText.text, body: d.bodyText.text, opts: d.optionTexts.map((t) => t.text) }; });
  const press = async (k, ms = 280) => { await page.keyboard.press(k); await sleep(ms); };
  const choose = (i) => press(`Digit${i + 1}`);
  const closeDialog = async (i = 0) => { for (let n = 0; n < 10 && (await active('Dialog')); n++) await choose(i); };
  const state = () => G(() => { const g = window.__game.scene.getScene('Game'); return { job: g.story.state.job, flags: g.story.state.flags.filter((f) => f.startsWith('job:') || f.startsWith('a1')), money: g.player.money, tea: g.player.arsenal.ammo.caj, weapon: g.player.arsenal.current, mission: (({ title, objective }) => ({ title, objective }))(window.__game.registry.get('mission') ?? {}) }; });
  const setHour = (h) => G((h) => { const g = window.__game.scene.getScene('Game'); for (let i = 0; i < 30 && Math.floor(g.gangs.minute / 60) !== h; i++) g.gangs.skipHours(1); return g.gangs.minute; }, h);
  const toPub = async () => {
    await G(() => { const g = window.__game.scene.getScene('Game'); if (g.driving) g.exitVehicle(); g.player.body.reset(g.story.pubDoor.x, g.story.pubDoor.y + 4); });
    await sleep(300);
    await press('KeyE', 600);
    await waitActive('Pub', 4000);
  };
  const pubTalk = async (id) => {
    const ok = await G((id) => { const s = window.__game.scene.getScene('Pub'); const n = s.npcs.find((x) => x.id === id && x.sprite.visible); if (!n) return false; s.player.body.reset(n.sprite.x, n.sprite.y + 15); return true; }, id);
    if (!ok) return false;
    await sleep(250);
    await press('KeyE', 450);
    return active('Dialog');
  };
  const leavePub = async () => {
    await G(() => { const s = window.__game.scene.getScene('Pub'); s.player.body.reset(8 * 16, 14.2 * 16); });
    await sleep(250);
    await press('KeyE', 700);
  };

  try {
    await page.goto(url);
    await waitActive('Title');
    // Uložení: Akt 1 po vstupu do hospody, hrdinka Jarmila, 2000 Kč.
    await G(() => {
      const raw = { version: 2, area: 'moravka', unlocked: ['moravka'], money: 2000, score: 0, areaScore: {}, respect: {}, hideouts: [], health: 100, armor: 0, clock: 60, tutorial: ['move', 'sprint', 'aim', 'enter', 'drive', 'handbrake', 'exit', 'police'],
        arsenal: { owned: ['fists'], current: 'fists', ammo: { fists: 0, bat: 0, pistol: 0, shotgun: 0, smg: 0, caj: 0 } },
        hero: { gender: 'f', name: 'Jarmila' },
        story: { act: 1, mission: '', introDone: true, flags: ['enteredPub', 'pubEntryDone'], rel: {}, known: ['kobyla', 'prchard', 'plotkova'], counts: {}, job: '' } };
      localStorage.setItem('survive-moravka-save-v1', JSON.stringify(raw));
    });
    await page.reload();
    await waitActive('Title');
    await sleep(400);
    await press('KeyS', 200);
    await press('Enter', 200);
    await waitActive('Game');
    await sleep(1500);
    console.log('start', JSON.stringify(await state()), 'hour', await setHour(18));
    await G(() => { const g = window.__game.scene.getScene('Game'); g.tutorial.update = () => g.registry.set('hint', null); });

    // Hasiči u zbrojnice a traktor s vlečkou před eRkem.
    await G(() => { const g = window.__game.scene.getScene('Game'); const h = g.world.buildings.find((b) => b.name === 'Hasiči'); g.player.body.reset((h.x + h.w / 2) * 16, (h.y + h.h + 2) * 16); });
    await sleep(1200);
    await shot('00-hasici');
    await G(() => { const g = window.__game.scene.getScene('Game'); const t = g.story.trailer.tractor; g.player.body.reset(t.x + 10, t.y + 26); });
    await sleep(900);
    await shot('01-traktor-vlecka');

    // ---------- Omyx: beskydský čaj ----------
    if (want('omyx')) {
      await toPub();
      console.log('omyx talk', await pubTalk('omyx'), JSON.stringify(await dlg()));
      await shot('10-omyx-nabidka');
      await choose(0);
      console.log('omyx ok', JSON.stringify(await dlg()));
      await closeDialog();
      await leavePub();
      await sleep(800);
      console.log('omyx job', JSON.stringify(await state()));
      await shot('11-caj-v-ruce');
      let deals = 0;
      for (let round = 0; round < 8; round++) {
        const s = await state();
        if (s.job !== 'omyx-caj') break;
        // Člen Omladiny vedle hráče; hráč na něj míří myší.
        const pos = await G(() => {
          const g = window.__game.scene.getScene('Game');
          const job = g.story.job;
          const m = g.gangs.members.find((m) => m.alive && m.group === 'omladina' && !job.served.has(m) && m.foe !== 'player');
          if (!m) return null;
          m.scripted = true;
          const h = g.world.spots.hriste;
          m.body.reset(h.x * 16, h.y * 16);
          g.player.body.reset(h.x * 16 - 16, h.y * 16);
          g.cameras.main.centerOn(g.player.x, g.player.y);
          return { x: m.x, y: m.y };
        });
        if (!pos) { console.log('no omladina member left'); break; }
        await sleep(350);
        const screen = await G((p) => { const g = window.__game.scene.getScene('Game'); const cam = g.cameras.main; const r = document.querySelector('canvas').getBoundingClientRect(); const k = r.width / 960; return { x: r.left + (p.x - cam.worldView.x) * cam.zoom * k, y: r.top + (p.y - cam.worldView.y) * cam.zoom * k }; }, pos);
        await page.mouse.move(screen.x, screen.y);
        await sleep(120);
        await page.mouse.down();
        await sleep(60);
        await page.mouse.up();
        await sleep(450);
        if (!(await active('Dialog'))) { console.log('no dialog', JSON.stringify(await state())); continue; }
        if (round === 0) await shot('12-handl-nechce');
        for (let n = 0; n < 25 && (await active('Dialog')); n++) {
          const pickIdx = await G(() => {
            const b = window.__game.scene.getScene('Game').story.job.bargain;
            if (!b) return 0;
            const w = b.type.weak, h = b.type.hates;
            const arg = b.args[0] === w ? 0 : b.args[1] === w ? 1 : b.args[0] === h ? 1 : 0;
            if (b.phase === 'nechce') return arg;
            if (b.phase === 'mozna') return w === 'status' || w === 'vzacnost' ? 1 : 2;
            if (b.phase === 'handl') return b.offer >= 200 && b.args.every((a) => a !== w) ? 2 : arg;
            if (b.phase === 'strop') return b.offer >= 200 ? 0 : 1;
            return 0;
          });
          if (round === 0 && n === 3) await shot('13-handl');
          await choose(pickIdx);
        }
        await sleep(750);
        await shot(`14-predavka-${round}`);
        await sleep(500);
        await shot(`14b-predavka-${round}`);
        await sleep(1400);
        const after = await state();
        console.log('round', round, JSON.stringify({ money: after.money, tea: after.tea, sold: await G(() => window.__game.scene.getScene('Game').story.state.counts.cajPlna), job: after.job }));
      }
      await sleep(1200);
      console.log('omyx end', JSON.stringify(await state()));
      await shot('15-omyx-konec');
    }

    // ---------- Zjebal domů ----------
    if (want('zjebal')) {
      await toPub();
      console.log('zjebal talk', await pubTalk('zjebal'), JSON.stringify(await dlg()));
      await shot('20-zjebal-nabidka');
      await choose(0);
      await closeDialog();
      console.log('zjebal in pub?', await G(() => window.__game.scene.getScene('Pub').npcs.find((n) => n.id === 'zjebal').sprite.visible));
      await leavePub();
      await sleep(800);
      await shot('21-zjebal-ceka');
      // Auto vedle Zjebala.
      await G(() => {
        const g = window.__game.scene.getScene('Game');
        const z = g.townsfolk.folk.find((f) => f.id === 'zjebal').ped;
        const v = g.vehicles.find((v) => v.spec.kind === 'osobak' && !v.wrecked && v.driver === 'none') ?? g.vehicles.find((v) => v.spec.kind === 'osobak');
        v.driver = 'none';
        v.body.reset(z.x + 6, z.y + 34);
        v.hp = v.spec.maxHp;
        g.player.body.reset(z.x + 6, z.y + 48);
      });
      await sleep(300);
      await press('KeyE', 600);
      await sleep(1500);
      const ride = await G(() => { const g = window.__game.scene.getScene('Game'); const j = g.story.job; return { phase: j.phase, limit: j.limit, route: j.route.length, driving: !!g.driving }; });
      console.log('zjebal ride', JSON.stringify(ride));
      await shot('22-zjebal-v-aute');
      // Autopilot po měřítkové trase: stihne to v limitu? (bez provozu a policie, jen trasa)
      await G(() => {
        const g = window.__game.scene.getScene('Game');
        for (const v of [...g.vehicles]) if (v !== g.driving && v !== g.story.trailer?.tractor) g.removeVehicle(v);
        g.refillTraffic = () => {};
        g.police.update = () => {};
        g.police.wanted.level = 0;
        const fin = g.story.finishJob.bind(g.story);
        g.story.finishJob = (ok, reason) => { window.__finish = { ok, reason: reason || g.story.job?.failReason }; fin(ok, reason); };
        const j = g.story.job;
        let idx = 0;
        window.__auto = { start: g.time.now };
        g.playerDriveInput = function () {
          const v = this.driving;
          const r = j.route;
          if (!v || !r.length) return { throttle: 0, steer: 0, handbrake: true };
          while (idx < r.length - 1 && Math.hypot(r[idx].x - v.x, r[idx].y - v.y) < 26) idx++;
          const t = r[Math.min(idx + 2, r.length - 1)];
          let d = Math.atan2(t.y - v.y, t.x - v.x) - v.rotation;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          const end = Math.hypot(j.home.x - v.x, j.home.y - v.y);
          if (end < 30) return { throttle: 0, steer: 0, handbrake: true };
          const speed = Math.abs(v.speed);
          const want = Math.abs(d) > 0.7 ? 70 : end < 120 ? 60 : 190;
          return { throttle: speed > want ? -0.4 : 1, steer: Math.max(-1, Math.min(1, d * 2.5)), handbrake: false };
        };
      });
      let arrived = false;
      for (let i = 0; i < 120; i++) {
        await sleep(500);
        const p = await G(() => { const g = window.__game.scene.getScene('Game'); const j = g.story.job; const c = j?.car; return j ? { phase: j.phase, left: j.left, car: c && { hp: Math.round(c.hp), state: c.state, active: c.active, x: Math.round(c.x), y: Math.round(c.y), kind: c.spec.kind } } : null; });
        if (i === 6) await shot('23-zjebal-jizda');
        if (!p || p.phase !== 'ride') { arrived = p && p.phase !== 'ride'; console.log('ride end', JSON.stringify(p)); break; }
      }
      const used = await G(() => (window.__game.scene.getScene('Game').time.now - window.__auto.start) / 1000);
      console.log('autopilot', JSON.stringify({ arrived, used, limit: ride.limit, finish: await G(() => window.__finish ?? null) }));
      await G(() => { const g = window.__game.scene.getScene('Game'); delete g.playerDriveInput; });
      if (arrived) {
        await sleep(1200);
        await shot('24-ajina-vyleti');
        await waitActive('Dialog', 8000);
        console.log('ajina', JSON.stringify(await dlg()));
        await shot('25-ajina-dialog');
        await choose(2); // mlčet
        console.log('ajina silent', JSON.stringify(await dlg()));
        await closeDialog();
        await sleep(2500);
        const ch = await G(() => { const g = window.__game.scene.getScene('Game'); const j = g.story.job; return j && j.id === 'zjebal-domu' ? { phase: j.phase, left: j.left, hp: g.player.health, ajina: !!j.ajina } : null; });
        console.log('chase', JSON.stringify(ch));
        await shot('26-ajina-honi');
        await G(() => { const j = window.__game.scene.getScene('Game').story.job; if (j) j.left = 0.5; });
        await sleep(2500);
        console.log('zjebal end', JSON.stringify(await state()));
      }
    }

    // ---------- Vysoký Denny: auto do dílny ----------
    if (want('denny')) {
      console.log('hour', await setHour(18));
      await G(() => { const g = window.__game.scene.getScene('Game'); if (g.driving) g.exitVehicle(); g.player.body.reset(1500, 1200); g.police.wanted.level = 0; });
      await sleep(900);
      await G(() => { const g = window.__game.scene.getScene('Game'); const d = g.townsfolk.denny; g.player.body.reset(d.x, d.y + 14); });
      await sleep(500);
      await press('KeyE', 500);
      console.log('denny talk', JSON.stringify(await dlg()));
      await shot('30-denny-nabidka');
      await choose(1);
      await closeDialog();
      console.log('denny job', JSON.stringify(await state()));
      // Nabourané auto: Denny ho nechce.
      const front = await G(() => { const j = window.__game.scene.getScene('Game').story.job; return j.front; });
      await G((f) => {
        const g = window.__game.scene.getScene('Game');
        const v = g.vehicles.find((v) => v.spec.kind === 'osobak' && !v.wrecked && v.driver === 'none');
        v.body.reset(f.x + 40, f.y + 10);
        v.hp = v.spec.maxHp * 0.6;
        g.player.body.reset(f.x + 40, f.y + 24);
        window.__car = v;
      }, front);
      await sleep(300);
      await press('KeyE', 500);
      await G((f) => { const g = window.__game.scene.getScene('Game'); g.driving.body.reset(f.x, f.y); g.police.wanted.level = 0; }, front);
      await sleep(1200);
      await shot('31-denny-nabourane');
      // Spravit a znovu.
      await G((f) => { const g = window.__game.scene.getScene('Game'); g.driving.hp = g.driving.spec.maxHp; g.driving.body.reset(f.x + 50, f.y + 30); g.story.job.complainedAt = -100; }, front);
      await sleep(400);
      await G((f) => { const g = window.__game.scene.getScene('Game'); g.driving.body.reset(f.x, f.y); }, front);
      await sleep(1300);
      await shot('32-denny-vjezd');
      await sleep(2500);
      console.log('denny end', JSON.stringify(await state()));
      await shot('33-denny-hotovo');
    }

    // ---------- Denny sochař: lešení traktorem ----------
    if (want('sochar')) {
      await G(() => { const g = window.__game.scene.getScene('Game'); if (!g.story.has('job:zjebal-domu')) g.story.flag('job:zjebal-domu'); });
      await toPub();
      console.log('sochar talk', await pubTalk('dennySochar'), JSON.stringify(await dlg()));
      await shot('40-sochar-nabidka');
      await choose(1);
      await closeDialog();
      await leavePub();
      await sleep(600);
      console.log('sochar job', JSON.stringify(await state()));
      await G(() => { const g = window.__game.scene.getScene('Game'); const t = g.story.trailer.tractor; g.player.body.reset(t.x + 4, t.y + 16); });
      await sleep(300);
      await press('KeyE', 500);
      // Kus jízdy: vlečka zatáčí za traktorem.
      await page.keyboard.down('KeyW');
      await sleep(900);
      await page.keyboard.down('KeyD');
      await sleep(900);
      await page.keyboard.up('KeyD');
      await page.keyboard.up('KeyW');
      await sleep(500);
      await shot('41-traktor-jede');
      const load = await G(() => window.__game.scene.getScene('Game').story.job.load);
      await G((p) => { const g = window.__game.scene.getScene('Game'); g.driving.body.reset(p.x, p.y + 30); }, load);
      await sleep(400);
      await G((p) => { const g = window.__game.scene.getScene('Game'); g.driving.body.reset(p.x, p.y); g.driving.drive = { ...g.driving.drive, vx: 0, vy: 0 }; }, load);
      await sleep(1600);
      await shot('42-nakladani');
      await sleep(2500);
      console.log('loaded', JSON.stringify(await G(() => { const g = window.__game.scene.getScene('Game'); return { phase: g.story.job?.phase, loaded: g.story.trailer.loaded }; })));
      await shot('43-nalozeno');
      const un = await G(() => window.__game.scene.getScene('Game').story.job.unload);
      await G((p) => { const g = window.__game.scene.getScene('Game'); g.driving.body.reset(p.x + 30, p.y + 20); }, un);
      await sleep(400);
      await G((p) => { const g = window.__game.scene.getScene('Game'); g.driving.body.reset(p.x, p.y); g.driving.drive = { ...g.driving.drive, vx: 0, vy: 0 }; }, un);
      await sleep(1700);
      await shot('44-vykladani');
      await sleep(2600);
      console.log('sochar end', JSON.stringify(await state()));
      await shot('45-sochar-hotovo');
    }
    console.log('final', JSON.stringify(await state()));
  } catch (e) {
    console.log('FAIL', e.message);
    await shot('99-fail');
  } finally {
    console.log('errors', JSON.stringify(errors));
    await browser.close();
    server.kill();
  }
})();
