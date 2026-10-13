// The PXRD window in the built page, as a user sees it: reflection table, notes, d axis, saved files.
// run: NODE_PATH=/opt/npm-tools/node_modules node page_pxrd.js STRUCTURE_FILE [MEASURED_FILE] [OUTDIR] [settings JSON]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [file, measured, outdir0, settings0] = process.argv.slice(2);
const outdir = outdir0 || path.join(__dirname, 'page_out');
const settings = settings0 ? JSON.parse(settings0) : {};
fs.mkdirSync(outdir, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [file]);
  await p.waitForTimeout(1500);
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('#btnPxrd')]);
  await pop.waitForLoadState();
  pop.on('pageerror', (e) => errs.push('popup: ' + e.message));
  await pop.waitForTimeout(800);
  // settings through the form, as a user types them
  for (const [id, v] of Object.entries(settings)) {
    if (id === 'pxKa2') { if (v) await pop.check('#pxKa2'); else await pop.uncheck('#pxKa2'); }
    else if (id === 'pxSource' || id === 'pxStep' || id === 'pxOrder') await pop.selectOption('#' + id, String(v));
    else { await pop.fill('#' + id, String(v)); await pop.press('#' + id, 'Enter'); await pop.$eval('#' + id, (e) => e.dispatchEvent(new Event('change', { bubbles: true }))); }
    await pop.waitForTimeout(300);
  }
  if (measured) {
    await pop.setInputFiles('#pxFile', [measured]);
    await pop.waitForTimeout(1000);
  }
  await pop.waitForTimeout(500);
  const tbl = await pop.$$eval('#pxTbl tbody tr', (rows) => rows.map((r) => Array.from(r.cells).map((c) => c.textContent)));
  const head = await pop.$$eval('#pxTbl thead th', (c) => c.map((x) => x.textContent));
  const note = await pop.$eval('#pxNote', (e) => e.textContent);
  const tblNote = await pop.$eval('#pxTblNote', (e) => e.textContent);
  const info = await pop.$$eval('[data-info]', (e) => e.map((x) => x.textContent));
  // the plot geometry and the text of the d axis and the 2-theta axis
  const axes = await p.evaluate(() => {
    const px = window.crysta.pxrd.state;
    const g = px.geo;
    const svg = px.root.querySelector('#pxPlot svg');
    const texts = Array.from(svg.querySelectorAll('text')).map((t) => ({ x: +t.getAttribute('x'), y: +t.getAttribute('y'), s: t.textContent }));
    return { xl: g.xl, xr: g.xr, yt: g.yt, ya: g.ya, view: g.view, lambda: px.lambda, lambda2: px.lambda2, ka2: px.ka2, fwhm: px.fwhm, eta: px.eta, ratio: px.ratio, step: px.step, texts,
      prof: (() => { const d = px.tableDoc; return d && d.px && d.px.prof ? { x0: d.px.prof.x0, step: d.px.prof.step, n: d.px.prof.Y.length } : null; })() };
  });
  // the same numbers from XtalCore in the page
  const core = await p.evaluate(() => {
    const px = window.crysta.pxrd.state;
    const d = px.tableDoc;
    const pat = window.XtalCore.powderPattern(d.struct, { lambda: px.lambda, tthMin: px.tmin, tthMax: px.tmax, bDefault: px.bDefault });
    return { tmin: px.tmin, tmax: px.tmax, minRel: px.minRel, refl: pat.reflections.filter((r) => r.tth >= px.tmin && r.tth <= pat.tthMax) };
  });
  const saved = {};
  for (const [a, name] of [['savetbl', 'table.txt'], ['savexy', 'pattern.xy'], ['csv', 'patterns.csv'], ['svg', 'plot.svg']]) {
    const [dl] = await Promise.all([pop.waitForEvent('download'), pop.click('button[data-a="' + a + '"]')]);
    const to = path.join(outdir, name);
    await dl.saveAs(to);
    saved[a] = { file: to, suggested: dl.suggestedFilename() };
  }
  await pop.screenshot({ path: path.join(outdir, 'pxrd.png') });
  fs.writeFileSync(path.join(outdir, 'page.json'), JSON.stringify({ head, tbl, note, tblNote, info, axes, core, saved, errs }, null, 1));
  console.log(JSON.stringify({ rows: tbl.length, note, tblNote, info, saved, errs }, null, 1));
  await b.close();
})();
