// Crysta's unit cell (buildCell) and formula/Z/density (analyse) for a list of files.
// usage: node dump_cells.js files.json out.json [noAnalyse]
const fs = require('fs');
const path = require('path');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const files = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const noAnalyse = process.argv[4] === 'noAnalyse';
const out = [];
for (const fp of files) {
  const rec = { file: fp, structures: [], error: null };
  try {
    const text = fs.readFileSync(fp, 'utf8');
    const read = C.readStructures(text, path.basename(fp));
    rec.readErrors = read.errors;
    for (const s of read.structures) {
      const t0 = Date.now();
      const r = { block: s.meta.block, meta: { spaceGroup: s.meta.spaceGroup, sgNumber: s.meta.sgNumber, symSource: s.meta.symSource, Z: s.meta.Z, skipped: s.meta.skipped },
        nops: s.ops.length, cell: { a: s.cell.a, b: s.cell.b, c: s.cell.c, al: s.cell.al, be: s.cell.be, ga: s.cell.ga, V: s.cell.V },
        nsites: s.sites.length, sites: s.sites.map((x) => [x.label, x.el, x.f, x.occ, x.dg, x.minor]) };
      try {
        const all = C.buildCell(s, { minor: true });
        r.atomsAll = all.atoms.map((a) => [a.el, a.f, a.occ, a.label, a.dg, !!a.minor, a.site]);
        r.counts = all.counts;
        r.autoSplit = all.autoSplit;
        const uc = C.buildCell(s);
        r.atomsShown = uc.atoms.map((a) => [a.el, a.f, a.occ, a.label, a.site]);
        if (!noAnalyse) {
          const info = C.analyse(uc);
          r.info = { formula: info.formula, Z: info.Z, formulaMass: info.formulaMass, density: info.density, nAtoms: info.nAtoms };
        }
      } catch (e) { r.error = String(e && e.stack || e); }
      r.ms = Date.now() - t0;
      rec.structures.push(r);
    }
  } catch (e) { rec.error = String(e && e.message || e); }
  out.push(rec);
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
