// A4-03: f' and f'' are left out (zero) when lambda 1 is the K-alpha 2 line of Mo or Ag
const C = require('/home/claude/crysta/src/core.js');
for (const [name, l] of [['Mo Ka1', 0.70932], ['Mo Ka2', 0.71361], ['Ag Ka1', 0.55942], ['Ag Ka2', 0.56381], ['Cu Ka2', 1.54443], ['Cu mean', 1.5418], ['1.535 (not a Cu line)', 1.535]]) {
  const a = C.anodeOf(l);
  console.log(name.padEnd(24), l, '->', a ? a.key + " f', f'' used" : "none: f' = f'' = 0");
}
