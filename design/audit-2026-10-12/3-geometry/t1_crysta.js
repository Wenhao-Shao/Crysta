// Task 1: Crysta's distance / angle / torsion for the atoms of the published geometry loops.
// The atoms are found in Crysta's unit cell (buildCell) by label and position, as a click in the picture finds them.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const R = JSON.parse(fs.readFileSync(__dirname + '/t1_requests.json', 'utf8'));
const out = [];
const cache = new Map();
let nf = 0;
for (const r of R) {
  let st;
  try {
    if (!cache.has(r.file)) { cache.clear(); cache.set(r.file, C.readStructures(fs.readFileSync(r.file, 'utf8'), r.name)); }
    const all = cache.get(r.file).structures;
    st = all.find((s) => s.meta.block === r.block) || (all.length === 1 ? all[0] : null);
  } catch (e) { out.push({ name: r.name, block: r.block, err: String(e.message).slice(0, 80) }); continue; }
  if (!st) { out.push({ name: r.name, block: r.block, err: 'block not found' }); continue; }
  let uc;
  try { uc = C.buildCell(st, {}); } catch (e) { out.push({ name: r.name, block: r.block, err: 'buildCell ' + e.message }); continue; }
  const cell = uc.cell;
  const find = (label, f) => {
    let best = null;
    for (const a of uc.atoms) {
      if (a.label !== label) continue;
      const t = [0, 1, 2].map((k) => Math.round(f[k] - a.f[k]));
      const g = [0, 1, 2].map((k) => a.f[k] + t[k]);
      const d = C.distance(cell.toCart(g), cell.toCart(f));
      if (d < 0.02 && (!best || d < best.d)) best = { d, g };
    }
    return best ? cell.toCart(best.g) : null;
  };
  const items = [];
  for (const it of r.items) {
    const P = it.labels.map((l, k) => find(l, it.f[k]));
    if (P.some((p) => !p)) { items.push(null); nf++; continue; }
    let v;
    if (it.k === 'bond') v = C.distance(P[0], P[1]);
    else if (it.k === 'angle') v = C.bondAngle(P[0], P[1], P[2]);
    else v = C.torsion(P[0], P[1], P[2], P[3]);
    items.push(v);
  }
  out.push({ name: r.name, block: r.block, items });
}
fs.writeFileSync(__dirname + '/t1_crysta.json', JSON.stringify(out));
console.log('blocks', out.length, 'errors', out.filter((o) => o.err).length, 'not found', nf);
