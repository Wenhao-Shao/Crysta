// edge cases of the Measure functions, with known answers by construction
const C = require('/home/claude/crysta/src/core.js');
const deg = Math.PI / 180;
const plane = { n: [0, 0, 1], c: [0, 0, 0], rms: 0 };
const res = {};
// angle in plane: a bond at 1.9 deg and at 2.1 deg from the normal (README: no value within 2 deg)
for (const a of [1.9, 1.99, 2.01, 2.1]) {
  const p = [Math.sin(a * deg), 0, Math.cos(a * deg)], q = [0, 0, 0], r = [0, 1, 0];
  res['pangle_bond_at_' + a + 'deg'] = C.projectedAngle(plane, p, q, r).angle;
}
// angle in plane, known: p=(1,0,1), r=(0,1,-5) about q=0 -> projected 90
res.pangle_known_90 = C.projectedAngle(plane, [1, 0, 1], [0, 0, 0], [0, 1, -5]).angle;
res.pangle_known_135 = C.projectedAngle(plane, [1, 0, 3], [0, 0, 0], [-1, 1, -2]).angle;
// bond to plane: line along the normal -> 90; in plane -> 0; 30 deg
res.bond_normal = C.linePlaneAngle(plane, [0, 0, 0], [0, 0, 2]);
res.bond_inplane = C.linePlaneAngle(plane, [0, 0, 0], [2, 1, 0]);
res.bond_30 = C.linePlaneAngle(plane, [0, 0, 0], [Math.cos(30 * deg), 0, -Math.sin(30 * deg)]);
// plane to plane: normals at 120 deg -> 60
res.plane_plane_120 = C.planePlaneAngle(plane, { n: [Math.sin(120 * deg), 0, Math.cos(120 * deg)], c: [0, 0, 0] });
// plane through atoms: collinear -> null; 3 points: rms 0; square counterclockwise from +z -> normal +z
res.collinear = C.planeOfPoints([[0, 0, 0], [1, 1, 1], [2, 2, 2]]);
const sq = C.planeOfPoints([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]);
res.square_ccw_normal = sq.n;
const sq2 = C.planeOfPoints([[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]);
res.square_cw_normal = sq2.n;
// atom to plane sign
res.atom_above = C.planeDistance(sq, [0.3, 0.3, 1.5]);
// torsion: IUPAC examples. Looking from q to r, s clockwise from p by 60 -> +60
const t60 = C.torsion([1, 0, 0], [0, 0, 0], [0, 0, 1], [Math.cos(-60 * deg), Math.sin(-60 * deg), 1]);
res.torsion_far_bond_clockwise_60 = t60;
res.torsion_cis = C.torsion([1, 0, 0], [0, 0, 0], [0, 0, 1], [1, 0, 1]);
res.torsion_trans = C.torsion([1, 0, 0], [0, 0, 0], [0, 0, 1], [-1, 0, 1]);
// degenerate torsions: three collinear atoms (the torsion is undefined)
res.torsion_collinear_pqr = C.torsion([0, 0, -1], [0, 0, 0], [0, 0, 1], [1, 0, 1]);
res.torsion_collinear_qrs = C.torsion([1, 0, 0], [0, 0, 0], [0, 0, 1], [0, 0, 2]);
res.torsion_collinear_noise = C.torsion([1e-7, 0, -1], [0, 0, 0], [0, 0, 1], [1, 0, 1]);
console.log(JSON.stringify(res, null, 1));
