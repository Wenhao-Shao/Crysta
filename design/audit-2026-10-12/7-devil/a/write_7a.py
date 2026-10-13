import json
A = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit'
W = A + '/work/7-devil/a'
R = lambda i: W + '/repro.sh ' + i
g = []
def G(id, grade, reason, sev, was=None, dup=None, rep=None, dups=None):
    e = {'id': id, 'grade': grade, 'reason': reason, 'severity': sev, 'severity_changed_from': was, 'duplicates_of': dup, 'repro': rep or R(id)}
    if dups: e['duplicates'] = dups
    g.append(e)

# ---------- auditor 1 ----------
G('A1-01', 'Confirmed',
  "Reproduced from the case with my own file and my own cell-contents code (gemmi reading, own expansion, every distinct copy x occupancy). cases/dv_occsum.cif (mirror; Br 0.6/0.4 split 0.3 A apart, N 0.5 0.1 A off the mirror, H 0.5/0.5 0.05 A apart): Crysta Br1.2 N0.5 H1 per cell, reference Br2 N1 H2. HybriD3: 1362_1 rho 3.7091 vs 4.1367 (no-H model), 2462_1 1.9097 vs 2.323 (file 2.323), 1614_1 2.4848 vs 2.7161 (file 2.716), 1793_1 2.9185 vs 3.0224, 1194_1 3.3962 vs 3.427 (file 3.427), 1259_1 block CsSnI3_B_gamma 3.631 vs 4.5211 (file 4.521). No reading makes Crysta right: the README says every part is weighted by occupancy; the code comment 'unflagged split copies counted once' (core.js:837) is right only when both components are listed at occupancy 1 (geometry.in). It combines two mechanisms: the 0.9 A rule (A2-01) and the 0.15 A merge (A2-02). S1 kept: the subtle cases (1194_1 H6 instead of H12, 663_1 H8 instead of H9, density -0.1 to -3.4 %) look plausible, and the density is copied into the comparison table.",
  'S1', None, 'A2-01')
G('A1-02', 'Refuted',
  "The behaviour is reproduced: 522_1 shows only Pb and I in the page (drawn Pb 16, I 84 with packing images; formula C28H32I4N6Pb), and 1849_1/273_1 show 8 of 48 C, 855_1 no N, 1915_1 no C. But this is the documented README rule ('within each disorder assembly the group with the highest mean occupancy is shown'), and the CIF core dictionary defines different _atom_site_disorder_group values in one assembly as sites that are not occupied at the same time. 522_1 puts the cation groups 1/2 (0.505/0.495) and the iodide groups 3/4 (0.945/0.055) in assembly 1, so the file itself declares them alternatives. Crysta applies its documented convention to a file that misuses the assembly. The result is still poor: a guard is advisable (warn when the mean occupancies of the groups of one assembly add up to well over 1, here 2.00), and the README should say that the rule trusts the file's assemblies (see conventions). Related: A1-03 (pooled PART numbers in SHELX) and DA-a01 (negative groups).",
  'S2', None, None, W + '/repro.sh A1-02 ; page: ' + W + '/page1.js')
G('A1-03', 'Confirmed',
  "Own cases/dv_two_regions.res (FVAR 1 0.80 0.30; C1/C2 PART 1/2 with sof 21/-21, N1/N2 PART 1/2 with 31/-31): Crysta shows C0 C1 N1, so N1 (0.30) is shown and N2 (0.70) hidden. For the CIF variant with assembly '.', the README rule plus the CIF dictionary (one assembly when none is given) explain the result. A SHELX file has no assemblies, and SHELXL users reuse PART 1/2 in independent regions with their own free variables; the README does not say that all PART n of a .res file form one group chosen over the whole file. Graded as 'convention not stated', S2 kept. A further symptom of the same pooling: a PART -n group with a higher mean occupancy than the positive parts hides every positive PART of the file (cases/dv_negbest.res: PART -1 at 0.8 hides both C1 at 0.6 and C2 at 0.4, so that position is empty).",
  'S2', None, None, None, ['DA-a01 (SHELX part of it)'])
