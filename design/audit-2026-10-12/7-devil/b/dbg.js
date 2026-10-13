const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [process.argv[2]]);
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const e = document.getElementById('measTors'); let x = e, chain = []; while (x) { const cs = getComputedStyle(x); chain.push((x.id || x.className || x.tagName) + ':' + cs.display + ':' + (x.hidden ? 'H' : '')); x = x.parentElement; } return { chain, docs: window.crysta.state.docs.length, notice: window.crysta.state.notice }; });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: process.argv[3] });
  await b.close();
})();
