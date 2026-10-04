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
  const s = X.readStructure(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), file);
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

// 5. crystals that are not perovskites: one check per class. Reference values are from the literature.
const block = (uc) => X.assemble(uc, [0, 0, 0], [1, 1, 1]);
const formula = (info) => info.formula.map((e) => e.el + e.n).join(' ');
{
  // oxide framework: rutile, Ti-O 1.946 x4 and 1.983 x2, density 4.25
  const { uc, info } = load('tests/cifs/rutile_TiO2.cif');
  const m = info.metalSites[0];
  check('rutile formula and density', formula(info) === 'O2 Ti1' && near(info.density, 4.25, 0.01));
  check('rutile Ti-O octahedron', m.cn === 6 && near(m.min, 1.946, 0.003) && near(m.max, 1.983, 0.003));
  check('rutile 3D oxide framework', info.framework.dim === 3 && info.framework.kind === 'coordination' && !info.framework.halide && !info.layer);
  check('rutile polyhedra drawn', block(uc).polyhedra.length === 9);
}
{
  // alkali halide: the alkali ion is the polyhedron centre when it is the only metal
  const { uc, info } = load('tests/cifs/NaCl.cif');
  check('NaCl octahedra', info.metalSites.length === 1 && info.metalSites[0].cn === 6 && near(info.metalSites[0].mean, 2.820, 0.001));
  check('NaCl 3D, density', info.framework.dim === 3 && near(info.density, 2.163, 0.003));
  check('NaCl has no free ions', uc.molecules.length === 0);
}
{
  // an element outside the old table: fluorite UO2, CN 8, density 10.96
  const { s, uc, info } = load('tests/cifs/UO2.cif');
  check('UO2 formula keeps U', formula(info) === 'O2 U1' && s.meta.skipped.length === 0);
  check('UO2 density', near(info.density, 10.96, 0.02));
  check('UO2 cubes', info.metalSites[0].cn === 8 && block(uc).polyhedra.every((p) => p.verts.length === 8));
}
{
  // a site that cannot be read is reported, not dropped silently
  const { s } = load('tests/cifs/unknown_element.cif');
  check('unknown element reported', s.meta.skipped.length === 1 && s.meta.skipped[0].label === 'Xx1');
}
{
  // layered sulfide: 2D, two layers per cell, no perovskite descriptors
  const { info } = load('tests/cifs/MoS2.cif');
  const fw = info.framework;
  check('MoS2 layers (001)', fw.dim === 2 && fw.hkl.join('') === '001' && fw.components === 2 && near(fw.spacing, 6.147, 0.001));
  check('MoS2 trigonal prisms, Mo-S', info.metalSites[0].cn === 6 && near(info.metalSites[0].mean, 2.417, 0.005));
  check('MoS2 is not treated as a perovskite', info.layer === null && !fw.halide);
}
{
  // covalent networks: diamond (3D), graphite (2D, thin cell), quartz (3D, SiO4 tetrahedra)
  const d = load('tests/cifs/diamond.cif');
  const bd = block(d.uc);
  check('diamond network', d.info.framework.kind === 'covalent' && d.info.framework.dim === 3 && d.uc.molecules.length === 0);
  check('diamond drawn as 18 atoms, 16 bonds', bd.atoms.length === 18 && bd.atoms.reduce((t, a) => t + a.bonds.length, 0) === 32);
  check('diamond density', near(d.info.density, 3.516, 0.005));
  const g = load('tests/cifs/graphite.cif');
  check('graphite layers', g.info.framework.dim === 2 && g.info.framework.components === 2 && near(g.info.framework.spacing, 3.3555, 0.001));
  check('graphite three bonds per atom', g.uc.adj.every((nb) => nb.length === 3));
  const q = load('tests/cifs/quartz_SiO2.cif');
  const bq = block(q.uc);
  check('quartz density', near(q.info.density, 2.649, 0.005));
  check('quartz Si-O', q.uc.atoms.every((a, i) => a.el !== 'Si' || (q.uc.adj[i].length === 4 && q.uc.adj[i].every((nb) => near(Math.hypot(...q.uc.cell.toCart(nb.d)), 1.609, 0.01)))));
  check('quartz tetrahedra', bq.polyhedra.length === 6 && bq.polyhedra.every((p) => p.verts.length === 4));
}
{
  // 3D halide perovskite: framework found, Cs stays a free ion, no layer descriptors
  const { uc, info } = load('tests/cifs/CsPbBr3_cubic.cif');
  check('CsPbBr3 3D halide framework', info.framework.dim === 3 && info.framework.halide && info.layer === null);
  check('CsPbBr3 Cs is a free ion', uc.molecules.length === 1 && uc.molecules[0].ion && info.metalSites.length === 1);
}
{
  // molecular crystal with hydrogen bonds
  const { uc, info } = load('tests/cifs/urea.cif');
  const b = X.assemble(uc, [-1, -1, -1], [2, 2, 2]);
  check('urea molecules', info.molecular && !info.framework && uc.molecules.length === 2 && uc.molecules.every((m) => m.atoms.length === 8));
  check('urea N-H...O hydrogen bonds', b.hbonds.length > 0 && b.hbonds.every((h) => b.atoms[h.d].el === 'N' && b.atoms[h.a].el === 'O'));
}
{
  // framework joined through a molecular linker (cyanide), as in a MOF
  const { uc, info } = load('tests/cifs/prussian_blue_type.cif');
  check('cyanide framework is 3D', info.framework.dim === 3 && info.framework.components === 1);
  check('cyanide linkers stay whole', uc.molecules.length === 24 && uc.molecules.every((m) => m.atoms.length === 2));
  check('Fe-C and Fe-N octahedra', info.metalSites.length === 2 && info.metalSites.every((m) => m.cn === 6));
}
{
  // molecular complex: [PtCl4] drawn as one unit, K as free ions
  const { uc, info } = load('tests/cifs/K2PtCl4.cif');
  const cx = uc.molecules.filter((m) => m.complex);
  check('PtCl4 complex', cx.length === 1 && cx[0].atoms.length === 5 && cx[0].polys.length === 1);
  check('K2PtCl4 is 0D with two free K', info.framework.dim === 0 && uc.molecules.filter((m) => m.ion).length === 2);
}

