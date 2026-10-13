# Compare the saved mol2 and SVG files with the model drawn in the page, and the mol2 coordinates with the
# crystal structure read by gemmi (own orthogonalisation from the CRYSIN cell).
import json, sys, re, math, collections, numpy as np, gemmi
d = sys.argv[1]
def orth(a, b, c, al, be, ga):
    al, be, ga = (math.radians(x) for x in (al, be, ga))
    cx = c * math.cos(be); cy = c * (math.cos(al) - math.cos(be) * math.cos(ga)) / math.sin(ga)
    return np.array([[a, b * math.cos(ga), cx], [0, b * math.sin(ga), cy], [0, 0, math.sqrt(c * c - cx * cx - cy * cy)]])
for k in range(int(sys.argv[2])):
    m = json.load(open('%s/%d_model.json' % (d, k)))
    txt = open(m['mol2']).read()
    sec = {}
    for part in re.split(r'@<TRIPOS>', txt)[1:]:
        name, _, body = part.partition('\n'); sec[name.strip()] = body.rstrip('\n').split('\n')
    head = sec['MOLECULE'][1].split()
    atoms = [l.split() for l in sec['ATOM'] if l.strip()]
    bonds = [l.split() for l in sec['BOND'] if l.strip()]
    crys = [float(x) for x in sec['CRYSIN'][0].split()[:6]]
    print('==', m['file'].split('/')[-1], '| header atoms %s bonds %s (lines %d, %d) | CRYSIN %s' % (head[0], head[1], len(atoms), len(bonds), sec['CRYSIN'][0].strip()))
    # 1. mol2 against the drawn model
    key = lambda lab, x, y, z: (lab, round(x, 3), round(y, 3), round(z, 3))
    A = collections.Counter(key(a[1], float(a[2]), float(a[3]), float(a[4])) for a in atoms)
    B = collections.Counter(key(a['label'][:8].replace(' ', '_'), a['x'], a['y'], a['z']) for a in m['atoms'])
    # match with tolerance 0.0006 A (mol2 has 4 decimals)
    ma = [(a[1], np.array([float(a[2]), float(a[3]), float(a[4])])) for a in atoms]
    mb = [(a['label'][:8].replace(' ', '_'), np.array([a['x'], a['y'], a['z']])) for a in m['atoms']]
    used = set(); unmatched = 0; maxd = 0
    P = np.array([q for _, q in mb])
    for lab, q in ma:
        dd = np.linalg.norm(P - q, axis=1)
        cand = [i for i in np.argsort(dd)[:6] if mb[i][0] == lab and i not in used and dd[i] < 6e-4]
        if cand: used.add(cand[0]); maxd = max(maxd, dd[cand[0]])
        else: unmatched += 1
    print('   mol2 atoms %d, model atoms %d, unmatched mol2 atoms %d, model atoms not in mol2 %d, max distance %.1e A' % (len(ma), len(mb), unmatched, len(mb) - len(used), maxd))
    # 2. mol2 coordinates against gemmi (CIF only): each atom a symmetry image of its site
    f = m['file']
    if f.endswith('.cif'):
        st = gemmi.make_small_structure_from_block([b for b in gemmi.cif.read(f) if b.find_values('_atom_site_fract_x')][0])
        ops = [gemmi.Op(s) for s in st.symops] or list(st.find_spacegroup().operations())
        Ominv = np.linalg.inv(orth(*crys))
        sites = collections.defaultdict(list)
        for s in st.sites: sites[s.label[:8]].append(np.array([s.fract.x, s.fract.y, s.fract.z]))
        cell = orth(*crys)
        bad = 0; worst = 0
        for lab, q in ma:
            fr = Ominv @ q
            best = 9
            for f0 in sites[lab]:
                for op in ops:
                    g = np.array(op.apply_to_xyz(f0.tolist()))
                    dv = fr - g; dv -= np.round(dv)
                    best = min(best, np.linalg.norm(cell @ dv))
            worst = max(worst, best)
            if best > 1e-3: bad += 1
        print('   mol2 vs gemmi: atoms not at a symmetry image of their labelled site: %d of %d; max offset %.1e A; cell diff %.1e' % (bad, len(ma), worst, max(abs(x - y) for x, y in zip(crys, [st.cell.a, st.cell.b, st.cell.c, st.cell.alpha, st.cell.beta, st.cell.gamma]))))
    # 3. SVG against the screen projection
    svg = open(m['svg']).read()
    circ = re.findall(r'<circle class="atom[^"]*" cx="([-\d.]+)" cy="([-\d.]+)"', svg)
    labs = re.findall(r'<g class="atom-label"><rect[^>]*/><text x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]*)</text>', svg)
    S = np.array([[a['sx'], a['sy']] for a in m['atoms']])
    def match(pts):
        worst = 0; un = 0
        for x, y in pts:
            dd = np.min(np.hypot(S[:, 0] - float(x), S[:, 1] - float(y)))
            worst = max(worst, dd); un += dd > 0.02
        return un, worst
    u1, w1 = match(circ)
    lab_ok = 0
    for x, y, t in labs:
        near = np.where(np.hypot(S[:, 0] - float(x), S[:, 1] - float(y)) < 0.02)[0]
        if any(m['atoms'][i]['label'] == t.replace('&amp;', '&') for i in near): lab_ok += 1
    u2, w2 = match([(x, y) for x, y, _ in labs])
    print('   SVG circles %d (screen atoms %d), not on a screen atom %d, max offset %.3f px | SVG labels %d, at an atom with that label %d, max offset %.3f px | perspective %s' % (len(circ), len(S), u1, w1, len(labs), lab_ok, w2, m['persp']))
