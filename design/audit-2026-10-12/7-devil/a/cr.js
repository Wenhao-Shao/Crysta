// Crysta values of a structure file, through src/core.js (object of the test). usage: node cr.js file [blockIndex|all]
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const file = process.argv[2], which = process.argv[3] || '0';
const text = fs.readFileSync(file, 'utf8');
const r = C.readStructures(text, file.split('/').pop());
const out = [];
r.structures.forEach((s, bi) => {
  if (which !== 'all' && +which !== bi) return;
  const uc = C.buildCell(s);
  const info = C.analyse(uc);
  const shown = {};
  uc.atoms.forEach((a) => { shown[a.el] = (shown[a.el] || 0) + 1; });
  const cnt = {}; for (const k of Object.keys(uc.counts)) cnt[k] = +uc.counts[k].toFixed(4);
  out.push({ block: s.meta.block, sg: s.meta.spaceGroup, symSource: s.meta.symSource, nops: s.ops.length, Zfile: s.meta.Z,
    counts: cnt, shown, Z: info.Z, formula: info.formula.map((x) => x.el + x.n).join(' '), M: info.formulaMass && +info.formulaMass.toFixed(3),
    rho: info.density && +info.density.toFixed(4), V: +s.cell.V.toFixed(3), nAtoms: uc.atoms.length, autoSplit: uc.autoSplit, hasMinor: uc.hasMinor, hiddenMinor: uc.hiddenMinor,
    skipped: s.meta.skipped });
});
console.log(JSON.stringify(out, null, 0));
if (r.errors.length) console.log('ERRORS', JSON.stringify(r.errors));
