# Independent audit of Crysta v0.5.2: plan

Status: plan for the design in `2026-10-12-audit-design.md`. The coordinator gives these prompts to the agents.

**Goal:** find wrong numbers, wrong definitions, display errors and bugs in Crysta v0.5.2, with evidence that does not depend on Crysta.

**Method:** six auditors work in parallel. Each auditor gets the common brief and the task of its area. Then the devil's advocate tests all the findings. The coordinator writes the report.

**Tools:** gemmi 0.7.5, spglib 2.8.0, pymatgen 2026 (core and diffraction), numpy, Node and Playwright with Chromium (software GL).

`$A` is the audit folder in the scratchpad of the session: `/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit`.

---

## Step 1: prepare the audit folder (done)

- `$A/corpus/examples/`: the four sample structures.
- `$A/corpus/tests-files/`: NaCl.res, rutile.POSCAR, water.xyz, an FHI-aims geometry.in and a HybriD3 zip.
- `$A/corpus/hybrid3/structures/`: 657 HybriD3 files (435 CIF, 222 geometry.in), and `structures.json`. These files stay in the scratchpad.
- `$A/work/`: one folder for each auditor.
- `$A/findings/`: one JSON file for each auditor.
- The page boots from `dist/Crysta.html` with the Playwright settings of the brief (checked).

## Step 2: the common brief

The text below is `$A/BRIEF.md`. Each auditor reads it first.

````markdown
# Crysta audit: brief for each auditor

You are one of six independent auditors of Crysta v0.5.2. Crysta is a crystal-structure workbench in one HTML page. It reads structure files, expands the symmetry, draws the structure (3Dmol.js), measures distances, angles, torsions and planes, analyses metal-halide frameworks (2D perovskites), finds hydrogen bonds and calculates powder XRD patterns.

Read these files first:
1. /home/claude/crysta/design/2026-10-12-audit-design.md (the contract of the audit)
2. /home/claude/crysta/README.md (what Crysta says it does, and its definitions)

## Paths

- Repository, READ ONLY: /home/claude/crysta
  - dist/Crysta.html: the built page (the object of the test)
  - src/core.js: the pure functions (readers, symmetry, geometry, analysis, PXRD). Also in the page as window.XtalCore.
  - src/workbench.template.html: the page code (cards, Measure, framework rows, glow, exports)
  - src/pxrd.js: the PXRD window. src/dbs.js: the Databases window.
  - src/sg-table.json: the space-group table of Crysta
