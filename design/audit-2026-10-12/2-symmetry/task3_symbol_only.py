"""Task 3: CIFs that give only a space-group name (or only a number) and no operator loop.
Made-up files for 30+ space groups; Crysta's unit cell against gemmi's expansion of the same symbol."""
import json, os, subprocess, sys, collections
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, mic
W = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(W, 't3_files')
# (symbol written in the file, gemmi name, cell a b c al be ga)
cases = [
 ('P -1', 'P -1', (7.1, 8.3, 9.2, 81, 77, 69)),
 ('P 21/c', 'P 1 21/c 1', (7.1, 8.3, 9.2, 90, 101, 90)),
 ('P 1 21/n 1', 'P 1 21/n 1', (7.1, 8.3, 9.2, 90, 101, 90)),
 ('P 21/a', 'P 1 21/a 1', (7.1, 8.3, 9.2, 90, 101, 90)),
 ('C 2/c', 'C 1 2/c 1', (17.1, 8.3, 9.2, 90, 101, 90)),
 ('C c', 'C 1 c 1', (17.1, 8.3, 9.2, 90, 101, 90)),
 ('P 21', 'P 1 21 1', (7.1, 8.3, 9.2, 90, 101, 90)),
 ('I 1 2/a 1', 'I 1 2/a 1', (7.1, 8.3, 9.2, 90, 101, 90)),
 ('P 1 1 21/b', 'P 1 1 21/b', (7.1, 8.3, 9.2, 90, 90, 104)),
 ('B 1 1 2/b', 'B 1 1 2/b', (7.1, 8.3, 9.2, 90, 90, 104)),
 ('P n m a', 'P n m a', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('P b c a', 'P b c a', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('P 21 21 21', 'P 21 21 21', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('P c a 21', 'P c a 21', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('P n a 21', 'P n a 21', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('C m c m', 'C m c m', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('C m c a', 'C m c a', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('F d d d :2', 'F d d d :2', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('I b a m', 'I b a m', (7.1, 8.3, 9.2, 90, 90, 90)),
 ('I 4/m m m', 'I 4/m m m', (5.9, 5.9, 19.2, 90, 90, 90)),
 ('P 4/n m m :2', 'P 4/n m m :2', (5.9, 5.9, 9.2, 90, 90, 90)),
 ('I 41/a m d :2', 'I 41/a m d :2', (5.9, 5.9, 19.2, 90, 90, 90)),
 ('P 42/m n m', 'P 42/m n m', (5.9, 5.9, 9.2, 90, 90, 90)),
 ('P -4 21 m', 'P -4 21 m', (5.9, 5.9, 9.2, 90, 90, 90)),
 ('R -3 m', 'R -3 m :H', (5.9, 5.9, 19.2, 90, 90, 120)),
 ('R -3 m', 'R -3 m :R', (6.1, 6.1, 6.1, 58.5, 58.5, 58.5)),
 ('R 3 c', 'R 3 c :H', (5.9, 5.9, 19.2, 90, 90, 120)),
 ('P 31 2 1', 'P 31 2 1', (5.9, 5.9, 9.2, 90, 90, 120)),
 ('P -3 m 1', 'P -3 m 1', (5.9, 5.9, 9.2, 90, 90, 120)),
 ('P 63/m m c', 'P 63/m m c', (5.9, 5.9, 9.2, 90, 90, 120)),
 ('P 63 m c', 'P 63 m c', (5.9, 5.9, 9.2, 90, 90, 120)),
 ('F m -3 m', 'F m -3 m', (5.64, 5.64, 5.64, 90, 90, 90)),
 ('F d -3 m :2', 'F d -3 m :2', (8.1, 8.1, 8.1, 90, 90, 90)),
 ('P m -3 m', 'P m -3 m', (4.1, 4.1, 4.1, 90, 90, 90)),
 ('I a -3 d', 'I a -3 d', (12.1, 12.1, 12.1, 90, 90, 90)),
 ('P a -3', 'P a -3', (6.1, 6.1, 6.1, 90, 90, 90)),
 ('F -4 3 m', 'F -4 3 m', (6.1, 6.1, 6.1, 90, 90, 90)),
 ('P 41 21 2', 'P 41 21 2', (5.9, 5.9, 9.2, 90, 90, 90)),
 ('P 61 2 2', 'P 61 2 2', (5.9, 5.9, 9.2, 90, 90, 120)),
]
def pick_general():
    rng = np.random.default_rng(7); best = None
    for _ in range(300):
        f = np.round(rng.random(3), 4)
        worst = 99
        for sym, gname, cell in cases:
            sg = gemmi.find_spacegroup_by_name(gname); uc = gemmi.UnitCell(*cell)
            M = np.array(uc.orth.mat.tolist()).T
            imgs = [np.array(op.apply_to_xyz(list(f))) for op in sg.operations()]
            for g in imgs[1:]:
                worst = min(worst, mic(M, g - f))
        if best is None or worst > best[0]: best = (worst, f)
    return tuple(best[1]), best[0]
gen, gmin = pick_general()
print('general position', gen, 'nearest image %.2f A' % gmin)
files = []; meta = []
def write(fn, cell, tags, atoms):
    lines = ['data_t3', ] + ['_cell_length_a %.4f' % cell[0], '_cell_length_b %.4f' % cell[1], '_cell_length_c %.4f' % cell[2],
             '_cell_angle_alpha %.3f' % cell[3], '_cell_angle_beta %.3f' % cell[4], '_cell_angle_gamma %.3f' % cell[5]]
    lines += [("%s %s" if k.endswith('number') else "%s '%s'") % (k, v) for k, v in tags]
    lines += ['loop_', '_atom_site_label', '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z', '_atom_site_occupancy']
    lines += ['%s %s %.4f %.4f %.4f 1' % a for a in atoms]
    open(fn, 'w').write('\n'.join(lines) + '\n')
for i, (sym, gname, cell) in enumerate(cases):
    sg = gemmi.find_spacegroup_by_name(gname)
    # one atom in the general position, one at the origin (special in most groups)
    atoms = [('C1', 'C', *gen), ('Fe1', 'Fe', 0.0, 0.0, 0.0)]
    for variant, tags in (('hm', [('_symmetry_space_group_name_H-M', sym)]),
                          ('hmalt', [('_space_group_name_H-M_alt', sym)]),
                          ('num', [('_space_group_IT_number', str(sg.number))])):
        if variant == 'num' and ':' in gname and gname[-1] in '12' and gname.endswith(':1') is False: pass
        fn = os.path.join(D, 't3_%02d_%s.cif' % (i, variant))
        write(fn, cell, tags, atoms)
        files.append(fn); meta.append({'file': os.path.basename(fn), 'sym': sym, 'gemmi': gname, 'variant': variant, 'number': sg.number})
json.dump(files, open(os.path.join(W, 't3_files.json'), 'w'))
subprocess.run(['node', os.path.join(W, 'dump_cells.js'), os.path.join(W, 't3_files.json'), os.path.join(W, 't3_crysta.json')], check=True)
cr = {os.path.basename(r['file']): r for r in json.load(open(os.path.join(W, 't3_crysta.json')))}
res = []; okn = collections.Counter()
for m in meta:
    rec = cr[m['file']]; s = rec['structures'][0]
    small = gemmi.read_small_structure(os.path.join(D, m['file']))
    sg = gemmi.find_spacegroup_by_name(m['gemmi'])
    # reference: the setting the symbol names (for the number-only file: gemmi's choice for the number, but R uses the cell)
    if m['variant'] == 'num':
        sg = gemmi.find_spacegroup_by_number(m['number'])
    ops = list(sg.operations())
    ref, near, M = expand(small, ops, 0.15)
    cnt_r = collections.Counter(a[1] for a in ref); cnt_c = collections.Counter(a[0] for a in s['atomsAll'])
    unmatched = 0
    for a in ref:
        if min([mic(M, a[2] - np.array(c[1])) for c in s['atomsAll'] if c[0] == a[1]], default=99) > 0.002: unmatched += 1
    good = cnt_r == cnt_c and unmatched == 0 and len(s['atomsAll']) == len(ref)
    okn[(m['variant'], good)] += 1
    res.append(dict(m, symSource=s['meta']['symSource'], nops=s['nops'], nops_ref=len(ops), crysta=dict(cnt_c), ref=dict(cnt_r), unmatched=unmatched, ok=good,
                    density=s['info']['density'], Z=s['info']['Z']))
json.dump(res, open(os.path.join(W, 't3_result.json'), 'w'), indent=0)
print(dict(okn))
for r in res:
    if not r['ok'] or r['symSource'] not in ('hm', 'number'):
        print(r['file'], r['sym'], r['variant'], 'src', r['symSource'], 'nops', r['nops'], r['nops_ref'], 'crysta', r['crysta'], 'ref', r['ref'], 'unmatched', r['unmatched'])
