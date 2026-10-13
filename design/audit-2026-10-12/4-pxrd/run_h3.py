import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_case as RC
D = sys.argv[1]; picks = json.load(open(sys.argv[2])); tmax = float(sys.argv[3]); out = sys.argv[4]
res = []
for f in picks:
    p = os.path.join(D, f)
    try:
        s = RC.run(p, p, 1.54059, 3, tmax, True, False)[0]
    except Exception as e:
        s = {'file': f, 'err': str(e)[:200]}
    res.append(s)
    print(json.dumps({k: s.get(k) for k in ('file', 'ops_crysta', 'ops_ref', 'atoms_crysta', 'atoms_ref', 'n_crysta', 'n_ref', 'max_dtth', 'max_dF2_rel', 'max_drel', 'worst', 'n_missing', 'n_extra', 'n_m_mismatch', 'err')}, default=str), flush=True)
json.dump(res, open(out, 'w'), default=str)
