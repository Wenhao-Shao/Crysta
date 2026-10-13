// Dump what Crysta's readers give for a list of files (as read by XtalCore, the code of the page).
// usage: node dump_crysta.js out.json file1 file2 ...   (or a file list with @list.txt)
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const out = {};
let files = process.argv.slice(3);
if (files.length === 1 && files[0][0] === '@') files = fs.readFileSync(files[0].slice(1), 'utf8').split('\n').filter(Boolean);
const opText = (o) => ({ R: o.R, T: o.T });
for (const f of files) {
  const name = f.split('/').pop();
  const text = fs.readFileSync(f, 'utf8');
  const rec = { name };
  try {
    const r = C.readStructures(text, name);
    rec.errors = r.errors;
    rec.structures = r.structures.map((s) => ({
      block: s.meta.block, format: s.meta.format,
      cell: [s.cell.a, s.cell.b, s.cell.c, s.cell.al, s.cell.be, s.cell.ga], V: s.cell.V,
      cellRaw: s.meta.cellRaw,
      spaceGroup: s.meta.spaceGroup, sgNumber: s.meta.sgNumber, symSource: s.meta.symSource,
      ops: s.ops.map(opText),
      sites: s.sites.map((t) => ({ label: t.label, el: t.el, f: t.f, occ: t.occ, u: t.u, dg: t.dg, asm: t.asm, minor: t.minor, symdis: t.symdis })),
      skipped: s.meta.skipped, molecular: !!s.meta.molecular,
    }));
  } catch (e) { rec.error = String(e.message); }
  out[name] = rec;
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log('files', files.length);
