// Page checks for auditor-3 findings. NODE_PATH=/opt/npm-tools/node_modules node page1.js
const { chromium } = require('playwright');
const H = process.env.H, W = process.env.W;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = {};
  async function open(file) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('file:///home/claude/crysta/dist/Crysta.html');
    await p.setInputFiles('#fileIn', [file]);
    await p.waitForTimeout(2500);
    p._errs = errs;
    return p;
  }
  const fwText = (p) => p.evaluate(() => Array.from(document.querySelectorAll('#dlFw dt, #dlFw dd')).map((e) => e.textContent.trim()).join(' | '));
  if (!process.env.ONLYCLICK) {
  // A3-02
  for (const f of ['2431_1.cif', '2258_1.cif']) {
    const p = await open(H + '/' + f);
    out[f] = await p.evaluate(() => ({ cardHBhidden: document.getElementById('cardHB').hidden, rows: document.querySelectorAll('#tblHB tbody tr').length, hbRows: window.crysta.state.docs[window.crysta.state.cur].hbRows.length }));
    await p.close();
  }
  // A3-03
  { const p = await open(H + '/2276_1.cif');
    out['2276_1'] = await p.evaluate(() => ({ rows: Array.from(document.querySelectorAll('#tblHB tbody tr')).map((r) => r.textContent.trim()), note: document.getElementById('hbNote').textContent, title: document.getElementById('hbTitle').textContent }));
    await p.close(); }
  // A3-06
  { const p = await open(H + '/2272_1.cif');
    out['2272_1'] = await p.evaluate(() => ({ brRows: document.querySelectorAll('#tblBr tbody tr').length, bridges: window.crysta.state.docs[window.crysta.state.cur].info.layer.bridges.length, note: document.getElementById('fwNote').textContent }));
    await p.close(); }
  // A3-07, A3-05, A3-01 card texts
  for (const f of ['630_1.cif', '1512_1.cif', '1202_1.cif', '526_1.in']) {
    const p = await open(H + '/' + f);
    out[f] = { fw: await fwText(p), readout: await p.evaluate(() => document.getElementById('readout').textContent) };
    await p.screenshot({ path: W + '/shots/' + f + '.png' });
    await p.close();
  }
  }
  // A3-04 and A3-08: real clicks
  for (const f of ['synth/da_hand_right_geometry.in', 'synth/da_hand_left_geometry.in', 'synth/da_linear_geometry.in']) {
    const p = await open(W + '/' + f);
    await p.click('#rail > .card h2:text-is("Measure")'); await p.waitForTimeout(300); await p.click('#measTors');
    const canvas = await p.$('#stage canvas');
    const box = await canvas.boundingBox();
    const pos = await p.evaluate(() => {
      const v = window.crysta.viewer(); const m = v.getModel();
      const want = ['C1', 'C2', 'C3', 'C4'];
      return want.map((l) => { const a = m.selectedAtoms({}).find((x) => x.xl === l); const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return [s.x, s.y]; });
    });
    for (const [x, y] of pos) { await p.mouse.click(x, y); await p.waitForTimeout(700); }
    out[f] = await p.evaluate(() => ({ list: document.getElementById('measList').textContent.trim(), measures: window.crysta.state.docs[window.crysta.state.cur].measures.map((m) => [m.labels.join('-'), m.value]) }));
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
