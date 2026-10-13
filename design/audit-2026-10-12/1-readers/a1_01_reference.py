# Reference for A1-01 (run: python3 -I a1_01_reference.py). Cell contents = sum over the sites of occupancy x the
# number of distinct copies of that site (copies closer than 0.15 A merged: a special position), from gemmi's reading
# of the file and gemmi's operators; density from gemmi's atomic weights. Also the authors' Z x _chemical_formula_sum
# and _exptl_crystal_density_diffrn.
import gemmi, numpy as np, re, sys, os
S = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/'
HERE = os.path.dirname(os.path.abspath(__file__))
def contents(path):
    doc = gemmi.cif.read(path)
    for blk in doc:
        if not blk.find_values('_atom_site_fract_x'): continue
        st = gemmi.make_small_structure_from_block(blk)
        ops = [gemmi.Op(s) for s in st.symops]
        M = np.array(st.cell.orth.mat.tolist())
        cnt = {}
        for s in st.sites:
            pts = []
            for op in ops:
                p = np.array(op.apply_to_xyz([s.fract.x, s.fract.y, s.fract.z])) % 1.0
                if any(np.linalg.norm(M @ ((p - q + 0.5) % 1.0 - 0.5)) < 0.15 for q in pts): continue
                pts.append(p)
            cnt[s.element.name] = cnt.get(s.element.name, 0) + s.occ * len(pts)
        mass = sum(n * gemmi.Element(e).weight for e, n in cnt.items())
        rho = mass / 6.02214076e23 / (st.cell.volume * 1e-24)
        fs = blk.find_value('_chemical_formula_sum'); Z = blk.find_value('_cell_formula_units_Z'); dd = blk.find_value('_exptl_crystal_density_diffrn')
        auth = None
        if fs and Z:
            F = {}
            for el, n in re.findall(r'([A-Z][a-z]?)\s*([\d.]*)', gemmi.cif.as_string(fs)): F[el] = F.get(el, 0) + (float(n) if n else 1)
            auth = {e: round(float(gemmi.cif.as_string(Z)) * n, 3) for e, n in F.items()}
        print(os.path.basename(path), blk.name, 'contents', {e: round(n, 3) for e, n in cnt.items()}, 'density %.3f' % rho, '| authors Z x formula', auth, 'density_diffrn', dd)
contents(HERE + '/cases/occupancy_sum.cif')
for f in ['1362_1.cif', '2462_1.cif', '1614_1.cif', '1793_1.cif', '1194_1.cif']: contents(S + f)
