# The authors' own cell contents: Z x _chemical_formula_sum, against Crysta's cell contents and the weighted count
import json, re, sys, gemmi
S = sys.argv[1]
m = json.load(open('mech.json')); w = json.load(open('weighted.json'))
def fsum(s):
    out = {}
    for el, n in re.findall(r'([A-Z][a-z]?)\s*([\d.]*)', s or ''):
        out[el] = out.get(el, 0) + (float(n) if n else 1.0)
    return out
rows = []
for r in m:
    doc = gemmi.cif.read(S + '/' + r['file']) if r['file'] not in ('1453_1.cif', '1463_1.cif', '643_1.cif', '1322_1.cif', '830_1.cif', '831_1.cif', '1434_1.cif') else None
    if doc is None: continue
    blk = next((b for b in doc if b.name == r['block']), None)
    if blk is None: continue
    fs = blk.find_value('_chemical_formula_sum'); Z = blk.find_value('_cell_formula_units_Z')
    if not fs or not Z: continue
    try: Z = float(gemmi.cif.as_string(Z))
    except Exception: continue
    F = fsum(gemmi.cif.as_string(fs))
    wb = [x for x in w[r['file']] if x['block'] == r['block']][0]['weighted']
    els = sorted(set(k for k in ('crossSite', 'split', 'sameSite') for _ in [0] if r[k]) )
    lost = {}
    for k in ('crossSite', 'split', 'sameSite'):
        for el in r[k]: lost.setdefault(el, []).append(k)
    for el, kinds in lost.items():
        rows.append((r['file'], r['block'][:14], el, '/'.join(kinds), 'file Z*formula=%g' % round(Z * F.get(el, 0), 3), 'weighted=%g' % round(wb.get(el, 0), 3), 'crysta=%g' % r['counts'].get(el, 0)))
for x in rows: print(*x)
