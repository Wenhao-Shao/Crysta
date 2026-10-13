# Reference: what gemmi reads from each CIF (run with python3 -I).
# usage: python3 -I dump_gemmi.py out.json @list.txt
import sys, json, math
import gemmi
import numpy as np

def ueq_from_aniso(cell, U):
    # Ueq = 1/3 trace(A N U N A^T) (Fischer & Tillmanns 1988), A = columns a, b, c in Cartesian, N = diag(a*, b*, c*)
    a, b, c = cell.a, cell.b, cell.c
    al, be, ga = (math.radians(x) for x in (cell.alpha, cell.beta, cell.gamma))
    # own orthogonalisation (a along x, b in xy)
    A = np.zeros((3, 3))
    A[:, 0] = [a, 0, 0]
    A[:, 1] = [b * math.cos(ga), b * math.sin(ga), 0]
    cx = c * math.cos(be); cy = c * (math.cos(al) - math.cos(be) * math.cos(ga)) / math.sin(ga)
    A[:, 2] = [cx, cy, math.sqrt(c * c - cx * cx - cy * cy)]
    R = np.linalg.inv(A).T  # rows... columns of inv(A).T are reciprocal vectors
    rl = np.linalg.norm(np.linalg.inv(A), axis=1)  # |a*|, |b*|, |c*| (rows of inv(A))
    N = np.diag(rl)
    Um = np.array(U)
    Uc = A @ N @ Um @ N @ A.T
    return float(np.trace(Uc) / 3)

def main():
    out = {}
    files = sys.argv[2:]
    if len(files) == 1 and files[0].startswith('@'):
        files = [l for l in open(files[0][1:]).read().split('\n') if l]
    for f in files:
        name = f.split('/')[-1]
        rec = {'name': name}
        try:
            doc = gemmi.cif.read(f)
        except Exception as e:
            rec['error'] = str(e)
            out[name] = rec
            continue
        rec['nblocks_all'] = len(doc)
        blocks = []
        for blk in doc:
            fx = blk.find_values('_atom_site_fract_x')
            if len(fx) == 0:
                continue
            b = {'block': blk.name}
            try:
                st = gemmi.make_small_structure_from_block(blk)
            except Exception as e:
                b['error'] = str(e)
                blocks.append(b)
                continue
            c = st.cell
            b['cell'] = [c.a, c.b, c.c, c.alpha, c.beta, c.gamma]
            b['V'] = c.volume
            b['hm'] = st.spacegroup_hm
            b['hall'] = st.spacegroup_hall
            b['number'] = st.spacegroup_number
            # raw strings as in the file (gemmi strips quotes)
            raw = {}
            for t in ['_symmetry_space_group_name_H-M', '_space_group_name_H-M_alt', '_space_group_name_H-M', '_symmetry_Int_Tables_number', '_space_group_IT_number', '_space_group_name_Hall', '_symmetry_space_group_name_Hall']:
                v = blk.find_value(t)
                if v is not None:
                    raw[t] = gemmi.cif.as_string(v)
            b['raw_sg'] = raw
            ops = []
            for s in st.symops:
                try:
                    op = gemmi.Op(s)
                    ops.append({'s': s, 'rot': [[x / gemmi.Op.DEN for x in r] for r in op.rot], 'tran': [x / gemmi.Op.DEN for x in op.tran]})
                except Exception as e:
                    ops.append({'s': s, 'error': str(e)})
            b['ops'] = ops
            # columns gemmi does not keep
            tab = blk.find('_atom_site_', ['label', '?type_symbol', '?disorder_assembly', '?disorder_group', '?calc_flag', '?refinement_flags'])
            extra = []
            for row in tab:
                extra.append([row.str(i) if row.has(i) else None for i in range(6)])
            b['extra'] = extra
            sites = []
            for s in st.sites:
                an = s.aniso
                aniso = None
                if an.nonzero():
                    aniso = [[an.u11, an.u12, an.u13], [an.u12, an.u22, an.u23], [an.u13, an.u23, an.u33]]
                sites.append({'label': s.label, 'type': s.type_symbol, 'el': s.element.name, 'f': [s.fract.x, s.fract.y, s.fract.z],
                              'occ': s.occ, 'u': s.u_iso, 'dg': s.disorder_group, 'aniso': aniso,
                              'ueq': ueq_from_aniso(c, aniso) if aniso else None})
            b['sites'] = sites
            blocks.append(b)
        rec['blocks'] = blocks
        out[name] = rec
    json.dump(out, open(sys.argv[1], 'w'))
    print('files', len(files))

main()
