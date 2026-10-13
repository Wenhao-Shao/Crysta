// Text from a file must never run as HTML. Load every hostile file, then press every row, hover and click atoms,
// open the PXRD and Databases windows, and count injected elements and alert() calls in the page and the popup.
const H = require('./h.js');
const path = require('path');
const fs = require('fs');
const FILES = ['xss_fields.cif', 'xss_hbond.cif', 'xss_split.cif', '<img src=x onerror=alert(16)>.cif', 'zip_hybrid_xss.zip', 'xss.POSCAR', 'xss.res', 'xss.xyz', 'xss_geometry.in', '<img src=x onerror=alert(41)>.xy'];
const count = (p) => p.evaluate(() => ({
  alerts: (window.__xss || []).slice(),
  onattr: document.querySelectorAll('[onerror],[onload]').length,
  imgs: Array.from(document.querySelectorAll('img')).map((e) => e.outerHTML).slice(0, 5),
  svgOnload: document.querySelectorAll('svg[onload]').length
}));
(async () => {
  const b = await H.launch();
  const { p, errs, dialogs } = await H.open(b);
  p.setDefaultTimeout(120000);
  const popups = [];
  p.context().on('page', async (pg) => {
    popups.push(pg);
    pg.on('dialog', async (d) => { dialogs.push('popup ' + d.type() + ': ' + d.message()); await d.dismiss(); });
    pg.on('pageerror', (e) => errs.push('popup pageerror: ' + e.message));
  });
  await H.load(p, FILES.map(H.F), 8000);
  const res = { afterLoad: await count(p) };
  const docs = await p.evaluate(() => window.crysta.state.docs.map((d) => d.name));
  res.docs = docs;
  // every structure: activate it, press every glow row, hover and click atoms, open the element pop, copy the table
  for (let i = 0; i < docs.length; i++) {
    await p.click('#tblCmp button[data-open="' + i + '"]');
    await p.waitForTimeout(900);
    await p.evaluate(() => document.querySelectorAll('#rail .card.shut > button.fold').forEach((b) => b.click()));
    for (const r of await p.$$('#cardFw button.glowbtn, #cardHB button.glowbtn')) { try { await r.click({ timeout: 2000 }); await p.waitForTimeout(250); } catch (e) { /* hidden */ } }
    const pts = await p.evaluate(() => {
      const v = window.crysta.viewer(); const m = v.getModel(); if (!m) return [];
      return m.selectedAtoms({}).slice(0, 40).map((a) => { const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return { x: s.x, y: s.y }; });
    });
    for (const q of pts.slice(0, 6)) { await p.mouse.move(q.x, q.y); await p.waitForTimeout(60); await p.mouse.click(q.x, q.y); await p.waitForTimeout(120); }
    // right-click on a measurement line, if any
    const m = await p.evaluate(() => { const st = window.crysta.state; const d = st.docs[st.cur]; if (!d.measures.length) return null; const v = window.crysta.viewer(); const a = d.measures[0].pts[0], c = d.measures[0].pts[1]; const s1 = v.modelToScreen({ x: a[0], y: a[1], z: a[2] }), s2 = v.modelToScreen({ x: c[0], y: c[1], z: c[2] }); return { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 }; });
    if (m) { await p.mouse.click(m.x, m.y, { button: 'right' }); await p.waitForTimeout(300); res['ctx' + i] = await p.evaluate(() => document.getElementById('ctxMenu').innerText); await p.keyboard.press('Escape'); }
    // plane through atoms: the pick bar lists the labels
    await p.click('#mpAtoms');
    for (const q of pts.slice(0, 3)) { await p.mouse.click(q.x, q.y); await p.waitForTimeout(120); }
    try { await p.click('#mpDone', { timeout: 1500 }); } catch (e) { try { await p.click('#mpCancel', { timeout: 1500 }); } catch (e2) { /* none */ } }
    // a polyhedron pick and an element pop
    const chip = await p.$('#legend button.chip'); if (chip) { await chip.click(); await p.waitForTimeout(200); await p.keyboard.press('Escape'); }
    res['doc' + i] = await count(p);
    console.log('doc', i, docs[i], JSON.stringify(res['doc' + i]));
  }
  // the Structures table as text: what a spreadsheet gets
  await p.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); });
  await p.click('#btnCopy');
  await p.waitForTimeout(300);
  res.tsv = await p.evaluate(() => document.getElementById('tsvBox').value);
  // PXRD window (a popup in this browser) with every structure on
  await p.click('#btnPxrd');
  await p.waitForTimeout(3000);
  const px = popups.find((pg) => pg.url() === 'about:blank') || popups[0];
  if (px) {
    await px.evaluate(() => { window.__xss = []; window.alert = (m) => window.__xss.push(String(m)); });
    for (const box of await px.$$('#pxSims input[data-f="on"]')) { if (!(await box.isChecked())) { await box.click(); await px.waitForTimeout(400); } }
    await px.waitForTimeout(2000);
    res.pxrd = await px.evaluate(() => ({ alerts: window.__xss, onattr: document.querySelectorAll('[onerror],[onload]').length, imgs: document.querySelectorAll('img').length, names: Array.from(document.querySelectorAll('#pxSims label, #pxData label')).map((e) => e.textContent), legend: Array.from(document.querySelectorAll('#pxPlot svg text')).map((t) => t.textContent).filter((t) => /img|alert/.test(t)) }));
    await px.screenshot({ path: path.join(H.W, 'shots', 'xss_pxrd.png') });
  } else res.pxrd = 'no popup';
  // Databases window
  await p.click('#btnDbs');
  await p.waitForTimeout(800);
  await p.fill('#dbText', '<img src=x onerror=alert(50)>');
  await p.waitForTimeout(500);
  res.dbs = await count(p);
  await p.keyboard.press('Escape');
  res.final = await count(p);
  res.errs = errs.filter((e) => !/ERR_TUNNEL|net::/.test(e));
  res.dialogs = dialogs;
  await p.screenshot({ path: path.join(H.W, 'shots', 'xss_page.png'), fullPage: true });
  fs.writeFileSync(path.join(H.W, 'out', 't5_xss.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1).slice(0, 6000));
  await b.close();
})();
