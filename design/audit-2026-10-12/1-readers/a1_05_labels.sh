#!/bin/sh
# A1-05: elements from labels when the CIF has no _atom_site_type_symbol. Crysta (XtalCore) against gemmi.
D=$(dirname "$(readlink -f "$0")")
cd "$D" && node dump_crysta.js /tmp/a1_05_crysta.json cases/labels_only.cif >/dev/null
cd /tmp && python3 -I "$D/dump_gemmi.py" /tmp/a1_05_gemmi.json "$D/cases/labels_only.cif" >/dev/null
python3 -I -c "
import json
c=json.load(open('/tmp/a1_05_crysta.json'))['labels_only.cif']['structures'][0]['sites']
g=json.load(open('/tmp/a1_05_gemmi.json'))['labels_only.cif']['blocks'][0]['sites']
for x,y in zip(c,g): print('%-6s crysta %-3s gemmi %-3s %s' % (x['label'], x['el'], y['el'], '' if x['el']==y['el'] else '<-- differs'))
"
