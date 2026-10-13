const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const run = (t, name = 'x.cif', i = 0) => { const r = C.readStructures(t, name); const s = r.structures[i]; const uc = C.buildCell(s, {}); return { s, uc, info: C.analyse(uc), errors: r.errors }; };
const F = (inf) => inf.formula.map((x) => x.el + (+x.n.toFixed(3))).join(' ');
const cif = (sg, cell, rows, extra = '', type = true) => `data_t\n_cell_length_a ${cell[0]}\n_cell_length_b ${cell[1]}\n_cell_length_c ${cell[2]}\n_cell_angle_alpha ${cell[3]}\n_cell_angle_beta ${cell[4]}\n_cell_angle_gamma ${cell[5]}\n${sg}\n${extra}loop_\n_atom_site_label\n${type ? '_atom_site_type_symbol\n' : ''}_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n${rows}\n`;
// A1-05 upper-case labels without type symbol
{ const r = run(cif("_symmetry_space_group_name_H-M 'P 1'", [6, 6, 6, 90, 90, 90], 'PB1 0 0 0\nBR1 0.5 0 0', '', false)); console.log('A1-05', F(r.info)); }
// A2-08 deuterium
{ const r = run(cif("_symmetry_space_group_name_H-M 'P 1'", [5, 5, 5, 90, 90, 90], 'N1 N 0 0 0\nD1 D 0.2 0 0')); console.log('A2-08', F(r.info), r.info.formulaMass && r.info.formulaMass.toFixed(3)); }
// A2-04 rhombohedral cell with IT number only (calcite-like, R-3c rhombohedral a=6.375 al=46.08)
{ const rows = 'Ca1 Ca 0 0 0\nC1 C 0.25 0.25 0.25\nO1 O 0.507 -0.007 0.25'; const r = run(cif('_space_group_IT_number 167', [6.375, 6.375, 6.375, 46.08, 46.08, 46.08], rows)); const r2 = run(cif("_symmetry_space_group_name_H-M 'R -3 c :R'", [6.375, 6.375, 6.375, 46.08, 46.08, 46.08], rows)); console.log('A2-04 IT-only atoms', r.uc.atoms.length, 'rho', r.info.density.toFixed(3), '| R-3c:R atoms', r2.uc.atoms.length, 'rho', r2.info.density.toFixed(3)); }
// A2-05 origin choice: diamond Fd-3m symbol only, C at 1/8 1/8 1/8 (origin 2) -> 8 atoms
{ const r = run(cif("_symmetry_space_group_name_H-M 'F d -3 m'", [3.567, 3.567, 3.567, 90, 90, 90], 'C1 C 0.125 0.125 0.125')); console.log('A2-05 diamond atoms', r.uc.atoms.length, '(8 expected with origin 2)'); }
// A2-03 Z 2.99988
{ const r = run(cif("_symmetry_space_group_name_H-M 'P 1'", [5, 5, 5, 90, 90, 90], 'Na1 Na 0 0 0\nNa2 Na 0.5 0.5 0\nNa3 Na 0.5 0 0.5\nCl1 Cl 0.5 0.5 0.5\nCl2 Cl 0 0 0.5\nCl3 Cl 0 0.5 0', '_cell_formula_units_Z 2.99988\n')); console.log('A2-03 Z', r.info.Z, F(r.info)); }
// A2-09 no Z: benzene-like C6H6 x4 in P1 -> CH ?
{ let rows = ''; for (let k = 0; k < 6; k++) rows += `C${k} C ${0.1 + 0.05 * k} 0.1 0.1\nH${k} H ${0.1 + 0.05 * k} 0.2 0.1\n`; const r = run(cif("_symmetry_space_group_name_H-M 'P 1'", [10, 10, 10, 90, 90, 90], rows)); console.log('A2-09 no Z: formula', F(r.info), 'Z', r.info.Z); }
// A1-10 / A6-02 truncated last row
{ const r = run(cif("_symmetry_space_group_name_H-M 'P 1'", [6, 6, 6, 90, 90, 90], 'Pb1 Pb 0 0 0\nBr1 Br 0.5 0 0\nBr2 Br 0 0.5'), 'x.cif'); console.log('A6-02 truncated', F(r.info), 'errors', JSON.stringify(r.errors), 'notes', JSON.stringify(r.s.meta && r.s.meta.notes)); }
// DA-b05 I3- linear: bonds between I?
{ const r = run(cif("_symmetry_space_group_name_H-M 'P 1'", [12, 12, 12, 90, 90, 90], 'I1 I 0.3 0.5 0.5\nI2 I 0.5333 0.5 0.5\nI3 I 0.7666 0.5 0.5')); const big = C.assemble(r.uc, [0, 0, 0], [1, 1, 1]); console.log('DA-b05 I3 bonds', big.bonds.length, 'I-I', (2.8).toFixed(1), 'Å'); }