G('A1-04', 'Confirmed',
  "1849_1: Pb1 CN 10, mean Pb-X 3.179 A (I3, I4, I5 at occupancy 0.5, no group); 589_1: Sn1 CN 12 (own run of analyse). The README states only the < 0.9 A rule for unflagged split sites; it does not say that partial-occupancy sites further apart, and mixed-element sites, are drawn and bonded as full atoms. Graded as 'convention not stated', S2 kept.",
  'S2')
G('A1-05', 'Confirmed',
  "Own cases/dv_labels.cif with labels only: PB1->P, BR2->B, SN1->S, BI1->B, CL1->C, CU1->C, NA1->N, CA1->C, HG1->H, and also CD1->C, NB1->N, OS1->O, SI1->S, CO1->C, HO1->H, HF1->H, NI1->N; gemmi gives Pb, Br, Sn, Bi, Cl, Cu, Na, Ca, Hg, Cd, Nb, Os, Si, Co, Ho, Hf, Ni. Crysta's rule (upper-case second letter = label suffix) suits protein-style labels (CD1, HG1; HA1 gives H in Crysta and X in gemmi), so it is a defensible choice, but it is not stated. 'Convention not stated', S2 kept; no corpus block lacks type symbols, so the case is rare.",
  'S2')
G('A1-06', 'Confirmed',
  "Own cases/dv_qpeaks.res: Q1 and Q2 before HKLF are read as C (C 6 per cell instead of 2, formula C3N); Q3 after END is ignored. SHELXS writes its peaks before HKLF, so such files exist. Stray C atoms are drawn and enter the formula and the mol2 file. S2 kept.",
  'S2')
G('A1-07', 'Confirmed',
  "Same defect as A2-08 (elementOf maps D to H, core.js:263/265/277). 197_1.in: CH6I3NPb, 619.966 g/mol, rho 4.3005 (own run), against D 24 per cell and rho 4.342. S2 kept.",
  'S2', None, 'A2-08')
G('A1-08', 'Confirmed', "Own cases/dv_dummy.cif: Cg1 (type symbol '.', calc_flag dum) is read as C and counted. S4 kept.", 'S4')
G('A1-09', 'Confirmed', "Own cases/dv_frac.cif: Pb1 '1/3 2/3 1/4' is read as (1, 2, 1) with no message. The file is invalid CIF; S4 kept.", 'S4')
G('A1-10', 'Confirmed',
  "Own cases/dv_loopshort.cif (row Br1 with 4 of 5 values): the rows shift, 'Not read: Br1 (no coordinates)' is given, and I1 (the incomplete last row) is lost with no message. Severity raised: an atom silently missing from the structure, the formula and the density is a misleading display, not a cosmetic error. The other devil's advocate grades the same code line (core.js:220) through A6-02, where a truncated file opens with no message at all.",
  'S2', 'S4', None, None, ['A6-02'])
G('A1-11', 'Confirmed', "Own cases/dv_sgname.cif (unquoted 'P 1 21/c 1'): space group shown as 'P'; the listed operators are used. Invalid CIF; S4 kept.", 'S4')
G('A1-12', 'Confirmed', "Own cases/dv_three.POSCAR ('1.0 1.0 2.0'): V 210.0 A^3 and c 7.000 A; with per-axis scaling (ASE, VASP 6) c = 14.0 A and V = 420.0 A^3. S4 kept.", 'S4')
G('A1-13', 'Confirmed',
  "In the page: cases/dv_empty.zip gives 'Could not read dv_empty.zip. No atom sites with fractional coordinates were found in this file.'; cases/dv_outer.zip opens only 'top' and says nothing about nested.zip. A file named control.in matches STRUCTURE_NAME (/\\.in$/, core.js:769) and is read as a structure. Messages only; S4 kept.",
  'S4', None, None, W + '/repro.sh A1-13 (page1.js)', ['A6-11 (empty-zip part)'])
