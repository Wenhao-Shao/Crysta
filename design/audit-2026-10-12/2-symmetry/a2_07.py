"""A2-07: the short symbol 'B 2' maps to B 1 2 1 (Hall 'B 2y') in Crysta's table; gemmi (and the ITA list of settings of No. 5) give B 1 1 2."""
import os, sys, subprocess, json, gemmi
HERE = os.path.dirname(os.path.abspath(__file__))
tab = json.load(open('/home/claude/crysta/src/sg-table.json'))
print("Crysta table: 'B2' ->", tab.get('B2'), "; 'B112' ->", tab.get('B112'), "; 'B121' ->", tab.get('B121'))
for n in ('B2', 'B 2', 'B 1 1 2', 'B 1 2 1'):
    print('gemmi', repr(n), '->', gemmi.find_spacegroup_by_name(n).xhm(), gemmi.find_spacegroup_by_name(n).hall)
f = os.path.join(HERE, 't5_files', 'b2_only.cif')
json.dump([f], open(os.path.join(HERE, 'a2_07_in.json'), 'w'))
subprocess.run(['node', os.path.join(HERE, 'dump_cells.js'), os.path.join(HERE, 'a2_07_in.json'), os.path.join(HERE, 'a2_07_out.json')], check=True)
s = json.load(open(os.path.join(HERE, 'a2_07_out.json')))[0]['structures'][0]
print('Crysta b2_only.cif:', [(a[3], [round(x, 4) for x in a[1]]) for a in s['atomsAll']], 'Z', s['info']['Z'])
small = gemmi.read_small_structure(f)
print('gemmi  b2_only.cif:', small.spacegroup.xhm(), [(x.label, round(x.fract.x % 1, 4), round(x.fract.y % 1, 4), round(x.fract.z % 1, 4)) for x in small.get_all_unit_cell_sites()])
