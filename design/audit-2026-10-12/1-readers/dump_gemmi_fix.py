# Reference: what gemmi reads from each CIF (run with python3 -I).
# usage: python3 -I dump_gemmi.py out.json @list.txt
import sys, json, math, re
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

FIX2 = '--fix2' in sys.argv
if FIX2: sys.argv.remove('--fix2')
FIX = '--fix' in sys.argv
if FIX: sys.argv.remove('--fix')
def repair(text):
    lines = text.replace('\r\n', '\n').split('\n')
    # drop text before the first data_ line
    k = next(i for i, l in enumerate(lines) if l.startswith('data_'))
    lines = lines[k:]
    out = []
    for l in lines:
        if l.startswith('data_'):
            l = l.split()[0]
        m = re.match(r"^(_\S+)\s+(.*)$", l)
        if m and m.group(2) and m.group(2)[0] not in "'\";" and ' ' in m.group(2).strip():
            v = m.group(2).strip()
            l = m.group(1) + ' "' + v + '"'
        if m and m.group(2).startswith("'") and m.group(2).count("'") == 1:
            l = m.group(1) + ' ' + m.group(2) + "'"
        out.append(l)
    return '\n'.join(out)
def repair2(text):
    # keep, for each data block, its data_ name and the lines from the first _cell_/_symmetry_/_space_group_ item or loop on
    lines = text.replace('\r\n', '\n').split('\n')
    out = []
    seen_names = []
    state = 'skip'
    for i, l in enumerate(lines):
        if l.startswith('data_'):
            nm = l.split()[0]
            seen_names.append(nm)
            out.append(nm + ('__dup%d' % seen_names.count(nm) if seen_names.count(nm) > 1 else '')); state = 'head'; continue
        if state == 'head':
            if re.match(r'^(_cell_|_symmetry_|_space_group_|_exptl_)', l) or (l.strip() == 'loop_' and i + 1 < len(lines) and re.match(r'^\s*_(symmetry|space_group)', lines[i + 1])):
                state = 'keep'
            else:
                continue
        if state == 'keep':
            out.append(l)
    t = repair('\n'.join(out))
    # drop the geometry loops (not needed here) and give empty items a '?'
    L = t.split('\n'); res = []; i = 0
    while i < len(L):
        l = L[i]
        if l.strip() == 'loop_' and i + 1 < len(L) and L[i + 1].strip().startswith('_geom_'):
            i += 1
            while i < len(L) and not L[i].startswith('data_') and not (L[i].strip() == 'loop_') and not (L[i].startswith('_') and not L[i].strip().startswith('_geom_')):
                i += 1
            continue
        if re.match(r'^_\S+\s*$', l) and i + 1 < len(L) and (L[i + 1].startswith('_') or L[i + 1].startswith('loop_') or L[i + 1].strip() == '' or L[i + 1].startswith('data_')):
            l = l.rstrip() + ' ?'
        res.append(l); i += 1
    return '\n'.join(res)
def load(f):
    if '--fix2' in sys.argv[0:0] or FIX2:
        return gemmi.cif.read_string(repair2(open(f, encoding='utf-8', errors='replace').read()))
    if not FIX:
        return gemmi.cif.read(f)
    return gemmi.cif.read_string(repair(open(f, encoding='utf-8', errors='replace').read()))
def main():
    out = {}
    files = sys.argv[2:]
    if len(files) == 1 and files[0].startswith('@'):
        files = [l for l in open(files[0][1:]).read().split('\n') if l]
    for f in files:
        name = f.split('/')[-1]
        rec = {'name': name}
        try:
            doc = load(f)
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
