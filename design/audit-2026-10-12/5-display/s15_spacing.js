// Layer spacing: the page note says "the distance from the middle plane of one inorganic layer to the middle plane of
// the next layer". The README says d(hkl) / (layers per repeat). Where the layers of one repeat are not evenly spaced,
// these differ. Own check: metal heights along the layer normal (own normal from the cell), grouped into layers.
const fs = require('fs');
const path = require('path');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => /\.(cif|in)$/.test(f));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rows = [];
let n2d = 0;
for (const f of files) {
  let res;
  try {
    const read = C.readStructures(fs.readFileSync(path.join(dir, f), 'utf8'), f);
    const s = read.structures[0]; if (!s) continue;
    const uc = C.buildCell(s, { minor: false });
    const info = C.analyse(uc);
    const fw = info.framework;
    if (!fw || fw.dim !== 2 || !info.layer) continue;
    n2d++;
    const cell = uc.cell;
    const V = dot(cell.A, crs(cell.B, cell.C));
    const as = crs(cell.B, cell.C).map((x) => x / V), bs = crs(cell.C, cell.A).map((x) => x / V), cs = crs(cell.A, cell.B).map((x) => x / V);
    const G = [0, 1, 2].map((k) => fw.hkl[0] * as[k] + fw.hkl[1] * bs[k] + fw.hkl[2] * cs[k]);
    const g = Math.sqrt(dot(G, G)); const n = G.map((x) => x / g); const d = 1 / g;
    // metal heights mod d
    const hs = uc.atoms.filter((a, i) => uc.center[i] && !C.HALIDE.has(a.el)).map((a) => { const h = dot(cell.toCart(a.f), n); return ((h % d) + d) % d; }).sort((x, y) => x - y);
    if (!hs.length) continue;
    // group: a new layer starts after a gap of more than 8 A (circular)
    let start = 0; let maxGap = -1;
    for (let i = 0; i < hs.length; i++) { const gp = (i + 1 < hs.length ? hs[i + 1] : hs[0] + d) - hs[i]; if (gp > maxGap) { maxGap = gp; start = (i + 1) % hs.length; } }
    const seq = hs.slice(start).concat(hs.slice(0, start).map((x) => x + d));
    const layers = []; let cur = [seq[0]];
    for (let i = 1; i < seq.length; i++) { if (seq[i] - seq[i - 1] > 8) { layers.push(cur); cur = [seq[i]]; } else cur.push(seq[i]); }
    layers.push(cur);
    const mids = layers.map((l) => (Math.min(...l) + Math.max(...l)) / 2);
    const gaps = mids.map((m, i) => (i + 1 < mids.length ? mids[i + 1] : mids[0] + d) - m);
    const dev = Math.max(...gaps.map((x) => Math.abs(x - fw.spacing)));
    rows.push({ f, hkl: fw.hkl.join(' '), d: +d.toFixed(3), layers: layers.length, spacing: +fw.spacing.toFixed(3), gaps: gaps.map((x) => +x.toFixed(3)), dev: +dev.toFixed(3) });
  } catch (e) { /* not this auditor's area */ }
}
rows.sort((a, b) => b.dev - a.dev);
console.log('2D layered:', n2d, 'checked:', rows.length, 'with dev > 0.05 A:', rows.filter((r) => r.dev > 0.05).length);
console.log(rows.slice(0, 15).map((r) => JSON.stringify(r)).join('\n'));
fs.writeFileSync(path.join(__dirname, 's15_spacing.json'), JSON.stringify(rows, null, 1));
