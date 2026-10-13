# disorder assemblies/groups of a CIF: mean occupancy and size of each group (own reading with gemmi)
import sys, gemmi, collections
b = [x for x in gemmi.cif.read_file(sys.argv[1]) if x.find_values('_atom_site_fract_x')][0]
t = b.find('_atom_site_', ['label', 'type_symbol', '?occupancy', '?disorder_assembly', '?disorder_group'])
g = collections.OrderedDict()
for r in t:
    occ = gemmi.cif.as_number(r[2]) if r.has(2) and r[2] not in '?.' else 1.0
    asm = r[3] if r.has(3) else '.'
    grp = r[4] if r.has(4) else '.'
    if grp in ('.', '?'): continue
    k = (asm, grp); e = g.setdefault(k, [0, 0.0, collections.Counter()]); e[0] += 1; e[1] += occ; e[2][r[1]] += 1
for k, (n, s, c) in g.items(): print('assembly', k[0], 'group', k[1], 'n', n, 'mean occ %.3f' % (s / n), dict(c))
