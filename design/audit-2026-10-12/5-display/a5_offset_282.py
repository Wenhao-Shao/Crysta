# Independent check of the stacking offset of HybriD3 282_1.in (Ag-Bi double perovskite layers):
# shift from a metal of one layer to the NEAREST metal (seen along the normal) of the next layer, in units of the
# two shortest non-parallel in-plane M...M vectors (via a bridging halide), each reduced to 0..1/2.
import sys, itertools, numpy as np
path = sys.argv[1]
lat = []; atoms = []
for line in open(path):
    t = line.split()
    if not t: continue
    if t[0] == 'lattice_vector': lat.append([float(x) for x in t[1:4]])
    elif t[0] in ('atom', 'atom_frac'): atoms.append((t[0], np.array([float(x) for x in t[1:4]]), t[4]))
A = np.array(lat)
cart = lambda f: f @ A
pos = []; el = []
for kind, v, e in atoms:
    pos.append(cart(v) if kind == 'atom_frac' else v); el.append(e)
pos = np.array(pos); el = np.array(el)
frac = pos @ np.linalg.inv(A)
B = np.linalg.inv(A).T          # rows: reciprocal vectors a*, b*, c*
n = B[0] / np.linalg.norm(B[0]) # layer plane (1 0 0)
d100 = 1 / np.linalg.norm(B[0])
metal = np.isin(el, ['Ag', 'Bi', 'Pb', 'Sn', 'Ge', 'Cu', 'Mn', 'Cd'])
hal = np.isin(el, ['I', 'Br', 'Cl'])
mi = np.where(metal)[0]; hi = np.where(hal)[0]
h = pos @ n
# copies of every atom in a 3x3x3 block
T = np.array(list(itertools.product([-1, 0, 1], repeat=3)))
def copies(i):
    return pos[i] + T @ A
# M...M vectors through a bridging halide from metal m: m -> X (< 3.6 A) -> other metal (< 3.6 A)
def mm_vectors(m):
    out = []
    for x in hi:
        for px in copies(x):
            if np.linalg.norm(px - pos[m]) > 3.6: continue
            for m2 in mi:
                for pm in copies(m2):
                    if np.linalg.norm(pm - pos[m]) < 0.1 or np.linalg.norm(pm - px) > 3.6: continue
                    v = pm - pos[m]
                    if abs(v @ n) / np.linalg.norm(v) < 0.5: out.append(v - (v @ n) * n)
    out.sort(key=lambda v: np.linalg.norm(v))
    p1 = out[0]
    p2 = next(v for v in out if np.linalg.norm(np.cross(p1, v)) > 0.3 * np.linalg.norm(p1) * np.linalg.norm(v))
    return p1, p2
res = []
for m0 in mi:
    p1, p2 = mm_vectors(m0)
    # the next layer up: metals whose height is 10..20 A above (one layer spacing)
    best = None
    for m1 in mi:
        for k in range(-2, 3):
            for pm in pos[m1] + (np.array(list(itertools.product(range(-2, 3), repeat=3))) @ A):
                dh = (pm - pos[m0]) @ n
                if not (float(sys.argv[2]) < dh < float(sys.argv[3])): continue
                s = (pm - pos[m0]) - dh * n
                if best is None or np.linalg.norm(s) < np.linalg.norm(best[0]) - 1e-9: best = (s, el[m1], dh)
            break
    s, e1, dh = best
    G = np.array([[p1 @ p1, p1 @ p2], [p1 @ p2, p2 @ p2]])
    a, b = np.linalg.solve(G, [s @ p1, s @ p2])
    fr = sorted([abs(a - round(a)), abs(b - round(b))], reverse=True)
    res.append((el[m0], round(float(h[m0] % d100), 2), e1, round(float(dh), 3), round(float(np.linalg.norm(s)), 3), [round(float(x), 3) for x in fr], round(float(np.linalg.norm(p1)), 3), round(float(np.linalg.norm(p2)), 3)))
for r in res: print(r)
