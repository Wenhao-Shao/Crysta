"""Reference powder-XRD calculation for the Crysta audit (auditor 4).

Written from the definitions (README of Crysta and the textbook formulas), sharing no code with Crysta:
  - cell, d spacing: gemmi.UnitCell
  - symmetry operators: read from the CIF by gemmi.cif, or gemmi space-group tables from the H-M symbol
  - f0: gemmi IT92 coefficients (International Tables C, table 6.1.1.4)
  - f', f'': gemmi.cromer_liberman at E = hc / lambda
  - F(h) = sum occ (f0 + f' + i f'') exp(-B s^2) exp(2 pi i h.x), B = 8 pi^2 U
  - Ueq = trace of the Cartesian U tensor / 3 (U_cart = A N U N A^T), my own
  - reflection sets: orbit of h under {h R, -h R} for the rotation parts R of the operators
  - LP = (1 + cos^2 2t) / (sin^2 t cos t)   (Bragg-Brentano, no monochromator)
"""
import math
import numpy as np
import gemmi

HC = 12398.4197386209  # eV angstrom (gemmi.hc)


def num(v):
    """CIF number without its s.u., or None"""
    if v is None:
        return None
    v = str(v).strip()
    if v in ('?', '.', ''):
        return None
    if '(' in v:
        v = v[:v.index('(')]
    try:
        return float(v)
    except ValueError:
        return None


def elem_of(type_symbol, label):
    for s in (type_symbol, label):
        if not s or s in ('?', '.'):
            continue
        letters = ''
        for ch in s:
            if ch.isalpha():
                letters += ch
            else:
                break
        for cand in (letters[:2], letters[:1]):
            if not cand:
                continue
            c = cand[0].upper() + cand[1:].lower()
            if c == 'D':
                return 'H'
            e = gemmi.Element(c)
            if e.atomic_number > 0 and e.name.lower() == c.lower():
                return e.name
    return None


def ueq_from_aniso(cell, U):
    """U = [U11, U22, U33, U23, U13, U12] in the CIF convention (with respect to a*, b*, c*).
    Ueq = trace(U_cart) / 3 with U_cart = A N U N A^T, A the orthogonalization matrix, N = diag(a*, b*, c*)."""
    A = np.array(cell.orth.mat.tolist())
    rc = cell.reciprocal()
    N = np.diag([rc.a, rc.b, rc.c])
    Um = np.array([[U[0], U[5], U[4]], [U[5], U[1], U[3]], [U[4], U[3], U[2]]])
    Uc = A @ N @ Um @ N @ A.T
    return np.trace(Uc) / 3.0


def read_cif(path, block_index=0):
    doc = gemmi.cif.read(path)
    blocks = [b for b in doc if b.find_value('_cell_length_a') is not None and len(b.find_values('_atom_site_fract_x')) > 0]
    b = blocks[block_index]
    cpar = [num(b.find_value(t)) for t in ('_cell_length_a', '_cell_length_b', '_cell_length_c',
                                            '_cell_angle_alpha', '_cell_angle_beta', '_cell_angle_gamma')]
    cell = gemmi.UnitCell(*cpar)
    ops_txt = None
    for tag in ('_space_group_symop_operation_xyz', '_symmetry_equiv_pos_as_xyz', '_space_group_symop.operation_xyz'):
        v = list(b.find_values(tag))
        if v:
            ops_txt = [gemmi.cif.as_string(x) for x in v]
            break
    if ops_txt:
        ops = [gemmi.Op(t.replace(' ', '')) for t in ops_txt]
        source = 'listed'
    else:
        sg = None
        for tag in ('_space_group_name_Hall', '_symmetry_space_group_name_Hall'):
            v = b.find_value(tag)
            if v and gemmi.cif.as_string(v) not in ('?', '.'):
                try:
                    sg = gemmi.find_spacegroup_by_ops(gemmi.symops_from_hall(gemmi.cif.as_string(v)))
                except Exception:
                    sg = None
        if sg is None:
            for tag in ('_space_group_name_H-M_alt', '_symmetry_space_group_name_H-M'):
                v = b.find_value(tag)
                if v and gemmi.cif.as_string(v) not in ('?', '.'):
                    sg = gemmi.find_spacegroup_by_name(gemmi.cif.as_string(v), cpar[3], cpar[5])
                    if sg:
                        break
        if sg is None:
            for tag in ('_space_group_IT_number', '_symmetry_Int_Tables_number'):
                v = num(b.find_value(tag))
                if v:
                    sg = gemmi.SpaceGroup(int(v))
                    break
        ops = list(sg.operations()) if sg else [gemmi.Op('x,y,z')]
        source = 'symbol ' + (sg.hm if sg else 'none')
    # sites
    t = b.find('_atom_site_', ['label', '?type_symbol', 'fract_x', 'fract_y', 'fract_z', '?occupancy',
                               '?U_iso_or_equiv', '?B_iso_or_equiv'])
    aniso = {}
    for kind in ('U', 'B'):
        ta = b.find('_atom_site_aniso_', ['label'] + ['%s_%s' % (kind, ij) for ij in ('11', '22', '33', '23', '13', '12')])
        for r in ta:
            v = [num(r[i]) for i in range(1, 7)]
            if all(x is not None for x in v):
                u = ueq_from_aniso(cell, v) / (8 * math.pi ** 2 if kind == 'B' else 1)
                aniso[r[0]] = (u, [x / (8 * math.pi ** 2 if kind == 'B' else 1) for x in v])
    sites = []
    for r in t:
        lab = r[0]
        ts = r[1] if r.has(1) else None
        el = elem_of(ts, lab)
        f = [num(r[2]), num(r[3]), num(r[4])]
        if el is None or any(x is None for x in f):
            continue
        occ = num(r[5]) if r.has(5) else None
        if occ is None:
            occ = 1.0
        u = num(r[6]) if r.has(6) else None
        if u is None and r.has(7) and num(r[7]) is not None:
            u = num(r[7]) / (8 * math.pi ** 2)
        if u is None and lab in aniso:
            u = aniso[lab][0]
        sites.append({'label': lab, 'el': el, 'f': f, 'occ': occ, 'u': u, 'uij': aniso.get(lab, (None, None))[1]})
    return {'cell': cell, 'ops': ops, 'sites': sites, 'source': source}


