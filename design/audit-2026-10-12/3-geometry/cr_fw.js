// Crysta's framework analysis (C.analyse) and the page's hydrogen-bond rows (as rebuildCell in the page makes them)
// usage: node cr_fw.js list.json out.json
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const lst = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const withHB = process.argv[4] === 'hb';
const out = [];
for (const [path, block] of lst) {
  const r = { path, block };
  try {
    const name = path.replace(/^.*\//, '');
    const all = C.readStructures(fs.readFileSync(path, 'utf8'), /\.in$/.test(name) ? 'geometry.in' : name).structures;
    const st = block ? all.find((s) => s.meta.block === block) : all[0];
    const uc = C.buildCell(st, {});
    const info = C.analyse(uc);
    r.nAtoms = uc.atoms.length;
    const fw = info.framework;
    r.framework = fw ? { dim: fw.dim, hkl: fw.hkl, dhkl: fw.dhkl, spacing: fw.spacing, components: fw.components, halideBridged: fw.halideBridged, kind: fw.kind } : null;
    r.metalSites = info.metalSites;
    r.bridges = info.bridges;
    const L = info.layer;
    if (L) r.layer = { n: L.n, nUniform: L.nUniform, slabThickness: L.slabThickness, gallery: L.gallery, spacing: L.spacing, dhkl: L.dhkl, bridges: L.bridges, axialTilt: L.axialTilt, penetration: L.penetration, offset: L.offset ? { s1: L.offset.s1, s2: L.offset.s2, kind: L.offset.kind, p1: L.offset.p1, p2: L.offset.p2 } : null, slabs: L.slabs, normal: L.normal };
    if (withHB) {
      const big = uc.atoms.length <= 400 ? C.assemble(uc, [-1, -1, -1], [2, 2, 2]) : C.assemble(uc, [0, 0, 0], [1, 1, 1]);
      const seen = new Map();
      for (const h of big.hbonds) {
        const A = big.atoms;
        const key = A[h.d].label + '|' + (h.h >= 0 ? A[h.h].label : '') + '|' + A[h.a].label + '|' + h.dDA.toFixed(2);
        if (!seen.has(key)) seen.set(key, { key, D: A[h.d].label, H: h.h >= 0 ? A[h.h].label : null, A: A[h.a].label, dHA: h.dHA, dDA: h.dDA, angle: h.angle });
      }
      r.hbRows = Array.from(seen.values()).sort((p, q) => p.dDA - q.dDA);
      r.hbFromH = big.hasH;
    }
  } catch (e) { r.error = String(e && e.message).slice(0, 200); }
  out.push(r);
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
