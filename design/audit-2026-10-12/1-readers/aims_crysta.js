const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const files = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean);
const out = {};
for (const f of files) {
  const name = f.split('/').pop();
  try {
    const r = C.readStructures(fs.readFileSync(f, 'utf8'), name);
    const s = r.structures[0];
    out[name] = { n: r.structures.length, format: s.meta.format, molecular: !!s.meta.molecular, cell: [s.cell.a, s.cell.b, s.cell.c, s.cell.al, s.cell.be, s.cell.ga], V: s.cell.V,
      sites: s.sites.map((t) => [t.label, t.el, t.f]), skipped: s.meta.skipped };
  } catch (e) { out[name] = { error: e.message }; }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
