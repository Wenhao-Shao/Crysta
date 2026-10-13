# Own reader of FHI-aims geometry.in (from the FHI-aims manual: lattice_vector x y z; atom x y z species (Angstrom);
# atom_frac u v w species; '#' starts a comment), and the comparison with Crysta.
import sys, json, numpy as np, math
c = json.load(open(sys.argv[1]))
files = [l for l in open(sys.argv[2]).read().split('\n') if l]
nfail = 0; maxf = 0; maxc = 0; nat = 0; kinds = {}
for f in files:
    name = f.split('/')[-1]
    vec, atoms = [], []
    for ln in open(f, encoding='utf-8', errors='replace'):
        ln = ln.split('#')[0].split()
        if not ln: continue
        k = ln[0]
        kinds[k] = kinds.get(k, 0) + 1
        if k == 'lattice_vector': vec.append([float(x) for x in ln[1:4]])
        elif k in ('atom', 'atom_frac'): atoms.append((k, [float(x) for x in ln[1:4]], ln[4]))
    L = np.array(vec)
    cr = c[name]
    if 'error' in cr:
        print('crysta error', name, cr['error']); nfail += 1; continue
    a, b, cc = (np.linalg.norm(v) for v in L)
    ang = lambda u, v: math.degrees(math.acos(np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v)))
    cp = [a, b, cc, ang(L[1], L[2]), ang(L[0], L[2]), ang(L[0], L[1])]
    maxc = max(maxc, max(abs(x - y) for x, y in zip(cp, cr['cell'])))
    if len(atoms) != len(cr['sites']):
        print('count', name, len(atoms), len(cr['sites']), cr['skipped']); nfail += 1; continue
    inv = np.linalg.inv(L)
    for (k, v, sp), s in zip(atoms, cr['sites']):
        fr = np.array(v) if k == 'atom_frac' else np.array(v) @ inv
        maxf = max(maxf, float(np.max(np.abs(fr - np.array(s[2])))))
        if sp != s[1]:
            print('element', name, sp, s[1]); nfail += 1
        nat += 1
print('files', len(files), 'atoms', nat, 'problems', nfail, 'max cell diff', maxc, 'max frac diff', maxf)
print('keywords seen', kinds)
