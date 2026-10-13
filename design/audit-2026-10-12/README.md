# Audit of Crysta v0.5.2: scripts and test files

These are the scripts and the made-up test files of the independent audit of 2026-10-12. The design is in `../2026-10-12-audit-design.md` and the plan is in `../2026-10-12-audit-plan.md`. The report is a separate document.

## Folders

| Folder | Agent | Area |
|---|---|---|
| `1-readers` | auditor 1 | CIF, SHELX, POSCAR, XYZ, geometry.in and zip readers, and saved files |
| `2-symmetry` | auditor 2 | space-group table, symmetry expansion, formula, Z, density |
| `3-geometry` | auditor 3 | measurements, layer descriptors, hydrogen bonds |
| `4-pxrd` | auditor 4 | powder patterns, structure factors, measured data |
| `5-display` | auditor 5 | the picture against the numbers, exports, layouts |
| `6-bugs` | auditor 6 | broken and hostile files, large cells, interaction |
| `7-devil/a`, `7-devil/b` | devil's advocate | the reproduction of each finding |
| `0-coord` | coordinator | the second reproduction of the S1 findings and of some S2 findings |

## What is not here

- The HybriD3 structure files, and any output that holds their content. The scripts read them from `$A/corpus/hybrid3/structures/`.
- Files larger than 300 kB (the 10 000 and 50 000 atom cells, the 1 000 000 point powder file, the zip bombs). `6-bugs/gen*.py` makes them again.
- Screenshots, JSON dumps, logs and installed Python packages.

## How to run a script again

The scripts use absolute paths in the scratchpad of the audit session. `$A` was `/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit`. To run a script again:

1. Make the same folders: `$A/corpus/examples` (a copy of `examples/`), `$A/corpus/tests-files` (a copy of `tests/files/`) and `$A/corpus/hybrid3/structures` (the files of the branch `database-browser-demo`, folder `data/hybrid3/structures`).
2. Change the paths at the top of the script, or make a link from the old path to the new path.
3. Run Node scripts with `NODE_PATH=/opt/npm-tools/node_modules` (Playwright). Run Python scripts with `python3 -I`. The references are gemmi 0.7.5, spglib 2.8.0, pymatgen 2026.9 and numpy.

These files are a record. They are not tests yet. A later pull request can turn the made-up cases into regression tests in `tests/`.
