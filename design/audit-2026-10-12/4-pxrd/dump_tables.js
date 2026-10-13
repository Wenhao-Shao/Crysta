// read the data tables of Crysta's core.js (data only, to compare with gemmi)
const fs = require('fs');
const src = fs.readFileSync('/home/claude/crysta/src/core.js', 'utf8');
const grab = (name) => {
  const i = src.indexOf('const ' + name + ' = ');
  let j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (!depth) break; } }
  return eval('(' + src.slice(j, k + 1) + ')');
};
const C = require('/home/claude/crysta/src/core.js');
fs.writeFileSync(process.argv[2], JSON.stringify({ disp: grab('XRAY_DISP'), f0: C.XRAY_F0, anodes: C.ANODES }));
