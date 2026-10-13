"""FHI-aims geometry.in -> P1 CIF (my own parser), U = 1/(8 pi^2) (Crysta's default B = 1)"""
import sys, math, numpy as np
L = []; atoms = []
for line in open(sys.argv[1]):
    t = line.split()
    if not t or t[0].startswith('#'): continue
    if t[0] == 'lattice_vector': L.append([float(x) for x in t[1:4]])
    elif t[0] in ('atom', 'atom_frac'): atoms.append((t[0], [float(x) for x in t[1:4]], t[4]))
L = np.array(L)
a, b, c = (np.linalg.norm(v) for v in L)
ang = lambda u, v: math.degrees(math.acos(np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v)))
al, be, ga = ang(L[1], L[2]), ang(L[0], L[2]), ang(L[0], L[1])
inv = np.linalg.inv(L)
u = 1 / (8 * math.pi ** 2)
out = ["data_aims", "_cell_length_a %.8f" % a, "_cell_length_b %.8f" % b, "_cell_length_c %.8f" % c, "_cell_angle_alpha %.8f" % al, "_cell_angle_beta %.8f" % be, "_cell_angle_gamma %.8f" % ga,
       "loop_", "_space_group_symop_operation_xyz", "'x,y,z'", "loop_", "_atom_site_label", "_atom_site_type_symbol", "_atom_site_fract_x", "_atom_site_fract_y", "_atom_site_fract_z", "_atom_site_U_iso_or_equiv"]
for i, (kind, v, el) in enumerate(atoms):
    f = v if kind == 'atom_frac' else list(np.array(v) @ inv)
    out.append("%s%d %s %.10f %.10f %.10f %.8f" % (el, i, el, f[0], f[1], f[2], u))
open(sys.argv[2], 'w').write("\n".join(out) + "\n")
