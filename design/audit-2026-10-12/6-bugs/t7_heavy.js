// Heavy inputs, one per page: wait until the page answers and the load is over; record time, message, errors.
const H = require('./h.js');
const fs = require('fs'); const path = require('path');
const name = process.argv[2]; const limitMin = +(process.argv[3] || 10);
(async () => {
  const b = await H.launch();
  const { p, errs, dialogs } = await H.open(b);
  const t0 = Date.now();
  await p.setInputFiles('#fileIn', [H.F(name)]);
  let last = null, stable = 0, unanswered = 0;
  while (Date.now() - t0 < limitMin * 60000) {
    const r = await Promise.race([p.evaluate(() => ({ n: window.crysta.state.docs.length, notice: window.crysta.state.notice.slice(0, 300), px: !!(window.crysta.pxrd && window.crysta.pxrd.isOpen()) })).catch((e) => ({ err: e.message })), new Promise((res) => setTimeout(() => res(null), 3000))]);
    if (!r) { unanswered++; continue; }
    const k = JSON.stringify(r);
    if (k === last && (r.n > 0 || r.notice || r.px)) { if (++stable >= 2) break; } else stable = 0;
    last = k;
    await new Promise((res) => setTimeout(res, 2000));
  }
  const out = { file: name, ms: Date.now() - t0 - 4000, unansweredProbes: unanswered, state: JSON.parse(last || 'null') };
  out.snap = await Promise.race([H.snap(p), new Promise((res) => setTimeout(() => res('no answer'), 10000))]);
  out.rows = await p.evaluate(() => document.querySelectorAll('#tblCmp tbody tr').length).catch(() => null);
  out.errs = errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)); out.dialogs = dialogs;
  out.mem = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + ' MB' : null).catch(() => null);
  // the PXRD popup, if one opened
  const pages = p.context().pages();
  if (pages.length > 1) { const px = pages[pages.length - 1]; out.pxrd = await px.evaluate(() => ({ data: Array.from(document.querySelectorAll('#pxData .px-item')).map((e) => e.innerText.replace(/\s+/g, ' ')), note: (document.getElementById('pxNote') || {}).textContent })).catch((e) => e.message); await px.screenshot({ path: path.join(H.W, 'shots', 'heavy_px_' + name + '.png') }).catch(() => {}); }
  await p.screenshot({ path: path.join(H.W, 'shots', 'heavy_' + name + '.png') }).catch(() => {});
  fs.writeFileSync(path.join(H.W, 'out', 't7_' + name + '.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 3000));
  await b.close();
})();
