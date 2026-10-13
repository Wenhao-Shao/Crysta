// terminal N of each molecule: neighbours, H count, and height to the nearest face (for DA-b02)
const { load } = require('./cr.js');
const [f, b] = process.argv.slice(2);
const r = load(f, b && b !== '-' ? b : null); const uc = r.uc; const L = r.info.layer;
const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
for (const mol of uc.molecules) {
  const nb = mol.atoms.map(() => []); for (const [p, q] of mol.bonds) { nb[p].push(q); nb[q].push(p); }
  mol.atoms.forEach((a, k) => {
    if (uc.atoms[a.idx].el !== 'N') return;
    const els = nb[k].map((j) => uc.atoms[mol.atoms[j].idx].el).join('');
    const h = dot(uc.cell.toCart(a.f), L.normal);
    let best = null; for (const sl of L.slabs) for (let k2 = -2; k2 <= 2; k2++) { const hh = h + k2 * L.dhkl; for (const fc of [sl.top, sl.bot]) if (fc !== null && (best === null || Math.abs(hh - fc) < Math.abs(best))) best = hh - fc; }
    console.log(uc.atoms[a.idx].label, 'neighbours', els, 'distance to nearest face', best === null ? null : best.toFixed(3));
  });
}
console.log('penetration rows', L.penetration.map((p) => p.label).join(','));
