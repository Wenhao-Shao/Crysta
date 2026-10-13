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


