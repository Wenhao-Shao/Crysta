"""Task 5: made-up cells with known answers. Crysta (buildCell + analyse) against hand values and the gemmi expansion."""
import json, os, subprocess, sys, collections, math
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, mic
W = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(W, 't5_files')
def cif(name, cell, tags, atoms, ops=None, extra=''):
    L = ['data_' + name] + ['_cell_length_a %s' % cell[0], '_cell_length_b %s' % cell[1], '_cell_length_c %s' % cell[2],
         '_cell_angle_alpha %s' % cell[3], '_cell_angle_beta %s' % cell[4], '_cell_angle_gamma %s' % cell[5]]
    L += [("%s %s" if k.endswith(('number', '_Z')) else "%s '%s'") % (k, v) for k, v in tags]
    if ops:
        L += ['loop_', '_space_group_symop_operation_xyz'] + ["'%s'" % o for o in ops]
    L += ['loop_', '_atom_site_label', '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z', '_atom_site_occupancy']
    L += ['%s %s %s %s %s %s' % a for a in atoms]
    fn = os.path.join(D, name + '.cif'); open(fn, 'w').write('\n'.join(L) + '\n' + extra); return fn
cases = []
HM = '_symmetry_space_group_name_H-M'
nacl = (5.640, 5.640, 5.640, 90, 90, 90)
cases.append(cif('nacl_fm3m', nacl, [(HM, 'F m -3 m')], [('Na1', 'Na', 0, 0, 0, 1), ('Cl1', 'Cl', 0.5, 0.5, 0.5, 1)]))
cases.append(cif('nacl_fm3m_Z4', nacl, [(HM, 'F m -3 m'), ('_cell_formula_units_Z', 4)], [('Na1', 'Na', 0, 0, 0, 1), ('Cl1', 'Cl', 0.5, 0.5, 0.5, 1)]))
cases.append(cif('nacl_x1', nacl, [(HM, 'F m -3 m')], [('Na1', 'Na', '1.0000', '0.0000', '-0.0000', 1), ('Cl1', 'Cl', '0.5000', '0.5000', '-0.5000', 1)]))
cases.append(cif('nacl_x1b', nacl, [(HM, 'F m -3 m')], [('Na1', 'Na', '0.99999', '1.00001', '-0.00001', 1), ('Cl1', 'Cl', '0.49999', '0.50001', '0.5', 1)]))
cases.append(cif('nacl_occ05', nacl, [(HM, 'F m -3 m'), ('_cell_formula_units_Z', 4)], [('Na1', 'Na', 0, 0, 0, 1), ('Cl1', 'Cl', 0.5, 0.5, 0.5, 0.5)]))
cases.append(cif('cscl', (4.123, 4.123, 4.123, 90, 90, 90), [(HM, 'P m -3 m')], [('Cs1', 'Cs', 0, 0, 0, 1), ('Cl1', 'Cl', 0.5, 0.5, 0.5, 1)]))
# Bi2Te3, R-3m, hexagonal axes (a=4.386, c=30.497), Bi (0,0,0.4001), Te1 (0,0,0), Te2 (0,0,0.2095)
hx = (4.386, 4.386, 30.497, 90, 90, 120)
bt = [('Bi1', 'Bi', 0, 0, 0.4001, 1), ('Te1', 'Te', 0, 0, 0, 1), ('Te2', 'Te', 0, 0, 0.2095, 1)]
cases.append(cif('bi2te3_hex_hm', hx, [(HM, 'R -3 m')], bt))
cases.append(cif('bi2te3_hex_hmH', hx, [(HM, 'R -3 m :H')], bt))
# rhombohedral axes: a_r = sqrt(a^2/3 + c^2/9), cos(alpha) = (2c^2 - 3a^2)/(2c^2 + 6a^2); (x,x,x) with x = z_hex
a, c = 4.386, 30.497
ar = math.sqrt(a * a / 3 + c * c / 9); al = math.degrees(math.acos((2 * c * c - 3 * a * a) / (2 * c * c + 6 * a * a)))
rh = ('%.5f' % ar, '%.5f' % ar, '%.5f' % ar, '%.4f' % al, '%.4f' % al, '%.4f' % al)
btr = [('Bi1', 'Bi', 0.4001, 0.4001, 0.4001, 1), ('Te1', 'Te', 0, 0, 0, 1), ('Te2', 'Te', 0.2095, 0.2095, 0.2095, 1)]
cases.append(cif('bi2te3_rho_hm', rh, [(HM, 'R -3 m')], btr))
cases.append(cif('bi2te3_rho_hmR', rh, [(HM, 'R -3 m :R')], btr))
cases.append(cif('bi2te3_rho_num', rh, [('_space_group_IT_number', 166)], btr))
cases.append(cif('bi2te3_hex_num', hx, [('_space_group_IT_number', 166)], bt))
# triclinic P-1, all angles != 90
tri = (7.123, 8.456, 9.789, 73.21, 81.45, 67.89)
cases.append(cif('tri_p1bar', tri, [(HM, 'P -1')], [('Fe1', 'Fe', 0, 0, 0, 1), ('Cl1', 'Cl', 0.2134, 0.3456, 0.1234, 1), ('O1', 'O', 0.5, 0.5, 0, 1)]))
# non-standard settings, symbol only and with listed operators
ns = [('P 1 1 21/b', (7.1, 8.3, 9.2, 90, 90, 104.5)), ('B 1 1 2/b', (7.1, 8.3, 9.2, 90, 90, 104.5)), ('I 1 2/a 1', (7.1, 8.3, 9.2, 90, 101.5, 90))]
for i, (sym, cell) in enumerate(ns):
    at = [('Fe1', 'Fe', 0, 0, 0, 1), ('C1', 'C', 0.3199, 0.0417, 0.3922, 1), ('O1', 'O', 0.25, 0.25, 0.25, 1)]
    cases.append(cif('ns%d_hm' % i, cell, [(HM, sym)], at))
    ops = [op.triplet() for op in gemmi.find_spacegroup_by_name(sym).operations()]
    cases.append(cif('ns%d_ops' % i, cell, [(HM, sym)], at, ops=ops))
