import json, math, collections, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geomlib import *
import gemmi
R = json.load(open('t1_requests.json')); Cr = json.load(open('t1_crysta.json'))
diffs = collections.defaultdict(list); tors_bad = []
for r, c in zip(R, Cr):
    for it, v in zip(r['items'], c['items']):
        m = it['mine']
        if v is None or m is None or (isinstance(m, float) and math.isnan(m)): continue
        d = v - m
        if it['k'] == 'tors': d = (d + 180) % 360 - 180
        diffs[it['k']].append(abs(d))
        if it['k'] == 'tors' and abs(d) > 0.01: tors_bad.append((r, it, v))
for k, a in diffs.items():
    a = np.array(a); print(k, len(a), 'p99.9', '%.2e' % np.percentile(a, 99.9), 'n>tol', int((a > (0.001 if k == 'bond' else 0.01)).sum()), 'max', '%.3e' % a.max())
# torsion outliers: are the torsions degenerate (an angle at atom 2 or 3 near 180)?
for r, it, v in tors_bad:
    doc = gemmi.cif.read(r['file']); b = [x for x in doc if x.name == r['block']][0]
    M = orth_matrix(*cell_of(b)); P = [M @ np.array(f) for f in it['f']]
    def ang(a, o, c):
        u, w = a - o, c - o; return math.degrees(math.acos(max(-1, min(1, u @ w / np.linalg.norm(u) / np.linalg.norm(w)))))
    print(r['name'], it['labels'], it['codes'], 'pub', it['pub'], 'crysta', round(v, 2), 'mine', round(it['mine'], 2), 'angle@2 %.3f angle@3 %.3f' % (ang(P[0], P[1], P[2]), ang(P[1], P[2], P[3])))
