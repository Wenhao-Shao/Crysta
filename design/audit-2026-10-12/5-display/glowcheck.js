// In-page checker (string injected with page.evaluate). For the glow item i: what C.highlightSet gives for the
// block that render() draws, checked with independent vector code against the numbers shown in the row.
// Returns a report object.
module.exports = function glowCheck(arg) {
  const { i, shown } = arg;   // shown: the text of the row (dd text, or the table row cells)
  const C = window.XtalCore, st = window.crysta.state, d = st.docs[st.cur];
  const blk = C.assemble(d.uc, d.lo, d.hi, d.polyRules);
  const item = st.glowItems[i];
  const set = C.highlightSet(blk, d.uc, d.info, item);
  const A = blk.atoms;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (a) => Math.sqrt(dot(a, a));
  const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (nrm(u) * nrm(v))))) * 180 / Math.PI;
  const dist = (p, q) => nrm(sub(p, q));
  // the layer normal from the cell, written here: the reciprocal vector of (hkl), unit length
  const cell = d.uc.cell;
  const fw = d.info.framework;
  let nh = null;
  if (fw && fw.dim === 2) {
    const [Av, Bv, Cv] = [cell.A, cell.B, cell.C];
    const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const V = dot(Av, cr(Bv, Cv));
    const as = cr(Bv, Cv).map((x) => x / V), bs = cr(Cv, Av).map((x) => x / V), cs = cr(Av, Bv).map((x) => x / V);
    const G = [0, 1, 2].map((k) => fw.hkl[0] * as[k] + fw.hkl[1] * bs[k] + fw.hkl[2] * cs[k]);
    nh = G.map((x) => x / nrm(G));
  }
  const h = (p) => dot(p, nh);
  const isMetal = (a) => !!d.uc.center[a.src];
  const rep = { name: item.name, type: item.type, nAtoms: set.atoms.length, nBonds: set.bonds.length, nPlanes: set.planes.length, nLines: set.lines.length, nArcs: set.arcs.length, problems: [], values: {} };
  const P = (m) => rep.problems.push(m);
  const nums = (String(shown).match(/[−+-]?\d+\.\d+/g) || []).map((s) => parseFloat(s.replace('−', '-')));
  rep.shownNums = nums;
  const arcAngle = (R) => ang(sub(R.p, R.c), sub(R.q, R.c));
  const atAtom = (p) => A.findIndex((a) => dist(a.xyz, p) < 1e-6);
  if (item.type === 'bond') {
    const dShown = nums[0];
    const lens = set.bonds.map(([p, q]) => dist(A[p].xyz, A[q].xyz));
    rep.values.lengths = [Math.min(...lens), Math.max(...lens)];
    for (const [p, q] of set.bonds) {
      const labs = [A[p].label, A[q].label].sort().join('/');
      if (labs !== [item.m, item.x].sort().join('/')) P('bond with labels ' + labs);
      if (Math.abs(dist(A[p].xyz, A[q].xyz) - dShown) > 0.0006) P('bond length ' + dist(A[p].xyz, A[q].xyz).toFixed(4) + ' vs shown ' + dShown);
    }
    // completeness: every drawn copy of this bond is in the set
    let missing = 0;
    A.forEach((a, k) => { if (a.label !== item.m || !isMetal(a)) return; for (const j of a.bonds) if (A[j].label === item.x && Math.abs(dist(a.xyz, A[j].xyz) - dShown) < 0.0006 && !set.bonds.some((b) => (b[0] === k && b[1] === j) || (b[0] === j && b[1] === k))) missing++; });
    if (missing) P(missing + ' copies of the bond not in the set');
    const mult = /×(\d+)/.exec(shown); rep.values.mult = mult ? +mult[1] : 1;
    // per metal: number of highlighted bonds
    const per = {}; for (const [p, q] of set.bonds) { const m = isMetal(A[p]) ? p : q; per[m] = (per[m] || 0) + 1; }
    rep.values.perMetal = Array.from(new Set(Object.values(per)));
    if (rep.values.perMetal.some((x) => x !== rep.values.mult)) P('bonds per metal ' + rep.values.perMetal + ' vs ×' + rep.values.mult);
  } else if (item.type === 'site') {
    const ms = set.atoms.filter((k) => isMetal(A[k]) && A[k].label === item.m);
    const rows = [];
    for (const m of ms) {
      const bs = set.bonds.filter((b) => b[0] === m || b[1] === m).map((b) => (b[0] === m ? b[1] : b[0]));
      const ds = bs.map((j) => dist(A[m].xyz, A[j].xyz));
      const mean = ds.reduce((t, x) => t + x, 0) / ds.length;
      const r = { cn: bs.length, mean };
      if (bs.length === 6) {
        r.dd = ds.reduce((t, x) => t + ((x - mean) / mean) ** 2, 0) / 6 * 1e4;
        const angs = [];
        for (let p = 0; p < 6; p++) for (let q = p + 1; q < 6; q++) angs.push(ang(sub(A[bs[p]].xyz, A[m].xyz), sub(A[bs[q]].xyz, A[m].xyz)));
        angs.sort((x, y) => x - y);
        r.s2 = angs.slice(0, 12).reduce((t, x) => t + (x - 90) ** 2, 0) / 11;
      }
      rows.push(r);
    }
    rep.values.copies = rows.length;
    rep.values.cn = Array.from(new Set(rows.map((r) => r.cn)));
    const full = rows.filter((r) => r.cn === Math.max(...rows.map((x) => x.cn)));
    rep.values.mean = full.map((r) => r.mean.toFixed(4)).filter((v, k, a) => a.indexOf(v) === k);
    if (full[0] && full[0].dd !== undefined) { rep.values.dd = Array.from(new Set(full.map((r) => r.dd.toFixed(3)))); rep.values.s2 = Array.from(new Set(full.map((r) => r.s2.toFixed(2)))); }
    if (rep.values.cn.length > 1) P('metal copies with different numbers of highlighted bonds: ' + rep.values.cn);
    if (/Mean/.test(item.name)) { if (full.some((r) => Math.abs(r.mean - nums[0]) > 0.0006)) P('mean ' + rep.values.mean + ' vs shown ' + nums[0]); }
    else if (/Δ/.test(item.name)) { if (full.some((r) => Math.abs(r.dd - nums[0]) > 0.006)) P('Δd ' + rep.values.dd + ' vs shown ' + nums[0]); }
    else if (/σ/.test(item.name)) { if (full.some((r) => Math.abs(r.s2 - nums[0]) > 0.06)) P('σ² ' + rep.values.s2 + ' vs shown ' + nums[0]); }
  } else if (item.type === 'cis') {
    const angs = set.arcs.map(arcAngle);
    rep.values.arcAngles = Array.from(new Set(angs.map((x) => x.toFixed(2))));
    const lo = nums[0], hi = nums[1];
    for (const R of set.arcs) {
      const v = atAtom(R.c);
      if (v < 0 || !isMetal(A[v]) || A[v].label !== item.m) P('cis arc vertex not on ' + item.m);
      if (dist(R.c, R.p) < 1e-6 || dist(R.c, R.q) < 1e-6) P('arc degenerate');
      const pi = atAtom(R.p), qi = atAtom(R.q);
      if (pi < 0 || qi < 0 || !A[v].bonds.includes(pi) || !A[v].bonds.includes(qi)) P('cis arc ends are not bonded atoms');
    }
    if (!angs.some((x) => Math.abs(x - lo) < 0.06)) P('no arc at the smallest cis angle ' + lo);
    if (!angs.some((x) => Math.abs(x - hi) < 0.06)) P('no arc at the largest cis angle ' + hi);
    if (angs.some((x) => Math.abs(x - lo) > 0.06 && Math.abs(x - hi) > 0.06)) P('arc at another angle: ' + angs.map((x) => x.toFixed(2)));
  } else if (item.type === 'bridge') {
    const th = nums[0];
    const angs = set.arcs.map(arcAngle);
    rep.values.arcAngles = Array.from(new Set(angs.map((x) => x.toFixed(3))));
    for (const R of set.arcs) {
      const v = atAtom(R.c);
      if (v < 0 || A[v].label !== item.x) P('bridge arc vertex not on ' + item.x);
      const pi = atAtom(R.p), qi = atAtom(R.q);
      if (pi < 0 || qi < 0 || !isMetal(A[pi]) || !isMetal(A[qi])) P('bridge arc ends are not metals');
      if (Math.abs(arcAngle(R) - th) > 0.006) P('bridge arc angle ' + arcAngle(R).toFixed(3) + ' vs shown ' + th);
    }
    if (!set.arcs.length) P('no arc');
    // completeness: X atoms with this label bonded to two metals at this angle
    let n = 0;
    A.forEach((a, k) => { if (a.label !== item.x) return; const ms = a.bonds.filter((j) => isMetal(A[j])); for (let p = 0; p < ms.length; p++) for (let q = p + 1; q < ms.length; q++) if (Math.abs(ang(sub(A[ms[p]].xyz, a.xyz), sub(A[ms[q]].xyz, a.xyz)) - th) < 0.006) n++; });
    rep.values.bridgesInBlock = n;
    if (n !== set.arcs.length) P('bridges in block ' + n + ' vs arcs ' + set.arcs.length);
    // theta in and out: the projections, with my own normal
    if (nums.length >= 4 && set.arcs.length) {
      const R = set.arcs[0];
      const a = sub(R.p, R.c), b = sub(R.q, R.c);
      const flat = (w, n) => { const k = dot(w, n); return sub(w, n.map((x) => x * k)); };
      const tin = ang(flat(a, nh), flat(b, nh));
      let u = flat(sub(R.q, R.p), nh); u = u.map((x) => x / nrm(u));
      const w = [nh[1] * u[2] - nh[2] * u[1], nh[2] * u[0] - nh[0] * u[2], nh[0] * u[1] - nh[1] * u[0]];
      const tout = ang(flat(a, w), flat(b, w));
      rep.values.thetaInOut = [tin.toFixed(3), tout.toFixed(3)];
      if (Math.abs(tin - nums[1]) > 0.006) P('theta in of the drawn bridge ' + tin.toFixed(3) + ' vs shown ' + nums[1]);
      if (Math.abs(tout - nums[2]) > 0.006) P('theta out of the drawn bridge ' + tout.toFixed(3) + ' vs shown ' + nums[2]);
      if (Math.abs(dist(R.p, R.q) - nums[3]) > 0.0006) P('M···M of the drawn bridge ' + dist(R.p, R.q).toFixed(4) + ' vs shown ' + nums[3]);
    }
  } else if (item.type === 'axial') {
    const angs = set.arcs.map(arcAngle);
    rep.values.arcAngles = [Math.min(...angs).toFixed(2), Math.max(...angs).toFixed(2)];
    const lo = nums[0], hi = nums.length > 1 ? nums[1] : nums[0];
    for (const R of set.arcs) {
      const v = atAtom(R.c);
      if (v < 0 || !isMetal(A[v])) P('axial arc vertex not on a metal');
      const u = sub(R.p, R.c);
      if (Math.abs(Math.abs(dot(u, nh)) / nrm(u) - 1) > 1e-6) P('axial arc start is not along the layer normal');
      const qi = atAtom(R.q);
      if (qi < 0 || !A[v].bonds.includes(qi)) P('axial arc end is not a bonded atom');
      const t = arcAngle(R);
      if (t < lo - 0.051 || t > hi + 0.051) P('axial arc angle ' + t.toFixed(2) + ' outside the shown ' + lo + '–' + hi);
    }
    for (const ln of set.lines) { const u = sub(ln[1], ln[0]); if (Math.abs(Math.abs(dot(u, nh)) / nrm(u) - 1) > 1e-6) P('line not along the normal'); }
    for (const pl of set.planes) if (Math.abs(Math.abs(dot(pl.n, nh)) - 1) > 1e-6) P('disc not normal to the layer normal');
  } else if (item.type === 'slab' || item.type === 'gallery') {
    const want = nums[0];
    rep.values.lineLengths = Array.from(new Set(set.lines.map((ln) => dist(ln[0], ln[1]).toFixed(4))));
    for (const ln of set.lines) {
      const u = sub(ln[1], ln[0]);
      if (Math.abs(Math.abs(dot(u, nh)) / nrm(u) - 1) > 1e-6) P('line not along the normal');
      if (Math.abs(nrm(u) - want) > 0.0006) P('line length ' + nrm(u).toFixed(4) + ' vs shown ' + want);
    }
    // each disc against the mean height of the highlighted terminal halides near it
    const hs = set.planes.map((pl) => h(pl.c));
    rep.values.discHeights = hs.map((x) => x.toFixed(3));
    const term = set.atoms.filter((k) => /^(F|Cl|Br|I)$/.test(A[k].el));
    for (const pl of set.planes) {
      const near = term.filter((k) => Math.abs(h(A[k].xyz) - h(pl.c)) < 1.5);
      const mh = near.reduce((t, k) => t + h(A[k].xyz), 0) / near.length;
      if (Math.abs(mh - h(pl.c)) > 0.002) P('disc at height ' + h(pl.c).toFixed(3) + ' but its ' + near.length + ' halides have mean height ' + mh.toFixed(3));
      if (Math.abs(Math.abs(dot(pl.n, nh)) - 1) > 1e-6) P('disc not normal to the layer normal');
      // the halides should be terminal: bonded to one metal
      for (const k of near) { const nm = A[k].bonds.filter((j) => isMetal(A[j])).length; if (nm !== 1) P('halide ' + A[k].label + ' on a face plane has ' + nm + ' metal neighbours in the block'); }
    }
    // gallery: no metal between the two planes; slab: metals between them
    const metH = A.filter(isMetal).map((a) => h(a.xyz));
    for (const ln of set.lines) {
      const a = h(ln[0]), b = h(ln[1]);
      const lo2 = Math.min(a, b), hi2 = Math.max(a, b);
      const inside = metH.filter((x) => x > lo2 && x < hi2).length;
      if (item.type === 'gallery' && inside) P('gallery line crosses ' + inside + ' metal heights');
      if (item.type === 'slab' && !inside) P('slab line has no metal between its planes');
    }
  } else if (item.type === 'penetration') {
    const want = nums[0];
    rep.values.lineLengths = Array.from(new Set(set.lines.map((ln) => dist(ln[0], ln[1]).toFixed(4))));
    const Ns = set.atoms.filter((k) => A[k].label === item.label);
    rep.values.nN = Ns.length;
    for (const ln of set.lines) {
      const k = atAtom(ln[0]);
      if (k < 0 || A[k].label !== item.label) P('line does not start on ' + item.label);
      const u = sub(ln[1], ln[0]);
      if (Math.abs(Math.abs(dot(u, nh)) / nrm(u) - 1) > 1e-6) P('line not along the normal');
      if (Math.abs(nrm(u) - Math.abs(want)) > 0.0006) P('line length ' + nrm(u).toFixed(4) + ' vs shown ' + want);
      // the halides of that face near the foot: mean height
      const foot = ln[1];
      const hal = set.atoms.filter((j) => /^(F|Cl|Br|I)$/.test(A[j].el) && Math.abs(h(A[j].xyz) - h(foot)) < 1.5);
      // sign: inside the layer means on the metal side of the face plane
      const metals = A.filter(isMetal).map((a) => h(a.xyz)).sort((x, y) => Math.abs(x - h(foot)) - Math.abs(y - h(foot)));
      const inside = (h(ln[0]) - h(foot)) * (metals[0] - h(foot)) > 0;
      if (inside !== (want > 0)) P('sign: N is ' + (inside ? 'inside' : 'outside') + ' but shown ' + want);
    }
    if (!set.lines.length) P('no line');
  } else if (item.type === 'offset') {
    const ms = set.atoms;
    rep.values.metals = ms.map((k) => A[k].label);
    if (set.lines.length >= 2) {
      const [l0, l1] = set.lines;
      const i0 = atAtom(l0[0]), j0 = atAtom(l1[1]);
      if (i0 < 0 || j0 < 0) P('lines do not end on atoms');
      const step = h(A[j0].xyz) - h(A[i0].xyz);
      rep.values.heightStep = step.toFixed(3);
      const u = sub(l0[1], l0[0]);
      if (Math.abs(Math.abs(dot(u, nh)) / nrm(u) - 1) > 1e-6) P('first line not along the normal');
      const s = sub(l1[1], l1[0]);
      if (Math.abs(dot(s, nh)) > 1e-6) P('shift not in plane');
      if (set.lines.length >= 4) {
        const v1 = sub(set.lines[2][1], set.lines[2][0]), v2 = sub(set.lines[3][1], set.lines[3][0]);
        // s = a v1 + b v2 in the plane
        const g11 = dot(v1, v1), g12 = dot(v1, v2), g22 = dot(v2, v2), r1 = dot(s, v1), r2 = dot(s, v2);
        const det = g11 * g22 - g12 * g12;
        const a = (r1 * g22 - r2 * g12) / det, b = (g11 * r2 - g12 * r1) / det;
        const fr = (x) => Math.abs(x - Math.round(x));
        const pair = [fr(a), fr(b)].sort((x, y) => y - x);
        rep.values.shiftCoeffs = [a.toFixed(3), b.toFixed(3)];
        rep.values.offsetFromPicture = pair.map((x) => x.toFixed(3));
        rep.values.vLen = [nrm(v1).toFixed(3), nrm(v2).toFixed(3)];
        if (Math.abs(pair[0] - nums[0]) > 0.006 || Math.abs(pair[1] - nums[1]) > 0.006) P('offset of the drawn metals ' + pair.map((x) => x.toFixed(3)) + ' vs shown ' + nums.slice(0, 2));
        // the M···M vectors should join metals: check that each vector from the first metal (projected) ends near a metal of its layer
        for (const v of [v1, v2]) {
          const tip = [0, 1, 2].map((k) => A[i0].xyz[k] + v[k]);
          const near = A.filter(isMetal).some((a) => { const dv = sub(a.xyz, tip); const inpl = sub(dv, nh.map((x) => x * dot(dv, nh))); return nrm(inpl) < 0.6 && Math.abs(dot(dv, nh)) < 1.5; });
          if (!near) P('an M···M vector from the first metal does not end at a metal of its layer');
        }
      }
    } else P('fewer than 2 lines');
  } else if (item.type === 'hbond') {
    const cells = nums; // H···A, D···A (and the angle is an integer, parsed below)
    const angShown = parseFloat((/(\d+)°/.exec(shown) || [])[1]);
    rep.values.found = [];
    for (const ln of set.lines) {
      const hi = atAtom(ln[0]), ai = atAtom(ln[1]);
      if (hi < 0 || ai < 0) { P('H···A line does not end on atoms'); continue; }
      if (A[hi].label !== item.H || A[ai].label !== item.A) P('line between ' + A[hi].label + ' and ' + A[ai].label);
      const dHA = dist(A[hi].xyz, A[ai].xyz);
      const di = A[hi].bonds[0];
      rep.values.found.push([dHA.toFixed(3)]);
      if (Math.abs(dHA - cells[0]) > 0.006) P('H···A of the drawn line ' + dHA.toFixed(3) + ' vs shown ' + cells[0]);
    }
    for (const R of set.arcs) {
      const v = atAtom(R.c), pi = atAtom(R.p), qi = atAtom(R.q);
      if (v < 0 || A[v].label !== item.H) P('arc vertex not on H');
      if (pi < 0 || A[pi].label !== item.D) P('arc start not on D');
      if (qi < 0 || A[qi].label !== item.A) P('arc end not on A');
      const t = arcAngle(R);
      if (Math.abs(t - angShown) > 0.51) P('arc angle ' + t.toFixed(2) + ' vs shown ' + angShown);
      if (pi >= 0 && qi >= 0 && Math.abs(dist(A[pi].xyz, A[qi].xyz) - cells[1]) > 0.0006) P('D···A of the drawn atoms ' + dist(A[pi].xyz, A[qi].xyz).toFixed(4) + ' vs shown ' + cells[1]);
      rep.values.found.push(['arc', t.toFixed(2), pi >= 0 && qi >= 0 ? dist(A[pi].xyz, A[qi].xyz).toFixed(4) : null]);
    }
    for (const [p, q] of set.bonds) { const labs = [A[p].label, A[q].label].sort().join('/'); if (labs !== [item.D, item.H].sort().join('/')) P('bond ' + labs); }
    if (!set.lines.length) P('no H···A line in the block');
    rep.values.copies = set.lines.length;
  }
  // what the page drew
  rep.count = st.glow ? st.glow.count : null;
  return rep;
};
