// A geometry.in with left-handed lattice vectors: Crysta's torsion of 4 atoms vs the torsion from the file's own Cartesian coordinates
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const path = process.argv[2];
const text = fs.readFileSync(path, 'utf8');
const st = C.readStructure(text, 'geometry.in');
// the file's own coordinates
const V = [], at = [];
for (const ln of text.split(/\r?\n/)) { const t = ln.replace(/#.*$/, '').trim().split(/\s+/); if (t[0] === 'lattice_vector') V.push(t.slice(1, 4).map(Number)); if (t[0] === 'atom' || t[0] === 'atom_frac') at.push({ frac: t[0] === 'atom_frac', v: t.slice(1, 4).map(Number), el: t[4] }); }
const det = V[0][0] * (V[1][1] * V[2][2] - V[1][2] * V[2][1]) - V[0][1] * (V[1][0] * V[2][2] - V[1][2] * V[2][0]) + V[0][2] * (V[1][0] * V[2][1] - V[1][1] * V[2][0]);
const cartFile = (a) => a.frac ? [0, 1, 2].map((k) => a.v[0] * V[0][k] + a.v[1] * V[1][k] + a.v[2] * V[2][k]) : a.v;
// my own torsion (projection definition), independent of C.torsion
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function tors(p, q, r, s) { const ax = sub(r, q); const L = Math.sqrt(dot(ax, ax)); const e = ax.map((x) => x / L);
  const pr = (w) => { const k = dot(w, e); return w.map((x, i) => x - k * e[i]); };
  const u = pr(sub(p, q)), v = pr(sub(s, r)); const c = dot(u, v) / Math.sqrt(dot(u, u) * dot(v, v));
  const ang = Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI; return dot(cross(u, v), e) > 0 ? ang : -ang; }
// four atoms in a row of the file, not coplanar: the first four C atoms that are not coplanar
let idx = null;
outer: for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) for (let k = j + 1; k < at.length; k++) for (let l = k + 1; l < at.length; l++) {
  const P = [i, j, k, l].map((x) => cartFile(at[x])); const t = tors(...P);
  if (Math.abs(t) > 20 && Math.abs(t) < 160) { idx = [i, j, k, l]; break outer; } }
const Pf = idx.map((i) => cartFile(at[i]));
const Pc = idx.map((i) => st.cell.toCart(st.sites[i].f));
console.log('det of lattice vectors', det.toFixed(2));
console.log('atoms', idx.map((i) => st.sites[i].label).join(' '));
console.log('distance 1-2 file', Math.sqrt(dot(sub(Pf[0], Pf[1]), sub(Pf[0], Pf[1]))).toFixed(4), 'Crysta', C.distance(Pc[0], Pc[1]).toFixed(4));
console.log('torsion from the file coordinates', tors(...Pf).toFixed(2), ' Crysta C.torsion', C.torsion(...Pc).toFixed(2));
