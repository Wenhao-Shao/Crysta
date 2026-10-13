// A1-01: cell contents (formula, density) lose the occupancy of split and coincident disorder sites.
// Crysta's cell contents (buildCell().counts) for a constructed file and for HybriD3 data sets.
// Expected for occupancy_sum.cif (by hand, symmetry x,y,z and -x,y,z):
//   Pb1 on the mirror: 1; Br1A 0.6 x 2 copies + Br1B 0.4 x 2 copies = 2.0; N1 0.5 x 2 copies (0.4 A apart) = 1.0;
//   H1A and H1B are mirror images (each 0.5 x 2 copies on the same two points) = 2.0
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const S = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
const show = (path, name) => {
  for (const s of C.readStructures(fs.readFileSync(path, 'utf8'), name).structures) {
    const uc = C.buildCell(s, {}); const info = C.analyse(uc);
    console.log(name, s.meta.block, 'cell contents', JSON.stringify(Object.fromEntries(Object.entries(uc.counts).map(([k, v]) => [k, +v.toFixed(3)]))),
      'formula', info.formula.map((e) => e.el + e.n).join(' '), 'Z', info.Z, 'density', info.density && info.density.toFixed(3));
  }
};
show(__dirname + '/cases/occupancy_sum.cif', 'occupancy_sum.cif');
for (const f of ['1362_1.cif', '2462_1.cif', '1614_1.cif', '1793_1.cif', '1194_1.cif']) show(S + f, f);
