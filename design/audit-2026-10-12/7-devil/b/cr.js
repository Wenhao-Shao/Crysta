// Crysta values in Node (object of the test). usage: node cr.js <file> [blockSubstring] [what]
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
function load(file, block) {
  const text = fs.readFileSync(file, 'utf8');
  const r = C.readStructures(text, file.replace(/^.*\//, ''));
  let s = r.structures[0];
  if (block) s = r.structures.find((x) => String(x.meta.block).includes(block)) || s;
  const uc = C.buildCell(s, { minor: false });
  const info = C.analyse(uc);
  return { s, uc, info, blocks: r.structures.map((x) => x.meta.block) };
}
function hbRows(uc, mode) {
  const big = mode === 'big' || (mode !== 'cell' && uc.atoms.length <= 400) ? C.assemble(uc, [-1, -1, -1], [2, 2, 2]) : C.assemble(uc, [0, 0, 0], [1, 1, 1]);
  const seen = new Map();
  for (const h of big.hbonds) {
    const A = big.atoms;
    const key = A[h.d].label + '|' + (h.h >= 0 ? A[h.h].label : '') + '|' + A[h.a].label + '|' + h.dDA.toFixed(2);
    if (!seen.has(key)) seen.set(key, { key, D: A[h.d].label, H: h.h >= 0 ? A[h.h].label : null, A: A[h.a].label, dHA: h.dHA, dDA: h.dDA, angle: h.angle });
  }
  return { rows: Array.from(seen.values()).sort((p, q) => p.dDA - q.dDA), hasH: big.hasH, big };
}
module.exports = { C, load, hbRows };
if (require.main === module) {
  const [file, block, what] = process.argv.slice(2);
  const { s, uc, info, blocks } = load(file, block && block !== '-' ? block : null);
  const L = info.layer;
  const out = { blocks, nAtoms: uc.atoms.length, sg: s.meta.spaceGroup, fw: info.framework && { dim: info.framework.dim, hkl: info.framework.hkl, dhkl: info.framework.dhkl, spacing: info.framework.spacing, components: info.framework.components } };
  if (L) out.layer = { n: L.n, nUniform: L.nUniform, slab: L.slabThickness, gallery: L.gallery, slabs: L.slabs, offset: L.offset && { s1: L.offset.s1, s2: L.offset.s2, kind: L.offset.kind, p1: L.offset.p1, p2: L.offset.p2, m0: uc.atoms[L.offset.m0].label, m1: uc.atoms[L.offset.m1].label }, nBridges: L.bridges.length, axialTilt: L.axialTilt, pen: L.penetration };
  if (what === 'hb' || what === 'hbbig' || what === 'hbcell') {
    const r = hbRows(uc, what === 'hbbig' ? 'big' : what === 'hbcell' ? 'cell' : null);
    out.hb = r.rows.map((x) => [x.D, x.H, x.A, +(x.dHA || 0).toFixed(3), +x.dDA.toFixed(3), x.angle && +x.angle.toFixed(1)]);
    out.hbCount = r.rows.length;
  }
  if (what === 'sites') out.sites = info.metalSites.map((m) => ({ label: m.label, cn: m.cn, mean: m.mean, dd: m.deltaD, s2: m.sigma2, oct: m.octahedral }));
  if (what === 'bridges' && L) out.bridges = L.bridges;
  console.log(JSON.stringify(out, null, 1));
}
