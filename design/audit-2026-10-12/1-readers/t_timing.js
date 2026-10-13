const { chromium } = require('playwright');
(async () => {
  let t = Date.now(); const lap = (m) => { console.log(m, Date.now() - t); t = Date.now(); };
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  lap('launch');
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.route(/^https?:/, (r) => r.abort());
  lap('page');
  await p.goto('file:///home/claude/crysta/dist/Crysta.html', { waitUntil: 'domcontentloaded' });
  lap('goto');
  await p.waitForFunction(() => window.crysta && window.crysta.state);
  lap('ready');
  await p.setInputFiles('#fileIn', [process.argv[2]]);
  lap('setInput');
  await p.waitForFunction(() => window.crysta.state.docs.length > 0, null, { timeout: 60000 });
  lap('docs');
  await b.close();
})();
