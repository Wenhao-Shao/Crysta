const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [process.argv[2]]);
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    let e = document.getElementById('measDist'); const chain = [];
    while (e) { const cs = getComputedStyle(e); chain.push([e.tagName, e.id, e.className, cs.display, cs.visibility, e.hidden]); e = e.parentElement; }
    return chain;
  });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: 'dbg_layout.png' });
  await b.close();
})();
