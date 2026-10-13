const L = require('./lib.js');
(async () => {
  const { b, p } = await L.open();
  await L.load(p, [L.EX + '/PEA2PbBr4.cif']);
  const r = await p.evaluate(() => {
    const C = window.XtalCore, st = window.crysta.state, d = st.docs[st.cur];
    const blk = C.assemble(d.uc, d.lo, d.hi, d.polyRules);
    const A = blk.atoms;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const nrm = (a) => Math.sqrt(dot(a, a));
    const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (nrm(u) * nrm(v))))) * 180 / Math.PI;
    const out = { lo: d.lo, hi: d.hi, nAtoms: A.length };
    // bridge angles in the block for each bridging Br
    const isM = (a) => !!d.uc.center[a.src];
    const br = {};
    A.forEach((a, k) => { const ms = a.bonds.filter((j) => isM(A[j])); if (ms.length < 2) { if (/Br[1456]$/.test(a.label)) { br[a.label + ' nM=' + ms.length] = (br[a.label + ' nM=' + ms.length] || 0) + 1; } return; }
      for (let p = 0; p < ms.length; p++) for (let q = p + 1; q < ms.length; q++) { const key = a.label + ' ' + A[ms[p]].label + '-' + A[ms[q]].label + ' ' + ang(sub(A[ms[p]].xyz, a.xyz), sub(A[ms[q]].xyz, a.xyz)).toFixed(3); br[key] = (br[key] || 0) + 1; } });
    out.bridges = br;
    out.layerBridges = d.info.layer.bridges.map((b) => [b.x, b.m1, b.m2, b.theta.toFixed(3), b.equatorial]);
    // hbonds in the block
    const hb = {};
    for (const h of blk.hbonds) { const key = A[h.d].label + '-' + (h.h >= 0 ? A[h.h].label : '') + '...' + A[h.a].label + ' ' + h.dDA.toFixed(3); hb[key] = (hb[key] || 0) + 1; }
    out.blockHB = hb;
    out.rows = d.hbRows.map((r) => r.D + '-' + r.H + '...' + r.A + ' ' + r.dDA.toFixed(3));
    // per Br label in block: count and heights along c*
    const cnt = {};
    A.forEach((a) => { if (a.el === 'Br' || a.el === 'N') { cnt[a.label] = (cnt[a.label] || 0) + 1; } });
    out.counts = cnt;
    // N1 molecules in the block: for each N1, nearest Br2 distance among block atoms
    const near = {};
    for (const lab of ['N1', 'N2', 'N3', 'N4']) {
      const ns = A.filter((a) => a.label === lab);
      near[lab] = ns.map((n) => { let best = 1e9, bl = ''; for (const x of A) if (x.el === 'Br') { const dd = nrm(sub(x.xyz, n.xyz)); if (dd < best) { best = dd; bl = x.label; } } return bl + ':' + best.toFixed(3) + ' f=' + n.f.map((v) => v.toFixed(2)).join(','); });
    }
    out.nearBr = near;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
