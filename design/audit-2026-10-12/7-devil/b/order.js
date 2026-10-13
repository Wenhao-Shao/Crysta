// the same crystal with the symmetry operators in another order (in memory): does the stacking offset change?
const { C } = require('./cr.js'); const fs = require('fs');
const f = process.argv[2];
const s0 = C.readStructures(fs.readFileSync(f, 'utf8'), f).structures[0];
const perms = { asRead: (o) => o, reversed: (o) => o.slice().reverse(), rotated: (o) => o.slice(1).concat(o.slice(0, 1)), rotated2: (o) => o.slice(2).concat(o.slice(0, 2)) };
for (const [k, fn] of Object.entries(perms)) {
  const s = Object.assign({}, s0, { ops: [s0.ops[0]].concat(fn(s0.ops.slice(1))) });
  const uc = C.buildCell(s, {}); const info = C.analyse(uc); const o = info.layer.offset;
  console.log(k, o ? [o.s1.toFixed(3), o.s2.toFixed(3), o.kind] : null);
}
