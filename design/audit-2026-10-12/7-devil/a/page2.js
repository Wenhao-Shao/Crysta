// PXRD window checks: A4-04 (table note), A4-03 (note at Mo Ka2), A4-02 (decimal comma data)
const { chromium } = require('playwright');
const E = process.argv[2], W = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [E + '/quartz_SiO2.cif', E + '/PEA2PbBr4.cif']); await p.waitForTimeout(2500);
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('#btnPxrd')]);
  await pop.waitForTimeout(1500);
  const out = {};
  out.sims = await pop.evaluate(() => Array.from(document.querySelectorAll('#pxSims .px-item')).map((e) => e.textContent + ' on=' + e.querySelector('input').checked));
  // select quartz in the table
  const tsel = await pop.$('#pxTableDoc'); const opts = await pop.evaluate(() => Array.from(document.querySelectorAll('#pxTableDoc option')).map((o) => [o.value, o.textContent]));
  out.opts = opts;
  const qv = opts.find((o) => /quartz/.test(o[1])); if (qv) await pop.selectOption('#pxTableDoc', qv[0]);
  await pop.fill('#pxTmax', '90'); await pop.press('#pxTmax', 'Enter'); await pop.waitForTimeout(1000);
  out.row210 = await pop.evaluate(() => Array.from(document.querySelectorAll('#pxTbl tbody tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent).join(' ')).filter((t) => /^2 1 0 /.test(t) || /57\.23/.test(t)));
  out.tblNote = await pop.evaluate(() => document.getElementById('pxTblNote').textContent);
  // Mo Ka2 as lambda1
  await pop.selectOption('#pxSource', 'other'); await pop.waitForTimeout(300);
  await pop.fill('#pxLambda', '0.71361'); await pop.press('#pxLambda', 'Enter'); await pop.waitForTimeout(1200);
  out.noteMoKa2 = await pop.evaluate(() => document.getElementById('pxNote').textContent);
  await pop.fill('#pxLambda', '1.535'); await pop.press('#pxLambda', 'Enter'); await pop.waitForTimeout(1200);
  out.note1535 = await pop.evaluate(() => document.getElementById('pxNote').textContent);
  // decimal comma data
  await pop.setInputFiles('#pxFile', [W + '/cases/dv_comma.csv']); await pop.waitForTimeout(1500);
  out.data = await pop.evaluate(() => Array.from(document.querySelectorAll('#pxData .px-item')).map((e) => e.textContent));
  out.noteData = await pop.evaluate(() => document.getElementById('pxNote').textContent);
  out.range = await pop.evaluate(() => [document.getElementById('pxTmin').value, document.getElementById('pxTmax').value]);
  await pop.screenshot({ path: W + '/shot_pxrd_comma.png' });
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
