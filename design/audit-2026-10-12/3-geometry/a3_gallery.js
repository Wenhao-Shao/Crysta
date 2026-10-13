// Layer spacing and organic gallery when the layers are not evenly spaced. All heights are Crysta's own (info.layer.slabs, along
// the layer normal); the faces are the mean planes of the terminal halides. Prints the card values and the face-to-face distances.
// usage: node a3_gallery.js <cif> [block]
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const path = process.argv[2];
const all = C.readStructures(fs.readFileSync(path, 'utf8'), path.replace(/^.*\//, '')).structures;
const st = process.argv[3] ? all.find((s) => s.meta.block === process.argv[3]) : all[0];
const L = C.analyse(C.buildCell(st, {})).layer;
console.log(path.replace(/^.*\//, ''), st.meta.block, '| card: n', L.n, 'spacing', L.spacing.toFixed(3), 'slab', L.slabThickness.toFixed(3), 'gallery', L.gallery.toFixed(3), '| d(hkl)', L.dhkl.toFixed(3));
const D = L.dhkl, md = (x) => ((x % D) + D) % D;
const sl = L.slabs.map((s) => ({ c: md(s.centre), top: s.top === null ? null : md(s.top - s.centre + md(s.centre)) , bot: s.bot === null ? null : md(s.centre) - (s.centre - s.bot) })).sort((a, b) => a.c - b.c);
console.log('layers (centre, bottom face, top face):', sl.map((s) => [s.c, s.bot, s.top].map((x) => (x === null ? '-' : x.toFixed(3))).join('/')).join('  '));
const gaps = sl.map((s, i) => (i + 1 < sl.length ? sl[i + 1].c : sl[0].c + D) - s.c);
console.log('centre-to-centre distances of adjacent layers:', gaps.map((g) => g.toFixed(3)).join(', '));
// from each top face to the next bottom face above it
const faces = [];
for (const s of sl) { if (s.bot !== null) faces.push({ h: s.bot, k: 'bot' }); if (s.top !== null) faces.push({ h: s.top, k: 'top' }); }
const out = [];
for (const f of faces.filter((x) => x.k === 'top')) {
  let best = null;
  for (const g of faces.filter((x) => x.k === 'bot')) for (const m of [0, 1, 2]) { const h = g.h + m * D; if (h > f.h && (best === null || h < best)) best = h; }
  // the next layer centre above the top face: is there a layer without a bottom face in between?
  out.push((best - f.h).toFixed(3));
}
console.log('top face to the next bottom face above it:', out.join(', '));
