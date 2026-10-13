"""Made-up 2D perovskite layers with known geometry. Every file is P1 (all atoms listed).
Known values are written to synth/expected.json from the construction (not computed by any analysis code)."""
import numpy as np, math, json, os
D = os.path.dirname(os.path.abspath(__file__)) + '/synth'
d = 3.0                                  # Pb-Br bond length
e1 = np.array([1, 1, 0]) / math.sqrt(2); e2 = np.array([1, -1, 0]) / math.sqrt(2); e3 = np.array([0, 0, 1.0])
def rot(axis, ang):
    axis = axis / np.linalg.norm(axis); a = math.radians(ang)
    K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
    return np.eye(3) + math.sin(a) * K + (1 - math.cos(a)) * K @ K
def cellpar(A, B, C):
    L = [np.linalg.norm(v) for v in (A, B, C)]
    ang = lambda u, v: math.degrees(math.acos(u @ v / np.linalg.norm(u) / np.linalg.norm(v)))
    return L + [ang(B, C), ang(A, C), ang(A, B)]
def write_cif(name, A, B, C, atoms):
    """atoms: list of (label, el, cartesian). Writes fractional coordinates for the cell (A, B, C)."""
    M = np.array([A, B, C]).T
    Mi = np.linalg.inv(M)
    a, b, c, al, be, ga = cellpar(A, B, C)
    # the CIF cell is re-oriented by any reader; fractional coordinates do not depend on the orientation
    lines = ['data_' + name, '_symmetry_space_group_name_H-M \'P 1\'', 'loop_', '_symmetry_equiv_pos_as_xyz', 'x,y,z',
             '_cell_length_a %.6f' % a, '_cell_length_b %.6f' % b, '_cell_length_c %.6f' % c,
             '_cell_angle_alpha %.6f' % al, '_cell_angle_beta %.6f' % be, '_cell_angle_gamma %.6f' % ga,
             'loop_', '_atom_site_label', '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z']
    for lab, el, x in atoms:
        f = Mi @ x
        f = f - np.floor(f)
        lines.append('%s %s %.8f %.8f %.8f' % (lab, el, *f))
    open(D + '/' + name + '.cif', 'w').write('\n'.join(lines) + '\n')

def methylammonium(N, up, tag):
    """N at N, C above it along +up (or -up), 3 H on N staggered. Returns atoms."""
    u = up / np.linalg.norm(up)
    C = N - 1.48 * u                      # C points away from the layer (u points into the layer)
    perp = np.cross(u, [0.3, 0.7, 0.1]); perp /= np.linalg.norm(perp); perp2 = np.cross(u, perp)
    out = [('N' + tag, 'N', N), ('C' + tag, 'C', C)]
    for k in range(3):
        ang = 2 * math.pi * k / 3
        h = N + 1.03 * (math.cos(math.radians(70.5)) * u + math.sin(math.radians(70.5)) * (math.cos(ang) * perp + math.sin(ang) * perp2))
        out.append(('H' + tag + 'N%d' % k, 'H', h))
    for k in range(3):
        ang = 2 * math.pi * k / 3 + math.pi / 3
        h = C + 1.09 * (-math.cos(math.radians(70.5)) * u + math.sin(math.radians(70.5)) * (math.cos(ang) * perp + math.sin(ang) * perp2))
        out.append(('H' + tag + 'C%d' % k, 'H', h))
    return out

exp = {}
def layer(kind, ang, cz, shift, name, pen=0.5, extra_tilt_c=None):
    """kind 'rot': octahedra rotated about the normal by +/-ang; 'tilt': tilted about e1 by +/-ang.
    shift: in-plane shift of the next layer in units of the two M...M vectors (p1, p2)."""
    if kind == 'rot': R1, R2 = rot(e3, ang), rot(e3, -ang)
    else: R1, R2 = rot(e1, ang), rot(e1, -ang)
    M1 = np.zeros(3)
    M2a = d * (R1 @ e1 + R2 @ e1)          # via the e1 bridge
    M2b = d * (R1 @ e2 + R2 @ e2)          # via the e2 bridge
    t1 = M2a - M2b * 1.0; t2 = M2a + M2b  # lattice vectors: M1 -> M1 through M2 along e1 then -e2 / +e2
    # check that t1 and t2 are lattice translations in the plane
    atoms = [('Pb1', 'Pb', M1), ('Pb2', 'Pb', M2a)]
    atoms += [('Br1', 'Br', M1 + d * R1 @ e1), ('Br2', 'Br', M1 + d * R1 @ e2), ('Br3', 'Br', M1 + d * R1 @ e3), ('Br4', 'Br', M1 - d * R1 @ e3),
              ('Br5', 'Br', M1 - d * R1 @ e1), ('Br6', 'Br', M1 - d * R1 @ e2), ('Br7', 'Br', M2a + d * R2 @ e3), ('Br8', 'Br', M2a - d * R2 @ e3)]
    # p1, p2: the in-plane M...M vectors of the bridges
    p1 = M2a; p2 = M2b
    C = shift[0] * p1 + shift[1] * p2 + cz * e3
    # ammonium N: above the cavity between 4 metals (in-plane at (p1+p2)/2 ... use the centre of M1, M2a, M2b, t-cell)
    top = np.mean([x[2] @ e3 for x in atoms if x[0] in ('Br3', 'Br7')])
    bot = np.mean([x[2] @ e3 for x in atoms if x[0] in ('Br4', 'Br8')])
    cav = (M1 + p1 / 1 + p2) / 2 * 1.0
    cav = 0.5 * (p1 + p2) if kind else cav
    cav_in = cav - (cav @ e3) * e3
    Nt = cav_in + (top - pen) * e3
    Nb = cav_in + (bot + pen) * e3
    atoms += methylammonium(Nt, -e3, 'a') + methylammonium(Nb, e3, 'b')
    write_cif(name, t1, t2, C, atoms)
    # expected values from the construction
    if kind == 'rot':
        th, thin, thout, tilt = 180 - 2 * ang, 180 - 2 * ang, 180.0, 0.0
    else:
        th, thin, thout, tilt = 180 - 2 * ang, 180.0, 180 - 2 * ang, ang
    s = [abs(x - round(x)) for x in shift]
    exp[name] = dict(theta_bridges=sorted([th, th] if kind == 'rot' else [th, 180.0]), thetaIn=sorted([thin, thin] if kind == 'rot' else [180.0, thin]),
                     thetaOut=sorted([thout, thout] if kind == 'rot' else [thout, 180.0]), axial_tilt=tilt, slab=top - bot, spacing=cz, gallery=cz - (top - bot),
                     penetration=pen, offset=sorted(s, reverse=True), n=1, deltaD=0.0, sigma2=0.0, MX=d,
                     cell=cellpar(t1, t2, C))
layer('rot', 10, 16.0, (0, 0), 'rot10_DJ')
layer('rot', 10, 16.0, (0.5, 0.5), 'rot10_RP')
layer('tilt', 12, 16.0, (0, 0), 'tilt12_DJ')
layer('tilt', 12, 16.0, (0.5, 0.5), 'tilt12_RP')
layer('tilt', 12, 15.0, (0.3, 0.1), 'tilt12_off31')
layer('rot', 15, 17.0, (0.5, 0.0), 'rot15_half0', pen=0.8)
layer('rot', 0.0001, 16.0, (0.5, 0.5), 'flat_RP', pen=-0.3)
json.dump(exp, open(D + '/expected.json', 'w'), indent=1)
for k, v in exp.items(): print(k, [round(x, 3) for x in v['cell']])