// 6. other file formats give the same structure as the CIF
{
  const cif = load('tests/cifs/rutile_TiO2.cif');
  const pos = load('tests/files/rutile.POSCAR');
  check('POSCAR read', pos.s.meta.format === 'POSCAR' && pos.uc.atoms.length === 6 && near(pos.info.density, cif.info.density, 1e-6));
  check('POSCAR same bonds as CIF', near(pos.info.metalSites[0].min, cif.info.metalSites[0].min, 1e-6));
  const res = load('tests/files/NaCl.res');
  check('SHELX read: symmetry and occupancy', res.s.meta.format === 'SHELX' && res.s.ops.length === 192 && res.uc.atoms.length === 8 && formula(res.info) === 'Cl1 Na1');
  const xyz = load('tests/files/water.xyz');
  check('XYZ read as a molecule without a lattice', xyz.s.meta.molecular === true && xyz.uc.molecules.length === 1 && xyz.uc.molecules[0].bonds.length === 2);
  const b = block(xyz.uc);
  const O = b.atoms.findIndex((a) => a.el === 'O');
  const H = b.atoms.filter((a) => a.el === 'H');
  check('water geometry kept', near(X.distance(b.atoms[O].xyz, H[0].xyz), 0.957, 0.002) && near(X.bondAngle(H[0].xyz, b.atoms[O].xyz, H[1].xyz), 104.5, 0.2));
}

