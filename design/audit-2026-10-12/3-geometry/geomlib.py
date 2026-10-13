"""Auditor 3 reference library. Independent of Crysta: gemmi for CIF parsing and symmetry, numpy for geometry."""
import gemmi, numpy as np, re, math

def num_su(s):
    """'2.987(4)' -> (2.987, 0.004); '2.987' -> (2.987, None, ndec)"""
    s = s.strip()
    m = re.match(r'^([-+]?\d*\.?\d*)(?:\((\d+)\))?$', s)
    if not m or m.group(1) in ('', '.', '-', '+'):
        return None, None, None
    v = float(m.group(1))
    dec = len(m.group(1).split('.')[1]) if '.' in m.group(1) else 0
    su = None
    if m.group(2):
        su = int(m.group(2)) * 10 ** (-dec)
    return v, su, dec

def orth_matrix(a, b, c, al, be, ga):
    """my own orthogonalisation: a along x, b in the xy plane, right-handed. Columns are a, b, c."""
    al, be, ga = map(math.radians, (al, be, ga))
    ca, cb, cg, sg = math.cos(al), math.cos(be), math.cos(ga), math.sin(ga)
    V = a*b*c*math.sqrt(1 - ca*ca - cb*cb - cg*cg + 2*ca*cb*cg)
    M = np.array([[a, b*cg, c*cb],
                  [0, b*sg, c*(ca - cb*cg)/sg],
                  [0, 0, V/(a*b*sg)]])
    return M

def metric(a, b, c, al, be, ga):
    al, be, ga = map(math.radians, (al, be, ga))
    return np.array([[a*a, a*b*math.cos(ga), a*c*math.cos(be)],
                     [a*b*math.cos(ga), b*b, b*c*math.cos(al)],
                     [a*c*math.cos(be), b*c*math.cos(al), c*c]])

def block_symops(b):
    """list of gemmi.Op in file order, and a dict id->op"""
    tags = [('_space_group_symop_operation_xyz', '_space_group_symop_id'),
            ('_symmetry_equiv_pos_as_xyz', '_symmetry_equiv_pos_site_id'),
            ('_space_group_symop.operation_xyz', '_space_group_symop.id')]
    for t, idt in tags:
        col = b.find_values(t)
        if len(col):
            ops = [gemmi.Op(gemmi.cif.as_string(x).replace(' ', '')) for x in col]
            ids = b.find_values(idt)
            idmap = {}
            if len(ids) == len(col):
                for i, x in zip(ids, ops): idmap[gemmi.cif.as_string(i)] = x
            for k, x in enumerate(ops): idmap.setdefault(str(k + 1), x)
            return ops, idmap
    return [gemmi.Op('x,y,z')], {'1': gemmi.Op('x,y,z')}

def cell_of(b):
    return [gemmi.cif.as_number(b.find_value(t)) for t in ('_cell_length_a', '_cell_length_b', '_cell_length_c', '_cell_angle_alpha', '_cell_angle_beta', '_cell_angle_gamma')]

def sites_of(b):
    t = b.find('_atom_site_', ['label', 'fract_x', 'fract_y', 'fract_z', '?type_symbol', '?occupancy', '?disorder_group', '?disorder_assembly'])
    out = {}
    for r in t:
        lab = r.str(0)
        try:
            f = [gemmi.cif.as_number(r[1]), gemmi.cif.as_number(r[2]), gemmi.cif.as_number(r[3])]
        except Exception:
            continue
        if any(math.isnan(x) for x in f): continue
        el = r.str(4) if r.has(4) else re.match(r'[A-Za-z]{1,2}', lab).group(0)
        occ = gemmi.cif.as_number(r[5]) if r.has(5) and r[5] not in ('?', '.') else 1.0
        dg = r.str(6) if r.has(6) and r[6] not in ('?', '.') else '.'
        out[lab] = dict(f=np.array(f), el=el, occ=occ, dg=dg)
    return out

def apply_code(code, f, idmap):
    """apply a CIF site-symmetry code 'n_klm' (or '.', or 'n') to fractional coordinates f"""
    code = code.strip()
    if code in ('.', '?', ''):
        return np.array(f, float)
    m = re.match(r'^(\w+?)(?:_(\d)(\d)(\d))?$', code)
    if not m:
        m2 = re.match(r'^(\w+)_(\d+)_(\d+)_(\d+)$', code)
        if not m2: raise ValueError('symmetry code ' + code)
        n, k, l, mm = m2.group(1), int(m2.group(2)), int(m2.group(3)), int(m2.group(4))
    else:
        n = m.group(1)
        k, l, mm = (int(m.group(2)), int(m.group(3)), int(m.group(4))) if m.group(2) else (5, 5, 5)
    op = idmap[n]
    g = np.array(op.apply_to_xyz(list(map(float, f))))
    return g + np.array([k - 5, l - 5, mm - 5])

def torsion_deg(p, q, r, s):
    """IUPAC / Klyne-Prelog: looking along q->r, the angle from the projection of q->p to that of r->s,
    positive clockwise. Written from the definition: project both outer bonds on the plane normal to q-r."""
    p, q, r, s = map(np.asarray, (p, q, r, s))
    axis = (r - q) / np.linalg.norm(r - q)
    u = (p - q) - np.dot(p - q, axis) * axis      # near bond, projected
    v = (s - r) - np.dot(s - r, axis) * axis      # far bond, projected
    ang = math.degrees(math.acos(max(-1, min(1, np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v)))))
    # viewer looks along +axis (from q to r). Clockwise rotation of u to v seen by this viewer:
    # u x v points away from the viewer (along +axis) for a clockwise turn
    sign = 1 if np.dot(np.cross(u, v), axis) > 0 else -1
    return sign * ang
