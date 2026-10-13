const fs=require('fs');const C=require('/home/claude/crysta/src/core.js');C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json','utf8')));
const f=process.argv[2]; const r=C.readStructures(fs.readFileSync(f,'utf8'),f.split('/').pop()); const s=r.structures[+(process.argv[3]||0)];
const uc=C.buildCell(s); const info=C.analyse(uc);
for (const m of info.metalSites) { const o={}; for (const k of Object.keys(m)) { const v=m[k]; if (typeof v!=='object'||v===null) o[k]=v; } console.log(JSON.stringify(o)); }
console.log('framework', JSON.stringify(info.framework && {dim: info.framework.dim, kind: info.framework.kind}));
