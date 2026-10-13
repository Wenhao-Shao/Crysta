"""Task 1: Crysta's space-group table (hallOps, symbolOps) against gemmi.
Operators are compared as sets modulo integer lattice translations (T in 1/24)."""
import json, subprocess, sys, os, re
import gemmi
W = os.path.dirname(os.path.abspath(__file__))

def gem_set(ops):
    s = set()
    for op in ops:
        R = tuple(int(x) // gemmi.Op.DEN for row in op.rot for x in row)
        T = tuple((int(x) % gemmi.Op.DEN) * 24 // gemmi.Op.DEN for x in op.tran)
        s.add((R, T))
    return s

def cry_set(ops):
    s = set(); bad = 0
    for R, T in ops:
        Rt = tuple(int(round(x)) for row in R for x in row)
        Tt = []
        for x in T:
            y = x * 24
            if abs(y - round(y)) > 1e-5: bad += 1
            Tt.append(int(round(y)) % 24)
        s.add((Rt, tuple(Tt)))
    return s, bad

table = json.load(open('/home/claude/crysta/src/sg-table.json'))
queries = []
seen = set()
def addq(hm, number=None, cell=None, src=''):
    key = (hm, number, cell)
    if key in seen: return
    seen.add(key); queries.append({'hm': hm, 'number': number, 'cell': cell, 'src': src})

for sg in gemmi.spacegroup_table():
    hm, xhm, sn = sg.hm, sg.xhm(), sg.short_name()
    names = {hm, xhm, sn, hm.replace(' ', ''), xhm.replace(' ', '')}
    if sg.ext in ('1', '2', 'H', 'R'):
        names |= {hm + ' :' + sg.ext, sn + ':' + sg.ext}
    for n in names:
        cell = None
        if sg.hm.startswith('R') or sg.hm.startswith('H'):
            cell = 'hex' if sg.ext == 'H' else ('rho' if sg.ext == 'R' else None)
        addq(n, None, cell, 'gemmi:' + xhm)
for n in range(1, 231):
    addq(None, n, None, 'number')
extra = ['P21/n', 'P 21/n', 'P 1 21/n 1', 'P21/a', 'P 1 21/a 1', 'P 1 1 21/b', 'P1121/b', 'B 1 1 2/b', 'B112/b', 'I 1 2/a 1', 'I12/a1', 'I2/a',
         'Pbnm', 'Pnma', 'P n m a', 'Pmcn', 'Cmca', 'Cmce', 'C m c e', 'Cmcm', 'Aba2', 'Aea2', 'Abm2', 'Aem2', 'Cmma', 'Cmme', 'Ccca', 'Ccce',
         'Fd-3m', 'F d -3 m', 'Fd3m', 'Fm3m', 'Fm-3m', 'Pm3m', 'Pm-3m', 'Pm-3n', 'Ia3d', 'Ia-3d', 'Pn-3', 'Pnnn', 'Pban', 'Pmmn', 'Ccca', 'Fddd', 'P4/n', 'P4/nmm', 'I41/a', 'I41/amd', 'I41/acd',
         'p21/c', 'P21/C', 'p 21/c', 'P 21 21 21', 'P212121', 'C2/c', 'C 2/c', 'C 1 2/c 1', 'P-1', 'P -1', 'P1', 'P 1', 'Pca21', 'P c a 21', 'Pna21', 'P n a 21', 'P63/mmc', 'P 63/m m c', 'P6_3/mmc', 'P2_1/c', 'P 2_1/c', 'I4/mmm', 'I 4/m m m', 'P4/mbm', 'R-3m', 'R -3 m', 'R3c', 'R -3 c', 'R-3', 'R3', 'R32', 'R3m',
         'P 42/n', 'P42/n', 'P4_2/n', 'P 4_2/n', 'P -4 21 m', 'P-421m', 'P4bm', 'P 4 b m', 'C2/m', 'C 1 2/m 1', 'P2/c', 'Pc', 'Cc', 'P21', 'C2', 'Cm', 'P2', 'Pm', 'P21/m']
for n in extra:
    for cell in ([None] if not n.upper().startswith('R') else ['hex', 'rho', None]):
        addq(n, None, cell, 'extra')

qf = os.path.join(W, 't1_queries.json'); of = os.path.join(W, 't1_crysta.json')
json.dump(queries, open(qf, 'w'))
subprocess.run(['node', os.path.join(W, 'dump_ops.js'), qf, of], check=True)
cr = json.load(open(of))

res = {'hall_parse': [], 'table_vs_gemmi_name': [], 'queries': []}
# (a) Hall parser: hallOps(hall) vs gemmi.symops_from_hall(hall)
n_ok = 0
for k, v in cr['table'].items():
    hall = v['hall']
    try:
        g = gem_set(gemmi.symops_from_hall(hall))
    except Exception as e:
        res['hall_parse'].append({'key': k, 'hall': hall, 'issue': 'gemmi cannot parse: ' + str(e)}); continue
    if v['ops'] is None:
        res['hall_parse'].append({'key': k, 'hall': hall, 'issue': 'Crysta hallOps returned null', 'gemmi_n': len(g)}); continue
    c, bad = cry_set(v['ops'])
    if c != g or bad or len(v['ops']) != len(c):
        res['hall_parse'].append({'key': k, 'hall': hall, 'issue': 'ops differ', 'crysta_n': len(v['ops']), 'gemmi_n': len(g), 'only_crysta': len(c - g), 'only_gemmi': len(g - c), 'nonround': bad})
    else: n_ok += 1
res['hall_parse_ok'] = n_ok
# (b) table key as a name, against gemmi's lookup of the same name
n_ok = 0; unknown = []
for k, v in cr['table'].items():
    try:
        if k.startswith('#'):
            sg = gemmi.find_spacegroup_by_number(int(k[1:]))
        else:
            sg = gemmi.find_spacegroup_by_name(k)
    except Exception as e:
        sg = None
    if sg is None:
        unknown.append(k); continue
    g = gem_set(sg.operations())
    try: c = gem_set(gemmi.symops_from_hall(v['hall']))
    except Exception: c = None
    if c != g:
        res['table_vs_gemmi_name'].append({'key': k, 'crysta_hall': v['hall'], 'gemmi': sg.xhm(), 'gemmi_hall': sg.hall,
                                           'same_number': gemmi.find_spacegroup_by_ops(gemmi.symops_from_hall(v['hall'])).number == sg.number if c else None})
    else: n_ok += 1
res['table_name_ok'] = n_ok; res['table_keys_unknown_to_gemmi'] = unknown
# (c) symbolOps for names
nq_ok = 0; nq = 0
for q in cr['queries']:
    nq += 1
    try:
        if q['hm'] is None:
            sg = gemmi.find_spacegroup_by_number(q['number'])
        else:
            a, gm = {'hex': (90, 120), 'rho': (80, 80)}.get(q['cell'], (0, 0))
            sg = gemmi.find_spacegroup_by_name(q['hm'].replace('_', ''), alpha=a, gamma=gm)
    except Exception:
        sg = None
    if sg is None:
        if q['ops'] is not None:
            res['queries'].append({'q': q['hm'] or q['number'], 'cell': q['cell'], 'issue': 'gemmi unknown, Crysta found', 'crysta_hall': q['hall']})
        else:
            res['queries'].append({'q': q['hm'] or q['number'], 'cell': q['cell'], 'issue': 'both unknown'})
        continue
    g = gem_set(sg.operations())
    if q['ops'] is None:
        res['queries'].append({'q': q['hm'] or q['number'], 'cell': q['cell'], 'issue': 'Crysta finds no operators', 'gemmi': sg.xhm(), 'src': q['src']}); continue
    c, bad = cry_set(q['ops'])
    if c != g:
        try: cn = gemmi.find_spacegroup_by_ops(gemmi.symops_from_hall(q['hall']))
        except Exception: cn = None
        res['queries'].append({'q': q['hm'] or q['number'], 'cell': q['cell'], 'issue': 'different operators', 'crysta_hall': q['hall'], 'crysta_is': cn.xhm() if cn else None, 'gemmi': sg.xhm(), 'gemmi_hall': sg.hall, 'src': q['src']})
    else: nq_ok += 1
res['queries_total'] = nq; res['queries_ok'] = nq_ok
json.dump(res, open(os.path.join(W, 't1_result.json'), 'w'), indent=1)
print('hall parse ok', res['hall_parse_ok'], 'of', len(cr['table']), '; problems', len(res['hall_parse']))
print('table name ok', res['table_name_ok'], '; differ', len(res['table_vs_gemmi_name']), '; unknown to gemmi', len(unknown))
print('queries ok', nq_ok, 'of', nq)
