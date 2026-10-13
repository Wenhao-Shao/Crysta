import sys, os, json, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R, gemmi
D = sys.argv[1]
rows = [json.loads(l) for l in open(sys.argv[2])]
diff = []; nform = 0; agree_form_crysta = 0; agree_form_mine = 0; total = 0
for r in rows:
    if 'err' in r: continue
    f = os.path.join(D, r['f'])
    try:
        st = R.read_cif(f); atoms, near = R.expand(st, 0.05)
    except Exception: continue
    total += 1
    me = collections.Counter()
    for a in atoms: me[a['el']] += a['occ']
    d = {e: round(r['sum'].get(e, 0) - me.get(e, 0), 3) for e in set(me) | set(r['sum']) if abs(r['sum'].get(e, 0) - me.get(e, 0)) > 0.01}
    # formula
    doc = gemmi.cif.read(f); b = [x for x in doc if x.find_values('_atom_site_fract_x')][0]
    fs = b.find_value('_chemical_formula_sum'); z = R.num(b.find_value('_cell_formula_units_Z'))
    form = None
    if fs and z:
        form = collections.Counter()
        for el, n in re.findall(r'([A-Z][a-z]?)\s*([0-9.]*)', gemmi.cif.as_string(fs)):
            form['H' if el == 'D' else el] += (float(n) if n else 1.0) * z
    if d:
        fd_c = {e: round(r['sum'].get(e, 0) - form.get(e, 0), 2) for e in d} if form else None
        fd_m = {e: round(me.get(e, 0) - form.get(e, 0), 2) for e in d} if form else None
        diff.append((r['f'], 'crysta-mine', d, 'crysta-formula', fd_c, 'mine-formula', fd_m))
print('files compared', total, 'files where Crysta cell content differs from mine (0.05 A merge):', len(diff))
for x in diff: print(x)
