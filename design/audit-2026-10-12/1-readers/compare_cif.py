# Compare Crysta's CIF reading (crysta_cif.json) with gemmi (gemmi_cif.json).
import json, sys, math, collections
W = sys.argv[1] if len(sys.argv) > 1 else '.'
cr = json.load(open(W + '/crysta_cif.json'))
gm = json.load(open(W + '/gemmi_cif.json'))

def opkey(R, T):
    return tuple(tuple(int(round(x)) for x in r) for r in R) + (tuple(int(round((t % 1) * 24)) % 24 for t in T),)

stats = collections.Counter()
maxd = collections.defaultdict(float)
issues = collections.defaultdict(list)
for name, g in gm.items():
    c = cr[name]
    if 'error' in g or 'error' in c:
        issues['read_error'].append((name, g.get('error'), c.get('error')))
        continue
    gb = [b for b in g['blocks'] if 'error' not in b]
    if len(gb) != len(c['structures']):
        issues['nblocks'].append((name, len(gb), len(c['structures'])))
        continue
    stats['files'] += 1
    for b, s in zip(gb, c['structures']):
        stats['blocks'] += 1
        if b['block'] != s['block']:
            issues['blockname'].append((name, b['block'], s['block']))
        for i in range(6):
            d = abs(b['cell'][i] - s['cell'][i])
            maxd['cell_len' if i < 3 else 'cell_ang'] = max(maxd['cell_len' if i < 3 else 'cell_ang'], d)
        maxd['V_rel'] = max(maxd['V_rel'], abs(b['V'] - s['V']) / b['V'])
        # space-group name as the file gives it
        ghm = (b['hm'] or '').replace(' ', '')
        chm = (s['spaceGroup'] or '').replace(' ', '')
        if ghm != chm:
            issues['sg_name'].append((name, s['block'], b['hm'], s['spaceGroup'], b['raw_sg']))
        # symmetry operators
        if b['ops']:
            stats['blocks_with_ops'] += 1
            gk = set(opkey(o['rot'], o['tran']) for o in b['ops'] if 'rot' in o)
            ck = set(opkey(o['R'], o['T']) for o in s['ops'])
            if s['symSource'] != 'listed':
                issues['ops_not_listed'].append((name, s['block'], s['symSource']))
            if gk != ck or len(b['ops']) != len(s['ops']):
                issues['ops'].append((name, s['block'], len(b['ops']), len(s['ops']), len(gk ^ ck)))
        else:
            stats['blocks_without_ops'] += 1
            issues['no_ops_in_file'].append((name, s['block'], s['symSource'], len(s['ops']), b['raw_sg']))
        # sites
        gs, cs = b['sites'], s['sites']
        if len(gs) != len(cs):
            issues['nsites'].append((name, s['block'], len(gs), len(cs), [x['label'] for x in s['skipped']]))
            continue
        stats['sites'] += len(gs)
        ex = {e[0]: e for e in b['extra']}
        for x, y in zip(gs, cs):
            if x['label'] != y['label']:
                issues['label'].append((name, x['label'], y['label']))
            gel = x['el']
            if gel == 'D':
                gel = 'H'
            if gel != y['el']:
                issues['element'].append((name, x['label'], x['type'], x['el'], y['el']))
            for k in range(3):
                maxd['fract'] = max(maxd['fract'], abs(x['f'][k] - y['f'][k]))
            if abs(x['occ'] - y['occ']) > 1e-9:
                issues['occ'].append((name, x['label'], x['occ'], y['occ']))
            maxd['occ'] = max(maxd['occ'], abs(x['occ'] - y['occ']))
            # U: gemmi u_iso is 0 when the file gives none
            gu = x['u'] if x['u'] else None
            if gu is None and x['ueq'] is not None:
                gu = x['ueq']
                stats['u_from_aniso'] += 1
            if (gu is None) != (y['u'] is None):
                issues['u_presence'].append((name, x['label'], gu, y['u']))
            elif gu is not None:
                d = abs(gu - y['u'])
                maxd['u'] = max(maxd['u'], d)
                if d > 1e-5:
                    issues['u'].append((name, x['label'], gu, y['u']))
            # disorder group
            e = ex.get(x['label'])
            gdg = e[3] if e and e[3] not in (None, '?', '.', '0', '') else '.'
            gasm = e[2] if e and e[2] not in (None, '?', '') else '.'
            if gdg != y['dg']:
                issues['dg'].append((name, x['label'], gdg, y['dg']))
            if gasm != y['asm']:
                issues['asm'].append((name, x['label'], gasm, y['asm']))
            if gdg != '.':
                stats['sites_with_dg'] += 1

print(dict(stats))
print({k: v for k, v in maxd.items()})
for k, v in issues.items():
    print('==', k, len(v))
    for row in v[:12]:
        print('   ', row)
