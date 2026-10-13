"""how many symmetry copies are 0.005-0.05 A apart (would be merged with 0.05 A but not with 0.005 A)"""
import sys, os, glob, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ref_lib as R
S = [o['f'] for o in json.load(open('h3_scan.json')) if 'err' not in o]
hits = []
for f in S:
    st = R.read_cif(os.path.join(sys.argv[1], f))
    a1, _ = R.expand(st, 0.005); a2, _ = R.expand(st, 0.05)
    if len(a1) != len(a2):
        hits.append((f, len(a1) - len(a2)))
print('files with copies 0.005-0.05 A apart:', hits)
