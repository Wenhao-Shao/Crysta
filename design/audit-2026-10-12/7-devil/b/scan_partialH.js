// CIFs that have H atoms but whose terminal N (one heavy neighbour) carry no H: no penetration row, no N-H donor
const { C } = require('./cr.js'); const fs = require('fs');
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.cif'));
const res = [];
for (const f of files) {
  let r; try { r = C.readStructures(fs.readFileSync(dir + '/' + f, 'utf8'), f); } catch (e) { continue; }
  for (const s of r.structures) {
    let uc, info; try { uc = C.buildCell(s, {}); info = C.analyse(uc); } catch (e) { continue; }
    if (!uc.atoms.some((a) => a.el === 'H')) continue;
    let bare = 0, withH = 0;
    for (const mol of uc.molecules) {
      const nb = mol.atoms.map(() => []);
      for (const [p, q] of mol.bonds) { nb[p].push(q); nb[q].push(p); }
      mol.atoms.forEach((a, k) => {
        if (uc.atoms[a.idx].el !== 'N') return;
        const nH = nb[k].filter((j) => uc.atoms[mol.atoms[j].idx].el === 'H').length;
        const heavy = nb[k].length - nH;
        if (heavy === 1 && nH === 0) bare++; else if (nH >= 2) withH++;
      });
    }
    if (bare) res.push({ f, block: s.meta.block, layered: !!info.layer, bareN: bare, NwithH: withH, pen: info.layer ? info.layer.penetration.length : null });
  }
}
console.log(JSON.stringify({ n: res.length, layered: res.filter((x) => x.layered).length, layeredNoPen: res.filter((x) => x.layered && x.pen === 0).length, list: res.slice(0, 40) }));
