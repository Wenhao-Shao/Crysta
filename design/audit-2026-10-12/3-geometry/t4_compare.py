"""Task 4: Crysta's hydrogen-bond rows (as the page builds them) against my periodic search."""
import json, collections
M = {}
for f in ('hb_mine_a.json', 'hb_mine_b.json'):
    for r in json.load(open(f)): M[(r['path'], r['block'])] = r
C = {(r['path'], r['block']): r for r in json.load(open('hb_cr.json'))}
st = collections.Counter(); ex = collections.defaultdict(list)
maxd = collections.defaultdict(float)
for k, m in M.items():
    c = C.get(k)
    if not c or c.get('error') or m.get('error'): st['error'] += 1; continue
    if not m['hasH']:
        st['noH structures'] += 1
        continue
    st['H structures'] += 1
    mine = {(r['D'], r['H'], r['A'], '%.2f' % r['dDA']): r for r in m['rows']}
    cr = {(r['D'], r['H'], r['A'], '%.2f' % r['dDA']): r for r in c['hbRows']}
    # README criteria; Crysta in addition skips an N acceptor with four bonds; record separately
    base = {kk: v for kk, v in mine.items() if not v['A_ammonium'] and not v['A_complex_halide']}
    st['rows mine (README, no NH4-type N, no 0D-complex halide)'] += len(base)
    st['rows crysta'] += len(cr)
    for kk in base:
        if kk in cr:
            st['matched'] += 1
            for q in ('dHA', 'dDA', 'angle'): maxd[q] = max(maxd[q], abs(base[kk][q] - cr[kk][q]))
        else:
            st['only mine'] += 1; ex['only mine'].append((k[0].split('/')[-1], k[1], kk, c['nAtoms']))
    for kk in cr:
        if kk not in base and kk not in mine: st['only crysta'] += 1; ex['only crysta'].append((k[0].split('/')[-1], k[1], kk))
        elif kk not in base: st['crysta lists an excluded type'] += 1
    for kk, v in mine.items():
        if v['A_complex_halide']:
            st['halide of a 0D metal complex as acceptor (mine)'] += 1
            if kk in cr: st['  ... listed by crysta'] += 1
            else: ex['0D complex halide'].append((k[0].split('/')[-1], k[1], kk))
        if v['A_ammonium']: st['ammonium-type N acceptor (mine)'] += 1
print(dict(st)); print({q: '%.1e' % v for q, v in maxd.items()})
for key, L in ex.items():
    files = collections.Counter(x[0] + ':' + str(x[1]) for x in L)
    print('==', key, len(L), 'in', len(files), 'structures;', files.most_common(12))
    for x in L[:8]: print('    ', x)
print('---- only-mine by cell size')
big = collections.Counter(); small = collections.Counter(); bigst = set(); smallst = set(); tot_big = collections.Counter()
for k, m in M.items():
    c = C.get(k)
    if not c or c.get('error') or m.get('error') or not m['hasH']: continue
    mine = {(r['D'], r['H'], r['A'], '%.2f' % r['dDA']): r for r in m['rows'] if not r['A_ammonium'] and not r['A_complex_halide']}
    cr = {(r['D'], r['H'], r['A'], '%.2f' % r['dDA']) for r in c['hbRows']}
    miss = [kk for kk in mine if kk not in cr]
    if c['nAtoms'] > 400:
        tot_big['structures'] += 1; tot_big['rows'] += len(mine); tot_big['missing'] += len(miss)
        if miss: bigst.add((k[0].split('/')[-1], k[1], c['nAtoms'], len(miss), len(mine)))
    elif miss: smallst.add((k[0].split('/')[-1], k[1], c['nAtoms'], len(miss), len(mine), tuple(miss[:3])))
print('cells > 400 atoms:', dict(tot_big), 'structures with missing rows:', len(bigst))
for x in sorted(bigst, key=lambda x: -x[3])[:15]: print('   ', x)
print('cells <= 400 atoms with missing rows:', len(smallst))
for x in sorted(smallst, key=lambda x: -x[3])[:15]: print('   ', x)
