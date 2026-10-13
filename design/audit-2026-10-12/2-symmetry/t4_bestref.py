"""Best reference for the occupancy-weighted cell contents (CIF convention), checked against _chemical_formula_sum x Z:
images of one site closer than TOL_SAME are one atom with the site occupancy (special position);
every other image is an atom with the site occupancy; atoms of different sites that coincide (< 0.15 A) add their
occupancies, capped at 1 (a duplicated atom is counted once). Compared with Crysta's counts for all CIF structures."""
import json, os, sys, collections
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, mic, read_doc
W = os.path.dirname(os.path.abspath(__file__))
TOL_SAME = float(sys.argv[1]) if len(sys.argv) > 1 else 0.05
cr = json.load(open(os.path.join(W, 't2_crysta.json')))
t4 = {(r['file'], r['block']): r for r in json.load(open(os.path.join(W, 't4_result.json')))}
tab = collections.Counter(); lst = []
for rec in cr:
    if rec['error']: continue
    doc, _ = read_doc(rec['file'])
    if doc is None: continue
    name = os.path.basename(rec['file'])
    for s in rec['structures']:
        r4 = t4.get((name, s['block']))
        if not r4: continue
        b = doc.find_block(s['block']); small = gemmi.make_small_structure_from_block(b)
        ops, how = block_ops(b, small)
        ref, near, M = expand(small, ops, TOL_SAME)
        # group coincident atoms of different sites, same element
        occ = collections.defaultdict(float)
        byel = collections.defaultdict(list)
        for a in ref: byel[a[1]].append(a)
        for el, L in byel.items():
            P = np.array([a[2] for a in L]); oc = np.array([a[3] for a in L])
            d = P[:, None, :] - P[None, :, :]; d -= np.round(d)
            dist = np.linalg.norm(d @ M, axis=2)
            done = np.zeros(len(L), bool)
            for i in range(len(L)):
                if done[i]: continue
                grp = np.where((dist[i] < 0.15) & ~done)[0]
                done[grp] = True
                occ[el] += min(1.0, oc[grp].sum())
        cc = s['counts']
        differs = any(abs(cc.get(e, 0) - occ.get(e, 0)) > 1e-3 for e in set(cc) | set(occ))
        if not r4['formula_cif'] or not r4['Z_file']:
            tab[('no CIF formula', 'crysta differs' if differs else 'same')] += 1; continue
        Z = round(r4['Z_file'])
        els = [e for e in set(occ) | set(cc) if not (e == 'H' and occ.get('H', 0) == 0)]
        okc = all(abs(cc.get(e, 0) - r4['formula_cif'].get(e, 0) * Z) <= 0.011 * Z for e in els)
        okr = all(abs(occ.get(e, 0) - r4['formula_cif'].get(e, 0) * Z) <= 0.011 * Z for e in els)
        tab[('crysta=CIF' if okc else 'crysta!=CIF', 'ref=CIF' if okr else 'ref!=CIF')] += 1
        if okr and not okc: lst.append((name, s['block'][:12], round((r4['rho_crysta'] / (sum(gemmi.Element(e).weight * v for e, v in occ.items()) / (6.02214076e23 * small.cell.volume * 1e-24)) - 1) * 100, 2)))
        if okc and not okr: print('crysta right, ref wrong:', name, s['block'])
for k, v in sorted(tab.items()): print(k, v)
print(len(lst), 'structures: reference matches the CIF formula, Crysta does not. Density error % (Crysta vs reference):')
print(sorted(lst, key=lambda x: x[2]))
json.dump(lst, open(os.path.join(W, 't4_bestref_list.json'), 'w'))
