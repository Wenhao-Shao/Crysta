// page checks: A1-02 (522), A2-10 (Disorder row), A2-11 (symbol display), A1-13 (zip messages)
const { chromium } = require('playwright');
const H = process.argv[2], W = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  const out = {};
  const open = async (f) => { await p.setInputFiles('#fileIn', [f]); await p.waitForTimeout(1800); };
  const card = () => p.evaluate(() => { const s = window.crysta.state; const d = s.docs[s.cur];
    const rows = Array.from(document.querySelectorAll('#dlCrystal dt')).map((dt) => [dt.textContent, dt.nextElementSibling ? dt.nextElementSibling.innerHTML : null]);
    const drawn = {}; const m = window.crysta.viewer().getModel(); if (m) m.selectedAtoms({}).forEach((a) => { drawn[a.elem] = (drawn[a.elem] || 0) + 1; });
    return { name: d && d.name, rows, notice: s.notice, drawn, title: document.getElementById('title').innerHTML, sub: document.getElementById('sub').innerHTML }; });
  await open(H + '/522_1.cif'); out.s522 = await card(); await p.screenshot({ path: W + '/shot_522.png' });
  await open(W + '/cases/dv_half_040.cif'); out.half040 = await card();
  await open(H + '/1259_1.cif'); out.s1259 = await card();
  await open(W + '/cases/dv_empty.zip'); out.emptyzip = await p.evaluate(() => window.crysta.state.notice);
  await open(W + '/cases/dv_outer.zip'); out.outerzip = await p.evaluate(() => ({ notice: window.crysta.state.notice, names: window.crysta.state.docs.map((d) => d.name) }));
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
