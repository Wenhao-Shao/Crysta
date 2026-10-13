// Stacking offset of the made-up zigzag layers (expected (0.50, 0.00)); prints Crysta's value
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
for (const f of process.argv.slice(2)) {
  const st = C.readStructure(fs.readFileSync(f, 'utf8'), f);
  const uc = C.buildCell(st, {}); const info = C.analyse(uc); const L = info.layer;
  const o = L && L.offset;
  console.log(f.replace(/^.*\//, ''), 'n', L && L.n, 'spacing', L && L.spacing.toFixed(3), 'offset', o ? '(' + o.s1.toFixed(3) + ', ' + o.s2.toFixed(3) + ') ' + o.kind : null, 'p1', o && o.p1.toFixed(3), 'p2', o && o.p2.toFixed(3), 'bridges', L && L.bridges.map((b) => b.theta.toFixed(1)).join(' '));
}
