const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const dir = __dirname + '/xy/';
for (const f of fs.readdirSync(dir).sort()) {
  try { const r = C.readXY(fs.readFileSync(dir + f, 'utf8')); console.log(f.padEnd(26), 'x', JSON.stringify(r.x), 'y', JSON.stringify(r.y), 'anode', r.anode, 'header', JSON.stringify(r.header).slice(0, 60)); }
  catch (e) { console.log(f.padEnd(26), 'ERROR', e.message); }
}