# atom on a special position with occupancy 0.5, and a half atom 0.10 A / 0.40 A off an inversion centre (P-1, a=10)
cub = (10, 10, 10, 90, 90, 90)
cases.append(cif('half_on_centre', cub, [(HM, 'P -1')], [('Na1', 'Na', 0.5, 0.5, 0.5, 1), ('Cl1', 'Cl', 0, 0, 0, 0.5)]))
cases.append(cif('half_010_off', cub, [(HM, 'P -1')], [('Na1', 'Na', 0.5, 0.5, 0.5, 1), ('Cl1', 'Cl', 0.005, 0, 0, 0.5)]))
cases.append(cif('half_040_off', cub, [(HM, 'P -1')], [('Na1', 'Na', 0.5, 0.5, 0.5, 1), ('Cl1', 'Cl', 0.02, 0, 0, 0.5)]))
# unflagged split site 0.5 A apart, occupancies 0.6/0.4; and two coincident half sites
cases.append(cif('split_unflagged', cub, [(HM, 'P 1')], [('Na1', 'Na', 0.5, 0.5, 0.5, 1), ('Cl1', 'Cl', 0, 0, 0, 0.6), ('Cl2', 'Cl', 0.05, 0, 0, 0.4)]))
cases.append(cif('split_flagged', cub, [(HM, 'P 1')], [('Na1', 'Na', 0.5, 0.5, 0.5, 1, '.'), ('Cl1', 'Cl', 0, 0, 0, 0.6, 1), ('Cl2', 'Cl', 0.05, 0, 0, 0.4, 2)]) if False else None)
cases = [c for c in cases if c]
# flagged split written separately (needs the disorder-group column)
fn = os.path.join(D, 'split_flagged.cif')
open(fn, 'w').write('\n'.join(['data_split_flagged', '_cell_length_a 10', '_cell_length_b 10', '_cell_length_c 10', '_cell_angle_alpha 90', '_cell_angle_beta 90', '_cell_angle_gamma 90',
    "_symmetry_space_group_name_H-M 'P 1'", 'loop_', '_atom_site_label', '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z', '_atom_site_occupancy',
    '_atom_site_disorder_assembly', '_atom_site_disorder_group', 'Na1 Na 0.5 0.5 0.5 1 . .', 'Cl1 Cl 0 0 0 0.6 A 1', 'Cl2 Cl 0.05 0 0 0.4 A 2']) + '\n'); cases.append(fn)
