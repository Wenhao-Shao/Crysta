"""Ueq from the anisotropic U: Crysta (CIF with the Uiso column blanked, so Crysta must use the aniso loop)
against my trace(U_cart)/3 and against the Ueq published in the CIF."""
import sys, os, re, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R
src, out = sys.argv[1], sys.argv[2]
lines = open(src).read().split('\n')
# blank the U_iso_or_equiv column of the atom_site loop
txt = open(src).read()
txt = txt.replace('_atom_site_U_iso_or_equiv', '_atom_site_U_iso_or_equiv_published')
open(out, 'w').write(txt)
c = json.loads(subprocess.run(['node', 'crysta_pat.js', out], capture_output=True, text=True).stdout)
st_pub = R.read_cif(src)
st = R.read_cif(out)
pub = {s['label']: s['u'] for s in st_pub['sites']}
worst_me = (0, None); worst_pub = (0, None); n = 0
mine = {s['label']: s for s in st['sites']}
for s in c['sites']:
    m = mine.get(s['label'])
    if not m or m['uij'] is None:
        continue
    n += 1
    d = abs(s['u'] - m['u'])
    if d > worst_me[0]: worst_me = (d, s['label'], s['u'], m['u'])
    if pub.get(s['label']) is not None:
        d2 = abs(s['u'] - pub[s['label']])
        if d2 > worst_pub[0]: worst_pub = (d2, s['label'], s['u'], pub[s['label']])
print(os.path.basename(src), 'aniso sites', n, 'max |Crysta Ueq - my Ueq|', worst_me, 'max |Crysta Ueq - published Ueq|', worst_pub)
