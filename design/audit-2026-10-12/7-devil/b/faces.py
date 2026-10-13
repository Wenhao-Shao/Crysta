"""Independent face planes of a layered metal halide: metal heights along the layer normal (hkl), layers by
clustering the metal heights (gap > 4.5 A between layers... own rule: metals bonded through halides),
terminal halides = halide with exactly one metal within cutoff (own cutoff per metal-halide pair),
top/bottom faces = terminal halides whose bond to the metal points up/down within 50 deg of the normal.
usage: python3 -I faces.py file h k l metal halide cutoff [block]"""
import sys, json
import numpy as np
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xread import read  # noqa


def main():
    path = sys.argv[1]
    hkl = np.array([int(x) for x in sys.argv[2:5]])
    metal, hal, cut = sys.argv[5], sys.argv[6], float(sys.argv[7])
    block = sys.argv[8] if len(sys.argv) > 8 else None
    V, S = read(path, block)
    rec = np.linalg.inv(V).T
    G = hkl @ rec
    d = 1 / np.linalg.norm(G)
    nrm = G / np.linalg.norm(G)
    R = range(-1, 2)
    sh = np.array([[i, j, k] for i in R for j in R for k in R])
    M = [(l, f) for l, e, f in S if e == metal]
    X = [(l, f) for l, e, f in S if e == hal]
    # metal heights (fold into 0..d)
    mh = sorted(((f @ V) @ nrm) % d for l, f in M)
    # bonds of each halide in the cell
    tops, bots = [], []
    for lx, fx in X:
        cx = fx @ V
        nb = []
        for lm, fm in M:
            for s in sh:
                cm = (fm + s) @ V
                r = np.linalg.norm(cx - cm)
                if r < cut:
                    nb.append(cm)
        if len(nb) != 1:
            continue
        v = cx - nb[0]
        c = (v @ nrm) / np.linalg.norm(v)
        hx = cx @ nrm
        if c > 0.64:
            tops.append((lx, hx, (nb[0] @ nrm)))
        elif c < -0.64:
            bots.append((lx, hx, (nb[0] @ nrm)))
    print(json.dumps({'d': d, 'metal_heights_mod_d': [round(x, 3) for x in mh],
                      'top_terminal': [(l, round(h % d, 3), round(hm % d, 3)) for l, h, hm in tops],
                      'bottom_terminal': [(l, round(h % d, 3), round(hm % d, 3)) for l, h, hm in bots]}, indent=0))


main()
