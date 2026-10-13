// blocks where a negative-group site that is not in a molecule (halide or metal) keeps more than one orientation
const fs=require('fs');const C=require('/home/claude/crysta/src/core.js');C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json','utf8')));
const H=process.argv[2];
for (const f of fs.readdirSync(H).filter((x)=>/\.cif$/.test(x)).sort()) {
  let r; try { r=C.readStructures(fs.readFileSync(H+'/'+f,'utf8'),f); } catch(e) { continue; }
  r.structures.forEach((s,bi)=>{
    if (!s.sites.some(x=>x.symdis)) return;
    const uc=C.buildCell(s); const blk=C.assemble(uc,[0,0,0],[1,1,1]);
    const neg=s.sites.map((x,i)=>[x,i]).filter(([x])=>x.symdis && (C.HALIDE.has(x.el) || C.isMetal(x.el)));
    if (!neg.length) return;
    // shown copies of each such site in the cell, and pairs of them closer than 1.5 A
    const out=[];
    for (const [x,i] of neg) {
      const at=uc.atoms.filter(a=>a.site===i);
      let close=0; for (let p=0;p<at.length;p++) for (let q=p+1;q<at.length;q++){ const d=[0,1,2].map(k=>{let v=at[p].f[k]-at[q].f[k]; return v-Math.round(v);}); const c=uc.cell.toCart(d); if (Math.hypot(...c)<1.5) close++; }
      if (close) out.push(x.label+' close pairs '+close);
    }
    if (out.length) console.log(f, bi, out.join('; '));
  });
}
