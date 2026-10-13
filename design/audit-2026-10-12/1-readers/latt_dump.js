const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const out = {};
for (const n of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7]) {
  const f = 'latt' + (n > 0 ? '+' : '') + n + '.ins';
  const s = C.readStructure(fs.readFileSync(process.argv[2] + '/' + f, 'utf8'), f);
  const uc = C.buildCell(s, {});
  out[n] = { ops: s.ops.map((o) => ({ R: o.R, T: o.T })), occ: s.sites[0].occ, natoms: uc.atoms.length, pos: uc.atoms.map((a) => a.f) };
}
console.log(JSON.stringify(out));
