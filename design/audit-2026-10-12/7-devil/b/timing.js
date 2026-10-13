const { C } = require('./cr.js'); const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const t0 = Date.now(); const s = C.readStructure(fs.readFileSync(f, 'utf8'), f); const t1 = Date.now();
  const uc = C.buildCell(s, {}); const t2 = Date.now(); const info = C.analyse(uc); const t3 = Date.now();
  console.log(f.replace(/^.*\//, ''), uc.atoms.length, 'read', t1 - t0, 'buildCell', t2 - t1, 'analyse', t3 - t2, 'ms');
}
