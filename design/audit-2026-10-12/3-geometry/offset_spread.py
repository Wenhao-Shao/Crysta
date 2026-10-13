"""Stacking offset: how much does the value depend on the metal pair that is used? For every metal M0 of the top metal plane of a layer
and every metal M1 of the bottom plane of the next layer (nearest in projection), the offset in units of M0's in-plane M...M vectors."""
import sys, os, json, math, itertools, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_fw
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ref_fw.py')).read()
# reuse ref_fw's loader and graph by running analyse up to the layers, via a small patch that returns internals
src = src.replace("    res['offset'] = None\n    if cand:", "    res['_int'] = (layers, main, centre, lig, met, atoms, M, img, n, dhkl)\n    res['offset'] = None\n    if cand:")
ns = {}; exec(compile(src, 'ref_fw_int', 'exec'), ns)
def spread(path, block):
    r = ns['analyse'](path, block)
    layers, main, centre, lig, met, atoms, M, img, n, dhkl = r['_int']
    pos = lambda a: M @ (atoms[a]['f'] + img[a]); H = lambda a: float(pos(a) @ n)
    pin = lambda v: v - (v @ n) * n
    L0 = layers[0]; sp = dhkl / len(main)
    tops = [a for a in main[0]['atoms'] if centre[a] and abs(H(a) - L0['planes'][-1]) < 3.0]
    vals = []
    for m0 in tops:
        P0 = pos(m0); vecs = []
        for j, t, d in lig[m0]:
            for i2, s2 in met[j]:
                Q = M @ (atoms[i2]['f'] + np.array(t) + np.array(s2) + img[m0]); v = Q - P0
                if np.linalg.norm(v) < 1e-6 or abs(v @ n) > 1.5: continue
                vecs.append(pin(v))
        vecs.sort(key=np.linalg.norm)
        p1 = vecs[0]; p2 = next(v for v in vecs if np.linalg.norm(np.cross(p1, v)) > 0.5 * np.linalg.norm(p1) * np.linalg.norm(v))
        for L, c in zip(layers, main):
            for a in [a for a in c['atoms'] if centre[a] and abs(H(a) - L['planes'][0]) < 3.0]:
                best = None
                for t in itertools.product(range(-3, 4), repeat=3):
                    Q = M @ (atoms[a]['f'] + img[a] + np.array(t)); dh = (Q - P0) @ n
                    if abs(dh - (sp - (L0['planes'][-1] - L0['centre']) - (L['centre'] - L['planes'][0]))) < 0.3 * sp:
                        if best is None or np.linalg.norm(pin(Q - P0)) < np.linalg.norm(pin(best - P0)): best = Q
                if best is None: continue
                s, *_ = np.linalg.lstsq(np.array([p1, p2]).T, pin(best - P0), rcond=None)
                s = sorted(np.abs(s - np.round(s)).tolist(), reverse=True)
                vals.append((atoms[m0]['label'], atoms[a]['label'], round(s[0], 3), round(s[1], 3)))
    return vals
if __name__ == '__main__':
    for path, block in json.load(open(sys.argv[1])):
        v = spread(path, block)
        s1 = [x[2] for x in v]; s2 = [x[3] for x in v]
        print(os.path.basename(path), block, 'pairs', len(v), 's1 %.3f-%.3f s2 %.3f-%.3f' % (min(s1), max(s1), min(s2), max(s2)), v[:6])
