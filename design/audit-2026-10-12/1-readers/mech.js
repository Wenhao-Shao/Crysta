// Classify why buildCell's cell contents (uc.counts) differ from occupancy x distinct copies: replay its rules
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const S = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
const files = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const out = [];
for (const f of files) {
  const r = C.readStructures(fs.readFileSync(S + f, 'utf8'), f);
  for (const s of r.structures) {
    const cell = s.cell;
    const norm = (v) => Math.hypot(...v);
    const mi = (d) => d.map((x) => x - Math.round(x));
    const wrap = (x) => { let y = x - Math.floor(x); if (y > 1 - 1e-6) y = 0; return y; };
    const atoms = [];
    const lost = { crossSite: {}, split: {}, sameSite: {} };
    const addL = (k, el, v) => { lost[k][el] = (lost[k][el] || 0) + v; };
    s.sites.forEach((st, si) => {
      const own = [];
      s.ops.forEach((op) => {
        const g = [0, 1, 2].map((i) => wrap(op.R[i][0] * st.f[0] + op.R[i][1] * st.f[1] + op.R[i][2] * st.f[2] + op.T[i]));
        if (own.some((h) => norm(cell.toCart(mi(h.map((x, i) => x - g[i])))) < 0.15)) return;   // same site, special position
        own.push(g);
        const hit = atoms.find((a) => a.el === st.el && a.dg === st.dg && norm(cell.toCart(mi(a.f.map((x, i) => x - g[i])))) < 0.15);
        if (hit) { addL('crossSite', st.el, st.occ); return; }
        atoms.push({ el: st.el, dg: st.dg, f: g, site: si, occ: st.occ });
      });
    });
    const dropSites = new Set(), dropAtoms = new Set();
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i]; if (a.el === 'H' || a.dg !== '.') continue;
      for (let j = i + 1; j < atoms.length; j++) {
        const b = atoms[j]; if (b.el !== a.el || b.dg !== '.') continue;
        if (norm(cell.toCart(mi(a.f.map((x, k) => x - b.f[k])))) >= 0.9) continue;
        if (a.site === b.site) dropAtoms.add(j); else dropSites.add(Math.max(a.site, b.site));
      }
    }
    atoms.forEach((a, i) => { if (dropSites.has(a.site)) addL('split', a.el, a.occ); else if (dropAtoms.has(i)) addL('sameSite', a.el, a.occ); });
    const r3 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toFixed(3)]));
    if (Object.keys(lost.crossSite).length + Object.keys(lost.split).length + Object.keys(lost.sameSite).length)
      out.push({ file: f, block: s.meta.block, crossSite: r3(lost.crossSite), split: r3(lost.split), sameSite: r3(lost.sameSite), counts: r3(C.buildCell(s, {}).counts) });
  }
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 0));
console.log(out.length);
