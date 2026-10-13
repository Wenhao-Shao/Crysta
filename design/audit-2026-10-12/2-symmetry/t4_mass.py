"""Crysta's MASS table against gemmi.Element(...).weight (IUPAC)."""
import json, subprocess, gemmi
m = json.loads(subprocess.run(['node', '-e', "const C=require('/home/claude/crysta/src/core.js');console.log(JSON.stringify(C.MASS))"], capture_output=True, text=True).stdout)
rows = []
for el, w in m.items():
    g = gemmi.Element('H' if el == 'D' else el).weight
    if el == 'D': g = 2.01410
    rows.append((abs(w - g), abs(w - g) / g, el, w, g))
rows.sort(reverse=True)
print('elements', len(rows))
for r in rows[:25]: print('%-3s crysta %-9s gemmi %-10.5f diff %.4f (%.1e rel)' % (r[2], r[3], r[4], r[0], r[1]))
