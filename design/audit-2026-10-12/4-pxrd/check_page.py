"""Check the output of page_pxrd.js against the reference.
usage: check_page.py OUTDIR REF_CIF [MEASURED_FILE]"""
import sys, os, json, math, csv
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R

out, rcif = sys.argv[1], sys.argv[2]
meas = sys.argv[3] if len(sys.argv) > 3 else None
P = json.load(open(os.path.join(out, 'page.json')))
ax = P['axes']
lam = ax['lambda']
tmin, tmax = P['core']['tmin'], P['core']['tmax']
st = R.read_cif(rcif)
atoms, _ = R.expand(st)
ref, f000 = R.pattern(st, atoms, lam, tmin, tmax)
idx = {}
for i, r in enumerate(ref):
    for hh in r['orbit']:
        idx[hh] = i
res = {}
# 1. the table on the screen against the reference (rounded as shown)
bad = []
md = {'d': 0, 'tth': 0, 'F': 0, 'I': 0}
for row in P['tbl']:
    h, k, l = int(row[0]), int(row[1]), int(row[2])
    r = ref[idx[(h, k, l)]]
    F = r['F'][(h, k, l)]
    dd = abs(float(row[3]) - r['d']); dt = abs(float(row[7]) - r['tth'])
    dF = abs(float(row[6]) - math.sqrt(r['F2mean'])); dI = abs(float(row[8]) - r['rel'])
    dre = abs(float(row[4]) - F.real); dim = abs(float(row[5]) - F.imag)
    md['d'] = max(md['d'], dd); md['tth'] = max(md['tth'], dt); md['F'] = max(md['F'], dF, dre, dim); md['I'] = max(md['I'], dI)
    if int(row[9]) != r['m']:
        bad.append(('M', (h, k, l), row[9], r['m']))
# rows that the reference lists with rel >= minRel and that the table does not
shown = set((int(r[0]), int(r[1]), int(r[2])) for r in P['tbl'])
shown_sets = set(idx[x] for x in shown)
miss = [(r['orbit'][0], round(r['tth'], 3), round(r['rel'], 3)) for i, r in enumerate(ref)
        if tmin <= r['tth'] <= tmax and r['rel'] >= P['core']['minRel'] + 0.006 and i not in shown_sets]
res['table_vs_reference'] = {'rows': len(P['tbl']), 'max_diff': md, 'M_mismatch': bad[:5], 'missing': miss[:5]}
# 2. the saved table text against the screen
lines = open(P['saved']['savetbl']['file']).read().strip().split('\n')
rows = [l.split('\t') for l in lines[1:]]
diff = 0
for a, b in zip(rows, P['tbl']):
    for j in (3, 4, 5, 6, 7, 8):
        diff = max(diff, abs(float(a[j]) - float(b[j])))
    if a[0:3] != b[0:3] or a[9] != b[9]:
        diff = 99
res['saved_table_vs_screen'] = {'rows_file': len(rows), 'rows_screen': len(P['tbl']), 'max_diff': diff, 'header': lines[0]}
# 3. the d axis labels: x position -> 2theta -> d
xl, xr = ax['xl'], ax['xr']
v0, v1 = ax['view']
labs = [t for t in ax['texts'] if abs(t['y'] - (ax['yt'] - 9)) < 0.5 and t['s'].replace('.', '').isdigit()]
dmax = 0
for t in labs:
    tth = v0 + (t['x'] - xl) / (xr - xl) * (v1 - v0)
    d = lam / (2 * math.sin(math.radians(tth / 2)))
    dmax = max(dmax, abs(d - float(t['s'])) / float(t['s']))
# the 2theta of each d label, against the pixel: error in pixels
pxerr = 0
for t in labs:
    tth = 2 * math.degrees(math.asin(lam / (2 * float(t['s']))))
    x = xl + (tth - v0) / (v1 - v0) * (xr - xl)
    pxerr = max(pxerr, abs(x - t['x']))
res['d_axis'] = {'labels': [t['s'] for t in labs], 'max_rel_err_d': dmax, 'max_pixel_err': pxerr}
# 4. the saved .xy against my own profile (pseudo-Voigt, area = I, eta 0.5, FWHM 0.1 unless set)
xy = np.loadtxt(P['saved']['savexy']['file'], comments='#')
fw, eta = ax['fwhm'], ax['eta']
x = xy[:, 0]
y = np.zeros_like(x)
ref_m, _ = R.pattern(st, atoms, lam, tmin, tmax, margin=1.5)
for r in ref_m:
    if r['absent']:
        continue
    dx = x - r['tth']
    y += r['I'] * (eta * (2 / (math.pi * fw)) / (1 + 4 * dx ** 2 / fw ** 2) + (1 - eta) * (2 / fw) * math.sqrt(math.log(2) / math.pi) * np.exp(-4 * math.log(2) * dx ** 2 / fw ** 2))
    if ax['ka2']:
        s = ax['lambda2'] / (2 * r['d'])
        if s < 1:
            th2 = math.asin(s); t2 = 2 * math.degrees(th2)
            I2 = r['I'] * ax['ratio'] * R.lp(th2) / r['lp']
            dx = x - t2
            y += I2 * (eta * (2 / (math.pi * fw)) / (1 + 4 * dx ** 2 / fw ** 2) + (1 - eta) * (2 / fw) * math.sqrt(math.log(2) / math.pi) * np.exp(-4 * math.log(2) * dx ** 2 / fw ** 2))
y = 100 * y / y.max()
res['xy_vs_own_profile'] = {'n': len(x), 'x0': x[0], 'x1': x[-1], 'max_abs_diff': float(np.abs(xy[:, 1] - y).max()),
                            'at': float(x[np.argmax(np.abs(xy[:, 1] - y))]), 'comment': open(P['saved']['savexy']['file']).readline().strip()}
# 5. the CSV
rows = list(csv.reader(open(P['saved']['csv']['file'])))
hdr = rows[0]
g = np.array([float(r[0]) for r in rows[1:]])
res['csv'] = {'header': hdr, 'n': len(g), 'x0': g[0], 'x1': g[-1], 'step': float(np.median(np.diff(g)))}
sim_col = [j for j, h in enumerate(hdr) if '(simulated)' in h]
if sim_col:
    s = np.array([float(r[sim_col[0]]) if r[sim_col[0]] != '' else np.nan for r in rows[1:]])
    n = min(len(s), len(xy))
    res['csv']['sim_vs_xy_max_diff'] = float(np.nanmax(np.abs(s[:n] - xy[:n, 1])))
if meas:
    mx, my = [], []
    for line in open(meas):
        t = line.split()
        try:
            mx.append(float(t[0])); my.append(float(t[1]))
        except (ValueError, IndexError):
            pass
    mx, my = np.array(mx), np.array(my)
    top = my[(mx >= tmin) & (mx <= tmax)].max()
    myn = 100 * my / top
    mcol = [j for j, h in enumerate(hdr) if '(measured)' in h][0]
    vals = np.array([float(r[mcol]) if r[mcol] != '' else np.nan for r in rows[1:]])
    inside = (g >= mx[0]) & (g <= mx[-1])
    refv = np.interp(g[inside], mx, myn)
    res['csv']['measured_vs_own_interp_max_diff'] = float(np.nanmax(np.abs(vals[inside] - refv)))
    res['csv']['measured_empty_outside'] = bool(np.all(np.isnan(vals[~inside])))
print(json.dumps(res, indent=1, default=str))
