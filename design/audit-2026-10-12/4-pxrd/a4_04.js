// A4-04: the |F| column is the root of the mean |F|^2 of the set (README), not |F| of the named reflection (page note)
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const f = process.argv[2];
const s = C.readStructure(fs.readFileSync(f, 'utf8'), 'quartz_SiO2.cif');
const p = C.powderPattern(s, { lambda: 1.54059, tthMin: 3, tthMax: 70 });
const r = p.reflections.find((x) => x.h === 2 && x.k === 1 && x.l === 0);
console.log('(2 1 0): F(real)', r.fre.toFixed(3), 'F(imag)', r.fim.toFixed(3), '-> |F(210)| =', Math.hypot(r.fre, r.fim).toFixed(3), '; |F| column =', r.f.toFixed(3));
