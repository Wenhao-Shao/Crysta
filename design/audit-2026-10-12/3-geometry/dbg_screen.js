const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [process.argv[2]]);
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const v = window.crysta.viewer();
    const at = v.getModel().selectedAtoms({});
    const cvs = Array.from(document.querySelectorAll('canvas')).map((c) => { const r = c.getBoundingClientRect(); return [c.id, r.left, r.top, r.width, r.height]; });
    const s = at.slice(0, 5).map((a) => { const q = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return [a.xl, a.elem, q.x, q.y]; });
    return { n: at.length, cvs, s, pb: at.filter((a) => a.elem === 'Pb').length };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