cases.append(cif('coincident_half', cub, [(HM, 'P 1')], [('Na1', 'Na', 0.5, 0.5, 0.5, 1), ('Cl1', 'Cl', 0, 0, 0, 0.5), ('Cl2', 'Cl', 0.005, 0, 0, 0.5)]))
cases.append(cif('symdup_half', cub, [(HM, 'P -1')], [('Na1', 'Na', 0.5, 0.5, 0.5, 1), ('H1', 'H', 0.1, 0.12, 0.13, 0.5), ('H2', 'H', -0.1, -0.12, -0.13, 0.5)]))
cases.append(cif('nacl_Znonint', nacl, [(HM, 'F m -3 m'), ('_cell_formula_units_Z', '3.9999')], [('Na1', 'Na', 0, 0, 0, 1), ('Cl1', 'Cl', 0.5, 0.5, 0.5, 1)]))
json.dump(cases, open(os.path.join(W, 't5_files.json'), 'w'))
subprocess.run(['node', os.path.join(W, 'dump_cells.js'), os.path.join(W, 't5_files.json'), os.path.join(W, 't5_crysta.json')], check=True)
cr = {os.path.basename(r['file']): r for r in json.load(open(os.path.join(W, 't5_crysta.json')))}
NA = 6.02214076e23
out = []
for fn in cases:
    name = os.path.basename(fn); rec = cr[name]
    if rec['error']: print(name, 'ERROR', rec['error']); continue
    s = rec['structures'][0]
    doc = gemmi.cif.read(fn); b = doc.sole_block(); small = gemmi.make_small_structure_from_block(b)
    ops, how = block_ops(b, small)
    ref, near, M = expand(small, ops, 0.01)   # reference: only exact coincidence is a special position
    occ = collections.defaultdict(float); n = collections.Counter()
    for a in ref: occ[a[1]] += a[3]; n[a[1]] += 1
    mass = sum(gemmi.Element(e).weight * v for e, v in occ.items()); V = small.cell.volume
    cn = collections.Counter(a[0] for a in s['atomsAll'])
    row = {'file': name, 'symSource': s['meta']['symSource'], 'nops': s['nops'], 'nops_ref': len(ops),
           'n_crysta': dict(cn), 'n_ref': dict(n), 'occ_crysta': {k: round(v, 4) for k, v in s['counts'].items()}, 'occ_ref': {k: round(v, 4) for k, v in occ.items()},
           'Z': s['info']['Z'], 'formula': ' '.join('%s%g' % (f['el'], f['n']) for f in s['info']['formula']),
           'M': round(s['info']['formulaMass'], 3), 'rho': round(s['info']['density'], 4), 'rho_ref': round(mass / (NA * V * 1e-24), 4),
           'V': round(s['cell']['V'], 3), 'V_ref': round(V, 3)}
    out.append(row)
    flag = '' if (row['occ_crysta'] == row['occ_ref'] and abs(row['rho'] - row['rho_ref']) < 2e-4 and row['n_crysta'] == row['n_ref']) else '   <-- DIFF'
    print(name, row['symSource'], 'ops', row['nops'], '/', row['nops_ref'], '| n', row['n_crysta'], 'ref', row['n_ref'], '| occ', row['occ_crysta'], 'ref', row['occ_ref'],
          '| Z', row['Z'], row['formula'], 'M', row['M'], 'rho', row['rho'], 'ref', row['rho_ref'], 'V', row['V'], row['V_ref'], flag)
json.dump(out, open(os.path.join(W, 't5_result.json'), 'w'), indent=0)
# analytic checks
V_tri = tri[0] * tri[1] * tri[2] * math.sqrt(1 - sum(math.cos(math.radians(x)) ** 2 for x in tri[3:]) + 2 * math.prod(math.cos(math.radians(x)) for x in tri[3:]))
print('triclinic V analytic %.4f' % V_tri, '| NaCl rho hand %.4f' % (4 * (22.98977 + 35.453) / (NA * 5.64 ** 3 * 1e-24)), '| CsCl rho hand %.4f' % ((132.90545 + 35.453) / (NA * 4.123 ** 3 * 1e-24)))
print('Bi2Te3: hex V/3 = %.3f, rho V = %.3f' % (gemmi.UnitCell(*hx).volume / 3, gemmi.UnitCell(*[float(x) for x in rh]).volume))
