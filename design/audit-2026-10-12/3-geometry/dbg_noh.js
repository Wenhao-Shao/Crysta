const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
for (const [f, blk] of [['1211_1.cif', 'PEA'], ['1531_1.cif', 'JIMDEO'], ['1212_1.cif', 'TRA'], ['1362_1.cif', 'MAPbI3_RT']]) {
  const path = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/' + f;
  const all = C.readStructures(fs.readFileSync(path, 'utf8'), f).structures; const st = all.find((s) => s.meta.block === blk);
  const uc = C.buildCell(st, {});
  const blk3 = C.assemble(uc, [-1, -1, -1], [2, 2, 2]);
  const kinds = {};
  blk3.atoms.forEach((a) => { if (a.el === 'N' || a.el === 'I') { const k = a.el + ':' + a.kind; kinds[k] = (kinds[k] || 0) + 1; } });
  const Ns = uc.atoms.map((a, i) => [a, i]).filter(([a]) => a.el === 'N').map(([a, i]) => a.label + ' adj ' + uc.adj[i].map((n) => uc.atoms[n.j].el).join('') + ' metalsOf ' + uc.metalsOf[i].length);
  console.log(f, 'hbonds', blk3.hbonds.length, kinds, Ns.slice(0, 4), 'sites skipped', st.meta.skipped);
}
