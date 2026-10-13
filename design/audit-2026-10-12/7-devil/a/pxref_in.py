# Own powder pattern of an FHI-aims geometry.in (P1, B = 1 A^2, Cu Ka1 with gemmi Cromer-Liberman f', f'').
# mode 'full': every atom occupancy 1 (as the file says); mode 'half': same-element non-H atoms closer than 0.9 A get 0.5 each
import sys, math, json, itertools, numpy as np, gemmi
path, mode, t0, t1 = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
lam = 1.54059
vec, at = [], []
for ln in open(path):
    t = ln.split('#')[0].split()
    if not t: continue
    if t[0] == 'lattice_vector': vec.append([float(x) for x in t[1:4]])
    elif t[0] in ('atom', 'atom_frac'): at.append((t[0], [float(x) for x in t[1:4]], t[4]))
L = np.array(vec)                      # rows = a, b, c
Linv = np.linalg.inv(L)
fr = [np.array(v) if k == 'atom_frac' else np.array(v) @ Linv for k, v, e in at]
els = [gemmi.Element(e) for k, v, e in at]
occ = np.ones(len(at))
if mode == 'half':
    for i in range(len(at)):
        for j in range(i + 1, len(at)):
            if els[i].name != els[j].name or els[i].name == 'H': continue
            d = fr[i] - fr[j]; d -= np.round(d)
            if np.linalg.norm(d @ L) < 0.9: occ[i] = occ[j] = 0.5
fx = np.array(fr) % 1.0
E = gemmi.hc / lam
fp = np.array([gemmi.cromer_liberman(e.atomic_number, E)[0] for e in els]); fpp = np.array([gemmi.cromer_liberman(e.atomic_number, E)[1] for e in els])
G = np.linalg.inv(L).T                 # reciprocal vectors as rows
dmin = lam / (2 * math.sin(math.radians(t1) / 2))
hm = [int(math.ceil(np.linalg.norm(L[i]) / dmin)) + 1 for i in range(3)]
seen = set(); out = []
for h in itertools.product(*[range(-m, m + 1) for m in hm]):
    if h == (0, 0, 0) or h in seen: continue
    g = np.linalg.norm(np.array(h) @ G)
    if g == 0 or g * lam / 2 >= 1: continue
    tth = 2 * math.degrees(math.asin(g * lam / 2))
    if tth < t0 or tth > t1: continue
    seen.add(h); seen.add(tuple(-x for x in h))
    s2 = g * g / 4
    f0 = np.array([e.it92.calculate_sf(s2) for e in els])
    amp = occ * (f0 + fp + 1j * fpp) * math.exp(-1.0 * s2)
    ph = 2 * math.pi * (fx @ np.array(h))
    F1 = np.sum(amp * np.exp(1j * ph)); F2 = np.sum(amp * np.exp(-1j * ph))
    th = math.radians(tth / 2); lp = (1 + math.cos(2 * th) ** 2) / (math.sin(th) ** 2 * math.cos(th))
    out.append((round(tth, 3), 2 * (abs(F1) ** 2 + abs(F2) ** 2) / 2 * lp))
from collections import defaultdict
g = defaultdict(float)
for t, I in out: g[t] += I
mx = max(g.values())
json.dump({str(k): 100 * v / mx for k, v in sorted(g.items())}, sys.stdout)
