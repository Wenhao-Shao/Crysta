"""Task 2: random test cases for the Measure functions in triclinic, monoclinic and orthogonal cells."""
import numpy as np, json, math
rng = np.random.default_rng(20261013)
cases = []
def rand_cell(kind):
    a, b, c = rng.uniform(4, 25, 3)
    if kind == 'tric':
        while True:
            al, be, ga = rng.uniform(60, 120, 3)
            ca, cb, cg = np.cos(np.radians([al, be, ga]))
            if 1 - ca*ca - cb*cb - cg*cg + 2*ca*cb*cg > 0.05: break
    elif kind == 'mono': al, be, ga = 90, rng.uniform(91, 125), 90
    elif kind == 'hex': a = b; al, be, ga = 90, 90, 120
    else: al, be, ga = 90, 90, 90
    return [float(x) for x in (a, b, c, al, be, ga)]
for k in range(600):
    kind = ['tric', 'mono', 'orth', 'hex'][k % 4]
    cell = rand_cell(kind)
    npl = int(rng.integers(3, 9))
    # points for a plane: near a random lattice-like plane, with noise
    base = rng.uniform(0, 1, 3)
    u, v = rng.normal(size=3), rng.normal(size=3)
    P = [base + rng.uniform(-0.4, 0.4) * u / np.linalg.norm(u) * 0.5 + rng.uniform(-0.4, 0.4) * v / np.linalg.norm(v) * 0.5 + rng.normal(scale=0.01, size=3) for _ in range(npl)]
    Q = [rng.uniform(-0.5, 1.5, 3) for _ in range(4)]
    hkl = [int(x) for x in rng.integers(-4, 5, 3)]
    if not any(hkl): hkl = [1, 0, 0]
    cases.append(dict(kind=kind, cell=cell, plane_pts=[p.tolist() for p in P], q=[x.tolist() for x in Q], hkl=hkl))
# special cases: a bond along the normal (angle in plane undefined), near-degenerate planes, a normal exactly on a lattice plane
json.dump(cases, open('t2_cases.json', 'w'))
print(len(cases))
