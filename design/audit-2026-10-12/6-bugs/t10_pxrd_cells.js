// The PXRD window with structures that have odd or broken cells: does it answer, and what does it say?
// Also the names of the files that the page saves, for a structure with a non-ASCII name.
const H = require('./h.js');
const fs = require('fs');
const path = require('path');
const list = process.argv.slice(2);
(async () => {
  const b = await H.launch();
  const out = {};
  for (const n of list) {
    const { p, errs } = await H.open(b);
    p.setDefaultTimeout(180000);
    await H.load(p, [H.F(n)], /big_/.test(n) ? 40000 : 6000);
    const ok = await p.evaluate(() => window.crysta.state.docs.length);
    if (!ok) { out[n] = 'not opened'; console.log(n, 'not opened'); await p.close(); continue; }
    const t0 = Date.now();
    const pop = p.context().waitForEvent('page', { timeout: 60000 }).catch(() => null);
    await p.click('#btnPxrd');
    const px = await pop;
    let r = null;
    if (px) {
      px.setDefaultTimeout(180000);
      // wait until the window answers
      for (let k = 0; k < 60; k++) {
        r = await Promise.race([px.evaluate(() => ({ note: (document.getElementById('pxNote') || {}).textContent, info: Array.from(document.querySelectorAll('#pxSims .more')).map((e) => e.textContent), tblNote: (document.getElementById('pxTblNote') || {}).textContent, rows: document.querySelectorAll('#pxTbl tbody tr').length })).catch((e) => ({ err: e.message })), new Promise((res) => setTimeout(() => res(null), 5000))]);
        if (r && (r.note || r.err)) break;
      }
      await px.screenshot({ path: path.join(H.W, 'shots', 'pxcell_' + n.replace(/[^A-Za-z0-9._-]/g, '_') + '.png') }).catch(() => {});
    }
    out[n] = { ms: Date.now() - t0, pxrd: r, errs: errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)) };
    console.log(n, JSON.stringify(out[n]).slice(0, 900));
    // saved file names: PNG, SVG and mol2 from the page, and the xy and table from the PXRD window
    if (/saved/.test(n) || /[^\x00-\x7f]/.test(n)) {
      const names = [];
      p.on('download', (d) => names.push(d.suggestedFilename()));
      if (px) px.on('download', (d) => names.push(d.suggestedFilename()));
      await p.evaluate(() => document.querySelectorAll('#rail .card.shut > button.fold').forEach((x) => x.click()));
      for (const id of ['#btnPng', '#btnSvg', '#btnMol2']) { await p.click(id); await p.waitForTimeout(1500); }
      if (px) { for (const a of ['savexy', 'savetbl', 'csv']) { await px.click('button[data-a="' + a + '"]').catch(() => {}); await px.waitForTimeout(1500); } }
      out[n].saved = names;
      console.log('   saved as', names);
    }
    await p.close();
  }
  fs.writeFileSync(path.join(H.W, 'out', 't10_' + list.join('_').replace(/[^A-Za-z0-9]/g, '').slice(0, 60) + '.json'), JSON.stringify(out, null, 1));
  await b.close();
})();
