// Load files in the built page, as "Open structure files" does, and report what the user sees.
// One page; each argument is one load (join several paths with + for one multi-file load).
// usage: NODE_PATH=/opt/npm-tools/node_modules node page_load.js out.json shot_prefix|- load1 [load2 ...]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = [];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route(/^https?:/, (r) => r.abort());
  await p.goto('file:///home/claude/crysta/dist/Crysta.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.crysta && window.crysta.state, null, { timeout: 120000 });
  const loads = process.argv.slice(4);
  for (let k = 0; k < loads.length; k++) {
    errs.length = 0;
    const before = await p.evaluate(() => ({ n: window.crysta.state.docs.length }));
    await p.evaluate(() => { window.crysta.state.notice = '__waiting__'; });
    await p.setInputFiles('#fileIn', loads[k].split('+'));
    try {
      await p.waitForFunction(() => window.crysta.state.notice !== '__waiting__', null, { timeout: 120000 });
    } catch (e) { /* report what is there */ }
    await p.waitForTimeout(500);
    const r = await p.evaluate((n0) => {
      const s = window.crysta.state;
      const txt = (id) => { const e = document.getElementById(id); return e ? e.innerText : null; };
      return {
        ndocs: s.docs.length - n0,
        docs: s.docs.slice(n0).map((d) => {
          const cnt = {}; for (const a of d.uc.atoms) cnt[a.el] = (cnt[a.el] || 0) + 1;
          return { name: d.name, format: d.struct.meta.format, block: d.struct.meta.block, nSites: d.struct.sites.length, cellAtoms: cnt, sgShown: d.struct.meta.spaceGroup };
        }),
        readout: txt('readout'), sheet: txt('dlCrystal'), header: txt('sub'), eyebrow: txt('eyebrow'), title: txt('title'), fw: txt('dlFw')
      };
    }, before.n);
    r.load = loads[k]; r.errors = errs.slice();
    if (process.argv[3] !== '-') await p.screenshot({ path: process.argv[3] + k + '.png' });
    out.push(r);
  }
  await b.close();
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  console.log('done', out.length);
})();
