const L = require('./lib.js');
const fs = require('fs');
(async () => {
  const { b, p, errs } = await L.open({ ctx: { reducedMotion: 'reduce' } });
  await p.click('#btnExample');
  await p.waitForFunction(() => window.crysta.state.docs.length >= 4, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const out = {};
  out.names = await p.evaluate(() => window.crysta.state.docs.map((d) => d.name));
  // open every card
  await p.evaluate(() => document.querySelectorAll('#rail .card.shut > h2').forEach((h) => h.click()));
  await p.waitForTimeout(500);
  out.docs = [];
  for (let i = 0; i < out.names.length; i++) {
    await p.click('#tblCmp button[data-open="' + i + '"]');
    await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelectorAll('#rail .card.shut > h2').forEach((h) => h.click()));
    const r = await p.evaluate(() => {
      const txt = (id) => { const e = document.getElementById(id); return e && !e.closest('[hidden]') ? e.innerText : null; };
      // text that is cut: an element whose content is wider than its box and whose overflow hides it
      const cut = [];
      document.querySelectorAll('#rail *, .head *, #readout *, #cardCmp th').forEach((e) => {
        const cs = getComputedStyle(e);
        if (e.offsetParent === null) return;
        if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && e.children.length === 0) cut.push(e.tagName + '.' + e.className + ': ' + e.textContent.slice(0, 60));
      });
      const fonts = {};
      for (const sel of ['#dlCrystal dd', '#dlFw dd', '#dlFw dt', '#tblBr td', '#tblHB td', '#tblCmp td', '#readout', '#measList', '.foot', 'h2', '#title', '#sub']) { const e = document.querySelector(sel); if (e) { const cs = getComputedStyle(e); fonts[sel] = cs.fontFamily.split(',')[0] + ' ' + cs.fontSize; } }
      const railOverflow = (() => { const r = document.getElementById('rail'); return [r.scrollWidth, r.clientWidth]; })();
      return { title: txt('title'), sub: txt('sub'), crystal: txt('dlCrystal'), fwTitle: txt('fwTitle'), fw: txt('dlFw'), br: txt('tblBr'), fwNote: txt('fwNote'), hbTitle: txt('hbTitle'), hb: txt('tblHB'), hbNote: txt('hbNote'), poly: txt('polyList'), planes: txt('planeList'), chromo: txt('chromoList'), cut, fonts, railOverflow, pageW: [document.documentElement.scrollWidth, window.innerWidth] };
    });
    out.docs.push(r);
    await p.screenshot({ path: L.W + '/shots/cards_' + i + '.png', fullPage: true });
    await p.locator('#rail').screenshot({ path: L.W + '/shots/rail_' + i + '.png' });
  }
  // the comparison table and the text that Copy table gives
  out.cmp = await p.evaluate(() => Array.from(document.querySelectorAll('#tblCmp tr')).map((tr) => Array.from(tr.children).map((c) => c.innerText.replace('Copy table', '').replace('×', '').trim())));
  await p.click('#btnCopy'); await p.waitForTimeout(800);
  out.tsv = await p.evaluate(() => { const b = document.getElementById('tsvBox'); return { hidden: b.hidden, text: b.value, msg: !document.getElementById('copyMsg').hidden, btn: document.getElementById('btnCopy') ? document.getElementById('btnCopy').innerText : null }; });
  out.errs = errs;
  fs.writeFileSync(L.W + '/s06_cards.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 30000));
  await b.close();
})();
