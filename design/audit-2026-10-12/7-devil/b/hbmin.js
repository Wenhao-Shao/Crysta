const { load, hbRows } = require('./cr.js');
const [f, b] = process.argv.slice(2);
const r = load(f, b && b !== '-' ? b : null);
const a = hbRows(r.uc, 'cell').rows, z = hbRows(r.uc, 'big').rows;
const minH = (rows) => Math.min(...rows.map((x) => x.dHA));
const perD = (rows) => { const m = new Map(); rows.forEach((x) => m.set(x.D, (m.get(x.D) || 0) + 1)); return m; };
const pa = perD(a), pz = perD(z);
const lost = [...pz.keys()].filter((k) => !pa.has(k));
console.log(f.replace(/^.*\//, ''), b || '', 'atoms', r.uc.atoms.length, 'shown', a.length, 'complete', z.length, 'min H..A shown', minH(a).toFixed(3), 'complete', minH(z).toFixed(3), 'donors with no row', lost.length, 'of', pz.size);
