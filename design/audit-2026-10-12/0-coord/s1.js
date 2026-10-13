const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const H = process.env.A + '/corpus/hybrid3/structures/';
const open = (f, i = 0) => { const t = fs.readFileSync(f, 'utf8'); const ss = C.readStructures(t, f).structures; const s = ss[i]; const uc = C.buildCell(s, {}); return { s, ss, uc, info: C.analyse(uc) }; };
// A3-04 left-handed vectors
const atoms = 'atom 1.0 1.0 1.0 C\natom 2.5 1.0 1.0 C\natom 3.0 2.4 1.0 C\natom 3.5 2.6 2.3 C\n';
const tor = (lat) => { const s = C.readStructure(lat + atoms, 'x_geometry.in'); const uc = C.buildCell(s, {}); const P = uc.atoms.map((a) => uc.cell.toCart(a.f)); return C.torsion(P[0], P[1], P[2], P[3]); };
const np = (p) => { const v = (a, b) => b.map((x, i) => x - a[i]); const cr = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; const d = (a, b) => a.reduce((s, x, i) => s + x*b[i], 0);
  const b1 = v(p[0], p[1]), b2 = v(p[1], p[2]), b3 = v(p[2], p[3]); const n1 = cr(b1, b2), n2 = cr(b2, b3); const m = cr(n1, b2.map((x) => x / Math.hypot(...b2))); return Math.atan2(d(m, n2), d(n1, n2)) * 180 / Math.PI; };
console.log('A3-04 ref', np([[1,1,1],[2.5,1,1],[3,2.4,1],[3.5,2.6,2.3]]).toFixed(2), 'right', tor('lattice_vector 12 0 0\nlattice_vector 0 12 0\nlattice_vector 0 0 12\n'), 'left', tor('lattice_vector 12 0 0\nlattice_vector 0 12 0\nlattice_vector 0 0 -12\n'));
// A3-01 offset 1202_1, and the same file with atom rows reversed is not trivial; print offset
const o = open(H + '1202_1.cif'); console.log('A3-01 1202_1 offset', JSON.stringify(o.info.layer && o.info.layer.offset && { v1: o.info.layer.offset.v1, v2: o.info.layer.offset.v2, txt: o.info.layer.offset.text || o.info.layer.offset.frac }));
// A3-02 hbonds 2258_1 / 2431_1
for (const f of ['2258_1.cif', '2431_1.cif']) { const r = open(H + f); const big = C.assemble(r.uc, [-1, -1, -1], [2, 2, 2]); console.log('A3-02', f, 'hbonds', big.hbonds.length, 'hasH', big.hasH, 'kinds of halides', [...new Set(big.atoms.filter((a) => ['Cl','I','Br'].includes(a.el)).map((a) => a.kind))]); }
// A3-03 2276_1
{ const r = open(H + '2276_1.cif'); const key = (big) => new Set(big.hbonds.map((h) => big.atoms[h.d].label + '|' + (h.h >= 0 ? big.atoms[h.h].label : '') + '|' + big.atoms[h.a].label + '|' + h.dDA.toFixed(2)));
  const a = key(C.assemble(r.uc, [0,0,0], [1,1,1])), b = key(C.assemble(r.uc, [-1,-1,-1], [2,2,2])); console.log('A3-03 2276_1 atoms', r.uc.atoms.length, 'one cell', a.size, '3x3x3', b.size); }
// A2-01 1259_1 all blocks: find CsSnI3_B_gamma
{ const t = fs.readFileSync(H + '1259_1.cif', 'utf8'); const ss = C.readStructures(t, '1259_1.cif').structures; ss.forEach((s, i) => { const uc = C.buildCell(s, {}); const inf = C.analyse(uc); if (/gamma/i.test(s.name || '')) console.log('A2-01', i, s.name, inf.formula, inf.density && inf.density.toFixed(3), 'Z', inf.Z); }); }
// A2-02 1194_1 H count
{ const r = open(H + '1194_1.cif'); const n = r.uc.atoms.filter((a) => a.el === 'H').reduce((s, a) => s + (a.occ == null ? 1 : a.occ), 0); console.log('A2-02 1194_1 H in uc', n, 'formula', r.info.formula, 'Z', r.info.Z); }
