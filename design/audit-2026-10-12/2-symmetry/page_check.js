// Open each file in the built page, the way a user does, and read the info card (#dlCrystal), the header (#sub) and the Structures table.
// run: NODE_PATH=/opt/npm-tools/node_modules node page_check.js out.json file1 file2 ...
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const out = [];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route(/^https?:/, (r) => r.abort()); await p.goto('file:///home/claude/crysta/dist/Crysta.html', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
  const files = process.argv.slice(3);
  for (const f of files) {
    await p.setInputFiles('#fileIn', [f]);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const dl = document.getElementById('dlCrystal');
      const pairs = [];
      if (dl) { const dts = dl.querySelectorAll('dt'); dts.forEach((dt) => pairs.push([dt.innerText, dt.nextElementSibling ? dt.nextElementSibling.innerText : ''])); }
      const s = window.crysta.state; const d = s.docs[s.cur];
      const sgRow = dl ? Array.from(dl.querySelectorAll('dt')).find((dt) => dt.innerText === 'Space group') : null;
      return { sgHtml: sgRow && sgRow.nextElementSibling ? sgRow.nextElementSibling.innerHTML : null, sub: document.getElementById('sub').innerText, card: pairs, notice: s.notice, nAtoms: d ? d.uc.atoms.length : null };
    });
    r.file = path.basename(f);
    const shot = path.join(path.dirname(process.argv[2]), 'shot_' + r.file.replace(/\W/g, '_') + '.png');
    await p.screenshot({ path: shot });
    r.shot = shot;
    out.push(r);
  }
  // the Structures table as the Copy button gives it
  const tsv = await p.evaluate(() => { const rows = document.querySelectorAll('#tblCmp tr'); return Array.from(rows).map((tr) => Array.from(tr.children).map((td) => td.innerText.replace(/\n/g, ' ')).join('\t')).join('\n'); });
  fs.writeFileSync(process.argv[2], JSON.stringify({ out, tsv, errs }, null, 1));
  await b.close();
})();
