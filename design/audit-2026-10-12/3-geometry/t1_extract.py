"""Task 1: published _geom_bond/_geom_angle/_geom_torsion values -> target fractional coordinates and my numpy values."""
import sys, os, glob, json, math, numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geomlib import *
A = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit'
files = sorted(glob.glob(A + '/corpus/hybrid3/structures/*.cif')) + sorted(glob.glob(A + '/corpus/examples/*.cif'))
res = []
for path in files:
    try: doc = gemmi.cif.read(path)
    except Exception as e: continue
    for b in doc:
        if b.find_value('_cell_length_a') is None or not len(b.find_values('_atom_site_fract_x')): continue
        try:
            cell = cell_of(b); ops, idmap = block_symops(b); sites = sites_of(b)
        except Exception as e:
            continue
        M = orth_matrix(*cell); G = metric(*cell)
        rec = {'file': path, 'name': os.path.basename(path), 'block': b.name, 'items': []}
        def tgt(lab, code):
            return apply_code(code, sites[lab]['f'], idmap)
        # bonds
        t = b.find('_geom_bond_', ['atom_site_label_1', 'atom_site_label_2', 'distance', '?site_symmetry_1', '?site_symmetry_2'])
        for r in t:
            try:
                l1, l2 = r.str(0), r.str(1)
                v, su, dec = num_su(r[2])
                if v is None: continue
                c1 = r.str(3) if r.has(3) else '.'; c2 = r.str(4) if r.has(4) else '.'
                f1, f2 = tgt(l1, c1), tgt(l2, c2)
            except Exception as e:
                continue
            df = f2 - f1
            mine = math.sqrt(df @ G @ df)
            rec['items'].append({'k': 'bond', 'labels': [l1, l2], 'codes': [c1, c2], 'f': [f1.tolist(), f2.tolist()], 'pub': v, 'su': su, 'dec': dec, 'mine': mine})
        t = (lambda t1: t1 if len(t1) else b.find('', ['_geom_angle_atom_site_label_1', '_geom_angle_atom_site_label_2', '_geom_angle_atom_site_label_3', '_geom_angle_value', '?_geom_angle_site_symmetry_1', '?_geom_angle_site_symmetry_2', '?_geom_angle_site_symmetry_3']))(b.find('', ['_geom_angle_atom_site_label_1', '_geom_angle_atom_site_label_2', '_geom_angle_atom_site_label_3', '_geom_angle', '?_geom_angle_site_symmetry_1', '?_geom_angle_site_symmetry_2', '?_geom_angle_site_symmetry_3']))
        for r in t:
            try:
                ls = [r.str(0), r.str(1), r.str(2)]
                v, su, dec = num_su(r[3])
                if v is None: continue
                cs = [r.str(4 + i) if r.has(4 + i) else '.' for i in range(3)]
                fs = [tgt(l, c) for l, c in zip(ls, cs)]
            except Exception:
                continue
            P = [M @ f for f in fs]
            u, w = P[0] - P[1], P[2] - P[1]
            mine = math.degrees(math.acos(max(-1, min(1, u @ w / np.linalg.norm(u) / np.linalg.norm(w)))))
            rec['items'].append({'k': 'angle', 'labels': ls, 'codes': cs, 'f': [f.tolist() for f in fs], 'pub': v, 'su': su, 'dec': dec, 'mine': mine})
        t = (lambda t1: t1 if len(t1) else b.find('', ['_geom_torsion_atom_site_label_1', '_geom_torsion_atom_site_label_2', '_geom_torsion_atom_site_label_3', '_geom_torsion_atom_site_label_4', '_geom_torsion_value', '?_geom_torsion_site_symmetry_1', '?_geom_torsion_site_symmetry_2', '?_geom_torsion_site_symmetry_3', '?_geom_torsion_site_symmetry_4']))(b.find('', ['_geom_torsion_atom_site_label_1', '_geom_torsion_atom_site_label_2', '_geom_torsion_atom_site_label_3', '_geom_torsion_atom_site_label_4', '_geom_torsion', '?_geom_torsion_site_symmetry_1', '?_geom_torsion_site_symmetry_2', '?_geom_torsion_site_symmetry_3', '?_geom_torsion_site_symmetry_4']))
        for r in t:
            try:
                ls = [r.str(i) for i in range(4)]
                v, su, dec = num_su(r[4])
                if v is None: continue
                cs = [r.str(5 + i) if r.has(5 + i) else '.' for i in range(4)]
                fs = [tgt(l, c) for l, c in zip(ls, cs)]
            except Exception:
                continue
            P = [M @ f for f in fs]
            mine = torsion_deg(*P)
            rec['items'].append({'k': 'tors', 'labels': ls, 'codes': cs, 'f': [f.tolist() for f in fs], 'pub': v, 'su': su, 'dec': dec, 'mine': mine})
        if rec['items']: res.append(rec)
json.dump(res, open('t1_requests.json', 'w'))
print(len(res), sum(len(r['items']) for r in res))
import collections
print(collections.Counter(i['k'] for r in res for i in r['items']))
