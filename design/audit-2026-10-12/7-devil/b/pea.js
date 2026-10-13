const { C, load, hbRows } = require('./cr.js');
const { s, uc, info } = load('/home/claude/crysta/examples/PEA2PbBr4.cif');
console.log('cell', s.cell.a, s.cell.b, s.cell.c, s.cell.al, s.cell.be, s.cell.ga, s.meta.spaceGroup);
const Lc = [s.cell.a, s.cell.b, s.cell.c];
const n = Lc.map((x) => Math.max(1, Math.min(3, Math.ceil(14 / x))));
console.log('default block', n, 'hkl', info.framework.hkl);
for (const [lo, hi] of [[[0, 0, 0], n], [[-0.1, -0.1, -0.1], n.map((x) => x + 0.1)]]) {
  const blk = C.assemble(uc, lo, hi, []);
  const A = blk.atoms;
  const metals = A.filter((a) => uc.center[a.src]);
  const br = A.filter((a) => a.el === 'Br');
  const nm = br.map((a) => a.bonds.filter((j) => uc.center[A[j].src]).length);
  const cnt = {}; nm.forEach((x) => { cnt[x] = (cnt[x] || 0) + 1; });
  // bridges in the uc analysis: which Br bridge 2 metals
  const bridgingSrc = new Set(); uc.atoms.forEach((a, j) => { if (uc.metalsOf[j].length >= 2) bridgingSrc.add(j); });
  const brBridge = br.filter((a) => bridgingSrc.has(a.src));
  const c2 = {}; brBridge.forEach((a) => { const k = a.bonds.filter((j) => uc.center[A[j].src]).length; c2[k] = (c2[k] || 0) + 1; });
  const zs = metals.map((a) => +a.f[2].toFixed(4));
  console.log(JSON.stringify({ lo, hi, nAtoms: A.length, metals: metals.length, metalZ: [...new Set(zs)].sort((x, y) => x - y), bridgingBr_by_drawnMetals: c2 }));
  // highlight of each bridge row
  const L = info.layer;
  for (const b of L.bridges.slice(0, 4)) {
    const hs = C.highlightSet(blk, uc, info, { type: 'bridge', m1: b.m1, x: b.x, m2: b.m2, theta: b.theta });
    console.log('  bridge', b.m1 + '-' + b.x + '-' + b.m2, b.theta.toFixed(2), 'atoms', hs.atoms.length, 'arcs', hs.arcs.length);
  }
}
const r = hbRows(uc);
console.log('hb rows', r.rows.length);
const blk = C.assemble(uc, [0, 0, 0], n, []);
let empty = 0;
for (const x of r.rows) { const hs = C.highlightSet(blk, uc, info, { type: 'hbond', D: x.D, H: x.H, A: x.A, dDA: x.dDA }); if (!hs.atoms.length) empty++; }
console.log('hb rows with no highlight in default block', empty);