G('A1-14', 'Confirmed', "Own cases/dv_numbers.xyz (atomic numbers) and cases/dv_posfirst.xyz (Properties=pos:R:3:species:S:1) both give 'No atoms were found in this XYZ file.' S4 kept.", 'S4')
G('A1-15', 'Confirmed', "Own cases/dv_suffix.POSCAR: labels Pb_d1, Br/abc1, C_s1; the elements are right. S4 kept.", 'S4')
G('A1-16', 'Confirmed', "Own cases/POSCAR_dvatom (comment line 'atom 12 relaxed'): 'No atoms were found in this geometry.in file.' The geometry.in test (core.js:716) runs before the POSCAR name test. S4 kept.", 'S4')

# ---------- auditor 2 ----------
G('A2-01', 'Confirmed',
  "Own cases: dv_split_unflagged.cif (P1, Cl 0.6/0.4, 0.5 A apart): Crysta Cl0.6Na, rho 0.0735; reference ClNa, 0.0970. dv_half_040.cif (P-1, Cl 0.5 at 0.2 A from the centre): Cl0.5Na, rho 0.0676 against 0.0970; the page shows 'Cl0.5Na' and rho 0.068. counts at core.js:839 leave out dropSites and dropAtoms. Under the 'alternates' reading of the README, the alternates still add up to occupancy 1, so no reading makes 0.6 or 0.5 right. Root of the 0.9 A group. S1 kept (see A1-01).",
  'S1', None, None, None, ['A1-01'])
G('A2-02', 'Confirmed',
  "Own cases: dv_coincident_half.cif (two Cl sites 0.5 + 0.5, 0.05 A apart): Cl0.5 instead of Cl1; dv_symdup_half.cif (P-1, H2 = inversion image of H1, 0.5 each): H1 instead of H2; dv_half_005.cif (P-1, Cl 0.5 with copies 0.05 A apart): Cl0.5 instead of 1. Control dv_special.cif (Cl exactly on the centre) is right. HybriD3: 1194_1 H 24 instead of 48 per cell, rho 3.3962 vs 3.427 (file 3.427); 663_1 1.7908 vs 1.7981 (file 1.798); 2798_1 2.7433 vs 2.7701 (file 2.770). Root of the 0.15 A group. S1 kept.",
  'S1', None, None, None, ['A4-01', 'A1-01 (coincident-site part)'])
G('A2-03', 'Confirmed',
  "Own cases/dv_nacl_z.cif (Z 3.9999): Z 3, Cl1.33Na1.33, 77.92 g/mol; 1006_1 (Z 2.99988): Z 2, C3Cl9Gd1.5K1.5N3, 691.63 g/mol against 461.10; 1122_1 and 903_1 likewise; the density is right (2.0973 = file 2.097). Severity lowered: the density is unaffected, the wrong Z always comes with a formula that has fractional metal counts (Gd1.5K1.5), which nobody would copy into a paper, and the file breaks the CIF type of Z (an integer). It is a misleading display.",
  'S2', 'S1')
G('A2-04', 'Confirmed',
  "Own cases/dv_bt_num.cif (Bi2Te3, rhombohedral cell, _space_group_IT_number 166 only): 36 operators, Bi30Te39, rho 110.27 against 7.8515 with R -3 m:R; 'R -3 m R' plus 166 (dv_bt_symR.cif) gives the same result; 'R -3 m' (dv_bt_sym.cif) is right. gemmi ignores a number given alone (P1, 3 atoms), so neither program is right, but Crysta already has the cell test on the H-M path (core.js:154). S2 kept.",
  'S2', None, None, None, ['A6-04'])
G('A2-05', 'Confirmed',
  "Own cases/dv_spinel.cif ('F d -3 m', origin-2 coordinates): Crysta 'F 4d 2 3 -1d' (origin 1), AlMg2O, rho 2.304; origin 2 gives MgAl2O4, rho 3.5787. gemmi's CIF reader takes origin 2 and its name lookup takes origin 1, so both conventions are in use. Crysta's choice is not stated; the page says only 'standard setting assumed'. 'Convention not stated', S2 kept.",
  'S2', None, None, None, ['A6-05'])
