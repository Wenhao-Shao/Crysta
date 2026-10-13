import json
E = json.load(open('synth/expected.json')); R = {r['path'].split('/')[-1][:-4]: r for r in json.load(open('synth_ref.json'))}; C = {r['path'].split('/')[-1][:-4]: r for r in json.load(open('synth_cr.json'))}
for k, e in E.items():
    r, c = R[k], C[k]
    L = c.get('layer')
    print('==', k, 'error' if r.get('error') else '', r.get('error'), c.get('error'))
    if not L: print('  Crysta: no layer', c.get('framework')); continue
    br = L['bridges']
    print('  theta   exp', [round(x, 3) for x in e['theta_bridges']], 'crysta', sorted(round(b['theta'], 3) for b in br), 'mine', sorted(round(b['theta'], 3) for b in r['bridges'])[::2])
    print('  thetaIn exp', [round(x, 3) for x in e['thetaIn']], 'crysta', sorted(round(b.get('thetaIn', -1), 3) for b in br), 'mine', sorted(round(b.get('thetaIn', -1), 3) for b in r['bridges'])[::2])
    print('  thetaOut exp', [round(x, 3) for x in e['thetaOut']], 'crysta', sorted(round(b.get('thetaOut', -1), 3) for b in br), 'mine', sorted(round(b.get('thetaOut', -1), 3) for b in r['bridges'])[::2])
    print('  axial tilt exp', e['axial_tilt'], 'crysta', L.get('axialTilt'))
    print('  slab exp %.4f crysta %.4f mine %s' % (e['slab'], L['slabThickness'], r['slabs']))
    print('  spacing exp %.4f crysta %.4f   gallery exp %.4f crysta %.4f mine %s' % (e['spacing'], L['spacing'], e['gallery'], L['gallery'], r['gallery_direct']))
    print('  penetration exp', e['penetration'], 'crysta', L['penetration'], 'mine', r['penetration'])
    print('  offset exp', e['offset'], 'crysta', L['offset'] and (round(L['offset']['s1'], 4), round(L['offset']['s2'], 4), L['offset']['kind']), 'mine', r['offset'])
    s = c['metalSites']
    print('  n', L['n'], 'sigma2', [round(x['sigma2'], 6) for x in s], 'deltaD', [x['deltaD'] for x in s], 'MX', [round(b['d'], 5) for x in s for b in x['bonds']][:3], 'hkl', c['framework']['hkl'])
    print('  hb', [(h['D'], h['H'], h['A'], round(h['dHA'], 3), round(h['angle'], 1)) for h in c['hbRows']][:4])
