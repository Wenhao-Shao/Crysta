// Crysta's torsion C1-C2-C3-C4 for the right- and left-handed geometry.in files (the file coordinates give +60.0 deg)
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
for (const f of process.argv.slice(2)) {
  const st = C.readStructure(fs.readFileSync(f, 'utf8'), 'geometry.in');
  const P = st.sites.map((s) => st.cell.toCart(s.f));
  console.log(f.replace(/^.*\//, ''), 'torsion', C.torsion(P[0], P[1], P[2], P[3]).toFixed(2), 'distance C1-C2', C.distance(P[0], P[1]).toFixed(4));
}
