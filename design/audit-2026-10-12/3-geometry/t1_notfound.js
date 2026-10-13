// classify the atoms of the published loops that are not in Crysta's displayed cell
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const R = JSON.parse(fs.readFileSync(__dirname + '/t1_requests.json', 'utf8'));
const why = {}; const ex = {};
let lastFile = null, all = null;
for (const r of R) {
  if (r.file !== lastFile) { all = C.readStructures(fs.readFileSync(r.file, 'utf8'), r.name).structures; lastFile = r.file; }
  const st = all.find((s) => s.meta.block === r.block) || all[0];
  const uc = C.buildCell(st, {});
  const ucAll = C.buildCell(st, { minor: true });
  const siteOf = new Map(st.sites.map((s) => [s.label, s]));
  const has = (u, label, f) => u.atoms.some((a) => a.label === label && C.distance(u.cell.toCart([0, 1, 2].map((k) => a.f[k] + Math.round(f[k] - a.f[k]))), u.cell.toCart(f)) < 0.02);
  for (const it of r.items) {
    it.labels.forEach((l, k) => {
      if (has(uc, l, it.f[k])) return;
      const s = siteOf.get(l);
      let w;
      if (!s) w = 'label not in Crysta sites';
      else if (s.minor) w = 'minor disorder part (hidden)';
      else if (uc.autoSplit.some((x) => x.split('/')[1] === l)) w = 'auto split, second site dropped';
      else if (has(ucAll, l, it.f[k])) w = 'present only with minor shown (auto split copy)';
      else w = 'UNEXPLAINED';
      why[w] = (why[w] || 0) + 1;
      if (!ex[w]) ex[w] = [];
      if (ex[w].length < 12) ex[w].push(r.name + ' ' + r.block + ' ' + l + ' ' + it.codes[k] + ' f=' + it.f[k].map((x) => x.toFixed(4)).join(','));
    });
  }
}
console.log(why); console.log(ex);
