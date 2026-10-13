import json, sys
c = json.load(open(sys.argv[1])); g = json.load(open(sys.argv[2]))
for k in sorted(c):
    print('=====', k)
    if 'error' in c[k]: print('  CRYSTA ERROR', c[k]['error'])
    if 'error' in g[k]: print('  GEMMI ERROR', g[k]['error'][-90:])
    cs = c[k].get('structures', []); gs = g[k].get('blocks', [])
    print('  blocks crysta', [s['block'] for s in cs], 'errors', c[k].get('errors'), '| gemmi', [(b['block'], b.get('error')) for b in gs], 'all gemmi blocks', g[k].get('nblocks_all'))
    for s in cs:
        b = next((x for x in gs if x['block'] == s['block']), None)
        print('  [%s] sg crysta=%r src=%s nops=%d | gemmi hm=%r nops=%s' % (s['block'], s['spaceGroup'], s['symSource'], len(s['ops']), b and b.get('hm'), b and len(b.get('ops', []))))
        if s['skipped']: print('    skipped', s['skipped'])
        diffs = 0
        gsites = {x['label']: x for x in (b['sites'] if b and 'sites' in b else [])}
        for t in s['sites']:
            x = gsites.get(t['label'])
            if not x:
                print('    %-6s crysta el=%s f=%s  || NOT IN GEMMI' % (t['label'], t['el'], t['f'])); continue
            gu = x['u'] or x['ueq']
            same = (x['el'] if x['el'] != 'D' else 'H') == t['el'] and max(abs(a - b) for a, b in zip(x['f'], t['f'])) < 1e-9 and abs(x['occ'] - t['occ']) < 1e-9 and ((t['u'] is None and not gu) or (t['u'] is not None and gu is not None and abs(gu - t['u']) < 1e-6))
            if not same:
                diffs += 1
                print('    %-6s crysta el=%s f=%s occ=%s u=%s dg=%s || gemmi el=%s type=%s f=%s occ=%s u=%s ueq=%s dg=%s' % (t['label'], t['el'], t['f'], t['occ'], t['u'], t['dg'], x['el'], x['type'], x['f'], x['occ'], x['u'], x['ueq'], x['dg']))
        for lab, x in gsites.items():
            if not any(t['label'] == lab for t in s['sites']): print('    only gemmi:', lab, x['el'], x['f'])
        print('    sites agreeing:', len(s['sites']) - diffs, 'of', len(s['sites']))
