const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const dir = process.argv[2];
for (const f of ['test1.res', 'parts_two_regions.res', 'parts_two_regions.cif', 'parts_1234.cif', 'negpart.res']) {
  const s = C.readStructure(fs.readFileSync(dir + '/' + f, 'utf8'), f);
  console.log('==', f, 'ops', s.ops.length, 'title/block', s.meta.block);
  for (const t of s.sites) console.log('  ', t.label.padEnd(5), t.el.padEnd(3), t.f.map((x) => x.toFixed(4)).join(' '), 'occ', +t.occ.toFixed(6), 'u', t.u === null ? null : +t.u.toFixed(6), 'dg', t.dg, 'minor', t.minor, 'symdis', t.symdis);
  const uc = C.buildCell(s, { minor: false });
  const cnt = {}; for (const a of uc.atoms) cnt[a.label] = (cnt[a.label] || 0) + 1;
  console.log('   shown in cell:', JSON.stringify(cnt), 'hiddenMinor', uc.hiddenMinor, 'formula counts', JSON.stringify(uc.counts));
}
