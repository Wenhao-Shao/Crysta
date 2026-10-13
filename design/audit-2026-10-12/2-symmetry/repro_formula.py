"""Repro helper: Crysta's formula, Z, formula mass, density and cell contents (src/core.js buildCell + analyse, the
functions the page runs) for the given files, next to an independent reference:
gemmi operators; images of one site closer than 0.05 A are one atom (special position) with the site occupancy;
atoms of different sites closer than 0.15 A add their occupancies, capped at 1; gemmi element weights (D = 2.0141);
Z from _cell_formula_units_Z read as a number (rounded); and the file's own _chemical_formula_sum x Z when given.
usage: python3 -I repro_formula.py file.cif [...]"""
import json, os, sys, subprocess, collections, tempfile, re
import numpy as np, gemmi
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from refcell import block_ops, expand, read_doc
files = [os.path.abspath(f) for f in sys.argv[1:]]
tf = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(files, tf); tf.close()
of = tf.name + '.out'
subprocess.run(['node', os.path.join(HERE, 'dump_cells.js'), tf.name, of], check=True)
cr = json.load(open(of))
for rec in cr:
    doc, _ = read_doc(rec['file'])
    for s in rec['structures']:
        b = doc.find_block(s['block']); small = gemmi.make_small_structure_from_block(b)
        ops, how = block_ops(b, small)
        ref, near, M = expand(small, ops, 0.05, keepD=True)
        occ = collections.defaultdict(float); byel = collections.defaultdict(list)
        for a in ref: byel[a[1]].append(a)
        for el, L in byel.items():
            P = np.array([a[2] for a in L]); oc = np.array([a[3] for a in L])
            d = P[:, None, :] - P[None, :, :]; d -= np.round(d); dist = np.linalg.norm(d @ M, axis=2)
            done = np.zeros(len(L), bool)
            for i in range(len(L)):
                if done[i]: continue
                g = np.where((dist[i] < 0.15) & ~done)[0]; done[g] = True; occ[el] += min(1.0, oc[g].sum())
        # deuterium keeps its own mass in the reference
        types = {x.label: x.element.name for x in small.sites}
        mass = sum((2.0141 if el == 'D' else gemmi.Element(el).weight) * v for el, v in occ.items())
        zv = b.find_value('_cell_formula_units_Z'); Z = round(float(gemmi.cif.as_string(zv))) if zv and gemmi.cif.as_string(zv) not in ('?', '.') else None
        fs = b.find_value('_chemical_formula_sum')
        info = s['info']
        print('%s [%s]' % (os.path.basename(rec['file']), s['block']))
        print('  Crysta   : formula %-34s Z %-3s M %9.2f  rho %.4f  cell %s' % (' '.join('%s%g' % (f['el'], f['n']) for f in info['formula']), info['Z'], info['formulaMass'], info['density'],
              {k: round(v, 3) for k, v in sorted(s['counts'].items())}))
        zr = Z or info['Z']
        print('  Reference: formula %-34s Z %-3s M %9.2f  rho %.4f  cell %s' % (' '.join('%s%g' % (e, round(v / zr, 3)) for e, v in sorted(occ.items())), zr, mass / zr,
              mass / (6.02214076e23 * small.cell.volume * 1e-24), {k: round(v, 3) for k, v in sorted(occ.items())}))
        if fs: print('  File     : _chemical_formula_sum %s, Z %s, M %s, rho %s' % (gemmi.cif.as_string(fs), gemmi.cif.as_string(zv) if zv else None,
                    gemmi.cif.as_string(b.find_value('_chemical_formula_weight') or '?'), gemmi.cif.as_string(b.find_value('_exptl_crystal_density_diffrn') or '?')))
