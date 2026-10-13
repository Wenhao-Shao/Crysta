# constructed CIFs for the disorder / cell-contents findings (own construction from the case texts)
import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cases')
def cif(name, a, b, c, al, be, ga, ops, sites, extra=''):
    s = f"data_{name}\n_cell_length_a {a}\n_cell_length_b {b}\n_cell_length_c {c}\n_cell_angle_alpha {al}\n_cell_angle_beta {be}\n_cell_angle_gamma {ga}\n{extra}"
    if ops:
        s += "loop_\n_symmetry_equiv_pos_as_xyz\n" + ''.join(f"'{o}'\n" for o in ops)
    s += "loop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n_atom_site_occupancy\n"
    for st in sites: s += ' '.join(str(x) for x in st) + '\n'
    open(os.path.join(D, name + '.cif'), 'w').write(s)
P1 = ['x,y,z']; Pm1 = ['x,y,z', '-x,y,z']; Pb1 = ['x,y,z', '-x,-y,-z']
# A1-01: mirror; split pair Br 0.6/0.4 (0.3 A apart), N 0.5 at 0.1 A from the mirror (copies 0.2 A apart), H 0.5/0.5 coincident (0.05 A)
cif('dv_occsum', 10, 10, 10, 90, 90, 90, Pm1, [('Br1A','Br',0.25,0.25,0.25,0.6), ('Br1B','Br',0.28,0.25,0.25,0.4), ('N1','N',0.01,0.5,0.5,0.5), ('H1A','H',0.3,0.7,0.7,0.5), ('H1B','H',0.3,0.7,0.705,0.5)], '_cell_formula_units_Z 1\n')
# A2-01: P1 split pair Cl 0.6/0.4 0.5 A apart plus Na
cif('dv_split_unflagged', 10, 10, 10, 90, 90, 90, P1, [('Na1','Na',0,0,0,1), ('Cl1','Cl',0.5,0.5,0.5,0.6), ('Cl2','Cl',0.55,0.5,0.5,0.4)])
# A2-01: P-1, Cl 0.5 at 0.2 A off the inversion centre (copies 0.4 A apart)
cif('dv_half_040', 10, 10, 10, 90, 90, 90, Pb1, [('Na1','Na',0,0,0,1), ('Cl1','Cl',0.52,0.5,0.5,0.5)])
# A2-02: two different sites 0.05 A apart, each 0.5
cif('dv_coincident_half', 10, 10, 10, 90, 90, 90, P1, [('Na1','Na',0,0,0,1), ('Cl1','Cl',0.5,0.5,0.5,0.5), ('Cl2','Cl',0.505,0.5,0.5,0.5)])
# A2-02: P-1, H1 and H2 (its inversion image) each 0.5
cif('dv_symdup_half', 10, 10, 10, 90, 90, 90, Pb1, [('Na1','Na',0,0,0,1), ('H1','H',0.2,0.3,0.4,0.5), ('H2','H',-0.2,-0.3,-0.4,0.5)])
# A2-02 / A4-01: P-1, Cl 0.5 at 0.025 A off the inversion centre (copies 0.05 A apart)
cif('dv_half_005', 10, 10, 10, 90, 90, 90, Pb1, [('Na1','Na',0,0,0,1), ('Cl1','Cl',0.5025,0.5,0.5,0.5)])
# control: a true special position written with 4 decimals
cif('dv_special', 10, 10, 10, 90, 90, 90, Pb1, [('Na1','Na',0,0,0,1), ('Cl1','Cl',0.5000,0.5,0.5,1.0)])
