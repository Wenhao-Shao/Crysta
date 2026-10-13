// Stacking offset of 1202_1 (HybriD3): Crysta's value, and the shift from the same metal to the nearest metal of the next layer
// usage: node a3_offset.js <cif>
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const path = process.argv[2];
const all0 = C.readStructures(fs.readFileSync(path, 'utf8'), path.replace(/^.*\//, '')).structures; const st = process.argv[3] ? all0.find((s) => s.meta.block === process.argv[3]) : all0[0];
const uc = C.buildCell(st, {}); const info = C.analyse(uc); const L = info.layer; const o = L.offset;
const cell = uc.cell, n = L.normal;
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const inPlane = (v) => { const k = dot(v, n); return v.map((x, i) => x - k * n[i]); };
const len = (v) => Math.sqrt(dot(v, v));
console.log('Crysta offset (s1, s2) =', o.s1.toFixed(4), o.s2.toFixed(4), o.kind, '| p1, p2 =', o.v1.map((x) => x.toFixed(3)), o.v2.map((x) => x.toFixed(3)));
console.log('M0 =', uc.atoms[o.m0].label, uc.atoms[o.m0].f.map((x) => x.toFixed(4)), ' M1 =', uc.atoms[o.m1].label, uc.atoms[o.m1].f.map((x) => x.toFixed(4)));
// every metal of the cell and its images: the in-plane shift from M0 to each metal whose height is one layer spacing above M0
const P0 = cell.toCart(uc.atoms[o.m0].f);
const cands = [];
for (const m of uc.metals) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
  const P = cell.toCart(uc.atoms[m].f.map((x, q) => x + [i, j, k][q]));
  const dh = dot(sub(P, P0), n);
  if (Math.abs(dh - L.spacing) < 1.5) cands.push({ m, d: inPlane(sub(P, P0)) });
}
cands.sort((a, b) => len(a.d) - len(b.d));
const solve = (d, p1, p2) => { // d = s1 p1 + s2 p2 (least squares in the plane)
  const a11 = dot(p1, p1), a12 = dot(p1, p2), a22 = dot(p2, p2), b1 = dot(d, p1), b2 = dot(d, p2), det = a11 * a22 - a12 * a12;
  return [(b1 * a22 - a12 * b2) / det, (a11 * b2 - a12 * b1) / det]; };
const red = (s) => s.map((x) => Math.abs(x - Math.round(x))).sort((a, b) => b - a);
console.log('nearest metal of the next layer (in projection):', uc.atoms[cands[0].m].label, 'in-plane shift', len(cands[0].d).toFixed(3), 'A');
console.log('  in units of Crysta p1, p2:', red(solve(cands[0].d, o.v1, o.v2)).map((x) => x.toFixed(4)));
// the same shift with the other M...M vector of the zigzag (p2 to the metal on the other side)
const P2b = o.v2.map((x) => x);
console.log('  the next three nearest:', cands.slice(1, 4).map((c) => [uc.atoms[c.m].label, len(c.d).toFixed(3), red(solve(c.d, o.v1, o.v2)).map((x) => x.toFixed(3))]));
