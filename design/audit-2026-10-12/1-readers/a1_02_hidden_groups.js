// A1-02: whole disorder groups vanish when one assembly holds groups that are not alternatives of each other.
// For each file: the groups of each assembly (atoms, mean occupancy, shown or hidden) and the atoms per element in the
// default view of the cell. The sum of the mean occupancies of an assembly above 1 shows that its groups are not all
// alternatives. Reference for what the cell holds: a1_01_reference.py style counts (authors' formula x Z).
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const S = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
const files = [['522_1.cif', S], ['1849_1.cif', S], ['273_1.cif', S], ['855_1.cif', S], ['1915_1.cif', S], ['parts_1234.cif', __dirname + '/cases/']];
for (const [f, dir] of files) {
  const s = C.readStructures(fs.readFileSync(dir + f, 'utf8'), f).structures[0];
  const asm = {};
  for (const t of s.sites) {
    if (t.dg === '.') continue;
    const g = ((asm[t.asm] = asm[t.asm] || {})[t.dg] = asm[t.asm][t.dg] || { n: 0, occ: 0, shown: !t.minor, els: new Set() });
    g.n++; g.occ += t.occ; g.els.add(t.el);
  }
  const uc = C.buildCell(s, {});
  const shown = {}; for (const a of uc.atoms) shown[a.el] = (shown[a.el] || 0) + 1;
  console.log('==', f, 'atoms per element in the default view:', JSON.stringify(shown), ' cell contents (all parts):', JSON.stringify(Object.fromEntries(Object.entries(uc.counts).map(([k, v]) => [k, +v.toFixed(2)]))));
  for (const [a, gs] of Object.entries(asm)) {
    const sum = Object.values(gs).reduce((t, g) => t + g.occ / g.n, 0);
    console.log('   assembly', a, Object.entries(gs).map(([d, g]) => 'group ' + d + ': ' + g.n + ' sites ' + [...g.els].join('') + ' mean occ ' + (g.occ / g.n).toFixed(3) + (g.shown ? ' SHOWN' : ' hidden')).join('; '), '| sum of mean occupancies', sum.toFixed(2));
  }
}
