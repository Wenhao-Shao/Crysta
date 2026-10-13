"""Two zigzag n = 1 layers per cell (orthogonal cell, c = 2 x 16 A). Layer B is layer A shifted by (a/2, 0, c/2), but its metals
are listed with the zigzag partner first. Every metal of layer B is at (1/2, 0) from the metal straight below it in layer A, so the
stacking offset is (0.50, 0.00) by construction, for any choice of the metal pair."""
import numpy as np, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_synth import write_cif, cellpar
REV = False
def zig2(delta, name, swap, cz=16.0):
    a, c2 = 6.0, 12.0
    A = np.array([a, 0, 0]); B = np.array([0, c2, 0]); C = np.array([0, 0, 2 * cz])
    def layer(o, tag, order):
        P1 = o + np.array([0, 0, 0.]); P2 = o + np.array([delta, c2 / 2, 0.])
        pb = [('Pb%s1' % tag, 'Pb', P1), ('Pb%s2' % tag, 'Pb', P2)]
        if order: pb = pb[::-1]
        return pb + [('Br%s1' % tag, 'Br', P1 + [a / 2, 0, 0]), ('Br%s2' % tag, 'Br', P2 + [a / 2, 0, 0]), *([('Br%s3' % tag, 'Br', (P1 + P2) / 2), ('Br%s4' % tag, 'Br', (P2 + P1 + B) / 2)][::(-1 if REV else 1)]),
                     ('Br%s5' % tag, 'Br', P1 + [0, 0, 3.0]), ('Br%s6' % tag, 'Br', P1 - [0, 0, 3.0]), ('Br%s7' % tag, 'Br', P2 + [0, 0, 3.0]), ('Br%s8' % tag, 'Br', P2 - [0, 0, 3.0])]
    at = layer(np.zeros(3), 'A', False) + layer(np.array([a / 2, 0, cz]), 'B', swap)
    write_cif(name, A, B, C, at)
for rev in (False, True):
    REV = rev
    for dl in (0.6, -0.6):
        for sw in (False, True):
            zig2(dl, 'zigzag2_%s_%s%s' % ('p' if dl > 0 else 'm', 'swap' if sw else 'same', '_rev' if rev else ''), sw)
