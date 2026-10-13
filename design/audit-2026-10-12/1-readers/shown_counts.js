// Crysta: atoms shown in the cell (default view, minor parts hidden) and all atoms (minor shown), per element
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const files = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean);
const out = {};
for (const f of files) {
  const name = f.split('/').pop();
  try {
    const r = C.readStructures(fs.readFileSync(f, 'utf8'), name);
    out[name] = r.structures.map((s) => {
      const uc = C.buildCell(s, { minor: false });
      const cnt = {};
      for (const a of uc.atoms) cnt[a.el] = (cnt[a.el] || 0) + 1;
      return { block: s.meta.block, shown: cnt, counts: uc.counts, autoSplit: uc.autoSplit, hidden: uc.hiddenMinor };
    });
  } catch (e) { out[name] = String(e.message); }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
