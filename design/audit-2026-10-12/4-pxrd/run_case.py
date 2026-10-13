"""Compare Crysta's powderPattern with the reference for one structure.
usage: python3 -I run_case.py CRYSTA_FILE REF_CIF [lambda] [tmin] [tmax] [disp 1|0]
CRYSTA_FILE is the file that Crysta reads; REF_CIF is the CIF that the reference reads (often the same file)."""
import sys, json, subprocess, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R

W = os.path.dirname(os.path.abspath(__file__))


def crysta(file, lam, tmin, tmax, disp=True, bd=None, env=None):
    args = ['node', os.path.join(W, 'crysta_pat.js'), file, str(lam), str(tmin), str(tmax), '1' if disp else '0']
    if bd is not None:
        args.append(str(bd))
    out = subprocess.run(args, capture_output=True, text=True, env=env or os.environ.copy())
    if out.returncode:
        raise RuntimeError(out.stderr)
    return json.loads(out.stdout)


def run(cfile, rcif, lam=1.54059, tmin=3, tmax=60, disp=True, verbose=True):
    c = crysta(cfile, lam, tmin, tmax, disp)
    st = R.read_cif(rcif)
    atoms, near = R.expand(st)
    ref, f000 = R.pattern(st, atoms, lam, tmin, tmax, disp_lam='same' if disp else None)
    cmp = R.compare(c['refl'], ref, tmin, tmax)
    summ = {'file': os.path.basename(cfile), 'ops_crysta': c['nops'], 'ops_ref': len(st['ops']), 'sym': st['source'],
            'atoms_crysta': c['nAtoms'], 'atoms_ref': len(atoms), 'noU': c['noU'], 'anode': c['anode'], 'cut': c['cut'],
            'tthMax': c['tthMax'], 'near_copies': sorted(set((n[0], round(n[1], 3)) for n in near))[:5]}
    summ.update({k: v for k, v in cmp.items() if k not in ('missing', 'extra', 'm_mismatch')})
    summ['n_missing'] = len(cmp['missing'])
    summ['missing'] = cmp['missing'][:5]
    summ['n_extra'] = len(cmp['extra'])
    summ['extra'] = cmp['extra'][:5]
    summ['n_m_mismatch'] = len(cmp['m_mismatch'])
    summ['m_mismatch'] = cmp['m_mismatch'][:5]
    if verbose:
        print(json.dumps(summ, default=str))
    return summ, c, ref, st, atoms


if __name__ == '__main__':
    a = sys.argv[1:]
    run(a[0], a[1], float(a[2]) if len(a) > 2 else 1.54059, float(a[3]) if len(a) > 3 else 3,
        float(a[4]) if len(a) > 4 else 60, (a[5] != '0') if len(a) > 5 else True)
