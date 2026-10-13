"""For the geometry.in files where Crysta's counts differ from the raw atom list: closest same-element non-H pair."""
import sys, numpy as np, collections
D = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/'
for fn in sys.argv[1:]:
    vec = []; at = []
    for ln in open(D + fn, errors='replace'):
        t = ln.split('#')[0].split()
        if not t: continue
        if t[0] == 'lattice_vector': vec.append([float(x) for x in t[1:4]])
        elif t[0] in ('atom', 'atom_frac'): at.append((t[0], np.array([float(x) for x in t[1:4]]), t[4]))
    L = np.array(vec); Li = np.linalg.inv(L)
    fr = [(a[2], a[1] if a[0] == 'atom_frac' else a[1] @ Li) for a in at]
    cl = collections.Counter(); dmin = 9
    for i in range(len(fr)):
        for j in range(i + 1, len(fr)):
            if fr[i][0] != fr[j][0] or fr[i][0] in ('H', 'D'): continue
            d = fr[i][1] - fr[j][1]; d -= np.round(d); r = np.linalg.norm(d @ L)
            dmin = min(dmin, r)
            if r < 0.9: cl[fr[i][0]] += 1
    print(fn, 'non-H same-element pairs closer than 0.9 A:', dict(cl), 'closest %.3f A' % dmin)