G('A2-06', 'Confirmed',
  "symbolOps returns null for 'C m c e', 'Cmce', 'A e a 2', 'A e m 2', 'C m m e', 'C c c e', 'Fm3m', 'F m 3 m', 'Pm3m', 'Ia3d', 'Fd3m'; gemmi finds all of them. 'F d -3 m Z' with 227 gives origin 1. The card says 'Symmetry: none found; P1 assumed', so the user is told. S4 kept. Auditor 6 graded the e-symbol part (A6-03) as S2; this grade covers the group.",
  'S4', None, None, None, ['A6-03'])
G('A2-07', 'Confirmed',
  "Own cases/dv_b2.cif: Crysta maps 'B 2' to 'B 2y' (C 4, Fe 4 per cell); gemmi gives B 1 1 2 ('B 2': C 4, Fe 2). Crysta applies the unique-axis-b default of P2 and C2 to B2, but ITA lists B centring for No. 5 only with unique axis c. 'Convention not stated'; S4 kept (one table key).",
  'S4')
G('A2-08', 'Confirmed',
  "Own cases/dv_nd4cl.cif (type symbol D): ClH4N, 53.489 g/mol, rho 1.5468; with m(D) = 2.0141: 57.513 g/mol, rho 1.6632 (-7.0 %). 197_1.in: rho 4.3005 against 4.342. Severity lowered: the formula shows H for a file that names D, so the user sees the substitution; X-ray scattering (PXRD) is not affected; deuterated structures are rare. Misleading display, not a hidden wrong number.",
  'S2', 'S1', None, None, ['A1-07'])
G('A2-09', 'Confirmed',
  "Own cases/dv_benzene.cif (4 C6H6 per cell, no Z): formula CH, Z 24, 13.02 g/mol. For one-metal hybrid formulas (all HybriD3 geometry.in files) the gcd gives the expected unit, which is why the corpus does not show it. 'Convention not stated', S2 kept. Related: DA-a03 (the SHELX ZERR line, which holds Z, is not read).",
  'S2')
G('A2-10', 'Confirmed', "In the page, cases/dv_half_040.cif shows a 'Disorder' row with an empty value (hasMinor through dropAtoms only). S4 kept.", 'S4', None, None, W + '/repro.sh A2-10 (page1.js)')
G('A2-11', 'Confirmed', "In the page, 1259_1 shows '<i>Pm-3m</i>' in the Crystal card and the header (no bar, whole symbol italic); sgHtml splits at spaces only. S4 kept.", 'S4', None, None, W + '/repro.sh A2-11 (page1.js)')

# ---------- auditor 4 ----------
G('A4-01', 'Confirmed',
  "Own structure-factor code (gemmi IT92 f0, gemmi Cromer-Liberman f'/f'', README LP, orbit-mean |F|^2), 1145_1, Cu Ka1, 3-50 deg: I(0 4 0) 84.892 in Crysta against 86.867 when copies merge only below 0.02 A; |F|^2(1 1 0) 1623.5 against 228.8. With a 0.15 A merge my code reproduces Crysta (largest difference only in the 1.5 deg margin). The CIF gives Sn1 site multiplicity 4 in a 4-operator group, so copies 0.051 A apart do not 'coincide' (README). This is the same 0.15 A rule as A2-02, at a second code site (powderAtoms, core.js:2531). S1 kept, but borderline: 2.0 % of the strongest reflection, and only 2 of 428 files exceed the 1 % tolerance.",
  'S1', None, 'A2-02')
G('A4-02', 'Confirmed',
  "Own cases/dv_comma.csv ('10,02;100,0'): readXY gives x = 10,10,10,... and y = 0,2,4,...; in the PXRD window the file is accepted as '200 points' with no note. The README says only 'two columns of text', so decimal commas are not excluded. The auditor saw the 2-theta range change to 10-13 deg; in my run it stayed 3-90 because I had typed the range (pxrd.js:878 keeps a typed range), which explains that difference. S3 kept: the comparison cannot be made and nothing says why.",
  'S3', None, None, W + '/repro.sh A4-02 (page2.js)')
