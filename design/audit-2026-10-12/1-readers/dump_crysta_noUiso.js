// Crysta's Ueq from the anisotropic loop: hide the Uiso/Biso columns in memory, then read.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const files = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean);
const out = {};
for (const f of files) {
  const name = f.split('/').pop();
  const text = fs.readFileSync(f, 'utf8').replace(/_atom_site_(U|B)_iso_or_equiv/gi, '_atom_site_$1_iso_or_equiv_hidden');
  try {
    const r = C.readStructures(text, name);
    out[name] = r.structures.map((s) => s.sites.map((t) => [t.label, t.u]));
  } catch (e) { out[name] = String(e.message); }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
