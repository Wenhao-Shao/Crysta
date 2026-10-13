# Odd cells, settings and dimensionalities. python3 -I gen_odd.py ; writes files/odd_*.cif and out/odd_ref.json (gemmi atom counts)
import gemmi, os, json, math
W = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(W, 'files')

def cif(block, cell, atoms, hm=None, num=None, ops=None, hall=None):
    s = 'data_%s\n' % block
    if hm is not None: s += "_symmetry_space_group_name_H-M '%s'\n" % hm
    if hall is not None: s += "_symmetry_space_group_name_Hall '%s'\n" % hall
    if num is not None: s += '_symmetry_Int_Tables_number %s\n' % num
    for t, v in zip(['_cell_length_a', '_cell_length_b', '_cell_length_c', '_cell_angle_alpha', '_cell_angle_beta', '_cell_angle_gamma'], cell):
        s += '%s %s\n' % (t, v)
    if ops:
        s += 'loop_\n_symmetry_equiv_pos_as_xyz\n' + ''.join("'%s'\n" % o for o in ops)
    s += 'loop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n'
    for a in atoms: s += '%s %s %s %s %s\n' % a
    return s

files = {}
# hexagonal, symbol only
files['odd_wurtzite_P63mc.cif'] = cif('ZnO', (3.2495, 3.2495, 5.2069, 90, 90, 120), [('Zn1', 'Zn', '0.33333', '0.66667', '0'), ('O1', 'O', '0.33333', '0.66667', '0.3819')], hm='P 63 m c')
# rhombohedral calcite, hexagonal axes, symbol only
cal_hex = [('Ca1', 'Ca', 0, 0, 0), ('C1', 'C', 0, 0, 0.25), ('O1', 'O', 0.2578, 0, 0.25)]
files['odd_calcite_R-3c_hex.cif'] = cif('calcite_hex', (4.9896, 4.9896, 17.0610, 90, 90, 120), cal_hex, hm='R -3 c')
# the same in rhombohedral axes: convert with the standard obverse relation  r = M h, from gemmi
hexc = gemmi.UnitCell(4.9896, 4.9896, 17.0610, 90, 90, 120)
# rhombohedral basis vectors in hexagonal fractions (obverse): a_r = (2/3,1/3,1/3), b_r = (-1/3,1/3,1/3), c_r = (-1/3,-2/3,1/3)
import numpy as np
Hm = np.array(hexc.orth.mat.tolist())
P = np.array([[2/3, -1/3, -1/3], [1/3, 1/3, -2/3], [1/3, 1/3, 1/3]])  # columns: a_r, b_r, c_r in hex fractions
R = Hm @ P
ar = [np.linalg.norm(R[:, k]) for k in range(3)]
ang = lambda u, v: math.degrees(math.acos(np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v)))
al = ang(R[:, 1], R[:, 2]); be = ang(R[:, 0], R[:, 2]); ga = ang(R[:, 0], R[:, 1])
Pi = np.linalg.inv(P)
cal_rh = []
for lab, el, x, y, z in cal_hex:
    f = Pi @ np.array([x, y, z], float)
    cal_rh.append((lab, el, '%.5f' % (f[0] % 1), '%.5f' % (f[1] % 1), '%.5f' % (f[2] % 1)))
rcell = tuple('%.4f' % v for v in ar) + tuple('%.3f' % v for v in (al, be, ga))
files['odd_calcite_R-3c_rhombo_symbol.cif'] = cif('calcite_rh', rcell, cal_rh, hm='R -3 c')
files['odd_calcite_R-3c_rhombo_colonR.cif'] = cif('calcite_rhR', rcell, cal_rh, hm='R -3 c :R')
files['odd_calcite_rhombo_number_only.cif'] = cif('calcite_rhn', rcell, cal_rh, num=167)
# non-standard monoclinic settings, symbol only (a general position, so every operator gives a new atom)
gen = [('Pb1', 'Pb', 0.1234, 0.2345, 0.3456), ('Br1', 'Br', 0.3, 0.05, 0.12)]
mono = (8.0, 9.0, 10.0, 90, 103.5, 90)
for hm, tag in [('P 1 21/n 1', 'P21n'), ('P 21/a', 'P21a'), ('I 1 2/a 1', 'I2a'), ('C 1 2/c 1', 'C2c'), ('P 1 1 21/b', 'P1121b')]:
    cell = mono if tag != 'P1121b' else (8.0, 9.0, 10.0, 90, 90, 103.5)
    files['odd_mono_%s.cif' % tag] = cif('mono_' + tag, cell, gen, hm=hm)
