// Small Node checks. usage: node misc.js <case> [file]
//   short      : CIF with a short last loop row and a truncated CIF (A6-02)
//   sym        : symbol-only Cmce / Cmca, rhombohedral calcite with only the IT number, diamond 'F d -3 m' (A6-03/04/05)
//   cells      : impossible cells (A6-07)
//   triiodide  : linear I3- anion (DA-b05)
//   ipa <file> : IPA3Sn2I7 blocks 120 K / 293 K / 400 K (DA-b01)
//   split <file> : the 2.5 % Pb sites of 973_1 (A3-09)
//   bridges <file> : distinct bridge angles among the first 16 rows (A3-06, DA-b06)
const { C, load } = require('./cr.js'); const fs = require('fs');
const [cs, file] = process.argv.slice(2);
const rd = (f) => { const s = C.readStructures(fs.readFileSync(f, 'utf8'), f.replace(/^.*\//, '')).structures[0]; const uc = C.buildCell(s, {}); return { s, uc, info: C.analyse(uc) }; };
if (cs === 'short') for (const f of ['synth/da_short_row.cif', 'synth/da_truncated.cif']) { const { s, uc, info } = rd(f); console.log(f, 'sites', s.sites.length, 'cell atoms', uc.atoms.length, 'formula', info.formula.map((x) => x.el + x.n).join('')); }
if (cs === 'sym') for (const f of ['da_cmce', 'da_cmca', 'da_calcite_rh', 'da_diamond']) { const { s, uc } = rd('synth/' + f + '.cif'); console.log(f, 'operators', s.ops.length, 'atoms per cell', uc.atoms.length); }
if (cs === 'cells') for (const f of ['da_cell_a0', 'da_cell_aneg', 'da_cell_imposs', 'da_cell_g0']) { const { uc, info } = rd('synth/' + f + '.cif'); console.log(f, 'V', uc.cell.V, 'density', info.density); }
if (cs === 'triiodide') { const { uc } = rd('synth/da_triiodide.cif'); const blk = C.assemble(uc, [0, 0, 0], [1, 1, 1]); console.log(blk.atoms.filter((a) => a.el === 'I').map((a) => a.label + ' kind ' + a.kind + ' bonds ' + a.bonds.length).join('; ')); }
if (cs === 'ipa') for (const b of ['120K', '293K', '400K']) { const r = load(file, b); const L = r.info.layer; console.log(b, 'layers per repeat', r.info.framework.components, 'n', L.n, 'spacing', r.info.framework.spacing.toFixed(3), 'slab', L.slabThickness && L.slabThickness.toFixed(3), 'gallery', L.gallery && L.gallery.toFixed(3)); }
if (cs === 'split') { const r = load(file); console.log(r.info.metalSites.map((m) => m.label + ' CN ' + m.cn).join(', ')); console.log(r.info.layer.bridges.filter((b) => b.theta < 60).map((b) => b.m1 + '-' + b.x + '-' + b.m2 + ' ' + b.theta.toFixed(2)).join(', ')); }
if (cs === 'bridges') { const B = load(file).info.layer.bridges; const key = (b) => b.theta.toFixed(2) + (b.equatorial ? 'e' : 'a'); const all = new Set(B.map(key)), shown = new Set(B.slice(0, 16).map(key)); console.log(file.replace(/^.*\//, ''), 'bridges', B.length, 'distinct angles', all.size, 'shown in 16 rows', shown.size, 'hidden', [...all].filter((k) => !shown.has(k)).join(' ')); }
