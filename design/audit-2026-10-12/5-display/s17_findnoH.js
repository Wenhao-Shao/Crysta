const fs = require('fs'); const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const dir = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
let found = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.cif'))) {
  try {
    const s = C.readStructures(fs.readFileSync(dir + f, 'utf8'), f).structures[0];
    if (s.sites.some((x) => x.el === 'H')) continue;
    const uc = C.buildCell(s, {}); if (uc.atoms.length > 300) continue;
    const info = C.analyse(uc); if (!info.layer) continue;
    const big = C.assemble(uc, [-1, -1, -1], [2, 2, 2]);
    if (!big.hbonds.length) continue;
    console.log(f, uc.atoms.length, big.hbonds.length); if (++found >= 3) break;
  } catch (e) {}
}
