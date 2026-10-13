# P1 supercells of PEA2PbBr4 (expanded with gemmi) with about 2 000, 10 000 and 50 000 atoms. python3 -I gen_big.py
import gemmi, os
W = os.path.dirname(os.path.abspath(__file__))
src = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/examples/PEA2PbBr4.cif'
doc = gemmi.cif.read(src)
blk = [b for b in doc if b.find_value('_cell_length_a')][0]
ss = gemmi.make_small_structure_from_block(blk)
sites = ss.get_all_unit_cell_sites()
print('sites in cell', len(sites))
c = ss.cell
def write(n, name):
    n1, n2, n3 = n
    out = ['data_%s' % name.replace('.cif', ''), "_symmetry_space_group_name_H-M 'P 1'",
           '_cell_length_a %.4f' % (c.a * n1), '_cell_length_b %.4f' % (c.b * n2), '_cell_length_c %.4f' % (c.c * n3),
           '_cell_angle_alpha %.4f' % c.alpha, '_cell_angle_beta %.4f' % c.beta, '_cell_angle_gamma %.4f' % c.gamma,
           'loop_', '_symmetry_equiv_pos_as_xyz', "'x, y, z'",
           'loop_', '_atom_site_label', '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z', '_atom_site_U_iso_or_equiv']
    k = 0
    for i in range(n1):
        for j in range(n2):
            for l in range(n3):
                for s in sites:
                    k += 1
                    f = s.fract
                    out.append('%s%d %s %.5f %.5f %.5f %.4f' % (s.element.name, k, s.element.name, (f.x + i) / n1, (f.y + j) / n2, (f.z + l) / n3, 0.03))
    open(os.path.join(W, 'files', name), 'w').write('\n'.join(out) + '\n')
    print(name, k)
write((2, 2, 3), 'big_2k.cif')       # 188*12 = 2256
write((3, 3, 6), 'big_10k.cif')      # 188*54 = 10152
write((4, 4, 16), 'big_50k.cif')     # 188*256 = 48128
