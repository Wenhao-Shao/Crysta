// How often does the default packing block cut a layer: metals of one layer on both sides of a cell face along the
// stacking axis (fractional coordinate just below 1 and just above 0), so that the default block [0, n] keeps only part.
const fs = require('fs'); const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const dir = process.argv[2];
let n2d = 0, split = 0; const ex = [];
for (const f of fs.readdirSync(dir).filter((x) => /\.(cif|in)$/.test(x))) {
  try {
    const s = C.readStructures(fs.readFileSync(dir + '/' + f, 'utf8'), f).structures[0];
    const uc = C.buildCell(s, {}); const info = C.analyse(uc);
    const fw = info.framework; if (!fw || fw.dim !== 2 || !info.layer) continue;
    const nz = fw.hkl.map((x, k) => [x, k]).filter((x) => x[0] !== 0);
    if (nz.length !== 1) continue;
    n2d++;
    const ax = nz[0][1];
    // metal fractional coordinates along the axis, wrapped to [-0.5, 0.5)
    const zs = uc.atoms.filter((a, i) => uc.center[i]).map((a) => { let z = a.f[ax] - Math.floor(a.f[ax]); return z >= 0.5 ? z - 1 : z; });
    const L = [uc.cell.a, uc.cell.b, uc.cell.c][ax];
    // a layer centred near the face: metals within 1.5 A of the face on both sides
    const lo = zs.filter((z) => z < 0 && z > -1.5 / L), hi = zs.filter((z) => z >= 0 && z < 1.5 / L);
    if (lo.length && hi.length && lo.some((z) => z < -1e-4) ) { split++; if (ex.length < 12) ex.push(f + ' (' + lo.length + ' below, ' + hi.length + ' above the face)'); }
  } catch (e) {}
}
console.log('2D layered with one stacking axis:', n2d, ' layer cut by the default block face:', split);
console.log(ex.join('\n'));
