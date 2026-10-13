#!/bin/sh
# Devil's advocate A: reproduce one graded finding. usage: sh repro.sh <id>   (Crysta via src/core.js; references own code + gemmi)
A=/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit
W=$A/work/7-devil/a; H=$A/corpus/hybrid3/structures; E=$A/corpus/examples
cd $W
cr() { node cr.js "$@"; }
ref() { python3 -I ref.py "$@"; }
case "$1" in
  A1-01|A2-01|A2-02) python3 -I mkcases.py; for f in dv_occsum dv_split_unflagged dv_half_040 dv_coincident_half dv_symdup_half dv_half_005 dv_special; do echo "== $f"; cr cases/$f.cif; ref cases/$f.cif 0 0.01; done
     for f in 1362_1 2462_1 1614_1 1793_1 1194_1 663_1 2798_1 1145_1; do echo "== $f"; cr $H/$f.cif; ref $H/$f.cif 0 0.01; done; cr $H/1259_1.cif all; ref $H/1259_1.cif 2 0.01 ;;
  A1-02) for f in 522_1 1849_1 273_1 855_1 1915_1; do cr $H/$f.cif; python3 -I groups.py $H/$f.cif; done ;;
  A1-03) cr cases/dv_two_regions.res ;;
  A1-04) node metal.js $H/1849_1.cif; node metal.js $H/589_1.cif ;;
  A1-05) cr cases/dv_labels.cif ;;
  A1-06) cr cases/dv_qpeaks.res ;;
  A1-07|A2-08) cr cases/dv_nd4cl.cif; cr $H/197_1.in ;;
  A1-08|A1-09|A1-10|A1-11|A1-12|A1-14|A1-15|A1-16) for f in dv_dummy.cif dv_frac.cif dv_loopshort.cif dv_sgname.cif dv_three.POSCAR dv_suffix.POSCAR POSCAR_dvatom dv_numbers.xyz dv_posfirst.xyz; do echo "== $f"; cr cases/$f || true; done ;;
  A1-13|A2-10|A2-11) NODE_PATH=/opt/npm-tools/node_modules node page1.js $H $W ;;
  A2-03) cr cases/dv_nacl_z.cif; for f in 1006_1 1122_1 903_1; do cr $H/$f.cif; ref $H/$f.cif 0 0.01; done ;;
  A2-04) cr cases/dv_bt_num.cif; cr cases/dv_bt_symR.cif; cr cases/dv_bt_sym.cif; ref cases/dv_bt_num.cif 0 0.01 'R -3 m:R' ;;
  A2-05) cr cases/dv_spinel.cif; ref cases/dv_spinel.cif 0 0.01 ;;
  A2-06|A2-07) node -e "const fs=require('fs');const C=require('/home/claude/crysta/src/core.js');C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json','utf8')));for (const [h,n] of [['C m c e',null],['F m 3 m',null],['F d -3 m Z',227],['B 2',null]]) { const r=C.symbolOps(h,n,{al:90,be:90,ga:90}); console.log(h,n,r?r.hall:null); }"; cr cases/dv_b2.cif; ref cases/dv_b2.cif 0 0.01 ;;
  A2-09) cr cases/dv_benzene.cif ;;
  A4-01) node crpx.js $H/1145_1.cif 1.54059 3 50 1 > c1145.json; python3 -I pxref.py $H/1145_1.cif 1.54059 3 50 0.02 1 > r1145_002.json; python3 -I pxref.py $H/1145_1.cif 1.54059 3 50 0.15 1 > r1145_015.json; python3 -I cmp_px.py c1145.json r1145_002.json; python3 -I cmp_px.py c1145.json r1145_015.json ;;
  A4-02|A4-03|A4-04) node crpx.js $E/quartz_SiO2.cif 1.54059 3 90 1 | head -c 2000; echo; node crpx.js $E/PEA2PbBr4.cif 0.71361 3 40 1 > cpea_mo2.json; python3 -I pxref.py $E/PEA2PbBr4.cif 0.71361 3 40 0.02 1 0.70932 > rpea_mo2_disp.json; python3 -I cmp_px.py cpea_mo2.json rpea_mo2_disp.json; NODE_PATH=/opt/npm-tools/node_modules node page2.js $E $W ;;
  A4-05) grep -o 'Np: \[0.0, 0.0\]' /home/claude/crysta/src/core.js | head -1 ;;
  DA-a01) cr cases/dv_neg_sameasm.cif; cr cases/dv_neg_ownasm.cif; cr cases/dv_neg.res; cr $H/1032_1.cif; python3 -I groups.py $H/1032_1.cif; python3 -I negscan.py $H ;;
  DA-a02) node scan_in.js $H; python3 -I pxref_in.py $H/220_1.in full 3 40 > r220_full.json; python3 -I pxref_in.py $H/220_1.in half 3 40 > r220_half.json ;;
  DA-a03) cr cases/dv_benzene.res ;;
  DA-a04) node -e "const C=require('/home/claude/crysta/src/core.js'); for (const h of ['P 2yb (x,y,-x+z)','-P 2ybc (x-z,y,z)','-P 4 2 3 (x+1/4,y+1/4,z+1/4)','P 31 2c (0 0 1)']) console.log(h, C.hallOps(h) ? C.hallOps(h).length : null);" ;;
  DA-a05|DA-a06) node metal.js $H/786_1.cif; node metal.js cases/dv_negI.cif; node negscan2.js $H; NODE_PATH=/opt/npm-tools/node_modules node page3.js $H $E $W ;;
  *) echo "unknown id" ;;
esac
