"""Why Crysta's occupancy-weighted cell contents differ from the reference: classify each lost/added amount."""
import json, os, sys, collections
import numpy as np, gemmi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refcell import block_ops, expand, mic, read_doc
W = os.path.dirname(os.path.abspath(__file__))
cr = json.load(open(os.path.join(W, 't2_crysta.json')))
t4 = {(r['file'], r['block']): r for r in json.load(open(os.path.join(W, 't4_result.json')))}
summary = collections.Counter(); per = []
for rec in cr:
    if rec['error']: continue
    doc, _ = read_doc(rec['file'])
    if doc is None: continue
    name = os.path.basename(rec['file'])
    for s in rec['structures']:
        r4 = t4.get((name, s['block']))
        if not r4: continue
        diff = {e: (s['counts'].get(e, 0), r4['counts_ref'].get(e, 0)) for e in set(s['counts']) | set(r4['counts_ref'])
                if abs(s['counts'].get(e, 0) - r4['counts_ref'].get(e, 0)) > 1e-3}
        if not diff: continue
        b = doc.find_block(s['block']); small = gemmi.make_small_structure_from_block(b)
        ops, how = block_ops(b, small)
        ref, near, M = expand(small, ops, 0.15)
        # cause analysis per site
        causes = collections.Counter()
        sites = small.sites
        # (a) different sites of one element within 0.15 A after expansion (cross-site merge)
        # (b) images of one site 0.15-0.9 A apart, non-H (dropAtoms)
        # (c) different sites of one element 0.15-0.9 A apart, non-H, no disorder group (dropSites)
        # (d) images of one site within 0.15 A but not on the special position (d > 0.01 A)
        bysite = collections.defaultdict(list)
        for a in ref: bysite[a[0]].append(a)
        for si, lst in bysite.items():
            el = lst[0][1]
            for x in near:
                pass
        for (si, lab, d) in near:
            el = sites[si].element.name
            if d < 0.15: causes['images of one site %.2f-0.15 A apart merged (occ %.2f)' % (0.0, sites[si].occ)] += 1
            elif el not in ('H', 'D'): causes['images of one site 0.15-0.9 A apart, one dropped from formula'] += 1
        # cross-site within 0.15 and 0.15-0.9
        allpos = [(a[0], a[1], a[2], a[3]) for a in ref]
        cs = collections.Counter()
        for i in range(len(allpos)):
            for j in range(i + 1, len(allpos)):
                if allpos[i][0] == allpos[j][0] or allpos[i][1] != allpos[j][1]: continue
                d = mic(M, allpos[i][2] - allpos[j][2])
                gi = sites[allpos[i][0]].disorder_group; gj = sites[allpos[j][0]].disorder_group
                if d < 0.15: cs['cross-site <0.15 A (dg %s/%s, occ %.2f/%.2f)' % (gi, gj, allpos[i][3], allpos[j][3])] += 1
                elif d < 0.9 and allpos[i][1] != 'H' and gi in (0,) and gj in (0,): cs['cross-site 0.15-0.9 A unflagged (occ %.2f/%.2f)' % (allpos[i][3], allpos[j][3])] += 1
        per.append({'file': name, 'block': s['block'], 'diff': diff, 'formula_cif_xZ': {e: v * (r4['Z_file'] or 0) for e, v in (r4['formula_cif'] or {}).items()},
                    'causes': dict(causes), 'cross': dict(cs), 'autoSplit': s['autoSplit']})
json.dump(per, open(os.path.join(W, 't4_causes.json'), 'w'), indent=0)
for p in per:
    print(p['file'], p['block'][:14], {e: (round(a, 2), round(b, 2), round(p['formula_cif_xZ'].get(e, -1), 2)) for e, (a, b) in p['diff'].items()})
    print('     ', p['causes'], p['cross'], 'autoSplit', p['autoSplit'][:4])
