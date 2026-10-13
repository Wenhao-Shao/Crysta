const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const out = {};
for (const f of process.argv.slice(3)) {
  const name = f.split('/').pop();
  try {
    const r = C.readStructures(fs.readFileSync(f, 'utf8'), name);
    const s = r.structures[0];
    // Cartesian positions as Crysta places them (cell frame: a along x); also the cell vectors
    out[name] = { format: s.meta.format, molecular: !!s.meta.molecular, cell: [s.cell.a, s.cell.b, s.cell.c, s.cell.al, s.cell.be, s.cell.ga],
      sites: s.sites.map((t) => [t.label, t.el, t.f, s.cell.toCart(t.f)]), skipped: s.meta.skipped };
  } catch (e) { out[name] = { error: e.message }; }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
