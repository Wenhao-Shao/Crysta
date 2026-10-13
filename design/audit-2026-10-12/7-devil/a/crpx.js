// Crysta powder pattern via src/core.js: node crpx.js file lambda tthmin tthmax [dispersion 0/1]
const fs=require('fs');const C=require('/home/claude/crysta/src/core.js');C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json','utf8')));
const [f, lam, t0, t1, disp] = process.argv.slice(2);
const s=C.readStructures(fs.readFileSync(f,'utf8'),f.split('/').pop()).structures[0];
const p=C.powderPattern(s,{lambda:+lam,tthMin:+t0,tthMax:+t1,dispersion: disp!=='0'});
console.log(JSON.stringify({natoms:p.nAtoms, anode:p.anode, refl:p.reflections.map(r=>({h:[r.h,r.k,r.l],tth:+r.tth.toFixed(4),m:r.m,F2:+(r.f*r.f).toFixed(3),rel:+r.rel.toFixed(3),fre:r.fre,fim:r.fim}))}));
