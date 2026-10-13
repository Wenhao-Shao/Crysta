import json, collections, sys
c = json.load(open(sys.argv[1]))
for k, v in sorted(c.items()):
    for s in v['structures']:
        by = collections.defaultdict(lambda: collections.defaultdict(list))
        for t in s['sites']:
            if t['dg'] != '.': by[t['asm']][t['dg']].append(t)
        for asm, gr in by.items():
            if len(gr) >= 3 or (len(gr) == 2 and any(g.startswith('-') for g in gr)) or len(gr) == 1:
                desc = {g: (len(L), round(sum(x['occ'] for x in L) / len(L), 3), 'shown' if not L[0]['minor'] else 'hidden', ''.join(sorted(set(x['el'] for x in L)))) for g, L in gr.items()}
                print(k, s['block'][:20], 'asm=%s' % asm, desc)
