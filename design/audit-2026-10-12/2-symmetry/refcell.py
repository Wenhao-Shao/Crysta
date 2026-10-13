"""Reference unit-cell contents from gemmi, written for this audit (shares nothing with Crysta).
ops: the CIF's listed operators (gemmi.Op) if present, else gemmi's space group from Hall / H-M / number.
Each site is expanded, wrapped into [0,1), and images of one site closer than `tol` (A) are one atom."""
import numpy as np, gemmi

def block_ops(block, small):
    trip = None
    for tag in ('_space_group_symop_operation_xyz', '_symmetry_equiv_pos_as_xyz', '_space_group_symop.operation_xyz'):
        col = block.find_values(tag)
        if col and len(col):
            trip = [gemmi.cif.as_string(v) for v in col]
            break
    if trip:
        ops = []
        for t in trip:
            try: ops.append(gemmi.Op(t.replace(' ', '')))
            except Exception: pass
        if ops: return ops, 'listed'
    sg = None; how = None
    hall = block.find_value('_space_group_name_Hall') or block.find_value('_symmetry_space_group_name_Hall')
    if hall and gemmi.cif.as_string(hall) not in ('?', '.'):
        try: sg = gemmi.symops_from_hall(gemmi.cif.as_string(hall)); how = 'hall'
        except Exception: sg = None
    if sg is None:
        hm = None
        for tag in ('_symmetry_space_group_name_H-M', '_space_group_name_H-M_alt', '_space_group_name_H-M'):
            v = block.find_value(tag)
            if v and gemmi.cif.as_string(v) not in ('?', '.'): hm = gemmi.cif.as_string(v); break
        if hm:
            s = gemmi.find_spacegroup_by_name(hm, alpha=small.cell.alpha, gamma=small.cell.gamma)
            if s: sg = s.operations(); how = 'hm'
        if sg is None:
            for tag in ('_symmetry_Int_Tables_number', '_space_group_IT_number'):
                v = block.find_value(tag)
                if v and gemmi.cif.as_string(v).strip().isdigit():
                    s = gemmi.find_spacegroup_by_number(int(gemmi.cif.as_string(v)))
                    if s: sg = s.operations(); how = 'number'; break
    if sg is None: return [gemmi.Op('x,y,z')], 'none'
    return list(sg), how

def frac_ops(ops):
    out = []
    for op in ops:
        R = np.array(op.rot, float) / gemmi.Op.DEN
        T = np.array(op.tran, float) / gemmi.Op.DEN
        out.append((R, T))
    return out

def mic(cellM, d):
    d = d - np.round(d)
    return np.linalg.norm(d @ cellM)

def expand(small, ops, tol, keepD=False):
    """list of (site_index, element, frac, occ); also the list of image-pair distances in (0.005, 0.9) A"""
    M = np.array(small.cell.orth.mat).T  # rows = a, b, c in Cartesian ... (frac row vector @ M)
    M = np.array(small.cell.orth.mat.tolist()).T
    fo = frac_ops(ops)
    atoms = []; near = []
    for si, s in enumerate(small.sites):
        f0 = np.array([s.fract.x, s.fract.y, s.fract.z])
        mine = []
        for R, T in fo:
            f = R @ f0 + T
            f = f - np.floor(f)
            f[f > 1 - 1e-9] = 0.0
            dmin = min([mic(M, f - g) for g in mine], default=99)
            if dmin < tol:
                if dmin > 0.005: near.append((si, s.label, round(dmin, 3)))
                continue
            if dmin < 0.9: near.append((si, s.label, round(dmin, 3)))
            mine.append(f)
        el = s.element.name
        if el == 'D' and not keepD: el = 'H'
        for f in mine: atoms.append((si, el, f, s.occ, s.label))
    return atoms, near, M

import re as _re
def read_doc(fp):
    """gemmi CIF document; leading lines before the first data_ header are dropped (journal preambles)."""
    try:
        return gemmi.cif.read(fp), None
    except Exception as e:
        txt = open(fp, encoding='utf-8', errors='replace').read()
        m = _re.search(r'^data_', txt, _re.M | _re.I)
        if not m: return None, str(e)
        try: return gemmi.cif.read_string(txt[m.start():]), 'preamble dropped'
        except Exception as e2: return None, str(e2)
