const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const path = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/1530_1.cif';
const st = C.readStructures(fs.readFileSync(path, 'utf8'), '1530_1.cif').structures[0];
const uc = C.buildCell(st, {});
uc.atoms.forEach((a, i) => { if (a.el === 'N') console.log(a.label, 'adj', uc.adj[i].map((n) => uc.atoms[n.j].label).join(','), 'metalsOf', uc.metalsOf[i].length, 'dg', a.dg, 'occ', a.occ); });
const mols = uc.molecules.filter((m) => m.atoms.some((a) => uc.atoms[a.idx].el === 'N'));
for (const m of mols.slice(0, 4)) {
  const nb = m.atoms.map(() => []); for (const [p, q] of m.bonds) { nb[p].push(q); nb[q].push(p); }
  m.atoms.forEach((a, k) => { if (uc.atoms[a.idx].el === 'N') console.log('mol N', uc.atoms[a.idx].label, 'bonded', nb[k].map((j) => uc.atoms[m.atoms[j].idx].label).join(',')); });
}
console.log(st.sites.filter((s) => s.el === 'N' || /^H.*N|^H1|^H2/.test(s.label)).map((s) => s.label + ':' + s.dg + ':' + s.occ).join(' '));
