// In the page: open a structure, turn labels on, save the mol2 file and the SVG drawing with real clicks,
// and record the atoms of the 3D model (label, element, x y z) and their screen positions.
// usage: NODE_PATH=/opt/npm-tools/node_modules node page_export.js outdir file1 [file2 ...]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const dir = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/^https?:/, (r) => r.abort());
  await p.goto('file:///home/claude/crysta/dist/Crysta.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.crysta && window.crysta.state, null, { timeout: 120000 });
  const files = process.argv.slice(3);
  for (let k = 0; k < files.length; k++) {
    const n0 = await p.evaluate(() => window.crysta.state.docs.length);
    await p.setInputFiles('#fileIn', [files[k]]);
    await p.waitForFunction((n) => window.crysta.state.docs.length > n, n0, { timeout: 120000 });
    await p.waitForTimeout(1500);
    // atom labels on, every atom
    await p.selectOption('#selLabels', 'all');
    await p.waitForTimeout(1500);
    // open the Export card if it is closed, then save
    const save = async (id) => {
      const btn = p.locator('#' + id);
      if (!(await btn.isVisible())) {
        await p.evaluate((bid) => { const c = document.getElementById(bid).closest('section, .card'); if (c) { const t = c.querySelector('.cardhead button, button.fold, [aria-expanded]'); if (t) t.click(); } }, id);
        await p.waitForTimeout(500);
      }
      await btn.scrollIntoViewIfNeeded();
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), btn.click()]);
      const path = dir + '/' + k + '_' + dl.suggestedFilename();
      await dl.saveAs(path);
      return path;
    };
    const mol2 = await save('btnMol2');
    // the model as drawn, and its screen projection (orthographic, as the SVG writer uses)
    const model = await p.evaluate(() => {
      const v = window.crysta.viewer();
      const m = v.getModel();
      const atoms = m.selectedAtoms({});
      const gl = document.getElementById('gl').getBoundingClientRect();
      const de = document.documentElement;
      const ox = gl.left + window.pageXOffset - de.clientLeft, oy = gl.top + window.pageYOffset - de.clientTop;
      return { atoms: atoms.map((a) => { const q = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return { el: a.elem, label: a.xl, x: a.x, y: a.y, z: a.z, sx: q.x - ox, sy: q.y - oy }; }),
        name: window.crysta.state.docs[window.crysta.state.cur].name, persp: document.getElementById('chkPersp').checked };
    });
    const svg = await save('btnSvg');
    fs.writeFileSync(dir + '/' + k + '_model.json', JSON.stringify(Object.assign(model, { mol2, svg, file: files[k] })));
    console.log('saved', files[k], mol2, svg, model.atoms.length);
  }
  console.log('errors', errs);
  await b.close();
})();
