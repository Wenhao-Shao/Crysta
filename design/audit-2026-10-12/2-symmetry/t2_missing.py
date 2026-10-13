"""For each reference atom missing in Crysta: nearest Crysta atom of the same element, its label, occupancy and disorder group."""
import json, os, sys, collections
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, mic, read_doc
W = os.path.dirname(os.path.abspath(__file__))
cr = {os.path.basename(r['file']): r for r in json.load(open(os.path.join(W, 't2_crysta.json')))}
files = sys.argv[1:]
for name in files:
    rec = cr[name]
    doc, _ = read_doc(rec['file'])
    for s in rec['structures']:
        b = doc.find_block(s['block']); small = gemmi.make_small_structure_from_block(b)
        ops, how = block_ops(b, small)
        ref, near, M = expand(small, ops, 0.15)
        siteinfo = {x[0]: x for x in s['sites']}
        have = collections.defaultdict(list)
        for a in s['atomsAll']: have[(a[0], a[3])].append(a)
        seen = set()
        for a in ref:
            if have.get((a[1], a[4])): continue
            if a[4] in seen: continue
            seen.add(a[4])
            best = min(((mic(M, a[2] - np.array(c[1])), c) for c in s['atomsAll'] if c[0] == a[1]), key=lambda t: t[0])
            si = siteinfo.get(a[4])
            print(name, 'missing', a[4], 'occ', a[3], 'dg', si[4] if si else None, '| nearest', best[1][3], 'd=%.3f' % best[0], 'occ', best[1][2], 'dg', best[1][4])
