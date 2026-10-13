"""Auditor 3: my own framework / 2D perovskite descriptors, written from the README definitions.
Input: gemmi for reading a CIF and expanding the symmetry; numpy for everything else. Shares no code with Crysta.
Usage: python3 -I ref_fw.py list.json out.json   (list = [[path, block or null], ...])
"""
import sys, os, json, math, itertools, re
import numpy as np, gemmi
from math import gcd

# Cordero et al., Dalton Trans. 2008, 2832: covalent radii (A). Mn, Fe, Co: low-spin values (as one value is needed).
CORDERO = dict(H=0.31, D=0.31, B=0.84, C=0.76, N=0.71, O=0.66, F=0.57, Si=1.11, P=1.07, S=1.05, Cl=1.02, As=1.19, Se=1.20, Br=1.20, Te=1.38, I=1.39,
               Li=1.28, Na=1.66, K=2.03, Rb=2.20, Cs=2.44, Be=0.96, Mg=1.41, Ca=1.76, Sr=1.95, Ba=2.15, Al=1.21, Ga=1.22, In=1.42, Tl=1.45, Ge=1.20, Sn=1.39, Pb=1.46,
               Sb=1.39, Bi=1.48, Sc=1.70, Ti=1.60, V=1.53, Cr=1.39, Mn=1.39, Fe=1.32, Co=1.26, Ni=1.24, Cu=1.32, Zn=1.22, Y=1.90, Zr=1.75, Nb=1.64, Mo=1.54,
               Ru=1.46, Rh=1.42, Pd=1.39, Ag=1.45, Cd=1.44, Hf=1.75, Ta=1.70, W=1.62, Re=1.51, Os=1.44, Ir=1.41, Pt=1.36, Au=1.36, Hg=1.32,
               La=2.07, Ce=2.04, Pr=2.03, Nd=2.01, Sm=1.98, Eu=1.98, Gd=1.96, Tb=1.94, Dy=1.92, Ho=1.92, Er=1.89, Tm=1.90, Yb=1.87, Lu=1.87, U=1.96)
NONMETAL = set('H D He B C N O F Ne Si P S Cl Ar As Se Br Kr Te I Xe At Rn'.split())
HAL = set('F Cl Br I'.split())
ALK = set('Li Na K Rb Cs Fr'.split())
BONDI = dict(H=1.20, N=1.55, O=1.52, F=1.47, S=1.80, Cl=1.75, Br=1.85, I=1.98)

def orth(cell):
    a, b, c, al, be, ga = cell
    al, be, ga = map(math.radians, (al, be, ga))
    V = a * b * c * math.sqrt(1 - math.cos(al)**2 - math.cos(be)**2 - math.cos(ga)**2 + 2 * math.cos(al) * math.cos(be) * math.cos(ga))
    return np.array([[a, b * math.cos(ga), c * math.cos(be)],
                     [0, b * math.sin(ga), c * (math.cos(al) - math.cos(be) * math.cos(ga)) / math.sin(ga)],
                     [0, 0, V / (a * b * math.sin(ga))]])

def load_in(path):
    """FHI-aims geometry.in: lattice_vector and atom / atom_frac lines (my own reader). Cell from the vectors; fractional coordinates
    from the inverse of the vector matrix. A left-handed set of vectors gives the same metric, so distances and angles are unchanged."""
    V, at = [], []
    for ln in open(path, errors='replace'):
        t = ln.split('#')[0].split()
        if not t: continue
        if t[0] == 'lattice_vector': V.append([float(x) for x in t[1:4]])
        elif t[0] in ('atom', 'atom_frac'): at.append((t[0], [float(x) for x in t[1:4]], t[4]))
    V = np.array(V)
    L = [float(np.linalg.norm(v)) for v in V]
    ang = lambda u, v: math.degrees(math.acos(u @ v / np.linalg.norm(u) / np.linalg.norm(v)))
    cell = L + [ang(V[1], V[2]), ang(V[0], V[2]), ang(V[0], V[1])]
    Vi = np.linalg.inv(V)
    atoms = []; cnt = {}
    for kind, x, el in at:
        f = np.array(x) if kind == 'atom_frac' else np.array(x) @ Vi
        cnt[el] = cnt.get(el, 0) + 1
        atoms.append(dict(label=el + str(cnt[el]), el=el, f=f % 1.0, occ=1.0))
    return cell, atoms

