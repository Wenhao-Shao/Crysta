"""A4-05: f', f'' of Np, Pu, Am, Cm are zero in Crysta's tables (gemmi's Cromer-Liberman stops at U).
Reference: xraylib f', f'' (Kissel) for Pu at Cu K-alpha 1; made-up PuO2 (fluorite)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pylib'))
import ref_lib as R, run_case as RC
import xraylib as xl
lam = 1.54059
E = 12.3984197 / lam
orig = R.disp
def disp(el, l):
    if el == 'Pu':
        return (xl.Fi(94, E), -xl.Fii(94, E))      # xraylib gives f'' with a negative sign
    return orig(el, l)
R.disp = disp
f = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'PuO2_madeup.cif')
c = RC.crysta(f, lam, 10, 120)
st = R.read_cif(f); atoms, _ = R.expand(st)
ref, _ = R.pattern(st, atoms, lam, 10, 120)
cmp = R.compare(c['refl'], ref, 10, 120)
print("Pu f', f'' (xraylib):", round(xl.Fi(94, E), 3), round(-xl.Fii(94, E), 3), '; Crysta uses 0, 0')
print('max |d rel| = %.2f %% of strongest at' % cmp['max_drel'], cmp['worst'])
