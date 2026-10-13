# blocks where one disorder assembly holds a negative group and another group (own scan with gemmi)
import sys, os, glob, gemmi, collections
H = sys.argv[1]
for p in sorted(glob.glob(os.path.join(H, '*.cif'))):
    try: doc = gemmi.cif.read_file(p)
    except Exception: continue
    for bi, b in enumerate([x for x in doc if x.find_values('_atom_site_fract_x')]):
        t = b.find('_atom_site_', ['label', '?occupancy', '?disorder_assembly', '?disorder_group'])
        if not t.has_column(3): continue
        asm = collections.defaultdict(lambda: collections.defaultdict(list))
        for r in t:
            g = r[3]
            if g in ('.', '?', '0', ''): continue
            a = r[2] if t.has_column(2) and r[2] not in ('?', '') else '.'
            occ = gemmi.cif.as_number(r[1]) if t.has_column(1) and r[1] not in '?.' else 1.0
            asm[a][g].append((r[0], occ))
        for a, gs in asm.items():
            if any(g.startswith('-') for g in gs) and len(gs) > 1:
                print(os.path.basename(p), bi, 'assembly', a, {g: (len(v), round(sum(o for _, o in v) / len(v), 3)) for g, v in gs.items()})
