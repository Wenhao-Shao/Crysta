const fs = require('fs'); const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const dir = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
for (const f of process.argv.slice(2)) {
  const s = C.readStructures(fs.readFileSync(dir + f, 'utf8'), f).structures[0];
  const uc = C.buildCell(s, {}); const info = C.analyse(uc); const fw = info.framework, L = info.layer;
  console.log(f, s.meta.spaceGroup, 'n', L.n, 'spacing', fw.spacing.toFixed(3), 'dhkl', fw.dhkl.toFixed(3), 'components', fw.components, 'slab', L.slabThickness && L.slabThickness.toFixed(3), 'gallery', L.gallery && L.gallery.toFixed(3), 'centres', L.slabs.map((x) => x.centre.toFixed(2) + ' [' + (x.bot === null ? '-' : x.bot.toFixed(2)) + ',' + (x.top === null ? '-' : x.top.toFixed(2)) + ']').join(' '));
}
