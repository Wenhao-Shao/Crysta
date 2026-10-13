"""Two FHI-aims geometry.in files with the same four C atoms (Cartesian), one with right-handed and one with left-handed
lattice vectors. The torsion C1-C2-C3-C4 in the file's own Cartesian coordinates is +60.0 deg (IUPAC sign) by construction."""
import numpy as np, math, os
D = os.path.dirname(os.path.abspath(__file__)) + '/synth'
q = np.array([5.0, 5.0, 5.0]); r = q + [0, 0, 1.54]
p = q + [1.45, 0, -0.5]
# s: rotate the direction of p-q (projected) by +60 deg clockwise seen looking from q to r (along +z): clockwise seen along +z is a
# rotation by -60 deg about +z in the usual counterclockwise convention... check numerically below
ang = math.radians(-60)
s = r + [1.45 * math.cos(ang), 1.45 * math.sin(ang), 0.5]
def tors(p, q, r, s):
    ax = (r - q) / np.linalg.norm(r - q)
    u = (p - q) - ((p - q) @ ax) * ax; v = (s - r) - ((s - r) @ ax) * ax
    a = math.degrees(math.acos(u @ v / np.linalg.norm(u) / np.linalg.norm(v)))
    return a if np.cross(u, v) @ ax > 0 else -a
t = tors(p, q, r, s)
if t < 0:
    ang = -ang; s = r + [1.45 * math.cos(ang), 1.45 * math.sin(ang), 0.5]; t = tors(p, q, r, s)
print('torsion in the file coordinates: %.3f' % t)
for name, vecs in (('hand_right_geometry.in', [[12, 0, 0], [0, 12, 0], [0, 0, 12]]), ('hand_left_geometry.in', [[12, 0, 0], [0, 0, 12], [0, 12, 0]])):
    print(name, 'det', np.linalg.det(np.array(vecs, float)))
    with open(os.path.join(D, name), 'w') as fh:
        for v in vecs: fh.write('lattice_vector %.6f %.6f %.6f\n' % tuple(v))
        for x in (p, q, r, s): fh.write('atom %.6f %.6f %.6f C\n' % tuple(x))
