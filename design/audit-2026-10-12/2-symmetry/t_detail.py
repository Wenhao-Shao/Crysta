"""Distances and occupancies of the atom pairs behind the formula findings (for the report; no file content)."""
import json, os, sys, collections
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, mic, read_doc
A = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/'
for fn, blk in [('1259_1.cif', 'CsSnI3_B_gamma'), ('1362_1.cif', None), ('1793_1.cif', None), ('1614_1.cif', None), ('2462_1.cif', None), ('1345_1.cif', None), ('1194_1.cif', None), ('663_1.cif', None), ('2798_1.cif', None), ('1145_1.cif', None), ('1038_1.cif', None)]:
    doc, _ = read_doc(A + fn)
    b = doc.find_block(blk) if blk else [x for x in doc if x.find_values('_atom_site_fract_x')][0]
    small = gemmi.make_small_structure_from_block(b); ops, how = block_ops(b, small)
    ref, near, M = expand(small, ops, 0.01)
    pairs = {}
    for i in range(len(ref)):
        for j in range(i + 1, len(ref)):
            a, c = ref[i], ref[j]
            if a[1] != c[1] or a[1] == 'H' and fn not in ('1194_1.cif', '663_1.cif'): continue
            d = mic(M, a[2] - c[2])
            if d < 0.9:
                k = (a[4], c[4]) if a[4] <= c[4] else (c[4], a[4])
                if k not in pairs or d < pairs[k][0]: pairs[k] = (round(d, 3), a[3], c[3])
    print(fn, b.name, sorted(pairs.items(), key=lambda kv: kv[1][0])[:8])
