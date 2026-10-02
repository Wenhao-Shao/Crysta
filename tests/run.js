// Regression tests for src/core.js. Run with: node tests/run.js
const fs = require('fs');
const path = require('path');
const X = require('../src/core.js');
X.setSgTable(require('../src/sg-table.json'));

let failed = 0, passed = 0;
function check(name, ok, detail) {
  if (ok) passed++; else { failed++; console.log('FAIL  ' + name + (detail ? '  ' + detail : '')); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
function load(file) {
  const s = X.readStructure(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
  const uc = X.buildCell(s, {});
  return { s, uc, info: X.analyse(uc) };
}

// 1. Hall-symbol generator against reference operator lists for every tabulated setting
{
  const ref = require('./hall-reference.json');
  const key = (o) => o.R.map((r) => r.join(',')).join(';') + '|' + o.T.map((t) => Math.round((t - Math.floor(t)) * 144) % 144).join(',');
  const seen = new Set();
  let bad = 0;
  for (const [hall, ops] of ref) {
    if (seen.has(hall)) continue;
    seen.add(hall);
    const mine = X.hallOps(hall);
    const a = new Set((mine || []).map(key));
    const b = new Set(ops.map((t) => key(X.parseSymop(t))));
    if (!mine || a.size !== b.size || ![...a].every((k) => b.has(k))) bad++;
  }
  check('Hall symbols (' + seen.size + ')', bad === 0, bad + ' mismatches');
}

// 2. tetrazine PbCl4 example: values cross-checked independently with numpy
{
  const { uc, info } = load('examples/tetrazine-PbCl4.cif');
  const fw = info.framework, L = info.layer, m = info.metalSites[0];
  check('tz atoms per cell', uc.atoms.length === 110);
  check('tz formula Z', info.Z === 2);
  check('tz density', near(info.density, 1.960, 0.002));
  check('tz layers (100)', fw.dim === 2 && fw.hkl.join('') === '100');
  check('tz spacing', near(fw.spacing, 19.026, 0.002));
  check('tz Pb-Cl', near(m.min, 2.834, 0.002) && near(m.max, 2.918, 0.002));
  check('tz Pb-Cl-Pb', near(L.bridges[0].theta, 152.93, 0.02));
  check('tz n = 1', L.n === 1);
  check('tz offset near (0,0)', near(L.offset.s1, 0.12, 0.02) && near(L.offset.s2, 0.12, 0.02));
  const defs = X.tetrazineDefs(uc);
  check('tz ring found', defs.length === 1);
  const inst = X.chromoInstances(uc, defs[0]);
  check('tz 4 ring copies', inst.length === 4);
  const s1 = X.orientReport(uc, info, inst.map((i) => X.stateDir(i, { mode: 'normal' })));
  const s2 = X.orientReport(uc, info, inst.map((i) => X.stateDir(i, { mode: 'perp' })));
  check('tz S1 to normal', near(s1.toNormalMin, 41.13, 0.05));
  check('tz S2 to normal', near(s2.toNormalMin, 84.06, 0.05));
  check('tz S1 between', near(s1.between, 14.2, 0.1));
  const blk = X.assemble(uc, [0, 0, 0], [1, 2, 2]);
  check('tz block 1x2x2', blk.atoms.length === 468 && blk.polyhedra.length === 12);
  const p = X.planePolys(uc.cell, [1, 0, 0], 0.5, [0, 0, 0], [1, 2, 2], 60);
  check('tz (100) plane at 0.5 d', p.polys.length === 1 && near(p.d, 19.026, 0.002));
}

// 3. synthetic n = 1, space group given by H-M symbol only
{
  const { s, info } = load('tests/cifs/syn_n1_I4mmm.cif');
  check('n1 ops from symbol', s.meta.symSource === 'hm' && s.ops.length === 32);
  check('n1 formula', info.formula.map((e) => e.el + e.n).join('') === 'Cl4Cs2Pb1');
  check('n1 thickness', info.layer.n === 1);
  check('n1 spacing', near(info.framework.spacing, 8.5, 1e-6));
  check('n1 staggered', near(info.layer.offset.s1, 0.5, 1e-6) && near(info.layer.offset.s2, 0.5, 1e-6));
  check('n1 untilted', near(info.layer.bridges[0].theta, 180, 1e-6));
}

// 4. synthetic n = 2, space group given by IT number only
{
  const { s, info } = load('tests/cifs/syn_n2_I4mmm.cif');
  check('n2 ops from number', s.meta.symSource === 'number' && s.ops.length === 32);
  check('n2 thickness', info.layer.n === 2);
  check('n2 spacing', near(info.framework.spacing, 14, 1e-6));
  check('n2 axial and equatorial bridges', info.layer.bridges.some((b) => !b.equatorial) && info.layer.bridges.some((b) => b.equatorial));
  check('n2 Cs not a polyhedron centre', info.metalSites.length === 1 && info.metalSites[0].el === 'Pb');
}

// 5. flagged disorder: major part shown, formula still occupancy-weighted
{
  const { s, uc, info } = load('tests/cifs/tetrazine_disorder.cif');
  check('disorder flagged', uc.hasMinor && s.sites.some((x) => x.minor));
  check('disorder major part only', uc.atoms.length === 110);
  check('disorder formula unchanged', info.Z === 2 && near(info.density, 1.960, 0.002));
  const all = X.buildCell(s, { minor: true });
  check('disorder minor part shown on request', all.atoms.length > 110);
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
