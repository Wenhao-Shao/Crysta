// Highlight of a framework row in the default packing block (as makeDoc sets it), Node.
// usage: node hl.js <file> <type> [block] [lo hi as "x,y,z"]
const { C, load } = require('./cr.js');
const [file, type, block, loS, hiS] = process.argv.slice(2);
const { s, uc, info } = load(file, block && block !== '-' ? block : null);
const Lc = [s.cell.a, s.cell.b, s.cell.c];
let n = Lc.map((x) => Math.max(1, Math.min(3, Math.ceil(14 / x))));
while (uc.atoms.length * n[0] * n[1] * n[2] > 15000 && n.some((x) => x > 1)) n[n.indexOf(Math.max(...n))]--;
const lo = loS ? loS.split(',').map(Number) : [0, 0, 0];
const hi = hiS ? hiS.split(',').map(Number) : n;
const blk = C.assemble(uc, lo, hi, []);
const L = info.layer;
const item = { type };
const hs = C.highlightSet(blk, uc, info, item);
const A = blk.atoms;
const nh = L.normal;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const out = { block: [lo, hi], nShown: A.length, atoms: hs.atoms.map((i) => A[i].label + '@h=' + dot(A[i].xyz, nh).toFixed(3)), lines: hs.lines.map((l) => +Math.hypot(l[0][0] - l[1][0], l[0][1] - l[1][1], l[0][2] - l[1][2]).toFixed(3)) };
if (type === 'offset' && L.offset && hs.atoms.length === 2) {
  const [i, j] = hs.atoms;
  let d = [0, 1, 2].map((k) => A[j].xyz[k] - A[i].xyz[k]);
  const kk = dot(d, nh); d = d.map((x, k) => x - kk * nh[k]);
  const p1 = L.offset.v1, p2 = L.offset.v2;
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // solve d = s1 p1 + s2 p2 in the plane
  const nn = nh; const det = dot(cross(p1, p2), nn);
  let s1 = dot(cross(d, p2), nn) / det, s2 = dot(cross(p1, d), nn) / det;
  s1 = Math.abs(s1 - Math.round(s1)); s2 = Math.abs(s2 - Math.round(s2));
  out.drawn = { from: A[i].label, to: A[j].label, dproj: Math.hypot(...d).toFixed(3), s: [Math.max(s1, s2).toFixed(3), Math.min(s1, s2).toFixed(3)] };
  out.row = [L.offset.s1.toFixed(3), L.offset.s2.toFixed(3), L.offset.kind, uc.atoms[L.offset.m0].label, uc.atoms[L.offset.m1].label];
}
if (type === 'gallery' || type === 'slab') out.row = { spacing: L.spacing, slab: L.slabThickness, gallery: L.gallery, slabs: L.slabs };
console.log(JSON.stringify(out, null, 1));
