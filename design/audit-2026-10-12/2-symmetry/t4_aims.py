"""FHI-aims geometry.in files (no symmetry): Crysta's cell contents, volume and density against own counts (numpy, gemmi weights)."""
import glob, json, os, subprocess, collections
import numpy as np, gemmi
W = os.path.dirname(os.path.abspath(__file__))
fs = sorted(glob.glob('/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/*.in'))
json.dump(fs, open(os.path.join(W, 't4a_files.json'), 'w'))
subprocess.run(['node', os.path.join(W, 'dump_cells.js'), os.path.join(W, 't4a_files.json'), os.path.join(W, 't4a_out.json')], check=True)
cr = {r['file']: r for r in json.load(open(os.path.join(W, 't4a_out.json')))}
bad = []; n = 0; maxdr = 0; maxdv = 0
for f in fs:
    vec = []; cnt = collections.Counter()
    for ln in open(f, errors='replace'):
        t = ln.split('#')[0].split()
        if not t: continue
        if t[0] == 'lattice_vector': vec.append([float(x) for x in t[1:4]])
        elif t[0] in ('atom', 'atom_frac'): cnt[t[4]] += 1
    rec = cr[f]
    if rec['error'] or len(vec) != 3: bad.append((os.path.basename(f), 'error/no lattice', rec['error'])); continue
    s = rec['structures'][0]; n += 1
    V = abs(np.linalg.det(np.array(vec)))
    mass = sum(gemmi.Element(e).weight * k for e, k in cnt.items())
    rho = mass / (6.02214076e23 * V * 1e-24)
    dv = abs(s['cell']['V'] - V); maxdv = max(maxdv, dv)
    dr = abs(s['info']['density'] - rho); maxdr = max(maxdr, dr)
    cc = {e: round(v, 6) for e, v in s['counts'].items()}
    if cc != dict(cnt) or dr > 5e-4: bad.append((os.path.basename(f), cc, dict(cnt), round(s['info']['density'], 4), round(rho, 4)))
print('geometry.in files compared', n, '; max |dV| %.2e A3; max |d rho| %.2e' % (maxdv, maxdr), '; differences', len(bad))
for b in bad[:10]: print(b)