G('A4-03', 'Confirmed',
  "anodeOf(0.71361) = null, anodeOf(0.56381) = null, anodeOf(1.535) = Cu. PEA2PbBr4 at lambda 0.71361: I(0 0 2) 97.97 in Crysta against 96.30 with Mo f'/f'' (own code). In the page at 0.71361 the note says f' and f'' are 'tabulated for the K-alpha lines of ... Mo ...' and uses 0 at this Mo K-alpha line; at 1.535 A there is no note and the Cu values are used, against README 'zero at any other wavelength'. The page tells the user what it does at Mo Ka2, so S4 kept.",
  'S4', None, None, W + '/repro.sh A4-03 (page2.js)')
G('A4-04', 'Confirmed',
  "In the page, quartz row (2 1 0): F(real) 3.273, F(imag) -2.509, |F| 3.867; |F(2 1 0)| = 4.124; root of the mean |F|^2 of the set = 3.868 (own code). The note '|F| is for one reflection of the set' can also be read as 'per reflection, not summed over M', which makes it ambiguous rather than false. Next to F(real) and F(imag) of the named reflection it still misleads, and it does not match README:128. S2 kept (definition text).",
  'S2', None, None, W + '/repro.sh A4-04 (page2.js)')
G('A4-05', 'Confirmed', "XRAY_DISP holds [0, 0] for Np, Pu, Am and Cm at all six anodes; the README does not say so. Effect below tolerance in the auditor's PuO2 case (0.33 %). S4 kept.", 'S4')

