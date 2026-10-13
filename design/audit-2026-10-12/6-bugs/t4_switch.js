// Interaction: fast switching between structures, measures then switch, removal order, shape counts.
const H = require('./h.js');
const path = require('path');
const fs = require('fs');
const log = [];
const say = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); log.push(s); console.log(s); };

/* screen positions of the drawn atoms that no nearer atom covers */
async function freeAtoms(p, n) {
  // screen points of drawn atoms; atoms that coincide on the screen (copies along the view) count once,
  // a point must be 10 px from every other point, and the chosen points are 24 px apart
  return p.evaluate((n) => {
    const v = window.crysta.viewer(); const m = v.getModel();
    const atoms = m.selectedAtoms({});
    const box = document.getElementById('gl').getBoundingClientRect();
    const pts = new Map();
    for (const a of atoms) {
      const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z });
      const x = s.x - window.scrollX, y = s.y - window.scrollY;
      const k = Math.round(x) + ',' + Math.round(y);
      if (!pts.has(k)) pts.set(k, { x, y, l: a.xl });
    }
    const P = Array.from(pts.values());
    const ok = [];
    for (const a of P) {
      if (ok.length >= n) break;
      if (a.x < box.left + 60 || a.x > box.right - 60 || a.y < Math.max(box.top, 0) + 40 || a.y > Math.min(box.bottom, window.innerHeight) - 60) continue;
      if (P.some((b) => b !== a && Math.hypot(b.x - a.x, b.y - a.y) < 10)) continue;
      if (ok.some((b) => Math.hypot(b.x - a.x, b.y - a.y) < 24)) continue;
      ok.push(a);
    }
    return ok;
  }, n);
}
async function clickAtoms(p, list) {
  for (const a of list) { await p.mouse.move(a.x, a.y); await p.waitForTimeout(80); await p.mouse.click(a.x, a.y); await p.waitForTimeout(250); }
}
const state = (p) => p.evaluate(() => {
  const st = window.crysta.state; const d = st.docs[st.cur];
  const v = window.crysta.viewer();
  const onRow = Array.from(document.querySelectorAll('#tblCmp tbody tr')).findIndex((r) => r.classList.contains('on'));
  return {
    cur: st.cur, n: st.docs.length, title: document.getElementById('title').textContent, docName: d ? d.name : null, onRow,
    measures: d ? d.measures.map((m) => m.labels.join('-') + ' ' + m.value.toFixed(3)) : [],
    measList: Array.from(document.querySelectorAll('#measList .mrow span')).map((s) => s.textContent),
    picks: d ? d.picks.length : null, shapes: v.shapes.length, labels: v.labels.length, models: v.getModelList().length,
    glow: st.glow ? st.glow.name : null, notice: st.notice
  };
});

