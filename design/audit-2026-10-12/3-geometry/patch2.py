s = open('ref_fw.py').read()
s = s.replace('''def load(path, block):
    """atoms''', '''def load_in(path):
    """FHI-aims geometry.in: lattice_vector and atom / atom_frac lines (my own reader). Cell from the vectors; fractional coordinates
    from the inverse of the vector matrix. A left-handed set of vectors gives the same metric, so distances and angles are unchanged."""
    V, at = [], []
    for ln in open(path, errors='replace'):
        t = ln.split('#')[0].split()
        if not t: continue
        if t[0] == 'lattice_vector': V.append([float(x) for x in t[1:4]])
        elif t[0] in ('atom', 'atom_frac'): at.append((t[0], [float(x) for x in t[1:4]], t[4]))
    V = np.array(V)
    L = [float(np.linalg.norm(v)) for v in V]
    ang = lambda u, v: math.degrees(math.acos(u @ v / np.linalg.norm(u) / np.linalg.norm(v)))
    cell = L + [ang(V[1], V[2]), ang(V[0], V[2]), ang(V[0], V[1])]
    Vi = np.linalg.inv(V)
    atoms = []; cnt = {}
    for kind, x, el in at:
        f = np.array(x) if kind == 'atom_frac' else np.array(x) @ Vi
        cnt[el] = cnt.get(el, 0) + 1
        atoms.append(dict(label=el + str(cnt[el]), el=el, f=f % 1.0, occ=1.0))
    return cell, atoms

def load(path, block):
    if path.endswith('.in'): return load_in(path)
    """atoms''')
open('ref_fw.py', 'w').write(s)
