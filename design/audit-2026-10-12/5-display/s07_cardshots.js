const L = require('./lib.js');
(async () => {
  const { b, p } = await L.open();
  await L.load(p, [L.EX + '/PEA2PbBr4.cif']);
  for (const id of ['fwTitle', 'hbTitle', 'cardTitle5']) { const e = await p.$('#' + id); if (e) await e.click(); }
  await p.evaluate(() => document.querySelectorAll('#rail .card.shut > h2').forEach((h) => h.click()));
  await p.waitForTimeout(500);
  await p.locator('#cardFw').screenshot({ path: L.W + '/shots/card_fw.png' });
  await p.locator('#cardHB').screenshot({ path: L.W + '/shots/card_hb.png' });
  await p.locator('#dlCrystal').screenshot({ path: L.W + '/shots/card_crystal.png' });
  await b.close();
})();
