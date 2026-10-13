// For every layered structure: the card's gallery against the distances from each top face to the next bottom face above it,
// using Crysta's own face heights (info.layer.slabs). Counts structures where any face-to-face distance differs by > 0.01 A.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const lst = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let n = 0, bad = [];
for (const [path, block] of lst) {
  const name = path.replace(/^.*\//, '');
  const all = C.readStructures(fs.readFileSync(path, 'utf8'), /\.in$/.test(name) ? 'geometry.in' : name).structures;
  const st = block ? all.find((s) => s.meta.block === block) : all[0];
  const L = C.analyse(C.buildCell(st, {})).layer;
  if (!L || L.gallery === undefined) continue;
  n++;
  const D = L.dhkl;
  const tops = L.slabs.filter((s) => s.top !== null).map((s) => s.top), bots = L.slabs.filter((s) => s.bot !== null).map((s) => s.bot);
  const g = tops.map((t) => { let b = null; for (const x of bots) for (let m = -3; m <= 3; m++) { const h = x + m * D; if (h > t && (b === null || h < b)) b = h; } return b - t; });
  const dev = Math.max(...g.map((x) => Math.abs(x - L.gallery)));
  if (dev > 0.01) bad.push([name, block, L.gallery.toFixed(3), g.map((x) => x.toFixed(3)).join('/'), dev.toFixed(3)]);
}
console.log('layered with gallery', n, 'differ > 0.01 A:', bad.length);
bad.sort((a, b) => b[4] - a[4]).slice(0, 40).forEach((b) => console.log(b.join('  ')));
