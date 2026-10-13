const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
for (const n of process.argv.slice(2)) {
  const text = fs.readFileSync(__dirname + '/files/' + n, 'utf8');
  let t = Date.now();
  const r = C.readStructures(text, n);
  const s = r.structures[0];
  const tr = Date.now() - t; t = Date.now();
  const uc = C.buildCell(s, {});
  const tb = Date.now() - t; t = Date.now();
  const info = C.analyse(uc);
  const ta = Date.now() - t; t = Date.now();
  const blk = C.assemble(uc, [0, 0, 0], [1, 1, 1]);
  const ts = Date.now() - t;
  console.log(n, 'sites', s.sites.length, 'uc', uc.atoms.length, 'read', tr, 'buildCell', tb, 'analyse', ta, 'assemble', ts, 'ms; block atoms', blk.atoms.length, 'fw', info.framework && info.framework.dim);
}
