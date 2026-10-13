import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_case as RC
p = sys.argv[1]
try:
    s = RC.run(p, p, 1.54059, 3, 30, True, False)[0]
    s = {k: s.get(k) for k in ('file', 'ops_crysta', 'ops_ref', 'atoms_crysta', 'atoms_ref', 'n_crysta', 'n_ref', 'max_dtth', 'max_dd', 'max_dF2_rel', 'max_drel', 'worst', 'n_missing', 'n_extra', 'n_m_mismatch', 'm_mismatch', 'missing', 'extra')}
except Exception as e:
    s = {'file': os.path.basename(p), 'err': str(e)[-200:]}
print(json.dumps(s, default=str), flush=True)
