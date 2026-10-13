const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  const t0 = Date.now();
  await p.setInputFiles('#fileIn', [process.argv[2]]);
  // probe the page every 2 s
  let answered = 0, missed = 0, done = false;
  while (!done && Date.now() - t0 < 300000) {
    const r = await Promise.race([p.evaluate(() => window.crysta.state.docs.length).then((n) => ({ n })), new Promise((res) => setTimeout(() => res(null), 2000))]);
    if (r === null) missed++; else { answered++; if (r.n > 0) done = true; }
  }
  const t1 = Date.now();
  await p.waitForTimeout(3000);
  const info = await p.evaluate(() => { const st = window.crysta.state; const d = st.docs[st.cur]; return { atoms: d.uc.atoms.length, lo: d.lo, hi: d.hi, def: d.def, shown: st.shown }; });
  await p.click('#rail > .card h2:text-is("Packing")').catch(() => {});
  await p.waitForTimeout(500);
  await p.click('#btnPackReset'); await p.waitForTimeout(3000);
  const notice = await p.evaluate(() => window.crysta.state.notice);
  console.log(JSON.stringify({ loadSeconds: (t1 - t0) / 1000, probesMissed: missed, probesAnswered: answered, info, resetNotice: notice }));
  await b.close();
})();
