# occupancy-weighted cell contents per element from gemmi's sites and operators, with my own expansion
import json, sys, numpy as np, gemmi
g = json.load(open(sys.argv[1]))
files = [l for l in open(sys.argv[2]).read().split('\n') if l]
out = {}
for f in files:
    name = f.split('/')[-1]
    res = []
    for b in g[name]['blocks']:
        ops = [(np.array(o['rot']), np.array(o['tran'])) for o in b['ops'] if 'rot' in o]
        if not ops:
            sg = gemmi.find_spacegroup_by_name(b['hm']) if b['hm'] else None
            ops = [(np.array(op.rot) / 24, np.array(op.tran) / 24) for op in sg.operations()] if sg else [(np.eye(3), np.zeros(3))]
        a, bb, c, al, be, ga = b['cell']
        cell = gemmi.UnitCell(a, bb, c, al, be, ga)
        M = np.array(cell.orth.mat.tolist())
        cnt = {}
        for s in b['sites']:
            f0 = np.array(s['f'])
            pts = []
            for R, T in ops:
                p = (R @ f0 + T) % 1.0
                if any(np.linalg.norm(M @ (((p - q) + 0.5) % 1.0 - 0.5)) < 0.15 for q in pts):
                    continue
                pts.append(p)
            el = 'H' if s['el'] == 'D' else s['el']
            cnt[el] = cnt.get(el, 0) + s['occ'] * len(pts)
        res.append({'block': b['block'], 'weighted': cnt})
    out[name] = res
json.dump(out, open(sys.argv[3], 'w'))
