// Page checks: the table copied as text against the cards; a CIF with a byte-order mark; which atoms a disorder case shows
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/^https?:/, (r) => r.abort());
  await p.goto('file:///home/claude/crysta/dist/Crysta.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.crysta && window.crysta.state, null, { timeout: 120000 });
  const files = process.argv.slice(3);
  await p.setInputFiles('#fileIn', files);
  await p.waitForFunction((n) => window.crysta.state.docs.length >= n, files.length, { timeout: 180000 }).catch(() => {});
  await p.waitForTimeout(2000);
  await p.click('#btnCopy');
  await p.waitForTimeout(800);
  let clip = null;
  try { clip = await p.evaluate(() => navigator.clipboard.readText()); } catch (e) { clip = 'ERR ' + e.message; }
  const box = await p.evaluate(() => { const t = document.getElementById('tsvBox'); return t && !t.hidden ? t.value : null; });
  const r = await p.evaluate(() => {
    const s = window.crysta.state;
    return { readout: document.getElementById('readout').innerText,
      table: Array.from(document.querySelectorAll('#tblCmp tr')).map((tr) => Array.from(tr.cells).map((c) => c.innerText.replace('×', '').replace('Copy table', '').trim())),
      docs: s.docs.map((d) => ({ name: d.name, shown: d.uc.atoms.map((a) => a.label), V: d.struct.cell.V, a: d.struct.meta.cellRaw })) };
  });
  // the Crystal data card of each structure, as the user sees it
  r.sheets = [];
  for (let i = 0; i < r.docs.length; i++) {
    await p.click('#tblCmp button[data-open="' + i + '"]');
    await p.waitForTimeout(1200);
    r.sheets.push(await p.evaluate(() => document.getElementById('dlCrystal').innerText));
  }
  r.clip = clip; r.box = box; r.errors = errs;
  fs.writeFileSync(process.argv[2], JSON.stringify(r, null, 1));
  await b.close();
})();
