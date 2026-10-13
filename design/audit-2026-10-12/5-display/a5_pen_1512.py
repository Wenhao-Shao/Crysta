# Independent check of N penetration in HybriD3 1512_1.cif: depth of each ammonium N below the mean plane of the
# terminal halides of the nearest layer face, along the layer normal; + = inside the layer (on the metal side).
import sys, itertools, numpy as np, gemmi
doc = gemmi.cif.read(sys.argv[1])
blk = [b for b in doc if b.find_values('_atom_site_label')][0]
st = gemmi.make_small_structure_from_block(blk)
cell = st.cell
A = np.array(cell.orth.mat.tolist()).T   # rows: a, b, c in Cartesian
sites = st.get_all_unit_cell_sites()
pos = np.array([cell.orthogonalize(s.fract).tolist() for s in sites]); el = np.array([s.type_symbol for s in sites]); lab = [s.label for s in sites]
hkl = [int(x) for x in sys.argv[2].split(',')]
Bm = np.linalg.inv(A).T; G = hkl[0]*Bm[0] + hkl[1]*Bm[1] + hkl[2]*Bm[2]; n = G/np.linalg.norm(G); d = 1/np.linalg.norm(G)
T = np.array(list(itertools.product([-1,0,1], repeat=3))) @ A
M = np.where(np.isin(el, ['Pb','Sn','Bi','Ag','Cu','Mn','Cd','Ge']))[0]
X = np.where(np.isin(el, ['I','Br','Cl']))[0]
# terminal halides: one metal within 3.6 A (all copies)
def nmet(x):
    return sum(1 for m in M for t in T if np.linalg.norm(pos[m]+t-pos[x]) < 3.6)
term = [x for x in X if nmet(x) == 1]
# each terminal halide with its metal: top face if above its metal by > 1 A along n, bottom face if below
faces = []
for x in term:
    for m in M:
        for t in T:
            v = pos[x] - (pos[m]+t)
            if np.linalg.norm(v) < 3.6:
                hm = (pos[m]+t) @ n; hx = pos[x] @ n
                faces.append((hx, 'top' if hx > hm + 1 else 'bot' if hx < hm - 1 else 'eq', hm))
# group face heights mod d into planes (gap > 1.5 A)
pl = {}
for hx, side, hm in faces:
    if side == 'eq': continue
    key = None
    for k in pl:
        if k[1] == side and abs(((hx - k[0] + d/2) % d) - d/2) < 1.5: key = k; break
    if key is None: key = (hx, side); pl[key] = []
    pl[key].append(hx - round((hx - key[0]) / d) * d)
planes = [(np.mean(v), k[1], len(v)) for k, v in pl.items()]
print('d', round(d, 3), 'face planes (height mod d, side, n):', [(round(p[0] % d, 3), p[1], p[2]) for p in planes])
# N atoms with their label: nearest face plane (any copy), signed depth
for i in np.where(el == 'N')[0]:
    hN = pos[i] @ n
    best = None
    for h, side, cnt in planes:
        for k in range(-3, 4):
            H = h + k*d
            dep = (H - hN) if side == 'top' else (hN - H)
            if best is None or abs(dep) < abs(best[0]): best = (dep, side)
    if abs(best[0]) < 3: print(lab[i], round(float(best[0]), 3), best[1])
