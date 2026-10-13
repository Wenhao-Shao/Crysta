const L = require('./lib.js');
const fs = require('fs');
(async () => {
  const out = {};
  const { b, ctx, p, errs } = await L.open();
  const reqs = [];
  p.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) reqs.push(r.url()); });
  await p.click('#btnDbs'); await p.waitForTimeout(800);
  const state = () => p.evaluate(() => { const box = document.querySelector('.dbfloat'); if (!box) return null; const r = box.getBoundingClientRect();
    return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], count: (box.querySelector('#dbCount') || {}).innerText, rows: box.querySelectorAll('#dbTbl tbody tr').length, focus: document.activeElement && document.activeElement.id, tabs: Array.from(box.querySelectorAll('button[data-tab]')).map((x) => x.innerText + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')), foot: (box.querySelector('.db-panel > .small:last-child') || {}).innerText }; });
  out.open = await state();
  await p.screenshot({ path: L.W + '/shots/dbs_open.png' });
  // search
  for (const t of ['phenethyl', 'PEA', 'PbBr4', 'Pb Br', 'zzzz']) {
    await p.fill('#dbText', t); await p.waitForTimeout(400);
    out['search_' + t] = await state();
  }
  await p.fill('#dbText', 'phenethyl'); await p.waitForTimeout(300);
  out.firstRows = await p.evaluate(() => Array.from(document.querySelectorAll('#dbTbl tbody tr')).slice(0, 4).map((tr) => ({ text: tr.innerText.replace(/\s+/g, ' ').slice(0, 300), links: Array.from(tr.querySelectorAll('a')).map((a) => a.textContent + ' -> ' + a.href + ' target=' + a.target) })));
  await p.screenshot({ path: L.W + '/shots/dbs_search.png' });
  await p.selectOption('#dbDim', '2'); await p.waitForTimeout(300);
  out.dim2 = await state();
  await p.check('#dbOnly'); await p.waitForTimeout(300);
  out.only = await state();
  // the formula column against the stoichiometry (sub tags)
  out.formulaCells = await p.evaluate(() => Array.from(document.querySelectorAll('#dbTbl tbody tr td:nth-child(2)')).slice(0, 5).map((td) => td.innerHTML));
  // check every row: download links and page links have the form of the database
  out.linkForms = await p.evaluate(() => { const bad = []; let n = 0; document.querySelectorAll('#dbTbl a').forEach((a) => { n++; if (!/^https:\/\/materials\.hybrid3\.duke\.edu\/materials\/(datasets\/\d+\/files\/|\d+)$/.test(a.href)) bad.push(a.href); }); return { n, bad: bad.slice(0, 5) }; });
  // the other tabs
  await p.click('button[data-tab="nmse"]'); await p.waitForTimeout(300);
  out.nmse = await p.evaluate(() => { const b = document.querySelector('.db-link'); return { text: b.innerText, links: Array.from(b.querySelectorAll('a')).map((a) => a.href + ' ' + a.target) }; });
  await p.click('button[data-tab="cod"]'); await p.waitForTimeout(300);
  out.cod = await p.evaluate(() => { const b = document.querySelector('.db-link'); return { text: b.innerText.slice(0, 200), links: Array.from(b.querySelectorAll('a')).map((a) => a.href + ' ' + a.target) }; });
  await p.click('button[data-tab="hybrid3"]'); await p.waitForTimeout(300);
  out.backToH3 = await state();   // the search text and filters kept?
  // Escape closes, and the button toggles
  await p.focus('#dbText'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  out.afterEsc = await state();
  await p.click('#btnDbs'); await p.waitForTimeout(300);
  out.reopen = await state();
  // a click on Download without network: a new tab, the page stays
  const popP = ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await p.click('#dbTbl a.db-get >> nth=0'); const pop = await popP; await p.waitForTimeout(800);
  out.download = { newTab: !!pop, url: pop ? pop.url() : null, pageStill: await p.evaluate(() => !!document.querySelector('.dbfloat')) };
  // narrow screen
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
  out.phone = await state();
  out.phoneScroll = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, document.querySelector('.db-table').scrollWidth, document.querySelector('.db-table').clientWidth]);
  await p.screenshot({ path: L.W + '/shots/dbs_phone.png' });
  out.reqs = reqs; out.errs = errs;
  fs.writeFileSync(L.W + '/s10_dbs.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
