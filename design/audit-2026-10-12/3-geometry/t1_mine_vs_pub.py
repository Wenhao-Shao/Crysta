import json, math, collections, re
R = json.load(open('t1_requests.json'))
def isH(l): return re.match(r'^(H|D)(?![a-z])', l) is not None and not re.match(r'^(Hg|Hf|Ho)', l)
stat = collections.defaultdict(lambda: [0, 0, 0.0, 0.0])
bad = collections.defaultdict(list)
for r in R:
    for it in r['items']:
        m = it['mine']
        if m is None or (isinstance(m, float) and math.isnan(m)): continue
        d = m - it['pub']
        if it['k'] == 'tors': d = (d + 180) % 360 - 180
        cat = it['k'] + ('_H' if any(isH(l) for l in it['labels']) else '') + ('_su' if it['su'] else '_nosu')
        tol = max(3 * (it['su'] or 0), 0.5 * 10 ** (-it['dec']) + 1e-9)
        if not it['su']:
            tol = 0.5 * 10 ** (-it['dec']) + 1e-9
        s = stat[cat]; s[0] += 1
        if abs(d) > tol: s[1] += 1; bad[cat].append((r['name'], r['block'], it['labels'], it['codes'], it['pub'], it['su'], round(m, 4), round(d, 4)))
        else: s[2] = max(s[2], abs(d))
        if it['su']: s[3] = max(s[3], abs(d) / it['su'])
for k in sorted(stat): v = stat[k]; print(k, 'n', v[0], 'outside', v[1], 'maxdiff_in', round(v[2], 5), 'max |d|/su', round(v[3], 2))
for k in ['bond_su', 'angle_su', 'tors_su', 'bond_nosu', 'angle_nosu', 'tors_nosu']:
    print('==', k, len(bad[k]), collections.Counter(b[0] for b in bad[k]).most_common(10))
    for b in bad[k][:8]: print('  ', b)
json.dump({k: v for k, v in bad.items()}, open('t1_mine_bad.json', 'w'))
