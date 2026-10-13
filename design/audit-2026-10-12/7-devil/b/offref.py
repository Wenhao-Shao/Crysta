"""Independent stacking offset: for every metal of one layer, the in-plane shift to the NEAREST metal (in projection)
of the next layer, in units of the two shortest non-parallel in-plane M...M vectors of that metal (same layer,
M...M < 7.5 A, |component along normal| < 1.5 A), folded to 0..1/2, larger first.
usage: python3 -I offref.py file h k l [metal] [block]
Reads CIF (gemmi) or geometry.in (own reader: lattice_vector / atom / atom_frac)."""
import sys, json
import numpy as np


def read(path, block=None):
    if path.endswith('.in'):
        vec, at = [], []
        for ln in open(path):
            t = ln.split('#')[0].split()
            if not t:
                continue
            if t[0] == 'lattice_vector':
                vec.append([float(x) for x in t[1:4]])
            elif t[0] in ('atom', 'atom_frac'):
                at.append((t[0], [float(x) for x in t[1:4]], t[4]))
        V = np.array(vec)
        out = []
        cnt = {}
        for k, v, el in at:
            cnt[el] = cnt.get(el, 0) + 1
            f = np.array(v) if k == 'atom_frac' else np.linalg.solve(V.T, np.array(v))
            out.append((el + str(cnt[el]), el, f % 1.0))
        return V, out
    import gemmi
    doc = gemmi.cif.read(path)
    b = doc.find_block(block) if block else [x for x in doc if x.find_value('_cell_length_a') is not None][0]
    st = gemmi.make_small_structure_from_block(b)
    M = np.array(st.cell.orth.mat.tolist())
    out = [(s.label, s.element.name, np.array([s.fract.x, s.fract.y, s.fract.z]) % 1.0) for s in st.get_all_unit_cell_sites() if s.occ >= 0.5]
    return M.T, out   # rows = a, b, c vectors


def main():
    path = sys.argv[1]
    hkl = np.array([int(x) for x in sys.argv[2:5]])
    metal = sys.argv[5] if len(sys.argv) > 5 else 'Pb'
    block = sys.argv[6] if len(sys.argv) > 6 else None
    V, S = read(path, block)          # V rows: a, b, c (Cartesian)
    rec = np.linalg.inv(V).T          # rows: a*, b*, c*
    G = hkl @ rec
    dhkl = 1 / np.linalg.norm(G)
    nrm = G / np.linalg.norm(G)
    Ms = [(lab, f) for lab, el, f in S if el == metal]
    R = range(-2, 3)
    shifts = np.array([[i, j, k] for i in R for j in R for k in R])
    # all metal images within a generous block
    imgs = []
    for lab, f in Ms:
        for s in shifts:
            c = (f + s) @ V
            imgs.append((lab, c, c @ nrm))
    hs = np.array([x[2] for x in imgs])
    # layers: cluster heights with gaps > 3 A
    order = np.sort(np.unique(np.round(hs, 3)))
    layers = []
    for h in order:
        if layers and h - layers[-1][-1] < 3.0:
            layers[-1].append(h)
        else:
            layers.append([h])
    centres = [np.mean(l) for l in layers]
    res = []
    for lab, f in Ms:
        c0 = f @ V
        h0 = c0 @ nrm
        # my layer
        li = int(np.argmin([abs(h0 - np.mean(l)) if min(l) - 0.01 <= h0 <= max(l) + 0.01 else 1e9 for l in layers]))
        cen = centres[li]
        nxt = centres[li + 1] if li + 1 < len(centres) else None
        if nxt is None:
            continue
        same = [x for x in imgs if abs(x[2] - h0) < 1.5 and 0.5 < np.linalg.norm(x[1] - c0) < 7.5]
        vs = sorted([x[1] - c0 for x in same], key=np.linalg.norm)
        vs = [v - (v @ nrm) * nrm for v in vs]
        if not vs:
            continue
        p1 = vs[0]
        p2 = next((v for v in vs if np.linalg.norm(np.cross(p1, v)) > 0.3 * np.linalg.norm(p1) * np.linalg.norm(v)), None)
        if p2 is None:
            continue
        up = [x for x in imgs if abs(x[2] - nxt) < 3.0 and min(layers[li + 1]) - 0.01 <= x[2] <= max(layers[li + 1]) + 0.01]
        best = min(up, key=lambda x: np.linalg.norm((x[1] - c0) - ((x[1] - c0) @ nrm) * nrm))
        d = (best[1] - c0) - ((best[1] - c0) @ nrm) * nrm
        A = np.array([p1, p2, nrm]).T
        s1, s2, _ = np.linalg.solve(A, d)
        s1, s2 = abs(s1 - round(s1)), abs(s2 - round(s2))
        res.append({'M0': lab, 'h0': round(h0, 3), 'layer_centre': round(cen, 3), 'next': best[0], 'dproj': round(float(np.linalg.norm(d)), 3),
                    'p1': round(float(np.linalg.norm(p1)), 3), 'p2': round(float(np.linalg.norm(p2)), 3), 's': [round(max(s1, s2), 3), round(min(s1, s2), 3)]})
    print(json.dumps({'dhkl': dhkl, 'layer_centres': [round(c, 3) for c in centres[:8]], 'res': res}, indent=0))


main()
