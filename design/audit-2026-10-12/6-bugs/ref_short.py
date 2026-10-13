# gemmi reference for A6-02: gemmi refuses a loop with a short last row. python3 -I ref_short.py
import gemmi, os
W = os.path.dirname(os.path.abspath(__file__))
for n in ['loop_short_row.cif', 'truncated.cif']:
    try:
        gemmi.cif.read(os.path.join(W, 'files', n)); print(n, 'gemmi read it')
    except Exception as e:
        print(n, 'gemmi:', e)
