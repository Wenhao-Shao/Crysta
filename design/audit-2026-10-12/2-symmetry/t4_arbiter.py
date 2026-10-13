"""Where Crysta's cell contents differ from the reference: which one agrees with the file's _chemical_formula_sum x Z?"""
import json, os, collections
W = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(W, 't4_result.json')))
causes = {(c['file'], c['block']): c for c in json.load(open(os.path.join(W, 't4_causes.json')))}
tab = collections.Counter(); detail = []
for r in rows:
    k = (r['file'], r['block'])
    if k not in causes: continue
    if not r['formula_cif'] or not r['Z_file']: tab['no formula/Z in file'] += 1; continue
    Z = round(r['Z_file'])
    els = [e for e in causes[k]['diff']]
    def ok(counts):
        return all(abs(counts.get(e, 0) - r['formula_cif'].get(e, 0) * Z) <= 0.02 * Z + 1e-6 for e in els)
    c, g = ok(r['counts_crysta']), ok(r['counts_ref'])
    tab[(('crysta matches CIF' if c else 'crysta differs from CIF'), ('ref matches CIF' if g else 'ref differs from CIF'))] += 1
    detail.append((r['file'], c, g, round((r['rho_crysta'] - r['rho_ref']) / r['rho_ref'] * 100, 2)))
for k, v in tab.items(): print(k, v)
print('crysta matches, ref not:', [d for d in detail if d[1] and not d[2]])
print('neither:', [d for d in detail if not d[1] and not d[2]])
dd = sorted([d for d in detail if d[2] and not d[1]], key=lambda d: d[3])
print('ref matches CIF, crysta not (density error %):', len(dd), dd)
