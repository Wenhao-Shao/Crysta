const { C } = require('./cr.js');
const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const s = C.readStructure(fs.readFileSync(f, 'utf8'), f.replace(/^.*\//, ''));
  const uc = C.buildCell(s, {});
  const xyz = s.sites.map((t) => s.cell.toCart(t.f || t.frac || t.xyz));
  const blk = C.assemble(uc, [0, 0, 0], [1, 1, 1]);
  const at = blk.atoms.filter((a) => a.el === 'C');
  const byL = (l) => at.find((a) => a.label === l).xyz;
  console.log(f.replace(/^.*\//, ''), 'cell', [s.cell.a, s.cell.b, s.cell.c, s.cell.al, s.cell.be, s.cell.ga].map((x) => +x.toFixed(3)).join(' '), 'labels', at.map((a) => a.label).join(','), 'torsion', C.torsion(byL(at[0].label), byL(at[1].label), byL(at[2].label), byL(at[3].label)).toFixed(2));
}
