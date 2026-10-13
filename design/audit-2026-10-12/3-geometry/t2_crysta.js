const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const cases = JSON.parse(fs.readFileSync(__dirname + '/t2_cases.json', 'utf8'));
const out = cases.map((cs) => {
  const cif = 'data_t\n_cell_length_a ' + cs.cell[0] + '\n_cell_length_b ' + cs.cell[1] + '\n_cell_length_c ' + cs.cell[2] + '\n_cell_angle_alpha ' + cs.cell[3] + '\n_cell_angle_beta ' + cs.cell[4] + '\n_cell_angle_gamma ' + cs.cell[5] + '\nloop_\n_atom_site_label\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nC1 0 0 0\n';
  const cell = C.readStructure(cif, 't.cif').cell;
  const P = cs.plane_pts.map((f) => cell.toCart(f));
  const Q = cs.q.map((f) => cell.toCart(f));
  const pl = C.planeOfPoints(P);
  const hk = C.planeOfHkl(cell, cs.hkl, Q[0]);
  const r = {
    dist: C.distance(Q[0], Q[1]), angle: C.bondAngle(Q[0], Q[1], Q[2]), tors: C.torsion(Q[0], Q[1], Q[2], Q[3]),
    plane: pl ? { rms: pl.rms, n: pl.n, c: pl.c } : null,
    // frame-independent: the normal expressed as its dot products with the cell vectors a, b, c
    plane_n_dot_abc: pl ? [cell.A, cell.B, cell.C].map((v) => v[0] * pl.n[0] + v[1] * pl.n[1] + v[2] * pl.n[2]) : null,
    hkl_n_dot_abc: hk ? [cell.A, cell.B, cell.C].map((v) => v[0] * hk.n[0] + v[1] * hk.n[1] + v[2] * hk.n[2]) : null,
    atom_plane: pl ? [C.planeDistance(pl, Q[1]), C.planeDistance(pl, Q[2])] : null,
    atom_hkl: hk ? [C.planeDistance(hk, Q[1]), C.planeDistance(hk, Q[2])] : null,
    bond_plane: pl ? C.linePlaneAngle(pl, Q[1], Q[2]) : null,
    bond_hkl: hk ? C.linePlaneAngle(hk, Q[1], Q[2]) : null,
    pangle: pl ? C.projectedAngle(pl, Q[1], Q[2], Q[3]).angle : null,
    pangle_full: pl ? C.projectedAngle(pl, Q[1], Q[2], Q[3]).full : null,
    pangle_hkl: hk ? C.projectedAngle(hk, Q[1], Q[2], Q[3]).angle : null,
    plane_plane: pl && hk ? C.planePlaneAngle(pl, hk) : null,
    near: pl ? C.nearestHkl(cell, pl.n, 6, 1) : null,
    near_hkl: hk ? C.nearestHkl(cell, hk.n, 6, 1) : null
  };
  return r;
});
fs.writeFileSync(__dirname + '/t2_crysta.json', JSON.stringify(out));
console.log(out.length, out.filter((o) => !o.plane).length, 'null planes');
