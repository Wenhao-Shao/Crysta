// page checks for the new findings: DA-a01 (1032_1), DA-a06 (786_1 framework card), DA-a05 (atoms per cell: card vs PXRD window), DA-a02 (220_1.in)
const { chromium } = require('playwright');
const H = process.argv[2], E = process.argv[3], W = process.argv[4];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  const out = {};
  const open = async (f) => { await p.setInputFiles('#fileIn', [f]); await p.waitForTimeout(2000); };
  const cards = () => p.evaluate(() => {
    const drawn = {}; const m = window.crysta.viewer().getModel(); if (m) m.selectedAtoms({}).forEach((a) => { drawn[a.elem] = (drawn[a.elem] || 0) + 1; });
    const dl = (id) => Array.from(document.querySelectorAll('#' + id + ' dt')).map((dt) => dt.textContent + ': ' + (dt.nextElementSibling ? dt.nextElementSibling.textContent : ''));
    return { crystal: dl('dlCrystal'), fw: dl('dlFw'), fwNote: document.getElementById('fwNote').textContent, drawn }; });
  await open(H + '/1032_1.cif'); out.s1032 = await cards(); await p.screenshot({ path: W + '/shot_1032.png' });
  await open(H + '/786_1.cif'); out.s786 = await cards(); await p.screenshot({ path: W + '/shot_786.png' });
  await open(E + '/FCA3_2PbBr4_294K.cif'); out.fca = await cards();
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('#btnPxrd')]);
  await pop.waitForTimeout(2000);
  out.pxSims = await pop.evaluate(() => Array.from(document.querySelectorAll('#pxSims .px-item')).map((e) => e.textContent));
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
