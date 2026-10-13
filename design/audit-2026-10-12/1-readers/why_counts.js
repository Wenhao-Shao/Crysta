// For one file: which copies does buildCell drop from the cell contents, and why
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const S = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
for (const [f, els] of process.argv.slice(2).map((x) => x.split(':'))) {
  const r = C.readStructures(fs.readFileSync(S + f, 'utf8'), f);
  const s = r.structures[0];
  const want = els.split(',');
  const cell = s.cell;
  const norm = (v) => Math.hypot(...v);
  const mi = (d) => d.map((x) => x - Math.round(x));
  console.log('==', f, 'ops', s.ops.length);
  for (const t of s.sites.filter((t) => want.includes(t.el))) {
    // own expansion: distinct copies of this site, and the shortest distance between two distinct copies
    const copies = [];
    for (const op of s.ops) {
      const g = [0, 1, 2].map((i) => { const v = op.R[i][0] * t.f[0] + op.R[i][1] * t.f[1] + op.R[i][2] * t.f[2] + op.T[i]; return v - Math.floor(v); });
      if (!copies.some((h) => norm(cell.toCart(mi(h.map((x, i) => x - g[i])))) < 0.15)) copies.push(g);
    }
    let dmin = Infinity;
    for (let i = 0; i < copies.length; i++) for (let j = i + 1; j < copies.length; j++) dmin = Math.min(dmin, norm(cell.toCart(mi(copies[i].map((x, k) => x - copies[j][k])))));
    console.log('  ', t.label, t.el, 'occ', t.occ, 'dg', t.dg, 'distinct copies', copies.length, 'closest two copies', dmin.toFixed(3), 'A');
  }
  const uc = C.buildCell(s, {});
  console.log('   crysta counts', JSON.stringify(uc.counts), 'autoSplit', uc.autoSplit);
}
