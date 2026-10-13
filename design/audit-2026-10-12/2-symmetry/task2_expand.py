"""Task 2: Crysta's buildCell against gemmi expansion for all CIFs (HybriD3 + examples)."""
import json, os, sys, collections
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, mic, read_doc
W = os.path.dirname(os.path.abspath(__file__))
cr = json.load(open(os.path.join(W, 't2_crysta.json')))
rows = []
for rec in cr:
    fp = rec['file']; name = os.path.basename(fp)
    if rec['error']:
        rows.append({'file': name, 'crysta_error': rec['error']}); continue
    doc, note = read_doc(fp)
    if doc is None:
        rows.append({'file': name, 'gemmi_error': note}); continue
    gblocks = {b.name: b for b in doc}
    for s in rec['structures']:
        row = {'file': name, 'block': s['block'], 'symSource': s['meta']['symSource'], 'nops_crysta': s['nops']}
        rows.append(row)
        if s.get('error'): row['crysta_error'] = s['error'][:200]; continue
        b = gblocks.get(s['block'])
        if b is None: row['issue'] = 'block not found by gemmi'; continue
        small = gemmi.make_small_structure_from_block(b)
        ops, how = block_ops(b, small)
        row['nops_ref'] = len(ops); row['ops_how'] = how
        row['gemmi_get_all'] = len(small.get_all_unit_cell_sites()) if small.spacegroup or small.symops else None
        ref, near, M = expand(small, ops, 0.15)
        row['near_images'] = near[:20]; row['n_near'] = len(near)
        row['n_sites_ref'] = len(small.sites); row['n_sites_crysta'] = s['nsites']
        # per-element number of positions (all parts)
        cnt_ref = collections.Counter(a[1] for a in ref)
        cnt_cr = collections.Counter(a[0] for a in s['atomsAll'])
        row['count_diff'] = {e: [cnt_cr.get(e, 0), cnt_ref.get(e, 0)] for e in set(cnt_ref) | set(cnt_cr) if cnt_cr.get(e, 0) != cnt_ref.get(e, 0)}
        # occupancy-weighted counts: reference sums occ over all distinct positions (tol 0.15 A, the CIF convention)
        occ_ref = collections.defaultdict(float)
        for a in ref: occ_ref[a[1]] += a[3]
        occ_cr = s['counts']
        row['occ_diff'] = {e: [round(occ_cr.get(e, 0), 4), round(occ_ref.get(e, 0), 4)] for e in set(occ_ref) | set(occ_cr) if abs(occ_cr.get(e, 0) - occ_ref.get(e, 0)) > 1e-3}
        # positions: each reference atom must have a Crysta atom of the same element and label within 0.002 A
        cfr = collections.defaultdict(list)
        for a in s['atomsAll']: cfr[(a[0], a[3])].append(np.array(a[1]))
        unmatched = []; maxd = 0.0
        for a in ref:
            cands = cfr.get((a[1], a[4]), [])
            d = min([mic(M, a[2] - g) for g in cands], default=99)
            if d > 0.002: unmatched.append((a[4], round(d, 3)))
            else: maxd = max(maxd, d)
        row['ref_unmatched'] = unmatched[:10]; row['n_ref_unmatched'] = len(unmatched); row['pos_maxd'] = maxd
        # reverse
        rfr = collections.defaultdict(list)
        for a in ref: rfr[(a[1], a[4])].append(a[2])
        un2 = []
        for a in s['atomsAll']:
            d = min([mic(M, np.array(a[1]) - g) for g in rfr.get((a[0], a[3]), [])], default=99)
            if d > 0.002: un2.append((a[3], round(d, 3)))
        row['crysta_unmatched'] = un2[:10]; row['n_crysta_unmatched'] = len(un2)
        row['autoSplit'] = s['autoSplit']
json.dump(rows, open(os.path.join(W, 't2_result.json'), 'w'), indent=0, default=str)
n = len(rows)
bad = [r for r in rows if r.get('count_diff') or r.get('n_ref_unmatched') or r.get('n_crysta_unmatched') or r.get('crysta_error') or r.get('issue')]
occbad = [r for r in rows if r.get('occ_diff')]
print('structures', n, 'with position/count differences', len(bad), 'with occupancy-weighted count differences', len(occbad))
print('ops count mismatch', sum(1 for r in rows if r.get('nops_ref') and r['nops_ref'] != r['nops_crysta']))
print('symSource', collections.Counter(r.get('symSource') for r in rows), collections.Counter(r.get('ops_how') for r in rows))
print('max pos diff', max(r.get('pos_maxd', 0) for r in rows))
print('structures with images of one site 0.005-0.9 A apart:', sum(1 for r in rows if r.get('n_near')))
