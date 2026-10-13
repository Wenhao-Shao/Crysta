"""Which merging tolerance does gemmi.get_all_unit_cell_sites use? Compare its counts with own expansion at several tolerances."""
import json, os, sys, collections, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, read_doc
W = os.path.dirname(os.path.abspath(__file__))
cr = json.load(open(os.path.join(W, 't2_crysta.json')))
agree = collections.Counter(); n = 0
for rec in cr:
    if rec['error']: continue
    doc, _ = read_doc(rec['file'])
    if doc is None: continue
    for s in rec['structures']:
        b = doc.find_block(s['block']); small = gemmi.make_small_structure_from_block(b)
        if not small.spacegroup: continue
        g = len(small.get_all_unit_cell_sites())
        ops, how = block_ops(b, small)
        n += 1
        for tol in (0.01, 0.15, 0.3, 0.4, 0.5, 0.9):
            if len(expand(small, ops, tol)[0]) == g: agree[tol] += 1
        agree['crysta'] += len(s['atomsAll']) == g
print('structures', n, dict(agree))
