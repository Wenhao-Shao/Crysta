"""scan the HybriD3 CIFs: cell type, number of operators, sites, partial occupancy, U source, near copies"""
import sys, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R
D = sys.argv[1]
out = []
for f in sorted(glob.glob(os.path.join(D, '*.cif'))):
    try:
        st = R.read_cif(f)
    except Exception as e:
        out.append({'f': os.path.basename(f), 'err': str(e)[:80]}); continue
    c = st['cell']
    ang = (round(c.alpha, 2), round(c.beta, 2), round(c.gamma, 2))
    system = 'tri' if sum(abs(x - 90) > 0.01 for x in ang) >= 2 and abs(ang[2] - 120) > 0.01 else ('hex' if abs(ang[2] - 120) < 0.01 else ('mono' if sum(abs(x - 90) > 0.01 for x in ang) == 1 else 'orth+'))
    try:
        atoms, near = R.expand(st)
    except Exception as e:
        out.append({'f': os.path.basename(f), 'err': 'expand ' + str(e)[:60]}); continue
    els = sorted(set(s['el'] for s in st['sites']))
    out.append({'f': os.path.basename(f), 'sys': system, 'nops': len(st['ops']), 'src': st['source'], 'nsites': len(st['sites']), 'natoms': len(atoms),
                'V': round(c.volume, 1), 'partial': sum(1 for s in st['sites'] if s['occ'] < 0.999), 'noU': sum(1 for s in st['sites'] if s['u'] is None),
                'anisoOnly': 0, 'near': len(near), 'els': els})
json.dump(out, open(sys.argv[2], 'w'))
print(len(out), 'errors', sum(1 for o in out if 'err' in o))
