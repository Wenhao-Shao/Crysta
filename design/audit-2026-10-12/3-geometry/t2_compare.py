"""Task 2 reference: my own numpy for every Measure function, from the README definitions."""
import json, math, numpy as np, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geomlib import orth_matrix, torsion_deg
cases = json.load(open('t2_cases.json')); cr = json.load(open('t2_crysta.json'))
deg = math.degrees
def ang(u, v): return deg(math.acos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1)))
mx = {}
bad = {}
def upd(k, d, info=None, tol=None):
    mx[k] = max(mx.get(k, 0), abs(d))
    if tol is not None and abs(d) > tol: bad.setdefault(k, []).append(info)
def lsq_plane(P):
    c = P.mean(axis=0)
    w, V = np.linalg.eigh((P - c).T @ (P - c))
    n = V[:, 0]
    # README: the normal follows the order of the clicks. Right-hand rule: the polygon P0, P1, ... turns counterclockwise seen from the tip of n.
    ref = sum(np.cross(P[k] - c, P[(k + 1) % len(P)] - c) for k in range(len(P)))
    if ref @ n < 0: n = -n
    rms = math.sqrt(np.mean(((P - c) @ n) ** 2))
    return n, c, rms
def nearest(Mrec, n, M=6, T=1.0):
    best = None; by = {}
    for h in range(-M, M + 1):
        for k in range(-M, M + 1):
            for l in range(-M, M + 1):
                if (h, k, l) == (0, 0, 0) or math.gcd(math.gcd(abs(h), abs(k)), abs(l)) != 1: continue
                G = np.array([h, k, l]) @ Mrec
                a = ang(G, n); a = min(a, 180 - a)
                m = max(abs(h), abs(k), abs(l))
                if m not in by or a < by[m][1]: by[m] = ((h, k, l), a)
                if best is None or a < best[1]: best = ((h, k, l), a)
    for m in range(1, M + 1):
        if m in by and by[m][1] <= T: return by[m]
    return best
nn = 0
for cs, c in zip(cases, cr):
    M = orth_matrix(*cs['cell']); Mrec = np.linalg.inv(M)
    A, B, Cv = M[:, 0], M[:, 1], M[:, 2]
    P = np.array([M @ np.array(f) for f in cs['plane_pts']]); Q = [M @ np.array(f) for f in cs['q']]
    upd('distance', c['dist'] - np.linalg.norm(Q[0] - Q[1]), cs, 1e-6)
    upd('angle', c['angle'] - ang(Q[0] - Q[1], Q[2] - Q[1]), cs, 1e-6)
    t = torsion_deg(*Q); d = (c['tors'] - t + 180) % 360 - 180
    upd('torsion', d, (cs, c['tors'], t), 1e-6)
    n, ctr, rms = lsq_plane(P)
    upd('plane_rms', c['plane']['rms'] - rms, cs, 1e-9)
    # normal: compare n.a, n.b, n.c (frame independent), sign included
    nd = np.array([n @ A, n @ B, n @ Cv])
    upd('plane_normal_sign_and_direction', np.max(np.abs(np.array(c['plane_n_dot_abc']) - nd)), (cs['kind'], c['plane_n_dot_abc'], nd.tolist()), 1e-6)
    G = np.array(cs['hkl']) @ Mrec; nh = G / np.linalg.norm(G)
    ndh = np.array([nh @ A, nh @ B, nh @ Cv])
    upd('hkl_normal', np.max(np.abs(np.array(c['hkl_n_dot_abc']) - ndh)), cs, 1e-9)
    # atom to plane (signed), bond to plane, angle in plane, plane to plane
    for k, q in enumerate([Q[1], Q[2]]):
        upd('atom_to_plane', c['atom_plane'][k] - (q - ctr) @ n, cs, 1e-9)
        upd('atom_to_hkl', c['atom_hkl'][k] - (q - Q[0]) @ nh, cs, 1e-9)
    v = Q[2] - Q[1]
    upd('bond_to_plane', c['bond_plane'] - (90 - min(ang(v, n), 180 - ang(v, n))), cs, 1e-6)
    upd('bond_to_hkl', c['bond_hkl'] - (90 - min(ang(v, nh), 180 - ang(v, nh))), cs, 1e-6)
    def pang(nv, p, q, r):
        a_, b_ = p - q, r - q
        if min(ang(a_, nv), 180 - ang(a_, nv)) < 2 or min(ang(b_, nv), 180 - ang(b_, nv)) < 2: return None
        fa = a_ - (a_ @ nv) * nv; fb = b_ - (b_ @ nv) * nv
        return ang(fa, fb)
    for key, nv in (('pangle', n), ('pangle_hkl', nh)):
        ref = pang(nv, Q[1], Q[2], Q[3]); got = c[key]
        if ref is None or got is None:
            if (ref is None) != (got is None): bad.setdefault(key + '_nan', []).append((ref, got))
            else: nn += 1
        else: upd(key, got - ref, cs, 1e-6)
    pp = ang(n, nh); pp = min(pp, 180 - pp)
    upd('plane_to_plane', c['plane_plane'] - pp, cs, 1e-6)
    for key, nv in (('near', n), ('near_hkl', nh)):
        hkl, a = nearest(Mrec, nv)
        g = c[key]
        same = list(hkl) == g['hkl'] or [-x for x in hkl] == g['hkl']
        upd(key + '_angle', g['angle'] - a, cs, 1e-6)
        if not same: bad.setdefault(key + '_hkl', []).append((cs['kind'], hkl, round(a, 4), g['hkl'], round(g['angle'], 4)))
        # sign: Crysta's hkl normal points as n does
        Gs = np.array(g['hkl']) @ Mrec
        if Gs @ nv <= 0: bad.setdefault(key + '_sign', []).append(g)
for k in sorted(mx): print('%-35s max |diff| %.2e  bad %d' % (k, mx[k], len(bad.get(k, []))))
for k, v in bad.items():
    if k not in mx: print(k, len(v), v[:3])
print('undefined angle-in-plane cases (both None):', nn)