def load(path, block):
    if path.endswith('.in'): return load_in(path)
    """atoms of the unit cell: list of dict(label, el, f). Disorder: per assembly, the group with the highest mean occupancy;
    sites with no group are kept. Same-element copies closer than 0.15 A are merged (gemmi does the symmetry)."""
    doc = gemmi.cif.read(path)
    b = None
    for x in doc:
        if block is None or x.name == block:
            if x.find_values('_atom_site_fract_x'): b = x; break
    ss = gemmi.make_small_structure_from_block(b)
    cell = [ss.cell.a, ss.cell.b, ss.cell.c, ss.cell.alpha, ss.cell.beta, ss.cell.gamma]
    # disorder groups
    t = b.find('_atom_site_', ['label', '?disorder_group', '?disorder_assembly', '?occupancy'])
    grp = {}
    for r in t:
        g = r.str(1) if r.has(1) else ''
        a = r.str(2) if r.has(2) else ''
        o = gemmi.cif.as_number(r[3]) if r.has(3) and r[3] not in ('?', '.') else 1.0
        if g in ('', '0'): g = ''
        grp[r.str(0)] = (a, g, o)
    means = {}
    for lab, (a, g, o) in grp.items():
        if g: means.setdefault(a, {}).setdefault(g, []).append(o)
    major = {a: max(d, key=lambda g: sum(d[g]) / len(d[g])) for a, d in means.items()}
    keep = lambda lab: (not grp.get(lab, ('', '', 1))[1]) or major[grp[lab][0]] == grp[lab][1]
    M = orth(cell)
    atoms = []
    for s in ss.get_all_unit_cell_sites():
        if not keep(s.label): continue
        f = np.array([s.fract.x, s.fract.y, s.fract.z]) % 1.0
        el = s.element.name
        if el == 'X': continue
        dup = False
        for a in atoms:
            if a['el'] != el: continue
            d = f - a['f']; d -= np.round(d)
            if np.linalg.norm(M @ d) < 0.15: dup = True; break
        if not dup: atoms.append(dict(label=s.label, el=el, f=f, occ=s.occ))
    return cell, atoms

def neighbours(cell, atoms, rule):
    """all pairs (i, j, t) with |x_j + t - x_i| < rule(i, j) (or None); t integer lattice shift"""
    M = orth(cell)
    F = np.array([a['f'] for a in atoms])
    out = []
    rec = np.linalg.inv(M)
    nmax = [int(math.ceil(4.5 * np.linalg.norm(rec[k]))) for k in range(3)]
    T = np.array(list(itertools.product(*[range(-n, n + 1) for n in nmax])))
    for i in range(len(atoms)):
        if rule(i, None) is None: continue
        D = F[None, :, :] + T[:, None, :] - F[i][None, None, :]       # (27*5, N, 3)
        X = D @ M.T
        dist = np.linalg.norm(X, axis=2)
        for ti, j in zip(*np.where((dist < 4.5) & (dist > 0.3))):
            cut = rule(i, j)
            if cut is not None and dist[ti, j] < cut:
                out.append((i, int(j), tuple(int(x) for x in T[ti]), float(dist[ti, j])))
    return out