# orthorhombic non-standard settings and the new e symbols
ortho = (8.0, 9.0, 10.0, 90, 90, 90)
for hm, tag in [('P b n m', 'Pbnm'), ('P n 21 a', 'Pn21a'), ('C m c e', 'Cmce'), ('C m c a', 'Cmca'), ('A e m 2', 'Aem2'), ('C m m e', 'Cmme'), ('C c c e', 'Ccce'), ('A e a 2', 'Aea2'), ('P b c a', 'Pbca'), ('B b c b', 'Bbcb')]:
    files['odd_ortho_%s.cif' % tag] = cif('ortho_' + tag, ortho, gen, hm=hm)
# 0D, 1D, 3D, no H, only H, one atom
files['odd_0D_K2PtCl6.cif'] = cif('K2PtCl6', (9.755, 9.755, 9.755, 90, 90, 90), [('K1', 'K', 0.25, 0.25, 0.25), ('Pt1', 'Pt', 0, 0, 0), ('Cl1', 'Cl', 0.2398, 0, 0)], hm='F m -3 m')
files['odd_1D_chain.cif'] = cif('chain1D', (5.9, 12.0, 12.0, 90, 90, 90), [('Pb1', 'Pb', 0, 0.5, 0.5), ('Br1', 'Br', 0.5, 0.5, 0.5), ('Br2', 'Br', 0, 0.75, 0.5), ('Br3', 'Br', 0, 0.25, 0.5), ('Br4', 'Br', 0, 0.5, 0.75), ('Br5', 'Br', 0, 0.5, 0.25)], ops=['x,y,z'])
files['odd_3D_CsPbBr3.cif'] = cif('CsPbBr3', (5.874, 5.874, 5.874, 90, 90, 90), [('Cs1', 'Cs', 0.5, 0.5, 0.5), ('Pb1', 'Pb', 0, 0, 0), ('Br1', 'Br', 0.5, 0, 0)], hm='P m -3 m')
files['odd_onlyH_H2.cif'] = cif('H2', (3.8, 3.8, 6.2, 90, 90, 120), [('H1', 'H', 0.3333, 0.6667, 0.19), ('H2', 'H', 0.3333, 0.6667, 0.31)], ops=['x,y,z'])
files['odd_one_H.cif'] = cif('oneH', (5, 5, 5, 90, 90, 90), [('H1', 'H', 0, 0, 0)], ops=['x,y,z'])
files['odd_one_Pb.cif'] = cif('onePb', (5, 5, 5, 90, 90, 90), [('Pb1', 'Pb', 0.1, 0.2, 0.3)], ops=['x,y,z'])
files['odd_fcc_Cu.cif'] = cif('Cu', (3.615, 3.615, 3.615, 90, 90, 90), [('Cu1', 'Cu', 0, 0, 0)], hm='F m -3 m')
files['odd_Ar_fcc.cif'] = cif('Ar', (5.26, 5.26, 5.26, 90, 90, 90), [('Ar1', 'Ar', 0, 0, 0)], hm='F m -3 m')
files['odd_diamond_Fd-3m.cif'] = cif('diamond', (3.567, 3.567, 3.567, 90, 90, 90), [('C1', 'C', 0.125, 0.125, 0.125)], hm='F d -3 m')
files['odd_diamond_Fd-3m_origin1.cif'] = cif('diamond1', (3.567, 3.567, 3.567, 90, 90, 90), [('C1', 'C', 0, 0, 0)], hm='F d -3 m :1')
files['odd_triclinic_P-1_obtuse.cif'] = cif('tric', (7.1, 8.3, 9.9, 112.3, 97.4, 121.8), gen, hm='P -1')
files['odd_hall_only.cif'] = cif('hallonly', mono, gen, hall='-P 2yn')
files['odd_no_symmetry_info.cif'] = cif('nosym', mono, gen)
ref = {}
for n, t in files.items():
    open(os.path.join(F, n), 'w').write(t)
    try:
        doc = gemmi.cif.read_string(t)
        ss = gemmi.make_small_structure_from_block(doc.sole_block())
        if ss.spacegroup is None and 'Hall' not in t and 'equiv_pos' not in t:
            ref[n] = {'gemmi': None, 'note': 'gemmi found no space group'}
            continue
        sites = ss.get_all_unit_cell_sites()
        ref[n] = {'gemmi_atoms': len(sites), 'sg': ss.spacegroup.xhm() if ss.spacegroup else None, 'V': round(ss.cell.volume, 2)}
    except Exception as e:
        ref[n] = {'error': str(e)}
json.dump(ref, open(os.path.join(W, 'out', 'odd_ref.json'), 'w'), indent=1)
for k, v in ref.items(): print(k, v)
