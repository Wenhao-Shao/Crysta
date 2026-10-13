#!/bin/sh
# A2-09: without _cell_formula_units_Z, Z is the gcd of the cell contents (benzene-like cell -> CH, Z = 24)
cd /tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/work/2-symmetry && python3 -I repro_formula.py t5_files/benzene_like.cif t5_files/nacl_fm3m.cif
