"""Effect of the full anisotropic U against Ueq (Crysta's documented convention) with my own code:
T(h) = exp(-2 pi^2 (R^T h)^T beta (R^T h)), beta = N U N, N = diag(a*, b*, c*), for the copy x' = R x + t.
Prints the largest change of the relative intensity (% of the strongest) and the reflection."""
import sys, os, math, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R, run_case as RC
f = sys.argv[1]; lam = 1.54059; t0, t1 = 3, float(sys.argv[2]) if len(sys.argv) > 2 else 50
st = R.read_cif(f); cell = st['cell']; rc = cell.reciprocal()
N = np.diag([rc.a, rc.b, rc.c])
atoms = []
for s in st['sites']:
    mine = []
    for op in st['ops']:
        x = np.array(op.apply_to_xyz(s['f'])) % 1.0
        if any(cell.orthogonalize(gemmi_f).length() < 0.05 for gemmi_f in [__import__('gemmi').Fractional(*((x - g) - np.round(x - g))) for g in mine]):
            continue
        mine.append(x)
        Rm = np.array(op.rot) / op.DEN
        if s['uij'] is not None:
            U = s['uij']; Um = np.array([[U[0], U[5], U[4]], [U[5], U[1], U[3]], [U[4], U[3], U[2]]])
            beta = Rm @ (N @ Um @ N) @ Rm.T
        else:
            beta = None
        atoms.append({'el': s['el'], 'f': x, 'occ': s['occ'], 'u': s['u'], 'beta': beta})
c = RC.crysta(f, lam, t0, t1)
I_iso, I_an = [], []
for r in c['refl']:
    if not t0 <= r['tth'] <= t1: continue
    h = np.array([r['h'], r['k'], r['l']]); s2 = 1 / (4 * r['d'] ** 2)
    Fi = Fa = 0
    for a in atoms:
        fp, fpp = R.disp(a['el'], lam)
        fe = complex(R.f0(a['el'], s2) + fp, fpp) * a['occ'] * np.exp(2j * math.pi * h @ a['f'])
        Fi += fe * math.exp(-8 * math.pi ** 2 * (a['u'] if a['u'] is not None else 1 / (8 * math.pi ** 2)) * s2)
        Fa += fe * (math.exp(-2 * math.pi ** 2 * h @ a['beta'] @ h) if a['beta'] is not None else math.exp(-8 * math.pi ** 2 * a['u'] * s2))
    # mean over the Friedel mate is equal for |F|^2 within the set only with anomalous terms; use |F(h)|^2 and |F(-h)|^2
    Fi2 = Fa2 = 0
    I_iso.append(r['m'] * abs(Fi) ** 2 * r['lp']); I_an.append(r['m'] * abs(Fa) ** 2 * r['lp'])
I_iso, I_an = np.array(I_iso), np.array(I_an)
ri, ra = 100 * I_iso / I_iso.max(), 100 * I_an / I_an.max()
k = int(np.argmax(np.abs(ri - ra)))
refl = [r for r in c['refl'] if t0 <= r['tth'] <= t1]
print(os.path.basename(f), 'max |rel(Ueq) - rel(aniso)| =', round(float(np.abs(ri - ra).max()), 2), '% of strongest at', (refl[k]['h'], refl[k]['k'], refl[k]['l']), round(refl[k]['tth'], 3), 'rel Ueq', round(ri[k], 2), 'aniso', round(ra[k], 2), 'crysta', round(refl[k]['rel'], 2))
