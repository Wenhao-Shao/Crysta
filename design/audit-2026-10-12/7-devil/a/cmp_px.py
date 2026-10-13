# compare Crysta and reference reflection lists: python3 -I cmp_px.py crysta.json ref.json
import sys, json
c = json.load(open(sys.argv[1])); r = json.load(open(sys.argv[2]))
print('atoms crysta', c['natoms'], 'ref', r['natoms'])
# match by 2theta and orbit membership is hard; match by tth within 1e-3 and m, sum rel per tth group
from collections import defaultdict
def grp(L):
    g = defaultdict(float)
    for x in L: g[round(x['tth'], 3)] += x['rel']
    return g
gc, gr = grp(c['refl']), grp(r['refl'])
keys = sorted(set(gc) | set(gr))
worst = sorted(keys, key=lambda k: -abs(gc.get(k, 0) - gr.get(k, 0)))[:6]
for k in worst: print('tth %.3f crysta %.3f ref %.3f diff %.3f' % (k, gc.get(k, 0), gr.get(k, 0), gc.get(k, 0) - gr.get(k, 0)))
print('n groups', len(gc), len(gr))
