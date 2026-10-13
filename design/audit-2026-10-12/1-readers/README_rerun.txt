Auditor 1 (Readers): how to regenerate the derived data (removed so that no HybriD3 coordinates stay in this folder)
  node dump_crysta.js crysta_cif.json @cif_list.txt
  (cd /tmp && python3 -I $PWD/dump_gemmi.py $PWD/gemmi_cif.json @$PWD/cif_list.txt)
  (cd /tmp && python3 -I $PWD/dump_gemmi_fix.py --fix $PWD/gemmi_fix.json @$PWD/bad_list.txt)
  (cd /tmp && python3 -I $PWD/dump_gemmi_fix.py --fix2 $PWD/gemmi_fix2.json @$PWD/bad_list2.txt)
  then merge as in the session (blocks of the repaired files replace the failed ones; beta of data sets 1453/1463 is
  '93.1360(*)'/'94.0210(*)' in the file, which gemmi reads as NaN) and run compare_cif_all.py.
  FHI-aims: node aims_crysta.js aims_crysta.json in_list.txt && python3 -I aims_ref.py aims_crysta.json in_list.txt
  ASE is used from pkgs/ase_src (pip download ase==3.23.0 --no-deps, unpacked).
Finding repros: a1_01_cell_contents.js + a1_01_reference.py, a1_02_hidden_groups.js, shelx_check.js (A1-03, A1-06),
  partial_unflagged.js, a1_05_labels.sh, a1_07_deuterium.js, a1_s4_cases.js; page checks: page_load.js, page_final.js, page_export.js
