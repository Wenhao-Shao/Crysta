// The small reader findings (S4). Each line: the file, what Crysta (XtalCore, the code of the page) gives.
// Expected values are in the comments; references: gemmi (CIF), ASE 3.23 read_vasp / extxyz (POSCAR, XYZ),
// Python zipfile (zip), see compare_cases.py, the ASE comparisons and zip_crysta.js in this folder.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const K = __dirname + '/cases/';
const S = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/';
const read = (p, n) => { try { return C.readStructures(fs.readFileSync(p, 'utf8'), n || p.split('/').pop()); } catch (e) { return { error: e.message }; } };
const sites = (r) => r.error ? r.error : r.structures[0].sites.map((t) => t.label + ':' + t.el + '@' + t.f.map((x) => +x.toFixed(4)).join(',')).join('  ');
// A1-08: site Cg1 has _atom_site_calc_flag dum (a dummy site, not an atom); expected: not an atom (gemmi: element X)
console.log('A1-08 su_flags.cif      ', sites(read(K + 'su_flags.cif')).split('  ').filter((x) => /^Cg1/.test(x)).join());
// A1-09: Pb1 written "1/3 2/3 1/4" (not a CIF number); expected: an error or the site listed as not read (gemmi: NaN)
console.log('A1-09 fractions.cif     ', sites(read(K + 'fractions.cif')));
// A1-10: the second row lacks one value; expected: an error (gemmi: "Wrong number of values in loop"). I1 is lost
//        without a note, and the rows after the gap are shifted
const ls = read(K + 'loop_short.cif');
console.log('A1-10 loop_short.cif    ', sites(ls), '| not read:', JSON.stringify(ls.structures[0].meta.skipped), '| I1 listed nowhere');
// A1-11: block sm01 of data set 643 has an unquoted "P 21 21 21" (invalid CIF); Crysta shows the space group as
const r643 = read(S + '643_1.cif');
console.log('A1-11 643_1.cif sm01    space group shown:', JSON.stringify(r643.structures.find((s) => s.meta.block === 'sm01').meta.spaceGroup));
// A1-12: three scaling factors 1.0 1.0 2.0 (VASP: one per Cartesian axis); expected V 532.208 A^3 (ASE), c doubled
const p3 = read(K + 'poscar/v6_three_scales.POSCAR');
console.log('A1-12 v6_three_scales   V', p3.structures[0].cell.V.toFixed(3), 'c', p3.structures[0].cell.c.toFixed(4));
// A1-14: XYZ with atomic numbers, and extended XYZ with Properties=pos:R:3:species:S:1
console.log('A1-14 plain_numbers.xyz ', sites(read(K + 'xyz/plain_numbers.xyz')));
console.log('A1-14 ext_pos_first.xyz ', sites(read(K + 'xyz/ext_pos_first.xyz')));
// A1-15: labels of a POSCAR with POTCAR names that carry a suffix
console.log('A1-15 v5_suffix.POSCAR  ', read(K + 'poscar/v5_suffix.POSCAR').structures[0].sites.map((t) => t.label).join(' '));
// A1-16: a POSCAR whose comment line starts with "atom 12"
console.log('A1-16 POSCAR_atomcomment', sites(read(K + 'POSCAR_atomcomment')));
// A1-13: zip files (the page: see page_zip.json); zipStructureNames picks control.in, skips the inner zip
console.log('A1-13 names picked from aims_folder.zip:', C.zipStructureNames(['calc/geometry.in', 'calc/control.in'], false), '| from outer.zip:', C.zipStructureNames(['inner/mixed.zip', 'top.cif'], false));
