"""Task 3: Crysta's framework descriptors (C.analyse) against my reference (ref_fw.py) on every HybriD3 CIF block."""
import json, math, collections, sys
R = {}
for f in sys.argv[1:3]:
    for r in json.load(open(f)): R[(r['path'], r['block'])] = r
C = {(r['path'], r['block']): r for r in json.load(open('all_cr.json'))}
name = lambda k: k[0].split('/')[-1] + ':' + str(k[1])
st = collections.defaultdict(lambda: dict(n=0, max=0.0, bad=[]))
def cmp(item, key, a, b, tol):
    s = st[item]; s['n'] += 1
    d = abs(a - b); s['max'] = max(s['max'], d)
    if d > tol: s['bad'].append((name(key), round(a, 5), round(b, 5)))
counts = collections.Counter()
layer_keys = []
for key, r in R.items():
    c = C.get(key)
    if not c or c.get('error') or r.get('error'):
        counts['error'] += 1
        if r.get('error'): st['_ref_error']['bad'].append((name(key), r['error'][:120]))
        continue
    cdim = c['framework']['dim'] if c['framework'] else None
    if r.get('dim') != cdim: st['dim']['bad'].append((name(key), 'crysta', cdim, 'mine', r.get('dim')))
    st['dim']['n'] += 1
    # metal sites
    ms = {s['label']: s for s in c['metalSites']}
    for lab, e in (r.get('sites') or {}).items():
        s = ms.get(lab)
        if not s: st['site_missing']['bad'].append((name(key), lab)); continue
        st['cn']['n'] += 1
        if s['cn'] != e['cn']: st['cn']['bad'].append((name(key), lab, s['cn'], e['cn'])); continue
        cmp('mean M-X', key, s['mean'], e['mean'], 0.001)
        bc = sorted(round(b['d'], 4) for b in s['bonds']); be = sorted(round(b[1], 4) for b in e['bonds'])
        cmp('M-X bonds', key, max(abs(x - y) for x, y in zip(bc, be)), 0, 0.001)
        if 'sigma2' in e:
            if 'sigma2' not in s: st['sigma2_missing']['bad'].append((name(key), lab)); continue
            cmp('Delta d (x1e4)', key, s['deltaD'] * 1e4, e['deltaD'] * 1e4, 0.005)
            cmp('sigma2', key, s['sigma2'], e['sigma2'], 0.05)
            cmp('cis min', key, s['cisMin'], e['cisMin'], 0.01)
            cmp('cis max', key, s['cisMax'], e['cisMax'], 0.01)
            st['octahedral flag']['n'] += 1
            if s['octahedral'] != (e['transMin'] > 150): st['octahedral flag']['bad'].append((name(key), lab))
    L = c.get('layer')
    if (L is not None) != bool(r.get('hkl')):
        st['layer present']['bad'].append((name(key), 'crysta', L is not None, 'mine', bool(r.get('hkl')), r.get('dim'), r.get('halide_bridged')))
    st['layer present']['n'] += 1
    if not L or not r.get('hkl'): continue
    layer_keys.append(key)
    fw = c['framework']
    st['hkl']['n'] += 1
    if fw['hkl'] != r['hkl']: st['hkl']['bad'].append((name(key), fw['hkl'], r['hkl']))
    cmp('d(hkl)', key, fw['dhkl'], r['dhkl'], 0.001)
    cmp('layer spacing (README)', key, fw['spacing'], r['spacing_readme'], 0.001)
    # page text: middle plane to middle plane of the next layer
    cmp('layer spacing vs centre gaps (page text)', key, max(abs(g - fw['spacing']) for g in r['centre_gaps']), 0, 0.01)
    st['n']['n'] += 1
    if L['n'] != max(r['n_per_layer']) or L['nUniform'] != (len(set(r['n_per_layer'])) == 1): st['n']['bad'].append((name(key), L['n'], L['nUniform'], r['n_per_layer']))
    if L.get('slabThickness') is not None and r['slabs'][0] is not None:
        cmp('slab', key, L['slabThickness'], r['slabs'][0], 0.001)
        if len(set(round(x, 3) for x in r['slabs'] if x is not None)) > 1: st['slab differs between layers']['bad'].append((name(key), [round(x, 3) for x in r['slabs'] if x is not None]))
        cmp('gallery (README: spacing - slab)', key, L['gallery'], r['spacing_readme'] - r['slabs'][0], 0.001)
        if r['gallery_direct']: cmp('gallery vs direct face-to-face', key, max(abs(g - L['gallery']) for g in r['gallery_direct']), 0, 0.01)
    elif (L.get('slabThickness') is None) != (r['slabs'][0] is None):
        st['slab presence']['bad'].append((name(key), L.get('slabThickness'), r['slabs']))
    # bridges
    mine = r['bridges']
    for b in L['bridges']:
        cand = [m for m in mine if m['x'] == b['x'] and abs(m['theta'] - b['theta']) < 0.01]
        st['bridge theta']['n'] += 1
        if not cand: st['bridge theta']['bad'].append((name(key), b['x'], b['m1'], b['m2'], round(b['theta'], 3), sorted(round(m['theta'], 3) for m in mine if m['x'] == b['x']))); continue
        m = cand[0]
        cmp('M...M', key, b['mm'], m['mm'], 0.001)
        st['equatorial flag']['n'] += 1
        if b['equatorial'] != m['equatorial']: st['equatorial flag']['bad'].append((name(key), b['x'], b['equatorial'], m['equatorial'])); continue
        if b['equatorial']:
            cmp('theta_in', key, b['thetaIn'], m['thetaIn'], 0.01)
            cmp('theta_out', key, b['thetaOut'], m['thetaOut'], 0.01)
    # does Crysta list every distinct bridge? (it shows up to 16 rows in the page)
    distinct = {(m['x'], round(m['theta'], 2), m['equatorial']) for m in mine}
    st['bridge count']['n'] += 1
    if len(distinct) != len(L['bridges']): st['bridge count']['bad'].append((name(key), len(L['bridges']), len(distinct)))
    # axial tilt: Crysta's rule |cos| > 0.7
    ax = [t[2] for t in r['bond_to_normal'] if math.cos(math.radians(t[2])) > 0.7]
    if L.get('axialTilt') and ax:
        cmp('axial tilt min', key, L['axialTilt']['min'], min(ax), 0.01); cmp('axial tilt max', key, L['axialTilt']['max'], max(ax), 0.01); cmp('axial tilt mean', key, L['axialTilt']['mean'], sum(ax) / len(ax), 0.01)
    # penetration
    pc = {p['label']: p['depth'] for p in L['penetration']}
    for lab, v in r['penetration'].items():
        st['penetration']['n'] += 1
        if v is None: continue
        if abs(v) > 3.0:
            if lab in pc: st['penetration']['bad'].append((name(key), lab, 'listed but > 3 A', pc[lab], v))
            continue
        if lab not in pc: st['penetration']['bad'].append((name(key), lab, 'not listed', round(v, 3))); continue
        d = abs(pc[lab] - v); st['penetration']['max'] = max(st['penetration']['max'], d)
        if d > 0.001: st['penetration']['bad'].append((name(key), lab, round(pc[lab], 4), round(v, 4)))
    for lab in pc:
        if lab not in r['penetration']: st['penetration extra']['bad'].append((name(key), lab, pc[lab]))
    # offset
    if L.get('offset') and r.get('offset'):
        o = L['offset']
        cmp('stacking offset s1', key, o['s1'], r['offset'][0], 0.005)
        cmp('stacking offset s2', key, o['s2'], r['offset'][1], 0.005)
    elif bool(L.get('offset')) != bool(r.get('offset')):
        st['offset presence']['bad'].append((name(key), L.get('offset'), r.get('offset')))
print('blocks', len(R), 'layered (both)', len(layer_keys), counts)
for k, s in st.items():
    print('%-42s n %5d  max %.4g  bad %d' % (k, s['n'], s['max'], len(s['bad'])))
    for b in s['bad'][:6]: print('      ', b)
json.dump({k: v for k, v in st.items()}, open(sys.argv[3], 'w'), default=str)
json.dump(layer_keys, open(sys.argv[4], 'w'))
