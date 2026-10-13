const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  const out = {};
  for (const f of process.argv.slice(2)) {
    await p.setInputFiles('#fileIn', [f]); await p.waitForTimeout(2000);
    out[f.replace(/^.*\//, '')] = await p.evaluate(() => [window.crysta.state.notice, document.getElementById('readout').textContent.slice(0, 200), window.crysta.state.docs.length]);
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
