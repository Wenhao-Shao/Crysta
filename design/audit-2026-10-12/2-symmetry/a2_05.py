"""A2-05: symbol-only CIF of a group with two origin choices (F d -3 m), coordinates in origin choice 2 (MgAl2O4 spinel).
Crysta assumes origin choice 1. gemmi's CIF reader assumes origin choice 2; gemmi.find_spacegroup_by_name and pymatgen assume 1."""
import os, sys, subprocess, json, collections, gemmi
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from refcell import expand
f = os.path.join(HERE, 't5_files', 'spinel_fd3m_o2.cif')
json.dump([f], open(os.path.join(HERE, 'a2_05_in.json'), 'w'))
subprocess.run(['node', os.path.join(HERE, 'dump_cells.js'), os.path.join(HERE, 'a2_05_in.json'), os.path.join(HERE, 'a2_05_out.json')], check=True)
s = json.load(open(os.path.join(HERE, 'a2_05_out.json')))[0]['structures'][0]; i = s['info']
print('Crysta:', s['meta']['symSource'], 'positions', collections.Counter(a[0] for a in s['atomsAll']), 'counts', s['counts'], 'formula', ' '.join('%s%g' % (x['el'], x['n']) for x in i['formula']), 'rho %.4f' % i['density'])
small = gemmi.read_small_structure(f)
print('gemmi.read_small_structure picks', small.spacegroup.xhm(), '; find_spacegroup_by_name picks', gemmi.find_spacegroup_by_name('F d -3 m').xhm())
for o in ('1', '2'):
    ref, _, _ = expand(small, list(gemmi.find_spacegroup_by_name('F d -3 m :' + o).operations()), 0.05)
    m = sum(gemmi.Element(a[1]).weight * a[3] for a in ref)
    print('origin choice', o, collections.Counter(a[1] for a in ref), 'rho %.4f' % (m / (6.02214076e23 * small.cell.volume * 1e-24)))