new = [
 {'id': 'DA-a01', 'what': "Negative disorder groups (disorder over a symmetry element) can lose every orientation: in a CIF, a negative group that shares an assembly with other groups is hidden whole when another group has a higher mean occupancy (the CIF reader has no exemption for negative groups, the SHELX reader has); in SHELX, a PART -n with the highest mean occupancy hides every positive PART of the file. The README says that for negative parts 'one orientation is kept'.",
  'where': 'disorder: major-group rule; src/core.js:429 (CIF, no symdis exemption) against :654 (SHELX, exemption, but best is chosen over all parts including negative ones)',
  'case': "Made-up cases/dv_neg_sameasm.cif (P-1; I1/I2 groups 1/2 at 0.8/0.2 in assembly A; an N-C cation in group -1, also in assembly A): Crysta shows Pb and I only. The same file with the cation in assembly B (dv_neg_ownasm.cif), or as .res with PART -1 (dv_neg.res), shows the cation. HybriD3 1032_1: the organic cation (12 sites, group -2, assembly A) and I1 (group 1, 0.762, assembly A); open it: the page draws Pb and I only, 'Atoms per cell 3', formula C2.62H2.38I1.52PbS0.08. SHELX: cases/dv_negbest.res (C1/C2 PART 1/2 at 0.6/0.4, N1/O1 PART -1 at 0.8): C1 and C2 are both hidden.",
  'crysta': '1032_1: no C, N, S or H drawn; dv_neg_sameasm: cation hidden; dv_negbest.res: no atom at the C1/C2 position',
  'reference': 'one orientation of each negative group shown (README); the major positive part (C1) shown',
  'reference_source': "README 'Disorder'; the Crysta SHELX path for the same model (dv_neg.res); own reading of the groups (groups.py, negscan.py: 15 assemblies in 9 HybriD3 blocks mix negative and other groups; 1032_1 is the one that loses a whole cation)",
  'difference': 'whole molecule or whole disordered position missing from the picture and from all geometry',
  'severity': 'S2', 'confidence': 0.7,
  'note': "Counter-reading: under the CIF dictionary, groups in one assembly are alternatives, so 1032_1 is a questionable file (compare A1-02). The finding stands on the README promise and on the CIF/SHELX inconsistency.",
  'repro': R('DA-a01')},
 {'id': 'DA-a06', 'what': "A metal or halide in a negative disorder group keeps both symmetry orientations: both copies are drawn and bonded, so the octahedron mixes the two orientations. The README says 'one orientation is kept'; the code keeps one orientation only for molecules (core.js:1009).",
  'where': 'buildCell / framework card (CN, cis angles, sigma^2, Delta d); src/core.js:822-835 (the split rule skips flagged atoms), :1009 (orientation filter for molecules only)',
  'case': "HybriD3 786_1 (and its twin data set 974_1): Pb1 and I1 in group -1 (assembly A, occupancy 0.5), I3 in group -2; the copies of Pb1 are 0.445 A apart. Open 786_1 and read the Framework card. Made-up cases/dv_negI.cif (P-1, Pb at the origin, I1 group -1 occupancy 0.5 at 0.19 A from the centre at (1/2, 0, 0)).",
  'crysta': "786_1 (page): Pb1 cis X-M-X 26.8-153.4 deg, sigma^2 1426.9 deg^2, Delta d 18.86 x 10^-4, 'octahedral'; dv_negI: Pb CN 8, no Disorder row",
  'reference': 'one orientation: Pb1 an octahedron with cis angles near 90 deg; dv_negI: CN 6',
  'reference_source': 'README Disorder rule; own pair search of the shown copies (negscan2.js finds 786_1, 974_1 and 521_1 F3/F8)',
  'difference': 'sigma^2 1427 deg^2 instead of a value of order 10-100; CN 8 instead of 6',
  'severity': 'S2', 'confidence': 0.8, 'repro': R('DA-a06') + ' ; page: ' + W + '/page3.js'},
 {'id': 'DA-a02', 'what': "For a file without occupancies that lists both components of a split site (10 HybriD3 geometry.in files), the picture and the formula treat the pair as alternates and count one, but the powder pattern counts both at full weight. The PXRD window gives no note, and the README does not say that the two cell contents differ.",
  'where': 'powderAtoms (src/core.js:2518-2536) against buildCell counts (:837-839); PXRD window',
  'case': "HybriD3 220_1.in (Cl1/Cl2, Cl3/Cl4, Cl5/Cl8 ... closer than 0.9 A). Open it; the Crystal card lists 'unflagged split sites'; open Powder XRD, Cu Ka1, 3-40 deg. The other files: 2006_1, 2007_1, 2020_1, 2545_1, 2546_1, 554_1, 560_1, 609_1, 658_1 (.in).",
  'crysta': '220_1.in formula Cl4 per cell, pattern from Cl8 (and N4/C52 against N2/C42); rel. I at 18.655 deg 20.7, at 10.515 deg 16.0, at 22.995 deg 14.0',
  'reference': "model in which each atom of a pair < 0.9 A has occupancy 0.5 (the formula's cell contents): 80.7, 57.4, 40.1",
  'reference_source': 'own geometry.in reader and structure-factor code (pxref_in.py; gemmi IT92 and Cromer-Liberman; B = 1 A^2 as Crysta); Crysta reproduced to 2e-4 with all atoms at full weight',
  'difference': 'up to 60 % of the strongest reflection for 220_1.in; formula and pattern from different cell contents',
  'severity': 'S2', 'confidence': 0.75,
  'note': 'The README PXRD rule (each part with its occupancy, which is 1 in this format) is followed literally, so this is graded as convention not stated: the pattern contradicts the formula on the same screen.',
  'repro': R('DA-a02')},
 {'id': 'DA-a03', 'what': "The SHELX reader ignores Z on the ZERR line, so Z comes from the gcd of the cell contents: a molecular crystal gets its empirical formula.",
  'where': 'readShelx (ZERR in SHELX_WORDS, src/core.js:552); analyse Z fallback :1459-1460',
  'case': 'Made-up cases/dv_benzene.res (ZERR 4, four C6H6 per cell). Open it; read Formula, Z and Formula mass.',
  'crysta': 'Formula CH, Z 24, 13.02 g/mol', 'reference': 'C6H6, Z 4, 78.11 g/mol', 'reference_source': 'the ZERR line of the file',
  'difference': 'Z x6, formula mass /6; density not affected', 'severity': 'S4', 'confidence': 0.85, 'repro': R('DA-a03')},
 {'id': 'DA-a04', 'what': "Hall symbols with a change of basis in (x,y,z) form are not parsed. Without another symbol, the card then says 'none found; P1 assumed' although the file gives a Hall symbol.",
  'where': 'hallOps, src/core.js (returns null); cifStructure :365-372',
  'case': "hallOps('P 2yb (x,y,-x+z)'), hallOps('-P 2ybc (x-z,y,z)'), hallOps('-P 4 2 3 (x+1/4,y+1/4,z+1/4)'); the vector form 'P 31 2c (0 0 1)' works",
  'crysta': 'null (no operators)', 'reference': 'gemmi.symops_from_hall: 2, 4 and 48 operators', 'reference_source': 'gemmi 0.7.5',
  'difference': 'symmetry lost for these Hall forms (rare in CIFs)', 'severity': 'S4', 'confidence': 0.8, 'repro': R('DA-a04')},
 {'id': 'DA-a05', 'what': "'Atoms per cell' in the Crystal card counts only the shown component, while the PXRD window gives a different 'atoms per cell' (every copy of every part) for the same structure.",
  'where': 'drawSheet, src/workbench.template.html:1016 (info.nAtoms); src/pxrd.js:351 (pat.nAtoms)',
  'case': 'Open the sample FCA3_2PbBr4_294K.cif; compare the Crystal card and the Reference structures list of the PXRD window. Also 522_1.',
  'crysta': 'FCA3: card 220, PXRD window 276; 522_1: card 20, PXRD 556', 'reference': 'one number, or labels that say what is counted (occupancy-weighted: 221.7 and 284)',
  'reference_source': 'page check page3.js; uc.counts summed', 'difference': 'two numbers under one label', 'severity': 'S4', 'confidence': 0.8, 'repro': R('DA-a05') + ' (page3.js)'}
]

