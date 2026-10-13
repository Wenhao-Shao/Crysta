"""Crysta merges symmetry copies of a site that are up to 0.15 A apart (powderAtoms). For a site split across a
symmetry element the copies are distinct atoms, and the CIF occupancy is per copy. Reference with copies merged
only when < 0.05 A apart, and with Crysta's 0.15 A, against Crysta. usage: a4_merge.py CIF [tmax]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R, run_case as RC
f = sys.argv[1]; tmax = float(sys.argv[2]) if len(sys.argv) > 2 else 50
c = RC.crysta(f, 1.54059, 3, tmax)
st = R.read_cif(f)
for tol in (0.05, 0.15):
    atoms, near = R.expand(st, tol)
    ref, f000 = R.pattern(st, atoms, 1.54059, 3, tmax)
    cmp = R.compare(c['refl'], ref, 3, tmax)
    print(os.path.basename(f), 'tol', tol, 'atoms', len(atoms), 'crysta atoms', c['nAtoms'], 'max |d rel| (% of strongest)', round(cmp['max_drel'], 3), 'at', cmp['worst'],
          'max |dF2|/F2', round(cmp['max_dF2_rel'], 4), cmp['worst_F2'])
