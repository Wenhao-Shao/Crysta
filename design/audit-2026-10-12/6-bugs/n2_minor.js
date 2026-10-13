const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const D = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/examples/';
for (const n of fs.readdirSync(D)) {
  const s = C.readStructures(fs.readFileSync(D + n, 'utf8'), n).structures[0];
  const uc = C.buildCell(s, {});
  console.log(n, 'hasMinor', uc.hasMinor, 'autoSplit', uc.autoSplit, 'hiddenMinor', uc.hiddenMinor);
}
