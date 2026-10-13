# Independent reference: cell contents (occupancy x distinct symmetry copies), formula mass, density.
# usage: python3 -I ref.py file.cif [block_index] [tol_A]
import sys, json, numpy as np, gemmi
path = sys.argv[1]; bi = int(sys.argv[2]) if len(sys.argv) > 2 else 0
tol = float(sys.argv[3]) if len(sys.argv) > 3 else 0.02
doc = gemmi.cif.read_file(path)
blocks = [b for b in doc if b.find_values('_atom_site_fract_x')]
b = blocks[bi]
ss = gemmi.make_small_structure_from_block(b)
ops = None
for tag in ('_symmetry_equiv_pos_as_xyz', '_space_group_symop_operation_xyz'):
    v = list(b.find_values(tag))
    if v:
        ops = [gemmi.Op(gemmi.cif.as_string(x)) for x in v]; break
if ops is None:
    sg = ss.spacegroup
    if sg is None and len(sys.argv) > 4 and sys.argv[4] != '-v': sg = gemmi.SpaceGroup(sys.argv[4])
    ops = list(sg.operations()) if sg else [gemmi.Op('x,y,z')]
cell = ss.cell
M = np.array(cell.orth.mat.tolist())
counts = {}
mult = {}
for s in ss.sites:
    f0 = np.array([s.fract.x, s.fract.y, s.fract.z])
    copies = []
    for op in ops:
        R = np.array(op.rot) / op.DEN; T = np.array(op.tran) / op.DEN
        f = (R @ f0 + T) % 1.0
        if any(np.linalg.norm(M @ ((f - g) - np.round(f - g))) < tol for g in copies): continue
        copies.append(f)
    el = s.element.name
    counts[el] = counts.get(el, 0) + s.occ * len(copies)
    mult[s.label] = len(copies)
mass = sum(gemmi.Element(e).weight * n for e, n in counts.items())
rho = mass / (0.602214076 * cell.volume)
Zs = b.find_value('_cell_formula_units_Z')
dens = b.find_value('_exptl_crystal_density_diffrn')
fsum = b.find_value('_chemical_formula_sum')
print(json.dumps({'block': b.name, 'nops': len(ops), 'counts': {k: round(v, 4) for k, v in counts.items()}, 'mass_cell': round(mass, 3),
  'rho': round(rho, 4), 'Z_file': Zs, 'rho_file': dens, 'formula_file': fsum}))
if '-v' in sys.argv: print(mult)
