// For every layered structure: Crysta's stacking offset vs the shift from Crysta's own M0 to the nearest metal of the next layer
// (in projection), both in units of Crysta's own p1, p2. Only the choice of the second metal differs.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const lst = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (v) => Math.sqrt(dot(v, v));
const out = [];
for (const [path, block] of lst) {
  try {
    const name = path.replace(/^.*\//, '');
    const all = C.readStructures(fs.readFileSync(path, 'utf8'), /\.in$/.test(name) ? 'geometry.in' : name).structures;
    const st = block ? all.find((s) => s.meta.block === block) : all[0];
    const uc = C.buildCell(st, {}); const info = C.analyse(uc); const L = info.layer;
    if (!L || !L.offset) continue;
    const o = L.offset, n = L.normal, cell = uc.cell;
    const inPlane = (v) => { const k = dot(v, n); return v.map((x, i) => x - k * n[i]); };
    const P0 = cell.toCart(uc.atoms[o.m0].f);
    let best = null;
    // metals of the next layer: one layer spacing above M0's plane, give or take half the slab of metal planes
    const ph = L.slabs[0].planes; const step = L.spacing - (ph[ph.length - 1] - ph[0]);
    for (const m of uc.metals) for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let k = -3; k <= 3; k++) {
      const P = cell.toCart(uc.atoms[m].f.map((x, q) => x + [i, j, k][q]));
      const dh = dot(sub(P, P0), n);
      if (Math.abs(dh - step) > 1.5) continue;
      const d = inPlane(sub(P, P0));
      if (!best || len(d) < len(best.d)) best = { m, d };
    }
    if (!best) continue;
    const p1 = o.v1, p2 = o.v2;
    const a11 = dot(p1, p1), a12 = dot(p1, p2), a22 = dot(p2, p2), b1 = dot(best.d, p1), b2 = dot(best.d, p2), det = a11 * a22 - a12 * a12;
    const s = [(b1 * a22 - a12 * b2) / det, (a11 * b2 - a12 * b1) / det].map((x) => Math.abs(x - Math.round(x))).sort((a, b) => b - a);
    out.push({ name, block, crysta: [o.s1, o.s2], kind: o.kind, nearest: s, nearestDist: len(best.d), n: L.n });
  } catch (e) { out.push({ name: path, block, error: e.message }); }
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
const diff = out.filter((r) => r.crysta && Math.max(Math.abs(r.crysta[0] - r.nearest[0]), Math.abs(r.crysta[1] - r.nearest[1])) > 0.005);
const shown = out.filter((r) => r.crysta && (r.crysta[0].toFixed(2) !== r.nearest[0].toFixed(2) || r.crysta[1].toFixed(2) !== r.nearest[1].toFixed(2)));
console.log('structures', out.length, 'differ > 0.005:', diff.length, ' differ in the 2 shown decimals:', shown.length);
for (const r of diff.sort((a, b) => Math.max(Math.abs(b.crysta[0] - b.nearest[0]), Math.abs(b.crysta[1] - b.nearest[1])) - Math.max(Math.abs(a.crysta[0] - a.nearest[0]), Math.abs(a.crysta[1] - a.nearest[1]))).slice(0, 25))
  console.log(r.name, r.block, 'crysta', r.crysta.map((x) => x.toFixed(3)).join(','), r.kind, '| nearest', r.nearest.map((x) => x.toFixed(3)).join(','), 'n', r.n);