conventions = [
 "Formula, formula mass and density: how unflagged split sites, copies of one site closer than 0.9 A, and atoms closer than 0.15 A are counted. Today the first listed is counted at its own occupancy; the README says every part weighted by occupancy (A2-01, A2-02, A1-01). After a fix, state the rule, e.g. occupancies of one position added and capped at 1.",
 "The distance below which symmetry copies of one site 'coincide' and count once: 0.15 A in buildCell, powderAtoms and the SHELX multiplicity correction (A4-01, A2-02).",
 "Partial-occupancy sites without disorder flags that are 0.9 A or more from any same-element site, and mixed-element sites, are drawn and bonded as full atoms (A1-04).",
 "Element from the label when there is no type symbol: a two-letter element only when the second letter is lower case, or when the first letter alone is no element (PB1 -> P, CD1 -> C) (A1-05).",
 "Disorder groups: the major group is chosen per assembly as the file gives it, also when an assembly holds independent molecules; '.' counts as one assembly; in a SHELX file all PART n of the whole file form one group (A1-02, A1-03).",
 "Negative disorder groups: the README promises one orientation, but the code keeps one orientation only for molecules, and a negative group can be hidden by the major-group rule (DA-a01, DA-a06). This is a defect, not only a convention.",
 "Deuterium is read as H (formula and mass of H) (A2-08, A1-07).",
 "A space-group symbol without an origin choice gets origin choice 1; an R symbol without :H/:R gets the setting from the cell; an IT number alone gets the hexagonal setting for R groups (A2-05, A2-04).",
 "Short monoclinic symbols get unique axis b, also B2 (A2-07); e-glide symbols, symbols without the bar and ICSD suffixes are not known (A2-06).",
 "Z: _cell_formula_units_Z is truncated to an integer; without it Z is the gcd of the cell contents (empirical formula); the SHELX ZERR line is not read (A2-03, A2-09, DA-a03).",
 "f' and f'' are used when lambda1 is within 0.4 % of a K-alpha1 line (so Cu, Co, Fe and Cr K-alpha2 match, Mo and Ag K-alpha2 do not, and 1.535 A gets the Cu values); Np to Cm have f' = f'' = 0 (A4-03, A4-05).",
 "The |F| column is the root of the mean |F|^2 of the set; the page note should say so (A4-04).",
 "Measured data: decimal point only; a decimal comma is not read (A4-02).",
 "The powder pattern counts both components of an unflagged split site at their file occupancy (1 in geometry.in, POSCAR and XYZ), while the formula counts one (DA-a02).",
 "A negative U or B is set to 0 in the powder pattern (powderAtoms, Math.max(0, u)); none occurs in the corpus (gap check).",
 "'Atoms per cell' in the Crystal card is the shown component; the PXRD window counts every copy of every part (DA-a05)."
]

