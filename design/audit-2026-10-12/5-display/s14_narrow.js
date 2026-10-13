// Phone width (390 x 844) and a narrow desktop (1024 wide): horizontal scroll, cut text, controls that cannot be used.
const L = require('./lib.js');
const fs = require('fs');
const audit = () => {
  const W = window.innerWidth;
  const res = { scrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth, innerW: W, wide: [], cut: [], covered: [], tiny: [] };
  const vis = (e) => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]'); };
  // elements wider than the window or reaching past its right edge, outside a scrolling box
  const inScroller = (e) => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (/(auto|scroll|hidden)/.test(cs.overflowX)) return x; } return null; };
  document.querySelectorAll('body *').forEach((e) => {
    if (!vis(e) || e.closest('svg, #gl, .ctx')) return;
    const r = e.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !inScroller(e)) res.wide.push(e.tagName + '#' + e.id + '.' + e.className + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
    const cs = getComputedStyle(e);
    if (e.children.length === 0 && e.textContent.trim() && (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis' || cs.whiteSpace === 'nowrap') && e.scrollWidth > e.clientWidth + 1 && cs.display !== 'inline') res.cut.push(e.tagName + '#' + e.id + '.' + e.className + ': ' + e.textContent.trim().slice(0, 50) + ' (' + e.scrollWidth + '>' + e.clientWidth + ')');
  });
  // every visible button, select and input: is its centre on top (not covered) and is it at least 24 px?
  document.querySelectorAll('button, select, input, a, label.filebtn').forEach((e) => {
    if (!vis(e) || e.closest('svg') || (e.type === 'file')) return;
    const r = e.getBoundingClientRect();
    const sc = e.closest('.rail, .tbl-wrap, .db-table, .px-side, .pxfloat');
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cx > W || cy < 0 || cy > window.innerHeight) return;   // off screen: checked when scrolled to
    const top = document.elementFromPoint(cx, cy);
    if (top && top !== e && !e.contains(top) && !(top.closest && top.closest('label') === e.closest('label'))) res.covered.push(e.tagName + '#' + e.id + ' "' + (e.innerText || e.value || '').trim().slice(0, 30) + '" under ' + top.tagName + '#' + top.id + '.' + top.className);
    if ((r.height < 20 || r.width < 20) && e.type !== 'checkbox' && e.type !== 'radio') res.tiny.push(e.tagName + '#' + e.id + ' "' + (e.innerText || '').trim().slice(0, 20) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  return res;
};
(async () => {
  const out = {};
  for (const [name, ctxOpts] of [['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['desk1024', { viewport: { width: 1024, height: 768 } }]]) {
    const { b, ctx, p, errs } = await L.open({ ctx: Object.assign({ reducedMotion: 'reduce' }, ctxOpts) });
    const r = { empty: await p.evaluate(audit) };
    await p.screenshot({ path: L.W + '/shots/narrow_' + name + '_empty.png', fullPage: true });
    await p.click('#btnExample');
    await p.waitForFunction(() => window.crysta.state.docs.length >= 4, null, { timeout: 60000 });
    await p.waitForTimeout(3000);
    await p.click('#tblCmp button[data-open="0"]'); await p.waitForTimeout(3000);
    // open every card
    await p.evaluate(() => document.querySelectorAll('#rail .card.shut > h2').forEach((h) => h.click()));
    await p.waitForTimeout(800);
    r.loaded = await p.evaluate(audit);
    r.stage = await p.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(); return [Math.round(s.width), Math.round(s.height)]; });
    await p.screenshot({ path: L.W + '/shots/narrow_' + name + '_loaded.png', fullPage: true });
    // the definition note and a measurement on the narrow screen
    await p.click('[data-glow="30"] .glowbtn'); await p.waitForTimeout(1500);
    r.withNote = await p.evaluate(audit);
    r.note = await p.evaluate(() => { const n = document.getElementById('defNote').getBoundingClientRect(); const s = document.getElementById('stage').getBoundingClientRect(); return { note: [Math.round(n.left - s.left), Math.round(n.top - s.top), Math.round(n.width), Math.round(n.height)], stage: [Math.round(s.width), Math.round(s.height)], cover: +(n.width * n.height / (s.width * s.height)).toFixed(2) }; });
    await p.locator('#stage').screenshot({ path: L.W + '/shots/narrow_' + name + '_note.png' });
    // the PXRD window (as a floating window: the popup is refused)
    await p.evaluate(() => { window.open = () => null; });
    await p.click('#btnPxrd'); await p.waitForTimeout(3000);
    r.pxrd = await p.evaluate(audit);
    r.pxrdBox = await p.evaluate(() => { const f = document.querySelector('.pxfloat'); if (!f) return null; const r = f.getBoundingClientRect(); const plot = document.getElementById('pxPlot').getBoundingClientRect(); return { box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], plot: [Math.round(plot.width), Math.round(plot.height)], scrollW: f.scrollWidth, clientW: f.clientWidth, svg: !!document.querySelector('#pxPlot svg') }; });
    await p.screenshot({ path: L.W + '/shots/narrow_' + name + '_pxrd.png' });
    await p.evaluate(() => document.querySelector('.pxfloat').scrollTo(0, 10000)); await p.waitForTimeout(500);
    await p.screenshot({ path: L.W + '/shots/narrow_' + name + '_pxrd_bottom.png' });
    const closeBtn = await p.$('#pxClose'); if (closeBtn) await closeBtn.click();
    r.errs = errs;
    out[name] = r;
    await b.close();
  }
  fs.writeFileSync(L.W + '/s14_narrow.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 20000));
})();
