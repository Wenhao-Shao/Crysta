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

// 9. user-defined polyhedra: any centre, any corner
{
  // Cs in cubic CsPbBr3 sits in a cuboctahedron of 12 Br at a/sqrt(2) = 4.154 A
  const { uc } = load('tests/cifs/CsPbBr3_cubic.cif');
  const max = X.suggestPolyMax(uc, 'Cs', ['Br']);
  check('suggested limit takes the first shell', max > 4.154 && max < 5.0, 'got ' + max);
  check('Pb-Br suggestion', X.suggestPolyMax(uc, 'Pb', ['Br']) > 2.94 && X.suggestPolyMax(uc, 'Pb', ['Br']) < 3.5);
  const st = X.polyhedraStats(uc, { center: 'Cs', corners: ['Br'], max });
  check('Cs cuboctahedron', st.centres === 1 && st.cnMin === 12 && st.cnMax === 12);
  const plain = X.assemble(uc, [0, 0, 0], [1, 1, 1]);
  const b = X.assemble(uc, [0, 0, 0], [1, 1, 1], [{ center: 'Cs', corners: ['Br'], max }]);
  const cs = b.polyhedra.filter((p) => p.custom);
  check('custom polyhedron drawn with all corners', cs.length === 1 && cs[0].verts.length === 12 && cs[0].verts.every((v) => b.atoms[v].el === 'Br'));
  check('automatic polyhedra kept for other elements', b.polyhedra.length === plain.polyhedra.length + 1);
  // a rule for Pb is a set of its own: the automatic Pb octahedra stay, and two rules can share a centre
  const kept = X.assemble(uc, [0, 0, 0], [1, 1, 1], [{ center: 'Pb', corners: ['Br'], max: 2.0 }]);
  check('a rule leaves the automatic polyhedra alone', kept.polyhedra.length === plain.polyhedra.length && kept.polyhedra.every((p) => !p.custom));
  const two = X.assemble(uc, [0, 0, 0], [1, 1, 1], [{ center: 'Pb', corners: ['Cs'], max: 5.2 }, { center: 'Pb', corners: ['Br'], max: 3.4 }]);
  const byRule = [0, 1].map((k) => two.polyhedra.filter((p) => p.rule === k));
  check('two rules with one centre element', byRule[0].length > 0 && byRule[0].every((p) => p.verts.length === 8) && byRule[1].length === byRule[0].length && byRule[1].every((p) => p.verts.length === 6) &&
    two.polyhedra.filter((p) => !p.custom).length === plain.polyhedra.length);
  const off = X.assemble(uc, [0, 0, 0], [1, 1, 1], [{ center: 'Pb', corners: ['Br'], max: 2.0, on: false }]);
  check('a rule switched off changes nothing', off.polyhedra.length === plain.polyhedra.length && off.atoms.length === plain.atoms.length);
  // a non-metal centre with any element as corner: Br with its 2 Pb and 4 Cs
  const br = X.polyhedraStats(uc, { center: 'Br', corners: null, max: 4.3 });
  check('non-metal centre, any corner', br.centres === 3 && br.cnMin === 14 && br.cnMax === 14, JSON.stringify(br));
  const brOnly = X.polyhedraStats(uc, { center: 'Br', corners: ['Pb', 'Cs'], max: 4.3 });
  check('corners limited to chosen elements', brOnly.cnMin === 6 && brOnly.cnMax === 6, JSON.stringify(brOnly));
  // around Br the widest gap comes after the two Pb and four Cs, not after the two Pb alone
  const sb = X.suggestPolyMax(uc, 'Br', ['Pb', 'Cs']);
  check('suggestion ends at the widest gap', sb > 4.154 && sb < 5.5 && X.polyhedraStats(uc, { center: 'Br', corners: ['Pb', 'Cs'], max: sb }).cnMax === 6, 'got ' + sb);
  check('centre inside its polyhedron', X.polyhedraStats(uc, { center: 'Cs', corners: ['Br'], max }).outside === 0);

  const u = load('tests/cifs/urea.cif');
  const tri = X.assemble(u.uc, [0, 0, 0], [1, 1, 1], [{ center: 'C', corners: ['N', 'O'], max: 1.5 }]).polyhedra;
  check('three corners: a triangle', tri.length === 2 && tri.every((p) => p.verts.length === 3));
  check('fewer than three corners: nothing', X.assemble(u.uc, [0, 0, 0], [1, 1, 1], [{ center: 'C', corners: ['O'], max: 1.5 }]).polyhedra.length === 0);
  check('a flat face is one polygon seen from both sides', X.hullFaces([[0, 0, 0], [1, 0, 0], [0, 1, 0]]).length === 2 && X.hullPolygons([[0, 0, 0], [1, 0, 0], [0, 1, 0]]).length === 1 &&
    X.hullPolygons([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]).length === 1);
}

