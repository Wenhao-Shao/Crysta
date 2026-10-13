// README: "Angle in plane ... With the layer plane this is theta in." For every equatorial bridge of every layered structure,
// Angle in plane (C.projectedAngle with the lattice plane of the layers) against the theta_in of the framework card.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const lst = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let n = 0, max = 0, nan = 0;
for (const [path, block] of lst) {
  const name = path.replace(/^.*\//, '');
  const all = C.readStructures(fs.readFileSync(path, 'utf8'), /\.in$/.test(name) ? 'geometry.in' : name).structures;
  const st = block ? all.find((s) => s.meta.block === block) : all[0];
  const uc = C.buildCell(st, {}); const info = C.analyse(uc); const L = info.layer;
  if (!L) continue;
  // every bridge in a drawn block: M1, X, M2 positions as a click gives them
  const blk = C.assemble(uc, [0, 0, 0], [1, 1, 1]);
  const A = blk.atoms;
  for (let i = 0; i < A.length; i++) {
    const x = A[i];
    if (!C.HALIDE.has(x.el)) continue;
    const ms = x.bonds.filter((j) => uc.center[A[j].src]);
    for (let p = 0; p < ms.length; p++) for (let q = p + 1; q < ms.length; q++) {
      const m1 = A[ms[p]], m2 = A[ms[q]];
      const th = C.bondAngle(m1.xyz, x.xyz, m2.xyz);
      const br = L.bridges.find((b) => b.x === x.label && Math.abs(b.theta - th) < 0.01 && b.equatorial);
      if (!br) continue;
      const plane = C.planeOfHkl(uc.cell, info.framework.hkl, m1.xyz);
      const r = C.projectedAngle(plane, m1.xyz, x.xyz, m2.xyz);
      if (!isFinite(r.angle)) { nan++; continue; }
      n++; max = Math.max(max, Math.abs(r.angle - br.thetaIn));
    }
  }
}
console.log('bridges', n, 'max |angle in layer plane - theta_in|', max.toExponential(2), 'no value', nan);
