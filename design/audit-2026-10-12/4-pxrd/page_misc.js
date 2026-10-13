// page checks: a decimal-comma data file in the PXRD window and in the main page; Mo K-alpha 2 typed as lambda 1
const { chromium } = require('playwright');
const path = require('path');
const A = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [A + '/corpus/examples/quartz_SiO2.cif']);
  await p.waitForTimeout(1500);
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('#btnPxrd')]);
  await pop.waitForTimeout(800);
  await pop.setInputFiles('#pxFile', [path.join(__dirname, 'xy/decimal_comma_200.csv')]);
  await pop.waitForTimeout(800);
  const d1 = await p.evaluate(() => { const it = window.crysta.pxrd.state.data[0]; return { name: it.name, n: it.x.length, x: it.x.slice(0, 8), y: it.y.slice(0, 8), tmin: window.crysta.pxrd.state.tmin, tmax: window.crysta.pxrd.state.tmax }; });
  const note1 = await pop.$eval('#pxNote', (e) => e.textContent);
  const items = await pop.$$eval('#pxData .px-item', (e) => e.map((x) => x.textContent));
  await pop.screenshot({ path: path.join(__dirname, 'page_out_decimal_comma.png') });
  // the same file dropped on the main page
  await p.setInputFiles('#fileIn', [path.join(__dirname, 'xy/decimal_comma_200.csv')]);
  await p.waitForTimeout(1000);
  const n2 = await p.evaluate(() => window.crysta.pxrd.state.data.length);
  // Mo K-alpha 2 typed as lambda 1
  await pop.fill('#pxLambda', '0.71361');
  await pop.$eval('#pxLambda', (e) => e.dispatchEvent(new Event('change', { bubbles: true })));
  await pop.waitForTimeout(500);
  const note2 = await pop.$eval('#pxNote', (e) => e.textContent);
  const src2 = await pop.$eval('#pxSource', (e) => e.value);
  await pop.fill('#pxLambda', '0.71073');
  await pop.$eval('#pxLambda', (e) => e.dispatchEvent(new Event('change', { bubbles: true })));
  await pop.waitForTimeout(500);
  const note3 = await pop.$eval('#pxNote', (e) => e.textContent);
  const tblNote = await pop.$eval('#pxTblNote', (e) => e.textContent);
  console.log(JSON.stringify({ d1, note1, items, n_after_main_page_drop: n2, lambda_0_71361: { note: note2, source: src2 }, lambda_0_71073_note: note3, tblNote }, null, 1));
  await b.close();
})();
