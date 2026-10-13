// Hydrogen-bond rows as the page builds them (rebuildCell: one 1x1x1 block when the cell has more than 400 atoms, else 3x3x3),
// and the same search in a 3x3x3 block, for comparison. usage: node a3_hb.js <cif> [block]
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const path = process.argv[2];
const all = C.readStructures(fs.readFileSync(path, 'utf8'), path.replace(/^.*\//, '')).structures;
const st = process.argv[3] ? all.find((s) => s.meta.block === process.argv[3]) : all[0];
const uc = C.buildCell(st, {});
const rows = (blk) => { const seen = new Map(); for (const h of blk.hbonds) { const A = blk.atoms; const key = A[h.d].label + '|' + (h.h >= 0 ? A[h.h].label : '') + '|' + A[h.a].label + '|' + h.dDA.toFixed(2); if (!seen.has(key)) seen.set(key, h); } return seen; };
const page = rows(uc.atoms.length <= 400 ? C.assemble(uc, [-1, -1, -1], [2, 2, 2]) : C.assemble(uc, [0, 0, 0], [1, 1, 1]));
const big = rows(C.assemble(uc, [-1, -1, -1], [2, 2, 2]));
console.log(path.replace(/^.*\//, ''), 'atoms in cell', uc.atoms.length, '| rows as in the page', page.size, '| rows from a 3x3x3 block', big.size);
for (const k of big.keys()) if (!page.has(k)) console.log('  not in the page list:', k);
// which atoms can be acceptors in a 3x3x3 block: kind of each halide
const blk = C.assemble(uc, [0, 0, 0], [1, 1, 1]);
const kinds = {}; blk.atoms.forEach((a) => { if (C.HALIDE.has(a.el)) kinds[a.kind] = (kinds[a.kind] || 0) + 1; });
console.log('  halide atoms by kind in a 1x1x1 block:', JSON.stringify(kinds), '(only ligand, ion and network halides are acceptors)');
