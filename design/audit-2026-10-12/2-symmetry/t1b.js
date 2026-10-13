
const C=require('/home/claude/crysta/src/core.js');const fs=require('fs');
const H=JSON.parse(fs.readFileSync(process.argv[2]));
const out=H.map(h=>{let o=null;try{o=C.hallOps(h);}catch(e){} return o?o.map(x=>[x.R,x.T]):null;});
fs.writeFileSync(process.argv[3],JSON.stringify(out));