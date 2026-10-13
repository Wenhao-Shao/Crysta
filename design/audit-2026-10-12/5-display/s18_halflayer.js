const L = require('./lib.js');
(async () => {
  const { b, p } = await L.open({ ctx: { reducedMotion: 'reduce' } });
  await p.click('#btnExample');
  await p.waitForFunction(() => window.crysta.state.docs.length >= 4, null, { timeout: 60000 });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const C = window.XtalCore, st = window.crysta.state;
    return st.docs.map((d) => {
      const blk = C.assemble(d.uc, d.lo, d.hi, d.polyRules);
      const isM = (a) => !!d.uc.center[a.src];
      const ms = blk.atoms.filter(isM).length;
      // bridging halides of the framework drawn with only one of their two metals
      const brid = new Set(); for (const ms2 of d.uc.metalsOf.map((x, i) => [x, i])) if (ms2[0].length >= 2) brid.add(ms2[1]);
      let one = 0, two = 0;
      blk.atoms.forEach((a) => { if (!brid.has(a.src)) return; const k = a.bonds.filter((j) => isM(blk.atoms[j])).length; if (k >= 2) two++; else one++; });
      return { name: d.name, lo: d.lo, hi: d.hi, metals: ms, bridgingDrawnWithOneMetal: one, bridgingWithTwo: two, hbRows: d.hbRows.length, hbInBlock: new Set(blk.hbonds.map((h) => blk.atoms[h.d].label + blk.atoms[h.h >= 0 ? h.h : h.d].label + blk.atoms[h.a].label + h.dDA.toFixed(2))).size };
    });
  });
  console.log(JSON.stringify(r, null, 1));
  await p.click('#tblCmp button[data-open="0"]'); await p.waitForTimeout(2500);
  await p.locator('#stage').screenshot({ path: L.W + '/shots/a5_halflayer_PEA_default.png' });
  await p.click('#viewLayer'); await p.waitForTimeout(2500);
  await p.locator('#stage').screenshot({ path: L.W + '/shots/a5_halflayer_PEA_layernormal.png' });
  await b.close();
})();
