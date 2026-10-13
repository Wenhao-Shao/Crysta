const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const f = process.argv[2];
const s = C.readStructure(fs.readFileSync(f, 'utf8'), f.replace(/^.*\//, ''));
for (const t of [70, 120, 175]) {
  const t0 = Date.now();
  const p = C.powderPattern(s, { lambda: 1.54059, tthMin: 3, tthMax: t });
  console.log(f.replace(/^.*\//, ''), 'asked', t, 'tthMax', p.tthMax, 'cut', p.cut, 'refl', p.reflections.length, 'atoms', p.nAtoms, 'time', (Date.now() - t0) / 1000, 's');
}
