const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const files = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean);
const out = {};
for (const f of files) {
  const name = f.split('/').pop();
  try {
    out[name] = C.readStructures(fs.readFileSync(f, 'utf8'), name).structures.map((s) => { const uc = C.buildCell(s, {}); const info = C.analyse(uc); return { block: s.meta.block, density: info.density, Z: info.Z, formula: info.formula }; });
  } catch (e) { out[name] = String(e); }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
