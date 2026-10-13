"""Task 1b: Crysta hallOps on every Hall symbol of gemmi's table (564 settings) and on spelling variants."""
import json, subprocess, os, gemmi
W = os.path.dirname(os.path.abspath(__file__))
def gem_set(ops):
    return {(tuple(int(x)//gemmi.Op.DEN for r in op.rot for x in r), tuple((int(x) % gemmi.Op.DEN)*24//gemmi.Op.DEN for x in op.tran)) for op in ops}
def cry_set(ops):
    return {(tuple(int(round(x)) for r in R for x in r), tuple(int(round(x*24)) % 24 for x in T)) for R, T in ops}
halls = []
for sg in gemmi.spacegroup_table():
    h = sg.hall
    halls += [h, h.lower(), h.replace(' ', '_'), '  ' + h + ' ']
js = r'''
const C=require('/home/claude/crysta/src/core.js');const fs=require('fs');
const H=JSON.parse(fs.readFileSync(process.argv[2]));
const out=H.map(h=>{let o=null;try{o=C.hallOps(h);}catch(e){} return o?o.map(x=>[x.R,x.T]):null;});
fs.writeFileSync(process.argv[3],JSON.stringify(out));'''
open(os.path.join(W, 't1b.js'), 'w').write(js)
json.dump(halls, open(os.path.join(W, 't1b_in.json'), 'w'))
subprocess.run(['node', os.path.join(W, 't1b.js'), os.path.join(W, 't1b_in.json'), os.path.join(W, 't1b_out.json')], check=True)
out = json.load(open(os.path.join(W, 't1b_out.json')))
bad = {}; ok = 0
for h, o in zip(halls, out):
    g = gem_set(gemmi.symops_from_hall(h.strip().replace('_', ' ')))
    if o is None: bad.setdefault('null', []).append(h)
    elif cry_set(o) != g or len(o) != len(g): bad.setdefault('differ', []).append(h)
    else: ok += 1
print('ok', ok, 'of', len(halls))
for k, v in bad.items(): print(k, len(v), v[:12])
