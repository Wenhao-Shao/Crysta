// Crysta's powder pattern for one structure file, as JSON on stdout (object of the test, not a reference).
// usage: node crysta_pat.js FILE [lambda] [tthMin] [tthMax] [dispersion 1|0] [bDefault]
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const [file, lam, t0, t1, disp, bd] = process.argv.slice(2);
const text = fs.readFileSync(file, 'utf8');
const s = C.readStructure(text, file.replace(/^.*\//, ''));
const opts = { lambda: lam ? +lam : 1.54059, tthMin: t0 ? +t0 : 3, tthMax: t1 ? +t1 : 60 };
if (disp === '0') opts.dispersion = false;
if (bd) opts.bDefault = +bd;
if (process.env.MAXWORK) opts.maxWork = +process.env.MAXWORK;
const p = C.powderPattern(s, opts);
const pa = C.powderAtoms(s, opts.bDefault);
const out = {
  cell: { a: s.cell.a, b: s.cell.b, c: s.cell.c, al: s.cell.al, be: s.cell.be, ga: s.cell.ga, V: s.cell.V },
  nops: s.ops.length,
  ops: s.ops.map((o) => ({ R: o.R, T: o.T })),
  sites: s.sites.map((x) => ({ label: x.label, el: x.el, f: x.f, occ: x.occ, u: x.u })),
  atoms: pa.atoms,
  noU: p.noU, missing: p.missing, anode: p.anode, nAtoms: p.nAtoms, f000: p.f000, tthMin: p.tthMin, tthMax: p.tthMax, cut: p.cut,
  refl: p.reflections
};
process.stdout.write(JSON.stringify(out));
