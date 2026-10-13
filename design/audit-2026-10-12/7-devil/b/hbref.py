"""Independent periodic N-H/O-H...A search (README criteria), gemmi expansion + numpy.
usage: python3 -I hbref.py file.cif [blockname]
Donor: H within 1.15 A of N or O (own cutoff). Acceptor: any halide (F, Cl, Br, I), plus O/N not in the donor's
molecule (molecule = covalent C/H/N/O/S component, own cutoffs). H...A <= Bondi(H)+Bondi(A)-0.15, D-H...A > 120.
Prints distinct contacts by labels and D...A to 2 decimals."""
import sys, json
import numpy as np
import gemmi

BONDI = {'H': 1.20, 'N': 1.55, 'O': 1.52, 'F': 1.47, 'S': 1.80, 'Cl': 1.75, 'Br': 1.85, 'I': 1.98}
COV = {'H': 0.31, 'C': 0.76, 'N': 0.71, 'O': 0.66, 'S': 1.05, 'F': 0.57, 'Cl': 1.02, 'Br': 1.20, 'I': 1.39, 'P': 1.07, 'B': 0.84, 'Si': 1.11}
HAL = {'F', 'Cl', 'Br', 'I'}


def sites_of(path, block=None):
    if path.endswith('.in'):
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from xread import read
        V, S = read(path)
        class Cell:  # orthogonalisation matrix with columns a, b, c
            pass
        c = Cell(); c.M = V.T
        return c, S
    doc = gemmi.cif.read(path)
    if block:
        b = doc.find_block(block)
    else:
        b = [x for x in doc if x.find_value('_cell_length_a') is not None][0]
    st = gemmi.make_small_structure_from_block(b)
    out = []
    for s in st.get_all_unit_cell_sites():
        if s.occ < 0.5:   # keep the major component only (these files are ordered or have occ>=0.5 major)
            continue
        out.append((s.label, s.element.name, np.array([s.fract.x, s.fract.y, s.fract.z]) % 1.0))
    return st.cell, out


def main():
    path = sys.argv[1]
    block = sys.argv[2] if len(sys.argv) > 2 else None
    cell, S = sites_of(path, block)
    M = cell.M if hasattr(cell, 'M') else np.array(cell.orth.mat.tolist())
    F = np.array([s[2] for s in S])
    els = [s[1] for s in S]
    labs = [s[0] for s in S]
    n = len(S)
    shifts = np.array([[i, j, k] for i in (-1, 0, 1) for j in (-1, 0, 1) for k in (-1, 0, 1)])

    def nearest(i, j, cut):
        """all images of j within cut of i: list of (dist, cart vector i->j)"""
        d = (F[j] - F[i])[None, :] + shifts
        v = d @ M.T
        r = np.linalg.norm(v, axis=1)
        return [(r[k], v[k]) for k in range(len(r)) if 1e-6 < r[k] < cut]

    # covalent components of non-metals (to know which O/N belong to the donor's molecule)
    nonmetal = [e in COV for e in els]
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    cart = F @ M.T
    for i in range(n):
        if not nonmetal[i] or els[i] in HAL:
            continue
        for j in range(i + 1, n):
            if not nonmetal[j] or els[j] in HAL:
                continue
            cut = COV[els[i]] + COV[els[j]] + 0.4
            if nearest(i, j, cut):
                parent[find(i)] = find(j)
    rows = {}
    for h in range(n):
        if els[h] != 'H':
            continue
        don = None
        for dd in range(n):
            if els[dd] in ('N', 'O'):
                nn = nearest(h, dd, 1.15)
                if nn:
                    don = (dd, nn[0][1])  # vector H->D
        if don is None:
            continue
        dI, vHD = don
        for a in range(n):
            ea = els[a]
            if ea not in BONDI or ea == 'H':
                continue
            if ea in ('N', 'O', 'S') and find(a) == find(dI) and ea not in HAL:
                # same molecule: skip only when it is truly the same molecular copy; approximate: skip all
                continue
            if ea == 'S':
                continue
            lim = BONDI['H'] + BONDI[ea] - 0.15
            for r, vHA in nearest(h, a, lim):
                cosang = np.dot(vHD, vHA) / (np.linalg.norm(vHD) * np.linalg.norm(vHA))
                ang = np.degrees(np.arccos(np.clip(cosang, -1, 1)))
                if ang <= 120:
                    continue
                dDA = np.linalg.norm(vHA - vHD)
                key = (labs[dI], labs[h], labs[a], round(dDA, 2))
                rows[key] = (round(r, 3), round(dDA, 3), round(ang, 1))
    out = sorted([list(k[:3]) + list(v) for k, v in rows.items()], key=lambda x: x[4])
    print(json.dumps({'n': len(out), 'rows': out}))


main()