def analyse(path, block):
    cell, atoms = load(path, block)
    M = orth(cell)
    rec = np.linalg.inv(M)                            # rows of inv(M): a*, b*, c* in Cartesian (a*.a = 1)
    els = [a['el'] for a in atoms]
    N = len(atoms)
    is_metal = [e not in NONMETAL for e in els]
    centre = [m and e not in ALK for m, e in zip(is_metal, els)]
    # covalent bonds between non-metals (README: sum of radii + 0.45 A); not H-H, not halide-halide, not halide-H
    def cov_rule(i, j):
        if j is None: return None if is_metal[i] else 1
        a, b = els[i], els[j]
        if is_metal[i] or is_metal[j]: return None
        if a in ('H', 'D') and b in ('H', 'D'): return None
        if (a in HAL and (b in HAL or b in ('H', 'D'))) or (b in HAL and a in ('H', 'D')): return None
        return CORDERO[a] + CORDERO[b] + 0.45
    cov = neighbours(cell, atoms, cov_rule)
    ncov = [0] * N
    covn = [[] for _ in range(N)]
    for i, j, t, d in cov: ncov[i] += 1; covn[i].append((j, t, d))
    # metal-ligand bonds: halide +0.75, other donor non-metals (not H, not noble) +0.5; a donor with >= 4 covalent bonds is not a ligand
    def ml_rule(i, j):
        if not centre[i]: return None
        if j is None: return 1
        b = els[j]
        if b not in NONMETAL or b in ('H', 'D', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'): return None
        if ncov[j] >= 4: return None
        return CORDERO[els[i]] + CORDERO[b] + (0.75 if b in HAL else 0.5)
    ml = neighbours(cell, atoms, ml_rule)
    if not ml:
        return dict(dim=None)
    lig = {}                                       # metal i -> list of (j, t, d)
    met = {}                                       # ligand j -> list of (i, -t)
    for i, j, t, d in ml:
        lig.setdefault(i, []).append((j, t, d)); met.setdefault(j, []).append((i, tuple(-x for x in t)))
    # periodic graph on metals and their ligands (and covalent bonds between ligand atoms, for linkers)
    edges = {}
    for i, j, t, d in ml:
        edges.setdefault(i, []).append((j, t)); edges.setdefault(j, []).append((i, tuple(-x for x in t)))
    for i, j, t, d in cov:
        if i in edges or j in edges:
            edges.setdefault(i, []).append((j, t))
    # BFS components with images
    comp = {}; img = {}; comps = []
    for s in sorted(edges):
        if s in comp: continue
        cid = len(comps); comps.append({'atoms': [s], 'vecs': []})
        comp[s] = cid; img[s] = np.zeros(3, int)
        q = [s]
        while q:
            u = q.pop()
            for v, t in edges.get(u, []):
                tv = img[u] + np.array(t)
                if v not in comp:
                    comp[v] = cid; img[v] = tv; comps[cid]['atoms'].append(v); q.append(v)
                else:
                    dv = tv - img[v]
                    if dv.any(): comps[cid]['vecs'].append(dv)
    for c in comps:
        V = np.array(c['vecs']) if c['vecs'] else np.zeros((0, 3))
        c['dim'] = int(np.linalg.matrix_rank(V)) if len(V) else 0
    withmetal = [c for c in comps if any(centre[a] for a in c['atoms'])]
    top = max(c['dim'] for c in withmetal)
    main = [c for c in withmetal if c['dim'] == top]
    res = dict(dim=top, ncomp=len(main))
    bridging_els = set()
    for c in main:
        for a in c['atoms']:
            if a in met and len({(i, t) for i, t in met[a]}) >= 2: bridging_els.add(els[a])
    res['halide_bridged'] = bool(bridging_els) and bridging_els <= HAL
    # metal sites: bonds, delta d, sigma2, cis range (one entry per crystallographic label)
    sites = {}
    for i in sorted(lig):
        lab = atoms[i]['label']
        if lab in sites: continue
        L = sorted(lig[i], key=lambda x: x[2])
        ds = np.array([x[2] for x in L])
        e = dict(cn=len(L), bonds=[(atoms[j]['label'], d) for j, t, d in L], mean=float(ds.mean()))
        if len(L) == 6:
            vs = [M @ (atoms[j]['f'] + np.array(t) - atoms[i]['f']) for j, t, d in L]
            A = np.zeros((6, 6))
            for p in range(6):
                for q in range(6):
                    if p != q: A[p, q] = math.degrees(math.acos(np.clip(vs[p] @ vs[q] / np.linalg.norm(vs[p]) / np.linalg.norm(vs[q]), -1, 1)))
            # trans partners: the perfect matching of the 6 bonds into 3 pairs with the largest summed angle
            best = None
            for m in [((0, 1), (2, 3), (4, 5)), ((0, 1), (2, 4), (3, 5)), ((0, 1), (2, 5), (3, 4)), ((0, 2), (1, 3), (4, 5)), ((0, 2), (1, 4), (3, 5)), ((0, 2), (1, 5), (3, 4)),
                      ((0, 3), (1, 2), (4, 5)), ((0, 3), (1, 4), (2, 5)), ((0, 3), (1, 5), (2, 4)), ((0, 4), (1, 2), (3, 5)), ((0, 4), (1, 3), (2, 5)), ((0, 4), (1, 5), (2, 3)),
                      ((0, 5), (1, 2), (3, 4)), ((0, 5), (1, 3), (2, 4)), ((0, 5), (1, 4), (2, 3))]:
                s_ = sum(A[p, q] for p, q in m)
                if best is None or s_ > best[0]: best = (s_, m)
            trans = set(best[1])
            cis = [A[p, q] for p in range(6) for q in range(p + 1, 6) if (p, q) not in trans]
            e['sigma2'] = float(sum((x - 90) ** 2 for x in cis) / 11)
            e['deltaD'] = float(np.mean(((ds - ds.mean()) / ds.mean()) ** 2))
            e['cisMin'], e['cisMax'] = float(min(cis)), float(max(cis))
            e['transMin'] = float(min(A[p, q] for p, q in trans))
            e['trans_pairs'] = [list(x) for x in trans]
        sites[lab] = e
    res['sites'] = sites
    if top != 2 or not res['halide_bridged']:
        return res
    # ---- layered metal halide ----
    T = np.zeros((0, 3), int)
    for c in main:
        if c['vecs']: T = np.vstack([T, np.array(c['vecs'])])
    # two independent translations of the layer, then h = t1 x t2 (in index space), primitive, first non-zero positive
    t1 = T[0]; t2 = None
    for v in T[1:]:
        if np.linalg.norm(np.cross(t1, v)) > 0: t2 = v; break
    h = np.cross(t1, t2)
    g = gcd(gcd(int(abs(h[0])), int(abs(h[1]))), int(abs(h[2])))
    h = h // g
    if h[np.nonzero(h)[0][0]] < 0: h = -h
    G = h @ rec
    dhkl = 1 / np.linalg.norm(G)
    n = G / np.linalg.norm(G)
    res['hkl'] = [int(x) for x in h]; res['dhkl'] = float(dhkl); res['normal'] = n.tolist()
    pos = lambda a: M @ (atoms[a]['f'] + img[a])
    H = lambda a: float(pos(a) @ n)
    layers = []
    for c in main:
        ms = [a for a in c['atoms'] if centre[a]]
        hs = sorted((H(a), a) for a in ms)
        planes = []
        for hv, a in hs:
            if planes and hv - planes[-1]['hs'][-1] < 3.0: planes[-1]['hs'].append(hv); planes[-1]['m'].append(a)
            else: planes.append({'hs': [hv], 'm': [a]})
        ph = [float(np.mean(p['hs'])) for p in planes]
        # terminal halides of the top and bottom metal planes, axial (bond within 45 deg of the normal)
        top, bot = [], []
        for pi_, pl in ((len(planes) - 1, planes[-1]), (0, planes[0])):
            for a in pl['m']:
                for j, t, d in lig[a]:
                    if els[j] not in HAL or len(met[j]) != 1: continue
                    x = M @ (atoms[j]['f'] + img[a] + np.array(t))
                    v = x - pos(a)
                    if abs(v @ n) / np.linalg.norm(v) < math.cos(math.radians(45)): continue
                    if pi_ == len(planes) - 1 and v @ n > 0: top.append(float(x @ n))
                    if pi_ == 0 and v @ n < 0: bot.append(float(x @ n))
        layers.append(dict(n=len(planes), planes=ph, centre=float(np.mean(ph)), top=float(np.mean(top)) if top else None, bot=float(np.mean(bot)) if bot else None,
                           metals=[ms]))
    res['n_per_layer'] = [L['n'] for L in layers]
    res['spacing_readme'] = float(dhkl / len(main))
    # actual centre-to-centre distances of adjacent layers (all layers folded into one period)
    cs = sorted((L['centre'] % dhkl) for L in layers)
    gaps = [cs[k + 1] - cs[k] for k in range(len(cs) - 1)] + [cs[0] + dhkl - cs[-1]]
    res['centre_gaps'] = gaps
    res['slabs'] = [(L['top'] - L['bot']) if L['top'] is not None and L['bot'] is not None else None for L in layers]
    # gallery measured directly: from the top face of each layer to the bottom face of the next layer above
    faces = []
    for k, L in enumerate(layers):
        if L['top'] is None or L['bot'] is None: continue
        faces.append((L['bot'], L['top'], k))
    gal = []
    for bot0, top0, k in faces:
        best = None
        for bot1, top1, k1 in faces:
            for m in range(-3, 4):
                b1 = bot1 + m * dhkl
                if b1 > top0 - 0.5 and (best is None or b1 < best): best = b1
        if best is not None: gal.append(best - top0)
    res['gallery_direct'] = gal
    # bridges: M-X-M at each bridging halide, theta, theta_in, theta_out
    br = []
    for c in main:
        for a in c['atoms']:
            if els[a] not in HAL or a not in met: continue
            ms = sorted(set(met[a]))
            for p in range(len(ms)):
                for q in range(p + 1, len(ms)):
                    i1, s1 = ms[p]; i2, s2 = ms[q]
                    X = M @ atoms[a]['f']
                    P1 = M @ (atoms[i1]['f'] + np.array(s1)); P2 = M @ (atoms[i2]['f'] + np.array(s2))
                    u, w = P1 - X, P2 - X
                    ang = lambda x, y: math.degrees(math.acos(np.clip(x @ y / np.linalg.norm(x) / np.linalg.norm(y), -1, 1)))
                    mm = P2 - P1
                    e = dict(x=atoms[a]['label'], m1=atoms[i1]['label'], m2=atoms[i2]['label'], theta=ang(u, w), mm=float(np.linalg.norm(mm)))
                    # equatorial: both metals in one metal plane (heights within 3 A)
                    e['equatorial'] = abs(mm @ n) < 3.0 * 0 + 1.5 if False else abs(float(mm @ n)) < 1.5
                    if e['equatorial']:
                        pin = lambda v: v - (v @ n) * n
                        e['thetaIn'] = ang(pin(u), pin(w))
                        mmi = pin(mm); mmi = mmi / np.linalg.norm(mmi)
                        wv = np.cross(n, mmi)                    # normal of the plane holding M...M and the layer normal
                        pout = lambda v: v - (v @ wv) * wv
                        e['thetaOut'] = ang(pout(u), pout(w))
                    br.append(e)
    res['bridges'] = br
    # axial tilt: for each metal site, the trans pair most nearly along the normal; acute angle of each bond to the normal
    tilts = []
    seen = set()
    for i in lig:
        if atoms[i]['label'] in seen or not centre[i]: continue
        seen.add(atoms[i]['label'])
        L = [x for x in lig[i] if els[x[0]] in HAL]
        best = None
        for j, t, d in L:
            v = M @ (atoms[j]['f'] + np.array(t) - atoms[i]['f'])
            c_ = abs(v @ n) / np.linalg.norm(v)
            tilts.append((atoms[i]['label'], atoms[j]['label'], math.degrees(math.acos(min(1, c_)))))
    res['bond_to_normal'] = tilts
    # N penetration: ammonium N (4 neighbours, >= 2 of them H; without H in the file: one heavy neighbour)
    hasH = any(e in ('H', 'D') for e in els)
    pen = {}
    for k, a in enumerate(atoms):
        if a['el'] != 'N': continue
        nb = covn[k]
        nH = sum(1 for j, t, d in nb if els[j] in ('H', 'D'))
        heavy = len(nb) - nH
        amm = (len(nb) == 4 and nH >= 2) if hasH else heavy == 1
        if not amm: continue
        hN = float((M @ a['f']) @ n)
        best = None
        for L in layers:
            for m in range(-3, 4):
                for face, sign in (('top', 1), ('bot', -1)):
                    if L[face] is None: continue
                    hf = L[face] + m * dhkl
                    centre_h = L['centre'] + m * dhkl
                    dist = abs(hN - hf)
                    inside = (hN - hf) * (centre_h - hf) > 0      # N on the side of the layer centre
                    val = dist if inside else -dist
                    if best is None or dist < abs(best): best = val
        pen.setdefault(a['label'], []).append(best)
    res['penetration'] = {k: float(np.mean(v)) for k, v in pen.items()}
    res['penetration_all'] = pen
    # stacking offset: in-plane M...M vectors (bridged metals in one plane), and the shift to the nearest metal of the next layer
    L0 = layers[0]
    topm = [a for a in main[0]['atoms'] if centre[a] and abs(H(a) - L0['planes'][-1]) < 3.0]
    m0 = topm[0]
    P0 = pos(m0)
    pin = lambda v: v - (v @ n) * n
    vecs = []
    for j, t, d in lig[m0]:
        for i2, s2 in met[j]:
            # metal i2 at image (t + s2) relative to m0's cell: m0 -> X is t, X -> i2 is s2
            Q = M @ (atoms[i2]['f'] + np.array(t) + np.array(s2) + img[m0])
            v = Q - P0
            if np.linalg.norm(v) < 1e-6 or abs(v @ n) > 1.5: continue
            vecs.append(pin(v))
    vecs.sort(key=np.linalg.norm)
    p1 = vecs[0]; p2 = next(v for v in vecs if np.linalg.norm(np.cross(p1, v)) > 0.5 * np.linalg.norm(p1) * np.linalg.norm(v))
    # metals of the next layer up: bottom plane of the layer whose centre is about one spacing above
    sp = dhkl / len(main)
    cand = []
    for L, c in zip(layers, main):
        bm = [a for a in c['atoms'] if centre[a] and abs(H(a) - L['planes'][0]) < 3.0]
        for a in bm:
            for t in itertools.product(range(-3, 4), repeat=3):
                Q = M @ (atoms[a]['f'] + img[a] + np.array(t))
                dh = (Q - P0) @ n
                if abs(dh - (sp - (L0['planes'][-1] - L0['centre']) - (L['centre'] - L['planes'][0]))) < 0.3 * sp:
                    cand.append(Q)
    res['offset'] = None
    if cand:
        Q = min(cand, key=lambda Q: np.linalg.norm(pin(Q - P0)))
        d = pin(Q - P0)
        B = np.array([p1, p2]).T
        s, *_ = np.linalg.lstsq(B, d, rcond=None)
        s = np.abs(s - np.round(s))
        res['offset'] = sorted([float(s[0]), float(s[1])], reverse=True)
        res['p'] = [float(np.linalg.norm(p1)), float(np.linalg.norm(p2))]
    return res

if __name__ == '__main__':
    lst = json.load(open(sys.argv[1]))
    out = []
    import time
    for path, block in lst:
        t0 = time.time()
        try:
            r = analyse(path, block)
        except Exception as e:
            import traceback
            r = dict(error=repr(e)[:200], tb=traceback.format_exc()[-300:])
        r['path'] = path; r['block'] = block; r['time'] = time.time() - t0
        print(os.path.basename(path), block, round(r['time'], 1), flush=True)
        out.append(r)
    json.dump(out, open(sys.argv[2], 'w'), default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
