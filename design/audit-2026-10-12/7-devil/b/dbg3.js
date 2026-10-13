const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('download', (d) => console.log('DOWNLOAD', d.suggestedFilename()));
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', ['/home/claude/crysta/examples/urea.cif']);
  await p.waitForTimeout(2500);
  await p.click('#rail > .card h2:text-is("Export")'); await p.waitForTimeout(300);
  console.log(await p.evaluate(() => [document.getElementById('btnPng').offsetParent !== null, document.getElementById('pngScale').value]));
  await p.click('#btnPng'); await p.waitForTimeout(5000);
  console.log(await p.evaluate(() => window.crysta.state.notice));
  await b.close();
})();
