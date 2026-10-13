"""Framework-card numbers (Crysta) against the authors' published _geom_bond / _geom_angle values."""
import json, collections, re
R = json.load(open('t1_requests.json'))
C = {(r['path'], r['block']): r for r in json.load(open('all_cr.json'))}
HAL = {'F', 'Cl', 'Br', 'I'}
stat = collections.defaultdict(lambda: dict(n=0, matched=0, maxsig=0.0, unmatched=[]))
for r in R:
    c = C.get((r['file'], r['block']))
    if not c or c.get('error') or not c.get('metalSites'): continue
    bonds = collections.defaultdict(list); angles = collections.defaultdict(list)
    for it in r['items']:
        if it['k'] == 'bond': bonds[frozenset(it['labels'])].append(it)
        elif it['k'] == 'angle': angles[(it['labels'][1], frozenset([it['labels'][0], it['labels'][2]]))].append(it)
    for s in c['metalSites']:
        for b in s['bonds']:
            if b['el'] not in HAL: continue
            cand = bonds.get(frozenset([s['label'], b['label']]), [])
            if not cand: continue
            st = stat['M-X bond (card) vs _geom_bond']; st['n'] += 1
            best = min(cand, key=lambda it: abs(it['pub'] - b['d']))
            tol = max(3 * (best['su'] or 0), 0.5 * 10 ** (-best['dec']))
            if abs(best['pub'] - b['d']) <= tol:
                st['matched'] += 1
                if best['su']: st['maxsig'] = max(st['maxsig'], abs(best['pub'] - b['d']) / best['su'])
            else: st['unmatched'].append((r['name'], r['block'], s['label'], b['label'], round(b['d'], 4), [x['pub'] for x in cand]))
        # cis range against the published X-M-X angles at this metal (those below 150 deg)
        if s.get('octahedral'):
            pub = [it for (m, ends), L in angles.items() if m == s['label'] for it in L if it['pub'] < 150 and all(re.match(r'(F|Cl|Br|I)(?![a-z])', l) for l in it['labels'][::2])]
            if len(pub) >= 12:
                st = stat['cis min/max (card) vs _geom_angle']; st['n'] += 2
                for val, ref in ((s['cisMin'], min(p['pub'] for p in pub)), (s['cisMax'], max(p['pub'] for p in pub))):
                    if abs(val - ref) <= 0.05 + 1e-9: st['matched'] += 1
                    else: st['unmatched'].append((r['name'], r['block'], s['label'], round(val, 3), ref))
    L = c.get('layer')
    brs = L['bridges'] if L else c['bridges']
    for b in brs:
        th = b['theta'] if L else b['angle']
        cand = angles.get((b['x'], frozenset([b['m1'], b['m2']])), [])
        if not cand: continue
        st = stat['M-X-M theta (card) vs _geom_angle']; st['n'] += 1
        best = min(cand, key=lambda it: abs(it['pub'] - th))
        tol = max(3 * (best['su'] or 0), 0.5 * 10 ** (-best['dec']))
        if abs(best['pub'] - th) <= tol:
            st['matched'] += 1
            if best['su']: st['maxsig'] = max(st['maxsig'], abs(best['pub'] - th) / best['su'])
        else: st['unmatched'].append((r['name'], r['block'], b['m1'], b['x'], b['m2'], round(th, 3), [x['pub'] for x in cand]))
for k, v in stat.items():
    print(k, 'n', v['n'], 'matched', v['matched'], 'max |d|/su', round(v['maxsig'], 2), 'unmatched', len(v['unmatched']))
    for u in v['unmatched'][:12]: print('    ', u)
