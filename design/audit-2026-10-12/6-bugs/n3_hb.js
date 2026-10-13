const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
for (const n of process.argv.slice(2)) {
  const s = C.readStructures(fs.readFileSync(__dirname + '/files/' + n, 'utf8'), n).structures[0];
  const uc = C.buildCell(s, {});
  const big = C.assemble(uc, [-1, -1, -1], [2, 2, 2]);
  const info = C.analyse(uc);
  console.log(n, 'hbonds', big.hbonds.length, big.hbonds.slice(0, 2).map((h) => [big.atoms[h.d].label, h.h >= 0 ? big.atoms[h.h].label : null, big.atoms[h.a].label]), 'metalSites', info.metalSites.map((m) => m.label), 'autoSplit', uc.autoSplit);
}
