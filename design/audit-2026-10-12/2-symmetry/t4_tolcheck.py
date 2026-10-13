"""For the files where neither Crysta nor the 0.15 A reference matches the CIF formula: does a 0.01 A merge of images match?"""
import json, os, sys, collections, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, read_doc
A = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/'
for fn in sys.argv[1:]:
    doc, _ = read_doc(A + fn)
    for b in doc:
        if not b.find_values('_atom_site_fract_x'): continue
        small = gemmi.make_small_structure_from_block(b); ops, how = block_ops(b, small)
        Z = float(gemmi.cif.as_string(b.find_value('_cell_formula_units_Z')))
        fs = gemmi.cif.as_string(b.find_value('_chemical_formula_sum'))
        out = {}
        for tol in (0.01, 0.15, 0.4):
            occ = collections.defaultdict(float)
            for a in expand(small, ops, tol)[0]: occ[a[1]] += a[3]
            out[tol] = {e: round(v / Z, 3) for e, v in sorted(occ.items())}
        print(fn, 'CIF:', fs, '| Z', Z); [print('   tol', t, v) for t, v in out.items()]