// 7. measurements and export
{
  check('angle', near(X.bondAngle([1, 0, 0], [0, 0, 0], [0, 1, 0]), 90, 1e-9));
  check('torsion sign and size', near(X.torsion([1, 0, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]), 90, 1e-9) && near(X.torsion([1, 0, 0], [0, 0, 0], [0, 0, 1], [1, 0, 1]), 0, 1e-9) &&
    near(Math.abs(X.torsion([1, 0, 0], [0, 0, 0], [0, 0, 1], [-1, 0, 1])), 180, 1e-9));
  const { uc } = load('tests/cifs/urea.cif');
  const b = block(uc);
  const text = X.toMol2(b.atoms, uc.cell, 'urea');
  const L = text.split('\n');
  const counts = L[2].trim().split(/\s+/).map(Number);
  check('mol2 counts', counts[0] === 16 && counts[1] === 14 && counts[2] === 3);
  check('mol2 sections', ['@<TRIPOS>MOLECULE', '@<TRIPOS>ATOM', '@<TRIPOS>BOND', '@<TRIPOS>CRYSIN'].every((k) => L.includes(k)));
  const atomRows = L.slice(L.indexOf('@<TRIPOS>ATOM') + 1, L.indexOf('@<TRIPOS>BOND'));
  check('mol2 atom types', atomRows.length === 16 && atomRows.filter((r) => /\sC\.2\s/.test(r)).length === 2 && atomRows.filter((r) => /\sO\.2\s/.test(r)).length === 2);
  const noH = X.toMol2(b.atoms, uc.cell, 'urea', (a) => a.el !== 'H');
  check('mol2 respects hidden atoms', noH.split('\n')[2].trim().split(/\s+/).map(Number).join() === '8,6,3,0,0');
}

// 8. vector drawing
{
  // view down -z with y up: screen x = 20 x, screen y = -20 y; the viewer sits at +z
  const view = { width: 200, height: 200, M: [[20, 0, 0], [0, -20, 0]], b: [100, 100] };
  const svg = X.toSvg(Object.assign({ shaded: true, background: '#ffffff', title: 'a < b', items: [
    { t: 'atom', p: [0, 0, 2], r: 0.5, color: '#ff0000', el: 'O' },     // near
    { t: 'atom', p: [0, 0, -2], r: 0.5, color: '#0000ff', el: 'N' },    // far
    { t: 'bond', p: [0, 0, -2], q: [0, 0, 0], r: 0.1, color: '#0000ff' },
    { t: 'face', pts: [[0, 0, -3], [1, 0, -3], [0, 1, -3]], color: '#00ff00' },
    { t: 'text', p: [1, 1, 0], text: 'C1 & <x>', size: 10, color: '#000000', bg: '#ffffff' }
  ] }, view));
  const at = (k) => svg.indexOf(k);
  check('svg is one document', svg.startsWith('<?xml') && svg.trim().endsWith('</svg>') && (svg.match(/<svg /g) || []).length === 1);
  check('svg far to near', at('class="face"') < at('class="atom N"') && at('class="atom N"') < at('class="bond"') && at('class="bond"') < at('class="atom O"'));
  check('svg projection', /class="atom O" cx="100" cy="100" r="10"/.test(svg));
  check('svg text escaped and on top', svg.includes('C1 &amp; &lt;x&gt;') && svg.includes('<title>a &lt; b</title>') && at('class="atom O"') < at('C1 &amp;'));
  check('svg one gradient per colour', (svg.match(/<radialGradient/g) || []).length === 2);
  const flat = X.toSvg(Object.assign({ shaded: false, items: [{ t: 'atom', p: [1, 2, 0], r: 1, color: '#123456' }] }, view));
  check('svg flat fill, no background', flat.includes('fill="#123456"') && !flat.includes('radialGradient') && !flat.includes('class="background"') && /cx="120" cy="60"/.test(flat));
  const glass = X.toSvg(Object.assign({ shaded: false, items: [{ t: 'atom', p: [0, 0, 0], r: 1, color: '#123456', opacity: 0.4 }] }, view));
  check('svg atom transparency', glass.includes('fill-opacity="0.4"') && !flat.includes('fill-opacity'));
  // an octahedron has 8 faces; a cube's 12 hull triangles join into 6 squares
  const oct = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const cube = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) cube.push([x, y, z]);
  check('polyhedron faces joined', X.hullPolygons(oct).length === 8 && X.hullPolygons(cube).length === 6 && X.hullPolygons(cube).every((f) => f.length === 4));
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
