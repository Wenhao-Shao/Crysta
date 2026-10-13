const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const R = JSON.parse(fs.readFileSync(__dirname + '/t1_requests.json', 'utf8'));
const hist = {}; const files = {}; const nonH = [];
let lastFile = null, all = null;
for (const r of R) {
  if (r.file !== lastFile) { all = C.readStructures(fs.readFileSync(r.file, 'utf8'), r.name).structures; lastFile = r.file; }
  const st = all.find((s) => s.meta.block === r.block) || all[0];
  const uc = C.buildCell(st, {}); const ucAll = C.buildCell(st, { minor: true });
  const siteOf = new Map(st.sites.map((s) => [s.label, s]));
  const near = (u, label, f) => { let b = 1e9; for (const a of u.atoms) if (a.label === label) { const d = C.distance(u.cell.toCart([0, 1, 2].map((k) => a.f[k] + Math.round(f[k] - a.f[k]))), u.cell.toCart(f)); if (d < b) b = d; } return b; };
  for (const it of r.items) it.labels.forEach((l, k) => {
    const s = siteOf.get(l);
    if (!s || s.minor) return;
    const d = near(uc, l, it.f[k]);
    if (d < 0.02) return;
    if (uc.autoSplit.some((x) => x.split('/')[1] === l) || near(ucAll, l, it.f[k]) < 0.02) return;
    const key = d < 0.15 ? 'merged (<0.15 A copy kept)' : 'other';
    hist[key] = (hist[key] || 0) + 1;
    files[r.name] = (files[r.name] || 0) + 1;
    if (s.el !== 'H' && nonH.length < 20) nonH.push([r.name, r.block, l, it.codes[k], d.toFixed(4), s.occ, s.dg]);
  });
}
console.log(hist, files, nonH);
