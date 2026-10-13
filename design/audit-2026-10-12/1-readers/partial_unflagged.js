// Blocks whose default view shows non-H sites of partial occupancy that carry no disorder flag and are not
// paired as split sites: each is drawn and used as a full atom. Report the metal coordination numbers there.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const files = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
let nb = 0; const rows = [];
for (const f of files) {
  const name = f.split('/').pop();
  for (const s of C.readStructures(fs.readFileSync(f, 'utf8'), name).structures) {
    nb++;
    const uc = C.buildCell(s, {});
    const part = uc.atoms.filter((a) => a.el !== 'H' && a.dg === '.' && a.occ < 0.95);
    if (!part.length) continue;
    const labels = [...new Set(part.map((a) => a.label + '(' + a.occ + ')'))];
    // coordination of metal centres that bond to a partial unflagged ligand
    const cns = [];
    uc.atoms.forEach((a, i) => { if (!uc.center[i]) return; const L = uc.ligs[i]; if (L.some((l) => uc.atoms[l.j].dg === '.' && uc.atoms[l.j].occ < 0.95 && uc.atoms[l.j].el !== 'H')) cns.push(a.label + ':' + L.length); });
    rows.push([name, s.meta.block.slice(0, 14), labels.slice(0, 6).join(' '), [...new Set(cns)].slice(0, 4).join(' ')]);
  }
}
console.log('blocks', nb, 'with partial-occupancy unflagged non-H atoms shown as full atoms:', rows.length);
for (const r of rows) console.log(r.join(' | '));
