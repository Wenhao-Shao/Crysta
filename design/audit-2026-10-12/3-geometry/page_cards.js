// Read the framework card, the bridge table and the hydrogen-bond card as a user sees them (DOM text), for each file.
// usage: NODE_PATH=/opt/npm-tools/node_modules node page_cards.js out.json file1 file2 ...
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const files = process.argv.slice(3);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = [];
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file:///home/claude/crysta/dist/Crysta.html');
    await p.setInputFiles('#fileIn', [f]);
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const dl = Array.from(document.querySelectorAll('#dlFw dt')).map((dt) => [dt.textContent.trim(), dt.nextElementSibling ? dt.nextElementSibling.textContent.trim() : null]);
      const rows = (sel) => Array.from(document.querySelectorAll(sel + ' tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()));
      const s = window.crysta.state; const d = s.docs[s.cur];
      return { title: q('#title').textContent, sub: q('#sub').textContent, fwTitle: q('#fwTitle').textContent, dl, br: rows('#tblBr'), hbTitle: q('#hbTitle').textContent, hb: rows('#tblHB'), hbNote: q('#hbNote').textContent, fwNote: q('#fwNote').textContent,
        hbRows: d.hbRows, nAtoms: d.uc.atoms.length };
    });
    r.file = f; r.errors = errs;
    out.push(r);
    await p.close();
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  await b.close();
})();
