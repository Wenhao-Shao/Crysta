"""Crysta (dispersion off) against pymatgen XRDCalculator, peaks merged at equal 2theta.
usage: pmg_cmp.py CRYSTA_FILE PMG_FILE B(element B, A^2, same for all) tmax"""
import sys, os, json, subprocess, math, warnings
warnings.filterwarnings('ignore')
import numpy as np
from pymatgen.core import Structure
from pymatgen.analysis.diffraction.xrd import XRDCalculator
cf, pf, B, tmax = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
W = os.path.dirname(os.path.abspath(__file__))
c = json.loads(subprocess.run(['node', os.path.join(W, 'crysta_pat.js'), cf, '1.54059', '3', str(tmax), '0'], capture_output=True, text=True).stdout)
s = Structure.from_file(pf)
els = sorted(set(sp.symbol for sp in s.composition.elements))
calc = XRDCalculator(wavelength=1.54059, debye_waller_factors={e: B for e in els})
p = calc.get_pattern(s, scaled=False, two_theta_range=(3, tmax))
# Crysta peaks merged at equal 2theta (within 1e-4 deg)
peaks = []
for r in c['refl']:
    if not 3 <= r['tth'] <= tmax: continue
    if peaks and abs(peaks[-1][0] - r['tth']) < 1e-4: peaks[-1][1] += r['I']; peaks[-1][2] += r['m']
    else: peaks.append([r['tth'], r['I'], r['m']])
ci = np.array([x[1] for x in peaks]); ct = np.array([x[0] for x in peaks]); cm = [x[2] for x in peaks]
ci = 100 * ci / ci.max()
pt = np.array(p.x); pi = np.array(p.y); pi = 100 * pi / pi.max()
# match
dt = []; di = []; unmatched = []; worst = None
for t, i, m in zip(ct, ci, cm):
    j = np.argmin(np.abs(pt - t))
    if abs(pt[j] - t) > 1e-4:
        if i > 0.05: unmatched.append((round(t, 3), round(i, 3)))
        continue
    dt.append(abs(pt[j] - t)); d = abs(pi[j] - i); di.append(d)
    mult_p = sum(p.hkls[j][k]['multiplicity'] for k in range(len(p.hkls[j])))
    if worst is None or d > worst[0]: worst = (d, round(t, 3), i, pi[j], m, mult_p)
pm_un = [(round(t, 3), round(i, 3)) for t, i in zip(pt, pi) if np.min(np.abs(ct - t)) > 1e-4 and i > 0.05]
mm = []
for t, m in zip(ct, cm):
    j = np.argmin(np.abs(pt - t))
    if abs(pt[j] - t) < 1e-4:
        mp = sum(h['multiplicity'] for h in p.hkls[j])
        if mp != m: mm.append((round(t, 3), m, mp))
print(os.path.basename(cf), 'peaks crysta', len(ct), 'pymatgen', len(pt), 'max d2theta', max(dt), 'max d rel', round(max(di), 3), 'worst', worst,
      'unmatched crysta', unmatched[:5], 'unmatched pmg', pm_un[:5], 'mult mismatches', mm[:5], len(mm))
