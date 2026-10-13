"""Task 4: my own hydrogen-bond search over the periodic crystal, from the README criteria.
Donor: H covalently bonded (README covalent rule) to N or O. Acceptor: O or N of another molecule, or a halide, O, N or S anion
(an atom bonded to a metal, or a free ion). H...A <= Bondi(H) + Bondi(A) - 0.15; angle D-H...A >= 120.
Variants recorded per contact: whether A is an ammonium-type N (4 covalent bonds), and whether A is a halide of a 0D metal complex.
Usage: python3 -I t4_hb.py list.json out.json"""
import sys, os, json, math, itertools, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ref_fw import load, orth, CORDERO, NONMETAL, HAL, ALK, BONDI
def run(path, block):
    cell, atoms = load(path, block)
    M = orth(cell); rec = np.linalg.inv(M)
    els = [a['el'] for a in atoms]; N = len(atoms)
    F = np.array([a['f'] for a in atoms]); X = F @ M.T
    nmax = [int(math.ceil(4.0 * np.linalg.norm(rec[k]))) + 1 for k in range(3)]
    T = np.array(list(itertools.product(*[range(-n, n + 1) for n in nmax])))
    is_metal = [e not in NONMETAL for e in els]
    centre = [m and e not in ALK for m, e in zip(is_metal, els)]
    # neighbour lists up to 4 A with images
    nb = [[] for _ in range(N)]
    for i in range(N):
        D = (F[None, :, :] + T[:, None, :] - F[i]) @ M.T
        d = np.linalg.norm(D, axis=2)
        for ti, j in zip(*np.where((d < 4.0) & (d > 0.3))):
            nb[i].append((int(j), tuple(int(x) for x in T[ti]), float(d[ti, j])))
    def covalent(i, j, d):
        a, b = els[i], els[j]
        if is_metal[i] or is_metal[j]: return False
        if a in ('H', 'D') and b in ('H', 'D'): return False
        if (a in HAL and (b in HAL or b in ('H', 'D'))) or (b in HAL and a in ('H', 'D')): return False
        return d < CORDERO[a] + CORDERO[b] + 0.45
    cov = [[(j, t) for j, t, d in nb[i] if covalent(i, j, d)] for i in range(N)]
    # metal-ligand bonds (README): halide +0.75, other donor non-metal +0.5; not to an atom with >= 4 covalent bonds
    def ml(i, j, d):
        b = els[j]
        if not centre[i] or b not in NONMETAL or b in ('H', 'D', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn') or len(cov[j]) >= 4: return False
        return d < CORDERO[els[i]] + CORDERO[b] + (0.75 if b in HAL else 0.5)
    ligand_of = [False] * N
    mlb = [[] for _ in range(N)]
    for i in range(N):
        if not centre[i]: continue
        for j, t, d in nb[i]:
            if ml(i, j, d): ligand_of[j] = True; mlb[i].append((j, t)); mlb[j].append((i, tuple(-x for x in t)))
    # molecule of an atom instance: BFS over covalent bonds (and metal-ligand bonds, to know 0D complexes)
    def unit(i0, t0, with_metal):
        seen = {(i0, t0)}; q = [(i0, t0)]
        while q and len(seen) < 3000:
            i, t = q.pop()
            for j, s in cov[i] + (mlb[i] if with_metal else []):
                k = (j, tuple(a + b for a, b in zip(t, s)))
                if k not in seen: seen.add(k); q.append(k)
        return seen
    # 0D complex: the metal-ligand-covalent unit is finite
    cache0 = {}
    def in_0d_complex(j):
        if j in cache0: return cache0[j]
        u = unit(j, (0, 0, 0), True)
        fin = len(u) < 3000 and len({i for i, t in u}) * 1 == len(u) and any(centre[i] for i, t in u)
        cache0[j] = fin
        return fin
    rows = []
    hasH = any(e in ('H', 'D') for e in els)
    for h in range(N):
        if els[h] not in ('H', 'D'): continue
        if len(cov[h]) != 1: continue
        dn, dt = cov[h][0]
        if els[dn] not in ('N', 'O'): continue
        mol = unit(h, (0, 0, 0), False)
        PH = X[h]; PD = (F[dn] + np.array(dt)) @ M.T
        for a, t, d in nb[h]:
            ea = els[a]
            if ea not in ('O', 'N', 'S') and ea not in HAL: continue
            if (a, t) in mol: continue
            anion = ligand_of[a] or (not cov[a] and not mlb[a])          # bonded to a metal, or a free ion
            molecular_ON = ea in ('O', 'N') and cov[a]
            if not (anion or molecular_ON): continue
            if d > BONDI['H'] + BONDI[ea] - 0.15: continue
            PA = (F[a] + np.array(t)) @ M.T
            u, v = PD - PH, PA - PH
            ang = math.degrees(math.acos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1)))
            if ang < 120: continue
            rows.append(dict(D=atoms[dn]['label'], H=atoms[h]['label'], A=atoms[a]['label'], dHA=d, dDA=float(np.linalg.norm(PA - PD)), angle=ang,
                             A_ammonium=bool(ea == 'N' and len(cov[a]) >= 4), A_complex_halide=bool(ea in HAL and ligand_of[a] and in_0d_complex(a)),
                             A_ligand=ligand_of[a]))
    uniq = {}
    for r in rows:
        k = (r['D'], r['H'], r['A'], '%.2f' % r['dDA'])
        uniq.setdefault(k, r)
    return dict(hasH=hasH, rows=list(uniq.values()), nAtoms=N)
if __name__ == '__main__':
    out = []
    for path, block in json.load(open(sys.argv[1])):
        try: r = run(path, block)
        except Exception as e: r = dict(error=repr(e)[:200])
        r['path'] = path; r['block'] = block; out.append(r)
        print(os.path.basename(path), block, len(r.get('rows', [])), r.get('error', ''), flush=True)
    json.dump(out, open(sys.argv[2], 'w'))
