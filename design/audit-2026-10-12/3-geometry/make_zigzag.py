"""A made-up n = 1 lead bromide layer whose two metals per cell form a zigzag (the second metal is shifted by delta along x),
and the next layer shifted by exactly half the Pb...Pb vector along x. Every metal of the next layer is then at (1/2, 0) from the
metal straight below it: the expected stacking offset is (0.50, 0.00) for any choice of the metal."""
import numpy as np, math, json, os, sys
D = os.path.dirname(os.path.abspath(__file__)) + '/synth'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_synth import write_cif, cellpar
def zig(delta, name, cz=16.0):
    a, c2 = 6.0, 12.0                       # in-plane cell: x = 6 (Pb...Pb along x), y = 12 (two metals along y)
    A = np.array([a, 0, 0]); B = np.array([0, c2, 0]); C = np.array([a / 2, 0, cz])   # next layer shifted by a/2 along x
    P1 = np.array([0, 0, 0.]); P2 = np.array([delta, c2 / 2, 0.])
    at = [('Pb1', 'Pb', P1), ('Pb2', 'Pb', P2),
          ('Br1', 'Br', P1 + [a / 2, 0, 0]), ('Br2', 'Br', P2 + [a / 2, 0, 0]),            # bridges along x
          ('Br3', 'Br', (P1 + P2) / 2), ('Br4', 'Br', (P2 + P1 + B) / 2),                 # bridges along the zigzag
          ('Br5', 'Br', P1 + [0, 0, 3.0]), ('Br6', 'Br', P1 - [0, 0, 3.0]), ('Br7', 'Br', P2 + [0, 0, 3.0]), ('Br8', 'Br', P2 - [0, 0, 3.0])]
    write_cif(name, A, B, C, at)
    return cellpar(A, B, C)
if __name__ == '__main__':
    for dl in (0.6, -0.6, 0.9):
        nm = 'zigzag_%+.1f' % dl
        print(nm, [round(x, 3) for x in zig(dl, nm.replace('+', 'p').replace('-', 'm'))])
