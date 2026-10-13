#!/bin/sh
# A2-06: H-M symbols that Crysta's table does not know (no operators unless the IT number is also given)
cd /tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/work/2-symmetry && cat > a2_06_q.json <<'J'
[{"hm":"C m c e","number":null,"cell":null},{"hm":"Cmce","number":null,"cell":null},{"hm":"Aea2","number":null,"cell":null},{"hm":"Aem2","number":null,"cell":null},{"hm":"Cmme","number":null,"cell":null},{"hm":"Ccce","number":null,"cell":null},{"hm":"Fm3m","number":null,"cell":null},{"hm":"F m 3 m","number":null,"cell":null},{"hm":"Pm3m","number":null,"cell":null},{"hm":"Ia3d","number":null,"cell":null},{"hm":"Fd3m","number":null,"cell":null},{"hm":"F d -3 m Z","number":227,"cell":null},{"hm":"P 4/n m m Z","number":129,"cell":null},{"hm":"R -3 m R","number":166,"cell":"rho"}]
J
node dump_ops.js a2_06_q.json a2_06_out.json && python3 -I -c "
import json, gemmi
for q in json.load(open('a2_06_out.json'))['queries']:
    try: g = gemmi.find_spacegroup_by_name(q['hm']); g = g.xhm() if g else None
    except Exception: g = None
    print(repr(q['hm']), 'number', q['number'], '-> Crysta', q['hall'], '(via %s)' % q['via'], '| gemmi', g)"
python3 -I repro_formula.py t5_files/cmce_only.cif t5_files/fm3m_old.cif