gaps = [
 "CHECKED: negative disorder groups in CIF and SHELX, and framework atoms in them (no auditor tested negative groups beyond the README molecule case): defects DA-a01 and DA-a06; the README molecule case is right (cases/dv_negcentre.cif keeps one orientation).",
 "CHECKED: geometry.in files that list both components of a split site (auditor 2 noted 13, I find 10 with hidden atoms): the formula counts one component, the powder pattern counts both, DA-a02.",
 "CHECKED: 631_1 (U values about 1000 times too large, left open by auditor 1): the pattern collapses to (0 0 1) = 100 with everything else at 1.3 or less, and no warning is given. This is a file error that gemmi reads the same way; a plausibility note (U > 1 A^2) is suggested, not graded. 1751_1 has 3 such sites.",
 "CHECKED: negative U in the corpus: none; the code clamps U to 0 (conventions).",
 "CHECKED: SHELX ZERR (Z): not read, DA-a03.",
 "CHECKED: Hall symbols with a change of basis (auditor 2 not_checked): (x,y,z) forms fail, DA-a04; the vector form '(0 0 1)' works.",
 "CHECKED: DDLm dotted tags (_atom_site.fract_x, _cell.length_a): Crysta refuses with 'No atom sites with fractional coordinates were found'; gemmi reads 0 sites too. Agrees, not a finding.",
 "CHECKED: reflections in the 1.5 deg margin outside the 2-theta range (rel. I can exceed 100, e.g. 1201 at 2.454 deg for PEA2PbBr4 with Mo, 3-40 deg): they are left out of the table (pxrd.js:665), and the profile is scaled to its highest point inside the range. Right.",
 "CHECKED: parseSymop on common legal forms ('1/2+x', 'x+.5', '-x+y', 'X,Y,Z', spaces): read correctly. A form that cannot be read is dropped without a message (auditor 2 noted this); I found no legal form that is dropped, so it is not graded.",
 "CHECKED: chained unflagged split sites (A-B < 0.9 A, B-C < 0.9 A, A-C 1.4 A): C is hidden as well. This is harmless for real structures; not graded.",
 "CHECKED: page check of each graded class (Crystal card, Disorder row, symbol display, zip messages, PXRD table note, f'/f'' note, decimal-comma data, framework card for 786_1, atoms per cell).",
 "NOT CHECKED: SHELX 'PART n sof' when the atom line also gives a sof (the SHELXL manual could not be fetched); EXYZ, EADP and SUMP.",
 "NOT CHECKED: CIF 2.0 syntax, files in UTF-16 or Latin-1, XYZ files with several frames, Zip64 and encrypted archives.",
 "NOT CHECKED: the PXRD cut note in the page with a cell large enough to need the cut (auditor 4 tested the logic in Node only); PXRD from a zip or an extended XYZ in the window.",
 "NOT CHECKED: the 7 HybriD3 CIFs that gemmi cannot parse (no independent reference for expansion or pattern).",
 "NOT CHECKED: the effect of the 'Minor disorder parts' toggle on geometry (auditor 2 not_checked); A6-10 covers its loss of measurements."
]

new.sort(key=lambda x: x['id'])
out = {'grades': g, 'new_findings': new, 'conventions': conventions, 'gaps': gaps}
json.dump(out, open(A + '/findings/7a.json', 'w'), indent=1, ensure_ascii=False)
from collections import Counter
print(Counter(x['grade'] for x in g), len(g), len(new))