def expand(st, tol=0.05):
    """every atom of the cell: each site under each operator; copies of one site closer than tol (A) count once"""
    cell = st['cell']
    out = []
    near = []  # copies of a site that are > tol but < 0.15 A apart (for the audit)
    for s in st['sites']:
        if not (s['occ'] > 0):
            continue
        mine = []
        for op in st['ops']:
            x = np.array(op.apply_to_xyz(s['f'])) % 1.0
            dup = False
            for g in mine:
                d = x - g
                d -= np.round(d)
                dist = cell.orthogonalize(gemmi.Fractional(*d)).length()
                if dist < tol:
                    dup = True
                    break
                if dist < 0.15:
                    near.append((s['label'], dist))
            if dup:
                continue
            mine.append(x)
            out.append({'el': s['el'], 'f': x, 'occ': s['occ'], 'u': s['u'], 'label': s['label']})
    return out, near


def f0(el, s2):
    c = gemmi.Element(el).it92.get_coefs()
    a, b, cc = c[0:4], c[4:8], c[8]
    return sum(a[i] * math.exp(-b[i] * s2) for i in range(4)) + cc


def disp(el, lam):
    if lam is None:
        return (0.0, 0.0)
    z = gemmi.Element(el).atomic_number
    return gemmi.cromer_liberman(z=z, energy=HC / lam)


def lp(theta):
    return (1 + math.cos(2 * theta) ** 2) / (math.sin(theta) ** 2 * math.cos(theta))