(async () => {
  const b = await H.launch();
  const { p, errs } = await H.open(b);
  p.setDefaultTimeout(120000);
  await p.click('#btnExample');
  await p.waitForTimeout(4000);
  say('samples loaded', await state(p));

  await p.evaluate(() => document.querySelectorAll('#rail .card.shut > button.fold').forEach((x) => x.click()));
  // A. fast switching: click the rows of the Structures table with no wait
  const t0 = Date.now();
  for (let k = 0; k < (process.argv.includes('skipA') ? 0 : 40); k++) {
    const i = k % 4;
    await p.click('#tblCmp button[data-open="' + i + '"]', { timeout: 20000 });
  }
  const tA = Date.now() - t0;
  await p.waitForTimeout(1500);
  const sA = await state(p);
  say('A fast switching 40 clicks', tA + ' ms', sA);
  if (sA.onRow !== sA.cur || !sA.title.startsWith(sA.docName)) say('A MISMATCH row/title', sA);

  // B. measures in structure 0, then switch away and back
  await p.click('#tblCmp button[data-open="2"]');   // quartz: few atoms, clear picture
  await p.waitForTimeout(1500);
  const fa = await freeAtoms(p, 8);
  say('free atoms', fa.length, fa.map((a) => a.l));
  await p.evaluate(() => window.scrollTo(0, 0));
  await clickAtoms(p, fa.slice(0, 2));
  await clickAtoms(p, fa.slice(2, 4));
  await clickAtoms(p, fa.slice(4, 6));
  await clickAtoms(p, fa.slice(6, 7));                // one pick left open
  const sB0 = await state(p);
  say('B measures made', sB0);
  await p.click('#tblCmp button[data-open="0"]');
  await p.waitForTimeout(1500);
  const sB1 = await state(p);
  say('B after switch to 0', sB1);
  await p.click('#tblCmp button[data-open="2"]');
  await p.waitForTimeout(1500);
  const sB2 = await state(p);
  say('B back on 2', sB2);
  if (JSON.stringify(sB2.measures) !== JSON.stringify(sB0.measures)) say('B MEASURES CHANGED');
  say('B pending pick kept?', sB0.picks, '->', sB2.picks);

  // C. remove measures in a different order: the middle one, then the last, then the first
  const before = (await state(p)).measures;
  await p.click('#measList button[data-mrm="1"]');
  await p.waitForTimeout(500);
  const c1 = await state(p);
  await p.click('#measList button[data-mrm="1"]');
  await p.waitForTimeout(500);
  const c2 = await state(p);
  say('C removal', before, '-> after removing #2:', c1.measures, c1.measList, '-> after removing new #2:', c2.measures, c2.measList);
  if (c1.measures.length !== 2 || c1.measures[0] !== before[0] || c1.measures[1] !== before[2]) say('C WRONG MEASURE REMOVED');

  // D. shape count under many renders: style buttons, glow rows, packing
  await p.click('#tblCmp button[data-open="0"]');
  await p.waitForTimeout(1500);
  const sh0 = await state(p);
  for (let k = 0; k < 10; k++) { await p.click('#styleSF'); await p.click('#styleBS'); }
  await p.waitForTimeout(800);
  const sh1 = await state(p);
  // glow rows: open the Inorganic framework card first
  const rows = await p.$$('#dlFw button.glowbtn');
  say('glow rows', rows.length);
  await p.evaluate(() => { const c = document.getElementById('cardFw'); if (c.classList.contains('shut')) c.querySelector('button.fold').click(); });
  for (let k = 0; k < 3; k++) for (const r of await p.$$('#dlFw button.glowbtn')) { await r.click(); await p.waitForTimeout(150); }
  await p.waitForTimeout(1000);
  const sh2 = await state(p);
  say('D shapes: start', sh0.shapes, 'after 20 style clicks', sh1.shapes, 'after glow clicks', sh2.shapes, 'labels', sh0.labels, sh1.labels, sh2.labels, 'glow', sh2.glow);
  // hover many atoms: hover labels must not pile up
  const fb = await freeAtoms(p, 30);
  for (const a of fb) { await p.mouse.move(a.x, a.y); await p.waitForTimeout(90); }
  await p.mouse.move(5, 5);
  await p.waitForTimeout(300);
  const sh3 = await state(p);
  say('D after hovering', fb.length, 'atoms: labels', sh3.labels, 'shapes', sh3.shapes);
  // Escape stops the glow
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  say('D after Escape: glow', (await state(p)).glow);

  // E. remove structures from the table in a mixed order and check the current row
  const names = await p.evaluate(() => window.crysta.state.docs.map((d) => d.name));
  await p.click('#tblCmp button[data-open="3"]');
  await p.waitForTimeout(800);
  for (const i of [1, 0]) {
    await p.click('#tblCmp button[data-close="' + i + '"]');
    await p.waitForTimeout(800);
    const s = await state(p);
    say('E removed row', i, '->', s.n, 'docs, cur', s.cur, 'onRow', s.onRow, 'title', s.title, 'docName', s.docName);
  }
  await p.click('#tblCmp button[data-close="0"]');
  await p.click('#tblCmp button[data-close="0"]');
  await p.waitForTimeout(800);
  say('E all removed', await state(p), await H.snap(p));
  say('errors', errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)));
  fs.writeFileSync(path.join(H.W, 'out', 't4_switch.log'), log.join('\n'));
  await b.close();
})();
