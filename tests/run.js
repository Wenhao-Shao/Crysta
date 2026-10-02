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

// 2. sample (PEA)2PbBr4: a real n = 1 structure with two independent Pb and four independent cations
{
  const { s, uc, info } = load('examples/PEA2PbBr4.cif');
  const fw = info.framework, L = info.layer;
  check('PEA block with atoms chosen', s.meta.block === 'I');
  check('PEA atoms per cell', uc.atoms.length === 188 && uc.molecules.length === 8);
  check('PEA formula', info.formula.map((e) => e.el + e.n).join(' ') === 'C16 H24 Br4 N2 Pb1' && info.Z === 4);
  check('PEA density', near(info.density, 2.276, 0.002));
  check('PEA layers (001), n = 1', fw.dim === 2 && fw.hkl.join('') === '001' && L.n === 1);
  check('PEA spacing', near(fw.spacing, 16.665, 0.002));
  check('PEA two Pb sites', info.metalSites.length === 2 && info.metalSites.every((m) => m.cn === 6));
  check('PEA four equatorial bridges', L.bridges.length === 4 && L.bridges.every((b) => b.equatorial));
  check('PEA N penetration', L.penetration.length === 4 && L.penetration.every((p) => near(p.depth, 0.50, 0.02)));
  // phenyl ring of the first cation as a user-defined chromophore
  const site = (label) => s.sites.findIndex((x) => x.label === label);
  const def = { plane: ['C3', 'C4', 'C5', 'C6', 'C7', 'C8'].map(site), axis: [site('C3'), site('C6')] };
  const inst = X.chromoInstances(uc, def);
  check('PEA phenyl copies', inst.length === 2 && inst.every((i) => i.rms < 0.05));
  const rep = X.orientReport(uc, info, inst.map((i) => X.stateDir(i, { mode: 'normal' })));
  check('PEA phenyl copies parallel', rep.orientations === 1);
  const along = inst.map((i) => X.stateDir(i, { mode: 'along' }));
  const turned = inst.map((i) => X.stateDir(i, { mode: 'angle', phi: 90 }));
  const perp = inst.map((i) => X.stateDir(i, { mode: 'perp' }));
  check('PEA state directions', near(Math.hypot(...along[0]), 1, 1e-9) && turned[0].every((x, k) => near(x, perp[0][k], 1e-9)));
  check('PEA no tetrazine preset', X.tetrazineDefs(uc).length === 0);
  const p = X.planePolys(uc.cell, [0, 0, 1], 0.5, [0, 0, 0], [1, 1, 1], 60);
  check('PEA (001) plane', p.polys.length === 1 && near(p.d, 16.665, 0.002));
}

// 3b. sample (FCA3)2PbBr4 at 294 K: real flagged disorder (parts 1 and 2 of one assembly)
{
  const { s, uc, info } = load('examples/FCA3_2PbBr4_294K.cif');
  check('FCA3 CCDC number read', s.meta.ccdc === 'CCDC 2485416');
  check('FCA3 disorder flagged', uc.hasMinor && s.sites.filter((x) => x.minor).length === 14);
  check('FCA3 major part only', uc.atoms.length === 220 && uc.molecules.every((m) => m.atoms.length === 25));
  check('FCA3 formula occupancy-weighted', near(info.formula.find((e) => e.el === 'O').n, 6.15, 0.01) && info.Z === 4);
  check('FCA3 density', near(info.density, 2.272, 0.002));
  check('FCA3 two layers per cell', info.framework.components === 2 && near(info.framework.spacing, 20.691, 0.002));
  check('FCA3 Pb-Br', near(info.metalSites[0].min, 2.973, 0.002) && near(info.metalSites[0].max, 3.002, 0.002));
  const all = X.buildCell(s, { minor: true });
  check('FCA3 minor part shown on request', all.atoms.length === 276 && all.molecules.some((m) => m.atoms.length === 3));
  const blk = X.assemble(uc, [0, 0, 0], [1, 1, 1]);
  check('FCA3 hydrogen bonds found', blk.hbonds.length > 0 && blk.polyhedra.length === 4);
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

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
