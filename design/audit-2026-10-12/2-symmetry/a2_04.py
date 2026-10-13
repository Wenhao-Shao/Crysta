"""A2-04: a CIF that gives only the IT number of an R group, with a rhombohedral cell, gets the hexagonal-axes operators.
Reference: the rhombohedral-axes setting (gemmi 'R -3 m:R'), which is the only one that fits a = b = c, alpha = beta = gamma != 90."""
import os, sys, subprocess, json, collections, gemmi
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from refcell import expand
files = [os.path.join(HERE, 't5_files', f) for f in ('bi2te3_rho_num.cif', 'bi2te3_rho_hmR.cif', 'bi2te3_hex_num.cif')]
json.dump(files, open(os.path.join(HERE, 'a2_04_in.json'), 'w'))
subprocess.run(['node', os.path.join(HERE, 'dump_cells.js'), os.path.join(HERE, 'a2_04_in.json'), os.path.join(HERE, 'a2_04_out.json')], check=True)
for rec in json.load(open(os.path.join(HERE, 'a2_04_out.json'))):
    s = rec['structures'][0]; i = s['info']
    print(os.path.basename(rec['file']), s['meta']['symSource'], 'ops', s['nops'], 'atoms', len(s['atomsAll']), 'formula', ' '.join('%s%g' % (f['el'], f['n']) for f in i['formula']), 'Z', i['Z'], 'rho %.4f' % i['density'])
small = gemmi.read_small_structure(files[0])
ref, _, _ = expand(small, list(gemmi.find_spacegroup_by_name('R -3 m:R').operations()), 0.05)
m = sum(gemmi.Element(a[1]).weight * a[3] for a in ref)
print('reference (R -3 m:R on the rhombohedral cell): atoms', len(ref), collections.Counter(a[1] for a in ref), 'rho %.4f' % (m / (6.02214076e23 * small.cell.volume * 1e-24)))
