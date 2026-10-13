// Crysta's powderAtoms cell content (sum of occupancies per element) for many files: JSON lines
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
for (const f of process.argv.slice(2)) {
  try {
    const s = C.readStructure(fs.readFileSync(f, 'utf8'), f.replace(/^.*\//, ''));
    const pa = C.powderAtoms(s, 1);
    const sum = {};
    for (const a of pa.atoms) sum[a.el] = (sum[a.el] || 0) + a.occ;
    console.log(JSON.stringify({ f: f.replace(/^.*\//, ''), n: pa.atoms.length, sum }));
  } catch (e) { console.log(JSON.stringify({ f: f.replace(/^.*\//, ''), err: e.message })); }
}
