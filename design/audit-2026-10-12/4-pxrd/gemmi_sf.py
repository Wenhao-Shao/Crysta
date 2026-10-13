"""Crysta F(hkl) (dispersion off) against gemmi.StructureFactorCalculatorX on the small structure,
isotropic U (the U_iso_or_equiv column, aniso removed), and the effect of the full anisotropic U
(gemmi with aniso) on the relative intensities.  usage: gemmi_sf.py CIF [lambda tmin tmax]"""
import sys, os, json, math, subprocess
import numpy as np, gemmi
cif = sys.argv[1]
lam = float(sys.argv[2]) if len(sys.argv) > 2 else 1.54059
t0 = float(sys.argv[3]) if len(sys.argv) > 3 else 3
t1 = float(sys.argv[4]) if len(sys.argv) > 4 else 60
W = os.path.dirname(os.path.abspath(__file__))
c = json.loads(subprocess.run(['node', os.path.join(W, 'crysta_pat.js'), cif, str(lam), str(t0), str(t1), '0'], capture_output=True, text=True).stdout)
def load():
    doc = gemmi.cif.read(cif)
    blk = [b for b in doc if b.find_values('_atom_site_fract_x')][0]
    sm = gemmi.make_small_structure_from_block(blk)
    if sm.symops:
        sm.determine_and_set_spacegroup('S')
    for s in sm.sites:
        if s.u_iso == 0 and s.aniso.nonzero() is False:
            s.u_iso = 1 / (8 * math.pi ** 2)      # Crysta's default B = 1 for a site with no value
    sm.change_occupancies_to_crystallographic()   # gemmi's SF calculator applies every operator to every site
    return sm
small = load()
small_iso = load()
print('spacegroup', small.spacegroup.hm if small.spacegroup else None, 'cell sites', len(small.get_all_unit_cell_sites()))
for s in small_iso.sites:
    s.aniso = gemmi.SMat33d(0, 0, 0, 0, 0, 0)
calc = gemmi.StructureFactorCalculatorX(small.cell)
worst = (0, None); n = 0; worstrel = (0, None)
lp = lambda th: (1 + math.cos(2 * th) ** 2) / (math.sin(th) ** 2 * math.cos(th))
Ii, Ia = [], []
for r in c['refl']:
    if not (t0 <= r['tth'] <= t1):
        continue
    hkl = [r['h'], r['k'], r['l']]
    Fg = calc.calculate_sf_from_small_structure(small_iso, hkl)
    Fa = calc.calculate_sf_from_small_structure(small, hkl)
    Fc = complex(r['fre'], r['fim'])
    d = abs(Fc - Fg) / max(1.0, abs(Fg))
    n += 1
    if d > worst[0]:
        worst = (d, hkl, Fc, Fg)
    th = math.radians(r['tth'] / 2)
    Ii.append(r['m'] * abs(Fg) ** 2 * lp(th)); Ia.append(r['m'] * abs(Fa) ** 2 * lp(th))
Ii = np.array(Ii); Ia = np.array(Ia)
rel_c = np.array([r['rel'] for r in c['refl'] if t0 <= r['tth'] <= t1])
rel_i = 100 * Ii / Ii.max(); rel_a = 100 * Ia / Ia.max()
print(os.path.basename(cif), 'n', n, 'max |Fc-Fgemmi|/max(1,|F|)', worst, 'max |rel_crysta - rel_gemmi_iso|', np.abs(rel_c - rel_i).max(),
      'max |rel_iso - rel_aniso| (gemmi)', np.abs(rel_i - rel_a).max(), 'at', int(np.argmax(np.abs(rel_i - rel_a))))