// 10. molecular ions with a non-metal centre, next to a large cation: Cs2[TeCl6] (K2PtCl6 type, Fm-3m)
{
  const { uc, info } = load('tests/cifs/Cs2TeCl6.cif');
  const b = X.assemble(uc, [0, 0, 0], [1, 1, 1]);
  const te = b.polyhedra.filter((p) => b.atoms[p.center].el === 'Te');
  check('TeCl6 octahedra drawn automatically', te.length > 0 && te.every((p) => p.verts.length === 6 && p.verts.every((v) => b.atoms[v].el === 'Cl')));
  check('Te is not a ligand of Cs', info.metalSites.every((m) => m.bonds.every((x) => x.el !== 'Te')));
  // Cs has 12 Cl at 3.69 A; the far Cl of each octahedron are at 6.4 A and must not be suggested
  const max = X.suggestPolyMax(uc, 'Cs', ['Cl']);
  const st = X.polyhedraStats(uc, { center: 'Cs', corners: ['Cl'], max });
  check('Cs-Cl nearest shell', max < 4.5 && st.cnMin === 12 && st.cnMax === 12 && st.outside === 0, 'max ' + max + ' ' + JSON.stringify(st));
  // a limit that takes only the corners of a neighbouring unit puts the centre outside its polyhedron
  const far = X.polyhedraStats(uc, { center: 'Te', corners: ['Cs'], max: 4.7 });
  check('Te with 8 Cs: centre inside a cube', far.cnMin === 8 && far.outside === 0, JSON.stringify(far));
}

