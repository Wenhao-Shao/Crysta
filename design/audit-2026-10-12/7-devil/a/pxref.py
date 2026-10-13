# Independent powder-pattern reference (README definitions, own code): python3 -I pxref.py file lambda tthmin tthmax merge_tol [disp:0/1] [anode_energy_lambda]
import sys, json, math, itertools, numpy as np, gemmi
path, lam, t0, t1, tol = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
disp = len(sys.argv) > 6 and sys.argv[6] == '1'
lam_disp = float(sys.argv[7]) if len(sys.argv) > 7 else lam
doc = gemmi.cif.read_file(path)
b = [x for x in doc if x.find_values('_atom_site_fract_x')][0]
ss = gemmi.make_small_structure_from_block(b)
ops = None
for tag in ('_symmetry_equiv_pos_as_xyz', '_space_group_symop_operation_xyz'):
    v = list(b.find_values(tag))
    if v: ops = [gemmi.Op(gemmi.cif.as_string(x)) for x in v]; break
if ops is None: ops = list(ss.spacegroup.operations())
cell = ss.cell; M = np.array(cell.orth.mat.tolist())
# U per label: Uiso column, else Biso, else Ueq from the aniso loop (README convention)
tab = b.find('_atom_site_', ['label', '?U_iso_or_equiv', '?B_iso_or_equiv'])
uiso = {}
for r in tab:
    u = None
    if r.has(1) and r[1] not in '?.': u = gemmi.cif.as_number(r[1])
    elif r.has(2) and r[2] not in '?.': u = gemmi.cif.as_number(r[2]) / (8 * math.pi ** 2)
    uiso[r[0]] = u
an = b.find('_atom_site_aniso_', ['label', 'U_11', 'U_22', 'U_33', 'U_23', 'U_13', 'U_12'])
G = cell.metric_tensor(); Gs = cell.reciprocal_metric_tensor()
for r in an:
    if uiso.get(r[0]) is None:
        U11,U22,U33,U23,U13,U12 = [gemmi.cif.as_number(r[i]) for i in range(1,7)]
        U = np.array([[U11,U12,U13],[U12,U22,U23],[U13,U23,U33]])
        A = np.array(cell.orth.mat.tolist()); rc = cell.reciprocal(); N = np.diag([rc.a, rc.b, rc.c])
        uiso[r[0]] = np.trace(A @ N @ U @ N @ A.T) / 3
atoms = []
for s in ss.sites:
    if s.occ <= 0: continue
    f0 = np.array([s.fract.x, s.fract.y, s.fract.z]); cp = []
    for op in ops:
        R = np.array(op.rot) / op.DEN; T = np.array(op.tran) / op.DEN
        f = (R @ f0 + T) % 1.0
        if any(np.linalg.norm(M @ ((f - g) - np.round(f - g))) < tol for g in cp): continue
        cp.append(f)
    u = uiso.get(s.label); B = 8 * math.pi ** 2 * max(0, u) if u is not None else 1.0
    for f in cp: atoms.append((s.element, f, s.occ, B))
E = gemmi.hc / lam_disp
fx = np.array([a[1] for a in atoms]); occ = np.array([a[2] for a in atoms]); Bs = np.array([a[3] for a in atoms])
fp = np.array([gemmi.cromer_liberman(a[0].atomic_number, E)[0] if disp else 0 for a in atoms])
fpp = np.array([gemmi.cromer_liberman(a[0].atomic_number, E)[1] if disp else 0 for a in atoms])
def sf(h, s2):
    f0 = np.array([a[0].it92.calculate_sf(s2) for a in atoms])
    ph = 2 * math.pi * (fx @ np.array(h))
    amp = occ * (f0 + fp + 1j * fpp) * np.exp(-Bs * s2)
    return np.sum(amp * np.exp(1j * ph))
rots = set()
for op in ops:
    R = tuple(tuple(int(round(x / op.DEN)) for x in row) for row in op.rot)
    rots.add(R); rots.add(tuple(tuple(-x for x in row) for row in R))
rots = [np.array(R) for R in rots]
dmin = lam / (2 * math.sin(math.radians(t1) / 2))
hmax = [int(math.ceil(cell.a / dmin)) + 1, int(math.ceil(cell.b / dmin)) + 1, int(math.ceil(cell.c / dmin)) + 1]
seen = set(); refl = []
for h in itertools.product(*[range(-m, m + 1) for m in hmax]):
    if h == (0, 0, 0) or h in seen: continue
    d = cell.calculate_d(list(h))
    if d < dmin: continue
    x = lam / (2 * d)
    if x >= 1: continue
    tth = 2 * math.degrees(math.asin(x))
    if tth < t0 or tth > t1: continue
    orbit = {tuple(int(v) for v in (np.array(h) @ R)) for R in rots}
    for o in orbit: seen.add(o)
    s2 = (1 / (2 * d)) ** 2
    F2 = np.mean([abs(sf(o, s2)) ** 2 for o in orbit])
    th = math.radians(tth / 2)
    lp = (1 + math.cos(2 * th) ** 2) / (math.sin(th) ** 2 * math.cos(th))
    refl.append({'h': h, 'd': d, 'tth': tth, 'm': len(orbit), 'F2': F2, 'I': len(orbit) * F2 * lp})
mx = max(r['I'] for r in refl)
for r in refl: r['rel'] = 100 * r['I'] / mx
refl.sort(key=lambda r: r['tth'])
json.dump({'natoms': len(atoms), 'refl': [{'h': list(r['h']), 'tth': round(r['tth'], 4), 'm': r['m'], 'F2': round(r['F2'], 3), 'rel': round(r['rel'], 3)} for r in refl]}, sys.stdout)
