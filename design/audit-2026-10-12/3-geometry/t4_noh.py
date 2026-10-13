"""Task 4, files without H: short N/O...halide contacts, as the page text states them: D...A shorter than the van der Waals sum
plus 0.15 A, donor N or O of a molecule, acceptor a halide anion. My own search over the periodic crystal."""
import sys, os, json, math, itertools, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ref_fw import load, orth, CORDERO, NONMETAL, HAL, ALK, BONDI
def run(path, block):
    cell, atoms = load(path, block)
    M = orth(cell); rec = np.linalg.inv(M)
    els = [a['el'] for a in atoms]; N = len(atoms)
    if any(e in ('H', 'D') for e in els): return dict(hasH=True, rows=[])
    F = np.array([a['f'] for a in atoms])
    nmax = [int(math.ceil(4.0 * np.linalg.norm(rec[k]))) + 1 for k in range(3)]
    T = np.array(list(itertools.product(*[range(-n, n + 1) for n in nmax])))
    is_metal = [e not in NONMETAL for e in els]; centre = [m and e not in ALK for m, e in zip(is_metal, els)]
    nb = [[] for _ in range(N)]
    for i in range(N):
        D = (F[None, :, :] + T[:, None, :] - F[i]) @ M.T; d = np.linalg.norm(D, axis=2)
        for ti, j in zip(*np.where((d < 4.0) & (d > 0.3))): nb[i].append((int(j), tuple(int(x) for x in T[ti]), float(d[ti, j])))
    def covalent(i, j, d):
        a, b = els[i], els[j]
        if is_metal[i] or is_metal[j]: return False
        if a in HAL and b in HAL: return False
        return d < CORDERO[a] + CORDERO[b] + 0.45
    cov = [[(j, t) for j, t, d in nb[i] if covalent(i, j, d)] for i in range(N)]
    lig = [False] * N
    for i in range(N):
        if not centre[i]: continue
        for j, t, d in nb[i]:
            b = els[j]
            if b in NONMETAL and b not in ('He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn') and len(cov[j]) < 4 and d < CORDERO[els[i]] + CORDERO[b] + (0.75 if b in HAL else 0.5): lig[j] = True
    rows = {}
    for dn in range(N):
        if els[dn] not in ('N', 'O') or not cov[dn] or lig[dn]: continue
        for a, t, d in nb[dn]:
            if els[a] not in HAL or cov[a]: continue
            if not (lig[a] or True): continue
            if d < BONDI[els[dn]] + BONDI[els[a]] + 0.15:
                rows.setdefault((atoms[dn]['label'], atoms[a]['label'], '%.2f' % d), dict(D=atoms[dn]['label'], A=atoms[a]['label'], dDA=d, A_ligand=lig[a]))
    return dict(hasH=False, rows=list(rows.values()))
if __name__ == '__main__':
    out = []
    for path, block in json.load(open(sys.argv[1])):
        try: r = run(path, block)
        except Exception as e: r = dict(error=repr(e)[:200])
        r['path'] = path; r['block'] = block; out.append(r)
    json.dump(out, open(sys.argv[2], 'w'))
