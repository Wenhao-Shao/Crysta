const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [process.argv[2]]);
  await p.waitForTimeout(2500);
  await p.click('#rail > .card h2:text-is("Measure")'); await p.waitForTimeout(300); await p.click('#measTors'); await p.waitForTimeout(500);
  const info = await p.evaluate(() => {
    const v = window.crysta.viewer(); const m = v.getModel();
    const atoms = m.selectedAtoms({});
    const cv = document.querySelector('#stage canvas'); const r = cv.getBoundingClientRect();
    return { n: atoms.length, labels: atoms.map((a) => a.xl), canvas: [r.x, r.y, r.width, r.height], scr: atoms.map((a) => v.modelToScreen({ x: a.x, y: a.y, z: a.z })), measure: window.crysta.state.measure, nCanvas: document.querySelectorAll('#stage canvas').length };
  });
  console.log(JSON.stringify(info));
  await p.screenshot({ path: process.argv[3] });
  await b.close();
})();