// 11. gradient bonds
{
  const tubes = X.bondTubes([{ p: [0, 0, 0], q: [0, 0, 2], rp: 0.1, rq: 0.07, cp: [1, 0, 0], cq: [0, 0, 1] }], 8);
  const m = tubes[0];
  check('tube mesh size', tubes.length === 1 && m.vertexArr.length === 16 && m.faceArr.length === 48 && m.colorArr.length === 16);
  check('tube tapers and keeps a colour at each end', near(Math.hypot(m.vertexArr[0][0], m.vertexArr[0][1]), 0.1, 1e-9) && near(Math.hypot(m.vertexArr[1][0], m.vertexArr[1][1]), 0.07, 1e-9) &&
    m.colorArr[0][0] === 1 && m.colorArr[1][2] === 1);
  // every triangle faces outward: its normal points away from the axis
  let outward = true;
  for (let f = 0; f < m.faceArr.length; f += 3) {
    const [a, b, c] = [m.vertexArr[m.faceArr[f]], m.vertexArr[m.faceArr[f + 1]], m.vertexArr[m.faceArr[f + 2]]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (nrm[0] * a[0] + nrm[1] * a[1] <= 0) outward = false;
  }
  check('tube faces point outward', outward);
  check('long bond lists are split below the mesh limit', X.bondTubes(new Array(50).fill({ p: [0, 0, 0], q: [1, 0, 0], rp: 0.1, rq: 0.1, cp: [0, 0, 0], cq: [1, 1, 1] }), 10, 200).length === 5);
  const view = { width: 100, height: 100, M: [[10, 0, 0], [0, -10, 0]], b: [50, 50] };
  const svg = X.toSvg(Object.assign({ items: [{ t: 'bond', p: [0, 0, 0], q: [1, 0, 0], r: 0.1, color: '#ff0000', color2: '#800080' }, { t: 'bond', p: [0, 0, 0], q: [0, 1, 0], r: 0.1, color: '#ff0000' }] }, view));
  check('svg gradient bond', (svg.match(/<linearGradient/g) || []).length === 1 && svg.includes('stroke="url(#b1)"') && svg.includes('stop-color="#800080"') && svg.includes('x1="50" y1="50" x2="60" y2="50"'));
  check('svg bonds are solid unless told otherwise', !svg.includes('<g class="bond" opacity'));
  const faded = X.toSvg(Object.assign({ items: [{ t: 'bond', p: [0, 0, 0], q: [1, 0, 0], r: 0.1, color: '#ff0000', opacity: 0.35 }, { t: 'bond', p: [0, 0, 0], q: [0, 1, 0], r: 0.1, color: '#ff0000', opacity: 1 }] }, view));
  check('svg faded bond carries its opacity once, on the group', (faded.match(/<g class="bond" opacity="0.35">/g) || []).length === 1 && (faded.match(/opacity=/g) || []).length === 1);
}

{
  // see-through faces: only the nearest is seen where they overlap
  const sq = (x, y, s, dz) => ({ pts: [[x, y], [x + s, y], [x + s, y + s], [x, y + s]].map((p) => [p[0], p[1], dz(p[0], p[1])]) });
  const flat = (z) => () => z;
  const area = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };
  const total = (pieces) => pieces.reduce((s, pc) => s + area(pc), 0);
  let v = X.visibleParts([sq(0, 0, 2, flat(0)), sq(1, 1, 2, flat(1))], 1e-6);
  check('a far face loses the part under a nearer face', v[1] === null && near(total(v[0]), 3, 1e-9));
  v = X.visibleParts([sq(1, 1, 2, flat(1)), sq(0, 0, 2, flat(0))].map((f) => ({ pts: f.pts.slice().reverse() })), 1e-6);
  check('the order and the winding of the faces do not matter', v[0] === null && near(total(v[1]), 3, 1e-9));
  v = X.visibleParts([sq(0, 0, 2, flat(0)), sq(5, 5, 2, flat(1))], 1e-6);
  check('faces that do not overlap stay whole', v[0] === null && v[1] === null);
  v = X.visibleParts([sq(1, 1, 1, flat(0)), sq(0, 0, 3, flat(1))], 1e-6);
  check('a face fully behind a nearer one has no visible part', Array.isArray(v[0]) && v[0].length === 0 && v[1] === null);
  v = X.visibleParts([sq(0, 0, 2, flat(1)), sq(1, 1, 2, flat(1))], 1e-6);
  check('of two faces at the same depth the earlier one is kept whole', v[0] === null && near(total(v[1]), 3, 1e-9));
  // the first face is farther on average but nearer where the two overlap (depth grows with x)
  v = X.visibleParts([sq(0, 0, 2, (x) => x), sq(1, 0, 2, flat(1.2))], 1e-6);
  check('depth is compared where the faces overlap, not at their centres', v[0] === null && near(total(v[1]), 2, 1e-9));
  v = X.visibleParts([sq(0, 0, 4, flat(0)), sq(1, 1, 1, flat(1)), sq(2.5, 2.5, 1, flat(2))], 1e-6);
  check('several nearer faces are all cut away', near(total(v[0]), 14, 1e-9) && v[1] === null && v[2] === null);
  const view = { width: 100, height: 100, M: [[10, 0, 0], [0, -10, 0]], b: [50, 50] };
  const tri = (z, dx) => [[dx, 0, z], [dx + 2, 0, z], [dx, 2, z]];
  const svg = X.toSvg(Object.assign({ items: [
    { t: 'face', pts: tri(0, 0), color: '#112233', opacity: 0.25, cls: 'polyhedron', nearest: true },
    { t: 'face', pts: tri(1, 0.5), color: '#445566', opacity: 0.25, cls: 'polyhedron', nearest: true, edge: 1.5, edgeColor: '#000000' },
    { t: 'face', pts: tri(2, 0), color: '#778899', cls: 'plane' }] }, view));
  check('svg nearest faces: the far one is a cut path, the near one a whole polygon, neither has an outline',
    (svg.match(/<path class="polyhedron" d="M[^"]+Z" fill="#112233" fill-opacity="0.25" stroke="none"\/>/g) || []).length === 1 &&
    (svg.match(/<polygon class="polyhedron" points="[^"]+" fill="#445566" fill-opacity="0.25" stroke="none"\/>/g) || []).length === 1);
  check('svg nearest face with edges: the whole outline is a separate polygon', (svg.match(/<polygon class="polyhedron-edge" [^>]*fill="none" stroke="#000000" stroke-width="1.5"/g) || []).length === 1);
  check('svg other faces keep their thin outline', /<polygon class="plane" [^>]*stroke-opacity="0.7"/.test(svg));
}

// Powder X-ray diffraction. The structure factors were checked against the structure-factor calculator of
// gemmi 0.7.5 (IT92 scattering factors, no dispersion), and the ring intensities against a sum over every
// h k l in the sphere, for eight structures; both agree to better than 0.05 %.
{
  const read = (file) => X.readStructure(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), file);
  const find = (p, h, k, l) => p.reflections.find((r) => r.h === h && r.k === k && r.l === l);

  // NaCl: face-centred, so mixed-parity reflections are absent
  let p = X.powderPattern(read('tests/cifs/NaCl.cif'), { tthMin: 5, tthMax: 90 });
  check('pxrd default wavelength is Cu K-alpha 1', X.powderPattern(read('tests/cifs/NaCl.cif')).lambda === 1.54059 && p.anode === 'Cu');
  check('pxrd NaCl atoms per cell, special positions counted once', p.nAtoms === 8 && X.powderAtoms(read('tests/cifs/NaCl.cif')).atoms.every((a) => a.occ === 1));
  check('pxrd NaCl reflections to 90 degrees', p.reflections.map((r) => '' + r.h + r.k + r.l).join(' ') === '111 200 220 311 222 400 331 420 422 333 511');
  check('pxrd NaCl absences', !find(p, 1, 0, 0) && !find(p, 1, 1, 0) && !find(p, 2, 1, 0));
  check('pxrd NaCl multiplicities', find(p, 1, 1, 1).m === 8 && find(p, 2, 0, 0).m === 6 && find(p, 2, 2, 0).m === 12 && find(p, 3, 1, 1).m === 24 && find(p, 4, 2, 0).m === 24);
  check('pxrd NaCl (200): d, 2-theta, |F|', near(find(p, 2, 0, 0).d, 2.8201, 1e-4) && near(find(p, 2, 0, 0).tth, 31.7029, 2e-4) && near(find(p, 2, 0, 0).f, 84.744, 0.01));
  check('pxrd NaCl intensities', find(p, 2, 0, 0).rel === 100 && near(find(p, 1, 1, 1).rel, 8.83, 0.02) && near(find(p, 2, 2, 0).rel, 62.35, 0.05) && near(find(p, 2, 2, 2).rel, 19.01, 0.03));
  check('pxrd overlapping sets with one d are listed apart', near(find(p, 3, 3, 3).tth, find(p, 5, 1, 1).tth, 1e-9) && find(p, 3, 3, 3).m === 8 && find(p, 5, 1, 1).m === 24);
  check('pxrd no displacement parameter in the file: counted, B = 1 used', p.noU === 2);
  const b0 = X.powderPattern(read('tests/cifs/NaCl.cif'), { tthMin: 5, tthMax: 90, bDefault: 0 });
  check('pxrd B lowers the high-angle reflections', find(b0, 4, 2, 2).f > find(p, 4, 2, 2).f * 1.2 && near(find(b0, 4, 2, 2).f / find(p, 4, 2, 2).f, Math.exp(1 / (4 * 1.1513 * 1.1513)), 1e-3));

  // quartz: point group 32, so (101) and (011) are two sets with one d and different |F|
  p = X.powderPattern(read('examples/quartz_SiO2.cif'), { tthMin: 5, tthMax: 60 });
  check('pxrd quartz (101) and (011)', near(find(p, 1, 0, 1).tth, 26.6402, 2e-4) && find(p, 0, 1, 1).rel === 100 && near(find(p, 1, 0, 1).rel, 43.1, 0.1) && find(p, 1, 0, 1).m === 6);
  check('pxrd quartz (100) and (112)', near(find(p, 1, 0, 0).rel, 28.56, 0.05) && near(find(p, 1, 1, 2).rel, 17.76, 0.05) && find(p, 1, 1, 2).m === 12);
  const nd = X.powderPattern(read('examples/quartz_SiO2.cif'), { tthMin: 5, tthMax: 60, dispersion: false });
  check('pxrd without f\' and f": the value of gemmi', nd.anode === null && near(find(nd, 0, 1, 1).f, 38.625, 0.005) && near(find(nd, 1, 0, 0).f, 15.985, 0.005));
  check('pxrd wavelength outside the table: no dispersion', X.powderPattern(read('examples/quartz_SiO2.cif'), { lambda: 1.0, tthMax: 40 }).anode === null && X.anodeOf(1.5418).key === 'Cu' && X.anodeOf(0.71073).key === 'Mo');
  const mo = X.powderPattern(read('examples/quartz_SiO2.cif'), { lambda: 0.70932, tthMin: 2, tthMax: 30 });
  check('pxrd Mo radiation moves the reflections', mo.anode === 'Mo' && near(find(mo, 1, 0, 1).tth, 2 * Math.asin(0.70932 / (2 * 3.34342)) * 180 / Math.PI, 1e-3));

  // (PEA)2PbBr4: displacement parameters from the file, layer reflections strongest
  const pea = read('examples/PEA2PbBr4.cif');
  check('pxrd U read from the CIF', near(pea.sites.find((x) => x.label === 'Pb1').u, 0.0327, 1e-6) && pea.sites.every((x) => x.u > 0));
  p = X.powderPattern(pea, { tthMin: 3, tthMax: 30 });
  check('pxrd PEA (001)', p.nAtoms === 188 && p.noU === 0 && find(p, 0, 0, 1).rel === 100 && near(find(p, 0, 0, 1).tth, 5.2987, 2e-4) && near(find(p, 0, 0, 1).d, 16.6647, 1e-4) && find(p, 0, 0, 1).m === 2);
  check('pxrd PEA |F|', near(find(p, 0, 0, 1).f, 526.555, 0.01) && near(find(p, 0, 0, 2).f, 298.034, 0.01) && near(find(p, 0, 0, 2).rel, 7.93, 0.02));
  check('pxrd PEA list is sorted and inside the range plus its margin', p.reflections.every((r, i) => i === 0 || r.tth >= p.reflections[i - 1].tth) && p.reflections.every((r) => r.tth > 1.4 && r.tth < 31.6));
  // every disorder part is in the pattern, weighted by occupancy: the same contents as the formula
  const fca = read('examples/FCA3_2PbBr4_294K.cif');
  const sum = {};
  for (const a of X.powderAtoms(fca).atoms) sum[a.el] = (sum[a.el] || 0) + a.occ;
  const counts = X.buildCell(fca, {}).counts;
  check('pxrd uses every disorder part', Object.keys(counts).every((el) => near(sum[el], counts[el], 1e-6)) && near(sum.O, 24.58, 0.01));
  const small = X.powderPattern(pea, { tthMin: 3, tthMax: 60, maxWork: 2e5 });
  check('pxrd range is cut when the structure is too large for it', small.cut && small.tthMax < 60 && small.tthMax >= 5);

  // displacement parameters: B column, anisotropic values, SHELX
  const cif = (rows, extra) => X.readCif('data_t\n_cell_length_a 4\n_cell_length_b 5\n_cell_length_c 6\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\nloop_\n_atom_site_label\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n' + rows + (extra || ''));
  check('pxrd B column gives U = B / 8 pi^2', near(X.readCif('data_t\n_cell_length_a 4\n_cell_length_b 4\n_cell_length_c 4\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\nloop_\n_atom_site_label\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n_atom_site_B_iso_or_equiv\nNa1 0 0 0 1.5\n').sites[0].u, 1.5 / (8 * Math.PI * Math.PI), 1e-9));
  const an = cif('Na1 0 0 0\nCl1 0.5 0.5 0.5\n', 'loop_\n_atom_site_aniso_label\n_atom_site_aniso_U_11\n_atom_site_aniso_U_22\n_atom_site_aniso_U_33\n_atom_site_aniso_U_23\n_atom_site_aniso_U_13\n_atom_site_aniso_U_12\nNa1 0.01 0.02 0.03 0 0 0\n');
  check('pxrd anisotropic U gives U equivalent', near(an.sites[0].u, 0.02, 1e-9) && an.sites[1].u === null);
  const mono = X.readCif('data_t\n_cell_length_a 5\n_cell_length_b 6\n_cell_length_c 7\n_cell_angle_alpha 90\n_cell_angle_beta 110\n_cell_angle_gamma 90\nloop_\n_atom_site_label\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nC1 0 0 0\n').cell;
  // an isotropic displacement U written as a tensor: Uij = U cos(angle between a*i and a*j); here cos(beta*) = -cos(beta)
  const cb = Math.cos(110 * Math.PI / 180);
  check('pxrd U equivalent in a monoclinic cell', near(X.uEquiv(mono, [0.03, 0.03, 0.03, 0, -0.03 * cb, 0]), 0.03, 1e-9));
  check('pxrd U read from SHELX', X.readStructure(fs.readFileSync(path.join(__dirname, 'files/NaCl.res'), 'utf8'), 'NaCl.res').sites.every((x) => near(x.u, 0.02, 1e-9)));
  const riding = X.readShelx('TITL t\nCELL 0.71073 10 10 10 90 90 90\nLATT -1\nSFAC C H\nC1 1 0.1 0.1 0.1 11.0 0.03 0.03 0.03 0 0 0\nH1 2 0.2 0.1 0.1 11.0 -1.2\nHKLF 4\nEND\n');
  check('pxrd SHELX riding H takes 1.2 U of its atom', near(riding.sites[0].u, 0.03, 1e-9) && near(riding.sites[1].u, 0.036, 1e-9));

  // profile: peak position, width, area scale, a second wavelength
  const one = [{ d: 3.0, tth: 2 * Math.asin(1.54059 / 6) * 180 / Math.PI, I: 1, lp: 1 }];
  one[0].lp = (1 + Math.cos(one[0].tth * Math.PI / 180) ** 2) / (Math.sin(one[0].tth * Math.PI / 360) ** 2 * Math.cos(one[0].tth * Math.PI / 360));
  for (const eta of [0, 0.5, 1]) {
    const pr = X.powderProfile(one, { tthMin: 25, tthMax: 35, step: 0.002, fwhm: 0.2, eta });
    let top = 0, half = 0;
    pr.y.forEach((v, i) => { if (v > pr.y[top]) top = i; if (v >= 50) half++; });
    check('pxrd profile peak and width, eta ' + eta, near(pr.x0 + top * pr.step, one[0].tth, 0.002) && near(pr.y[top], 100, 1e-9) && near(half * pr.step, 0.2, 0.006));
    // the highest point of a peak of area 1: eta 2/(pi H) + (1 - eta) (2/H) root(ln 2 / pi)
    check('pxrd profile height of unit area, eta ' + eta, near(pr.max, eta * 2 / (Math.PI * 0.2) + (1 - eta) * (2 / 0.2) * Math.sqrt(Math.LN2 / Math.PI), 2e-3));
  }
  const two = X.powderProfile(one, { tthMin: 25, tthMax: 35, step: 0.002, fwhm: 0.05, eta: 0, waves: [{ lambda: 1.54443, weight: 0.5 }] });
  const t2 = 2 * Math.asin(1.54443 / 6) * 180 / Math.PI;
  const at2 = two.y[Math.round((t2 - 25) / 0.002)];
  check('pxrd second wavelength: a peak at its own angle, about half as high', t2 - one[0].tth > 0.07 && at2 > 48 && at2 < 51);
  const prof = X.powderProfile(p.reflections, { tthMin: 3, tthMax: 30, step: 0.01, fwhm: 0.1, eta: 0.5 });
  check('pxrd PEA profile', prof.y.length === 2701 && near(Math.max(...prof.y), 100, 1e-9) && near(3 + prof.y.indexOf(Math.max(...prof.y)) * 0.01, 5.30, 0.011));

  // measured data: a Bruker text export, other separators, three columns, rows out of order
  const bruker = "'Id: \"\" Comment: \"\" Operator: \"Lab Manager\" Anode: \"Cu\" Scantype: \"Coupled TwoTheta/Theta\" TimePerStep: \"48\" X: \"9999\" Y: \"9999\" Z: \"9999\" \n5.0000 5.875\n5.0203 5.229\n5.0406 5.313\n5.0608 5.479\n";
  let xy = X.readXY(bruker);
  check('xy Bruker header skipped, anode read', xy.x.length === 4 && xy.x[0] === 5 && xy.y[3] === 5.479 && xy.anode === 'Cu' && /Lab Manager/.test(xy.header));
  xy = X.readXY('2theta,counts\r\n10.00,120,3.2\r\n10.02,1.5e2,3.3\r\n10.04,133,3.1\r\n');
  check('xy comma separated, three columns, exponent', xy.x.length === 3 && xy.y[1] === 150 && xy.anode === null);
  xy = X.readXY('# scan\n12 3\n10 1\n11 2\n');
  check('xy rows sorted by 2-theta', xy.x.join(',') === '10,11,12' && xy.y.join(',') === '1,2,3');
  xy = X.readXY('*RAS_INT_START\n20.00 15.0 1.0\n20.02 18.0 1.0\n20.04 16.0 1.0\n*RAS_INT_END\n');
  check('xy Rigaku rows', xy.x.length === 3 && xy.y[1] === 18);
  let threw = false;
  try { X.readXY('data_x\n_cell_length_a 5.2\nno numbers here\n'); } catch (err) { threw = /two numbers/.test(err.message); }
  check('xy file without data rows is refused', threw);
  const text = X.toXY(5, 0.01, Float64Array.from([0, 50, 100]), 'test');
  xy = X.readXY(text);
  check('xy written pattern reads back', text.startsWith('# test\n5.000 0.0000\n') && xy.x.length === 3 && near(xy.x[2], 5.02, 1e-9) && xy.y[2] === 100);

  // several patterns as one CSV table: a pattern on the grid is copied, a pattern on another grid is interpolated
  const grid = Float64Array.from([5, 5.01, 5.02, 5.03]);
  const csv = X.patternsCsv(5, 0.01, 4, [
    { name: 'quartz, alpha (simulated)', X: grid, Y: Float64Array.from([1, 2, 3, 4]) },
    { name: 'scan.xy (measured)', X: Float64Array.from([5.005, 5.025]), Y: Float64Array.from([10, 30]) }
  ]).split('\n');
  check('csv header: one 2-theta column, a name with a comma in quotes', csv[0] === '2theta (deg),"quartz, alpha (simulated)",scan.xy (measured)');
  check('csv pattern on the grid is copied', csv[1] === '5.000,1.0000,' && csv[4] === '5.030,4.0000,');
  check('csv pattern on another grid is interpolated, empty outside its points', csv[2] === '5.010,2.0000,15.0000' && csv[3] === '5.020,3.0000,25.0000' && csv.length === 6 && csv[5] === '');
  check('csv name that starts like a formula gets a space', X.patternsCsv(5, 0.01, 1, [{ name: '=1+1', X: grid, Y: grid }]).startsWith('2theta (deg), =1+1\n'));
  const sim = X.powderProfile(X.powderPattern(read('examples/quartz_SiO2.cif'), { tthMin: 5, tthMax: 60 }).reflections, { tthMin: 5, tthMax: 60, step: 0.02 });
  const simX = Float64Array.from(sim.y, (v, i) => sim.x0 + i * sim.step);
  const table = X.patternsCsv(5, 0.02, sim.y.length, [{ name: 'q', X: simX, Y: sim.y }]).trim().split('\n');
  check('csv of a simulated pattern: every point, no empty cell', table.length === sim.y.length + 1 && table.every((r) => !/,$/.test(r)) && table.some((r) => /,100\.0000$/.test(r)) && table[table.length - 1].startsWith('60.000,'));
}

// FHI-aims geometry.in, the structure format of the HybriD3 database. The file is data set 2008 of HybriD3
// (4-fluorophenethylammonium lead iodide, Hu et al., Nat. Commun. 10, 1276, 2019; CC BY 4.0).
{
  const file = path.join(__dirname, 'files/hybrid3_2008_geometry.in');
  const text = fs.readFileSync(file, 'utf8');
  const s = X.readStructure(text, 'geometry.in');
  const uc = X.buildCell(s, {});
  const info = X.analyse(uc);
  check('aims format and cell', s.meta.format === 'FHI-aims' && s.meta.symSource === 'p1' && near(s.cell.a, 16.723, 1e-4) && near(s.cell.b, 8.6332, 1e-4) && near(s.cell.c, 8.8, 1e-4) && near(s.cell.be, 98.781, 1e-3));
  check('aims atoms and formula', s.sites.length === 94 && uc.atoms.length === 94 && info.formula.map((e) => e.el + e.n).join(' ') === 'C16 H22 F2 I4 N2 Pb1' && info.Z === 2);
  check('aims layers', info.framework.dim === 2 && info.framework.hkl.join('') === '100' && info.layer.n === 1 && near(info.framework.spacing, 16.527, 0.002));
  check('aims Pb coordination', info.metalSites.length === 2 && info.metalSites.every((m) => m.cn === 6 && near(m.mean, 3.187, 0.002)));
  check('aims read by content when the name says nothing', X.readStructure(text, 'download').sites.length === 94);
  // the same atoms written as cell fractions, with a comment and a keyword that the reader does not need
  const iv = s.sites.map((a) => 'atom_frac ' + a.f.map((x) => x.toFixed(8)).join(' ') + ' ' + a.el + '\n    initial_moment 0.0');
  const frac = X.readAims('# written for the test\n' + text.split('\n').filter((l) => /^lattice_vector/.test(l)).join('\n') + '\n' + iv.join('\n') + '\n');
  check('aims atom_frac gives the same structure', frac.sites.length === 94 && frac.sites.every((a, i) => a.el === s.sites[i].el && a.f.every((x, k) => near(x, s.sites[i].f[k], 1e-6))));
  const mol = X.readAims('atom 0 0 0 O\natom 0.96 0 0 H\natom -0.24 0.93 0 H\n');
  check('aims without lattice vectors is a molecule', mol.meta.molecular === true && mol.sites.length === 3);
  let threw = false;
  try { X.readAims('lattice_vector 5 0 0\natom 0 0 0 C\n'); } catch (err) { threw = /three readable lattice_vector/.test(err.message); }
  check('aims with a broken lattice is refused', threw);
  check('aims: a POSCAR and an XYZ file still go to their own readers', load('tests/files/rutile.POSCAR').s.meta.format === 'POSCAR' && load('tests/files/water.xyz').s.meta.format === 'XYZ');
}

// Databases window: the formula and the names that the entry list shows (src/dbs.js, with a stand-in for the browser window)
{
  global.window = {};
  require('../src/dbs.js');
  const D = global.window.CrystaDatabases;
  check('db formula in Hill order: C, H, then by letter', D.hillFormula('C:16,H:22,N:2,F:2,Pb:1,I:4') === 'C16H22F2I4N2Pb' && D.hillFormula('C:1,H:6,N:1,Pb:1,Cl:3') === 'CH6Cl3NPb');
  check('db formula without carbon: by letter', D.hillFormula('Cs:1,Pb:1,Cl:3') === 'Cl3CsPb' && D.hillFormula('Ca:1,Ti:1,O:3') === 'CaO3Ti');
  check('db formula with part numbers, and an empty field', D.hillFormula('Br:0.5,I:0.5,Pb:1') === 'Br0.5I0.5Pb' && D.hillFormula('') === '' && D.hillFormula(null) === '');
  check('db names split at a comma with a space, not inside a chemical name', D.splitNames('(TMEDA)SbI5, TMEDASbI5').length === 2 && D.splitNames('N,N,N′-trimethylethane-1,2-diaminium; TMEDA').join('|') === 'N,N,N′-trimethylethane-1,2-diaminium|TMEDA');
  check('db names: marks for "none" are left out', D.splitNames('*, N/A, -, (PEA)2PbI4').join('|') === '(PEA)2PbI4');
  let n = D.namesOf({ name: '4-fluorophenethylammonium lead iodide', formula: 'C16H22N2F2PbI4', aliases: '4-fluorophenethanaminium tetraiodoplumbate(II), pF1PEA2PbI4', iupac: '4-fluorophenethanaminium lead (II) iodide', stoich: 'C:16,H:22,N:2,F:2,Pb:1,I:4' });
  check('db names: the short form comes first, a plain sum formula is not a name', n.common.join('|') === 'pF1PEA2PbI4|4-fluorophenethanaminium tetraiodoplumbate(II)' && n.iupac === '4-fluorophenethanaminium lead (II) iodide' && n.hill === 'C16H22F2I4N2Pb');
  n = D.namesOf({ name: 'Benzylammonium antimony bromide', formula: '(C7H10N)2SbBr5', aliases: '(C6H5CH2NH3)2SbBr5; benzylammonium bromoantimonate(III)', iupac: '-', stoich: 'C:14,H:20,N:2,Sb:1,Br:5' });
  check('db names: a formula with brackets is a common name, "-" is no IUPAC name', n.common[0] === '(C7H10N)2SbBr5' && n.common.length === 3 && n.iupac === '' && n.hill === 'C14H20Br5N2Sb');
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/hybrid3/systems.json'), 'utf8'));
  check('db copy of HybriD3: every material has a number, a name and a stoichiometry that reads', list.length > 600 && new Set(list.map((x) => x.pk)).size === list.length && list.every((x) => x.compound_name && D.hillFormula(x.stoichiometry)));
  delete global.window;
}

// a CIF with several data blocks: every block that holds atoms is a structure of its own
{
  const cifOf = (f) => fs.readFileSync(path.join(__dirname, 'cifs', f), 'utf8');
  const two = cifOf('NaCl.cif') + '\ndata_notes\n_publ_section_title "a block with no atoms"\n\n' + cifOf('diamond.cif');
  const all = X.readStructures(two, 'two.cif');
  check('multi-block CIF: each block with atoms is a structure, a block with no atoms is left out', all.structures.length === 2 && all.errors.length === 0);
  const names = all.structures.map((s) => s.meta.block);
  const f = all.structures.map((s) => X.analyse(X.buildCell(s, {})).formula.map((e) => e.el + e.n).join(' '));
  check('multi-block CIF: each structure keeps its own block name, cell and atoms', new Set(names).size === 2 && f[0] === 'Cl1 Na1' && f[1] === 'C1' && all.structures[0].cell.a !== all.structures[1].cell.a);
  check('multi-block CIF: readStructure and readCif still give the first block', X.readStructure(two, 'two.cif').meta.block === names[0] && X.readCif(two).meta.block === names[0]);
  check('multi-block CIF: found by content when the name says nothing', X.readStructures(two, 'download').structures.length === 2);
  const broken = cifOf('NaCl.cif') + '\ndata_bad\nloop_\n_atom_site_label\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nC1 0 0 0\n';
  const part = X.readStructures(broken, 'broken.cif');
  check('multi-block CIF: a block that cannot be read does not stop the others', part.structures.length === 1 && part.errors.length === 1 && part.errors[0].block === 'bad' && /unit cell/.test(part.errors[0].message));
  check('one-block CIF and other formats give one structure', X.readStructures(cifOf('NaCl.cif'), 'NaCl.cif').structures.length === 1 &&
    X.readStructures(fs.readFileSync(path.join(__dirname, 'files/rutile.POSCAR'), 'utf8'), 'rutile.POSCAR').structures[0].meta.format === 'POSCAR' &&
    X.readStructures(fs.readFileSync(path.join(__dirname, 'files/NaCl.res'), 'utf8'), 'NaCl.res').structures[0].meta.format === 'SHELX');
  let threw = false;
  try { X.readStructures('data_x\n_cell_length_a 5\n', 'empty.cif'); } catch (err) { threw = /No atom sites/.test(err.message); }
  check('CIF with no atoms in any block is refused', threw);
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
