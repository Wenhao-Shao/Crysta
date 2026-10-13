const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const S = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
for (const f of process.argv.slice(2)) {
  const s = C.readStructures(fs.readFileSync(S + f, 'utf8'), f).structures[0];
  const cell = s.cell, norm = (v) => Math.hypot(...v), mi = (d) => d.map((x) => x - Math.round(x));
  const wrap = (x) => { let y = x - Math.floor(x); if (y > 1 - 1e-6) y = 0; return y; };
  const atoms = []; const pairs = {};
  s.sites.forEach((st, si) => {
    const own = [];
    s.ops.forEach((op) => {
      const g = [0, 1, 2].map((i) => wrap(op.R[i][0] * st.f[0] + op.R[i][1] * st.f[1] + op.R[i][2] * st.f[2] + op.T[i]));
      if (own.some((h) => norm(cell.toCart(mi(h.map((x, i) => x - g[i])))) < 0.15)) return;
      own.push(g);
      const hit = atoms.find((a) => a.el === st.el && a.dg === st.dg && norm(cell.toCart(mi(a.f.map((x, i) => x - g[i])))) < 0.15);
      if (hit) { const k = hit.label + '(' + hit.occ + ')~' + st.label + '(' + st.occ + ') d=' + norm(cell.toCart(mi(hit.f.map((x, i) => x - g[i])))).toFixed(3); pairs[k] = (pairs[k] || 0) + 1; return; }
      atoms.push({ el: st.el, dg: st.dg, f: g, label: st.label, occ: st.occ });
    });
  });
  console.log(f, JSON.stringify(pairs));
}
