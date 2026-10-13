"""Check the measures made by clicks in the page against my numpy, from the fractional coordinates of the clicked atoms and gemmi's cell."""
import json, sys, os, math, numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geomlib import orth_matrix, torsion_deg, cell_of
r = json.load(open(sys.argv[1])); cif = sys.argv[2]
b = [x for x in gemmi.cif.read(cif) if x.find_values('_atom_site_fract_x')][0]
M = orth_matrix(*cell_of(b)); Mrec = np.linalg.inv(M)
A = r['atoms']
def frac_of(p):
    best = min(A, key=lambda a: np.linalg.norm(np.array(a['xyz']) - p))
    assert np.linalg.norm(np.array(best['xyz']) - p) < 1e-6
    return best['label'], np.array(best['f'])
ang = lambda u, v: math.degrees(math.acos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1)))
planes = {}
for q in r['planes']:
    if q['kind'] == 'hkl':
        G = np.array(q['hkl']) @ Mrec; n = G / np.linalg.norm(G); c = M @ frac_of(np.array(q['pts'][0]))[1]
    else:
        P = np.array([M @ frac_of(np.array(x))[1] for x in q['pts']]); c = P.mean(0)
        w, V = np.linalg.eigh((P - c).T @ (P - c)); n = V[:, 0]
        ref = sum(np.cross(P[k] - c, P[(k + 1) % len(P)] - c) for k in range(len(P)))
        if ref @ n < 0: n = -n
        rms = math.sqrt(np.mean(((P - c) @ n) ** 2))
        print('plane %s rms crysta %.6f mine %.6f' % (q['id'], q['rms'], rms))
        # nearest hkl, brute force
        best = None; by = {}
        for h in range(-6, 7):
            for k in range(-6, 7):
                for l in range(-6, 7):
                    if (h, k, l) == (0, 0, 0) or math.gcd(math.gcd(abs(h), abs(k)), abs(l)) != 1: continue
                    G = np.array([h, k, l]) @ Mrec; a = ang(G, n)
                    if a > 90: continue
                    m = max(abs(h), abs(k), abs(l))
                    if m not in by or a < by[m][1]: by[m] = ((h, k, l), a)
                    if best is None or a < best[1]: best = ((h, k, l), a)
        near = next((by[m] for m in range(1, 7) if m in by and by[m][1] <= 1), best)
        print('plane %s nearest crysta %s %.4f  mine %s %.4f' % (q['id'], q['near']['hkl'], q['near']['angle'], list(near[0]), near[1]))
    planes[q['id']] = (n, c)
for m in r['allMeasures']:
    pts = [np.array(x) for x in m['pts']]
    labs, F = zip(*[frac_of(p) for p in pts[:{'dist': 2, 'angle': 3, 'tors': 4, 'aplane': 1, 'bplane': 2, 'pangle': 3}[m['type']]]])
    P = [M @ f for f in F]
    if m['type'] == 'dist': mine = np.linalg.norm(P[0] - P[1])
    elif m['type'] == 'angle': mine = ang(P[0] - P[1], P[2] - P[1])
    elif m['type'] == 'tors': mine = torsion_deg(*P)
    else:
        n, c = planes[m['plane']]
        if m['type'] == 'aplane': mine = (P[0] - c) @ n
        elif m['type'] == 'bplane': v = P[1] - P[0]; mine = 90 - min(ang(v, n), 180 - ang(v, n))
        else:
            u, v = P[0] - P[1], P[2] - P[1]; fu, fv = u - (u @ n) * n, v - (v @ n) * n; mine = ang(fu, fv)
    print('%-7s %-22s crysta %12.6f  mine %12.6f  diff %.1e' % (m['type'], '-'.join(labs) + (' /' + m['plane'] if m.get('plane') else ''), m['value'], mine, abs(m['value'] - mine)))
for t in r['measText']: print('  card:', t)
for t in r['mpText']: print('  planes:', t)
