const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
for (const n of process.argv.slice(2)) {
  try {
    const r = C.readStructures(fs.readFileSync(__dirname + '/files/' + n, 'utf8'), n);
    const s = r.structures[0];
    const uc = C.buildCell(s, {});
    console.log(n, 'sites', s.sites.map((x) => x.label).join(' '), '| skipped', JSON.stringify(s.meta.skipped), '| uc atoms', uc.atoms.length, '| sym', s.meta.symSource, s.ops.length, '| errors', JSON.stringify(r.errors));
  } catch (e) { console.log(n, 'ERROR', e.message); }
}
