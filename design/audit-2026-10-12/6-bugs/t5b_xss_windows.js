// Hostile names in the PXRD window (popup), the Databases window, and the Disorder row of a split site.
const H = require('./h.js');
const fs = require('fs'); const path = require('path');
const FILES = ['xss_fields.cif', 'xss_hbond.cif', 'xss_split2.cif', '<img src=x onerror=alert(16)>.cif', 'zip_hybrid_xss.zip', 'xss.POSCAR', 'xss.res', '<img src=x onerror=alert(41)>.xy'];
(async () => {
  const b = await H.launch();
  const { p, errs, dialogs } = await H.open(b);
  p.setDefaultTimeout(120000);
  const res = {};
  await H.load(p, FILES.map(H.F), 9000);
  const pages = p.context().pages();
  const px = pages.find((x) => x !== p);
  res.disorderRow = await p.evaluate(() => { const i = window.crysta.state.docs.findIndex((d) => d.name === 'xss_split2'); return i; });
  await p.click('#tblCmp button[data-open="' + res.disorderRow + '"]');
  await p.waitForTimeout(1500);
  res.disorderText = await p.evaluate(() => Array.from(document.querySelectorAll('#dlCrystal dt')).filter((dt) => /Disorder/.test(dt.textContent)).map((dt) => dt.nextElementSibling.innerHTML));
  res.minorLabelShown = await p.evaluate(() => !document.getElementById('lblMinor').hidden);
  await p.check('#chkMinor');
  await p.waitForTimeout(1500);
  res.disorderTextMinor = await p.evaluate(() => Array.from(document.querySelectorAll('#dlCrystal dt')).filter((dt) => /Disorder/.test(dt.textContent)).map((dt) => dt.nextElementSibling.textContent));
  if (px) {
    await px.evaluate(() => { window.__xss = []; window.alert = (m) => window.__xss.push(String(m)); });
    for (let k = 0; k < 12; k++) {
      const id = await px.evaluate(() => { const b = Array.from(document.querySelectorAll('#pxSims input[data-f="on"]')).find((x) => !x.checked); return b ? b.id : null; });
      if (!id) break;
      await px.click('#' + id);
      await px.waitForTimeout(800);
    }
    await px.waitForTimeout(2000);
    res.pxrd = await px.evaluate(() => ({ alerts: window.__xss, onattr: document.querySelectorAll('[onerror],[onload]').length, imgs: document.querySelectorAll('img').length, names: Array.from(document.querySelectorAll('#pxSims label, #pxData label')).map((e) => e.textContent), options: Array.from(document.querySelectorAll('#pxTableDoc option')).map((o) => o.textContent), legendText: Array.from(document.querySelectorAll('#pxPlot svg text')).map((t) => t.textContent).filter((t) => /img|alert/.test(t)) }));
    // hover over the plot: the tooltip carries the names
    const box = await px.$('#pxPlot');
    const bb = await box.boundingBox();
    await px.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await px.waitForTimeout(500);
    res.pxTip = await px.evaluate(() => ({ tip: (document.getElementById('pxTip') || {}).innerText, inj: document.querySelectorAll('#pxTip img, #pxTip [onerror]').length }));
    // the stacked view puts each name in the plot too
    await px.click('button[data-a="stack"]');
    await px.waitForTimeout(800);
    res.pxStack = await px.evaluate(() => ({ alerts: window.__xss, imgs: document.querySelectorAll('img').length, onattr: document.querySelectorAll('[onerror],[onload]').length }));
    await px.screenshot({ path: path.join(H.W, 'shots', 'xss_pxrd.png') });
  } else res.pxrd = 'no popup';
  await p.evaluate(() => document.getElementById('btnDbs').click());
  await p.waitForTimeout(800);
  await p.fill('#dbText', '<img src=x onerror=alert(50)>');
  await p.waitForTimeout(800);
  res.dbs = await p.evaluate(() => ({ alerts: window.__xss, onattr: document.querySelectorAll('[onerror],[onload]').length, imgs: document.querySelectorAll('img').length, count: document.getElementById('dbCount') && document.getElementById('dbCount').textContent }));
  res.errs = errs.filter((e) => !/ERR_TUNNEL|net::/.test(e));
  res.dialogs = dialogs;
  fs.writeFileSync(path.join(H.W, 'out', 't5b_xss_windows.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
