"""sites whose symmetry copies are 0.05-0.15 A apart: label, occupancy, distance, and the formula of the cell
(Crysta's powderAtoms, my expansion with 0.05 A) against the CIF's _chemical_formula_sum x Z"""
import sys, os, json, subprocess, collections, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R, gemmi
for f in sys.argv[1:]:
    st = R.read_cif(f)
    atoms, near = R.expand(st)
    c = json.loads(subprocess.run(['node', 'crysta_pat.js', f, '1.54059', '3', '10'], capture_output=True, text=True).stdout)
    occ = {s['label']: s['occ'] for s in st['sites']}
    print(os.path.basename(f), 'near copies:', sorted(set((n[0], occ[n[0]], round(n[1], 3)) for n in near)))
    cr = collections.Counter(); me = collections.Counter()
    for a in c['atoms']: cr[a['el']] += a['occ']
    for a in atoms: me[a['el']] += a['occ']
    doc = gemmi.cif.read(f); b = [x for x in doc if x.find_values('_atom_site_fract_x')][0]
    fs = b.find_value('_chemical_formula_sum'); z = b.find_value('_cell_formula_units_Z')
    print('   cell content Crysta', {k: round(v, 2) for k, v in sorted(cr.items())})
    print('   cell content mine  ', {k: round(v, 2) for k, v in sorted(me.items())})
    print('   CIF formula_sum', fs, 'Z', z)
