# Independent audit of Crysta: design

Status: approved approach (A), 2026-10-12. This file records how the audit runs. The findings go into a separate report.

## Goal

Find the errors in Crysta v0.5.2 before more people use it:

- **Wrong numbers:** a value that Crysta shows or saves and that is not correct for its stated definition (an angle, a distance, a descriptor, a powder pattern).
- **Wrong definitions:** a definition that does not match the usual meaning in the literature, or a README text that says something different from what the code does.
- **Display errors:** a picture, a table or a saved file that does not agree with the numbers, or that misleads.
- **Bugs:** a crash, a frozen page, lost or wrong state, or a feature that does not do what its label says.

The audit changes no code. The fixes come later, in a separate pull request, after the user reads the report.

## Approach

Six specialist auditors work in parallel. Each one has one area. A seventh agent, the devil's advocate, then tests every finding. The coordinator (the main session) gives out the work, collects the findings and writes the report.

Approach A was chosen over one sequential auditor (less independent) and over a comparison script only (finds no display or interaction errors).

## The auditors

| # | Auditor | Area | Main reference |
|---|---|---|---|
| 1 | Readers | CIF (several blocks, disorder, settings, missing items), SHELX .res/.ins, POSCAR, XYZ, FHI-aims geometry.in, zip files | gemmi; the files themselves |
| 2 | Symmetry and cell | symmetry operators, expansion, special positions, occupancy, formula, Z, density, cell volume | gemmi (and spglib) |
| 3 | Geometry and descriptors | distance, angle, torsion sign, planes, atom/bond to plane, angle in plane, nearest (hkl); n, layer spacing, slab, gallery, M–X, Δd, σ², cis range, θ, θin, θout, axial tilt, N penetration, stacking offset, hydrogen bonds | numpy code written by the auditor; the `_geom_bond` and `_geom_angle` loops of published CIFs; the literature for each definition |
| 4 | Powder XRD | 2θ and d of each reflection, structure factors, multiplicity, Lorentz-polarization factor, f0 and f′/f″, displacement factor, Kα2, profile, d axis, CSV columns and interpolation | gemmi structure factors; pymatgen XRDCalculator; hand calculation for a few reflections |
| 5 | Display | the picture against the numbers (lines end on the right atoms, the glow and highlights cover the right atoms, planes sit where stated, labels and units), cards and tables, PXRD and Databases windows, the four backgrounds, phone width, PNG and SVG against the screen | Playwright and screenshots; the numbers of auditor 3 |
| 6 | Bugs and robustness | broken and hostile files, very large files, odd cells (hexagonal, rhombohedral, triclinic, P1, non-standard settings), files without H, 0D/1D/3D frameworks, switching between structures, quick repeated clicks, Escape and keyboard use, messages to the user | Playwright, and broken files that the auditor makes |
| 7 | Devil's advocate | every finding of 1–6, the definitions, the README claims, what the others did not check | its own reproduction of each finding |

## Rules for independence

1. An auditor gets this design, the README (the definitions), the built page `dist/Crysta.html` and the source. An auditor does not get `tests/run.js`, the test drivers of earlier sessions, or the reasoning of the coordinator.
2. An auditor calculates each reference value with code that shares nothing with Crysta: gemmi, spglib, pymatgen, or numpy code of its own. Crysta's `src/core.js` is the object of the test, never a reference.
3. An auditor reads values from Crysta in the way a user sees them where possible: from the built page in Chromium. `XtalCore` (the functions of `src/core.js`) may be called directly to get many values fast, but each class of finding is also checked once in the page.
4. Auditors work in their own copy of the repository (a git worktree) or in the scratchpad. They do not change the repository.
5. The HybriD3 structure files (from the branch `database-browser-demo`) are used in the scratchpad only. No file content from them goes into the repository or into the report. The report names a HybriD3 structure by its data set number.

## Test corpus

- The four sample structures in `examples/` and the files in `tests/files/`.
- The 657 structure files of the HybriD3 copy on `database-browser-demo` (435 CIFs, 222 geometry files). Most of the CIFs have `_geom_bond` and `_geom_angle` loops: the authors' own distances and angles, a reference that does not depend on any program.
- Files that the auditors make. Some are small cells with known answers: rock salt, a cubic perovskite, a tilted perovskite with a known tilt, a monoclinic cell. Others are broken or hostile files for auditor 6.

Network access from the shell is limited to package registries. The auditors cannot download COD or CSD files.

## Evidence and grading

Each finding has:

- **What:** one sentence.
- **Where:** the feature, and the file and line of the code if known.
- **Case:** the structure, the atoms or the reflection, and the steps.
- **Values:** Crysta's value, the reference value, the source of the reference, and the difference.
- **Severity:**
  - S1: a wrong number that a user can report in a paper.
  - S2: a misleading display, a wrong definition text, or a saved file that does not agree with the screen.
  - S3: a bug that stops a task, loses work or freezes the page.
  - S4: a small or cosmetic error.
- **Confidence:** 0.0 to 1.0.

The devil's advocate gives each finding one grade:

- **Confirmed:** it reproduced the error on its own.
- **Plausible:** it could not reproduce the error, and it could not show that the error is not real.
- **Refuted:** the finding is wrong, or the difference comes from a documented convention. The convention is then listed in the report, so that the README can state it.

Tolerances for "agrees":

- Distances: 0.001 Å. Angles: 0.01°, Crysta shows 2 decimals.
- Against a published CIF loop: within the last digit given in the CIF.
- PXRD: 2θ within 0.001°. Relative intensities within 1 % of the strongest reflection, with the same conventions (radiation, LP factor, B).

## Devil's advocate tasks

1. Reproduce each finding of auditors 1–6, from the case only.
2. For each finding, look for a reading in which Crysta is right: a different convention, a different setting, a rounding.
3. Attack the definitions. Crysta defines θin, θout, Δd, σ², the slab, the gallery, N penetration, the stacking offset and the hydrogen-bond criteria. For each one: is it the definition of the literature that people cite? Where the literature differs, say which source uses which.
4. Read the README and the texts in the page (definitions, notes, tooltips) against the code.
5. List the areas that no auditor checked, and check the most important ones.

## Output

- A report as a document, in this order:
  1. a summary
  2. the findings by severity, each with its evidence
  3. the conventions to state in the README
  4. what the audit checked and found correct
  5. what the audit did not check
- The comparison scripts and the made-up test files go into `design/audit-2026-10-12/` on a branch, so that they can become regression tests. No HybriD3 file content goes there.
- No change to `src/`, `docs/` or `dist/`.

## Limits

- The test browser draws with software (SwiftShader). Speed, the glow on a graphics card and other browsers are not tested.
- The auditors can test only the formats and structures that they have or can make.
- An agent can make mistakes. The devil's advocate stage is there to find them, and the report gives a confidence for each finding.

## Done when

- Each of the seven areas has a section in the report.
- Each finding has a grade from the devil's advocate.
- The report lists what was found correct, so that a clean area is a result and not a gap.
