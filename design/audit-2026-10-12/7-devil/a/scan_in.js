// geometry.in files in which the 0.9 A split rule hides atoms (file lists both components at full weight)
const fs=require('fs');const C=require('/home/claude/crysta/src/core.js');
const H=process.argv[2];
for (const f of fs.readdirSync(H).filter((x)=>/\.in$/.test(x)).sort()) {
  const s=C.readStructure(fs.readFileSync(H+'/'+f,'utf8'),f); const uc=C.buildCell(s);
  if (uc.hiddenMinor>0) { const pa=C.powderAtoms(s,1); const cnt={}; for (const k of Object.keys(uc.counts)) cnt[k]=uc.counts[k]; const pc={}; pa.atoms.forEach(a=>pc[a.el]=(pc[a.el]||0)+a.occ); console.log(f, 'hidden', uc.hiddenMinor, 'formula counts', JSON.stringify(cnt), 'pxrd counts', JSON.stringify(pc), 'split', uc.autoSplit.slice(0,3).join(',')); }
}
