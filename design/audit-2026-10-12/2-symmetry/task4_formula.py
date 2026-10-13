"""Task 4: formula, Z, formula mass, density, volume. Crysta (analyse) against
(a) own calculation from the gemmi-expanded cell (occupancy-weighted, gemmi element weights, gemmi cell volume), and
(b) the CIF's own _chemical_formula_sum, _cell_formula_units_Z, _chemical_formula_weight, _exptl_crystal_density_diffrn, _cell_volume."""
import json, os, sys, re, collections
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, read_doc
W = os.path.dirname(os.path.abspath(__file__))
NA = 6.02214076e23
cr = json.load(open(os.path.join(W, 't2_crysta.json')))

def num(v):
    if v is None: return None
    s = gemmi.cif.as_string(v)
    m = re.match(r'^\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)', s)
    return float(m.group(1)) if m else None

def parse_formula(s):
    out = collections.defaultdict(float)
    for el, n in re.findall(r'([A-Z][a-z]?)\s*([0-9]*\.?[0-9]*)', s):
        out['H' if el == 'D' else el] += float(n) if n not in ('', '.') else 1.0
    return dict(out)

rows = []
for rec in cr:
    if rec['error']: continue
    doc, note = read_doc(rec['file'])
    if doc is None: continue
    for s in rec['structures']:
        if 'info' not in s: continue
        b = doc.find_block(s['block'])
        if b is None: continue
        small = gemmi.make_small_structure_from_block(b)
        ops, how = block_ops(b, small)
        ref, near, M = expand(small, ops, 0.15)
        occ = collections.defaultdict(float)
        for a in ref: occ[a[1]] += a[3]
        mass = sum(gemmi.Element(e).weight * n for e, n in occ.items())
        Vg = small.cell.volume
        Zf = num(b.find_value('_cell_formula_units_Z'))
        info = s['info']
        Z = Zf if Zf and Zf > 0 else None
        r = {'file': os.path.basename(rec['file']), 'block': s['block'], 'Z_file': Zf, 'Z_crysta': info['Z'],
             'V_crysta': s['cell']['V'], 'V_gemmi': Vg, 'V_cif': num(b.find_value('_cell_volume')),
             'mass_cell_ref': mass, 'rho_ref': mass / (NA * Vg * 1e-24),
             'rho_crysta': info['density'], 'M_crysta': info['formulaMass'],
             'M_ref': mass / info['Z'] if info['Z'] else None,
             'rho_cif': num(b.find_value('_exptl_crystal_density_diffrn')), 'M_cif': num(b.find_value('_chemical_formula_weight')),
             'formula_crysta': {f['el']: f['n'] for f in info['formula']},
             'formula_ref': {e: n / info['Z'] for e, n in occ.items()},
             'counts_crysta': s['counts'], 'counts_ref': dict(occ)}
        fs = b.find_value('_chemical_formula_sum')
        r['formula_cif'] = parse_formula(gemmi.cif.as_string(fs)) if fs and gemmi.cif.as_string(fs) not in ('?', '.') else None
        rows.append(r)
json.dump(rows, open(os.path.join(W, 't4_result.json'), 'w'), indent=0)

def rel(a, b): return abs(a - b) / abs(b) if (a is not None and b) else None
# 1. Crysta vs own reference (same Z as Crysta)
dV = max(abs(r['V_crysta'] - r['V_gemmi']) for r in rows)
print('structures', len(rows), '; max |V crysta - V gemmi| = %.2e A^3' % dV)
badrho = [r for r in rows if r['rho_crysta'] is None or abs(r['rho_crysta'] - r['rho_ref']) > 5e-4]
print('density differs from reference by >0.0005 g/cm3:', len(badrho))
for r in sorted(badrho, key=lambda r: -abs((r['rho_crysta'] or 0) - r['rho_ref']))[:25]:
    print('  ', r['file'], r['block'][:18], 'crysta %.4f ref %.4f cif %s' % (r['rho_crysta'] or -1, r['rho_ref'], r['rho_cif']))
badM = [r for r in rows if r['M_crysta'] is None or abs(r['M_crysta'] - r['M_ref']) > 0.01]
print('formula mass differs from own reference by >0.01 g/mol (same Z):', len(badM))
# Z: Crysta vs file
print('Z crysta != Z file:', [(r['file'], r['Z_crysta'], r['Z_file']) for r in rows if r['Z_file'] and r['Z_crysta'] != r['Z_file']][:10],
      '; no Z in file:', sum(1 for r in rows if not r['Z_file']))
# volume vs CIF
vb = [(r['file'], round(r['V_crysta'], 2), r['V_cif']) for r in rows if r['V_cif'] and abs(r['V_crysta'] - r['V_cif']) > max(1.0, 0.0005 * r['V_cif'])]
print('V differs from _cell_volume by > max(1 A3, 0.05%):', len(vb), vb[:10])
# 2. Crysta vs CIF values
def cmp(key, tol):
    n = 0; bad = []
    for r in rows:
        if r[key + '_cif'] is None or r[key + '_crysta'] is None: continue
        n += 1
        if abs(r[key + '_crysta'] - r[key + '_cif']) > tol(r[key + '_cif']): bad.append(r)
    return n, bad
n, bad = cmp('rho', lambda v: 0.0015)
print('density vs _exptl_crystal_density_diffrn: compared', n, 'differ >0.0015:', len(bad))
n2, bad2 = cmp('M', lambda v: max(0.05, 2e-4 * v))
print('formula mass vs _chemical_formula_weight: compared', n2, 'differ:', len(bad2))
# where Crysta and the reference differ, who agrees with the CIF?
cnt = collections.Counter()
for r in rows:
    if r['rho_cif'] is None or r['rho_crysta'] is None: continue
    c_ok = abs(r['rho_crysta'] - r['rho_cif']) <= 0.0015; g_ok = abs(r['rho_ref'] - r['rho_cif']) <= 0.0015
    cnt[(c_ok, g_ok)] += 1
print('density agreement with CIF (crysta_ok, ref_ok):', dict(cnt))
# formula vs _chemical_formula_sum
fb = []
for r in rows:
    if not r['formula_cif']: continue
    els = set(r['formula_cif']) | set(r['formula_crysta'])
    zf = r['Z_file'] or r['Z_crysta']
    d = {e: (r['formula_crysta'].get(e, 0), round(r['counts_ref'].get(e, 0) / r['Z_crysta'], 3), r['formula_cif'].get(e, 0)) for e in els
         if abs(r['formula_crysta'].get(e, 0) - r['formula_cif'].get(e, 0)) > 0.011}
    if d: fb.append((r['file'], r['block'][:16], r['Z_crysta'], d))
print('formula (per Z) differs from _chemical_formula_sum:', len(fb), 'of', sum(1 for r in rows if r['formula_cif']))
for x in fb[:60]: print('  ', x)
