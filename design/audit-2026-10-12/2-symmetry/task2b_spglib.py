"""Task 2b: spglib on Crysta's unit cell (all parts, and the shown component) against the space group of the file."""
import json, os, sys, collections
import numpy as np, gemmi, spglib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, read_doc
W = os.path.dirname(os.path.abspath(__file__))
cr = json.load(open(os.path.join(W, 't2_crysta.json')))
def lattice(c):
    return np.array(gemmi.UnitCell(c['a'], c['b'], c['c'], c['al'], c['be'], c['ga']).orth.mat.tolist()).T
def prim_order(ops):
    # number of operators per primitive cell = all ops / centring translations
    g = gemmi.GroupOps(ops) if not isinstance(ops, gemmi.GroupOps) else ops
    return len(g.sym_ops)
def group_of(ops):
    D = gemmi.Op.DEN
    ident = [[D,0,0],[0,D,0],[0,0,D]]
    cen = []; seenR = {}
    for op in ops:
        if op.rot == ident: cen.append([t % D for t in op.tran])
    for op in ops:
        k = str(op.rot)
        if k not in seenR: seenR[k] = op
    g = gemmi.GroupOps(list(seenR.values()))
    g.cen_ops = cen
    return g
out = []; stats = collections.Counter()
for rec in cr:
    if rec['error']: continue
    doc, _ = read_doc(rec['file'])
    if doc is None: continue
    for s in rec['structures']:
        if 'atomsAll' not in s: continue
        b = doc.find_block(s['block']); small = gemmi.make_small_structure_from_block(b)
        ops, how = block_ops(b, small)
        try:
            go = group_of(ops)
            fsg = gemmi.find_spacegroup_by_ops(go)
        except Exception as e:
            go = None; fsg = None
        fnum = fsg.number if fsg else None
        L = lattice(s['cell'])
        row = {'file': os.path.basename(rec['file']), 'block': s['block'], 'file_sg': fsg.xhm() if fsg else None, 'file_num': fnum,
               'file_order': len(go.sym_ops) if go else None}
        for kind in ('atomsAll', 'atomsShown'):
            at = s[kind]
            els = sorted(set(a[0] for a in at)); types = [els.index(a[0]) + 1 for a in at]
            pos = np.array([a[1] for a in at])
            res = {}
            for prec in (0.01, 0.05):
                try:
                    ds = spglib.get_symmetry_dataset((L, pos, types), symprec=prec)
                except Exception as e:
                    ds = None
                if ds is None: res[prec] = None; continue
                nprim = len(ds.rotations) / max(1, round(abs(np.linalg.det(ds.transformation_matrix)) * 0 + 1))
                # operators per primitive cell: rotations of the input cell divided by its number of pure translations
                ntr = sum(1 for R in ds.rotations if np.array_equal(R, np.eye(3, dtype=int)))
                res[prec] = (ds.number, ds.international, len(ds.rotations) // ntr)
            row[kind] = res
        out.append(row)
        a = row['atomsAll'][0.01]; sh = row['atomsShown'][0.01]
        if a is None: stats['all: spglib failed'] += 1
        elif fnum is None: stats['file sg unknown'] += 1
        elif a[0] == fnum: stats['all: same'] += 1
        else: stats['all: %s' % ('higher' if a[2] > row['file_order'] else ('lower' if a[2] < row['file_order'] else 'same order, other number'))] += 1
        if sh is not None and fnum is not None:
            stats['shown: %s' % ('same' if sh[0] == fnum else ('higher' if sh[2] > row['file_order'] else 'lower'))] += 1
json.dump(out, open(os.path.join(W, 't2b_result.json'), 'w'), indent=0, default=str)
print(dict(stats))
for r in out:
    a = r['atomsAll'][0.01]
    if a is None or r['file_num'] is None or a[0] != r['file_num']:
        print(r['file'], r['block'][:16], 'file', r['file_sg'], r['file_num'], r['file_order'], '| all', r['atomsAll'], '| shown', r['atomsShown'][0.01])