- Audit folder: A=/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit
  - $A/corpus/examples/  (FCA3_2PbBr4_294K.cif, PEA2PbBr4.cif, quartz_SiO2.cif, urea.cif)
  - $A/corpus/tests-files/  (NaCl.res, rutile.POSCAR, water.xyz, hybrid3_2008_geometry.in, hybrid3_2008_download.zip)
  - $A/corpus/hybrid3/structures/  (657 HybriD3 files: 435 .cif, 222 .in = FHI-aims geometry.in). Index: $A/corpus/hybrid3/structures.json. Most CIFs have _geom_bond_* and _geom_angle_* loops (the authors' published values).
  - Your work folder: $A/work/<n>-<name>/  Put every script and every made-up file there.
  - Your output: $A/findings/<n>.json

## Rules

1. Do not read tests/run.js or other files in tests/ (except tests/files). Do not read files in the scratchpad outside $A. Do not read the work folders or findings of the other auditors.
2. Do not change the repository: no edits, no commits, no builds. If you need a changed copy, copy it into your work folder.
3. Use the HybriD3 files in place. Do not copy them into your work folder. In your findings, name a HybriD3 structure by its file name or data set number and the atom labels only. Do not paste file content.
4. A reference value comes from code that shares nothing with Crysta: gemmi, spglib, pymatgen, numpy, or your own code. src/core.js is the object of the test. It is never a reference. Do not copy its formulas into your reference code: write each reference from the definition in the README or the literature.
5. Run Python on HybriD3 files or on hostile files with `python3 -I`.
6. Check each class of finding at least once in the page, the way a user sees it (the text in the cards, the files that the page saves).

## How to get Crysta's values

In the page (Node + Playwright):

```js
// run with: NODE_PATH=/opt/npm-tools/node_modules node script.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', ['/path/to/file.cif']);   // the same path as "Open structure files"
  await p.waitForTimeout(1500);                             // one render takes about 0.4 s in software GL
  const r = await p.evaluate(() => { const s = window.crysta.state; const d = s.docs[s.cur]; return { info: d.info, n: d.uc.atoms.length }; });
  await p.screenshot({ path: 'shot.png' });
  await b.close();
})();
```

- window.crysta = { state, viewer, addFiles, elemLook, pxrd, dbs }. state.docs[state.cur] is the open structure: .struct (as read), .uc (unit cell after symmetry), .info (framework analysis), .measures, .mplanes, .hbRows.
- window.XtalCore has all the functions of src/core.js.
- Read the source of the page to learn how a user action runs (for example, which function a click on a framework row calls), then do the action with real clicks where possible.

In Node, for many values fast:

```js
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
C.setSgTable(JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8')));
const s = C.readStructure(text, name);   // read the source for the signatures of buildCell, analyse, assemble, powderPattern ...
```

## Tolerances (from the design)

- Distance 0.001 Å. Angle 0.01° (Crysta shows 2 decimals).
- Against a published CIF value: within the last digit given, and within 3 s.u. where an s.u. is given.
- PXRD: 2θ within 0.001°. Relative intensity within 1 % of the strongest reflection, with the same conventions.

## Before you report a finding

- Reproduce it twice. Make the case as small as possible.
- Look for a documented convention (README, page text) that explains the difference. If a convention explains it but the README and the page do not state it, report "convention not stated" as S2.
- A difference in the 4th decimal that comes from rounding is not a finding.

## Output: $A/findings/<n>.json

```json
{
  "auditor": 3,
  "name": "Geometry and descriptors",
  "summary": "2 to 4 sentences",
  "checked": [
    { "item": "M–X distances", "cases": "PEA2PbBr4; 120 HybriD3 CIFs (812 bonds)", "reference": "published _geom_bond loops; numpy", "result": "agrees", "max_difference": "0.0004 Å" }
  ],
  "findings": [
    {
      "id": "A3-01",
      "what": "one sentence",
      "where": "feature; src/core.js:1234",
      "case": "structure, atoms or reflection, and the steps to reproduce",
      "crysta": "value that Crysta shows",
      "reference": "correct value",
      "reference_source": "how the reference was calculated, and the script",
      "difference": "...",
      "severity": "S1",
      "confidence": 0.9,
      "repro": "$A/work/3-geometry/a3_01.py"
    }
  ],
  "not_checked": ["..."]
}
```

Severity: S1 a wrong number that a user can report in a paper. S2 a misleading display, a wrong definition text, or a saved file that does not agree with the screen. S3 a bug that stops a task, loses work or freezes the page. S4 a small or cosmetic error.

"checked" is as important as "findings": an area that you checked and found correct is a result.

## Your last message

Give the path of your JSON file, the number of findings for each severity, and the three most serious findings in one line each. Do not paste the JSON.
````

## Step 3: the six auditors (in parallel)

Each prompt is: "Read $A/BRIEF.md. You are auditor N." plus the task below.

### Auditor 1: Readers

Work folder `$A/work/1-readers`, output `$A/findings/1.json`.

1. CIF. For all 435 HybriD3 CIFs and the examples, compare Crysta's reader (readStructure / readCifAll) with gemmi (`gemmi.cif.read`, `gemmi.make_small_structure_from_block`): the number of data blocks, cell lengths and angles, the space-group name and the symmetry operators that the file gives, the atom labels, the element of each atom, fractional coordinates, occupancy, Uiso and Uaniso.
2. Hard CIF cases: make small files with several data blocks; values with s.u. "1.234(5)"; "?" and "."; no `_atom_site_type_symbol`; labels such as "Pb1A", "Br1_a", "CL1", "D1", "N1+"; type symbols with charges ("Pb2+", "O2-"); `_atom_site_disorder_group` and `_atom_site_disorder_assembly`; `_atom_site_calc_flag`; atoms with `_atom_site_refinement_flags`; text fields with ";"; CRLF line ends; loops that end with a comment. Compare with gemmi.
3. SHELX .res/.ins: make files with SFAC, LATT (positive and negative, all types), SYMM, FVAR with free variables in occupancy (for example 21.0, -21.0, 10.5), PART, AFIX, Q peaks, HKLF and END. Calculate the expected atoms by hand from the SHELX manual.
4. POSCAR/CONTCAR: VASP 4 (no element line) and VASP 5, Selective dynamics, Direct and Cartesian, a negative scale (cell volume), several species. Compare with `pymatgen.io.vasp.Poscar`.
5. XYZ and extended XYZ (Lattice="..."). FHI-aims geometry.in: `atom` and `atom_frac`, `lattice_vector`, comments, the 222 HybriD3 .in files (compare with your own parser).
6. Zip: stored and deflated entries, folders, `__MACOSX`, files that are not structures, an empty zip, a zip in a zip. Compare `zipEntries` with Python `zipfile`.
7. The files that Crysta saves (MOL2, SVG, CSV, and any structure export): the coordinates and labels agree with the structure on the screen.

### Auditor 2: Symmetry and cell

Work folder `$A/work/2-symmetry`, output `$A/findings/2.json`.

1. The space-group table: for each entry of src/sg-table.json, compare Crysta's operators (`hallOps` and `symbolOps`) with gemmi (`gemmi.find_spacegroup_by_name`, `gemmi.symops_from_hall`) as sets of operators modulo lattice translations. Include all settings: origin choices 1 and 2, hexagonal and rhombohedral axes for R groups, monoclinic unique axes b and c and the cell choices, and names with and without spaces ("P21/c", "P 1 21/c 1", "P21/n").
2. Symmetry expansion: for each HybriD3 CIF and the examples, compare Crysta's unit cell (`buildCell`) with gemmi (`small.get_all_unit_cell_sites()`): the number of atoms for each element, the positions modulo lattice translations, the merging of atoms on special positions, the occupancy of merged atoms. Then run spglib on Crysta's cell and check that it finds the space group of the file (or a supergroup, which you report).
3. When a CIF gives only a name and no operator loop, Crysta takes the operators from its table. Test this for 30 space groups with made-up files.
4. Formula, Z, formula mass, density and cell volume: compare with your own calculation from gemmi's unit cell (occupancy-weighted, with gemmi element masses), and with `_chemical_formula_sum`, `_cell_formula_units_Z`, `_chemical_formula_weight`, `_exptl_crystal_density_diffrn` and `_cell_volume` where the CIF gives them. Compare Crysta's MASS table with IUPAC values (gemmi.Element(...).weight).
5. Made-up cells with known answers: rock salt given by "F m -3 m" only; CsCl; an atom on x = 1.0000 or -0.0000; an atom on a special position with occupancy 0.5; R-3m in hexagonal and in rhombohedral axes; a triclinic P-1 cell with all angles different from 90°; a cell in a non-standard setting (P 1 1 21/b, B 1 1 2/b, I 1 2/a 1).

### Auditor 3: Geometry and descriptors

Work folder `$A/work/3-geometry`, output `$A/findings/3.json`. This is the largest area.

1. Published values: for each HybriD3 CIF with `_geom_bond_*` and `_geom_angle_*` loops (and the examples), get Crysta's distance and angle for the same atoms, with the symmetry codes of the loop (`_geom_bond_site_symmetry_2`, for example "3_655"). Compare with the published value within its s.u. Do the same with your own numpy code on gemmi's cell. Use `_geom_torsion_*` loops for the torsion sign where a file has them.
2. Measure functions, against your own numpy code: distance, bond angle, torsion (sign convention of IUPAC/Klyne–Prelog), plane through atoms (least squares), (hkl) plane (normal along the reciprocal vector), atom to plane, bond to plane, plane to plane (the range: 0–90° or 0–180°), angle in plane (three atoms projected onto a plane), nearest (hkl) to a plane (brute force over a range of hkl). Also test non-orthogonal cells (monoclinic, triclinic).
3. Framework descriptors, as Crysta defines them in the README: number of layers n, layer spacing, slab thickness (Xax to Xax), organic gallery, M–X distances, Δd, σ², cis X–M–X range, θ (M–X–M), θin, θout, axial M–X to layer normal, N penetration, stacking offset, and the hydrogen-bond criteria. For each:
   a. Write your own code from the README definition. Compare on PEA2PbBr4, FCA3_2PbBr4_294K and at least 30 HybriD3 2D metal-halide structures (Pb, Sn, Ge, Bi, Cu, Mn, Cd ...), and on made-up cells (an ideal octahedral layer with a known tilt, so θ, θin and θout are known; a monoclinic cell; a Dion–Jacobson and a Ruddlesden–Popper stacking with known offsets).
   b. Compare the README definition with the literature definition that people cite (for example Δd and σ²: Lufaso and Woodward, Robinson et al.; θin and θout and penetration: the papers on 2D perovskite distortions). State each difference with the reference.
   c. Read the values in the framework card of the page for at least three structures, and check them against your numbers.
4. Hydrogen bonds: compare Crysta's list with your own search that uses the stated criteria (donors, acceptors, H···A, D···A, D–H···A). Check structures with and without H atoms.

### Auditor 4: Powder XRD

Work folder `$A/work/4-pxrd`, output `$A/findings/4.json`.

1. Wavelengths (ANODES): compare with International Tables Vol. C values for Cu, Mo, Co, Fe, Cr, Ag Kα1, Kα2 and Kβ where present. Kα2/Kα1 ratio.
2. Reflection positions: d and 2θ for each reflection, against your own Bragg calculation on the cell (also for monoclinic and triclinic cells).
3. Structure factors: |F|² for each reflection, against gemmi (`gemmi.StructureFactorCalculatorX` on the small structure, with the same form factors) and your own sum. Check occupancy, Uiso and Uaniso (B = 8π²U), systematic absences, Friedel pairs, and multiplicity (how Crysta merges equivalent reflections).
4. Form factors: XRAY_F0 against the International Tables coefficients (gemmi IT92), and the f′ and f″ values against gemmi (`gemmi.cromer_liberman`) at the wavelength.
5. Intensity: Lorentz-polarization factor (with and without monochromator, if Crysta has it), relative intensities against pymatgen `XRDCalculator` (note the conventions of pymatgen: no anomalous scattering, its own form factors) and against your own calculation.
6. Profile and files: Kα2 position and ratio, peak shape and width, area, the d axis, readXY (comments, commas, tabs, empty lines, a header), the CSV that the page saves (columns, units, interpolation onto a common grid), the reflection table in the PXRD window against powderPattern.
7. Cases: NaCl, quartz, rutile, urea, PEA2PbBr4, and 20 HybriD3 CIFs.

### Auditor 5: Display

Work folder `$A/work/5-display`, output `$A/findings/5.json`.

1. The picture against the numbers: open PEA2PbBr4 and FCA3_2PbBr4_294K. Click each framework row and each hydrogen-bond row. For each, compare the highlighted atoms, bonds, lines, planes and arcs (from the page state and from highlightSet) with the definition of the row: are they the right atoms, does each line end on the right atom, does each plane sit where the number says, is each arc at the right vertex and between the right bonds? Take screenshots and look at them.
2. The Measure card: make each measurement type with real clicks on atoms in the viewer (find the screen position of an atom from the 3Dmol view), and check the value, the drawn line or arc, the static highlight and the text. Remove measures with ×.
3. Cards and tables: the units, the number of decimals, labels, fonts; the definition note in the viewer (it does not change the viewer height, it can be dragged).
4. The PXRD window (plot against the table, axes, the fold arrow) and the Databases window (search, links; the network is not available, so check the page behaviour without it).
5. The four backgrounds (auto light, auto dark, white, black): contrast of text, lines, the glow and labels.
6. A phone width (390 × 844) and a narrow desktop (1024 wide): no horizontal page scroll, no text cut off, all controls can be used.
7. The PNG and SVG that the page saves against the screen (the same atoms, the same view, the labels).

### Auditor 6: Bugs and robustness

Work folder `$A/work/6-bugs`, output `$A/findings/6.json`.

1. Broken and hostile files that you make: an empty file, a binary file, a truncated CIF, a CIF with a cell and no atoms, atoms and no cell, a zero or negative cell volume, NaN or huge coordinates, very long lines, Unicode labels, labels and block names with HTML and script text (`<img src=x onerror=alert(1)>`) — check that no text from a file runs as HTML in the page; a zip with 1000 entries, a zip in a zip, a corrupt zip, a large .xy file with junk lines.
2. Size: a cell with 2 000, 10 000 and 50 000 atoms. Does the page stay usable? Does it tell the user?
3. Odd cells: hexagonal, rhombohedral, triclinic, P1, non-standard settings, 0D, 1D and 3D frameworks, no H atoms, only H atoms, one atom.
4. Interaction: switch between structures fast; click rows and buttons many times fast; make measures and then switch the structure; remove measures in a different order; open and close the PXRD and Databases windows many times; Escape and keyboard use; drag and drop of files; watch for console errors, state that is lost or wrong, and a count of 3Dmol shapes that grows without limit.
5. Messages to the user: each error that you cause gives a clear message, and the page stays usable.

## Step 4: the devil's advocate (after step 3)

Work folder `$A/work/7-devil`, output `$A/findings/7.json`. It reads the brief and all six findings files, and the reports of the auditors.

1. Reproduce each finding from its "case" only, with your own script (do not run the auditor's script first). Grade it: Confirmed, Plausible or Refuted, with one sentence of reason.
2. For each finding, look for a reading in which Crysta is right: a different convention, a setting, a rounding, a wrong reference. A difference that comes from a convention is Refuted, and the convention goes in a list for the README.
3. Attack the definitions: θin, θout, Δd, σ², the slab, the gallery, N penetration, the stacking offset, the hydrogen-bond criteria. For each: is it the definition that people cite? Where the literature differs, say which source uses which.
4. Read the README and the texts in the page (definitions, notes, tooltips) against the code.
5. List what the auditors did not check. Check the most important gaps yourself.
6. Check the severity of each finding. Change it with a reason if it is wrong.

Output: `{ "grades": [ {"id": "A3-01", "grade": "Confirmed", "reason": "...", "severity": "S1", "repro": "..."} ], "new_findings": [ ...same fields as the auditors... ], "conventions": ["..."], "definitions": [ {"descriptor": "...", "crysta": "...", "literature": "...", "sources": "...", "verdict": "..."} ], "gaps": ["..."] }`

## Step 5: the report

The coordinator merges the seven files into the report (design, Output). For each finding with the grade Confirmed and severity S1 or S2, the coordinator also reproduces it once. The report is a document (Docs artifact).

## Step 6: keep the scripts

Copy the scripts and the made-up files of `$A/work/` into `design/audit-2026-10-12/` on the branch `audit-plan`. Do not copy HybriD3 files or text from them. Check with `git diff --stat main -- src docs dist` that the audit changed no code.
