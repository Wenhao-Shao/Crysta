// Size: load a cell with about 2 000, 10 000 or 50 000 atoms. Time to the first picture, whether the page answers
// while it works, what it tells the user, and the time of a few later actions.
const H = require('./h.js');
const path = require('path');
const fs = require('fs');
const name = process.argv[2];
const limitMin = +(process.argv[3] || 20);
(async () => {
  const b = await H.launch();
  const { p, errs, dialogs } = await H.open(b);
  p.setDefaultTimeout(1800000);
  const out = { file: name };
  const t0 = Date.now();
  await p.setInputFiles('#fileIn', [H.F(name)]);
  // probe: does the page answer within 2 s? record the time of each probe until the structure is there
  const probes = [];
  let done = false;
  while (!done && Date.now() - t0 < limitMin * 60000) {
    const ts = Date.now();
    const r = await Promise.race([
      p.evaluate(() => ({ n: window.crysta.state.docs.length, readout: document.getElementById('readout').innerText.slice(0, 200) })).catch((e) => ({ err: e.message })),
      new Promise((res) => setTimeout(() => res(null), 2000))
    ]);
    probes.push({ at: ts - t0, answered: r ? Date.now() - ts : null, n: r && r.n });
    if (r && r.n >= 1) done = true; else await new Promise((res) => setTimeout(res, 3000));
  }
  out.loadMs = Date.now() - t0;
  out.loaded = done;
  out.unanswered = probes.filter((x) => x.answered === null).length;
  out.probesFirstLast = [probes[0], probes[probes.length - 1]];
  fs.writeFileSync(path.join(H.W, 'out', 't6_' + name + '_load.json'), JSON.stringify(out, null, 1));
  if (done) {
    await p.waitForTimeout(1000);
    out.snap = await H.snap(p);
    out.ui = await p.evaluate(() => ({ crystal: Array.from(document.querySelectorAll('#dlCrystal dt')).map((dt) => dt.textContent + ': ' + dt.nextElementSibling.textContent).join(' | '), hb: document.getElementById('cardHB').hidden ? 'hidden' : document.getElementById('tblHB').rows.length + ' rows', fw: document.getElementById('dlFw').innerText.slice(0, 300) }));
    await p.screenshot({ path: path.join(H.W, 'shots', 'big_' + name + '.png') });
    // later actions: change the style, press the first framework row, change packing, open the PXRD window
    const act = async (label, fn) => { const t = Date.now(); try { await fn(); } catch (e) { out[label + '_err'] = e.message; } await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r()))); out[label + 'Ms'] = Date.now() - t; };
    await act('styleSF', () => p.click('#styleSF', { timeout: 600000 }));
    await act('styleBS', () => p.click('#styleBS', { timeout: 600000 }));
    fs.writeFileSync(path.join(H.W, 'out', 't6_' + name + '_load.json'), JSON.stringify(out, null, 1));
    if (process.argv[4] === 'short') { console.log(JSON.stringify(out, null, 1)); await b.close(); return; }
    await p.evaluate(() => document.querySelectorAll('#rail .card.shut > button.fold').forEach((x) => x.click()));
    await act('glowRow', async () => { const r = await p.$$('#dlFw button.glowbtn'); if (r.length > 3) await r[3].click({ timeout: 600000 }); });
    out.glow = await p.evaluate(() => { const g = window.crysta.state.glow; return g ? { name: g.name, cut: g.cut, count: g.count } : null; });
    await act('packReset', () => p.click('#btnPackReset', { timeout: 600000 }));
    out.afterPackReset = await p.evaluate(() => window.crysta.state.notice);
    await act('labelsAll', () => p.selectOption('#selLabels', 'all', { timeout: 600000 }));
    out.afterLabels = await p.evaluate(() => window.crysta.state.notice);
    await p.selectOption('#selLabels', 'off');
    out.shapes = (await H.snap(p)).shapes;
  }
  out.errs = errs.filter((e) => !/ERR_TUNNEL|net::/.test(e));
  out.dialogs = dialogs;
  fs.writeFileSync(path.join(H.W, 'out', 't6_' + name + '.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