def pattern(st, atoms, lam, tmin, tmax, b_default=1.0, disp_lam='same', margin=0.0):
    """all reflection sets with tmin - margin <= 2theta <= tmax + margin.
    disp_lam: wavelength for f', f'' ('same' = lam, None = no dispersion)."""
    cell = st['cell']
    dl = lam if disp_lam == 'same' else disp_lam
    els = sorted(set(a['el'] for a in atoms))
    dsp = {e: disp(e, dl) for e in els}
    X = np.array([a['f'] for a in atoms])
    occ = np.array([a['occ'] for a in atoms])
    B = np.array([(8 * math.pi ** 2 * max(0.0, a['u'])) if a['u'] is not None else b_default for a in atoms])
    el_idx = np.array([els.index(a['el']) for a in atoms])
    gmax = 2 * math.sin(math.radians(min(179.0, tmax + margin) / 2)) / lam
    gmin = 2 * math.sin(math.radians(max(0.0, tmin - margin) / 2)) / lam
    H = int(math.floor(gmax * cell.a)) + 1
    K = int(math.floor(gmax * cell.b)) + 1
    L = int(math.floor(gmax * cell.c)) + 1
    # rotation parts for hkl
    rots = []
    for op in st['ops']:
        R = np.array(op.rot) // op.DEN
        for sg in (1, -1):
            key = tuple((sg * R).flatten())
            if key not in [tuple(r.flatten()) for r in rots]:
                rots.append(sg * R)
    hkls = []
    for h in range(-H, H + 1):
        for k in range(-K, K + 1):
            for l in range(-L, L + 1):
                if h == 0 and k == 0 and l == 0:
                    continue
                d = cell.calculate_d([h, k, l])
                g = 1 / d
                if g <= gmax and g >= gmin:
                    hkls.append((h, k, l))
    hkls_set = set(hkls)
    done = set()
    sets = []
    for hkl in hkls:
        if hkl in done:
            continue
        orbit = set()
        hv = np.array(hkl)
        for R in rots:
            orbit.add(tuple(int(x) for x in hv @ R))
        done |= orbit
        sets.append(sorted(orbit))
    f000 = sum(a['occ'] * f0(a['el'], 0) for a in atoms)
    res = []
    for orb in sets:
        h0 = orb[0]
        d = cell.calculate_d(list(h0))
        s2 = 1 / (4 * d * d)
        sinth = lam / (2 * d)
        if sinth >= 1:
            continue
        th = math.asin(sinth)
        fe = np.array([complex(f0(e, s2) + dsp[e][0], dsp[e][1]) for e in els])
        fa = fe[el_idx] * occ * np.exp(-B * s2)
        F2 = []
        Fs = {}
        for hh in orb:
            F = np.sum(fa * np.exp(2j * math.pi * (X @ np.array(hh))))
            Fs[hh] = F
            F2.append(abs(F) ** 2)
        F2 = np.array(F2)
        res.append({'orbit': orb, 'd': d, 'tth': 2 * math.degrees(th), 'm': len(orb), 'F2mean': F2.mean(),
                    'F2min': F2.min(), 'F2max': F2.max(), 'lp': lp(th), 'I': len(orb) * F2.mean() * lp(th), 'F': Fs})
    top = max([r['I'] for r in res if tmin <= r['tth'] <= tmax and r['F2mean'] > 1e-6 * f000 ** 2] or [1])
    for r in res:
        r['rel'] = 100 * r['I'] / top
        r['absent'] = r['F2mean'] < 1e-6 * max(1, f000 ** 2)
    res.sort(key=lambda r: r['tth'])
    return res, f000


def compare(crysta, ref, tmin, tmax, rel_min=0.0):
    """match Crysta rows to reference sets; return a summary dict"""
    idx = {}
    for i, r in enumerate(ref):
        for hh in r['orbit']:
            idx[hh] = i
    used = set()
    out = {'n_crysta': 0, 'n_ref': 0, 'missing': [], 'extra': [], 'max_dtth': 0, 'max_dd': 0, 'm_mismatch': [],
           'max_dF2_rel': 0, 'max_drel': 0, 'max_dFnamed': 0, 'worst': None, 'worst_F2': None}
    for c in crysta:
        if c['tth'] < tmin or c['tth'] > tmax:
            continue
        out['n_crysta'] += 1
        key = (c['h'], c['k'], c['l'])
        if key not in idx:
            out['extra'].append(key)
            continue
        i = idx[key]
        if i in used:
            out['extra'].append(('dup',) + key)
        used.add(i)
        r = ref[i]
        dt = abs(c['tth'] - r['tth'])
        out['max_dtth'] = max(out['max_dtth'], dt)
        out['max_dd'] = max(out['max_dd'], abs(c['d'] - r['d']))
        if c['m'] != r['m']:
            out['m_mismatch'].append((key, c['m'], r['m']))
        dF2 = abs(c['f'] ** 2 - r['F2mean']) / max(r['F2mean'], 1e-9)
        if r['rel'] > 0.01 and dF2 > out['max_dF2_rel']:
            out['max_dF2_rel'] = dF2
            out['worst_F2'] = (key, c['f'] ** 2, r['F2mean'], r['rel'])
        drel = abs(c['rel'] - r['rel'])
        if drel > out['max_drel']:
            out['max_drel'] = drel
            out['worst'] = (key, c['rel'], r['rel'])
        Fn = r['F'][key]
        out['max_dFnamed'] = max(out['max_dFnamed'], abs(complex(c['fre'], c['fim']) - Fn))
    for i, r in enumerate(ref):
        if tmin <= r['tth'] <= tmax and not r['absent'] and i not in used and r['rel'] >= rel_min:
            out['missing'].append((r['orbit'][0], r['tth'], r['rel']))
        if tmin <= r['tth'] <= tmax and not r['absent']:
            out['n_ref'] += 1
    return out
