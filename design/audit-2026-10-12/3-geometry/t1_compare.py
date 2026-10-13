import json, math, collections, re
R = json.load(open('t1_requests.json')); Cr = json.load(open('t1_crysta.json'))
def isH(l): return re.match(r'^(H|D)(?![a-z])', l) is not None
st = collections.defaultdict(lambda: {'n': 0, 'max_vs_mine': 0.0, 'n_pub': 0, 'max_vs_pub': 0.0, 'bad_mine': [], 'bad_pub': []})
notfound = collections.Counter(); nf_items = collections.defaultdict(list)
tolk = {'bond': 0.001, 'angle': 0.01, 'tors': 0.01}
for r, c in zip(R, Cr):
    assert r['name'] == c['name'] and r['block'] == c['block']
    for it, v in zip(r['items'], c['items']):
        m = it['mine']
        if m is None or (isinstance(m, float) and math.isnan(m)): continue
        if v is None:
            notfound[r['name']] += 1; nf_items[r['name']].append((it['k'], it['labels'], it['codes'])); continue
        s = st[it['k']]; s['n'] += 1
        d = v - m
        if it['k'] == 'tors': d = (d + 180) % 360 - 180
        s['max_vs_mine'] = max(s['max_vs_mine'], abs(d))
        if abs(d) > tolk[it['k']]: s['bad_mine'].append((r['name'], it['labels'], it['codes'], v, m))
        # against published, only refined (s.u. given), non-H items that my reference reproduces
        if it['su'] and not any(isH(l) for l in it['labels']):
            dm = m - it['pub']; dp = v - it['pub']
            if it['k'] == 'tors': dm = (dm + 180) % 360 - 180; dp = (dp + 180) % 360 - 180
            tol = max(3 * it['su'], 0.5 * 10 ** (-it['dec']))
            if abs(dm) <= tol:
                s['n_pub'] += 1; s['max_vs_pub'] = max(s['max_vs_pub'], abs(dp) / it['su'])
                if abs(dp) > tol: s['bad_pub'].append((r['name'], it['labels'], it['codes'], v, it['pub'], it['su']))
for k, s in st.items():
    print(k, 'n', s['n'], 'max |crysta-mine|', '%.2e' % s['max_vs_mine'], 'bad', len(s['bad_mine']), '| vs pub n', s['n_pub'], 'max |d|/su', round(s['max_vs_pub'], 3), 'bad', len(s['bad_pub']))
    for b in s['bad_mine'][:5]: print('   mine', b)
    for b in s['bad_pub'][:5]: print('   pub', b)
print('not found', sum(notfound.values()), len(notfound), notfound.most_common(15))
for k in list(nf_items)[:6]: print(k, nf_items[k][:4])
