// 1000 structures from one zip: time to switch, to remove one, to open the PXRD window.
const H = require('./h.js');
(async () => {
  const b = await H.launch();
  const { p, errs } = await H.open(b);
  await H.load(p, [H.F('zip_1000_cifs.zip')], 15000);
  const timeIt = async (label, fn) => { const t = Date.now(); await fn(); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r()))); console.log(label, Date.now() - t, 'ms'); };
  console.log('docs', await p.evaluate(() => window.crysta.state.docs.length));
  await timeIt('switch to row 500', () => p.click('#tblCmp button[data-open="500"]'));
  await timeIt('switch to row 999', () => p.click('#tblCmp button[data-open="999"]'));
  await timeIt('remove row 10', () => p.click('#tblCmp button[data-close="10"]'));
  await timeIt('style SF', () => p.click('#styleSF'));
  const pop = p.context().waitForEvent('page');
  await timeIt('open PXRD', async () => { await p.click('#btnPxrd'); await pop; });
  const px = await pop; await px.waitForTimeout(2000);
  console.log('pxrd sims listed', await px.evaluate(() => document.querySelectorAll('#pxSims .px-item').length));
  await timeIt('switch with PXRD open', () => p.click('#tblCmp button[data-open="20"]'));
  console.log('errs', errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)));
  await b.close();
})();
